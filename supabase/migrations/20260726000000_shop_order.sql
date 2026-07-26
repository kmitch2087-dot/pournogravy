-- Shop ordering: dedicated shop_order column (unique per row).
--
-- Why: products.display_order was doing double duty as (a) shop position and
-- (b) within-group variant order (0=primary). It was also 0 on most rows, so
-- ORDER BY display_order tied and Postgres returned a non-deterministic order —
-- the shop reshuffled every load and the admin never matched live.
--
-- shop_order is the sole driver of shop position, unique per row (id is the
-- mandatory tie-break in every read path). display_order is left untouched and
-- now means variant order only.
--
-- Backfill: one sequential position per ROW (not per group), ×10 for insert gaps,
-- ordered so group members stay adjacent (group's earliest created_at, then the
-- group key, then display_order, then created_at). New products get NULL shop_order
-- and sort to the end under NULLS LAST.
alter table products add column if not exists shop_order integer;

with grp as (
  select coalesce(product_group_id, id) as g, min(created_at) as first_created
  from products group by 1
), seq as (
  select p.id,
         row_number() over (
           order by grp.first_created,
                    coalesce(p.product_group_id, p.id),
                    p.display_order,
                    p.created_at
         ) * 10 as pos
  from products p
  join grp on grp.g = coalesce(p.product_group_id, p.id)
)
update products p set shop_order = seq.pos
from seq where seq.id = p.id;
