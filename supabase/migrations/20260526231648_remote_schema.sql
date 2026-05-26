create extension if not exists "pg_cron" with schema "pg_catalog";

create extension if not exists "hypopg" with schema "extensions";

create extension if not exists "index_advisor" with schema "extensions";

create schema if not exists "pgmq";

create extension if not exists "pgmq" with schema "pgmq";

create schema if not exists "stripe";

create extension if not exists "btree_gist" with schema "stripe";

drop policy "custom_requests insert anon" on "public"."custom_requests";

drop policy "profiles update own non-admin fields" on "public"."profiles";


  create table "stripe"."_managed_webhooks" (
    "id" text not null,
    "object" text,
    "url" text not null,
    "enabled_events" jsonb not null,
    "description" text,
    "enabled" boolean,
    "livemode" boolean,
    "metadata" jsonb,
    "secret" text not null,
    "status" text,
    "api_version" text,
    "created" bigint,
    "last_synced_at" timestamp with time zone,
    "updated_at" timestamp with time zone not null default now(),
    "account_id" text not null
      );



  create table "stripe"."_migrations" (
    "id" integer not null,
    "name" character varying(100) not null,
    "hash" character varying(40) not null,
    "executed_at" timestamp without time zone default CURRENT_TIMESTAMP
      );



  create table "stripe"."_rate_limits" (
    "key" text not null,
    "count" integer not null default 0,
    "window_start" timestamp with time zone not null default now()
      );



  create table "stripe"."_sync_obj_runs" (
    "_account_id" text not null,
    "run_started_at" timestamp with time zone not null,
    "object" text not null,
    "status" text not null default 'pending'::text,
    "started_at" timestamp with time zone,
    "completed_at" timestamp with time zone,
    "processed_count" integer not null default 0,
    "cursor" text,
    "page_cursor" text,
    "created_gte" integer not null default 0,
    "created_lte" integer not null default 0,
    "priority" integer not null default 0,
    "error_message" text,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "stripe"."_sync_runs" (
    "_account_id" text not null,
    "started_at" timestamp with time zone not null default now(),
    "closed_at" timestamp with time zone,
    "max_concurrent" integer not null default 3,
    "triggered_by" text,
    "error_message" text,
    "updated_at" timestamp with time zone not null default now()
      );



  create table "stripe"."accounts" (
    "_raw_data" jsonb not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "api_key_hashes" text[] not null default '{}'::text[],
    "first_synced_at" timestamp with time zone not null default now(),
    "_last_synced_at" timestamp with time zone not null default now(),
    "_updated_at" timestamp with time zone not null default now()
      );



  create table "stripe"."active_entitlements" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "customer" text generated always as ((_raw_data ->> 'customer'::text)) stored,
    "feature" text generated always as ((_raw_data ->> 'feature'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "lookup_key" text generated always as ((_raw_data ->> 'lookup_key'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored
      );



  create table "stripe"."charges" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "amount" bigint generated always as ((NULLIF((_raw_data ->> 'amount'::text), ''::text))::bigint) stored,
    "amount_refunded" bigint generated always as ((NULLIF((_raw_data ->> 'amount_refunded'::text), ''::text))::bigint) stored,
    "application" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'application'::text)) = 'object'::text) AND ((_raw_data -> 'application'::text) ? 'id'::text)) THEN ((_raw_data -> 'application'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'application'::text)
END) stored,
    "application_fee" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'application_fee'::text)) = 'object'::text) AND ((_raw_data -> 'application_fee'::text) ? 'id'::text)) THEN ((_raw_data -> 'application_fee'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'application_fee'::text)
END) stored,
    "application_fee_amount" bigint generated always as ((NULLIF((_raw_data ->> 'application_fee_amount'::text), ''::text))::bigint) stored,
    "balance_transaction" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'balance_transaction'::text)) = 'object'::text) AND ((_raw_data -> 'balance_transaction'::text) ? 'id'::text)) THEN ((_raw_data -> 'balance_transaction'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'balance_transaction'::text)
END) stored,
    "billing_details" jsonb generated always as ((_raw_data -> 'billing_details'::text)) stored,
    "calculated_statement_descriptor" text generated always as ((_raw_data ->> 'calculated_statement_descriptor'::text)) stored,
    "captured" boolean generated always as ((NULLIF((_raw_data ->> 'captured'::text), ''::text))::boolean) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "description" text generated always as ((_raw_data ->> 'description'::text)) stored,
    "disputed" boolean generated always as ((NULLIF((_raw_data ->> 'disputed'::text), ''::text))::boolean) stored,
    "failure_code" text generated always as ((_raw_data ->> 'failure_code'::text)) stored,
    "failure_message" text generated always as ((_raw_data ->> 'failure_message'::text)) stored,
    "fraud_details" jsonb generated always as ((_raw_data -> 'fraud_details'::text)) stored,
    "invoice" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'invoice'::text)) = 'object'::text) AND ((_raw_data -> 'invoice'::text) ? 'id'::text)) THEN ((_raw_data -> 'invoice'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'invoice'::text)
END) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "on_behalf_of" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'on_behalf_of'::text)) = 'object'::text) AND ((_raw_data -> 'on_behalf_of'::text) ? 'id'::text)) THEN ((_raw_data -> 'on_behalf_of'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'on_behalf_of'::text)
END) stored,
    "order" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'order'::text)) = 'object'::text) AND ((_raw_data -> 'order'::text) ? 'id'::text)) THEN ((_raw_data -> 'order'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'order'::text)
END) stored,
    "outcome" jsonb generated always as ((_raw_data -> 'outcome'::text)) stored,
    "paid" boolean generated always as ((NULLIF((_raw_data ->> 'paid'::text), ''::text))::boolean) stored,
    "payment_intent" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'payment_intent'::text)) = 'object'::text) AND ((_raw_data -> 'payment_intent'::text) ? 'id'::text)) THEN ((_raw_data -> 'payment_intent'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'payment_intent'::text)
END) stored,
    "payment_method" text generated always as ((_raw_data ->> 'payment_method'::text)) stored,
    "payment_method_details" jsonb generated always as ((_raw_data -> 'payment_method_details'::text)) stored,
    "receipt_email" text generated always as ((_raw_data ->> 'receipt_email'::text)) stored,
    "receipt_number" text generated always as ((_raw_data ->> 'receipt_number'::text)) stored,
    "receipt_url" text generated always as ((_raw_data ->> 'receipt_url'::text)) stored,
    "refunded" boolean generated always as ((NULLIF((_raw_data ->> 'refunded'::text), ''::text))::boolean) stored,
    "refunds" jsonb generated always as ((_raw_data -> 'refunds'::text)) stored,
    "review" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'review'::text)) = 'object'::text) AND ((_raw_data -> 'review'::text) ? 'id'::text)) THEN ((_raw_data -> 'review'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'review'::text)
END) stored,
    "shipping" jsonb generated always as ((_raw_data -> 'shipping'::text)) stored,
    "source_transfer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'source_transfer'::text)) = 'object'::text) AND ((_raw_data -> 'source_transfer'::text) ? 'id'::text)) THEN ((_raw_data -> 'source_transfer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'source_transfer'::text)
END) stored,
    "statement_descriptor" text generated always as ((_raw_data ->> 'statement_descriptor'::text)) stored,
    "statement_descriptor_suffix" text generated always as ((_raw_data ->> 'statement_descriptor_suffix'::text)) stored,
    "status" text generated always as ((_raw_data ->> 'status'::text)) stored,
    "transfer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'transfer'::text)) = 'object'::text) AND ((_raw_data -> 'transfer'::text) ? 'id'::text)) THEN ((_raw_data -> 'transfer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'transfer'::text)
