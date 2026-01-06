alter table public.stories enable row level security;
alter table public.story_photos enable row level security;
alter table storage.objects enable row level security;

do $$
begin
  create policy "Public read approved stories" on public.stories
    for select
    to anon
    using (status = 'approved');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public insert pending stories" on public.stories
    for insert
    to anon
    with check (status = 'pending');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public read approved story photos" on public.story_photos
    for select
    to anon
    using (
      exists (
        select 1
        from public.stories s
        where s.id = story_photos.story_id
          and s.status = 'approved'
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public insert pending story photos" on public.story_photos
    for insert
    to anon
    with check (
      exists (
        select 1
        from public.stories s
        where s.id = story_photos.story_id
          and s.status = 'pending'
      )
    );
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public insert story photo objects" on storage.objects
    for insert
    to anon
    with check (bucket_id = 'story-photos');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public read story photo objects" on storage.objects
    for select
    to anon
    using (bucket_id = 'story-photos');
exception
  when duplicate_object then null;
end $$;
