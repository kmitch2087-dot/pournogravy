alter table public.settings
  add column if not exists easter_eggs_mode text not null default 'random' check (easter_eggs_mode in ('random','fixed')),
  add column if not exists easter_eggs_fixed_table_name uuid references public.product_easter_eggs(id),
  add column if not exists easter_eggs_fixed_server_name uuid references public.product_easter_eggs(id),
  add column if not exists easter_eggs_fixed_special_instruction uuid references public.product_easter_eggs(id),
  add column if not exists easter_eggs_fixed_footer_note uuid references public.product_easter_eggs(id);