END) stored,
    "transfer_data" jsonb generated always as ((_raw_data -> 'transfer_data'::text)) stored,
    "transfer_group" text generated always as ((_raw_data ->> 'transfer_group'::text)) stored
      );



  create table "stripe"."checkout_session_line_items" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "amount_discount" bigint generated always as ((NULLIF((_raw_data ->> 'amount_discount'::text), ''::text))::bigint) stored,
    "amount_subtotal" bigint generated always as ((NULLIF((_raw_data ->> 'amount_subtotal'::text), ''::text))::bigint) stored,
    "amount_tax" bigint generated always as ((NULLIF((_raw_data ->> 'amount_tax'::text), ''::text))::bigint) stored,
    "amount_total" bigint generated always as ((NULLIF((_raw_data ->> 'amount_total'::text), ''::text))::bigint) stored,
    "checkout_session" text generated always as ((_raw_data ->> 'checkout_session'::text)) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "description" text generated always as ((_raw_data ->> 'description'::text)) stored,
    "discounts" jsonb generated always as ((_raw_data -> 'discounts'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "price" jsonb generated always as ((_raw_data -> 'price'::text)) stored,
    "quantity" bigint generated always as ((NULLIF((_raw_data ->> 'quantity'::text), ''::text))::bigint) stored,
    "taxes" jsonb generated always as ((_raw_data -> 'taxes'::text)) stored
      );



  create table "stripe"."checkout_sessions" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "allow_promotion_codes" boolean generated always as ((NULLIF((_raw_data ->> 'allow_promotion_codes'::text), ''::text))::boolean) stored,
    "amount_subtotal" bigint generated always as ((NULLIF((_raw_data ->> 'amount_subtotal'::text), ''::text))::bigint) stored,
    "amount_total" bigint generated always as ((NULLIF((_raw_data ->> 'amount_total'::text), ''::text))::bigint) stored,
    "billing_address_collection" text generated always as ((_raw_data ->> 'billing_address_collection'::text)) stored,
    "cancel_url" text generated always as ((_raw_data ->> 'cancel_url'::text)) stored,
    "client_reference_id" text generated always as ((_raw_data ->> 'client_reference_id'::text)) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "customer_email" text generated always as ((_raw_data ->> 'customer_email'::text)) stored,
    "line_items" jsonb generated always as ((_raw_data -> 'line_items'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "locale" text generated always as ((_raw_data ->> 'locale'::text)) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "mode" text generated always as ((_raw_data ->> 'mode'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "payment_intent" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'payment_intent'::text)) = 'object'::text) AND ((_raw_data -> 'payment_intent'::text) ? 'id'::text)) THEN ((_raw_data -> 'payment_intent'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'payment_intent'::text)
END) stored,
    "payment_method_types" jsonb generated always as ((_raw_data -> 'payment_method_types'::text)) stored,
    "setup_intent" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'setup_intent'::text)) = 'object'::text) AND ((_raw_data -> 'setup_intent'::text) ? 'id'::text)) THEN ((_raw_data -> 'setup_intent'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'setup_intent'::text)
END) stored,
    "shipping" jsonb generated always as ((_raw_data -> 'shipping'::text)) stored,
    "shipping_address_collection" jsonb generated always as ((_raw_data -> 'shipping_address_collection'::text)) stored,
    "submit_type" text generated always as ((_raw_data ->> 'submit_type'::text)) stored,
    "subscription" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'subscription'::text)) = 'object'::text) AND ((_raw_data -> 'subscription'::text) ? 'id'::text)) THEN ((_raw_data -> 'subscription'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'subscription'::text)
END) stored,
    "success_url" text generated always as ((_raw_data ->> 'success_url'::text)) stored,
    "total_details" jsonb generated always as ((_raw_data -> 'total_details'::text)) stored
      );



  create table "stripe"."coupons" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "amount_off" bigint generated always as ((NULLIF((_raw_data ->> 'amount_off'::text), ''::text))::bigint) stored,
    "applies_to" jsonb generated always as ((_raw_data -> 'applies_to'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "duration" text generated always as ((_raw_data ->> 'duration'::text)) stored,
    "duration_in_months" bigint generated always as ((NULLIF((_raw_data ->> 'duration_in_months'::text), ''::text))::bigint) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "max_redemptions" bigint generated always as ((NULLIF((_raw_data ->> 'max_redemptions'::text), ''::text))::bigint) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "name" text generated always as ((_raw_data ->> 'name'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "percent_off" numeric generated always as ((NULLIF((_raw_data ->> 'percent_off'::text), ''::text))::numeric) stored,
    "redeem_by" bigint generated always as ((NULLIF((_raw_data ->> 'redeem_by'::text), ''::text))::bigint) stored,
    "times_redeemed" bigint generated always as ((NULLIF((_raw_data ->> 'times_redeemed'::text), ''::text))::bigint) stored,
    "valid" boolean generated always as ((NULLIF((_raw_data ->> 'valid'::text), ''::text))::boolean) stored
      );



  create table "stripe"."credit_notes" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "amount" bigint generated always as ((NULLIF((_raw_data ->> 'amount'::text), ''::text))::bigint) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "customer_balance_transaction" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer_balance_transaction'::text)) = 'object'::text) AND ((_raw_data -> 'customer_balance_transaction'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer_balance_transaction'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer_balance_transaction'::text)
END) stored,
    "discount_amount" bigint generated always as ((NULLIF((_raw_data ->> 'discount_amount'::text), ''::text))::bigint) stored,
    "discount_amounts" jsonb generated always as ((_raw_data -> 'discount_amounts'::text)) stored,
    "invoice" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'invoice'::text)) = 'object'::text) AND ((_raw_data -> 'invoice'::text) ? 'id'::text)) THEN ((_raw_data -> 'invoice'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'invoice'::text)
END) stored,
    "lines" jsonb generated always as ((_raw_data -> 'lines'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "memo" text generated always as ((_raw_data ->> 'memo'::text)) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "number" text generated always as ((_raw_data ->> 'number'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "out_of_band_amount" bigint generated always as ((NULLIF((_raw_data ->> 'out_of_band_amount'::text), ''::text))::bigint) stored,
    "pdf" text generated always as ((_raw_data ->> 'pdf'::text)) stored,
    "reason" text generated always as ((_raw_data ->> 'reason'::text)) stored,
    "refund" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'refund'::text)) = 'object'::text) AND ((_raw_data -> 'refund'::text) ? 'id'::text)) THEN ((_raw_data -> 'refund'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'refund'::text)
END) stored,
    "status" text generated always as ((_raw_data ->> 'status'::text)) stored,
    "subtotal" bigint generated always as ((NULLIF((_raw_data ->> 'subtotal'::text), ''::text))::bigint) stored,
    "tax_amounts" jsonb generated always as ((_raw_data -> 'tax_amounts'::text)) stored,
    "total" bigint generated always as ((NULLIF((_raw_data ->> 'total'::text), ''::text))::bigint) stored,
    "type" text generated always as ((_raw_data ->> 'type'::text)) stored,
    "voided_at" bigint generated always as ((NULLIF((_raw_data ->> 'voided_at'::text), ''::text))::bigint) stored
      );



  create table "stripe"."customers" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "address" jsonb generated always as ((_raw_data -> 'address'::text)) stored,
    "balance" bigint generated always as ((NULLIF((_raw_data ->> 'balance'::text), ''::text))::bigint) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "default_source" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'default_source'::text)) = 'object'::text) AND ((_raw_data -> 'default_source'::text) ? 'id'::text)) THEN ((_raw_data -> 'default_source'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'default_source'::text)
END) stored,
    "deleted" boolean generated always as ((NULLIF((_raw_data ->> 'deleted'::text), ''::text))::boolean) stored,
    "delinquent" boolean generated always as ((NULLIF((_raw_data ->> 'delinquent'::text), ''::text))::boolean) stored,
    "description" text generated always as ((_raw_data ->> 'description'::text)) stored,
    "discount" jsonb generated always as ((_raw_data -> 'discount'::text)) stored,
    "email" text generated always as ((_raw_data ->> 'email'::text)) stored,
    "invoice_prefix" text generated always as ((_raw_data ->> 'invoice_prefix'::text)) stored,
    "invoice_settings" jsonb generated always as ((_raw_data -> 'invoice_settings'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "name" text generated always as ((_raw_data ->> 'name'::text)) stored,
    "next_invoice_sequence" bigint generated always as ((NULLIF((_raw_data ->> 'next_invoice_sequence'::text), ''::text))::bigint) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "phone" text generated always as ((_raw_data ->> 'phone'::text)) stored,
    "preferred_locales" jsonb generated always as ((_raw_data -> 'preferred_locales'::text)) stored,
    "shipping" jsonb generated always as ((_raw_data -> 'shipping'::text)) stored,
    "sources" jsonb generated always as ((_raw_data -> 'sources'::text)) stored,
    "subscriptions" jsonb generated always as ((_raw_data -> 'subscriptions'::text)) stored,
    "tax_exempt" text generated always as ((_raw_data ->> 'tax_exempt'::text)) stored,
    "tax_ids" jsonb generated always as ((_raw_data -> 'tax_ids'::text)) stored
      );



  create table "stripe"."disputes" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "amount" bigint generated always as ((NULLIF((_raw_data ->> 'amount'::text), ''::text))::bigint) stored,
    "balance_transactions" jsonb generated always as ((_raw_data -> 'balance_transactions'::text)) stored,
    "charge" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'charge'::text)) = 'object'::text) AND ((_raw_data -> 'charge'::text) ? 'id'::text)) THEN ((_raw_data -> 'charge'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'charge'::text)
END) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "evidence" jsonb generated always as ((_raw_data -> 'evidence'::text)) stored,
    "evidence_details" jsonb generated always as ((_raw_data -> 'evidence_details'::text)) stored,
    "is_charge_refundable" boolean generated always as ((NULLIF((_raw_data ->> 'is_charge_refundable'::text), ''::text))::boolean) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "payment_intent" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'payment_intent'::text)) = 'object'::text) AND ((_raw_data -> 'payment_intent'::text) ? 'id'::text)) THEN ((_raw_data -> 'payment_intent'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'payment_intent'::text)
END) stored,
    "reason" text generated always as ((_raw_data ->> 'reason'::text)) stored,
    "status" text generated always as ((_raw_data ->> 'status'::text)) stored
      );



  create table "stripe"."early_fraud_warnings" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "actionable" boolean generated always as ((NULLIF((_raw_data ->> 'actionable'::text), ''::text))::boolean) stored,
    "charge" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'charge'::text)) = 'object'::text) AND ((_raw_data -> 'charge'::text) ? 'id'::text)) THEN ((_raw_data -> 'charge'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'charge'::text)
END) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "fraud_type" text generated always as ((_raw_data ->> 'fraud_type'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "payment_intent" text generated always as ((_raw_data ->> 'payment_intent'::text)) stored
      );



  create table "stripe"."features" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "active" boolean generated always as ((NULLIF((_raw_data ->> 'active'::text), ''::text))::boolean) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "lookup_key" text generated always as ((_raw_data ->> 'lookup_key'::text)) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "name" text generated always as ((_raw_data ->> 'name'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored
      );



  create table "stripe"."invoices" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "account_country" text generated always as ((_raw_data ->> 'account_country'::text)) stored,
    "account_name" text generated always as ((_raw_data ->> 'account_name'::text)) stored,
    "amount_due" bigint generated always as ((NULLIF((_raw_data ->> 'amount_due'::text), ''::text))::bigint) stored,
    "amount_paid" bigint generated always as ((NULLIF((_raw_data ->> 'amount_paid'::text), ''::text))::bigint) stored,
    "amount_remaining" bigint generated always as ((NULLIF((_raw_data ->> 'amount_remaining'::text), ''::text))::bigint) stored,
    "application_fee_amount" bigint generated always as ((NULLIF((_raw_data ->> 'application_fee_amount'::text), ''::text))::bigint) stored,
    "attempt_count" bigint generated always as ((NULLIF((_raw_data ->> 'attempt_count'::text), ''::text))::bigint) stored,
    "attempted" boolean generated always as ((NULLIF((_raw_data ->> 'attempted'::text), ''::text))::boolean) stored,
    "auto_advance" boolean generated always as ((NULLIF((_raw_data ->> 'auto_advance'::text), ''::text))::boolean) stored,
    "billing_reason" text generated always as ((_raw_data ->> 'billing_reason'::text)) stored,
    "charge" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'charge'::text)) = 'object'::text) AND ((_raw_data -> 'charge'::text) ? 'id'::text)) THEN ((_raw_data -> 'charge'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'charge'::text)
END) stored,
    "collection_method" text generated always as ((_raw_data ->> 'collection_method'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "custom_fields" jsonb generated always as ((_raw_data -> 'custom_fields'::text)) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "customer_address" jsonb generated always as ((_raw_data -> 'customer_address'::text)) stored,
    "customer_email" text generated always as ((_raw_data ->> 'customer_email'::text)) stored,
    "customer_name" text generated always as ((_raw_data ->> 'customer_name'::text)) stored,
    "customer_phone" text generated always as ((_raw_data ->> 'customer_phone'::text)) stored,
    "customer_shipping" jsonb generated always as ((_raw_data -> 'customer_shipping'::text)) stored,
    "customer_tax_exempt" text generated always as ((_raw_data ->> 'customer_tax_exempt'::text)) stored,
    "customer_tax_ids" jsonb generated always as ((_raw_data -> 'customer_tax_ids'::text)) stored,
    "default_payment_method" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'default_payment_method'::text)) = 'object'::text) AND ((_raw_data -> 'default_payment_method'::text) ? 'id'::text)) THEN ((_raw_data -> 'default_payment_method'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'default_payment_method'::text)
END) stored,
    "default_source" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'default_source'::text)) = 'object'::text) AND ((_raw_data -> 'default_source'::text) ? 'id'::text)) THEN ((_raw_data -> 'default_source'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'default_source'::text)
END) stored,
    "default_tax_rates" jsonb generated always as ((_raw_data -> 'default_tax_rates'::text)) stored,
    "description" text generated always as ((_raw_data ->> 'description'::text)) stored,
    "discount" jsonb generated always as ((_raw_data -> 'discount'::text)) stored,
    "discounts" jsonb generated always as ((_raw_data -> 'discounts'::text)) stored,
    "due_date" bigint generated always as ((NULLIF((_raw_data ->> 'due_date'::text), ''::text))::bigint) stored,
    "ending_balance" bigint generated always as ((NULLIF((_raw_data ->> 'ending_balance'::text), ''::text))::bigint) stored,
    "footer" text generated always as ((_raw_data ->> 'footer'::text)) stored,
    "hosted_invoice_url" text generated always as ((_raw_data ->> 'hosted_invoice_url'::text)) stored,
    "invoice_pdf" text generated always as ((_raw_data ->> 'invoice_pdf'::text)) stored,
    "lines" jsonb generated always as ((_raw_data -> 'lines'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "next_payment_attempt" bigint generated always as ((NULLIF((_raw_data ->> 'next_payment_attempt'::text), ''::text))::bigint) stored,
    "number" text generated always as ((_raw_data ->> 'number'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "paid" boolean generated always as ((NULLIF((_raw_data ->> 'paid'::text), ''::text))::boolean) stored,
    "payment_intent" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'payment_intent'::text)) = 'object'::text) AND ((_raw_data -> 'payment_intent'::text) ? 'id'::text)) THEN ((_raw_data -> 'payment_intent'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'payment_intent'::text)
END) stored,
    "period_end" bigint generated always as ((NULLIF((_raw_data ->> 'period_end'::text), ''::text))::bigint) stored,
    "period_start" bigint generated always as ((NULLIF((_raw_data ->> 'period_start'::text), ''::text))::bigint) stored,
    "post_payment_credit_notes_amount" bigint generated always as ((NULLIF((_raw_data ->> 'post_payment_credit_notes_amount'::text), ''::text))::bigint) stored,
    "pre_payment_credit_notes_amount" bigint generated always as ((NULLIF((_raw_data ->> 'pre_payment_credit_notes_amount'::text), ''::text))::bigint) stored,
    "receipt_number" text generated always as ((_raw_data ->> 'receipt_number'::text)) stored,
    "starting_balance" bigint generated always as ((NULLIF((_raw_data ->> 'starting_balance'::text), ''::text))::bigint) stored,
    "statement_descriptor" text generated always as ((_raw_data ->> 'statement_descriptor'::text)) stored,
    "status" text generated always as ((_raw_data ->> 'status'::text)) stored,
    "status_transitions" jsonb generated always as ((_raw_data -> 'status_transitions'::text)) stored,
    "subscription" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'subscription'::text)) = 'object'::text) AND ((_raw_data -> 'subscription'::text) ? 'id'::text)) THEN ((_raw_data -> 'subscription'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'subscription'::text)
END) stored,
    "subscription_proration_date" bigint generated always as ((NULLIF((_raw_data ->> 'subscription_proration_date'::text), ''::text))::bigint) stored,
    "subtotal" bigint generated always as ((NULLIF((_raw_data ->> 'subtotal'::text), ''::text))::bigint) stored,
    "tax" bigint generated always as ((NULLIF((_raw_data ->> 'tax'::text), ''::text))::bigint) stored,
    "threshold_reason" jsonb generated always as ((_raw_data -> 'threshold_reason'::text)) stored,
    "total" bigint generated always as ((NULLIF((_raw_data ->> 'total'::text), ''::text))::bigint) stored,
    "total_discount_amounts" jsonb generated always as ((_raw_data -> 'total_discount_amounts'::text)) stored,
    "total_tax_amounts" jsonb generated always as ((_raw_data -> 'total_tax_amounts'::text)) stored,
    "transfer_data" jsonb generated always as ((_raw_data -> 'transfer_data'::text)) stored,
    "webhooks_delivered_at" bigint generated always as ((NULLIF((_raw_data ->> 'webhooks_delivered_at'::text), ''::text))::bigint) stored
      );



  create table "stripe"."payment_intents" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "amount" bigint generated always as ((NULLIF((_raw_data ->> 'amount'::text), ''::text))::bigint) stored,
    "amount_capturable" bigint generated always as ((NULLIF((_raw_data ->> 'amount_capturable'::text), ''::text))::bigint) stored,
    "amount_received" bigint generated always as ((NULLIF((_raw_data ->> 'amount_received'::text), ''::text))::bigint) stored,
    "application" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'application'::text)) = 'object'::text) AND ((_raw_data -> 'application'::text) ? 'id'::text)) THEN ((_raw_data -> 'application'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'application'::text)
END) stored,
    "application_fee_amount" bigint generated always as ((NULLIF((_raw_data ->> 'application_fee_amount'::text), ''::text))::bigint) stored,
    "canceled_at" bigint generated always as ((NULLIF((_raw_data ->> 'canceled_at'::text), ''::text))::bigint) stored,
    "cancellation_reason" text generated always as ((_raw_data ->> 'cancellation_reason'::text)) stored,
    "capture_method" text generated always as ((_raw_data ->> 'capture_method'::text)) stored,
    "charges" jsonb generated always as ((_raw_data -> 'charges'::text)) stored,
    "client_secret" text generated always as ((_raw_data ->> 'client_secret'::text)) stored,
    "confirmation_method" text generated always as ((_raw_data ->> 'confirmation_method'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "description" text generated always as ((_raw_data ->> 'description'::text)) stored,
    "invoice" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'invoice'::text)) = 'object'::text) AND ((_raw_data -> 'invoice'::text) ? 'id'::text)) THEN ((_raw_data -> 'invoice'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'invoice'::text)
END) stored,
    "last_payment_error" jsonb generated always as ((_raw_data -> 'last_payment_error'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "next_action" jsonb generated always as ((_raw_data -> 'next_action'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "on_behalf_of" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'on_behalf_of'::text)) = 'object'::text) AND ((_raw_data -> 'on_behalf_of'::text) ? 'id'::text)) THEN ((_raw_data -> 'on_behalf_of'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'on_behalf_of'::text)
END) stored,
    "payment_method" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'payment_method'::text)) = 'object'::text) AND ((_raw_data -> 'payment_method'::text) ? 'id'::text)) THEN ((_raw_data -> 'payment_method'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'payment_method'::text)
END) stored,
    "payment_method_options" jsonb generated always as ((_raw_data -> 'payment_method_options'::text)) stored,
    "payment_method_types" jsonb generated always as ((_raw_data -> 'payment_method_types'::text)) stored,
    "receipt_email" text generated always as ((_raw_data ->> 'receipt_email'::text)) stored,
    "review" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'review'::text)) = 'object'::text) AND ((_raw_data -> 'review'::text) ? 'id'::text)) THEN ((_raw_data -> 'review'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'review'::text)
END) stored,
    "setup_future_usage" text generated always as ((_raw_data ->> 'setup_future_usage'::text)) stored,
    "shipping" jsonb generated always as ((_raw_data -> 'shipping'::text)) stored,
    "statement_descriptor" text generated always as ((_raw_data ->> 'statement_descriptor'::text)) stored,
    "statement_descriptor_suffix" text generated always as ((_raw_data ->> 'statement_descriptor_suffix'::text)) stored,
    "status" text generated always as ((_raw_data ->> 'status'::text)) stored,
    "transfer_data" jsonb generated always as ((_raw_data -> 'transfer_data'::text)) stored,
    "transfer_group" text generated always as ((_raw_data ->> 'transfer_group'::text)) stored
      );



  create table "stripe"."payment_methods" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "alipay" jsonb generated always as ((_raw_data -> 'alipay'::text)) stored,
    "au_becs_debit" jsonb generated always as ((_raw_data -> 'au_becs_debit'::text)) stored,
    "bacs_debit" jsonb generated always as ((_raw_data -> 'bacs_debit'::text)) stored,
    "bancontact" jsonb generated always as ((_raw_data -> 'bancontact'::text)) stored,
    "billing_details" jsonb generated always as ((_raw_data -> 'billing_details'::text)) stored,
    "card" jsonb generated always as ((_raw_data -> 'card'::text)) stored,
    "card_present" jsonb generated always as ((_raw_data -> 'card_present'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "eps" jsonb generated always as ((_raw_data -> 'eps'::text)) stored,
    "fpx" jsonb generated always as ((_raw_data -> 'fpx'::text)) stored,
    "giropay" jsonb generated always as ((_raw_data -> 'giropay'::text)) stored,
    "ideal" jsonb generated always as ((_raw_data -> 'ideal'::text)) stored,
    "interac_present" jsonb generated always as ((_raw_data -> 'interac_present'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "p24" jsonb generated always as ((_raw_data -> 'p24'::text)) stored,
    "sepa_debit" jsonb generated always as ((_raw_data -> 'sepa_debit'::text)) stored,
    "type" text generated always as ((_raw_data ->> 'type'::text)) stored
      );



  create table "stripe"."plans" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "active" boolean generated always as ((NULLIF((_raw_data ->> 'active'::text), ''::text))::boolean) stored,
    "aggregate_usage" text generated always as ((_raw_data ->> 'aggregate_usage'::text)) stored,
    "amount" bigint generated always as ((NULLIF((_raw_data ->> 'amount'::text), ''::text))::bigint) stored,
    "amount_decimal" text generated always as ((_raw_data ->> 'amount_decimal'::text)) stored,
    "billing_scheme" text generated always as ((_raw_data ->> 'billing_scheme'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "interval" text generated always as ((_raw_data ->> 'interval'::text)) stored,
    "interval_count" bigint generated always as ((NULLIF((_raw_data ->> 'interval_count'::text), ''::text))::bigint) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "nickname" text generated always as ((_raw_data ->> 'nickname'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "product" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'product'::text)) = 'object'::text) AND ((_raw_data -> 'product'::text) ? 'id'::text)) THEN ((_raw_data -> 'product'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'product'::text)
END) stored,
    "tiers" jsonb generated always as ((_raw_data -> 'tiers'::text)) stored,
    "tiers_mode" text generated always as ((_raw_data ->> 'tiers_mode'::text)) stored,
    "transform_usage" jsonb generated always as ((_raw_data -> 'transform_usage'::text)) stored,
    "trial_period_days" bigint generated always as ((NULLIF((_raw_data ->> 'trial_period_days'::text), ''::text))::bigint) stored,
    "usage_type" text generated always as ((_raw_data ->> 'usage_type'::text)) stored
      );



  create table "stripe"."prices" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "active" boolean generated always as ((NULLIF((_raw_data ->> 'active'::text), ''::text))::boolean) stored,
    "billing_scheme" text generated always as ((_raw_data ->> 'billing_scheme'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "lookup_key" text generated always as ((_raw_data ->> 'lookup_key'::text)) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "nickname" text generated always as ((_raw_data ->> 'nickname'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "product" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'product'::text)) = 'object'::text) AND ((_raw_data -> 'product'::text) ? 'id'::text)) THEN ((_raw_data -> 'product'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'product'::text)
END) stored,
    "recurring" jsonb generated always as ((_raw_data -> 'recurring'::text)) stored,
    "tiers" jsonb generated always as ((_raw_data -> 'tiers'::text)) stored,
    "tiers_mode" text generated always as ((_raw_data ->> 'tiers_mode'::text)) stored,
    "transform_quantity" jsonb generated always as ((_raw_data -> 'transform_quantity'::text)) stored,
    "type" text generated always as ((_raw_data ->> 'type'::text)) stored,
    "unit_amount" bigint generated always as ((NULLIF((_raw_data ->> 'unit_amount'::text), ''::text))::bigint) stored,
    "unit_amount_decimal" text generated always as ((_raw_data ->> 'unit_amount_decimal'::text)) stored
      );



  create table "stripe"."products" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "active" boolean generated always as ((NULLIF((_raw_data ->> 'active'::text), ''::text))::boolean) stored,
    "attributes" jsonb generated always as ((_raw_data -> 'attributes'::text)) stored,
    "caption" text generated always as ((_raw_data ->> 'caption'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "deactivate_on" jsonb generated always as ((_raw_data -> 'deactivate_on'::text)) stored,
    "description" text generated always as ((_raw_data ->> 'description'::text)) stored,
    "images" jsonb generated always as ((_raw_data -> 'images'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "name" text generated always as ((_raw_data ->> 'name'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "package_dimensions" jsonb generated always as ((_raw_data -> 'package_dimensions'::text)) stored,
    "shippable" boolean generated always as ((NULLIF((_raw_data ->> 'shippable'::text), ''::text))::boolean) stored,
    "statement_descriptor" text generated always as ((_raw_data ->> 'statement_descriptor'::text)) stored,
    "type" text generated always as ((_raw_data ->> 'type'::text)) stored,
    "unit_label" text generated always as ((_raw_data ->> 'unit_label'::text)) stored,
    "updated" bigint generated always as ((NULLIF((_raw_data ->> 'updated'::text), ''::text))::bigint) stored,
    "url" text generated always as ((_raw_data ->> 'url'::text)) stored
      );



  create table "stripe"."refunds" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "amount" bigint generated always as ((NULLIF((_raw_data ->> 'amount'::text), ''::text))::bigint) stored,
    "balance_transaction" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'balance_transaction'::text)) = 'object'::text) AND ((_raw_data -> 'balance_transaction'::text) ? 'id'::text)) THEN ((_raw_data -> 'balance_transaction'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'balance_transaction'::text)
END) stored,
    "charge" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'charge'::text)) = 'object'::text) AND ((_raw_data -> 'charge'::text) ? 'id'::text)) THEN ((_raw_data -> 'charge'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'charge'::text)
END) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "currency" text generated always as ((_raw_data ->> 'currency'::text)) stored,
    "description" text generated always as ((_raw_data ->> 'description'::text)) stored,
    "failure_balance_transaction" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'failure_balance_transaction'::text)) = 'object'::text) AND ((_raw_data -> 'failure_balance_transaction'::text) ? 'id'::text)) THEN ((_raw_data -> 'failure_balance_transaction'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'failure_balance_transaction'::text)
END) stored,
    "failure_reason" text generated always as ((_raw_data ->> 'failure_reason'::text)) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "payment_intent" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'payment_intent'::text)) = 'object'::text) AND ((_raw_data -> 'payment_intent'::text) ? 'id'::text)) THEN ((_raw_data -> 'payment_intent'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'payment_intent'::text)
END) stored,
    "reason" text generated always as ((_raw_data ->> 'reason'::text)) stored,
    "receipt_number" text generated always as ((_raw_data ->> 'receipt_number'::text)) stored,
    "source_transfer_reversal" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'source_transfer_reversal'::text)) = 'object'::text) AND ((_raw_data -> 'source_transfer_reversal'::text) ? 'id'::text)) THEN ((_raw_data -> 'source_transfer_reversal'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'source_transfer_reversal'::text)
END) stored,
    "status" text generated always as ((_raw_data ->> 'status'::text)) stored,
    "transfer_reversal" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'transfer_reversal'::text)) = 'object'::text) AND ((_raw_data -> 'transfer_reversal'::text) ? 'id'::text)) THEN ((_raw_data -> 'transfer_reversal'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'transfer_reversal'::text)
END) stored
      );



  create table "stripe"."reviews" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "billing_zip" text generated always as ((_raw_data ->> 'billing_zip'::text)) stored,
    "charge" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'charge'::text)) = 'object'::text) AND ((_raw_data -> 'charge'::text) ? 'id'::text)) THEN ((_raw_data -> 'charge'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'charge'::text)
END) stored,
    "closed_reason" text generated always as ((_raw_data ->> 'closed_reason'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "ip_address" text generated always as ((_raw_data ->> 'ip_address'::text)) stored,
    "ip_address_location" jsonb generated always as ((_raw_data -> 'ip_address_location'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "open" boolean generated always as ((NULLIF((_raw_data ->> 'open'::text), ''::text))::boolean) stored,
    "opened_reason" text generated always as ((_raw_data ->> 'opened_reason'::text)) stored,
    "payment_intent" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'payment_intent'::text)) = 'object'::text) AND ((_raw_data -> 'payment_intent'::text) ? 'id'::text)) THEN ((_raw_data -> 'payment_intent'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'payment_intent'::text)
END) stored,
    "reason" text generated always as ((_raw_data ->> 'reason'::text)) stored,
    "session" jsonb generated always as ((_raw_data -> 'session'::text)) stored
      );



  create table "stripe"."setup_intents" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "application" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'application'::text)) = 'object'::text) AND ((_raw_data -> 'application'::text) ? 'id'::text)) THEN ((_raw_data -> 'application'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'application'::text)
END) stored,
    "cancellation_reason" text generated always as ((_raw_data ->> 'cancellation_reason'::text)) stored,
    "client_secret" text generated always as ((_raw_data ->> 'client_secret'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "description" text generated always as ((_raw_data ->> 'description'::text)) stored,
    "last_setup_error" jsonb generated always as ((_raw_data -> 'last_setup_error'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "mandate" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'mandate'::text)) = 'object'::text) AND ((_raw_data -> 'mandate'::text) ? 'id'::text)) THEN ((_raw_data -> 'mandate'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'mandate'::text)
END) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "next_action" jsonb generated always as ((_raw_data -> 'next_action'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "on_behalf_of" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'on_behalf_of'::text)) = 'object'::text) AND ((_raw_data -> 'on_behalf_of'::text) ? 'id'::text)) THEN ((_raw_data -> 'on_behalf_of'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'on_behalf_of'::text)
END) stored,
    "payment_method" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'payment_method'::text)) = 'object'::text) AND ((_raw_data -> 'payment_method'::text) ? 'id'::text)) THEN ((_raw_data -> 'payment_method'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'payment_method'::text)
END) stored,
    "payment_method_options" jsonb generated always as ((_raw_data -> 'payment_method_options'::text)) stored,
    "payment_method_types" jsonb generated always as ((_raw_data -> 'payment_method_types'::text)) stored,
    "single_use_mandate" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'single_use_mandate'::text)) = 'object'::text) AND ((_raw_data -> 'single_use_mandate'::text) ? 'id'::text)) THEN ((_raw_data -> 'single_use_mandate'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'single_use_mandate'::text)
END) stored,
    "status" text generated always as ((_raw_data ->> 'status'::text)) stored,
    "usage" text generated always as ((_raw_data ->> 'usage'::text)) stored
      );



  create table "stripe"."subscription_items" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "billing_thresholds" jsonb generated always as ((_raw_data -> 'billing_thresholds'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "deleted" boolean generated always as ((NULLIF((_raw_data ->> 'deleted'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "price" jsonb generated always as ((_raw_data -> 'price'::text)) stored,
    "quantity" bigint generated always as ((NULLIF((_raw_data ->> 'quantity'::text), ''::text))::bigint) stored,
    "subscription" text generated always as ((_raw_data ->> 'subscription'::text)) stored,
    "tax_rates" jsonb generated always as ((_raw_data -> 'tax_rates'::text)) stored
      );



  create table "stripe"."subscription_schedules" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "canceled_at" bigint generated always as ((NULLIF((_raw_data ->> 'canceled_at'::text), ''::text))::bigint) stored,
    "completed_at" bigint generated always as ((NULLIF((_raw_data ->> 'completed_at'::text), ''::text))::bigint) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "current_phase" jsonb generated always as ((_raw_data -> 'current_phase'::text)) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "default_settings" jsonb generated always as ((_raw_data -> 'default_settings'::text)) stored,
    "end_behavior" text generated always as ((_raw_data ->> 'end_behavior'::text)) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "phases" jsonb generated always as ((_raw_data -> 'phases'::text)) stored,
    "released_at" bigint generated always as ((NULLIF((_raw_data ->> 'released_at'::text), ''::text))::bigint) stored,
    "released_subscription" text generated always as ((_raw_data ->> 'released_subscription'::text)) stored,
    "status" text generated always as ((_raw_data ->> 'status'::text)) stored,
    "subscription" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'subscription'::text)) = 'object'::text) AND ((_raw_data -> 'subscription'::text) ? 'id'::text)) THEN ((_raw_data -> 'subscription'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'subscription'::text)
END) stored
      );



  create table "stripe"."subscriptions" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "application_fee_percent" numeric generated always as ((NULLIF((_raw_data ->> 'application_fee_percent'::text), ''::text))::numeric) stored,
    "billing_cycle_anchor" bigint generated always as ((NULLIF((_raw_data ->> 'billing_cycle_anchor'::text), ''::text))::bigint) stored,
    "billing_thresholds" jsonb generated always as ((_raw_data -> 'billing_thresholds'::text)) stored,
    "cancel_at" bigint generated always as ((NULLIF((_raw_data ->> 'cancel_at'::text), ''::text))::bigint) stored,
    "cancel_at_period_end" boolean generated always as ((NULLIF((_raw_data ->> 'cancel_at_period_end'::text), ''::text))::boolean) stored,
    "canceled_at" bigint generated always as ((NULLIF((_raw_data ->> 'canceled_at'::text), ''::text))::bigint) stored,
    "collection_method" text generated always as ((_raw_data ->> 'collection_method'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "current_period_end" bigint generated always as ((NULLIF((_raw_data ->> 'current_period_end'::text), ''::text))::bigint) stored,
    "current_period_start" bigint generated always as ((NULLIF((_raw_data ->> 'current_period_start'::text), ''::text))::bigint) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "days_until_due" bigint generated always as ((NULLIF((_raw_data ->> 'days_until_due'::text), ''::text))::bigint) stored,
    "default_payment_method" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'default_payment_method'::text)) = 'object'::text) AND ((_raw_data -> 'default_payment_method'::text) ? 'id'::text)) THEN ((_raw_data -> 'default_payment_method'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'default_payment_method'::text)
END) stored,
    "default_source" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'default_source'::text)) = 'object'::text) AND ((_raw_data -> 'default_source'::text) ? 'id'::text)) THEN ((_raw_data -> 'default_source'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'default_source'::text)
END) stored,
    "default_tax_rates" jsonb generated always as ((_raw_data -> 'default_tax_rates'::text)) stored,
    "discount" jsonb generated always as ((_raw_data -> 'discount'::text)) stored,
    "ended_at" bigint generated always as ((NULLIF((_raw_data ->> 'ended_at'::text), ''::text))::bigint) stored,
    "items" jsonb generated always as ((_raw_data -> 'items'::text)) stored,
    "latest_invoice" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'latest_invoice'::text)) = 'object'::text) AND ((_raw_data -> 'latest_invoice'::text) ? 'id'::text)) THEN ((_raw_data -> 'latest_invoice'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'latest_invoice'::text)
END) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "metadata" jsonb generated always as ((_raw_data -> 'metadata'::text)) stored,
    "next_pending_invoice_item_invoice" bigint generated always as ((NULLIF((_raw_data ->> 'next_pending_invoice_item_invoice'::text), ''::text))::bigint) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "pause_collection" jsonb generated always as ((_raw_data -> 'pause_collection'::text)) stored,
    "pending_invoice_item_interval" jsonb generated always as ((_raw_data -> 'pending_invoice_item_interval'::text)) stored,
    "pending_setup_intent" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'pending_setup_intent'::text)) = 'object'::text) AND ((_raw_data -> 'pending_setup_intent'::text) ? 'id'::text)) THEN ((_raw_data -> 'pending_setup_intent'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'pending_setup_intent'::text)
END) stored,
    "pending_update" jsonb generated always as ((_raw_data -> 'pending_update'::text)) stored,
    "quantity" bigint generated always as ((NULLIF((_raw_data ->> 'quantity'::text), ''::text))::bigint) stored,
    "schedule" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'schedule'::text)) = 'object'::text) AND ((_raw_data -> 'schedule'::text) ? 'id'::text)) THEN ((_raw_data -> 'schedule'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'schedule'::text)
END) stored,
    "start_date" bigint generated always as ((NULLIF((_raw_data ->> 'start_date'::text), ''::text))::bigint) stored,
    "status" text generated always as ((_raw_data ->> 'status'::text)) stored,
    "transfer_data" jsonb generated always as ((_raw_data -> 'transfer_data'::text)) stored,
    "trial_end" bigint generated always as ((NULLIF((_raw_data ->> 'trial_end'::text), ''::text))::bigint) stored,
    "trial_start" bigint generated always as ((NULLIF((_raw_data ->> 'trial_start'::text), ''::text))::bigint) stored
      );



  create table "stripe"."tax_ids" (
    "_raw_data" jsonb not null,
    "_last_synced_at" timestamp with time zone,
    "_updated_at" timestamp with time zone not null default now(),
    "_account_id" text not null,
    "id" text not null generated always as ((_raw_data ->> 'id'::text)) stored,
    "country" text generated always as ((_raw_data ->> 'country'::text)) stored,
    "created" bigint generated always as ((NULLIF((_raw_data ->> 'created'::text), ''::text))::bigint) stored,
    "customer" text generated always as (
CASE
    WHEN ((jsonb_typeof((_raw_data -> 'customer'::text)) = 'object'::text) AND ((_raw_data -> 'customer'::text) ? 'id'::text)) THEN ((_raw_data -> 'customer'::text) ->> 'id'::text)
    ELSE (_raw_data ->> 'customer'::text)
END) stored,
    "livemode" boolean generated always as ((NULLIF((_raw_data ->> 'livemode'::text), ''::text))::boolean) stored,
    "object" text generated always as ((_raw_data ->> 'object'::text)) stored,
    "type" text generated always as ((_raw_data ->> 'type'::text)) stored,
    "value" text generated always as ((_raw_data ->> 'value'::text)) stored,
    "verification" jsonb generated always as ((_raw_data -> 'verification'::text)) stored
      );


