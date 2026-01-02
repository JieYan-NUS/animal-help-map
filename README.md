# Animal Help Project

## Supabase setup (MVP)

1) Create a new Supabase project.
2) Open the SQL editor and run the schema below to create the `reports` table.
3) Enable Row Level Security (RLS) and add policies to allow anonymous reads and inserts for MVP.

### Schema

```sql
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
```

### RLS + policies

```sql
alter table public.reports enable row level security;

create policy "Allow anonymous reads" on public.reports
  for select
  to anon
  using (true);

create policy "Allow anonymous inserts" on public.reports
  for insert
  to anon
  with check (true);
```

## Environment variables

Add these to `.env.local`:

```
SUPABASE_URL=your_supabase_url
SUPABASE_ANON_KEY=your_supabase_anon_key
```
