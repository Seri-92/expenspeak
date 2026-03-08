create extension if not exists "uuid-ossp";

drop table if exists public.expense_categories cascade;
drop table if exists public.expenses cascade;
drop table if exists public.categories cascade;
drop table if exists public.group_members cascade;
drop table if exists public.groups cascade;
drop table if exists public.users cascade;

drop function if exists public.provision_current_user();
drop function if exists public.set_current_group(uuid);
drop function if exists public.touch_updated_at();
drop function if exists public.is_group_member(uuid);
drop function if exists public.is_group_owner(uuid);

create function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create table public.users (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  display_name text,
  avatar_url text,
  current_group_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.groups (
  id uuid primary key default uuid_generate_v4(),
  name text not null,
  created_by uuid not null references public.users(id) on delete cascade,
  personal_owner_user_id uuid unique references public.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint groups_personal_owner_matches_created_by
    check (
      personal_owner_user_id is null
      or personal_owner_user_id = created_by
    )
);

alter table public.users
  add constraint users_current_group_id_fkey
  foreign key (current_group_id)
  references public.groups(id)
  on delete set null;

create table public.group_members (
  group_id uuid not null references public.groups(id) on delete cascade,
  user_id uuid not null references public.users(id) on delete cascade,
  role text not null check (role in ('owner', 'member')),
  created_at timestamptz not null default now(),
  primary key (group_id, user_id)
);

create table public.categories (
  id bigserial primary key,
  group_id uuid not null references public.groups(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, name),
  unique (id, group_id)
);

create table public.expenses (
  id uuid primary key default uuid_generate_v4(),
  group_id uuid not null references public.groups(id) on delete cascade,
  category_id bigint not null,
  created_by uuid not null references public.users(id) on delete restrict,
  amount integer not null,
  date timestamptz not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint expenses_category_group_fkey
    foreign key (category_id, group_id)
    references public.categories(id, group_id)
    on delete restrict
);

create trigger set_users_updated_at
before update on public.users
for each row
execute function public.touch_updated_at();

create trigger set_groups_updated_at
before update on public.groups
for each row
execute function public.touch_updated_at();

create trigger set_categories_updated_at
before update on public.categories
for each row
execute function public.touch_updated_at();

create trigger set_expenses_updated_at
before update on public.expenses
for each row
execute function public.touch_updated_at();

create function public.is_group_member(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
  );
$$;

create function public.is_group_owner(target_group_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.group_members gm
    where gm.group_id = target_group_id
      and gm.user_id = auth.uid()
      and gm.role = 'owner'
  );
$$;

create function public.provision_current_user()
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
  v_email text;
  v_display_name text;
  v_avatar_url text;
  v_group_id uuid;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  select
    au.email,
    coalesce(au.raw_user_meta_data ->> 'name', au.raw_user_meta_data ->> 'full_name'),
    coalesce(au.raw_user_meta_data ->> 'avatar_url', au.raw_user_meta_data ->> 'picture')
  into v_email, v_display_name, v_avatar_url
  from auth.users au
  where au.id = v_uid;

  if v_email is null then
    raise exception 'authenticated user not found in auth.users';
  end if;

  insert into public.users (id, email, display_name, avatar_url)
  values (v_uid, v_email, v_display_name, v_avatar_url)
  on conflict (id) do update
    set email = excluded.email,
        display_name = excluded.display_name,
        avatar_url = excluded.avatar_url,
        updated_at = now();

  select g.id
  into v_group_id
  from public.groups g
  where g.personal_owner_user_id = v_uid
  limit 1;

  if v_group_id is null then
    insert into public.groups (name, created_by, personal_owner_user_id)
    values (
      concat(coalesce(v_display_name, v_email), ' のグループ'),
      v_uid,
      v_uid
    )
    returning id into v_group_id;

    insert into public.group_members (group_id, user_id, role)
    values (v_group_id, v_uid, 'owner')
    on conflict (group_id, user_id) do nothing;

    insert into public.categories (group_id, name)
    values
      (v_group_id, '食費'),
      (v_group_id, '交通費'),
      (v_group_id, '日用品')
    on conflict (group_id, name) do nothing;
  else
    insert into public.group_members (group_id, user_id, role)
    values (v_group_id, v_uid, 'owner')
    on conflict (group_id, user_id) do nothing;
  end if;

  update public.users
  set current_group_id = coalesce(current_group_id, v_group_id),
      updated_at = now()
  where id = v_uid;

  return (
    select u.current_group_id
    from public.users u
    where u.id = v_uid
  );
end;
$$;

create function public.set_current_group(target_group_id uuid)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;

  if not public.is_group_member(target_group_id) then
    raise exception 'forbidden';
  end if;

  update public.users
  set current_group_id = target_group_id,
      updated_at = now()
  where id = v_uid;

  return target_group_id;
end;
$$;

grant usage on schema public to authenticated;
grant select, insert, update, delete on public.users to authenticated;
grant select, insert, update, delete on public.groups to authenticated;
grant select, insert, update, delete on public.group_members to authenticated;
grant select, insert, update, delete on public.categories to authenticated;
grant select, insert, update, delete on public.expenses to authenticated;
grant usage, select on all sequences in schema public to authenticated;
grant execute on function public.provision_current_user() to authenticated;
grant execute on function public.set_current_group(uuid) to authenticated;

alter table public.users enable row level security;
alter table public.groups enable row level security;
alter table public.group_members enable row level security;
alter table public.categories enable row level security;
alter table public.expenses enable row level security;

create policy "users_select_self"
on public.users
for select
to authenticated
using (id = auth.uid());

create policy "users_update_self"
on public.users
for update
to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "groups_select_member_groups"
on public.groups
for select
to authenticated
using (public.is_group_member(id));

create policy "groups_insert_authenticated"
on public.groups
for insert
to authenticated
with check (created_by = auth.uid());

create policy "groups_update_owner_groups"
on public.groups
for update
to authenticated
using (public.is_group_owner(id))
with check (public.is_group_owner(id));

create policy "group_members_select_member_groups"
on public.group_members
for select
to authenticated
using (public.is_group_member(group_id));

create policy "group_members_insert_owner_groups"
on public.group_members
for insert
to authenticated
with check (public.is_group_owner(group_id));

create policy "group_members_update_owner_groups"
on public.group_members
for update
to authenticated
using (public.is_group_owner(group_id))
with check (public.is_group_owner(group_id));

create policy "group_members_delete_owner_groups"
on public.group_members
for delete
to authenticated
using (public.is_group_owner(group_id));

create policy "categories_select_member_groups"
on public.categories
for select
to authenticated
using (public.is_group_member(group_id));

create policy "categories_insert_member_groups"
on public.categories
for insert
to authenticated
with check (public.is_group_member(group_id));

create policy "categories_update_member_groups"
on public.categories
for update
to authenticated
using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

create policy "categories_delete_member_groups"
on public.categories
for delete
to authenticated
using (public.is_group_member(group_id));

create policy "expenses_select_member_groups"
on public.expenses
for select
to authenticated
using (public.is_group_member(group_id));

create policy "expenses_insert_member_groups"
on public.expenses
for insert
to authenticated
with check (
  public.is_group_member(group_id)
  and created_by = auth.uid()
);

create policy "expenses_update_member_groups"
on public.expenses
for update
to authenticated
using (public.is_group_member(group_id))
with check (
  public.is_group_member(group_id)
  and created_by = auth.uid()
);

create policy "expenses_delete_member_groups"
on public.expenses
for delete
to authenticated
using (public.is_group_member(group_id));
