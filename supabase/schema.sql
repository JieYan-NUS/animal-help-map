create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  report_type text default 'need_help',
  species text not null,
  condition text not null,
  description text,
  location_description text not null,
  latitude double precision,
  longitude double precision,
  address text,
  address_source text,
  geocoded_at timestamp with time zone,
  report_tz text,
  report_utc_offset_minutes integer,
  reporter_contact text,
  status text not null default 'Reported',
  last_seen_at timestamp with time zone,
  expires_at timestamp with time zone default (now() + interval '14 days'),
  resolved_at timestamp with time zone,
  photo_path text,
  lost_case_id text
);

create unique index if not exists reports_lost_case_id_unique
  on public.reports (lost_case_id)
  where lost_case_id is not null;
