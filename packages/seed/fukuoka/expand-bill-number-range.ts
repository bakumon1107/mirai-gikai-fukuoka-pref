/**
 * expand-bill-number-range.ts
 *
 * 採決結果ページ（saiketsu-*.html）の宣言文から、可決扱いの議案番号を展開する
 * 純粋関数。
 *
 * 採決結果は個別議案ごとの結果表ではなく、次のようなレンジ宣言文で書かれている。
 *
 *   令和7年12月19日、第188号議案から第226号議案の39件については、
 *   いずれも原案のとおり可決または同意されました。
 *
 * 表現のゆらぎが大きいため、展開ロジックをここに独立させる。
 * 詳細は docs/20260922_1650_議案スクレイプ設計.md §7 を参照。
 */

/** 宣言文から展開した議案番号。知事提出と議員・委員会提出は番号体系が別。 */
export type ExpandedBillNumbers = {
  /** 知事提出議案の番号 */
  bill: number[];
  /** 議員提出・委員会提出議案の番号 */
  memberBill: number[];
};

/**
 * 「議員提出」「委員会提出」の直後に続く議案番号は別番号体系になる。
 * 宣言文ではこれらが知事提出議案と同じ文に混在する。
 *
 *   第67号議案から第109号議案、委員会提出第1号議案については、…
 *   令和8年9月17日、議員提出第3号議案については、…
 */
const MEMBER_BILL_MARKER = /(?:議員提出|委員会提出)(?:議案)?/;

/** 「N件」という件数表記。展開結果の検算に使う。 */
const COUNT_RE = /の(\d+)件/g;

/** 「第N号議案から第M号議案」のレンジ表現 */
const RANGE_RE = /第(\d+)号議案から第(\d+)号議案/g;

/** 「第N号議案」の単独表現 */
const SINGLE_RE = /第(\d+)号議案/g;

function inclusiveRange(from: number, to: number): number[] {
  if (to < from) {
    throw new Error(
      `議案番号のレンジが逆順です: 第${from}号議案から第${to}号議案`
    );
  }
  const result: number[] = [];
  for (let n = from; n <= to; n++) result.push(n);
  return result;
}

/**
 * 宣言文を「知事提出パート」と「議員・委員会提出パート」に切り分ける。
 *
 * 「議員提出」「委員会提出」というマーカー以降は別番号体系として扱う。
 * マーカーが複数回出る場合も、最初のマーカー以降をまとめて後者とみなす
 * （実データでは混在しても末尾にまとまって現れる）。
 */
function splitByMarker(sentence: string): {
  billPart: string;
  memberPart: string;
} {
  const match = sentence.match(MEMBER_BILL_MARKER);
  if (!match || match.index === undefined) {
    return { billPart: sentence, memberPart: "" };
  }
  return {
    billPart: sentence.slice(0, match.index),
    memberPart: sentence.slice(match.index),
  };
}

/** 1つのパートから議案番号を展開する。レンジを先に消費してから単独を拾う。 */
function expandPart(part: string): number[] {
  const numbers = new Set<number>();

  // レンジを先に処理し、消費した範囲は placeholder に置き換えて
  // 後段の単独表現の抽出から除外する（でないと端点を二重に拾う）。
  const withoutRanges = part.replace(RANGE_RE, (_all, from: string, to: string) => {
    for (const n of inclusiveRange(Number(from), Number(to))) numbers.add(n);
    return "＜range＞";
  });

  for (const m of withoutRanges.matchAll(SINGLE_RE)) {
    numbers.add(Number(m[1]));
  }

  return [...numbers].sort((a, b) => a - b);
}

/**
 * 宣言文中の「N件」表記を合計して返す。表記が無ければ null。
 *
 * 「第1号議案から第19号議案、第22号議案から第79号議案の77件及び
 *   委員会提出議案第2号議案、第3号議案の2件」のように複数現れるため合計する。
 */
function totalDeclaredCount(sentence: string): number | null {
  let total = 0;
  let found = false;
  for (const m of sentence.matchAll(COUNT_RE)) {
    total += Number(m[1]);
    found = true;
  }
  return found ? total : null;
}

/**
 * 採決結果の宣言文から、可決扱いの議案番号を展開する。
 *
 * 文中に「N件」表記がある場合は展開結果の件数と照合し、一致しなければ
 * 例外を投げる。静かに壊れて誤った議決結果をDBへ入れるのを防ぐため、
 * 件数が合わないときは取り込みを止める。
 *
 * @throws 件数表記と展開結果が一致しない場合、レンジが逆順の場合
 */
export function expandBillNumberRange(sentence: string): ExpandedBillNumbers {
  const { billPart, memberPart } = splitByMarker(sentence);

  const result: ExpandedBillNumbers = {
    bill: expandPart(billPart),
    memberBill: expandPart(memberPart),
  };

  const declared = totalDeclaredCount(sentence);
  if (declared !== null) {
    const actual = result.bill.length + result.memberBill.length;
    if (actual !== declared) {
      throw new Error(
        `採決結果の件数が一致しません: 宣言${declared}件 / 展開${actual}件` +
          `（知事提出${result.bill.length}件・議員提出${result.memberBill.length}件）` +
          `\n対象文: ${sentence}`
      );
    }
  }

  return result;
}
