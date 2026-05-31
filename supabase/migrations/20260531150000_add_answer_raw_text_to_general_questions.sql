alter table general_questions
  add column if not exists answer_raw_text text;

alter table general_questions enable row level security;