CREATE UNIQUE INDEX _managed_webhooks_pkey ON stripe._managed_webhooks USING btree (id);

CREATE UNIQUE INDEX _migrations_name_key ON stripe._migrations USING btree (name);

CREATE UNIQUE INDEX _migrations_pkey ON stripe._migrations USING btree (id);

CREATE UNIQUE INDEX _rate_limits_pkey ON stripe._rate_limits USING btree (key);

CREATE UNIQUE INDEX _sync_obj_runs_pkey ON stripe._sync_obj_runs USING btree (_account_id, run_started_at, object, created_gte, created_lte);

CREATE UNIQUE INDEX _sync_runs_pkey ON stripe._sync_runs USING btree (_account_id, started_at);

CREATE UNIQUE INDEX accounts_pkey ON stripe.accounts USING btree (id);

CREATE UNIQUE INDEX active_entitlements_pkey ON stripe.active_entitlements USING btree (id);

CREATE UNIQUE INDEX charges_pkey ON stripe.charges USING btree (id);

CREATE UNIQUE INDEX checkout_session_line_items_pkey ON stripe.checkout_session_line_items USING btree (id);

CREATE UNIQUE INDEX checkout_sessions_pkey ON stripe.checkout_sessions USING btree (id);

CREATE UNIQUE INDEX coupons_pkey ON stripe.coupons USING btree (id);

