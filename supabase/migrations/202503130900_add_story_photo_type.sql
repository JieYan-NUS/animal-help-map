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

with ranked as (
  select
    id,
    row_number() over (
      partition by story_id
      order by sort_order nulls last, created_at
    ) as rn
  from public.story_photos
  where photo_type is null
)
update public.story_photos
set photo_type = case
  when ranked.rn = 1 then 'before'
  when ranked.rn = 2 then 'after'
  else null
end
from ranked
where public.story_photos.id = ranked.id;

create unique index if not exists story_photos_story_id_before_unique
  on public.story_photos(story_id)
  where photo_type = 'before';

create unique index if not exists story_photos_story_id_after_unique
  on public.story_photos(story_id)
  where photo_type = 'after';
