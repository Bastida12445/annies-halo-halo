-- Break the circular RLS check between product_addons and product_addon_assignments.
-- This helper exposes only whether a single add-on is active; it does not return row data.
create or replace function public.is_active_product_addon(p_addon_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1
    from public.product_addons a
    where a.id = p_addon_id
      and a.is_active
  );
$$;

revoke all on function public.is_active_product_addon(uuid) from public, anon, authenticated;
grant execute on function public.is_active_product_addon(uuid) to anon, authenticated;

drop policy if exists "addon_assignments_public_active" on public.product_addon_assignments;
create policy "addon_assignments_public_active"
on public.product_addon_assignments
for select
to anon, authenticated
using (
  (
    exists (
      select 1
      from public.products p
      where p.id = product_id
        and p.is_active
    )
    and public.is_active_product_addon(addon_id)
  )
  or public.is_staff(array['administrator', 'menu_manager'])
);
