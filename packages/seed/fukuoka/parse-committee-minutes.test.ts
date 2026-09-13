import { describe, expect, it } from "vitest";
import {
  buildNewSourceUrl,
  buildRawText,
  buildSourceUrl,
  classifySpeaker,
  committeeFromTitle,
  decodeEntities,
  extractCsrfToken,
  extractDocName,
  extractHitCount,
  extractSessionId,
  extractPaginationInfo,
  extractSessionPath,
  extractTopics,
  NEW_SITE_COMMITTEES,
  NEW_SITE_ID_OFFSET,
  parseDocPage,
  parseDocumentPage,
  parseListPage,
  parseSearchListPage,
  type Speech,
  splitSpeakerLabel,
} from "./parse-committee-minutes";

// 実際の会議録検索システムのHTMLから抜粋したフィクスチャ
const LIST_HTML = `
<div class="result-doc">
    <div class="result-title">
        <span class="result-title__number">#1</span>
        <a class="result-title__name" href="/index.php/3476495?Template=doc-one-frame&amp;VoiceType=onehit&amp;DocumentID=6618">令和８年　空港・交通インフラ調査特別委員会　本文</a>
        <span class="result-title__date">開催日: 2026-04-28</span>
    </div>
</div>
<div class="result-doc">
    <div class="result-title">
        <span class="result-title__number">#2</span>
        <a class="result-title__name" href="/index.php/3476495?Template=doc-one-frame&amp;VoiceType=onehit&amp;DocumentID=7391">令和８年度　予算特別委員会　本文</a>
        <span class="result-title__date">開催日: 2026-03-23</span>
    </div>
</div>
<ul class="pagination">
    <li class="active"><span>1</span></li><li><a href="/index.php/3476495?Template=list&amp;Page=2">2</a></li><li><a href="/index.php/3476495?Template=list&amp;Page=2">次 &gt;</a></li><li><a href="/index.php/3476495?Template=list&amp;Page=507">最後 &gt;&gt;</a></li>
</ul>
`;

const LAST_PAGE_HTML = `
<div class="result-doc">
    <div class="result-title">
        <a class="result-title__name" href="/index.php/3476495?Template=doc-one-frame&amp;VoiceType=onehit&amp;DocumentID=4580">令和８年　厚生環境委員会　本文</a>
        <span class="result-title__date">開催日: 2026-04-13</span>
    </div>
</div>
<ul class="pagination">
    <li><a href="/index.php/3476495?Template=list&amp;Page=5">5</a></li><li class="active"><span>6</span></li><li class="disabled"><span>次 &gt;</span></li>
</ul>
`;

const DOC_PAGE_HTML = `
<main class="page-text" id="main">
    <div class="page-text__voice" id="VoiceNo1">
        <p class="page-text__text border textwrap">
            <span class="page-text__number VoiceAnchor" data-voiceno="1">1</span>
            　　　令和八年四月二十八日（火曜日）<br />
　　　午　後　四　時　一　分　開　会<br />
◯井上博行委員長　それでは、定足数に達しておりますので、ただいまから空港・交通インフラ調査特別委員会を開会いたします。<br />
　順次執行部の説明を求めます。佐々木空港政策課長。<br />

        </p>
    </div>
    <div class="page-text__voice" id="VoiceNo2">
        <p class="page-text__text border textwrap">
            <span class="page-text__number VoiceAnchor" data-voiceno="2">2</span>
            ◯佐々木空港政策課長　それでは、福岡空港・北九州空港の航空路線の状況等について説明いたします。<br />
　国内線につきましては二十七路線となってございます。<br />

        </p>
    </div>
    <div class="page-text__voice" id="VoiceNo3">
        <p class="page-text__text border textwrap">
            <span class="page-text__number VoiceAnchor" data-voiceno="3">3</span>
            ◯堀大助委員　質問いたします。&amp;や&lt;を含む議題について伺います。<br />

        </p>
    </div>
</main>
`;

describe("extractHitCount", () => {
  it("ヒット件数を抽出する（カンマ付きも可）", () => {
    const html =
      '<p class="result-counter__hit"><span class="color--red">7,601</span>文書 （ <span class="color--red">317,619</span>発言）中の</p>';
    expect(extractHitCount(html)).toBe(7601);
  });

  it("件数表示がなければnullを返す", () => {
    expect(extractHitCount("<html></html>")).toBeNull();
  });
});

