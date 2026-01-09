alter table public.reports
  add column if not exists lost_case_id text;

create unique index if not exists reports_lost_case_id_unique
  on public.reports (lost_case_id)
  where lost_case_id is not null;
