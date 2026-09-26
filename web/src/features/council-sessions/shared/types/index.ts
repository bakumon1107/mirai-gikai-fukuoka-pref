export type CouncilSession = {
  id: string;
  name: string;
  slug: string | null;
  council_url: string | null;
  start_date: string;
  end_date: string | null;
  is_active: boolean;
  /** 会期の節目（設計書 5.3.3 節）。会期日程ページ未取得なら null */
  schedule_milestones: SessionMilestones | null;
  created_at: string;
  updated_at: string;
};

/** 日付の範囲。1日だけなら from と to が同じ */
export type DateRange = {
  from: string;
  to: string;
};

/**
 * 会期の節目。トップの「会期の流れ」に出す。
 *
 * **`billVote`（議案採決日）は `end_date`（閉会日）と別の日になりうる。**
 * 令和8年9月定例会は採決 10月1日・閉会 10月16日、
 * 令和7年12月定例会はどちらも 12月19日。どちらもありうるため
 * 「閉会日＝採決日」と決め打ちしない。
 *
 * 臨時会は質問を行わないことがあり、各項目は欠けうる。
 */
export type SessionMilestones = {
  representativeQuestions: DateRange | null;
  generalQuestions: DateRange | null;
  standingCommittees: DateRange | null;
  billVote: string | null;
};