describe("extractSessionId", () => {
  it("リンクからセッションIDを抽出する", () => {
    expect(extractSessionId(LIST_HTML)).toBe("3476495");
  });

  it("セッションIDがない場合はnullを返す", () => {
    expect(extractSessionId("<html><body>empty</body></html>")).toBeNull();
  });
});

describe("parseListPage", () => {
  it("文書一覧（ID・タイトル・開催日）を抽出する", () => {
    const { docs } = parseListPage(LIST_HTML);
    expect(docs).toEqual([
      {
        documentId: 6618,
        title: "令和８年　空港・交通インフラ調査特別委員会　本文",
        date: "2026-04-28",
      },
      {
        documentId: 7391,
        title: "令和８年度　予算特別委員会　本文",
        date: "2026-03-23",
      },
    ]);
  });

  it("次ページの有無を判定する", () => {
    expect(parseListPage(LIST_HTML).hasNext).toBe(true);
    expect(parseListPage(LAST_PAGE_HTML).hasNext).toBe(false);
  });
});

describe("parseDocPage", () => {
  it("発言ブロックを発言者ラベル付きで抽出する", () => {
    const speeches = parseDocPage(DOC_PAGE_HTML);
    expect(speeches).toHaveLength(3);

    // 冒頭ブロックは開会時刻の地の文から始まるためラベルなし
    expect(speeches[0].voiceNo).toBe(1);
    expect(speeches[0].speakerLabel).toBeNull();
    expect(speeches[0].speakerType).toBe("unknown");
    expect(speeches[0].text).toContain("令和八年四月二十八日（火曜日）");
    expect(speeches[0].text).toContain("◯井上博行委員長");

    expect(speeches[1].speakerLabel).toBe("佐々木空港政策課長");
    expect(speeches[1].speakerType).toBe("executive");
    expect(speeches[1].text).toContain("国内線につきましては二十七路線");
    // タグ・発言番号スパンが除去されている
    expect(speeches[1].text).not.toContain("<");
    expect(speeches[1].text).not.toMatch(/^2/);
  });

  it("HTML実体参照をデコードする", () => {
    const speeches = parseDocPage(DOC_PAGE_HTML);
    expect(speeches[2].speakerLabel).toBe("堀大助委員");
    expect(speeches[2].speakerType).toBe("member");
    expect(speeches[2].text).toContain("&や<を含む議題");
  });
});

describe("splitSpeakerLabel", () => {
  it("◯で始まる発言からラベルと本文を分離する", () => {
    expect(splitSpeakerLabel("◯井上博行委員長　それでは、開会いたします。")).toEqual({
      speakerLabel: "井上博行委員長",
      body: "それでは、開会いたします。",
    });
  });

  it("◯で始まらないテキストはラベルなしとして返す", () => {
    const text = "　　　午後四時一分　開会";
    expect(splitSpeakerLabel(text)).toEqual({
      speakerLabel: null,
      body: text,
    });
  });

  it("改行で分断された氏名を役職語尾までつなげる", () => {
    expect(
      splitSpeakerLabel("◯堀\n大助委員　今のに関連して伺います。")
    ).toEqual({
      speakerLabel: "堀大助委員",
      body: "今のに関連して伺います。",
    });
  });
});

describe("classifySpeaker", () => {
  it("委員長・副委員長をchairpersonと判定する", () => {
    expect(classifySpeaker("井上博行委員長")).toBe("chairperson");
    expect(classifySpeaker("田中太郎副委員長")).toBe("chairperson");
  });

  it("委員をmemberと判定する", () => {
    expect(classifySpeaker("堀大助委員")).toBe("member");
  });

  it("執行部（課長・部長・知事等）をexecutiveと判定する", () => {
    expect(classifySpeaker("佐々木空港政策課長")).toBe("executive");
    expect(classifySpeaker("服部誠太郎知事")).toBe("executive");
    expect(classifySpeaker("山田企画・地域振興部長")).toBe("executive");
  });
});

