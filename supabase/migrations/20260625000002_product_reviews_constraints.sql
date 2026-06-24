-- Unique constraint: one review per order per product slug
ALTER TABLE product_reviews DROP CONSTRAINT IF EXISTS uq_order_product_review;
ALTER TABLE product_reviews ADD CONSTRAINT uq_order_product_review UNIQUE (order_id, product_slug);
