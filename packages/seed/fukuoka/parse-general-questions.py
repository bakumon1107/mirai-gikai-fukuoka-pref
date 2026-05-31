"""
福岡県議会 一般質問テキスト → JSON パーサー
Shift-JIS テキストを読み込み、Q&Aブロックを構造化JSONに変換する。

Usage:
  python3 parse-general-questions.py \
    --input "docs/data/令和７年12月定例会（第11日）.txt" \
    --session-id "r7-12" \
    --day 11 \
    --output /tmp/r7-12-day11-parsed.json \
    [--limit 1]   # テスト用: 最初のN名だけ処理
"""

import argparse
import json
import re
import sys

# 漢数字 → アラビア数字変換
KANJI_DIGIT = {
    "一": 1, "二": 2, "三": 3, "四": 4, "五": 5,
    "六": 6, "七": 7, "八": 8, "九": 9, "〇": 0,
}
KANJI_UNIT = {"十": 10, "百": 100, "千": 1000, "万": 10000}


def kanji_to_int(s: str) -> int:
    s = s.strip()
    result = 0
    current = 0
    for ch in s:
        if ch in KANJI_DIGIT:
            current = KANJI_DIGIT[ch]
        elif ch in KANJI_UNIT:
            unit = KANJI_UNIT[ch]
            result += (current if current else 1) * unit
            current = 0
    result += current
    return result


# 会派パターン（テキスト冒頭から抽出）
PARTY_PATTERNS = [
    "自民党県議団",
    "民主県政クラブ県議団",
    "民主県政県議団",
    "公明党",
    "新政会福岡県議団",
    "新政会",
    "無所属の会",
    "ふくおか政策の会",
    "桜和会",
    "豊築会",
    "日本維新の会福岡",
    "北九州市小倉南区選出",  # fallback
]


def extract_party(text: str) -> str | None:
    for p in PARTY_PATTERNS:
        if p in text:
            return p
    return None


def extract_name_from_line(line: str) -> tuple[int | None, str | None]:
    """◯NN番（氏名）登壇 から (番号, 氏名) を抽出"""
    num_match = re.search(r"◯([一二三四五六七八九十百千万]+)番", line)
    name_match = re.search(r"番（([^）]+)）", line)
    if num_match and name_match:
        num = kanji_to_int(num_match.group(1))
        name = name_match.group(1).replace("　", "").replace(" ", "")
        return num, name
    return None, None


def extract_answerer(line: str) -> tuple[str, str]:
    """◯知事（氏名）登壇 などから (role, name) を抽出"""
    # 知事
    m = re.match(r"◯知事（([^）]+)）", line)
    if m:
        return "知事", m.group(1).replace("　", "").replace(" ", "")
    # 警察本部長
    m = re.match(r"◯警察本部長（([^）]+)）", line)
    if m:
        return "警察本部長", m.group(1).replace("　", "").replace(" ", "")
    # 教育長
    m = re.match(r"◯教育長（([^）]+)）", line)
    if m:
        return "教育長", m.group(1).replace("　", "").replace(" ", "")
    # その他局長等
    m = re.match(r"◯([^（\s]+)（([^）]+)）登壇", line)
    if m:
        return m.group(1), m.group(2).replace("　", "").replace(" ", "")
    return "知事", ""


def is_follow_up(text: str, has_answer: bool = True) -> bool:
    """要望発言かどうか判定"""
    for kw in ["答弁いただきました", "御要望申し上げます", "要望させていただきます",
               "要望いたします", "御答弁いただきありがとう", "前向きな御答弁"]:
        if kw in text[:80]:
            return True
    # 答弁が続かない2回目登壇は要望とみなす（答弁者がいない場合）
    if not has_answer:
        return True
    return False