describe("committeeFromTitle", () => {
  it("タイトルから委員会を特定する", () => {
    const c = committeeFromTitle(
      "令和８年　空港・交通インフラ調査特別委員会　本文"
    );
    expect(c?.slug).toBe("kuko-kotsu-infra");
    expect(c?.type).toBe("special");
  });

  it("旧名称は現行委員会にマッピングする", () => {
    const c = committeeFromTitle("令和８年　厚生労働環境委員会　本文");
    expect(c?.dbsrName).toBe("厚生労働環境委員会");
    expect(c?.currentName).toBe("厚生環境委員会");
    expect(c?.slug).toBe("kosei-kankyo");
  });

  it("現行名称も同じ系統のスラッグになる", () => {
    const c = committeeFromTitle("令和８年　厚生環境委員会　本文");
    expect(c?.dbsrName).toBe("厚生環境委員会");
    expect(c?.slug).toBe("kosei-kankyo");
  });

  it("県民生活商工委員会は商工労働委員会に引き継ぐ", () => {
    const c = committeeFromTitle("令和８年　県民生活商工委員会　本文");
    expect(c?.currentName).toBe("商工労働委員会");
    expect(c?.slug).toBe("shoko-rodo");
  });

  it("本会議など対象外のタイトルはnullを返す", () => {
    expect(committeeFromTitle("令和８年２月定例会（第33日）　本文")).toBeNull();
  });
});

describe("extractTopics", () => {
  const speech = (
    voiceNo: number,
    speakerLabel: string | null,
    text: string
  ): Speech => ({
    voiceNo,
    speakerLabel,
    speakerType: speakerLabel ? classifySpeaker(speakerLabel) : "unknown",
    text,
  });

  it("調査特別委員会型: 議題宣言で区切り、範囲と発言者を対応付ける", () => {
    const speeches = [
      speech(
        1,
        null,
        "◯井上博行委員長　開会いたします。\n　まず、「福岡空港・北九州空港の航空路線の状況等について」を議題といたします。"
      ),
      speech(2, "佐々木空港政策課長", "説明いたします。"),
      speech(3, "堀大助委員", "質問します。"),
      speech(
        4,
        "井上博行委員長",
        "以上で本件の質疑を終了いたします。\n　次に、「福岡県交通ビジョンの策定について」を議題といたします。"
      ),
      speech(5, "秋田交通政策課長", "御報告いたします。"),
    ];
    const topics = extractTopics(speeches);
    expect(topics).toHaveLength(2);
    expect(topics[0]).toMatchObject({
      order: 1,
      title: "福岡空港・北九州空港の航空路線の状況等について",
      startVoiceNo: 1,
      endVoiceNo: 4,
    });
    expect(topics[0].speakerLabels).toEqual([
      "佐々木空港政策課長",
      "堀大助委員",
      "井上博行委員長",
    ]);
    expect(topics[1]).toMatchObject({
      order: 2,
      title: "福岡県交通ビジョンの策定について",
      startVoiceNo: 4,
      endVoiceNo: 5,
      speakerLabels: ["井上博行委員長", "秋田交通政策課長"],
    });
  });

  it("議案審査型: 第◯号議案の所管分議題を抽出する", () => {
    const speeches = [
      speech(
        1,
        null,
        "◯永川俊彦委員長　開会いたします。\n　第六八号議案「令和七年度福岡県一般会計補正予算（第八号）」所管分を議題といたします。"
      ),
      speech(2, "西村総務部長", "御説明します。"),
    ];
    const topics = extractTopics(speeches);
    expect(topics).toHaveLength(1);
    expect(topics[0].title).toBe(
      "第六八号議案「令和七年度福岡県一般会計補正予算（第八号）」"
    );
  });

  it("予算特別委員会の部局別審査型: 款の審査を1議題として扱う", () => {
    const speeches = [
      speech(
        1,
        null,
        "◯香原勝司委員長　ただいまから委員会を開きます。\n　本日は、令和八年度福岡県一般会計予算の歳出三款保健費及び四款環境費の審査を予定いたしております。"
      ),
      speech(2, "田中保健医療介護部長", "御説明します。"),
    ];
    const topics = extractTopics(speeches);
    expect(topics).toHaveLength(1);
    expect(topics[0].title).toBe(
      "令和八年度福岡県一般会計予算の歳出三款保健費及び四款環境費の審査"
    );
  });

  it("議題宣言がない会議（正副委員長互選のみ等）は空配列を返す", () => {
    const speeches = [
      speech(1, null, "◯西坂書記　正副委員長の互選が行われます。"),
      speech(2, "井上順吾委員", "委員長の職務を務めます。"),
    ];
    expect(extractTopics(speeches)).toEqual([]);
  });
});

