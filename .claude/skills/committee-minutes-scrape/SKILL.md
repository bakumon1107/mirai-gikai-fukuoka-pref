---
name: committee-minutes-scrape
description: 福岡県議会 会議録検索システム（dbsr.jp）から委員会議事録の原文を取得してJSON化・DB投入する。新しい委員会の議事が追加されたときの掲載作業に使用。取得後のわかりやすい表現・要約生成は committee-minutes-ai スキルへ続く。
---

# 委員会議事録スクレイピング・掲載スキル（新dbsr.jp対応）

福岡県議会 会議録検索システム（`https://www.pref.fukuoka.dbsr.jp`）から現行委員会の議事録を取得し、`committee_meetings` / `committee_meeting_topics` に投入するまでの手順。**「委員会の議事が追加になったので掲載して」**と言われたらこれを使う。

## 全体像（パイプライン）

```text
① スクレイプ   scrape-committee-minutes.ts   → docs/data/committee-minutes/<年>/<開催日>_<slug>_<source_document_id>.json（原文）
② seed        seed-committee-meetings.ts    → committee_meetings / committee_meeting_topics（原文＋機械抽出議題）
③ AI生成      committee-minutes-ai スキル    → docs/data/committee-minutes/<年>/ai/<source_document_id>.json（要約・議題要約・simpleText）
④ ユーザー確認（必須）→ ⑤ apply-committee-ai-content.ts でDB反映
⑥ 公開        publish_status を published に更新（本番＋ローカル）
```

- 実行ディレクトリはすべて `packages/seed`。
- **本番DBへは慎重に**：ローカルで①〜⑥を通してから、本番は「seed → （必要なら議題調整）→ apply → publish」を `--env-file=<リポジトリルート>/.env.production` で実行する。参照ページは既にデプロイ済みなので「先にDBを整えてから公開」で安全。

## ⚠️ 新サイト（Laravel版・2026年リニューアル）の要点

旧システム（URLパスにセッションID＋DocumentID、`Template=doc-page`）は**廃止**。新サイトは Laravel ベースで取得フローが全く違う。`scrape-committee-minutes.ts` は書き換え済み。

### 取得フロー（DbsrClient）
1. `GET /` … cookie（`XSRF-TOKEN`, `laravel_session`）を受け取る。**複数のSet-Cookieを保持するcookieジャーが必須**（`res.headers.getSetCookie()`）。
2. `GET /?Template=search-top` … 検索フォームのCSRFトークン `_token`（`<input name="_token" value="...">`）を得る。
3. `POST /100000` … `_token`, `QueryType=new`, `Template=list`, `ListType=text`, `Phrase=`（空＝全件）, `CabinetName[]=<委員会コード>`。レスポンスHTMLのリンク `/<session>?Template=document&Id=<Id>` からセッションパスを得る。
4. `GET /<session>?Template=document&Id=<Id>` … 本文HTML。発言は `<p class="voice__text">◯話者　本文<br/>…</p>`、発言番号は `data-voice_code` 属性、会議名は `command__docname`、開催日は一覧の `開催日:YYYY-MM-DD`。

### 委員会コード（CabinetName[]）→ slug（`NEW_SITE_COMMITTEES`）
`sc`=総務企画地域振興 / `ko_2`=厚生環境 / `cl`=商工労働 / `nr`=農林水産 / `ke`=県土整備 / `kt`=建築都市 / `bu`=文教 / `pl`=警察。
特別委員会のコードはこの一覧に未収録。新規に扱うときは `?Template=search-top` の `CabinetName` セレクトを確認して追加する。

### 🔑 DocumentId再採番とオフセット採番（重要な落とし穴）
リニューアルで**実Idが再採番**され、旧サイト由来の既存 `source_document_id` と**衝突する**（例: 新サイトの総務企画地域振興 Id=4580 ＝ 旧サイトの厚生環境委員会 4580）。`source_document_id` は `integer not null unique` で、ページURL `/committees/<slug>/<id>` のキーも兼ねるため衝突は致命的。