CREATE UNIQUE INDEX credit_notes_pkey ON stripe.credit_notes USING btree (id);

CREATE UNIQUE INDEX customers_pkey ON stripe.customers USING btree (id);

CREATE UNIQUE INDEX disputes_pkey ON stripe.disputes USING btree (id);

CREATE UNIQUE INDEX early_fraud_warnings_pkey ON stripe.early_fraud_warnings USING btree (id);

CREATE UNIQUE INDEX features_pkey ON stripe.features USING btree (id);

CREATE INDEX idx_accounts_api_key_hashes ON stripe.accounts USING gin (api_key_hashes);

CREATE INDEX idx_active_entitlements_account_id ON stripe.active_entitlements USING btree (_account_id);

CREATE INDEX idx_charges_account_id ON stripe.charges USING btree (_account_id);

CREATE INDEX idx_checkout_session_line_items_account_id ON stripe.checkout_session_line_items USING btree (_account_id);

CREATE INDEX idx_checkout_sessions_account_id ON stripe.checkout_sessions USING btree (_account_id);

CREATE INDEX idx_coupons_account_id ON stripe.coupons USING btree (_account_id);

CREATE INDEX idx_credit_notes_account_id ON stripe.credit_notes USING btree (_account_id);

CREATE INDEX idx_customers_account_id ON stripe.customers USING btree (_account_id);

