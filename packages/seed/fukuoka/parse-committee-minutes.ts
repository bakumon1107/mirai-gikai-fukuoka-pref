/**
 * parse-committee-minutes.ts
 *
 * 福岡県議会 会議録検索システム（dbsr.jp）の委員会議事録HTMLをパースする純粋関数群。
 * スクレイパー本体（scrape-committee-minutes.ts）から利用する。
 */

/** 委員会の区分 */
export type CommitteeType =
  | "standing" // 常任委員会
  | "special" // 調査特別委員会
  | "budget" // 予算特別委員会
  | "audit" // 決算特別委員会
  | "management"; // 議会運営委員会

/** 会議録検索システム上の会議名と現行委員会の対応 */
export type CommitteeMeta = {
  /** 会議の種類でさがす画面の Cabinet[] の値 */
  cabinetId: number;
  /** 会議録検索システム上の会議名（開催時点の名称） */
  dbsrName: string;
  /** 現行の委員会名（改組・改称後） */
  currentName: string;
  /** URL・ファイル名用スラッグ（同一系統の旧名称は同じスラッグに揃える） */
  slug: string;
  type: CommitteeType;
};

/**
 * 現行委員会と、その前身で今年の議事録が残る旧名称の一覧。
 * 令和8年4月の委員会改組で「厚生労働環境→厚生環境」「県民生活商工→商工労働」に
 * 名称変更されたため、旧名称も同じ系統として取り込む。
 */
export const CURRENT_COMMITTEES: CommitteeMeta[] = [
  // 常任委員会
  {
    cabinetId: 3,
    dbsrName: "総務企画地域振興委員会",
    currentName: "総務企画地域振興委員会",
    slug: "somu-kikaku-chiiki",
    type: "standing",
  },
  {
    cabinetId: 4,
    dbsrName: "厚生環境委員会",
    currentName: "厚生環境委員会",
    slug: "kosei-kankyo",
    type: "standing",
  },
  {
    cabinetId: 12,
    dbsrName: "厚生労働環境委員会",
    currentName: "厚生環境委員会",
    slug: "kosei-kankyo",
    type: "standing",
  },
  {
    cabinetId: 5,
    dbsrName: "県民生活商工委員会",
    currentName: "商工労働委員会",
    slug: "shoko-rodo",
    type: "standing",
  },
  {
    cabinetId: 6,
    dbsrName: "農林水産委員会",
    currentName: "農林水産委員会",
    slug: "norin-suisan",
    type: "standing",
  },
  {
    cabinetId: 7,
    dbsrName: "県土整備委員会",
    currentName: "県土整備委員会",
    slug: "kendo-seibi",
    type: "standing",
  },
  {
    cabinetId: 8,
    dbsrName: "建築都市委員会",
    currentName: "建築都市委員会",
    slug: "kenchiku-toshi",
    type: "standing",
  },
  {
    cabinetId: 9,
    dbsrName: "文教委員会",
    currentName: "文教委員会",
    slug: "bunkyo",
    type: "standing",
  },
  {
    cabinetId: 10,
    dbsrName: "警察委員会",
    currentName: "警察委員会",
    slug: "keisatsu",
    type: "standing",
  },
  // 議会運営委員会（議案審査のある会議のみ収録されている）
  {
    cabinetId: 19,
    dbsrName: "議会運営委員会",
    currentName: "議会運営委員会",
    slug: "gikai-unei",
    type: "management",
  },
  // 調査特別委員会
  {
    cabinetId: 20,
    dbsrName: "空港・交通インフラ調査特別委員会",
    currentName: "空港・交通インフラ調査特別委員会",
    slug: "kuko-kotsu-infra",
    type: "special",
  },
  {
    cabinetId: 21,
    dbsrName: "子育て支援・人財育成調査特別委員会",
    currentName: "子育て支援・人財育成調査特別委員会",
    slug: "kosodate-jinzai",
    type: "special",
  },
  {
    cabinetId: 22,
    dbsrName: "再生可能エネルギー等調査特別委員会",
    currentName: "再生可能エネルギー等調査特別委員会",
    slug: "saisei-energy",
    type: "special",
  },
  {
    cabinetId: 23,
    dbsrName: "国際化・多文化共生社会調査特別委員会",
    currentName: "国際化・多文化共生社会調査特別委員会",
    slug: "kokusaika-tabunka",
    type: "special",
  },
  {
    cabinetId: 24,
    dbsrName: "ワンヘルス・地方分権調査特別委員会",
    currentName: "ワンヘルス・地方分権等調査特別委員会",
    slug: "one-health-chihobunken",
    type: "special",
  },
  {
    cabinetId: 25,
    dbsrName: "ワンヘルス・地方分権等調査特別委員会",
    currentName: "ワンヘルス・地方分権等調査特別委員会",
    slug: "one-health-chihobunken",
    type: "special",
  },
  {
    cabinetId: 26,
    dbsrName: "スポーツ立県調査特別委員会",
    currentName: "スポーツ立県調査特別委員会",
    slug: "sports-rikken",
    type: "special",
  },
  // 予算・決算特別委員会
  {
    cabinetId: 46,
    dbsrName: "予算特別委員会",
    currentName: "予算特別委員会",
    slug: "yosan",
    type: "budget",
  },
  {
    cabinetId: 47,
    dbsrName: "決算特別委員会",
    currentName: "決算特別委員会",
    slug: "kessan",
    type: "audit",
  },
];

