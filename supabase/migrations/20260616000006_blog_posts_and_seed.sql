-- blog_posts already exists on remote; CREATE IF NOT EXISTS is a no-op.
create table if not exists public.blog_posts (
  id                 uuid primary key default gen_random_uuid(),
  title              text not null,
  slug               text not null unique,
  excerpt            text,
  content            text,
  featured_image_url text,
  tags               text[] default '{}',
  published          boolean default false,
  published_at       timestamptz,
  created_by         uuid references auth.users(id) on delete set null,
  created_at         timestamptz default now(),
  updated_at         timestamptz default now()
);

alter table public.blog_posts enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
     where schemaname = 'public'
       and tablename  = 'blog_posts'
       and policyname = 'blog_posts public select published'
  ) then
    execute $p$
      create policy "blog_posts public select published"
        on public.blog_posts for select
        using (published = true)
    $p$;
  end if;
end $$;

insert into public.blog_posts (title, slug, excerpt, content, tags, published, published_at)
values
  (
    $t1$How to Build a Killer Well Program Without Going Broke$t1$,
    'killer-well-program-without-going-broke',
    $e1$Your well is the loudest thing behind the bar and the first thing guests judge you on. Here's how to stop letting it embarrass you and start letting it pay you.$e1$,
    $c1$If your well program is whatever the distributor rep convinced your GM to buy last March, you're printing money for someone who doesn't tip.

Start with your most-ordered categories: vodka, rum, tequila. Pick things that don't taste like regret but still hit the right cost percentage. Negotiate. Make your rep earn it.

Your well program is a handshake. Make it a firm one.$c1$,
    array['bar-life', 'tips', 'business'],
    true,
    now() - interval '5 days'
  ),
  (
    $t2$5 Shots That Actually Sell Themselves (And One That Definitely Does Not)$t2$,
    'shots-that-sell-themselves',
    $e2$Some shots walk up and introduce themselves. Others make you want to apologize to the guest on their way out. Here's the list nobody put in your training manual.$e2$,
    $c2$There are shots that work. Tequila Sunrise, Fireball, Jager Bomb, Lemon Drop, Paloma Shot. These sell themselves.

And then there is one on your menu that requires 6 ingredients, a muddler, and a prayer. Takes 4 minutes and sells for $9. Kill it. Replace it with literally anything.$c2$,
    array['bar-life', 'drinks', 'humor'],
    true,
    now() - interval '3 days'
  ),
  (
    $t3$Closing Time Survival Guide: What to Wear When Your Shift Goes Sideways$t3$,
    'closing-time-survival-guide',
    $e3$The last 45 minutes of a closing shift will reveal your true character. Dress accordingly.$e3$,
    $c3$It's 1:47 AM. Thirteen minutes until last call. Three tables just ordered rounds. The ice bin is at 30%.

The closing shift separates two kinds of bartenders: the ones who wore something they'd be embarrassed in, and the ones who wore something that says "I showed up to work, not to survive."

Pournogravy exists for the second group. Own it.$c3$,
    array['gear', 'bar-life', 'tips'],
    true,
    now()
  )
on conflict (slug) do nothing;