CREATE INDEX idx_disputes_account_id ON stripe.disputes USING btree (_account_id);

CREATE INDEX idx_early_fraud_warnings_account_id ON stripe.early_fraud_warnings USING btree (_account_id);

CREATE INDEX idx_features_account_id ON stripe.features USING btree (_account_id);

CREATE INDEX idx_invoices_account_id ON stripe.invoices USING btree (_account_id);

CREATE INDEX idx_managed_webhooks_enabled ON stripe._managed_webhooks USING btree (enabled);

CREATE INDEX idx_managed_webhooks_status ON stripe._managed_webhooks USING btree (status);

CREATE INDEX idx_payment_intents_account_id ON stripe.payment_intents USING btree (_account_id);

CREATE INDEX idx_payment_methods_account_id ON stripe.payment_methods USING btree (_account_id);

CREATE INDEX idx_plans_account_id ON stripe.plans USING btree (_account_id);

CREATE INDEX idx_prices_account_id ON stripe.prices USING btree (_account_id);

CREATE INDEX idx_products_account_id ON stripe.products USING btree (_account_id);

CREATE INDEX idx_refunds_account_id ON stripe.refunds USING btree (_account_id);

CREATE INDEX idx_reviews_account_id ON stripe.reviews USING btree (_account_id);

