create table public.monthly_fixed_costs (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.groups(id) on delete cascade,
  target_month date not null check (extract(day from target_month) = 1),
  item text not null check (item in ('家賃', '電気代', 'ガス代', '水道代', 'インターネット代')),
  amount integer not null check (amount >= 0),
  created_by uuid not null references public.users(id) on delete restrict,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (group_id, target_month, item)
);

create trigger set_monthly_fixed_costs_updated_at
before update on public.monthly_fixed_costs
for each row execute function public.touch_updated_at();

grant select, insert, update, delete on public.monthly_fixed_costs to authenticated;
alter table public.monthly_fixed_costs enable row level security;
create policy "monthly_fixed_costs_select_members" on public.monthly_fixed_costs
for select to authenticated using (public.is_group_member(group_id));
create policy "monthly_fixed_costs_insert_members" on public.monthly_fixed_costs
for insert to authenticated with check (public.is_group_member(group_id) and created_by = auth.uid());
create policy "monthly_fixed_costs_update_members" on public.monthly_fixed_costs
for update to authenticated using (public.is_group_member(group_id)) with check (public.is_group_member(group_id));
create policy "monthly_fixed_costs_delete_members" on public.monthly_fixed_costs
for delete to authenticated using (public.is_group_member(group_id));

-- 表示名の変更で集計対象が変わらないように、グループとカテゴリをIDで保持する。
create table public.monthly_allocation_settings (
  group_id uuid primary key references public.groups(id) on delete cascade,
  food_category_id bigint not null,
  supplies_category_id bigint not null,
  work_category_id bigint not null,
  created_at timestamptz not null default now(),
  foreign key (food_category_id, group_id) references public.categories(id, group_id) on delete restrict,
  foreign key (supplies_category_id, group_id) references public.categories(id, group_id) on delete restrict,
  foreign key (work_category_id, group_id) references public.categories(id, group_id) on delete restrict,
  check (food_category_id <> supplies_category_id and food_category_id <> work_category_id and supplies_category_id <> work_category_id)
);

grant select, insert on public.monthly_allocation_settings to authenticated;
alter table public.monthly_allocation_settings enable row level security;
create policy "monthly_allocation_settings_select_members" on public.monthly_allocation_settings
for select to authenticated using (public.is_group_member(group_id));
create policy "monthly_allocation_settings_insert_members" on public.monthly_allocation_settings
for insert to authenticated with check (public.is_group_member(group_id));

-- 既存のSSYに対象分類がそろっていれば初期設定を作成する。
-- 異なる名称で登録されている場合は、画面で対応する分類を選択する。
insert into public.monthly_allocation_settings (group_id, food_category_id, supplies_category_id, work_category_id)
select g.id, food.id, supplies.id, work.id
from public.groups g
join public.categories food on food.group_id = g.id and food.name = '食費'
join public.categories supplies on supplies.group_id = g.id and supplies.name = '日用品'
join public.categories work on work.group_id = g.id and work.name = '外で仕事にかかるお金'
where g.name = 'SSY';

create index expenses_group_date_id_idx on public.expenses (group_id, date, id);