def collect_speech(lines: list[str], start: int) -> tuple[str, int]:
    """start行目から次の司会/マーカーまでのテキストを収集"""
    body_lines = []
    i = start
    while i < len(lines):
        line = lines[i]
        stripped = line.strip()
        if stripped.startswith("◯副議長") or stripped.startswith("◯議長"):
            break
        if stripped.startswith("＊") and i > start:
            break
        if stripped.startswith("◯") and i > start:
            # 別の発言者が始まったら終了
            num_m = re.search(r"◯([一二三四五六七八九十百千万]+)番", stripped)
            answerer_m = re.match(r"◯(知事|警察本部長|教育長)", stripped)
            if num_m or answerer_m:
                break
        body_lines.append(line)
        i += 1
    # 登壇行の冒頭（「◯NN番...登壇　」の部分）を除去
    if body_lines:
        first = body_lines[0]
        # 「登壇　」以降のテキストだけ残す
        m = re.search(r"登壇　?(.*)", first)
        if m:
            rest = m.group(1).strip()
            body_lines[0] = rest
    text = "\n".join(line_text.strip() for line_text in body_lines if line_text.strip())
    return text, i


def parse_file(path: str, session_id: str, day: int, limit: int | None = None) -> list[dict]:
    with open(path, encoding="shift_jis", errors="replace") as f:
        content = f.read()

    lines = content.splitlines()
    results = []

    # 全発言をスキャンして Q&A ブロックを組み立てる
    # state machine: 議員質問 → 答弁 → (要望) → 次の議員
    i = 0
    question_order = 0
    pending: dict | None = None  # 処理中のブロック

    while i < len(lines):
        line = lines[i].strip()

        # 質問マーカー（＊〇〇議員質問）
        if line.startswith("＊") and "議員質問" in line:
            i += 1
            continue

        # 議員の発言行
        num_match = re.search(r"◯([一二三四五六七八九十百千万]+)番（([^）]+)）登壇", line)
        if num_match:
            num = kanji_to_int(num_match.group(1))
            name = num_match.group(2).replace("　", "").replace(" ", "")

            speech_text, next_i = collect_speech(lines, i)

            # 要望発言かどうか
            if pending and pending["questioner_number"] == num and is_follow_up(speech_text):
                pending["follow_up_text"] = speech_text
                i = next_i
                continue

            # 前のブロックを確定
            if pending:
                results.append(pending)
                if limit and len(results) >= limit:
                    break

            # 新ブロック開始
            question_order += 1
            party = extract_party(speech_text)

            pending = {
                "session_id": session_id,
                "session_day": day,
                "questioner_number": num,
                "questioner_name": name,
                "questioner_party": party,
                "question_order": question_order,
                "raw_text": speech_text,
                "answer_raw_text": None,
                "answerers": [],
                "follow_up_text": None,
            }
            i = next_i
            continue

        # 答弁者の発言行（全役職対応）
        answerer_match = re.match(r"◯[^（\s]+（[^）]+）登壇", line)
        if answerer_match and pending:
            role, aname = extract_answerer(line)
            speech_text, next_i = collect_speech(lines, i)
            if pending["answer_raw_text"]:
                # 複数答弁者（知事＋教育長など）: 連結
                pending["answer_raw_text"] += f"\n\n【{role} {aname}】\n" + speech_text
            else:
                pending["answer_raw_text"] = speech_text
            pending["answerers"].append({"role": role, "name": aname})
            i = next_i
            continue

        i += 1

    # 最後のブロックを追加
    if pending and (not limit or len(results) < limit):
        results.append(pending)

    # 後処理: answer_raw_text が null のレコードは直前の同一questioner_numberのfollow_upに統合
    merged = []
    for rec in results:
        if (not rec["answer_raw_text"] and merged
                and merged[-1]["questioner_number"] == rec["questioner_number"]):
            merged[-1]["follow_up_text"] = rec["raw_text"]
        else:
            merged.append(rec)

    return merged


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True)
    parser.add_argument("--session-id", required=True)
    parser.add_argument("--day", type=int, required=True)
    parser.add_argument("--output", required=True)
    parser.add_argument("--limit", type=int, default=None, help="最初のN名だけ処理")
    args = parser.parse_args()

    results = parse_file(args.input, args.session_id, args.day, args.limit)

    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(results, f, ensure_ascii=False, indent=2)

    print(f"抽出完了: {len(results)}名 → {args.output}", file=sys.stderr)
    for r in results:
        q_len = len(r["raw_text"] or "")
        a_len = len(r["answer_raw_text"] or "")
        fu = "（要望あり）" if r["follow_up_text"] else ""
        print(f"  {r['questioner_number']:2}番 {r['questioner_name']} "
              f"Q:{q_len}字 A:{a_len}字 {fu}", file=sys.stderr)


if __name__ == "__main__":
    main()
