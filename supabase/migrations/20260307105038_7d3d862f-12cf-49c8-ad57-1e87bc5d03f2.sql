
-- Chat sessions table
CREATE TABLE public.chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type TEXT NOT NULL DEFAULT 'female',
  group_name TEXT NOT NULL DEFAULT 'Le Vipere 🐍',
  roast_level TEXT NOT NULL DEFAULT 'savage',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages table
CREATE TABLE public.chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES public.chat_sessions(id) ON DELETE CASCADE NOT NULL,
  character_id TEXT NOT NULL,
  text TEXT NOT NULL,
  is_user BOOLEAN NOT NULL DEFAULT false,
  image_url TEXT,
  reply_to TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Character presets table
CREATE TABLE public.character_presets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  group_type TEXT NOT NULL,
  preset_name TEXT NOT NULL,
  characters JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Disable RLS for public access (no auth)
ALTER TABLE public.chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.character_presets ENABLE ROW LEVEL SECURITY;

-- Allow all access (public app, no auth)
CREATE POLICY "Allow all on chat_sessions" ON public.chat_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on chat_messages" ON public.chat_messages FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all on character_presets" ON public.character_presets FOR ALL USING (true) WITH CHECK (true);