describe("buildSourceUrl", () => {
  it("DocumentIDから閲覧URLを組み立てる", () => {
    expect(buildSourceUrl(6618)).toBe(
      "https://www.pref.fukuoka.dbsr.jp/index.php/1?Template=doc-one-frame&VoiceType=onehit&DocumentID=6618"
    );
  });
});

describe("buildRawText", () => {
  it("発言一覧から原文テキストを復元する", () => {
    const speeches = parseDocPage(DOC_PAGE_HTML);
    const raw = buildRawText(speeches);
    expect(raw).toContain("◯佐々木空港政策課長　それでは、");
    expect(raw.split("\n\n")).toHaveLength(3);
  });
});

describe("decodeEntities", () => {
  it("主要なHTML実体参照をデコードする", () => {
    expect(decodeEntities("a &amp;b &lt;c&gt; &quot;d&quot;")).toBe(
      'a &b <c> "d"'
    );
  });
});

// ============================================================================
// 新dbsr.jp（Laravel版）向けフィクスチャとテスト
// ============================================================================

// 検索結果一覧（/100000 のレスポンス抜粋）。リンクにセッションパスとId、
// 開催日が入る。同一Idのアンカーが複数出ても一意化される想定。
const NEW_LIST_HTML = `
<a href="/106343?Template=document&Id=4580#one">令和８年　総務企画地域振興委員会　本文</a>
<span class="result-title__date">開催日:2026-05-14</span>
<a href="/106343?Template=document&Id=4579#one">令和８年　総務企画地域振興委員会　本文</a>
<span class="result-title__date">開催日:2026-04-14</span>
`;

// 文書ページ（?Template=document&Id=…）の本文抜粋。発言番号は
// data-voice_code、本文は <p class="voice__text"> に ◯話者　本文<br/>。
const NEW_DOC_HTML = `
<div class="command__docname">令和８年　総務企画地域振興委員会　本文</div>
<li title="◯吉田健一朗委員長">
  <div class="voice voice-text voice_text" data-voice_code="1">
    <div class="voice__detail voice-detail">1:</div>
    <p class="voice__text">◯吉田健一朗委員長　それでは、開会いたします。<br />
　本日の議題を確認願います。<br /></p>
  </div>
</li>
<li title="◯岩尾企画総務課長">
  <div class="voice voice-text voice_text" data-voice_code="2">
    <div class="voice__detail voice-detail">2:</div>
    <p class="voice__text">◯岩尾企画総務課長　御説明申し上げます。</p>
  </div>
</li>
<li>
  <div class="voice voice-text voice_text" data-voice_code="3">
    <div class="voice__detail voice-detail">3:</div>
    <p class="voice__text">令和八年五月十四日（木曜日）</p>
  </div>
</li>
`;

describe("extractCsrfToken", () => {
  it("検索フォームの _token を取り出す", () => {
    const html = '<input type="hidden" name="_token" value="abc123XYZ">';
    expect(extractCsrfToken(html)).toBe("abc123XYZ");
  });
  it("トークンが無ければnull", () => {
    expect(extractCsrfToken("<form></form>")).toBeNull();
  });
});

describe("extractSessionPath", () => {
  it("文書リンクからセッションパスを取り出す", () => {
    expect(extractSessionPath(NEW_LIST_HTML)).toBe("106343");
  });
  it("該当リンクが無ければnull", () => {
    expect(extractSessionPath("<a href='/foo'>x</a>")).toBeNull();
  });
});

describe("parseSearchListPage", () => {
  it("Idと開催日を新しい順に一意抽出する", () => {
    expect(parseSearchListPage(NEW_LIST_HTML)).toEqual([
      { documentId: 4580, date: "2026-05-14" },
      { documentId: 4579, date: "2026-04-14" },
    ]);
  });
  it("同一Idの重複は除去する", () => {
    const dup = `${NEW_LIST_HTML}<a href="/106343?Template=document&Id=4580#one">再掲</a><span class="result-title__date">開催日:2026-05-14</span>`;
    expect(parseSearchListPage(dup)).toHaveLength(2);
  });
});

