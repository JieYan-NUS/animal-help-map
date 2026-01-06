create extension if not exists "pgcrypto";

create table if not exists public.stories (
  id uuid primary key default gen_random_uuid(),
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  title text not null,
  slug text not null unique,
  animal_type text not null check (animal_type in ('cat','dog','bird','other')),
  city text not null,
  month_year text not null,
  excerpt text not null,
  content text not null,
  author_name text,
  author_contact text,
  created_at timestamptz not null default now(),
  published_at timestamptz
);

create table if not exists public.story_photos (
  id uuid primary key default gen_random_uuid(),
  story_id uuid not null references public.stories(id) on delete cascade,
  path text not null,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists stories_status_idx on public.stories(status);
create index if not exists stories_created_at_idx on public.stories(created_at);
create index if not exists story_photos_story_id_idx on public.story_photos(story_id);

-- TODO(phase-c): enable RLS and add moderation policies for stories.
