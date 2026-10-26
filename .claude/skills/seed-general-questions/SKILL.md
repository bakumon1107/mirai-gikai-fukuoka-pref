---
name: seed-general-questions
description: 福岡県議会の一般質問テキスト（Shift-JIS）をパースしてDBに投入する。「一般質問をデータ化して」「◯月定例会の質問を入れて」で使用。
---

# 一般質問データ化スキル

福岡県議会の一般質問テキスト（Shift-JIS）をDBに投入するワークフロー。
設計書: `docs/20260531_1400_一般質問データ化設計.md`

> **本番への書き込みは必ずユーザーの確認を経ること。**
> 接続先はハードコードせず、本番なら `.env.production`、ローカルなら `.env` の
> `SUPABASE_URL` を正とする。本番書き込み前にはプロジェクト名が
> 福岡県版（`mirai-gikai-fukuoka-pref Project`）であることを確認する。

## 使い方

```
/seed-general-questions --input "docs/data/令和７年12月定例会（第11日）.txt" --day 11
```

引数:
- `--input`: テキストファイルのパス（Shift-JIS）
- `--day`: 定例会の日（11, 12 など）
- `--limit N`: テスト用・最初のN名だけ処理（省略時は全員）

---

## ワークフロー

### Step 1: パース（スクリプト）

```bash
python3 packages/seed/fukuoka/parse-general-questions.py \
  --input "{input}" \
  --session-id "r7-12" \
  --day {day} \
  --output /tmp/parsed.json \
  [--limit {limit}]
```

出力JSONの構造:
```json
{
  "session_id": "r7-12",
  "session_day": 11,
  "questioner_number": 42,
  "questioner_name": "〔氏名〕",
  "questioner_party": "〔会派名〕",
  "question_order": 1,
  "raw_text": "〔質問全文〕",
  "answer_raw_text": "〔答弁全文〕",
  "answerers": [{ "role": "〔役職〕", "name": "〔氏名〕" }],
  "follow_up_text": null
}
```

### Step 2: topics/summary 生成（Claude がチャットで処理）

パース済みJSONを1件ずつ読み込み、Claude が以下を生成してenriched JSONに書き出す:

```json
{
  "summary": "全体の質疑を1〜2文で要約（他者評価調）",
  "topics": [
    {
      "title": "トピックタイトル（15字以内）",
      "question_summary": "質問の要旨（60字以内、「〜を確認した」「〜を質した」調）",
      "answer_summary": "答弁の要旨（60字以内、「〜を明らかにした」「〜を示した」調）",
      "answerer_role": "〔役職〕",
      "answerer_name": "〔氏名〕",
      "category": "〔11分類のいずれか〕",
      "questioner_follow_up": null  // 要望発言があれば40字以内で入れる
    }
  ]
}
```

**`category` は必須。** 一覧ページ（`/sessions/<slug>/questions`）のカテゴリ別表示に使う。
次の11分類から必ず1つ選ぶ（表記は完全一致。違う値だとseed時にエラーで止まる）:

```
子育て・教育 / 健康・医療 / 防災・安全 / 高齢者・福祉 / 交通・まちづくり /
環境・脱炭素 / スポーツ・文化 / 観光・地域振興 / 産業・農林水産 / 警察・人権 / 行政・県政
```

- 定義元は `web/src/features/general-questions/shared/utils/build-topic-groups.ts` の
  `CATEGORY_MAP`（トップページのテーマ定義 `theme-mapping.ts` とも対応）
- **省略するとタイトルのキーワード判定にフォールバックし、ほぼ「その他」に落ちる。**
  令和8年6月定例会では付与前、233件中168件（72%）が「その他」になっていた
- 同一議員の**連続する**同カテゴリのトピックは1枚のカードにまとまる。関連する質疑は
  同じカテゴリに揃えるとカードが整理される（途中に1件だけ別カテゴリを挟むと3枚に割れる）
- AIパッチのファイルが残っていない過去分は `backfill-topic-categories.ts` で後付けする

**トピック分割の基準（質問文）:**
- 「そこで知事にお尋ねします」
- 「次に、〇〇について」
- 「まず、〇〇について」

**答弁対応の基準:**
- 「まず、〇〇についてお尋ねがございました」
- 「次に、〇〇についてでございます」

**要望発言がある場合:** `follow_up_text` を最も関連するトピックの `questioner_follow_up` に要約して格納。

### Step 3: DB投入

#### 3-1. マイグレーション（未適用の場合のみ）

`answer_raw_text` カラムの存在確認:
```bash
# 投入先のenvを読み込む（ローカル投入なら .env、本番投入なら .env.production）
set -a && source .env && set +a
curl -s "$SUPABASE_URL/rest/v1/general_questions?select=answer_raw_text&limit=1" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```
エラーが返った場合はマイグレーション実行:
```bash
# ローカルDBにdocker exec経由で適用（memory: project_supabase_pref_setup.md参照）
```

#### 3-2. council_session_id の取得

```bash
curl -s "$SUPABASE_URL/rest/v1/council_sessions?slug=eq.r7-12&select=id" \
  -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" \
  -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
```

#### 3-3. DB INSERT

enriched JSONの各レコードを `general_questions` テーブルに投入:
- `topics` フィールドは JSON配列のまま格納（JSONBカラム）
- `answer_raw_text` に答弁全文を格納
- `publish_status` = `"published"`
- `source_url` = null（後で設定可）

---

## 注意事項

- **raw_text の内容**: パーサーは `登壇　` 以降の発言本文のみを保存（`◯NN番（氏名）登壇　` ヘッダーは除去）。表示側で再付与するため問題なし
- **answer_raw_text の複数答弁**: 複数答弁者がいる場合や訂正発言がある場合、`answer_raw_text` 内に `【役職 氏名】\n` マーカーで連結される。表示側で `◯役職（氏名）登壇　` に変換して別バブルとして表示する
- **要望発言（同一議員2回目登壇）**: パーサーが `answer_raw_text` なしレコードとして取得したものは、直前の同一議席番号レコードに `follow_up_text` としてマージする（パーサーの後処理で自動実行）
- **冪等性**: 同一 `council_session_id` + `session_day` + `question_order` が既存の場合はスキップ or UPDATE
- **文体**: 他者評価調（「〜を確認した」「〜を示した」「〜を明らかにした」）。「〜問うた」「〜します」は使わない
