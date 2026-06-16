CREATE TABLE IF NOT EXISTS fulfillment_vendors (
  id uuid default gen_random_uuid() primary key,
  company_name text not null,
  contact_name text,
  email text not null,
  phone text,
  services text[],
  turnaround text,
  min_order_qty integer,
  notes text,
  file_formats text[],
  active boolean default false,
  created_at timestamptz default now()
);

ALTER TABLE fulfillment_vendors ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admin full access to fulfillment_vendors"
  ON fulfillment_vendors
  FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    )
  );
