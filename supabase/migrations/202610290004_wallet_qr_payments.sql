-- Direct GCash and Maya QR payment support. QR transfers remain pending until staff verify them.
begin;

alter table public.payments add column if not exists qr_image_path text;
create unique index if not exists payments_manual_qr_reference_unique
  on public.payments(provider_reference)
  where provider = 'manual'
    and payment_method in ('gcash_qr', 'paymaya_qr')
    and provider_reference is not null;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('payment-qrs', 'payment-qrs', true, 5242880, array['image/jpeg','image/png','image/webp'])
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "payment_qrs_public_read" on storage.objects;
create policy "payment_qrs_public_read" on storage.objects for select to anon, authenticated
  using (bucket_id = 'payment-qrs');
drop policy if exists "payment_qrs_admin_insert" on storage.objects;
create policy "payment_qrs_admin_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'payment-qrs' and public.is_staff(array['administrator']));
drop policy if exists "payment_qrs_admin_update" on storage.objects;
create policy "payment_qrs_admin_update" on storage.objects for update to authenticated
  using (bucket_id = 'payment-qrs' and public.is_staff(array['administrator']))
  with check (bucket_id = 'payment-qrs' and public.is_staff(array['administrator']));
drop policy if exists "payment_qrs_admin_delete" on storage.objects;
create policy "payment_qrs_admin_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'payment-qrs' and public.is_staff(array['administrator']));
create or replace function public.place_order(
  p_items jsonb,
  p_fulfillment_method text,
  p_delivery_address text,
  p_service_area text,
  p_phone text,
  p_notes text,
  p_payment_method text,
  p_idempotency_key uuid,
  p_expected_total_cents integer
)
returns table(order_id uuid, order_reference text, total_cents integer)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_config jsonb;
  v_existing public.orders%rowtype;
  v_product public.products%rowtype;
  v_variant public.product_variants%rowtype;
  v_addon public.product_addons%rowtype;
  v_item jsonb;
  v_addon_id uuid;
  v_quantity integer;
  v_unit_cents bigint;
  v_subtotal bigint := 0;
  v_delivery_fee bigint := 0;
  v_minimum bigint := 0;
  v_total bigint;
  v_reference text;
  v_order_id uuid;
  v_variant_id uuid;
  v_variant_name text;
  v_addon_snapshots jsonb;
  v_items_snapshot jsonb := '[]'::jsonb;
  v_item_snapshot jsonb;
  v_service jsonb;
  v_seen_addons uuid[];
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) not between 1 and 30 then
    raise exception 'invalid_items';
  end if;
  if p_idempotency_key is null then raise exception 'invalid_idempotency_key'; end if;
  if p_expected_total_cents is null or p_expected_total_cents < 0 or p_expected_total_cents > 10000000 then raise exception 'invalid_expected_total'; end if;
  if p_payment_method is null then raise exception 'invalid_payment_method'; end if;

  -- Serializes order retries and reads the current owner-configured rules.
  select config into v_config from public.business_settings where id = true for update;
  if v_config is null then raise exception 'orders_not_configured'; end if;
  v_minimum := coalesce((v_config ->> 'minimum_order_cents')::integer, 0);

  select * into v_existing from public.orders
  where customer_id = v_user_id and idempotency_key = p_idempotency_key;
  if found then
    return query select v_existing.id, v_existing.order_reference, v_existing.total_cents;
    return;
  end if;

  if p_fulfillment_method = 'pickup' then
    if coalesce((v_config ->> 'pickup_enabled')::boolean, false) is not true then raise exception 'fulfillment_disabled'; end if;
  elsif p_fulfillment_method = 'delivery' then
    if coalesce((v_config ->> 'delivery_enabled')::boolean, false) is not true then raise exception 'fulfillment_disabled'; end if;
    if coalesce(length(trim(p_delivery_address)), 0) < 5 or coalesce(length(trim(p_delivery_address)), 0) > 500 then raise exception 'invalid_delivery_address'; end if;
    if coalesce(length(trim(p_service_area)), 0) = 0 then raise exception 'invalid_service_area'; end if;
    select area into v_service from jsonb_array_elements(coalesce(v_config -> 'delivery_areas', '[]'::jsonb)) as areas(area)
      where area ->> 'name' = p_service_area limit 1;
    if v_service is null then raise exception 'unsupported_service_area'; end if;
    v_delivery_fee := coalesce((v_service ->> 'fee_cents')::integer, 0);
    v_minimum := greatest(v_minimum, coalesce((v_service ->> 'minimum_order_cents')::integer, 0));
  else
    raise exception 'invalid_fulfillment_method';
  end if;

  if p_payment_method not in ('cash_on_pickup', 'cash_on_delivery', 'paymongo', 'gcash_qr', 'paymaya_qr')
    or not coalesce(v_config -> 'payment_methods', '[]'::jsonb) @> to_jsonb(array[p_payment_method]) then
    raise exception 'payment_method_disabled';
  end if;
  if (p_fulfillment_method = 'pickup' and p_payment_method not in ('cash_on_pickup', 'paymongo', 'gcash_qr', 'paymaya_qr'))
    or (p_fulfillment_method = 'delivery' and p_payment_method not in ('cash_on_delivery', 'paymongo', 'gcash_qr', 'paymaya_qr')) then
    raise exception 'payment_method_mismatch';
  end if;
  if p_payment_method = 'gcash_qr' and coalesce(v_config ->> 'gcash_qr_image_path', '') !~ '^qrs/gcash-[0-9a-f-]{36}\.(png|jpe?g|webp)$' then
    raise exception 'payment_method_disabled';
  end if;
  if p_payment_method = 'paymaya_qr' and coalesce(v_config ->> 'paymaya_qr_image_path', '') !~ '^qrs/paymaya-[0-9a-f-]{36}\.(png|jpe?g|webp)$' then
    raise exception 'payment_method_disabled';
  end if;

  for v_item in select value from jsonb_array_elements(p_items) as items(value) loop
    if jsonb_typeof(v_item) <> 'object' or coalesce((v_item ->> 'quantity')::integer, 0) not between 1 and 20 then
      raise exception 'invalid_quantity';
    end if;
    v_quantity := (v_item ->> 'quantity')::integer;
    select * into v_product from public.products
      where id = (v_item ->> 'productId')::uuid and is_active and is_available
      for share;
    if not found then raise exception 'product_unavailable'; end if;
    v_unit_cents := v_product.price_cents;
    v_variant_id := null;
    v_variant_name := null;
    if nullif(v_item ->> 'variantId', '') is not null then
      select * into v_variant from public.product_variants
        where id = (v_item ->> 'variantId')::uuid and product_id = v_product.id and is_active
        for share;
      if not found then raise exception 'variant_unavailable'; end if;
      v_unit_cents := v_unit_cents + v_variant.price_adjustment_cents;
      v_variant_id := v_variant.id;
      v_variant_name := v_variant.name;
    end if;

    v_addon_snapshots := '[]'::jsonb;
    v_seen_addons := array[]::uuid[];
    if v_item ? 'addonIds' then
      if jsonb_typeof(v_item -> 'addonIds') <> 'array' or jsonb_array_length(v_item -> 'addonIds') > 12 then
        raise exception 'invalid_addons';
      end if;
      for v_addon_id in select value::uuid from jsonb_array_elements_text(v_item -> 'addonIds') as ids(value) loop
        if v_addon_id = any(v_seen_addons) then raise exception 'duplicate_addon'; end if;
        v_seen_addons := array_append(v_seen_addons, v_addon_id);
        select a.* into v_addon
        from public.product_addons a
        join public.product_addon_assignments pa on pa.addon_id = a.id
        where a.id = v_addon_id and a.is_active and pa.product_id = v_product.id
        for share of a;
        if not found then raise exception 'addon_unavailable'; end if;
        v_unit_cents := v_unit_cents + v_addon.price_cents;
        v_addon_snapshots := v_addon_snapshots || jsonb_build_array(jsonb_build_object(
          'id', v_addon.id, 'name', v_addon.name, 'price_cents', v_addon.price_cents
        ));
      end loop;
    end if;
    if v_unit_cents < 0 or v_unit_cents > 10000000 then raise exception 'invalid_price'; end if;
    v_subtotal := v_subtotal + v_unit_cents * v_quantity;
    if v_subtotal > 10000000 then raise exception 'order_total_limit'; end if;
    v_item_snapshot := jsonb_build_object(
      'product_id', v_product.id,
      'product_name', v_product.name,
      'variant_id', v_variant_id,
      'variant_name', v_variant_name,
      'addons', v_addon_snapshots,
      'unit_price_cents', v_unit_cents
    );
    v_items_snapshot := v_items_snapshot || jsonb_build_array(v_item_snapshot || jsonb_build_object('quantity', v_quantity));
  end loop;

  if v_subtotal < v_minimum then raise exception 'minimum_order_not_met'; end if;
  v_total := v_subtotal + v_delivery_fee;
  if v_total > 10000000 then raise exception 'order_total_limit'; end if;
  if v_total <> p_expected_total_cents then raise exception 'price_changed'; end if;

  v_reference := 'HH-' || to_char(now() at time zone 'Asia/Manila', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.orders(
    order_reference, customer_id, fulfillment_method, delivery_address, service_area, customer_phone,
    order_status, subtotal_cents, delivery_fee_cents, discount_cents, total_cents, currency,
    payment_method, payment_status, customer_notes, idempotency_key
  ) values (
    v_reference, v_user_id, p_fulfillment_method,
    case when p_fulfillment_method = 'delivery' then trim(p_delivery_address) else null end,
    case when p_fulfillment_method = 'delivery' then trim(p_service_area) else null end,
    nullif(trim(p_phone), ''), 'pending_confirmation', v_subtotal, v_delivery_fee, 0, v_total, 'PHP',
    p_payment_method, 'pending', nullif(trim(p_notes), ''), p_idempotency_key
  ) returning id into v_order_id;

  for v_item in select value from jsonb_array_elements(v_items_snapshot) as snapshots(value) loop
    insert into public.order_items(order_id, product_id, item_name_snapshot, selection_snapshot, unit_price_cents, quantity, line_total_cents)
    values (
      v_order_id,
      nullif(v_item ->> 'product_id', '')::uuid,
      v_item ->> 'product_name',
      v_item,
      (v_item ->> 'unit_price_cents')::integer,
      (v_item ->> 'quantity')::integer,
      ((v_item ->> 'unit_price_cents')::integer * (v_item ->> 'quantity')::integer)
    );
  end loop;

  insert into public.payments(order_id, provider, payment_method, amount_cents, currency, status, qr_image_path)
  values (
    v_order_id,
    case when p_payment_method = 'paymongo' then 'paymongo' else 'manual' end,
    p_payment_method, v_total, 'PHP', 'pending',
    case p_payment_method
      when 'gcash_qr' then v_config ->> 'gcash_qr_image_path'
      when 'paymaya_qr' then v_config ->> 'paymaya_qr_image_path'
      else null
    end
  );
  insert into public.order_status_history(order_id, old_status, new_status, changed_by, note)
  values (v_order_id, null, 'pending_confirmation', v_user_id, 'Order submitted');
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_user_id, 'order.created', 'order', v_order_id::text, jsonb_build_object('reference', v_reference));

  return query select v_order_id, v_reference, v_total::integer;
