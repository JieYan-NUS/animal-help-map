insert into storage.buckets (id, name, public)
values ('report-photos', 'report-photos', true)
on conflict (id) do nothing;

do $$
begin
  create policy "Public insert report photo objects" on storage.objects
    for insert
    to anon
    with check (bucket_id = 'report-photos');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create policy "Public read report photo objects" on storage.objects
    for select
    to anon
    using (bucket_id = 'report-photos');
exception
  when duplicate_object then null;
end $$;
