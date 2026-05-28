
  create table "public"."blog_posts" (
    "id" uuid not null default gen_random_uuid(),
    "title" text not null,
    "slug" text not null,
    "excerpt" text,
    "content" text,
    "featured_image_url" text,
    "tags" text[] default '{}'::text[],
    "published" boolean default false,
    "published_at" timestamp with time zone,
    "created_by" uuid,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."blog_posts" enable row level security;


  create table "public"."printer_invoices" (
    "id" uuid not null default gen_random_uuid(),
    "invoice_number" text,
    "amount_cents" integer not null,
    "period_start" date,
    "period_end" date,
    "order_count" integer default 0,
    "notes" text,
    "status" text default 'pending'::text,
    "approved_at" timestamp with time zone,
    "paid_at" timestamp with time zone,
    "payment_method" text,
    "payment_ref" text,
    "created_at" timestamp with time zone default now(),
    "updated_at" timestamp with time zone default now()
      );


alter table "public"."printer_invoices" enable row level security;

alter table "public"."products" add column "print_file_url" text;

alter table "public"."products" add column "thumbnail_focal_x" smallint not null default 40;

alter table "public"."products" add column "thumbnail_focal_y" smallint not null default 40;

alter table "public"."products" add column "went_live_at" timestamp with time zone;

alter table "public"."settings" add column "free_shipping_threshold_cents" integer;

alter table "public"."settings" add column "shipping_fee_cents" integer not null default 599;

CREATE UNIQUE INDEX blog_posts_pkey ON public.blog_posts USING btree (id);

CREATE UNIQUE INDEX blog_posts_slug_key ON public.blog_posts USING btree (slug);

CREATE UNIQUE INDEX printer_invoices_pkey ON public.printer_invoices USING btree (id);

alter table "public"."blog_posts" add constraint "blog_posts_pkey" PRIMARY KEY using index "blog_posts_pkey";

alter table "public"."printer_invoices" add constraint "printer_invoices_pkey" PRIMARY KEY using index "printer_invoices_pkey";

alter table "public"."blog_posts" add constraint "blog_posts_created_by_fkey" FOREIGN KEY (created_by) REFERENCES auth.users(id) not valid;

alter table "public"."blog_posts" validate constraint "blog_posts_created_by_fkey";

alter table "public"."blog_posts" add constraint "blog_posts_slug_key" UNIQUE using index "blog_posts_slug_key";

alter table "public"."printer_invoices" add constraint "printer_invoices_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'approved'::text, 'paid'::text]))) not valid;

alter table "public"."printer_invoices" validate constraint "printer_invoices_status_check";

grant delete on table "public"."blog_posts" to "anon";

grant insert on table "public"."blog_posts" to "anon";

grant references on table "public"."blog_posts" to "anon";

grant select on table "public"."blog_posts" to "anon";

grant trigger on table "public"."blog_posts" to "anon";

grant truncate on table "public"."blog_posts" to "anon";

grant update on table "public"."blog_posts" to "anon";

grant delete on table "public"."blog_posts" to "authenticated";

grant insert on table "public"."blog_posts" to "authenticated";

grant references on table "public"."blog_posts" to "authenticated";

grant select on table "public"."blog_posts" to "authenticated";

grant trigger on table "public"."blog_posts" to "authenticated";

grant truncate on table "public"."blog_posts" to "authenticated";

grant update on table "public"."blog_posts" to "authenticated";

grant delete on table "public"."blog_posts" to "service_role";

grant insert on table "public"."blog_posts" to "service_role";

grant references on table "public"."blog_posts" to "service_role";

grant select on table "public"."blog_posts" to "service_role";

grant trigger on table "public"."blog_posts" to "service_role";

grant truncate on table "public"."blog_posts" to "service_role";

grant update on table "public"."blog_posts" to "service_role";

grant delete on table "public"."printer_invoices" to "anon";

grant insert on table "public"."printer_invoices" to "anon";

grant references on table "public"."printer_invoices" to "anon";

grant select on table "public"."printer_invoices" to "anon";

grant trigger on table "public"."printer_invoices" to "anon";

grant truncate on table "public"."printer_invoices" to "anon";

grant update on table "public"."printer_invoices" to "anon";

grant delete on table "public"."printer_invoices" to "authenticated";

grant insert on table "public"."printer_invoices" to "authenticated";

grant references on table "public"."printer_invoices" to "authenticated";

grant select on table "public"."printer_invoices" to "authenticated";

grant trigger on table "public"."printer_invoices" to "authenticated";

grant truncate on table "public"."printer_invoices" to "authenticated";

grant update on table "public"."printer_invoices" to "authenticated";

grant delete on table "public"."printer_invoices" to "service_role";

grant insert on table "public"."printer_invoices" to "service_role";

grant references on table "public"."printer_invoices" to "service_role";

grant select on table "public"."printer_invoices" to "service_role";

grant trigger on table "public"."printer_invoices" to "service_role";

grant truncate on table "public"."printer_invoices" to "service_role";

grant update on table "public"."printer_invoices" to "service_role";


  create policy "Admin full access on blog_posts"
  on "public"."blog_posts"
  as permissive
  for all
  to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));



  create policy "Public can read published posts"
  on "public"."blog_posts"
  as permissive
  for select
  to anon, authenticated
using ((published = true));



  create policy "Admin full access on printer_invoices"
  on "public"."printer_invoices"
  as permissive
  for all
  to authenticated
using (public.is_admin(auth.uid()))
with check (public.is_admin(auth.uid()));


CREATE TRIGGER set_blog_posts_updated_at BEFORE UPDATE ON public.blog_posts FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TRIGGER set_printer_invoices_updated_at BEFORE UPDATE ON public.printer_invoices FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();


  create policy "Admin upload to blog bucket"
  on "storage"."objects"
  as permissive
  for insert
  to authenticated
with check (((bucket_id = 'blog'::text) AND public.is_admin(auth.uid())));



  create policy "Public read on blog bucket"
  on "storage"."objects"
  as permissive
  for select
  to anon, authenticated
using ((bucket_id = 'blog'::text));



