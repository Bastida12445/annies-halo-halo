-- Admin-only sales history and paid best-seller insights for the management dashboard.
begin;

create or replace function public.get_admin_sales_series(
  p_from timestamptz,
  p_to timestamptz,
  p_bucket text
)
returns table(bucket_start date, sales_cents bigint)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
declare
  v_part text;
  v_step interval;
  v_start timestamp without time zone;
  v_end timestamp without time zone;
begin
  if auth.uid() is null or not public.is_staff(array['administrator']) then
    raise exception 'not_authorized';
  end if;
  if p_from is null or p_to is null or p_to <= p_from then
    raise exception 'invalid_report_range';
  end if;
  if p_bucket is null or p_bucket not in ('day', 'week', 'month') then
    raise exception 'invalid_report_bucket';
  end if;

  v_part := p_bucket;
  v_step := case p_bucket
    when 'month' then interval '1 month'
    when 'week' then interval '1 week'
    else interval '1 day'
  end;
  v_start := date_trunc(v_part, p_from at time zone 'Asia/Manila');
  v_end := date_trunc(v_part, (p_to - interval '1 microsecond') at time zone 'Asia/Manila');

  return query
    with ticks as (
      select series.bucket
      from generate_series(v_start, v_end, v_step) as series(bucket)
    ), paid_sales as (
      select
        date_trunc(v_part, o.created_at at time zone 'Asia/Manila') as bucket,
        sum(o.total_cents)::bigint as cents
      from public.orders o
      where o.created_at >= p_from
        and o.created_at < p_to
        and o.payment_status = 'paid'
        and o.order_status <> 'cancelled'
      group by 1
    )
    select ticks.bucket::date, coalesce(paid_sales.cents, 0)::bigint
    from ticks
    left join paid_sales on paid_sales.bucket = ticks.bucket
    order by ticks.bucket;
end;
$$;

create or replace function public.get_admin_top_products(
  p_from timestamptz default null,
  p_to timestamptz default null,
  p_limit integer default 4
)
returns table(
  product_id uuid,
  product_name text,
  items_sold bigint,
  sales_cents bigint,
  image_path text
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_staff(array['administrator']) then
    raise exception 'not_authorized';
  end if;
  if p_from is not null and p_to is not null and p_to <= p_from then
    raise exception 'invalid_report_range';
  end if;

  return query
    select
      oi.product_id,
      oi.item_name_snapshot,
      sum(oi.quantity)::bigint,
      sum(oi.line_total_cents)::bigint,
      p.image_path
    from public.orders o
    join public.order_items oi on oi.order_id = o.id
    left join public.products p on p.id = oi.product_id
    where o.payment_status = 'paid'
      and o.order_status <> 'cancelled'
      and (p_from is null or o.created_at >= p_from)
      and (p_to is null or o.created_at < p_to)
    group by oi.product_id, oi.item_name_snapshot, p.image_path
    order by sum(oi.quantity) desc, sum(oi.line_total_cents) desc, oi.item_name_snapshot
    limit least(greatest(coalesce(p_limit, 4), 1), 12);
end;
$$;

revoke all on function public.get_admin_sales_series(timestamptz,timestamptz,text) from public, anon;
revoke all on function public.get_admin_top_products(timestamptz,timestamptz,integer) from public, anon;
grant execute on function public.get_admin_sales_series(timestamptz,timestamptz,text) to authenticated;
grant execute on function public.get_admin_top_products(timestamptz,timestamptz,integer) to authenticated;

commit;