CREATE INDEX idx_setup_intents_account_id ON stripe.setup_intents USING btree (_account_id);

CREATE INDEX idx_subscription_items_account_id ON stripe.subscription_items USING btree (_account_id);

CREATE INDEX idx_subscription_schedules_account_id ON stripe.subscription_schedules USING btree (_account_id);

CREATE INDEX idx_subscriptions_account_id ON stripe.subscriptions USING btree (_account_id);

CREATE INDEX idx_sync_obj_runs_priority ON stripe._sync_obj_runs USING btree (_account_id, run_started_at, status, priority);

CREATE INDEX idx_sync_obj_runs_status ON stripe._sync_obj_runs USING btree (_account_id, run_started_at, status);

CREATE INDEX idx_sync_runs_account_status ON stripe._sync_runs USING btree (_account_id, closed_at);

CREATE INDEX idx_tax_ids_account_id ON stripe.tax_ids USING btree (_account_id);

CREATE UNIQUE INDEX invoices_pkey ON stripe.invoices USING btree (id);

CREATE UNIQUE INDEX managed_webhooks_url_account_unique ON stripe._managed_webhooks USING btree (url, account_id);

select 1; 
-- CREATE INDEX one_active_run_per_account_triggered_by ON stripe._sync_runs USING btree (_account_id, COALESCE(triggered_by, 'default'::text)) WHERE (closed_at IS NULL);

