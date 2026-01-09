alter table public.reports
  add column if not exists report_tz text null;
