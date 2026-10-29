-- Add a customer-owned default address for faster delivery checkout.
-- Existing self-only profile RLS remains in force.

alter table public.profiles
  add column if not exists default_delivery_address text;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conrelid = 'public.profiles'::regclass
      and conname = 'profiles_default_delivery_address_length'
  ) then
    alter table public.profiles
      add constraint profiles_default_delivery_address_length
      check (
        default_delivery_address is null
        or char_length(default_delivery_address) <= 500
      );
  end if;
end;
$$;

grant update(full_name, phone, default_delivery_address)
  on public.profiles to authenticated;
