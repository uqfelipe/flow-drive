CREATE TABLE public.chat_read_status (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL UNIQUE,
  read_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.chat_read_status ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to chat_read_status" ON public.chat_read_status FOR ALL USING (true) WITH CHECK (true);