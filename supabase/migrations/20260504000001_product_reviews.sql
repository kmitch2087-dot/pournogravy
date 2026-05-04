create table if not exists public.product_reviews (
  id             uuid primary key default gen_random_uuid(),
  product_slug   text not null,
  user_id        uuid references auth.users (id) on delete set null,
  reviewer_name  text not null,
  rating         integer not null check (rating between 1 and 5),
  body           text,
  is_approved    boolean not null default false,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

create index if not exists product_reviews_slug_idx on public.product_reviews (product_slug);
create index if not exists product_reviews_approved_idx on public.product_reviews (product_slug, is_approved);

drop trigger if exists product_reviews_set_updated_at on public.product_reviews;
create trigger product_reviews_set_updated_at
  before update on public.product_reviews
  for each row execute function public.set_updated_at();

alter table public.product_reviews enable row level security;

-- Anyone can read approved reviews
create policy "product_reviews select approved"
  on public.product_reviews for select
  using (is_approved = true);

-- Anyone (guest or auth) can submit a review
create policy "product_reviews insert any"
  on public.product_reviews for insert
  with check (true);

-- Only admins can approve / update / delete
create policy "product_reviews admin all"
  on public.product_reviews for all
  using (public.is_admin(auth.uid()))
  with check (public.is_admin(auth.uid()));
