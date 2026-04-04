
-- Add custom_fields JSONB column to customers
ALTER TABLE public.customers ADD COLUMN IF NOT EXISTS custom_fields jsonb DEFAULT '{}'::jsonb;

-- Create customer_field_definitions table
CREATE TABLE public.customer_field_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  field_key text NOT NULL UNIQUE,
  field_label text NOT NULL,
  field_type text NOT NULL DEFAULT 'text',
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.customer_field_definitions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to customer_field_definitions"
ON public.customer_field_definitions
FOR ALL
USING (true)
WITH CHECK (true);
