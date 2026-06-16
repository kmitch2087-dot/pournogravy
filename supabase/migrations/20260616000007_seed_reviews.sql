-- Seed 3 approved mock reviews with bartender voices.
-- product_slug values match static product IDs from src/data/products.ts.
insert into public.product_reviews (reviewer_name, product_slug, rating, body, is_approved, created_at)
values
  (
    'DoubleShift_Dan',
    'well-it-ain-t-gonna-lick-itself-tee',
    5,
    $b1$Wore this on a Saturday night and three people asked where I got it before I even finished setting up my station. One of them was a Karen. She did NOT appreciate it. Five stars.$b1$,
    true,
    now() - interval '12 days'
  ),
  (
    'LastCall_Lena',
    'last-call-for-karen-tee',
    5,
    $b2$This shirt is therapy. Cheaper than therapy. Ordered a second one for my coworker who hasn't said a single nice thing to a FOH manager in six years. She cried. In a good way.$b2$,
    true,
    now() - interval '7 days'
  ),
  (
    'FlairFrank_84',
    'the-finger-tee',
    4,
    $b3$Quality is solid, sizing is true, and my manager asked me to "reconsider" wearing it on the floor. I considered it for about three seconds. Still wearing it. Dock me if you want.$b3$,
    true,
    now() - interval '2 days'
  )
on conflict (id) do nothing;