/** 検索結果一覧の1文書 */
export type ListedDoc = {
  documentId: number;
  title: string;
  /** 開催日（YYYY-MM-DD） */
  date: string;
};

/** 発言者の種別 */
export type SpeakerType =
  | "chairperson" // 委員長・副委員長
  | "member" // 委員
  | "executive" // 執行部（課長・部長・知事等）
  | "unknown"; // 発言者ラベルなし（開会時刻の記載等）

/** 1発言 */
export type Speech = {
  voiceNo: number;
  /** 「井上博行委員長」のような氏名＋役職の連結ラベル。地の文の場合はnull */
  speakerLabel: string | null;
  speakerType: SpeakerType;
  text: string;
};

/** HTML実体参照を最低限デコードする */
export function decodeEntities(text: string): string {
  return text
    .replaceAll("&lt;", "<")
    .replaceAll("&gt;", ">")
    .replaceAll("&quot;", '"')
    .replaceAll("&#039;", "'")
    .replaceAll("&nbsp;", " ")
    .replaceAll("&amp;", "&");
}

/**
 * ページ内のリンクからセッションIDを抽出する。
 * 会議録検索システムはURLパス（/index.php/1234567）にセッションIDを埋め込む。
 */
export function extractSessionId(html: string): string | null {
  const match = html.match(/index\.php\/(\d+)/);
  return match ? match[1] : null;
}

/**
 * 検索結果ページのヒット件数（「N文書」）を抽出する。
 * 検索条件が意図どおり適用されたかの確認に使う。
 */
export function extractHitCount(html: string): number | null {
  const match = html.match(/<span class="color--red">([\d,]+)<\/span>文書/);
  return match ? Number(match[1].replaceAll(",", "")) : null;
}

/**
 * 検索結果一覧ページから文書一覧を抽出する。
 */
export function parseListPage(html: string): {
  docs: ListedDoc[];
  hasNext: boolean;
} {
  const docs: ListedDoc[] = [];
  const docRe =
    /DocumentID=(\d+)"[^>]*>([^<]+)<\/a>\s*<span class="result-title__date">開催日:\s*([\d-]+)<\/span>/g;
  for (const m of html.matchAll(docRe)) {
    docs.push({
      documentId: Number(m[1]),
      title: decodeEntities(m[2]).trim(),
      date: m[3],
    });
  }
  const hasNext = /<a href="[^"]*Page=\d+">次\s*&gt;<\/a>/.test(html);
  return { docs, hasNext };
}

/** 発言者ラベルから種別を判定する */
export function classifySpeaker(label: string): SpeakerType {
  if (label.endsWith("委員長")) return "chairperson";
  if (label.endsWith("委員")) return "member";
  return "executive";
}

