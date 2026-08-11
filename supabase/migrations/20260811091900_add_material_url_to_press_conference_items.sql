-- press_conference_items に配付資料（PDF）のURLを追加
-- 発表項目（announcement）に紐づく配付資料へのリンクを表示するために使用する
alter table press_conference_items
  add column if not exists material_url text;

comment on column press_conference_items.material_url is '配付資料（PDF等）へのURL。主に announcement で使用。無い場合は null';
