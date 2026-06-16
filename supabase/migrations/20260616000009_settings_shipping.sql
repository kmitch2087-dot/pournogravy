-- Separate standard / express shipping rates and explicit free-shipping threshold.
alter table public.settings
  add column if not exists shipping_standard_cents        integer default 799,
  add column if not exists shipping_express_cents         integer default 1499,
  add column if not exists free_shipping_threshold_cents  integer default 7500;

-- Back-fill standard from existing shipping_fee_cents where set.
update public.settings
   set shipping_standard_cents = shipping_fee_cents
 where id = 1
   and shipping_fee_cents is not null
   and shipping_standard_cents is null;
