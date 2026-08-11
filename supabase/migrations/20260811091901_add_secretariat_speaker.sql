-- press_conference_turns.speaker に事務局区分 'secretariat' を追加する
-- 会見で事務局（担当課・部局）が答弁したターンを、知事・記者と別の話者として扱う。
-- 既存の check 制約はインライン定義のため、Postgres の自動命名
-- （press_conference_turns_speaker_check）を対象に張り替える。
alter table press_conference_turns
  drop constraint if exists press_conference_turns_speaker_check;

alter table press_conference_turns
  add constraint press_conference_turns_speaker_check
    check (speaker in ('governor', 'reporter', 'secretariat'));