CREATE UNIQUE INDEX payment_intents_pkey ON stripe.payment_intents USING btree (id);

CREATE UNIQUE INDEX payment_methods_pkey ON stripe.payment_methods USING btree (id);

CREATE UNIQUE INDEX plans_pkey ON stripe.plans USING btree (id);

CREATE UNIQUE INDEX prices_pkey ON stripe.prices USING btree (id);

CREATE UNIQUE INDEX products_pkey ON stripe.products USING btree (id);

CREATE UNIQUE INDEX refunds_pkey ON stripe.refunds USING btree (id);

CREATE UNIQUE INDEX reviews_pkey ON stripe.reviews USING btree (id);

CREATE UNIQUE INDEX setup_intents_pkey ON stripe.setup_intents USING btree (id);

CREATE UNIQUE INDEX subscription_items_pkey ON stripe.subscription_items USING btree (id);

CREATE UNIQUE INDEX subscription_schedules_pkey ON stripe.subscription_schedules USING btree (id);

CREATE UNIQUE INDEX subscriptions_pkey ON stripe.subscriptions USING btree (id);

CREATE UNIQUE INDEX tax_ids_pkey ON stripe.tax_ids USING btree (id);

alter table "stripe"."_managed_webhooks" add constraint "_managed_webhooks_pkey" PRIMARY KEY using index "_managed_webhooks_pkey";

alter table "stripe"."_migrations" add constraint "_migrations_pkey" PRIMARY KEY using index "_migrations_pkey";

alter table "stripe"."_rate_limits" add constraint "_rate_limits_pkey" PRIMARY KEY using index "_rate_limits_pkey";

alter table "stripe"."_sync_obj_runs" add constraint "_sync_obj_runs_pkey" PRIMARY KEY using index "_sync_obj_runs_pkey";

alter table "stripe"."_sync_runs" add constraint "_sync_runs_pkey" PRIMARY KEY using index "_sync_runs_pkey";

alter table "stripe"."accounts" add constraint "accounts_pkey" PRIMARY KEY using index "accounts_pkey";

alter table "stripe"."active_entitlements" add constraint "active_entitlements_pkey" PRIMARY KEY using index "active_entitlements_pkey";

alter table "stripe"."charges" add constraint "charges_pkey" PRIMARY KEY using index "charges_pkey";

alter table "stripe"."checkout_session_line_items" add constraint "checkout_session_line_items_pkey" PRIMARY KEY using index "checkout_session_line_items_pkey";

alter table "stripe"."checkout_sessions" add constraint "checkout_sessions_pkey" PRIMARY KEY using index "checkout_sessions_pkey";

alter table "stripe"."coupons" add constraint "coupons_pkey" PRIMARY KEY using index "coupons_pkey";

alter table "stripe"."credit_notes" add constraint "credit_notes_pkey" PRIMARY KEY using index "credit_notes_pkey";

alter table "stripe"."customers" add constraint "customers_pkey" PRIMARY KEY using index "customers_pkey";

alter table "stripe"."disputes" add constraint "disputes_pkey" PRIMARY KEY using index "disputes_pkey";

alter table "stripe"."early_fraud_warnings" add constraint "early_fraud_warnings_pkey" PRIMARY KEY using index "early_fraud_warnings_pkey";

alter table "stripe"."features" add constraint "features_pkey" PRIMARY KEY using index "features_pkey";

alter table "stripe"."invoices" add constraint "invoices_pkey" PRIMARY KEY using index "invoices_pkey";

alter table "stripe"."payment_intents" add constraint "payment_intents_pkey" PRIMARY KEY using index "payment_intents_pkey";

alter table "stripe"."payment_methods" add constraint "payment_methods_pkey" PRIMARY KEY using index "payment_methods_pkey";

alter table "stripe"."plans" add constraint "plans_pkey" PRIMARY KEY using index "plans_pkey";

alter table "stripe"."prices" add constraint "prices_pkey" PRIMARY KEY using index "prices_pkey";

alter table "stripe"."products" add constraint "products_pkey" PRIMARY KEY using index "products_pkey";

alter table "stripe"."refunds" add constraint "refunds_pkey" PRIMARY KEY using index "refunds_pkey";

alter table "stripe"."reviews" add constraint "reviews_pkey" PRIMARY KEY using index "reviews_pkey";

alter table "stripe"."setup_intents" add constraint "setup_intents_pkey" PRIMARY KEY using index "setup_intents_pkey";

alter table "stripe"."subscription_items" add constraint "subscription_items_pkey" PRIMARY KEY using index "subscription_items_pkey";

alter table "stripe"."subscription_schedules" add constraint "subscription_schedules_pkey" PRIMARY KEY using index "subscription_schedules_pkey";

alter table "stripe"."subscriptions" add constraint "subscriptions_pkey" PRIMARY KEY using index "subscriptions_pkey";

alter table "stripe"."tax_ids" add constraint "tax_ids_pkey" PRIMARY KEY using index "tax_ids_pkey";

alter table "stripe"."_managed_webhooks" add constraint "fk_managed_webhooks_account" FOREIGN KEY (account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."_managed_webhooks" validate constraint "fk_managed_webhooks_account";

alter table "stripe"."_managed_webhooks" add constraint "managed_webhooks_url_account_unique" UNIQUE using index "managed_webhooks_url_account_unique";

alter table "stripe"."_migrations" add constraint "_migrations_name_key" UNIQUE using index "_migrations_name_key";

alter table "stripe"."_sync_obj_runs" add constraint "_sync_obj_runs_status_check" CHECK ((status = ANY (ARRAY['pending'::text, 'running'::text, 'complete'::text, 'error'::text]))) not valid;

alter table "stripe"."_sync_obj_runs" validate constraint "_sync_obj_runs_status_check";

alter table "stripe"."_sync_obj_runs" add constraint "fk_sync_obj_runs_parent" FOREIGN KEY (_account_id, run_started_at) REFERENCES stripe._sync_runs(_account_id, started_at) not valid;

alter table "stripe"."_sync_obj_runs" validate constraint "fk_sync_obj_runs_parent";

alter table "stripe"."_sync_runs" add constraint "fk_sync_runs_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."_sync_runs" validate constraint "fk_sync_runs_account";

alter table "stripe"."_sync_runs" add constraint "one_active_run_per_account_triggered_by" EXCLUDE USING btree (_account_id WITH =, COALESCE(triggered_by, 'default'::text) WITH =) WHERE ((closed_at IS NULL));

alter table "stripe"."active_entitlements" add constraint "fk_active_entitlements_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."active_entitlements" validate constraint "fk_active_entitlements_account";

alter table "stripe"."charges" add constraint "fk_charges_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."charges" validate constraint "fk_charges_account";

alter table "stripe"."checkout_session_line_items" add constraint "fk_checkout_session_line_items_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."checkout_session_line_items" validate constraint "fk_checkout_session_line_items_account";

alter table "stripe"."checkout_sessions" add constraint "fk_checkout_sessions_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."checkout_sessions" validate constraint "fk_checkout_sessions_account";

alter table "stripe"."coupons" add constraint "fk_coupons_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."coupons" validate constraint "fk_coupons_account";

alter table "stripe"."credit_notes" add constraint "fk_credit_notes_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."credit_notes" validate constraint "fk_credit_notes_account";

alter table "stripe"."customers" add constraint "fk_customers_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."customers" validate constraint "fk_customers_account";

alter table "stripe"."disputes" add constraint "fk_disputes_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."disputes" validate constraint "fk_disputes_account";

alter table "stripe"."early_fraud_warnings" add constraint "fk_early_fraud_warnings_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."early_fraud_warnings" validate constraint "fk_early_fraud_warnings_account";

alter table "stripe"."features" add constraint "fk_features_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."features" validate constraint "fk_features_account";

alter table "stripe"."invoices" add constraint "fk_invoices_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."invoices" validate constraint "fk_invoices_account";

alter table "stripe"."payment_intents" add constraint "fk_payment_intents_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."payment_intents" validate constraint "fk_payment_intents_account";

alter table "stripe"."payment_methods" add constraint "fk_payment_methods_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."payment_methods" validate constraint "fk_payment_methods_account";

alter table "stripe"."plans" add constraint "fk_plans_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."plans" validate constraint "fk_plans_account";

alter table "stripe"."prices" add constraint "fk_prices_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."prices" validate constraint "fk_prices_account";

alter table "stripe"."products" add constraint "fk_products_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."products" validate constraint "fk_products_account";

alter table "stripe"."refunds" add constraint "fk_refunds_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."refunds" validate constraint "fk_refunds_account";

alter table "stripe"."reviews" add constraint "fk_reviews_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."reviews" validate constraint "fk_reviews_account";

alter table "stripe"."setup_intents" add constraint "fk_setup_intents_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."setup_intents" validate constraint "fk_setup_intents_account";

alter table "stripe"."subscription_items" add constraint "fk_subscription_items_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."subscription_items" validate constraint "fk_subscription_items_account";

alter table "stripe"."subscription_schedules" add constraint "fk_subscription_schedules_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."subscription_schedules" validate constraint "fk_subscription_schedules_account";

alter table "stripe"."subscriptions" add constraint "fk_subscriptions_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."subscriptions" validate constraint "fk_subscriptions_account";

alter table "stripe"."tax_ids" add constraint "fk_tax_ids_account" FOREIGN KEY (_account_id) REFERENCES stripe.accounts(id) not valid;

alter table "stripe"."tax_ids" validate constraint "fk_tax_ids_account";

set check_function_bodies = off;

CREATE OR REPLACE FUNCTION stripe.check_rate_limit(rate_key text, max_requests integer, window_seconds integer)
 RETURNS void
 LANGUAGE plpgsql
AS $function$
DECLARE
  now TIMESTAMPTZ := clock_timestamp();
  window_length INTERVAL := make_interval(secs => window_seconds);
  current_count INTEGER;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext(rate_key));

  INSERT INTO "stripe"."_rate_limits" (key, count, window_start)
  VALUES (rate_key, 1, now)
  ON CONFLICT (key) DO UPDATE
  SET count = CASE
                WHEN "_rate_limits".window_start + window_length <= now
                  THEN 1
                  ELSE "_rate_limits".count + 1
              END,
      window_start = CASE
                       WHEN "_rate_limits".window_start + window_length <= now
                         THEN now
                         ELSE "_rate_limits".window_start
                     END;

  SELECT count INTO current_count FROM "stripe"."_rate_limits" WHERE key = rate_key;

  IF current_count > max_requests THEN
    RAISE EXCEPTION 'Rate limit exceeded for %', rate_key;
  END IF;
