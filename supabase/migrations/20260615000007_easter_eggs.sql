create table if not exists public.product_easter_eggs (
  id        uuid primary key default gen_random_uuid(),
  category  text not null check (category in ('table_name','server_name','special_instruction','footer_note')),
  text      text not null,
  active    boolean not null default true,
  created_at timestamptz not null default now()
);

alter table public.product_easter_eggs enable row level security;
create policy "Public read active eggs" on public.product_easter_eggs for select using (active = true);
create policy "Admin full access" on public.product_easter_eggs for all using (
  exists (select 1 from public.profiles where id = auth.uid() and is_admin = true)
);

-- Seed
insert into public.product_easter_eggs (category, text) values
  ('table_name', '69'),
  ('table_name', 'Pool Bathroom'),
  ('table_name', 'THAT Guy Again'),
  ('table_name', 'The Needy End'),
  ('table_name', 'Last Call Corner'),
  ('table_name', 'The Karen Section'),
  ('table_name', 'VIP (lol)'),
  ('table_name', 'Industry Night Purgatory'),
  ('table_name', 'Where Tips Go To Die'),
  ('table_name', 'Back Bar Exile'),
  ('table_name', 'Divorce Party Table'),
  ('table_name', 'He Said One More'),
  ('server_name', 'Some Poor Bastard'),
  ('server_name', 'Opie (Send Help)'),
  ('server_name', 'Whoever Drew Short Straw'),
  ('server_name', 'Your Problem Now'),
  ('server_name', 'The One Who Still Cares'),
  ('server_name', 'Not Sober Enough For This'),
  ('server_name', 'Last One Standing'),
  ('server_name', 'Definitely Not Getting Tipped'),
  ('server_name', 'Has Seen Things'),
  ('server_name', 'Emotionally Unavailable'),
  ('special_instruction', 'No substitutions. I mean it.'),
  ('special_instruction', 'Extra needy, apparently.'),
  ('special_instruction', 'Allergic to tipping well.'),
  ('special_instruction', 'Has opinions about ice. Many opinions.'),
  ('special_instruction', 'Will ask for manager. Will tip 10%.'),
  ('special_instruction', 'Ordered the well, asked for top shelf.'),
  ('special_instruction', 'Said surprise me then complained.'),
  ('special_instruction', 'Third time tonight. God help us.'),
  ('special_instruction', 'Decaf. At a bar. In 2026.'),
  ('special_instruction', 'Asked if we have oat milk. We do not.'),
  ('special_instruction', 'Waved at me from 40 feet away.'),
  ('special_instruction', 'This is their cheat day, apparently.'),
  ('footer_note', 'Management not responsible for decisions made after shot #4.'),
  ('footer_note', 'Tip your bartender or we will remember your face.'),
  ('footer_note', 'No, we cannot make it a little stronger.'),
  ('footer_note', 'If you clap to get attention, you are the problem.'),
  ('footer_note', 'Gluten-free beer is still your fault.'),
  ('footer_note', 'Last call was 20 minutes ago. Time is a flat circle. Go home.'),
  ('footer_note', 'We do not have a secret menu. Stop asking.'),
  ('footer_note', 'The WiFi password is: order something.'),
  ('footer_note', 'Cash tips go directly to Opie''s therapy fund.'),
  ('footer_note', 'Not responsible for anything you text your ex tonight.'),
  ('footer_note', 'Splitting a check 11 ways is a hate crime.'),
  ('footer_note', 'If you just want water, the sink is in the back.');
