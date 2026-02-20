-- dev_seed.sql
-- Execute this on your Supabase DEV project via SQL Editor.
-- Inserts sample categories only when they do not exist.

insert into public.categories (name)
select '食費'
where not exists (
  select 1 from public.categories where name = '食費'
);

insert into public.categories (name)
select '交通費'
where not exists (
  select 1 from public.categories where name = '交通費'
);

insert into public.categories (name)
select '日用品'
where not exists (
  select 1 from public.categories where name = '日用品'
);