END;
$function$
;

CREATE OR REPLACE FUNCTION stripe.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  -- Support both legacy "updated_at" and newer "_updated_at" columns.
  -- jsonb_populate_record silently ignores keys that are not present on NEW.
  NEW := jsonb_populate_record(
    NEW,
    jsonb_build_object(
      'updated_at', now(),
      '_updated_at', now()
    )
  );
  RETURN NEW;
END;
$function$
;

CREATE OR REPLACE FUNCTION stripe.set_updated_at_metadata()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$
;

create or replace view "stripe"."sync_obj_progress" as  SELECT _account_id AS account_id,
    run_started_at,
    object,
    round(((100.0 * (count(*) FILTER (WHERE (status = 'complete'::text)))::numeric) / (NULLIF(count(*), 0))::numeric), 1) AS pct_complete,
    COALESCE(sum(processed_count), (0)::bigint) AS processed
   FROM stripe._sync_obj_runs r
  WHERE (run_started_at = ( SELECT max(s.started_at) AS max
           FROM stripe._sync_runs s
          WHERE (s._account_id = r._account_id)))
  GROUP BY _account_id, run_started_at, object;


create or replace view "stripe"."sync_runs" as  SELECT r._account_id AS account_id,
    r.started_at,
    r.closed_at,
    r.triggered_by,
    r.max_concurrent,
    COALESCE(sum(o.processed_count), (0)::bigint) AS total_processed,
    count(o.*) AS total_objects,
    count(*) FILTER (WHERE (o.status = 'complete'::text)) AS complete_count,
    count(*) FILTER (WHERE (o.status = 'error'::text)) AS error_count,
    count(*) FILTER (WHERE (o.status = 'running'::text)) AS running_count,
    count(*) FILTER (WHERE (o.status = 'pending'::text)) AS pending_count,
    string_agg(o.error_message, '; '::text) FILTER (WHERE (o.error_message IS NOT NULL)) AS error_message,
        CASE
            WHEN ((r.closed_at IS NULL) AND (count(*) FILTER (WHERE (o.status = 'running'::text)) > 0)) THEN 'running'::text
            WHEN ((r.closed_at IS NULL) AND ((count(o.*) = 0) OR (count(o.*) = count(*) FILTER (WHERE (o.status = 'pending'::text))))) THEN 'pending'::text
            WHEN (r.closed_at IS NULL) THEN 'running'::text
            WHEN (count(*) FILTER (WHERE (o.status = 'error'::text)) > 0) THEN 'error'::text
            ELSE 'complete'::text
        END AS status
   FROM (stripe._sync_runs r
     LEFT JOIN stripe._sync_obj_runs o ON (((o._account_id = r._account_id) AND (o.run_started_at = r.started_at))))
  GROUP BY r._account_id, r.started_at, r.closed_at, r.triggered_by, r.max_concurrent;


CREATE OR REPLACE FUNCTION public.increment_loyalty_points(p_user_id uuid, p_points integer, p_order_id uuid DEFAULT NULL::uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.loyalty_accounts (user_id, points_balance, lifetime_points)
  VALUES (p_user_id, p_points, p_points)
  ON CONFLICT (user_id) DO UPDATE SET
    points_balance  = loyalty_accounts.points_balance + p_points,
    lifetime_points = loyalty_accounts.lifetime_points + p_points,
    updated_at      = now();

  INSERT INTO public.loyalty_transactions (user_id, points, type, description, order_id)
  VALUES (p_user_id, p_points, 'earned_purchase',
          'Earned ' || p_points || ' Pour Points', p_order_id);
END;
$function$
;

CREATE OR REPLACE FUNCTION public.set_updated_at()
 RETURNS trigger
 LANGUAGE plpgsql
AS $function$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$function$
;


  create policy "cart_items delete own"
  on "public"."cart_items"
  as permissive
  for delete
  to public
using ((((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR ((auth.uid() IS NULL) AND (session_id IS NOT NULL))));



  create policy "cart_items insert own"
  on "public"."cart_items"
  as permissive
  for insert
  to public
with check ((((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR ((auth.uid() IS NULL) AND (session_id IS NOT NULL) AND (user_id IS NULL))));



  create policy "cart_items select own"
  on "public"."cart_items"
  as permissive
  for select
  to public
using ((((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR ((auth.uid() IS NULL) AND (session_id IS NOT NULL))));



  create policy "cart_items update own"
  on "public"."cart_items"
  as permissive
  for update
  to public
using ((((auth.uid() IS NOT NULL) AND (user_id = auth.uid())) OR ((auth.uid() IS NULL) AND (session_id IS NOT NULL))));



  create policy "order_items select own"
  on "public"."order_items"
  as permissive
  for select
  to public
using ((EXISTS ( SELECT 1
   FROM public.orders o
  WHERE ((o.id = order_items.order_id) AND (o.user_id = auth.uid())))));



  create policy "orders select own"
  on "public"."orders"
  as permissive
  for select
  to public
using (((auth.uid() IS NOT NULL) AND (user_id = auth.uid())));



  create policy "products readable by anyone"
  on "public"."products"
  as permissive
  for select
  to public
using ((is_active = true));



  create policy "custom_requests insert anon"
  on "public"."custom_requests"
  as permissive
  for insert
  to public
with check (true);



  create policy "profiles update own non-admin fields"
  on "public"."profiles"
  as permissive
  for update
  to public
using ((auth.uid() = id))
with check (((auth.uid() = id) AND (is_admin = public.is_admin(auth.uid()))));


CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._managed_webhooks FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at_metadata();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._sync_obj_runs FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at_metadata();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe._sync_runs FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at_metadata();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.accounts FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.active_entitlements FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.charges FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.checkout_session_line_items FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.checkout_sessions FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.coupons FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.credit_notes FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.customers FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.disputes FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.early_fraud_warnings FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.features FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.invoices FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.payment_intents FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.payment_methods FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.plans FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.prices FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.products FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.refunds FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.reviews FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.setup_intents FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.subscription_items FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.subscription_schedules FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.subscriptions FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();

CREATE TRIGGER handle_updated_at BEFORE UPDATE ON stripe.tax_ids FOR EACH ROW EXECUTE FUNCTION stripe.set_updated_at();


  create policy "products_bucket_admin_delete"
  on "storage"."objects"
  as permissive
  for delete
  to public
using (((bucket_id = 'products'::text) AND public.is_admin(auth.uid())));



  create policy "products_bucket_admin_insert"
  on "storage"."objects"
  as permissive
  for insert
  to public
with check (((bucket_id = 'products'::text) AND public.is_admin(auth.uid())));



  create policy "products_bucket_admin_update"
  on "storage"."objects"
  as permissive
  for update
  to public
using (((bucket_id = 'products'::text) AND public.is_admin(auth.uid())));



  create policy "products_bucket_public_read"
  on "storage"."objects"
  as permissive
  for select
  to public
using ((bucket_id = 'products'::text));



