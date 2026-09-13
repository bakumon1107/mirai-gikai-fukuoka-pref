-- 代表質問と一般質問を区別する。既存レコードは全て一般質問のため既定値は general。
alter table general_questions
  add column if not exists question_type text not null default 'general';

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'general_questions_question_type_check'
  ) then
    alter table general_questions
      add constraint general_questions_question_type_check
      check (question_type in ('general', 'representative'));
  end if;
end $$;

alter table general_questions enable row level security;
