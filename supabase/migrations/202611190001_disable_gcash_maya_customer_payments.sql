begin;

-- Stop offering direct wallet QR payments on new customer orders while keeping
-- existing payment rows and stored QR assets available for historical orders.
update public.business_settings
set config = jsonb_set(
  config,
  '{payment_methods}',
  (
    select coalesce(jsonb_agg(to_jsonb(method) order by ordinal), '[]'::jsonb)
    from jsonb_array_elements_text(config -> 'payment_methods')
      with ordinality as methods(method, ordinal)
    where method not in ('gcash_qr', 'paymaya_qr')
  ),
  true
),
updated_at = now()
where id = true
  and jsonb_typeof(config -> 'payment_methods') = 'array';

-- The order RPC validates its payment choice against this configuration.
-- This constraint prevents the wallet QR methods from being enabled again.
alter table public.business_settings
  drop constraint if exists business_settings_disallow_wallet_qr_methods;

alter table public.business_settings
  add constraint business_settings_disallow_wallet_qr_methods
  check (
    jsonb_typeof(config -> 'payment_methods') is distinct from 'array'
    or not ((config -> 'payment_methods') ?| array['gcash_qr', 'paymaya_qr'])
  );

commit;
