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

## Stories submission (Phase B)

1) Run the SQL migration in `supabase/migrations/20250210_create_stories.sql`.
2) Run the SQL migration in `supabase/migrations/202503120900_fix_stories_rls.sql`.
   - Paste the entire file contents into the Supabase SQL Editor and run it.
3) Create a Storage bucket named `story-photos` in the Supabase dashboard and set it to public if it does not exist.
   - Storage > Buckets > New bucket > name `story-photos`, public.
   - TODO(phase-c): revisit public access and add signed URLs + RLS policies.

## Hosted Supabase migrations

1) Log in: `supabase login`
2) Link the hosted project: `supabase link --project-ref <PROJECT_REF>`
3) Apply migrations: `supabase db push` (or `supabase migration up` if this repo expects it)
4) If the API schema cache lags, run `notify pgrst, 'reload schema';` in the SQL editor.
5) One-time dev check: confirm `.env.local` points to the intended Supabase project (staging vs production) before testing writes.

## Environment variables

Add these to `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
MAPBOX_API_KEY=your_mapbox_access_token
```
