-- Admin email inbox
create table if not exists public.inbox_messages (
  id          uuid        primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  from_email  text        not null,
  from_name   text,
  subject     text        not null default '(no subject)',
  body_text   text,
  body_html   text,
  message_id  text        unique,          -- email Message-ID header for dedup
  in_reply_to text,                        -- email In-Reply-To header for threading
  thread_id   uuid,                        -- groups all messages in a thread
  parent_id   uuid        references public.inbox_messages(id),
  kind        text        not null default 'inbound'
              check (kind in ('inbound', 'reply')),
  status      text        not null default 'unread'
              check (status in ('unread', 'read', 'replied'))
);

create index if not exists inbox_messages_created_at_idx  on public.inbox_messages (created_at desc);
create index if not exists inbox_messages_thread_id_idx   on public.inbox_messages (thread_id);
create index if not exists inbox_messages_unread_idx      on public.inbox_messages (status) where status = 'unread';

alter table public.inbox_messages enable row level security;

-- Admins can do everything; service-role key (used by edge functions) bypasses RLS
create policy "Admins can manage inbox"
  on public.inbox_messages for all
  using  (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true))
  with check (exists (select 1 from public.profiles where id = auth.uid() and is_admin = true));
