-- Annie's Halo Halo initial schema. Apply through Supabase migrations or SQL editor.
-- Public business settings must never contain secrets or provider credentials.

create extension if not exists pgcrypto;

create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public, pg_temp
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- Auth metadata is user-controlled; malformed timestamps must not break signup.
create or replace function public.try_timestamptz(p_value text)
returns timestamptz
language plpgsql
immutable
set search_path = pg_catalog, pg_temp
as $$
begin
  return nullif(p_value, '')::timestamptz;
exception when others then
  return null;
end;
$$;
revoke all on function public.try_timestamptz(text) from public, anon, authenticated;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  phone text,
  terms_accepted_at timestamptz,
  privacy_acknowledged_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_name_length check (char_length(full_name) between 0 and 120),
  constraint profiles_phone_length check (phone is null or char_length(phone) <= 32)
);

create table if not exists public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role text not null check (role in ('administrator', 'order_manager', 'menu_manager', 'reservation_manager')),
  created_at timestamptz not null default now(),
  unique (user_id, role)
);
create index if not exists user_roles_user_id_idx on public.user_roles(user_id);

create or replace function public.is_staff(p_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public, pg_temp
as $$
  select exists (
    select 1 from public.user_roles r
    where r.user_id = auth.uid() and r.role = any(p_roles)
  );
$$;
revoke all on function public.is_staff(text[]) from public;
grant execute on function public.is_staff(text[]) to anon, authenticated;

create or replace function public.assign_staff_role(p_email text, p_role text, p_enabled boolean)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_actor uuid := auth.uid();
  v_target uuid;
  v_admin_count integer;
begin
  if v_actor is null or not public.is_staff(array['administrator']) then raise exception 'not_authorized'; end if;
  perform pg_advisory_xact_lock(hashtext('administrator_role_assignment'));
  if p_role not in ('administrator', 'order_manager', 'menu_manager', 'reservation_manager') then raise exception 'invalid_role'; end if;
  if length(trim(coalesce(p_email,''))) > 254 or position('@' in p_email) < 2 then raise exception 'invalid_email'; end if;
  select id into v_target from auth.users where lower(email) = lower(trim(p_email)) limit 1;
  if v_target is null then raise exception 'staff_account_not_found'; end if;

  if p_enabled then
    insert into public.user_roles(user_id, role) values (v_target, p_role)
    on conflict (user_id, role) do nothing;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
    values (v_actor, 'staff.role_assigned', 'user', v_target::text, jsonb_build_object('role', p_role));
  else
    if p_role = 'administrator' then
      select count(*) into v_admin_count from public.user_roles where role = 'administrator';
      if v_admin_count <= 1 then raise exception 'last_administrator'; end if;
    end if;
    delete from public.user_roles where user_id = v_target and role = p_role;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
    values (v_actor, 'staff.role_removed', 'user', v_target::text, jsonb_build_object('role', p_role));
  end if;
end;
$$;

create table if not exists public.categories (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 100),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_path text,
  sort_order integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  category_id uuid references public.categories(id) on delete set null,
  name text not null check (char_length(name) between 2 and 120),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  description text,
  image_path text,
  price_cents integer not null check (price_cents >= 0),
  sort_order integer not null default 0 check (sort_order between 0 and 10000),
  is_active boolean not null default false,
  is_available boolean not null default false,
  is_featured boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists products_public_menu_idx on public.products(is_active, is_available, is_featured, sort_order, name);
create index if not exists products_category_id_idx on public.products(category_id);

create table if not exists public.product_variants (
  id uuid primary key default gen_random_uuid(),
  product_id uuid not null references public.products(id) on delete cascade,
  name text not null check (char_length(name) between 1 and 100),
  price_adjustment_cents integer not null default 0,
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(product_id, name)
);
create index if not exists product_variants_product_idx on public.product_variants(product_id, is_active);

create table if not exists public.product_addons (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 100),
  description text,
  price_cents integer not null check (price_cents >= 0),
  is_active boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(name)
);

