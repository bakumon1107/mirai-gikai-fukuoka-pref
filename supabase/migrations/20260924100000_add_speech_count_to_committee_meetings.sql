-- committee_meetings に発言数の生成列を追加
--
-- 背景（設計書 5.6.1 節）:
-- 発言は独立テーブルではなく committee_meetings.speeches（jsonb 配列）に入っている。
-- 一覧用の SELECT は全発言本文を載せない方針のため speeches を除外しているが、
-- トップページの委員会カードでは
--   - 発言数が少ない回を選定から除外する（10発言未満）
--   - 「発言のやり取りを読む（N発言）」の N を出す
-- の2つで件数が必要になる。
--
-- 生成列にすることで、speeches 本体をクライアントへ送らずに件数だけを取得できる。

alter table committee_meetings
  add column speech_count integer
  generated always as (
    case
      when jsonb_typeof(speeches) = 'array' then jsonb_array_length(speeches)
      else 0
    end
  ) stored;

comment on column committee_meetings.speech_count is
  '発言数（speeches の要素数）。生成列のため直接更新しない。配列でない場合は0';

-- 開催日の新しい順に、発言数の条件を満たす回を引くためのインデックス
create index if not exists committee_meetings_speech_count_idx
  on committee_meetings (publish_status, speech_count, meeting_date desc);
