alter table public.reports
  alter column latitude drop not null,
  alter column longitude drop not null;