create table if not exists public.product_addon_assignments (
  product_id uuid not null references public.products(id) on delete cascade,
  addon_id uuid not null references public.product_addons(id) on delete restrict,
  primary key(product_id, addon_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_reference text not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  fulfillment_method text not null check (fulfillment_method in ('pickup', 'delivery')),
  delivery_address text,
  service_area text,
  customer_phone text,
  order_status text not null default 'pending_confirmation' check (order_status in ('pending_confirmation', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled')),
  subtotal_cents integer not null check (subtotal_cents >= 0),
  delivery_fee_cents integer not null default 0 check (delivery_fee_cents >= 0),
  discount_cents integer not null default 0 check (discount_cents >= 0),
  total_cents integer not null check (total_cents >= 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  payment_method text not null,
  payment_status text not null default 'pending' check (payment_status in ('unpaid', 'pending', 'paid', 'failed', 'expired', 'refunded')),
  customer_notes text,
  idempotency_key uuid not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(customer_id, idempotency_key),
  constraint orders_total_math check (total_cents = subtotal_cents + delivery_fee_cents - discount_cents),
  constraint orders_delivery_fields check (
    (fulfillment_method = 'pickup' and delivery_address is null and service_area is null and delivery_fee_cents = 0)
    or (fulfillment_method = 'delivery' and delivery_address is not null and service_area is not null)
  )
);
create index if not exists orders_customer_created_idx on public.orders(customer_id, created_at desc);
create index if not exists orders_status_created_idx on public.orders(order_status, created_at desc);
create index if not exists orders_payment_status_idx on public.orders(payment_status, created_at desc);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  product_id uuid references public.products(id) on delete set null,
  item_name_snapshot text not null,
  selection_snapshot jsonb not null default '{}'::jsonb,
  unit_price_cents integer not null check (unit_price_cents >= 0),
  quantity integer not null check (quantity between 1 and 20),
  line_total_cents integer not null check (line_total_cents = unit_price_cents * quantity),
  created_at timestamptz not null default now()
);
create index if not exists order_items_order_idx on public.order_items(order_id);

create table if not exists public.payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  provider text not null,
  payment_method text not null,
  provider_session_id text unique,
  provider_reference text,
  amount_cents integer not null check (amount_cents >= 0),
  currency text not null default 'PHP' check (currency = 'PHP'),
  status text not null check (status in ('unpaid', 'pending', 'paid', 'failed', 'expired', 'refunded')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists payments_order_idx on public.payments(order_id);

create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null,
  provider_event_id text not null,
  event_type text not null,
  processing_status text not null check (processing_status in ('received', 'processed', 'ignored', 'failed')),
  received_at timestamptz not null default now(),
  unique(provider, provider_event_id)
);

create table if not exists public.order_status_history (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete restrict,
  old_status text check (old_status is null or old_status in ('pending_confirmation', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled')),
  new_status text not null check (new_status in ('pending_confirmation', 'confirmed', 'preparing', 'ready_for_pickup', 'out_for_delivery', 'completed', 'cancelled')),
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists order_status_history_order_idx on public.order_status_history(order_id, created_at);

create table if not exists public.reservations (
  id uuid primary key default gen_random_uuid(),
  reservation_reference text not null unique,
  customer_id uuid not null references auth.users(id) on delete restrict,
  reservation_type text not null,
  requested_at timestamptz not null,
  party_size integer check (party_size is null or party_size between 1 and 40),
  customer_phone text,
  customer_notes text,
  terms_accepted_at timestamptz not null default now(),
  reservation_status text not null default 'pending' check (reservation_status in ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists reservations_customer_created_idx on public.reservations(customer_id, created_at desc);
create index if not exists reservations_slot_status_idx on public.reservations(reservation_type, requested_at, reservation_status);

create table if not exists public.reservation_status_history (
  id uuid primary key default gen_random_uuid(),
  reservation_id uuid not null references public.reservations(id) on delete restrict,
  old_status text check (old_status is null or old_status in ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show')),
  new_status text not null check (new_status in ('pending', 'confirmed', 'rejected', 'cancelled', 'completed', 'no_show')),
  changed_by uuid references auth.users(id) on delete set null,
  note text,
  created_at timestamptz not null default now()
);
create index if not exists reservation_history_reservation_idx on public.reservation_status_history(reservation_id, created_at);

create table if not exists public.business_settings (
  id boolean primary key default true check (id),
  config jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id) on delete set null,
  constraint business_settings_public_object check (jsonb_typeof(config) = 'object')
);

create table if not exists public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references auth.users(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists audit_logs_created_idx on public.audit_logs(created_at desc);

create or replace function public.create_profile_for_new_user()
returns trigger
language plpgsql
security definer
set search_path = public, pg_temp
as $$
begin
  insert into public.profiles(id, full_name, phone, terms_accepted_at, privacy_acknowledged_at)
  values (
    new.id,
    left(coalesce(new.raw_user_meta_data ->> 'full_name', ''), 120),
    nullif(left(coalesce(new.raw_user_meta_data ->> 'phone', ''), 32), ''),
    public.try_timestamptz(new.raw_user_meta_data ->> 'terms_accepted_at'),
    public.try_timestamptz(new.raw_user_meta_data ->> 'privacy_acknowledged_at')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_profile on auth.users;
create trigger on_auth_user_created_profile
after insert on auth.users
for each row execute procedure public.create_profile_for_new_user();

drop trigger if exists profiles_updated_at on public.profiles;
create trigger profiles_updated_at before update on public.profiles for each row execute procedure public.set_updated_at();
drop trigger if exists categories_updated_at on public.categories;
create trigger categories_updated_at before update on public.categories for each row execute procedure public.set_updated_at();
drop trigger if exists products_updated_at on public.products;
create trigger products_updated_at before update on public.products for each row execute procedure public.set_updated_at();
drop trigger if exists variants_updated_at on public.product_variants;
create trigger variants_updated_at before update on public.product_variants for each row execute procedure public.set_updated_at();
drop trigger if exists addons_updated_at on public.product_addons;
create trigger addons_updated_at before update on public.product_addons for each row execute procedure public.set_updated_at();
drop trigger if exists orders_updated_at on public.orders;
create trigger orders_updated_at before update on public.orders for each row execute procedure public.set_updated_at();
drop trigger if exists payments_updated_at on public.payments;
create trigger payments_updated_at before update on public.payments for each row execute procedure public.set_updated_at();
drop trigger if exists reservations_updated_at on public.reservations;
create trigger reservations_updated_at before update on public.reservations for each row execute procedure public.set_updated_at();
drop trigger if exists business_settings_updated_at on public.business_settings;
create trigger business_settings_updated_at before update on public.business_settings for each row execute procedure public.set_updated_at();

insert into public.business_settings(id, config)
values (
  true,
  '{
    "business_name":"Annie’s Halo Halo",
    "short_description":"A local halo-halo shop in Loreto, Agusan del Sur.",
    "brand_story":"",
    "address":"5VJ5+JV6, Loreto, Agusan del Sur, Philippines",
    "phone":"",
    "email":"",
    "business_hours":"",
    "social_links":[],
    "estimated_preparation_minutes":null,
    "estimated_delivery_minutes":null,
    "minimum_order_cents":0,
    "pickup_enabled":false,
    "delivery_enabled":false,
    "delivery_areas":[],
    "payment_methods":[],
    "announcement":"",
    "reservations_enabled":false,
    "reservation_types":[],
    "reservation_slots":[],
    "reservation_cancellation_cutoff_hours":0,
    "policy_copy":{"privacy":{"en":"","fil":""},"terms":{"en":"","fil":""},"refund":{"en":"","fil":""},"ordering":{"en":"","fil":""},"reservation":{"en":"","fil":""}}
  }'::jsonb
)
on conflict (id) do nothing;

-- Customer orders are created only through the authenticated transactional RPC.
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

  if p_payment_method not in ('cash_on_pickup', 'cash_on_delivery', 'paymongo')
    or not coalesce(v_config -> 'payment_methods', '[]'::jsonb) @> to_jsonb(array[p_payment_method]) then
    raise exception 'payment_method_disabled';
  end if;
  if (p_fulfillment_method = 'pickup' and p_payment_method not in ('cash_on_pickup', 'paymongo'))
    or (p_fulfillment_method = 'delivery' and p_payment_method not in ('cash_on_delivery', 'paymongo')) then
    raise exception 'payment_method_mismatch';
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

  insert into public.payments(order_id, provider, payment_method, amount_cents, currency, status)
  values (v_order_id, case when p_payment_method = 'paymongo' then 'paymongo' else 'manual' end, p_payment_method, v_total, 'PHP', 'pending');
  insert into public.order_status_history(order_id, old_status, new_status, changed_by, note)
  values (v_order_id, null, 'pending_confirmation', v_user_id, 'Order submitted');
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_user_id, 'order.created', 'order', v_order_id::text, jsonb_build_object('reference', v_reference));

  return query select v_order_id, v_reference, v_total::integer;
end;
$$;

create or replace function public.attach_paymongo_checkout_session(
  p_order_id uuid,
  p_session_id text,
  p_checkout_url text
)
returns table(provider_session_id text, provider_reference text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_session_id !~ '^cs_[A-Za-z0-9]+$' or p_checkout_url !~ '^https://checkout\.paymongo\.com/' then
    raise exception 'invalid_checkout_session';
  end if;
  select * into v_order from public.orders where id = p_order_id and customer_id = v_user_id for update;
  if not found or v_order.payment_method <> 'paymongo' or v_order.payment_status <> 'pending' or v_order.order_status = 'cancelled' then
    raise exception 'order_not_payable';
  end if;
  select * into v_payment from public.payments where order_id = p_order_id and provider = 'paymongo' for update;
  if not found or v_payment.status <> 'pending' or v_payment.amount_cents <> v_order.total_cents then
    raise exception 'payment_not_payable';
  end if;
  if v_payment.provider_session_id is not null then
    return query select v_payment.provider_session_id, v_payment.provider_reference;
    return;
  end if;
  update public.payments set provider_session_id = p_session_id, provider_reference = p_checkout_url
  where id = v_payment.id;
  return query select p_session_id, p_checkout_url;
end;
$$;

-- Called only after the raw PayMongo webhook signature has been verified server-side.
create or replace function public.process_paymongo_webhook(
  p_event_id text,
  p_event_type text,
  p_session_id text,
  p_order_reference text,
  p_session_amount integer,
  p_payment_amount integer,
  p_currency text,
  p_payment_id text
)
returns text
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_event_row uuid;
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
begin
  if p_event_id !~ '^evt_[A-Za-z0-9]+$' then raise exception 'invalid_event_id'; end if;
  insert into public.payment_events(provider, provider_event_id, event_type, processing_status)
  values ('paymongo', p_event_id, left(coalesce(p_event_type, 'unknown'), 120), 'received')
  on conflict (provider, provider_event_id) do nothing
  returning id into v_event_row;
  if v_event_row is null then return 'duplicate'; end if;

  if p_event_type <> 'checkout_session.payment.paid' then
    update public.payment_events set processing_status = 'ignored' where id = v_event_row;
    return 'ignored';
  end if;
  if coalesce(p_session_id, '') !~ '^cs_[A-Za-z0-9]+$'
    or coalesce(p_payment_id, '') !~ '^pay_[A-Za-z0-9]+$'
    or coalesce(p_order_reference, '') = '' then
    update public.payment_events set processing_status = 'failed' where id = v_event_row;
    return 'invalid_payload';
  end if;

  select * into v_order from public.orders where order_reference = p_order_reference for update;
  if not found then
    update public.payment_events set processing_status = 'failed' where id = v_event_row;
    return 'order_not_found';
  end if;
  select * into v_payment from public.payments where order_id = v_order.id and provider = 'paymongo' for update;
  if not found
    or v_order.payment_method <> 'paymongo'
    or v_payment.provider_session_id <> p_session_id
    or v_payment.amount_cents <> v_order.total_cents
    or p_session_amount is distinct from v_order.total_cents
    or p_payment_amount is distinct from v_order.total_cents
    or p_currency <> 'PHP'
    or v_order.currency <> 'PHP'
    or v_payment.status not in ('pending', 'paid') then
    update public.payment_events set processing_status = 'failed' where id = v_event_row;
    insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
    values (null, 'payment.webhook_rejected', 'order', v_order.id::text,
      jsonb_build_object('event_id', p_event_id, 'reason', 'payment_validation_failed'));
    return 'payment_validation_failed';
  end if;

  if v_payment.status = 'paid' then
    update public.payment_events set processing_status = 'processed' where id = v_event_row;
    return 'already_paid';
  end if;
  update public.payments set status = 'paid', provider_reference = p_payment_id where id = v_payment.id;
  update public.orders set payment_status = 'paid' where id = v_order.id;
  update public.payment_events set processing_status = 'processed' where id = v_event_row;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (null, 'payment.received', 'order', v_order.id::text,
    jsonb_build_object('provider', 'paymongo', 'payment_id', p_payment_id, 'reference', v_order.order_reference));
  return 'processed';
end;
$$;

create or replace function public.mark_paymongo_session_expired(p_order_id uuid, p_session_id text)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_order public.orders%rowtype;
  v_payment public.payments%rowtype;
begin
  select * into v_order from public.orders where id = p_order_id for update;
  if not found or v_order.payment_method <> 'paymongo' then raise exception 'order_not_found'; end if;
  select * into v_payment from public.payments
  where order_id = p_order_id and provider = 'paymongo' for update;
  if not found or v_payment.provider_session_id <> p_session_id then raise exception 'payment_session_mismatch'; end if;
  if v_payment.status = 'expired' and v_order.payment_status = 'expired' then return; end if;
  if v_payment.status <> 'pending' or v_order.payment_status <> 'pending' then raise exception 'payment_state_changed'; end if;

  update public.payments set status = 'expired' where id = v_payment.id;
  update public.orders set payment_status = 'expired' where id = v_order.id;
  insert into public.payment_events(provider, provider_event_id, event_type, processing_status)
  values ('paymongo', 'expire_' || p_session_id, 'checkout_session.expired', 'processed')
  on conflict (provider, provider_event_id) do nothing;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (null, 'payment.session_expired', 'order', v_order.id::text,
    jsonb_build_object('provider', 'paymongo', 'session_id', p_session_id, 'reference', v_order.order_reference));
end;
$$;

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
  if v_order.payment_method not in ('cash_on_pickup', 'cash_on_delivery') or v_order.payment_status not in ('pending', 'unpaid') then
    raise exception 'manual_payment_not_collectible';
  end if;
  select * into v_payment from public.payments where order_id = p_order_id and provider = 'manual' for update;
  if not found or v_payment.status not in ('pending', 'unpaid') or v_payment.amount_cents <> v_order.total_cents then
    raise exception 'manual_payment_not_collectible';
  end if;
  update public.payments set status = 'paid' where id = v_payment.id;
  update public.orders set payment_status = 'paid' where id = v_order.id;
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_user_id, 'payment.cash_collected', 'order', v_order.id::text,
    jsonb_build_object('amount_cents', v_order.total_cents, 'note', nullif(left(trim(coalesce(p_note, '')), 300), '')));
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
  if v_order.payment_method = 'paymongo' and v_order.payment_status <> 'paid' and p_new_status <> 'cancelled' then
    raise exception 'payment_required';
  end if;
  if not v_staff then
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

  update public.orders set order_status = p_new_status where id = p_order_id;
  insert into public.order_status_history(order_id, old_status, new_status, changed_by, note)
  values (p_order_id, v_order.order_status, p_new_status, v_user_id, nullif(left(trim(coalesce(p_note,'')), 500), ''));
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_user_id, 'order.status_changed', 'order', p_order_id::text, jsonb_build_object('from', v_order.order_status, 'to', p_new_status));
end;
$$;

create or replace function public.request_reservation(
  p_type text,
  p_requested_at timestamptz,
  p_party_size integer,
  p_phone text,
  p_notes text,
  p_terms_accepted boolean
)
returns table(reservation_id uuid, reservation_reference text, reservation_status text)
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_user_id uuid := auth.uid();
  v_config jsonb;
  v_type jsonb;
  v_slot jsonb;
  v_capacity integer;
  v_used integer;
  v_reference text;
  v_id uuid;
  v_max_days integer;
  v_min_lead_hours integer;
  v_min_party_size integer;
  v_max_party_size integer;
  v_party_required boolean;
  v_type_capacity integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  if p_terms_accepted is distinct from true then raise exception 'reservation_terms_required'; end if;
  if p_requested_at is null or p_requested_at <= now() then raise exception 'invalid_reservation_time'; end if;

  -- Locking the settings row prevents concurrent requests from exceeding the configured slot capacity.
  select config into v_config from public.business_settings where id = true for update;
  if coalesce((v_config ->> 'reservations_enabled')::boolean, false) is not true then raise exception 'reservations_disabled'; end if;
  select item into v_type from jsonb_array_elements(coalesce(v_config -> 'reservation_types', '[]'::jsonb)) as types(item)
    where item ->> 'id' = p_type and coalesce((item ->> 'enabled')::boolean, false) = true limit 1;
  if v_type is null then raise exception 'reservation_type_disabled'; end if;
  v_max_days := coalesce((v_type ->> 'max_advance_days')::integer, 0);
  v_party_required := coalesce((v_type ->> 'party_size_required')::boolean, false);
  v_type_capacity := nullif(v_type ->> 'capacity', '')::integer;
  v_min_lead_hours := coalesce((v_type ->> 'min_lead_hours')::integer, 0);
  v_min_party_size := coalesce((v_type ->> 'minimum_party_size')::integer, 1);
  v_max_party_size := coalesce((v_type ->> 'maximum_party_size')::integer, 40);
  if v_max_days < 1 or p_requested_at > now() + make_interval(days => v_max_days) then raise exception 'reservation_too_far_ahead'; end if;
  if v_min_lead_hours > 0 and p_requested_at < now() + make_interval(hours => v_min_lead_hours) then raise exception 'reservation_lead_time'; end if;
  if v_party_required and coalesce(p_party_size, 0) < 1 then raise exception 'party_size_required'; end if;
  if p_party_size is not null and p_party_size not between 1 and 40 then raise exception 'invalid_party_size'; end if;
  if v_party_required and p_party_size not between v_min_party_size and v_max_party_size then raise exception 'invalid_party_size'; end if;
  if v_party_required and v_type_capacity is not null and p_party_size > v_type_capacity then raise exception 'party_size_exceeds_type_capacity'; end if;

  select item into v_slot from jsonb_array_elements(coalesce(v_config -> 'reservation_slots', '[]'::jsonb)) as slots(item)
    where item ->> 'type_id' = p_type and (item ->> 'starts_at')::timestamptz = p_requested_at limit 1;
  if v_slot is null then raise exception 'reservation_slot_unavailable'; end if;
  v_capacity := coalesce((v_slot ->> 'capacity')::integer, 0);
  if v_capacity < 1 then raise exception 'reservation_slot_unavailable'; end if;
  select coalesce(sum(case when v_party_required then coalesce(party_size, 0) else 1 end), 0)::integer into v_used
  from public.reservations
  where reservation_type = p_type and requested_at = p_requested_at and reservation_status in ('pending','confirmed');
  if v_used + (case when v_party_required then coalesce(p_party_size, 0) else 1 end) > v_capacity then
    raise exception 'reservation_slot_full';
  end if;

  v_reference := 'RS-' || to_char(now() at time zone 'Asia/Manila', 'YYMMDD') || '-' || upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 8));
  insert into public.reservations(reservation_reference, customer_id, reservation_type, requested_at, party_size, customer_phone, customer_notes, reservation_status)
  values (v_reference, v_user_id, p_type, p_requested_at, case when v_party_required then p_party_size else null end,
    nullif(trim(p_phone), ''), nullif(trim(left(coalesce(p_notes,''), 1000)), ''), 'pending')
  returning id into v_id;
  insert into public.reservation_status_history(reservation_id, old_status, new_status, changed_by, note)
  values (v_id, null, 'pending', v_user_id, 'Reservation request submitted');
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_user_id, 'reservation.created', 'reservation', v_id::text, jsonb_build_object('reference', v_reference));
  return query select v_id, v_reference, 'pending'::text;
end;
$$;

create or replace function public.change_reservation_status(p_reservation_id uuid, p_new_status text, p_note text default null)
returns void
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_reservation public.reservations%rowtype;
  v_user_id uuid := auth.uid();
  v_staff boolean;
  v_allowed boolean := false;
  v_config jsonb;
  v_cancel_cutoff_hours integer;
begin
  if v_user_id is null then raise exception 'authentication_required'; end if;
  select * into v_reservation from public.reservations where id = p_reservation_id for update;
  if not found then raise exception 'reservation_not_found'; end if;
  v_staff := public.is_staff(array['administrator','reservation_manager']);
  if not v_staff then
    if v_reservation.customer_id <> v_user_id or v_reservation.reservation_status <> 'pending' or p_new_status <> 'cancelled' then
      raise exception 'not_authorized';
    end if;
    select config into v_config from public.business_settings where id = true;
    v_cancel_cutoff_hours := coalesce((v_config ->> 'reservation_cancellation_cutoff_hours')::integer, 0);
    if v_reservation.requested_at <= now() + make_interval(hours => v_cancel_cutoff_hours) then raise exception 'cancellation_deadline_passed'; end if;
  else
    v_allowed := case v_reservation.reservation_status
      when 'pending' then p_new_status in ('confirmed','rejected','cancelled')
      when 'confirmed' then p_new_status in ('cancelled','completed','no_show')
      else false
    end;
    if not v_allowed then raise exception 'invalid_status_transition'; end if;
  end if;
  update public.reservations set reservation_status = p_new_status where id = p_reservation_id;
  insert into public.reservation_status_history(reservation_id, old_status, new_status, changed_by, note)
  values (p_reservation_id, v_reservation.reservation_status, p_new_status, v_user_id, nullif(left(trim(coalesce(p_note,'')), 500), ''));
  insert into public.audit_logs(actor_id, action, entity_type, entity_id, details)
  values (v_user_id, 'reservation.status_changed', 'reservation', p_reservation_id::text, jsonb_build_object('from', v_reservation.reservation_status, 'to', p_new_status));
end;
$$;

create or replace function public.get_admin_metrics(p_from timestamptz default null, p_to timestamptz default null)
returns table(
  total_orders bigint,
  pending_orders bigint,
  confirmed_orders bigint,
  preparing_orders bigint,
  ready_for_pickup_orders bigint,
  out_for_delivery_orders bigint,
  completed_orders bigint,
  cancelled_orders bigint,
  pending_reservations bigint,
  confirmed_reservations bigint,
  paid_sales_cents bigint,
  unpaid_order_cents bigint,
  unavailable_products bigint
)
language plpgsql
stable
security definer
set search_path = public, pg_temp
as $$
begin
  if auth.uid() is null or not public.is_staff(array['administrator']) then raise exception 'not_authorized'; end if;
  return query
  select
    count(o.id),
    count(o.id) filter (where o.order_status = 'pending_confirmation'),
    count(o.id) filter (where o.order_status = 'confirmed'),
    count(o.id) filter (where o.order_status = 'preparing'),
    count(o.id) filter (where o.order_status = 'ready_for_pickup'),
    count(o.id) filter (where o.order_status = 'out_for_delivery'),
    count(o.id) filter (where o.order_status = 'completed'),
    count(o.id) filter (where o.order_status = 'cancelled'),
    (select count(*) from public.reservations r where (p_from is null or r.created_at >= p_from) and (p_to is null or r.created_at < p_to) and r.reservation_status = 'pending'),
    (select count(*) from public.reservations r where (p_from is null or r.created_at >= p_from) and (p_to is null or r.created_at < p_to) and r.reservation_status = 'confirmed'),
    coalesce(sum(o.total_cents) filter (where o.payment_status = 'paid' and o.order_status <> 'cancelled'), 0),
    coalesce(sum(o.total_cents) filter (where o.payment_status in ('unpaid','pending') and o.order_status <> 'cancelled'), 0),
    (select count(*) from public.products p where p.is_active and not p.is_available)
  from public.orders o
  where (p_from is null or o.created_at >= p_from)
    and (p_to is null or o.created_at < p_to);
end;
$$;

create or replace function public.current_business_time()
returns timestamptz
language sql
stable
set search_path = public, pg_temp
as $$
  select now();
$$;

revoke all on function public.place_order(jsonb,text,text,text,text,text,text,uuid,integer) from public, anon;
revoke all on function public.attach_paymongo_checkout_session(uuid,text,text) from public, anon;
revoke all on function public.process_paymongo_webhook(text,text,text,text,integer,integer,text,text) from public, anon, authenticated;
revoke all on function public.mark_paymongo_session_expired(uuid,text) from public, anon, authenticated;
revoke all on function public.record_manual_payment_collected(uuid,text) from public, anon;
revoke all on function public.change_order_status(uuid,text,text) from public, anon;
revoke all on function public.request_reservation(text,timestamptz,integer,text,text,boolean) from public, anon;
revoke all on function public.change_reservation_status(uuid,text,text) from public, anon;
revoke all on function public.assign_staff_role(text,text,boolean) from public, anon;
revoke all on function public.get_admin_metrics(timestamptz,timestamptz) from public, anon;
revoke all on function public.current_business_time() from public;
grant execute on function public.place_order(jsonb,text,text,text,text,text,text,uuid,integer) to authenticated;
grant execute on function public.attach_paymongo_checkout_session(uuid,text,text) to authenticated;
grant execute on function public.process_paymongo_webhook(text,text,text,text,integer,integer,text,text) to service_role;
grant execute on function public.mark_paymongo_session_expired(uuid,text) to service_role;
grant execute on function public.record_manual_payment_collected(uuid,text) to authenticated;
grant execute on function public.change_order_status(uuid,text,text) to authenticated;
grant execute on function public.request_reservation(text,timestamptz,integer,text,text,boolean) to authenticated;
grant execute on function public.change_reservation_status(uuid,text,text) to authenticated;
grant execute on function public.assign_staff_role(text,text,boolean) to authenticated;
grant execute on function public.get_admin_metrics(timestamptz,timestamptz) to authenticated;
grant execute on function public.current_business_time() to anon, authenticated;

alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.categories enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.product_addons enable row level security;
alter table public.product_addon_assignments enable row level security;
alter table public.orders enable row level security;
alter table public.order_items enable row level security;
alter table public.payments enable row level security;
alter table public.payment_events enable row level security;
alter table public.order_status_history enable row level security;
alter table public.reservations enable row level security;
alter table public.reservation_status_history enable row level security;
alter table public.business_settings enable row level security;
alter table public.audit_logs enable row level security;

drop policy if exists "profiles_select_self_or_fulfillment_staff" on public.profiles;
create policy "profiles_select_self_or_fulfillment_staff" on public.profiles for select to authenticated
  using (id = auth.uid() or public.is_staff(array['administrator','order_manager','reservation_manager']));
drop policy if exists "profiles_update_self" on public.profiles;
create policy "profiles_update_self" on public.profiles for update to authenticated
  using (id = auth.uid()) with check (id = auth.uid());

drop policy if exists "user_roles_select_self_or_admin" on public.user_roles;
create policy "user_roles_select_self_or_admin" on public.user_roles for select to authenticated
  using (user_id = auth.uid() or public.is_staff(array['administrator']));

drop policy if exists "categories_public_active" on public.categories;
create policy "categories_public_active" on public.categories for select to anon, authenticated
  using (is_active or public.is_staff(array['administrator','menu_manager']));
drop policy if exists "categories_staff_manage" on public.categories;
create policy "categories_staff_manage" on public.categories for all to authenticated
  using (public.is_staff(array['administrator','menu_manager']))
  with check (public.is_staff(array['administrator','menu_manager']));

drop policy if exists "products_public_active" on public.products;
create policy "products_public_active" on public.products for select to anon, authenticated
  using (is_active or public.is_staff(array['administrator','menu_manager']));
drop policy if exists "products_staff_manage" on public.products;
create policy "products_staff_manage" on public.products for all to authenticated
  using (public.is_staff(array['administrator','menu_manager']))
  with check (public.is_staff(array['administrator','menu_manager']));

drop policy if exists "variants_public_active_for_product" on public.product_variants;
create policy "variants_public_active_for_product" on public.product_variants for select to anon, authenticated
  using ((is_active and exists(select 1 from public.products p where p.id = product_id and p.is_active))
    or public.is_staff(array['administrator','menu_manager']));
drop policy if exists "variants_staff_manage" on public.product_variants;
create policy "variants_staff_manage" on public.product_variants for all to authenticated
  using (public.is_staff(array['administrator','menu_manager']))
  with check (public.is_staff(array['administrator','menu_manager']));

drop policy if exists "addons_public_active_assigned" on public.product_addons;
create policy "addons_public_active_assigned" on public.product_addons for select to anon, authenticated
  using ((is_active and exists(select 1 from public.product_addon_assignments pa join public.products p on p.id = pa.product_id where pa.addon_id = id and p.is_active))
    or public.is_staff(array['administrator','menu_manager']));
drop policy if exists "addons_staff_manage" on public.product_addons;
create policy "addons_staff_manage" on public.product_addons for all to authenticated
  using (public.is_staff(array['administrator','menu_manager']))
  with check (public.is_staff(array['administrator','menu_manager']));

drop policy if exists "addon_assignments_public_active" on public.product_addon_assignments;
create policy "addon_assignments_public_active" on public.product_addon_assignments for select to anon, authenticated
  using ((exists(select 1 from public.products p where p.id = product_id and p.is_active)
    and exists(select 1 from public.product_addons a where a.id = addon_id and a.is_active))
    or public.is_staff(array['administrator','menu_manager']));
drop policy if exists "addon_assignments_staff_manage" on public.product_addon_assignments;
create policy "addon_assignments_staff_manage" on public.product_addon_assignments for all to authenticated
  using (public.is_staff(array['administrator','menu_manager']))
  with check (public.is_staff(array['administrator','menu_manager']));

drop policy if exists "orders_customer_or_staff_read" on public.orders;
create policy "orders_customer_or_staff_read" on public.orders for select to authenticated
  using (customer_id = auth.uid() or public.is_staff(array['administrator','order_manager']));
drop policy if exists "order_items_customer_or_staff_read" on public.order_items;
create policy "order_items_customer_or_staff_read" on public.order_items for select to authenticated
  using (exists(select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff(array['administrator','order_manager']))));
drop policy if exists "payments_customer_or_staff_read" on public.payments;
create policy "payments_customer_or_staff_read" on public.payments for select to authenticated
  using (exists(select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff(array['administrator','order_manager']))));
drop policy if exists "payment_events_staff_read" on public.payment_events;
create policy "payment_events_staff_read" on public.payment_events for select to authenticated
  using (public.is_staff(array['administrator']));
drop policy if exists "order_history_customer_or_staff_read" on public.order_status_history;
create policy "order_history_customer_or_staff_read" on public.order_status_history for select to authenticated
  using (exists(select 1 from public.orders o where o.id = order_id and (o.customer_id = auth.uid() or public.is_staff(array['administrator','order_manager']))));

drop policy if exists "reservations_customer_or_staff_read" on public.reservations;
create policy "reservations_customer_or_staff_read" on public.reservations for select to authenticated
  using (customer_id = auth.uid() or public.is_staff(array['administrator','reservation_manager']));
drop policy if exists "reservation_history_customer_or_staff_read" on public.reservation_status_history;
create policy "reservation_history_customer_or_staff_read" on public.reservation_status_history for select to authenticated
  using (exists(select 1 from public.reservations r where r.id = reservation_id and (r.customer_id = auth.uid() or public.is_staff(array['administrator','reservation_manager']))));

drop policy if exists "business_settings_public_read" on public.business_settings;
create policy "business_settings_public_read" on public.business_settings for select to anon, authenticated using (id = true);
drop policy if exists "business_settings_admin_manage" on public.business_settings;
create policy "business_settings_admin_manage" on public.business_settings for all to authenticated
  using (public.is_staff(array['administrator']))
  with check (public.is_staff(array['administrator']));

drop policy if exists "audit_logs_admin_read" on public.audit_logs;
create policy "audit_logs_admin_read" on public.audit_logs for select to authenticated
  using (public.is_staff(array['administrator']));

grant usage on schema public to anon, authenticated;
grant select on public.categories, public.products, public.product_variants, public.product_addons, public.product_addon_assignments, public.business_settings to anon, authenticated;
grant select on public.profiles to authenticated;
grant update(full_name, phone) on public.profiles to authenticated;
grant select on public.user_roles, public.orders, public.order_items, public.payments, public.payment_events,
  public.order_status_history, public.reservations, public.reservation_status_history, public.audit_logs to authenticated;
grant insert, update, delete on public.categories, public.products, public.product_variants, public.product_addons,
  public.product_addon_assignments to authenticated;
grant insert, update on public.business_settings to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values ('menu', 'menu', true, 5242880, array['image/jpeg','image/png','image/webp','image/avif'])
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;

drop policy if exists "menu_images_public_read" on storage.objects;
create policy "menu_images_public_read" on storage.objects for select to anon, authenticated using (bucket_id = 'menu');
drop policy if exists "menu_images_staff_insert" on storage.objects;
create policy "menu_images_staff_insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'menu' and public.is_staff(array['administrator','menu_manager']));
drop policy if exists "menu_images_staff_update" on storage.objects;
create policy "menu_images_staff_update" on storage.objects for update to authenticated
  using (bucket_id = 'menu' and public.is_staff(array['administrator','menu_manager']))
  with check (bucket_id = 'menu' and public.is_staff(array['administrator','menu_manager']));
drop policy if exists "menu_images_staff_delete" on storage.objects;
create policy "menu_images_staff_delete" on storage.objects for delete to authenticated
  using (bucket_id = 'menu' and public.is_staff(array['administrator','menu_manager']));

comment on table public.business_settings is 'Public, non-secret business configuration only; never store provider credentials here.';
comment on table public.orders is 'Orders can be created only through place_order after server-side pricing and availability checks.';
comment on table public.user_roles is 'Role assignment is intentionally restricted to trusted project administration.';