対策：**新サイト由来は `source_document_id = 実Id + NEW_SITE_ID_OFFSET(1,000,000)`** で採番し、id空間を分離する（`parse-committee-minutes.ts` の定数）。`source_url` は `buildNewSourceUrl(実Id)` が本物のリンク（`/1?Template=document&Id=<実Id>` … セッションパスは任意の数値でよく200が返る）を保つ。したがってページのキーは例 `1004580`、原文リンクは `?Id=4580`。

### 重複判定は「開催日＋slug」
Idが再採番されたため、取得済み判定は `source_document_id` ではなく**ファイル名の `<開催日>_<slug>`** で行う（`loadScrapedKeys`）。seed 側は `source_document_id` で重複判定するが、オフセット採番のおかげで既存とはぶつからない。

## ① スクレイプ

```bash
cd packages/seed
# 全現行委員会・2026年
npx tsx fukuoka/scrape-committee-minutes.ts --year 2026
# 委員会コードを絞る（追加分だけ取りたいとき）
npx tsx fukuoka/scrape-committee-minutes.ts --year 2026 --committee sc,nr
```

- リクエスト間 2秒ウェイト＋429/503はリトライ（30/60/120秒）。サーバー負荷に配慮。
- 既存の `<開催日>_<slug>_*.json` がある会議はスキップ。新規のみ保存。
- パース確認：話者種別の分布（chairperson/member/executive/unknown）、簡体字混入なし、先頭/末尾発言が自然か。

## ② seed（原文をDBへ）

```bash
npx tsx --env-file=../../.env fukuoka/seed-committee-meetings.ts          # ローカル
npx tsx --env-file=/…/.env.production fukuoka/seed-committee-meetings.ts  # 本番
```
`docs/data/committee-minutes/<年>/*.json` を全読み込みし、未登録（`source_document_id`）のみ投入。機械抽出の議題（`extractTopics`）も入る。

### 議題（committee_meeting_topics）の調整
`extractTopics` は「◯◯を議題といたします」等の宣言を機械抽出する。**質疑が長い会議や「その他」に実質的な議論がある場合、粗い1議題になりがち**。実態に合わせて手動議題にしたいときは：
1. 対象会議の自動議題を削除（`committee_meeting_topics` を `meeting_id` で delete）。
2. AIパッチに `manualTopics`（`topicOrder/title/summary/startVoiceNo/endVoiceNo`）を書く。`apply-committee-ai-content.ts` は**議題0件のときだけ**手動議題を挿入する冪等仕様。

## ③〜⑤ AI生成・確認・反映 → **committee-minutes-ai スキル** を参照

要約・議題要約・わかりやすい表現（simpleText）の生成とDB反映は別スキル。パッチの `documentId` は **オフセット後の `source_document_id`**（例 `1004580`）にすること。**DB反映前のユーザー確認は必須**。

## ⑥ 公開

`committee_meetings.publish_status` を `published` にする。**必ず対象の `source_document_id` を明示**（`.in(...)`）し、全件更新を避ける。本番・ローカル両方で実行。

> 公開ゲート（リポジトリで `publish_status='published'` を絞る）と `publish-committee-meetings.ts` は別PRで導入。未マージの環境では repository にゲートが無く draft でも表示され得る点に注意（掲載時は published にすれば整合する）。

## チェックリスト
- [ ] `source_document_id` はオフセット後（実Id+1,000,000）／`source_url` は実Idのリンク
- [ ] 重複会議を作っていない（開催日＋slugで既存と照合）
- [ ] 議題が実態に合っている（粗ければ手動議題に）
- [ ] AI生成物はユーザー確認済み（数値照合・簡体字なし・です/ます）
- [ ] ローカルで通してから本番へ／公開は対象id明示
