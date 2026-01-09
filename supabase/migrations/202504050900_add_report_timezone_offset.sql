alter table public.reports
  add column if not exists report_utc_offset_minutes integer null;
