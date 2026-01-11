alter table public.stories
  add column if not exists category text;

update public.stories
set category = 'rescue'
where category is null
  or btrim(category) = '';

update public.stories
set category = 'community_moments'
where category = 'community';

do $$
begin
  if exists (
    select 1
    from information_schema.columns
    where table_schema = 'public'
      and table_name = 'stories'
      and column_name = 'category'
  ) then
    if exists (
      select 1
      from pg_constraint
      where conname = 'stories_category_check'
        and conrelid = 'public.stories'::regclass
    ) then
      alter table public.stories
        drop constraint stories_category_check;
    end if;

    alter table public.stories
      add constraint stories_category_check
      check (
        category is null
        or category = ''
        or category in (
          'rescue',
          'lost_found',
          'shelter_foster',
          'community_moments',
          'this_is_pawscue',
          'shared_animal_stories'
        )
      );
  end if;
exception
  when duplicate_object then
    null;
end $$;

create index if not exists stories_category_status_created_at_idx
  on public.stories (category, status, created_at);
