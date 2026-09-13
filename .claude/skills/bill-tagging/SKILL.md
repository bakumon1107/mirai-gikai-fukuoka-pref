---
name: bill-tagging
description: 議案（bills）にタグを付けてトップページに表示させる運用のリファレンス。議案を投入したのにトップに出ない・タグ付けしたいときに使う。
---

# 議案タグ付けスキル

議案（`bills`）をDBに投入した後、**トップページに表示させるためのタグ付け運用**をまとめたスキル。

> **背景**: 議案を投入・公開しても「トップページに議案が出ない」という事象が起きる。原因はほぼ **タグ（`bills_tags`）と `is_featured` が未設定** で、トップの表示条件を満たしていないこと。データが無いのではなく「表示経路の条件を満たすデータが無い」のが典型。

---

## トップページが議案を出す2経路（最重要）

`web/src/app/(main)/page.tsx` が議案を表示する経路は **2つだけ**。どちらの経路も、loaderの実装上、次の**表示条件をすべて満たす議案**に限られる。

**共通の表示条件（全経路）**

- `bills.publish_status = 'published'`
- **表示中の難易度**（`difficulty_level`）に一致する `bill_contents` 行が存在する。無い議案は整形時に除外され、トップに出ない（loaderは該当難易度の `bill_contents[0]` を採用）。
- **会期**: アクティブ会期（`council_sessions.is_active = true`）があればその会期に絞る。**アクティブ会期が無い場合は全会期が対象**（`council_session_id` で絞らない）。

その上で、各セクションの追加条件は次のとおり。

1. **注目の議案**（`FeaturedBillSection`）
   - ソース: `getFeaturedBills()` → 上記に加え `bills.is_featured = true`
2. **タグ別議案一覧**（`BillsByTagSection`）
   - ソース: `getBillsByFeaturedTags()` → 上記に加え `bills_tags` で **`featured_priority` が設定されたタグ**に紐づく

→ **`is_featured = false` かつ `bills_tags` 未登録の議案は、トップに1件も出ない**（会期詳細ページ `/sessions/[session_slug]/bills` には全件出る）。加えて、`publish_status` が published でない、または**表示中の難易度の `bill_contents` が無い**議案も出ないので、タグを付けても出ない場合はこの2点も確認する。

### キャッシュ（反映が遅い理由）

- `get-featured-bills.ts` / `get-bills-by-featured-tags.ts` は `unstable_cache` で **`revalidate: 600`（10分）**。
- **再デプロイ・ブラウザのハードリフレッシュでは即時反映されない**（Vercelのデータキャッシュはデプロイをまたいで残る／ハードリフレッシュはサーバーキャッシュに無関係）。
- タグ付け後、`revalidate: 600` によりキャッシュは**10分で古く（stale）**なり、**その後の最初のアクセスで再取得**される（きっかり10分後に必ず反映される保証ではなく、次アクセスのタイミング次第）。即時反映したい場合は `revalidateTag`/`revalidatePath` かVercelダッシュボードでのパージが必要。急ぐ理由がなければ待つ。

---

## スキーマ

```text
bills            … 議案本体（is_featured, publish_status, council_session_id など）
bill_contents    … 議案の平易化タイトル/要約（1議案に複数入りうる。loaderは [0] を採用）
tags             … タグマスタ（label UNIQUE, featured_priority, description）
bills_tags       … 議案×タグの中間テーブル（PK: bill_id + tag_id）
```

- `tags.featured_priority` が **非NULL** のタグだけがトップの「タグ別」セクションに現れる（`findFeaturedTags()` が `featured_priority is not null` で絞る）。
- 中間テーブルは `bills_tags`（`bill_tags` ではない）。

参照ファイル:
- `web/src/features/bills/server/loaders/get-bills-by-featured-tags.ts`
- `web/src/features/bills/server/loaders/get-featured-bills.ts`
- `web/src/features/bills/server/repositories/bill-repository.ts`（`findFeaturedTags`, `findTagsByBillIds`, `findPublishedBillsByTag`）

---

## タグ設計（福岡県版）

