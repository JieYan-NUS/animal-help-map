alter table public.reports
  add column if not exists address text,
  add column if not exists address_source text,
  add column if not exists geocoded_at timestamp with time zone;
