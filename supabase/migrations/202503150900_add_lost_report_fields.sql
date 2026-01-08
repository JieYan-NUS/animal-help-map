alter table public.reports
  add column if not exists report_type text default 'need_help',
  add column if not exists last_seen_at timestamp with time zone,
  add column if not exists expires_at timestamp with time zone default (now() + interval '14 days'),
  add column if not exists resolved_at timestamp with time zone,
  add column if not exists photo_path text;

update public.reports
  set report_type = 'need_help'
  where report_type is null;
