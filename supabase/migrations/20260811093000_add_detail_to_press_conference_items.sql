-- press_conference_items に発表項目の詳しい全文を追加
-- summary は概要（常時表示）、detail は「詳しく見る」で展開表示する全文。
-- 説明が長い発表を1カードに詰め込まず、概要＋任意展開で可読性を保つ。
alter table press_conference_items
  add column if not exists detail text;

comment on column press_conference_items.detail is '発表項目の詳しい全文。「詳しく見る」で展開表示。無い場合は null（概要のみ表示）';

-- RLS を有効化（ポリシーは定義しない。アクセスは createAdminClient 経由）
alter table press_conference_items enable row level security;
