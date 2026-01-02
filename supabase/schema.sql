create extension if not exists "pgcrypto";

create table if not exists public.reports (
  id uuid primary key default gen_random_uuid(),
  created_at timestamp with time zone default now(),
  species text not null,
  condition text not null,
  description text,
  location_description text not null,
  latitude double precision,
  longitude double precision,
  reporter_contact text,
  status text not null default 'Reported'
);