福岡県版の `featured_priority` 付きタグは **現状3つだけ**。ID は環境ごとに違うので **必ずDBから引く**（下記ワークフロー参照）。

`featured_priority` の昇順が **トップページ「タグ別議案一覧」の表示順** になる（`findFeaturedTags()` が `order by featured_priority asc`）。市民に身近なテーマを上に置くため、現状は以下の順。

| priority | label | 対象（description） |
|---|---|---|
| 1 | 子育て・教育 | 子育て支援、教育政策、若者支援に関する議案 |
| 2 | 福祉・医療 | 福祉、医療、高齢者支援に関する議案 |
| 3 | まちづくり・環境 | まちづくり、環境保護、都市計画に関する議案 |

> 表示順を変えたいときは `tags.featured_priority` をPATCHで振り直す（本番DB更新なので事前にユーザー確認）。

### 分類の方針（重要）

- **満遍なく全議案にタグを振る必要はない**。既存タグに **内容が合致する議案だけ** に付ける。合致しないものは無理に付けず未タグのままでよい（会期詳細ページには全件出る）。
- 迷ったら **タイトル・要約（`bill_contents`）の内容** で判断する。議案の正式名称（`bills.name`）は形式的で判別しにくいことがある。

### 分類のあたり（キーワード目安）

福岡市版の一般質問カテゴリ分類（`general-questions` スキルの8カテゴリ）が語彙の参考になる。ただし福岡県版の議案タグは上記3つに集約する。

| タグ | 拾う内容の例 |
|---|---|
| まちづくり・環境 | 建築基準・防火、都市関係手数料、国土利用計画、県営住宅（団地）建築工事、道路・トンネル・跨線橋などのインフラ工事、環境保護 |
| 子育て・教育 | 保育所・認定こども園の基準、児童福祉（一時保護）、就学支援金、学校（高校・特別支援学校）の施設工事 |
| 福祉・医療 | 医薬品の備蓄取得、医療・福祉サービス、高齢者・障害者支援 |
| **タグなし**（付けない） | 税制（県税条例・自動車税等）、職員手当・旅費・給与、農業土地改良・経費負担、防災設備の単純取得、訴えの提起、委員任命などの人事・法務案件 |

> 工事請負契約・財産取得は形式的な議案だが、**対象施設のテーマ**（学校→子育て・教育、県営住宅・道路→まちづくり・環境、医薬品→福祉・医療）で拾えるものは拾う。同型議案が多くセクションが埋まりそうな場合は、含める/外すをユーザーに確認する。

---

## ワークフロー

DB接続の規約は `db-access` スキルに従う。**本番URL・キーは `.env.production` から読む**（`db-access` スキルにハードコードされたURLは古い場合がある。福岡県本番は `ugvzabneccydyakupfyl`）。

### Step 0: 認証ヘッダを設定ファイルに（キーをargvに出さない）

service-role key を `curl -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"` のように渡すと、展開後の**キーがプロセスの引数（argv）に載り**、`ps` や `/proc` から見え得る。キーを引数に出さないよう、**ヒアドキュメントで設定ファイルに書き**（`cat`・リダイレクトの引数に鍵を置かない）、`curl --config` で読ませる。

```bash
set -a; . ./.env.production; set +a
umask 077
CURL_AUTH="$(mktemp)"
# 鍵は heredoc の本文（＝ファイル内容）に展開され、argv には載らない
cat > "$CURL_AUTH" <<EOF
header = "apikey: $SUPABASE_SERVICE_ROLE_KEY"
header = "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY"
EOF
# 以降の curl は -H の代わりに --config "$CURL_AUTH" を使う。作業後に rm -f "$CURL_AUTH"
```

### Step 1: アクティブ会期とタグIDを取得

```bash
# アクティブ会期
curl -s --config "$CURL_AUTH" "$SUPABASE_URL/rest/v1/council_sessions?select=id,name,is_active&is_active=eq.true"
# featured_priority 付きタグ（ID取得）
curl -s --config "$CURL_AUTH" "$SUPABASE_URL/rest/v1/tags?select=id,label,featured_priority&featured_priority=not.is.null&order=featured_priority.asc"
```