end;
$$;

create or replace function public.submit_qr_payment_reference(p_order_id uuid, p_reference text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
  v_reference text := trim(coalesce(p_reference, ''));
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if length(v_reference) not between 4 and 80 or v_reference ~ '[[:cntrl:]]' then
    raise exception 'invalid_payment_reference';
  end if;
  select * into v_order from public.orders
    where id = p_order_id and customer_id = v_user_id for update;
  if not found
    or v_order.payment_method not in ('gcash_qr', 'paymaya_qr')
    or v_order.payment_status <> 'pending'
    or v_order.order_status = 'cancelled' then
    raise exception 'qr_payment_not_pending';
  end if;
  update public.payments
    set provider_reference = v_reference, updated_at = now()
    where order_id = v_order.id
      and provider = 'manual'
      and payment_method = v_order.payment_method
      and status = 'pending'
    returning * into v_payment;
  if not found then raise exception 'qr_payment_not_pending'; end if;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
    values (v_user_id, 'payment.qr_reference_submitted', 'order', v_order.id::text,
      jsonb_build_object('payment_method', v_order.payment_method, 'order_reference', v_order.order_reference));
exception when unique_violation then
  raise exception 'payment_reference_already_used';
end;
$$;

revoke all on function public.submit_qr_payment_reference(uuid,text) from public, anon;
grant execute on function public.submit_qr_payment_reference(uuid,text) to authenticated;
create or replace function public.record_manual_payment_collected(p_order_id uuid, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
begin
  if v_user_id is null or not public.is_staff(array['administrator','order_manager']) then raise exception 'not_authorized'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.order_status = 'cancelled' then raise exception 'order_not_payable'; end if;
  if v_order.payment_method not in ('cash_on_pickup', 'cash_on_delivery', 'gcash_qr', 'paymaya_qr') or v_order.payment_status not in ('pending', 'unpaid') then
    raise exception 'manual_payment_not_collectible';
  end if;
  select * into v_payment from public.payments where order_id = p_order_id and provider = 'manual' for update;
  if not found or v_payment.status not in ('pending', 'unpaid') or v_payment.amount_cents <> v_order.total_cents then
    raise exception 'manual_payment_not_collectible';
  end if;
  if v_order.payment_method in ('gcash_qr', 'paymaya_qr') and length(trim(coalesce(v_payment.provider_reference, ''))) < 4 then
    raise exception 'payment_reference_required';
  end if;
  update public.payments set status = 'paid' where id = v_payment.id;
  update public.orders set payment_status = 'paid' where id = v_order.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_user_id, case when v_order.payment_method in ('gcash_qr', 'paymaya_qr') then 'payment.qr_verified' else 'payment.cash_collected' end, 'order', v_order.id::text,
    jsonb_build_object('payment_method', v_order.payment_method, 'provider_reference', v_payment.provider_reference, 'amount_cents', v_order.total_cents, 'note', nullif(left(trim(coalesce(p_note, '')), 300), '')));
end;
$$;
create or replace function public.change_order_status(p_order_id uuid, p_new_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_user_id uuid := auth.uid();
  v_staff boolean;
  v_allowed boolean := false;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  select * into v_order from public.orders where id = p_order_id for update;
  if not found then raise exception 'order_not_found'; end if;
  v_staff := public.is_staff(array['administrator','order_manager']);
  if p_new_status = 'cancelled' and v_order.payment_method = 'paymongo' and v_order.payment_status = 'pending'
    and exists(select 1 from public.payments p where p.order_id = v_order.id and p.provider = 'paymongo'
      and p.status = 'pending' and p.provider_session_id is not null) then
    raise exception 'expire_payment_session_first';
  end if;
  if (v_order.payment_method = 'paymongo' or v_order.payment_method in ('gcash_qr', 'paymaya_qr'))
    and v_order.payment_status <> 'paid' and p_new_status <> 'cancelled' then
    raise exception 'payment_required';
  end if;
  if not v_staff then
    if v_order.payment_method in ('gcash_qr', 'paymaya_qr')
      and v_order.payment_status = 'paid' and p_new_status = 'cancelled' then
      raise exception 'payment_received_contact_shop';
    end if;
    if v_order.customer_id <> v_user_id or v_order.order_status <> 'pending_confirmation' or p_new_status <> 'cancelled' then
      raise exception 'not_authorized';
    end if;
  else
    v_allowed := case v_order.order_status
      when 'pending_confirmation' then p_new_status in ('confirmed','cancelled')
      when 'confirmed' then p_new_status in ('preparing','cancelled')
      when 'preparing' then p_new_status in ('ready_for_pickup','out_for_delivery','completed','cancelled')
      when 'ready_for_pickup' then p_new_status in ('completed','cancelled')
      when 'out_for_delivery' then p_new_status in ('completed','cancelled')
      else false
    end;
    if not v_allowed then raise exception 'invalid_status_transition'; end if;
    if p_new_status = 'ready_for_pickup' and v_order.fulfillment_method <> 'pickup' then raise exception 'invalid_status_transition'; end if;
    if p_new_status = 'out_for_delivery' and v_order.fulfillment_method <> 'delivery' then raise exception 'invalid_status_transition'; end if;
  end if;

  if p_new_status = 'cancelled'
    and v_order.payment_method in ('gcash_qr', 'paymaya_qr')
    and v_order.payment_status in ('pending', 'unpaid') then
    update public.payments set status = 'expired', updated_at = now()
      where order_id = v_order.id and provider = 'manual' and status in ('pending', 'unpaid');
    update public.orders set order_status = p_new_status, payment_status = 'expired' where id = p_order_id;
  else
    update public.orders set order_status = p_new_status where id = p_order_id;
  end if;
  insert into public.order_status_history(order_id, old_status, new_status, changed_by, note)
  values (p_order_id, v_order.order_status, p_new_status, v_user_id, nullif(left(trim(coalesce(p_note,'')), 500), ''));
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_user_id, 'order.status_changed', 'order', p_order_id::text, jsonb_build_object('from', v_order.order_status, 'to', p_new_status));
end;
$$;
commit;

