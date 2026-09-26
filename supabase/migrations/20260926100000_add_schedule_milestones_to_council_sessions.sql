-- council_sessions に会期の節目を追加
--
-- 背景（設計書 5.3.2 節 段階2 / 5.3.3 節）:
-- トップの会期中ヒーローに「会期の流れ」を出すため、代表質問・一般質問・
-- 常任委員会・議案採決の日程が要る。これまで council_sessions は
-- start_date / end_date しか持たず、会期日程ページのパーサーも
-- 開会日と閉会日しか抽出していなかったため、4ステップを出せなかった。
--
-- **議案採決日は閉会日と別に持つ。** 令和8年9月定例会は議案採決 10月1日の
-- あとに決算特別委員会が続き、閉会は 10月16日。一方 令和7年12月定例会は
-- どちらも 12月19日。「閉会日＝採決日」と決め打ちすると、議案がいつ
-- 決まったかを誤って伝えることになる。
--
-- 列を4本に割らず jsonb 1本にしたのは、質問・委員会が単日ではなく
-- 範囲（from/to）を持つため。committee_meetings.topics や
-- general_questions.topics と同じ扱いに揃える。
--
-- 形（いずれも欠けうるので null 可。臨時会は質問を行わないことがある）:
--   {
--     "representativeQuestions": { "from": "2026-09-15", "to": "2026-09-17" },
--     "generalQuestions":        { "from": "2026-09-18", "to": "2026-09-25" },
--     "standingCommittees":      { "from": "2026-09-28", "to": "2026-09-30" },
--     "billVote":                "2026-10-01"
--   }

alter table council_sessions
  add column schedule_milestones jsonb;

comment on column council_sessions.schedule_milestones is
  '会期の節目。会期日程ページから抽出する。billVote（議案採決日）は end_date（閉会日）と別の日になりうる。未取得は null';
