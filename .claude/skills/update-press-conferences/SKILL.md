---
name: update-press-conferences
description: 知事定例記者会見データ（発表・質疑・配付資料PDF・事務局答弁）を県公式書き起こしから構造化して press_conferences に投入・更新する。「記者会見を追加/更新して」「配付資料PDFを紐付けて」「事務局答弁を分けて」等の依頼で使用。
---

# 知事記者会見データ更新（press_conferences / items / turns）

知事定例会見を発表項目（announcement）と質疑（qa）に構造化してDBへ取り込む。配付資料PDF（`material_url`）と事務局答弁（`speaker=secretariat`）を含む。DB接続は `db-access` スキルに従う。データ設計の詳細は [移植設計書](../../../docs/fukuoka-pref/20260811_0919_記者会見_配付資料PDFリンクと発表要約運用_県版移植設計書.md) を参照。

## ⚠️ DB投入前に必ず停止して人間レビュー（スキップ禁止）

AI生成テキストをDBへ入れる前に、生成内容を提示して承認を得る（CLAUDE.md「AI生成コンテンツのDB更新ルール」）。承認前に INSERT/UPDATE しない。提示時に自己レビューを添える：

- 数値・固有名詞・日付を公式書き起こしと照合したか
- 中国語簡体字/繁体字（议・务・该 等）の混入が無いか
- 話者（知事／記者／事務局）の取り違えが無いか
- トピック間で情報が混入していないか

## データソース（一次＝県公式書き起こし）

- 県公式: `https://www.pref.fukuoka.lg.jp/site/chiji-kisha/`（月次 `kaiken-<YYYYMM>.html` → 各回 `teirei-kisyakaikenn<YYYYMMDD>.html`）から**書き起こし本文と配付資料PDFの絶対URL**を取得
- 発言者表記：`知事` ／ 報道機関名（記者。令和3年6月以降は社名）／ **担当課・部局名の括弧付き（例「（財政課）」）＝事務局**
- YouTube は `youtube_url` 用（補助）

## DBマッピング（`seed-press-conferences.ts` の型に一致・**snake_case**）

- **press_conferences**: `slug`=`YYYY-MM-DD` ／ `title`「令和8年5月 知事定例記者会見」形式 ／ `held_at` ／ `youtube_url`（`https://www.youtube.com/watch?v=XXXX` に正規化。`/live/`・`youtu.be/` は変換）／ `status`=`published`
- **press_conference_items**: `item_type`=`announcement`|`qa` ／ `order_index` ／ `title`（市民向けに平易に）／ `summary`（announcementは要点簡潔化・知事ターン ~190字目安）／ **`material_url`**（announcementの配付資料PDF。qaはnull。内容の異なる複数PDFは発表項目を分割）
- **press_conference_turns**（qaの往復）: `speaker`=**`governor`|`reporter`|`secretariat`** ／ `speaker_name`（reporter=社名、**secretariat=担当課名〔括弧除去、例「財政課」〕**、governorはnull可）／ `content` ／ `order_index`
  - 事務局答弁は `secretariat`＋担当課名で格納し、**知事ターンへ集約しない**。UIは担当課名（無ければ「事務局」）を表示

## 手順

1. 対象会見の県公式ページから書き起こし＋配付資料PDFのURLを取得（補助でYouTube URL）
2. 項目分割（発表事項 → 発表への質疑 → その他質疑）。発表に `material_url` を紐付け
3. `summary`／`turns` を生成（事務局＝`secretariat`、要点簡潔化、数値・固有名詞を公式と照合）
4. **ユーザーレビュー（ここで停止）→ 承認**
5. REST で本番へ直接投入（`press_conferences` → `items`（`material_url`含む）→ `turns` の順。project ref `ugvzabneccydyakupfyl`・`.env.production`）
   - 同一 slug は事前チェック。**ただし既存slugが不完全（items/turns欠損）ならスキップせず、削除→再投入して整合を回復する**（親→子を個別に書くため途中失敗で不完全データが残り得る）
6. 投入後にDBから読み直し、ローカル案と**完全一致**を照合。web の記者会見ページで表示確認（PDFリンク・事務局ラベル）

## 前提

- `material_url` 列・`speaker` の `secretariat` は migration `20260811091900` / `20260811091901` で追加済み（未適用環境は設計書 3-2 / 3-8 で本番へ非破壊先行適用。speaker制約名 `press_conference_turns_speaker_check`）
- 記者会見ページは動的レンダリング＝**データ投入は再デプロイ不要で反映**（UIコード変更は develop→main デプロイが必要）
- **既存会見の事務局データはUIデプロイ後に投入**する（旧UIでは `secretariat` が記者として誤表示されるため）

## 注意

- 発言のニュアンス（推測／断定の別）を変えない。発言していないことを書かない。話者の取り違え厳禁。
