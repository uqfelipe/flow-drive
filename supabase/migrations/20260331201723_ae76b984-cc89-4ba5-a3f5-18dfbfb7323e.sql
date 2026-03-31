CREATE TABLE public.message_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL UNIQUE,
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.message_signals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to message_signals" ON public.message_signals
  FOR ALL TO public USING (true) WITH CHECK (true);

-- Enable Realtime on the table
ALTER PUBLICATION supabase_realtime ADD TABLE public.message_signals;