// 発言者ラベルの末尾に来る役職語尾。ラベルの区切り判定に使う
const ROLE_SUFFIX_RE =
  /(委員長|副委員長|委員|知事|副知事|教育長|本部長|書記|課長|部長|局長|次長|室長|所長|理事|参事|監|議長|副議長)$/;

/**
 * 発言本文の冒頭から発言者ラベルを取り出す。
 * 例: 「◯井上博行委員長　それでは、…」→ label「井上博行委員長」
 * 氏名が「◯堀\n大助委員」のように改行で分断されることがあるため、
 * 最初の区切りまでで役職語尾に達しない場合は次の語まで取り込む。
 * 開会時刻の記載など「◯」で始まらないブロックはラベルなしとして扱う。
 */
export function splitSpeakerLabel(text: string): {
  speakerLabel: string | null;
  body: string;
} {
  const match = text.match(/^◯([^\s　]+)[　\s]+([\s\S]*)$/);
  if (!match) {
    return { speakerLabel: null, body: text };
  }
  let speakerLabel = match[1];
  let body = match[2];
  if (!ROLE_SUFFIX_RE.test(speakerLabel)) {
    const continued = body.match(/^([^\s　]+)[　\s]+([\s\S]*)$/);
    if (continued && ROLE_SUFFIX_RE.test(continued[1])) {
      speakerLabel += continued[1];
      body = continued[2];
    }
  }
  return { speakerLabel, body };
}

/**
 * 発言内容ページ（Template=doc-page）から全発言を抽出する。
 */
export function parseDocPage(html: string): Speech[] {
  const speeches: Speech[] = [];
  const voiceRe =
    /<div class="page-text__voice" id="VoiceNo(\d+)">([\s\S]*?)<\/div>/g;
  for (const m of html.matchAll(voiceRe)) {
    const voiceNo = Number(m[1]);
    let inner = m[2];
    // 発言番号スパンを除去
    inner = inner.replace(/<span class="page-text__number[\s\S]*?<\/span>/g, "");
    // HTMLソース上の生改行（<br />直後等）を除去してから改行タグを改行文字に
    // 変換し、残りのタグを除去する
    inner = inner
      .replace(/\r?\n/g, "")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "");
    const text = decodeEntities(inner)
      .split("\n")
      .map((line) => line.replace(/\s+$/, ""))
      .join("\n")
      .trim();
    if (text.length === 0) continue;
    const { speakerLabel, body } = splitSpeakerLabel(text);
    speeches.push({
      voiceNo,
      speakerLabel,
      speakerType: speakerLabel ? classifySpeaker(speakerLabel) : "unknown",
      text: speakerLabel ? body : text,
    });
  }
  return speeches;
}

/**
 * 文書タイトルから対応する委員会を特定する。
 * 例: 「令和８年　空港・交通インフラ調査特別委員会　本文」
 * 旧名称（厚生労働環境委員会等）が現行名称（厚生環境委員会）を部分文字列として
 * 含むケースがあるため、dbsrNameが長い順に照合する。
 */
export function committeeFromTitle(title: string): CommitteeMeta | null {
  const sorted = [...CURRENT_COMMITTEES].sort(
    (a, b) => b.dbsrName.length - a.dbsrName.length
  );
  return sorted.find((c) => title.includes(c.dbsrName)) ?? null;
}

/**
 * 文書の安定した閲覧URLを組み立てる。
 * セッションIDのパス部分は任意の数値でよく、アクセス時に新しいセッションが
 * 発行されて該当文書が表示される（実機で確認済み）。
 */
export function buildSourceUrl(documentId: number): string {
  return `https://www.pref.fukuoka.dbsr.jp/index.php/1?Template=doc-one-frame&VoiceType=onehit&DocumentID=${documentId}`;
}

/** 会議内の1議題（機械抽出） */
export type MeetingTopic = {
  order: number;
  title: string;
  /** この議題の宣言があった発言番号（議題の議論はここから始まる） */
  startVoiceNo: number;
  /** この議題の最後の発言番号 */
  endVoiceNo: number;
  /** この議題の範囲で発言した人のラベル一覧（登場順・重複なし） */
  speakerLabels: string[];
};

