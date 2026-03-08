-- dev_seed.sql
-- Execute this on your Supabase DEV project via SQL Editor.
-- Replace the sample user id with an existing auth.users / public.users id.
-- Personal groups already receive default categories on first login.

with target_user as (
  select current_group_id
  from public.users
  where id = '00000000-0000-0000-0000-000000000000'
)
insert into public.categories (group_id, name)
select target_user.current_group_id, '交際費'
from target_user
where target_user.current_group_id is not null
  and not exists (
    select 1
    from public.categories c
    where c.group_id = target_user.current_group_id
      and c.name = '交際費'
  );
