---
name: update-press-conferences
description: 知事記者会見データの更新手順。県公式の書き起こし・配付資料PDFを基に発表項目・質疑応答を構造化して press_conferences に取り込む際に必ず参照すること。
---

# 知事記者会見データ更新（press_conferences / items / turns）

知事定例記者会見を「発表項目（announcement）」と「質疑応答（qa）」に構造化してDBに取り込む。**配付資料PDFのリンク（material_url）**と**事務局答弁（speaker=secretariat）**の扱いを含む。設計の詳細は [docs/fukuoka-pref/20260811_0919_記者会見_配付資料PDFリンクと発表要約運用_県版移植設計書.md](../../../docs/fukuoka-pref/20260811_0919_記者会見_配付資料PDFリンクと発表要約運用_県版移植設計書.md) を参照。

DB接続は `db-access` スキルの規約に従う。

## ⚠️ DB投入前に必ず停止（人間レビュー・スキップ禁止）

AI生成テキスト（要約・質疑）をDBへ入れる**前に、必ず生成内容をユーザーに提示して承認を得る**（CLAUDE.md「AI生成コンテンツのDB更新ルール」）。承認前に INSERT / PATCH しない。提示時は自己レビュー結果も添える：

- 数値・固有名詞・日付を公式書き起こしと照合したか
- 中国語簡体字/繁体字（议・务・该 等）の混入が無いか
- 話者の取り違え（知事／記者／事務局）が無いか
- 複数トピックを跨ぐ会見で、別トピックの情報が混入していないか

## データソース（県は公式書き起こしが一次）

市版はYouTube自動字幕が一次だが、**県は公式の書き起こしを公開しているためそちらを一次ソースにする**（精度が高い）。

- **県公式ページ**（知事定例記者会見）: `https://www.pref.fukuoka.lg.jp/site/chiji-kisha/` 配下
  - 月次一覧: `kaiken-<YYYYMM>.html` → 各回 `teirei-kisyakaikenn<YYYYMMDD>.html`
  - **発言者表記**：`知事` / **報道機関名**（記者。令和3年6月以降は「記者」でなく社名。例 西日本新聞・NHK・KBC 等）/ **担当課・部局名の括弧付き（例「（財政課）」「（防災危機管理局）」「（企画総務課）」）＝事務局答弁**
  - **配付資料PDF**：発表事項・報告事項の資料としてページに掲載（例 `294364.pdf`）。各PDFの絶対URLを取得する
- **YouTube**（補助）: `youtube_url` 用。字幕は補助的に使う。

## DBマッピング（3階層）

仕様は `packages/seed/fukuoka/seed-press-conferences.ts` の型（**snake_case**）に一致する。

### press_conferences
| フィールド | 内容 |
|---|---|
| `slug` | 開催日 `YYYY-MM-DD` |
| `title` | 「令和8年5月 知事定例記者会見」形式 |
| `held_at` | 開催日 |
| `youtube_url` | 動画URL。**`https://www.youtube.com/watch?v=XXXX` 形式に正規化**（`/live/XXXX`・`youtu.be/XXXX` は変換）。既存レコード形式を1件確認して合わせる |
| `status` | `published` |

### press_conference_items（会見内の項目）
- `item_type`: `announcement`（知事発表）/ `qa`（質疑応答）
- `order_index`: 登場順
- `title`: 市民向けに分かりやすく
- `summary`: announcement は要約必須。**要点に絞って簡潔化**（言い淀み・繰り返しは削る。知事ターンは ~190字目安、長い持論のみ300字超まで許容）。qa は null 可（turns で表現）
- **`material_url`**: announcement の配付資料PDF絶対URL（**qa は null**）。大項目の下に内容の異なる複数PDFがある場合は**発表項目を分割**し、それぞれに対応PDFを割り当てる

### press_conference_turns（qa の発言単位）
- announcement は turns 空（summary のみ）
- `speaker`: **`governor` / `reporter` / `secretariat`**（DB check 制約）
  - **`secretariat`（事務局）**: 会見で担当課・部局が答弁した場合。公式書き起こしの「（財政課）」等がこれにあたる
- `speaker_name`:
  - `reporter` … 報道機関名
  - `secretariat` … **担当課名（括弧を外す。例「財政課」）**。UIはこれを表示、無ければ「事務局」
  - `governor` … null 可
- `content` / `order_index`

## 手順

1. 対象会見の**県公式ページを取得**（書き起こし本文＋**配付資料PDFの絶対URL**）。補助で YouTube URL を確認
2. 項目単位に分割（発表事項 → 発表への質疑 → その他質疑）。発表に配付資料PDFを `material_url` で紐付け（内容が異なる複数PDFは項目分割）
3. announcement の `summary`、qa の `turns` を生成。**事務局答弁は `secretariat` ＋担当課名**。数値・固有名詞・日付は公式書き起こしと照合。要点簡潔化
4. **ユーザーレビュー（必須・ここで停止）** → 承認を得る
5. **投入（REST で本番DBへ直接投入）**：`press_conferences` → `press_conference_items`（`material_url` 含む）→ `press_conference_turns` の順
   - 同一 slug は事前チェックしてスキップ（多重登録防止）
   - 本番は Management API / REST、project ref **`ugvzabneccydyakupfyl`**、`.env.production` を使用
   - seed 追記ではなく **REST 直接投入**が直近会見の運用。`material_url` は **snake_case**
6. 投入後、DBから読み直してローカル案と**完全一致**を照合。web の記者会見ページで表示確認（**配付資料リンク・事務局ラベル**）

## スキーマ前提

- `press_conference_items.material_url` 列と `speaker` の `secretariat` 区分は本改修で追加済み（migration `20260811091900` / `20260811091901`）。未適用の環境では設計書 3-2 / 3-8 に従い**本番へ非破壊で先行適用**する（`ADD COLUMN IF NOT EXISTS`・check 制約張替。speaker 制約名は `press_conference_turns_speaker_check`）
- 記者会見ページはキャッシュ未使用の動的レンダリング＝**データ投入は再デプロイ無しで反映**される（UIコードの本番反映には develop→main デプロイが必要）

## 注意

- 知事発言のニュアンス（推測・断定の別）を変えない。発言していないことを summary / content に書かない
- 話者の取り違え厳禁（知事／記者／事務局）。事務局答弁を安易に知事ターンへ集約しない（`secretariat` を使う）