// 「◯◯について」を議題といたします / 第◯号議案「◯◯」所管分を議題といたします
const TOPIC_DECLARATION_RE =
  /(第[〇一二三四五六七八九十百千]+号議案)?「(.+?)」(?:所管分)?を議題と/g;
// 予算・決算特別委員会の部局別審査日: 本日は、◯◯の審査を予定いたしております
const AUDIT_DECLARATION_RE = /本日は、(.+?)の審査を(?:予定|行)/;

/**
 * 発言一覧から議題を機械抽出する。
 * 委員長の「『◯◯』を議題といたします」という定型宣言で区切り、
 * 次の宣言までの発言範囲と発言者を議題に対応付ける。
 * 予算・決算特別委員会の部局別審査日は「◯◯の審査」を1議題として扱う。
 */
export function extractTopics(speeches: Speech[]): MeetingTopic[] {
  type Declaration = { title: string; voiceNo: number };
  const declarations: Declaration[] = [];

  for (const speech of speeches) {
    for (const m of speech.text.matchAll(TOPIC_DECLARATION_RE)) {
      declarations.push({
        title: `${m[1] ?? ""}${m[1] ? "「" : ""}${m[2]}${m[1] ? "」" : ""}`,
        voiceNo: speech.voiceNo,
      });
    }
    if (declarations.length === 0) {
      const audit = speech.text.match(AUDIT_DECLARATION_RE);
      if (audit) {
        declarations.push({
          title: `${audit[1]}の審査`,
          voiceNo: speech.voiceNo,
        });
      }
    }
  }

  const lastVoiceNo = speeches.at(-1)?.voiceNo ?? 0;
  return declarations.map((decl, i) => {
    const startVoiceNo = decl.voiceNo;
    const next = declarations
      .slice(i + 1)
      .find((d) => d.voiceNo > decl.voiceNo);
    const endVoiceNo = next ? next.voiceNo : lastVoiceNo;
    const speakerLabels: string[] = [];
    for (const s of speeches) {
      if (
        s.voiceNo >= startVoiceNo &&
        s.voiceNo <= endVoiceNo &&
        s.speakerLabel &&
        !speakerLabels.includes(s.speakerLabel)
      ) {
        speakerLabels.push(s.speakerLabel);
      }
    }
    return { order: i + 1, title: decl.title, startVoiceNo, endVoiceNo, speakerLabels };
  });
}

/** 発言一覧から原文全文（プレーンテキスト）を組み立てる */
export function buildRawText(speeches: Speech[]): string {
  return speeches
    .map((s) => (s.speakerLabel ? `◯${s.speakerLabel}　${s.text}` : s.text))
    .join("\n\n");
}

// ============================================================================
// 新dbsr.jp（Laravel版・2026年リニューアル）向けのパース
//
// 旧システム（URLパスにセッションID＋DocumentID）から、検索フォームを
// /100000 にPOSTしてセッションパスを発行し、
// /<session>?Template=document&Id=<Id> で本文を得る方式に変わった。
// - 委員会は CabinetName[] のコード（sc/nr/bu…）で絞り込む
// - 本文は <p class="voice__text"> に ◯話者　本文（<br />区切り）で入る
// - 発言番号は data-voice_code 属性
// ============================================================================

/** 新サイトの現行委員会（CabinetName[] コード → slug） */
export const NEW_SITE_COMMITTEES: {
  code: string;
  dbsrName: string;
  currentName: string;
  slug: string;
  type: CommitteeType;
}[] = [
  {
    code: "sc",
    dbsrName: "総務企画地域振興委員会",
    currentName: "総務企画地域振興委員会",
    slug: "somu-kikaku-chiiki",
    type: "standing",
  },
  {
    code: "ko_2",
    dbsrName: "厚生環境委員会",
    currentName: "厚生環境委員会",
    slug: "kosei-kankyo",
    type: "standing",
  },
  {
    code: "cl",
    dbsrName: "商工労働委員会",
    currentName: "商工労働委員会",
    slug: "shoko-rodo",
    type: "standing",
  },
  {
    code: "nr",
    dbsrName: "農林水産委員会",
    currentName: "農林水産委員会",
    slug: "norin-suisan",
    type: "standing",
  },
  {
    code: "ke",
    dbsrName: "県土整備委員会",
    currentName: "県土整備委員会",
    slug: "kendo-seibi",
    type: "standing",
  },
  {
    code: "kt",
    dbsrName: "建築都市委員会",
    currentName: "建築都市委員会",
    slug: "kenchiku-toshi",
    type: "standing",
  },
  {
    code: "bu",
    dbsrName: "文教委員会",
    currentName: "文教委員会",
    slug: "bunkyo",
    type: "standing",
  },
  {
    code: "pl",
    dbsrName: "警察委員会",
    currentName: "警察委員会",
    slug: "keisatsu",
    type: "standing",
  },
];

