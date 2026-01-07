alter table public.story_photos
  add column if not exists photo_type text;

do $$
begin
  alter table public.story_photos
    add constraint story_photos_photo_type_check
    check (photo_type in ('before','after'));
exception
  when duplicate_object then null;
end $$;

update public.story_photos
set photo_type = 'before'
where photo_type is null;

create unique index if not exists story_photos_story_id_before_unique
  on public.story_photos(story_id)
  where photo_type = 'before';

create unique index if not exists story_photos_story_id_after_unique
  on public.story_photos(story_id)
  where photo_type = 'after';
