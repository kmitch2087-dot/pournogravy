select cron.schedule(
  'check-double-points',
  '*/5 * * * *',
  $$
    update public.loyalty_rules
    set double_points_active = (
      double_points_start is not null and
      double_points_end is not null and
      now() between double_points_start and double_points_end
    )
    where id = 1;
  $$
);
