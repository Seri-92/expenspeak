alter table public.users
  add column role text not null default 'user'
  check (role in ('user', 'admin'));

create function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.users u
    where u.id = auth.uid()
      and u.role = 'admin'
  );
$$;

create function public.current_user_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select u.role
  from public.users u
  where u.id = auth.uid();
$$;

create function public.prevent_self_role_change()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.id = auth.uid()
    and new.role is distinct from old.role
    and not public.is_admin()
  then
    raise exception 'forbidden';
  end if;

  return new;
end;
$$;

create trigger prevent_users_self_role_change
before update on public.users
for each row
execute function public.prevent_self_role_change();

grant execute on function public.is_admin() to authenticated;
grant execute on function public.current_user_role() to authenticated;

drop policy if exists "users_update_self" on public.users;

create policy "users_update_self"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (
  id = auth.uid()
  and role = public.current_user_role()
);

create policy "users_select_admin"
on public.users
for select
to authenticated
using (public.is_admin());

create policy "users_update_admin"
on public.users
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "groups_select_admin"
on public.groups
for select
to authenticated
using (public.is_admin());

create policy "groups_insert_admin"
on public.groups
for insert
to authenticated
with check (public.is_admin() and created_by = auth.uid());

create policy "groups_update_admin"
on public.groups
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "group_members_select_admin"
on public.group_members
for select
to authenticated
using (public.is_admin());

create policy "group_members_insert_admin"
on public.group_members
for insert
to authenticated
with check (public.is_admin());

create policy "group_members_update_admin"
on public.group_members
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "group_members_delete_admin"
on public.group_members
for delete
to authenticated
using (public.is_admin());
