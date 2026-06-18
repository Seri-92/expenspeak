create policy "categories_select_admin"
on public.categories
for select
to authenticated
using (public.is_admin());

create policy "categories_insert_admin"
on public.categories
for insert
to authenticated
with check (public.is_admin());

create policy "categories_update_admin"
on public.categories
for update
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "categories_delete_admin"
on public.categories
for delete
to authenticated
using (public.is_admin());
