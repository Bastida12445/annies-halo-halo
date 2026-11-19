-- Return the signed-in customer's most ordered non-cancelled menu item.
-- The function runs with caller permissions so existing RLS policies remain active.
begin;

create or replace function public.get_customer_favorite_menu()
returns table(item_name text, item_quantity bigint)
language sql
stable
security invoker
set search_path = public, pg_temp
as $$
  select oi.item_name_snapshot, sum(oi.quantity)::bigint
  from public.orders o
  join public.order_items oi on oi.order_id = o.id
  where o.customer_id = auth.uid()
    and o.order_status <> 'cancelled'
  group by oi.item_name_snapshot
  order by sum(oi.quantity) desc, max(o.created_at) desc, oi.item_name_snapshot
  limit 1;
$$;

revoke all on function public.get_customer_favorite_menu() from public, anon;
grant execute on function public.get_customer_favorite_menu() to authenticated;

commit;