/** 検索フォーム(search-top)からCSRFトークン(_token)を取り出す */
export function extractCsrfToken(html: string): string | null {
  const m = html.match(/name="_token"[^>]*value="([^"]+)"/);
  return m ? m[1] : null;
}

/** 検索結果一覧HTMLから発行済みセッションパス（例: 106343）を取り出す */
export function extractSessionPath(html: string): string | null {
  const m = html.match(/\/(\d{4,})\?Template=document/);
  return m ? m[1] : null;
}

/** 新サイトの検索結果一覧から {DocumentId, 開催日} を抽出する（開催日順は新しい順） */
export function parseSearchListPage(
  html: string
): { documentId: number; date: string }[] {
  const docs: { documentId: number; date: string }[] = [];
  const seen = new Set<number>();
  const re = /Template=document&Id=(\d+)[\s\S]*?開催日:\s*(\d{4}-\d{2}-\d{2})/g;
  for (const m of html.matchAll(re)) {
    const id = Number(m[1]);
    if (seen.has(id)) continue;
    seen.add(id);
    docs.push({ documentId: id, date: m[2] });
  }
  return docs;
}

/** 新サイトの文書ページ(<p class="voice__text">)から全発言を抽出する */
export function parseDocumentPage(html: string): Speech[] {
  const speeches: Speech[] = [];
  const voiceRe =
    /data-voice_code="(\d+)"[\s\S]*?<p class="voice__text">([\s\S]*?)<\/p>/g;
  for (const m of html.matchAll(voiceRe)) {
    const voiceNo = Number(m[1]);
    const inner = m[2]
      .replace(/\r?\n/g, "")
      .replace(/<br\s*\/?>/g, "\n")
      .replace(/<[^>]+>/g, "");
    const text = decodeEntities(inner)
      .split("\n")
      .map((line) => line.replace(/\s+$/, ""))
      .join("\n")
      .trim();
    if (text.length === 0) continue;
    const { speakerLabel, body } = splitSpeakerLabel(text);
    speeches.push({
      voiceNo,
      speakerLabel,
      speakerType: speakerLabel ? classifySpeaker(speakerLabel) : "unknown",
      text: speakerLabel ? body : text,
    });
  }
  return speeches;
}

/** 文書ページの会議名（例:「令和８年　総務企画地域振興委員会　本文」） */
export function extractDocName(html: string): string | null {
  const m = html.match(/command__docname"[^>]*>([^<]+)</);
  return m ? decodeEntities(m[1]).trim() : null;
}

/** 新サイトの文書閲覧URL（セッションパスは任意の数値でよい・引数は実Id） */
export function buildNewSourceUrl(rawDocumentId: number): string {
  return `https://www.pref.fukuoka.dbsr.jp/1?Template=document&Id=${rawDocumentId}`;
}

/**
 * 新サイトのDocumentId（実Id）を source_document_id に採番するためのオフセット。
 * 2026年のサイトリニューアルで実Idが再採番され、旧サイト由来の既存
 * source_document_id と衝突する（例: 新sc 4580 = 旧 厚生環境 4580）。
 * 新サイト由来の会議は「実Id + このオフセット」で採番し、id空間を分離する。
 * source_url は buildNewSourceUrl(実Id) で本物のリンクを保つ。
 */
export const NEW_SITE_ID_OFFSET = 1_000_000;
