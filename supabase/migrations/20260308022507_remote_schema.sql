create extension if not exists "uuid-ossp";

create table if not exists public.expenses (
  id uuid primary key default uuid_generate_v4(),
  amount integer not null,
  date timestamptz not null,
  description text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.categories (
  id serial primary key,
  name text not null unique
);

create table if not exists public.expense_categories (
  expense_id uuid not null references public.expenses(id) on delete cascade,
  category_id integer not null references public.categories(id) on delete cascade,
  primary key (expense_id, category_id)
);
