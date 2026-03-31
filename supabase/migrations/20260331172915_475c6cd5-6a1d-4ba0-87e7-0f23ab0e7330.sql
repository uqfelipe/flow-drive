CREATE TABLE public.whatsapp_instances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id TEXT NOT NULL DEFAULT 'admin',
  instance_name TEXT NOT NULL,
  device_name TEXT NOT NULL DEFAULT 'LocadoraCRM',
  server_url TEXT NOT NULL,
  instance_token TEXT NOT NULL,
  token TEXT NOT NULL,
  webhook_url TEXT,
  status TEXT NOT NULL DEFAULT 'created',
  is_connected BOOLEAN NOT NULL DEFAULT false,
  last_connection_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE POLICY "Allow all access to whatsapp_instances"
  ON public.whatsapp_instances
  FOR ALL TO public USING (true) WITH CHECK (true);