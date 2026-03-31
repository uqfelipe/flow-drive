CREATE TABLE public.presence_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id text NOT NULL,
  is_typing boolean NOT NULL DEFAULT false,
  is_online boolean NOT NULL DEFAULT false,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE(chat_id)
);

ALTER TABLE public.presence_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all access to presence_cache" ON public.presence_cache
  FOR ALL TO public USING (true) WITH CHECK (true);