describe("parseDocumentPage", () => {
  const speeches = parseDocumentPage(NEW_DOC_HTML);
  it("data-voice_code を発言番号として抽出する", () => {
    expect(speeches.map((s) => s.voiceNo)).toEqual([1, 2, 3]);
  });
  it("◯話者ラベルと本文を分離する", () => {
    expect(speeches[0].speakerLabel).toBe("吉田健一朗委員長");
    expect(speeches[0].speakerType).toBe("chairperson");
    expect(speeches[0].text).toContain("それでは、開会いたします。");
  });
  it("<br />を改行に変換する", () => {
    expect(speeches[0].text).toContain("\n");
  });
  it("執行部の発言を分類する", () => {
    expect(speeches[1].speakerLabel).toBe("岩尾企画総務課長");
    expect(speeches[1].speakerType).toBe("executive");
  });
  it("◯が無い地の文はspeakerLabel=null・unknownで全文を保持する", () => {
    expect(speeches[2].voiceNo).toBe(3);
    expect(speeches[2].speakerLabel).toBeNull();
    expect(speeches[2].speakerType).toBe("unknown");
    expect(speeches[2].text).toBe("令和八年五月十四日（木曜日）");
  });
});

describe("extractDocName", () => {
  it("会議名を取り出す", () => {
    expect(extractDocName(NEW_DOC_HTML)).toBe(
      "令和８年　総務企画地域振興委員会　本文"
    );
  });
});

describe("buildNewSourceUrl", () => {
  it("実Idで文書URLを組み立てる（セッションパスは任意）", () => {
    expect(buildNewSourceUrl(4580)).toBe(
      "https://www.pref.fukuoka.dbsr.jp/1?Template=document&Id=4580"
    );
  });
});

describe("NEW_SITE_COMMITTEES / NEW_SITE_ID_OFFSET", () => {
  it("委員会コードとslugが対応している", () => {
    const sc = NEW_SITE_COMMITTEES.find((c) => c.code === "sc");
    const nr = NEW_SITE_COMMITTEES.find((c) => c.code === "nr");
    expect(sc?.slug).toBe("somu-kikaku-chiiki");
    expect(nr?.slug).toBe("norin-suisan");
  });
  it("オフセットで実Idとsource_document_idが分離される", () => {
    expect(4580 + NEW_SITE_ID_OFFSET).toBe(1004580);
    expect(NEW_SITE_ID_OFFSET).toBeGreaterThanOrEqual(1_000_000);
  });
});

const PAGINATION_HTML = `
<nav aria-label="ページ切り替え（上部）" class="pagination">
<form method="post" action="https://www.pref.fukuoka.dbsr.jp/562702">
<input type="hidden" name="_token" value="PAGETOKEN123" autocomplete="off">
<input type="hidden" name="Template" value="list">
<ul class="paging">
<li><button type="submit" aria-pressed="false" aria-disabled="false" name="Page" value="2" aria-label="次のページ">次 &gt;</button></li>
<li><button type="submit" aria-pressed="false" aria-disabled="false" name="Page" value="27" aria-label="最後のページ">&gt;&gt; 最後</button></li>
</ul>
</form>
</nav>
`;

// 最終ページ: 「次のページ」が aria-disabled="true"
const PAGE_LAST_HTML = PAGINATION_HTML.replace(
  'aria-disabled="false" name="Page" value="2" aria-label="次のページ"',
  'aria-disabled="true" name="Page" value="5" aria-label="次のページ"'
);

describe("extractPaginationInfo", () => {
  it("フォームの action・_token・次ページ番号を取り出す", () => {
    const p = extractPaginationInfo(PAGINATION_HTML);
    expect(p.action).toBe("https://www.pref.fukuoka.dbsr.jp/562702");
    expect(p.token).toBe("PAGETOKEN123");
    expect(p.hasNext).toBe(true);
    expect(p.nextPage).toBe(2);
  });
  it("次ページが無効（最終ページ）なら hasNext=false・nextPage=null", () => {
    const p = extractPaginationInfo(PAGE_LAST_HTML);
    expect(p.hasNext).toBe(false);
    expect(p.nextPage).toBeNull();
  });
  it("ページ送りが無いHTMLでは全てnull/false", () => {
    const p = extractPaginationInfo("<div>no pagination</div>");
    expect(p.action).toBeNull();
    expect(p.token).toBeNull();
    expect(p.hasNext).toBe(false);
    expect(p.nextPage).toBeNull();
  });
});