### Step 2: 対象議案を内容ごと取得

```bash
curl -s --config "$CURL_AUTH" "$SUPABASE_URL/rest/v1/bills?select=id,name,is_featured,bill_contents(title,summary)&council_session_id=eq.<SESSION_ID>&publish_status=eq.published&order=created_at.asc"
```

### Step 3: 分類してユーザーにレビュー提示（必須）

- 各議案を上記方針で3タグに分類（合致しないものは「タグなし」）。
- **INSERT前に、必ず分類案（議案タイトル×割り当てタグの表）をユーザーに提示して承認を得る**（AI生成の分類をDBに反映する前のレビューは必須）。
- 同型議案が多いカテゴリ（例: 県営団地の建築工事が複数）は、含める/外すを明示的に確認する。

### Step 4: `bills_tags` へINSERT

承認された割り当てを JSON 配列でファイルに書き（Editツール／Write推奨。Bashヒアドキュメント禁止）、`--data @file` でPOSTする。

```bash
# payload.json 例:
# [ {"bill_id":"<uuid>","tag_id":"<tag_uuid>"}, ... ]
curl -s -X POST --config "$CURL_AUTH" "$SUPABASE_URL/rest/v1/bills_tags" \
  -H "Content-Type: application/json" -H "Prefer: return=minimal" \
  --data @payload.json -w "HTTP %{http_code}\n"
```

- PK は `(bill_id, tag_id)`。**再実行時は重複でconflictするため冪等にしたい場合は `Prefer: resolution=ignore-duplicates` を付ける**。

### Step 5: 検証

```bash
# タグ×会期×published で件数確認（表示条件に合わせる）
# アクティブ会期が無い運用のときは bills.council_session_id の条件を外す
curl -s --config "$CURL_AUTH" "$SUPABASE_URL/rest/v1/bills_tags?select=bill_id,bills!inner(council_session_id,publish_status)&tag_id=eq.<TAG_ID>&bills.council_session_id=eq.<SESSION_ID>&bills.publish_status=eq.published" \
  -H "Prefer: count=exact" -I | grep -i content-range
```

- この件数は「タグ×会期×published」まで。**実際にトップへ出るには、さらに表示中の難易度（`difficulty_level`）の `bill_contents` 行があることが条件**なので、件数が合うのに出ない場合はその難易度の `bill_contents` の有無も確認する（「トップページが議案を出す2経路」の共通表示条件を参照）。
- 反映は `revalidate: 600` により**10分でstale化 → 次アクセスで再取得**（きっかり10分で必ず反映される訳ではない）。デプロイやハードリフレッシュでは早まらない。即時なら `revalidateTag`/`revalidatePath` かVercelでのパージ。
- 作業後は認証設定ファイルを削除する: `rm -f "$CURL_AUTH"`

---

## 注意事項・チェックリスト

- [ ] **表示されない=データ無し、と早合点しない**。まず `is_featured` と `bills_tags` の設定状況を疑う。
- [ ] タグIDは環境ごとに違う。**必ずDBから引く**（ハードコードしない）。
- [ ] 中間テーブルは `bills_tags`。`featured_priority` 非NULLのタグだけがトップに出る。
- [ ] 分類はDBに入れる前に**必ずユーザー承認**（`docs/CLAUDE.md` のAI生成コンテンツDB更新ルール）。
- [ ] 満遍なく埋めない。合致するものだけ適切に付ける。
- [ ] 反映は `revalidate: 600` で10分stale化→次アクセスで再取得（きっかり10分保証ではない）。再デプロイ・ハードリフレッシュは効かない。即時は `revalidateTag`/`revalidatePath`。
- [ ] service-role key は curl の `-H` で渡さず、Step 0 の設定ファイル（`--config`）経由にする（argv露出防止）。作業後に `rm -f "$CURL_AUTH"`。

## 関連

- `db-access` スキル … 本番DB接続規約
- `web/src/app/(main)/page.tsx` … トップの議案表示セクション
- `web/src/features/bills/server/loaders/get-bills-by-featured-tags.ts` … タグ別表示・並び順（`featured_priority` 昇順）
