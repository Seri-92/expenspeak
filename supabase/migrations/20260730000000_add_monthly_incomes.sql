create table public.monthly_incomes (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  recipient text not null check (recipient in ('創平', '優希')),
  amount integer not null check (amount >= 0),
  target_month date not null check (extract(day from target_month) = 1),
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, recipient, target_month)
);

create trigger set_monthly_incomes_updated_at
before update on public.monthly_incomes
for each row
execute function public.touch_updated_at();

grant select, insert, update, delete on public.monthly_incomes to authenticated;

alter table public.monthly_incomes enable row level security;

create policy "monthly_incomes_select_member_groups"
on public.monthly_incomes
for select
to authenticated
using (public.is_group_member(group_id));

create policy "monthly_incomes_insert_member_groups"
on public.monthly_incomes
for insert
to authenticated
with check (
  public.is_group_member(group_id)
  and created_by = auth.uid()
);

create policy "monthly_incomes_update_member_groups"
on public.monthly_incomes
for update
to authenticated
using (public.is_group_member(group_id))
with check (public.is_group_member(group_id));

create policy "monthly_incomes_delete_member_groups"
on public.monthly_incomes
for delete
to authenticated
using (public.is_group_member(group_id));
