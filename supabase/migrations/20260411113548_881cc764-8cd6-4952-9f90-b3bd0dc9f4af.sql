
-- Admin users table (username/password based, not Supabase auth)
CREATE TABLE public.admin_users (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'moderator' CHECK (role IN ('eigenaar', 'admin', 'moderator')),
  last_online TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Public read for auth check via edge function, no direct client access needed
CREATE POLICY "No direct access to admin_users" ON public.admin_users FOR SELECT USING (false);

-- Positions table
CREATE TABLE public.positions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  icon TEXT NOT NULL DEFAULT 'shield',
  color TEXT NOT NULL DEFAULT '#FFD700',
  is_open BOOLEAN NOT NULL DEFAULT true,
  requirements TEXT[] NOT NULL DEFAULT '{}',
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can view open positions" ON public.positions FOR SELECT USING (true);

-- Applications table
CREATE TABLE public.applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  minecraft_username TEXT NOT NULL,
  age INTEGER,
  discord_username TEXT,
  motivation TEXT,
  experience TEXT,
  availability TEXT,
  status TEXT NOT NULL DEFAULT 'in_afwachting' CHECK (status IN ('in_afwachting', 'geaccepteerd', 'afgewezen')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit applications" ON public.applications FOR INSERT WITH CHECK (true);
CREATE POLICY "No public read of applications" ON public.applications FOR SELECT USING (false);

-- Discord settings table
CREATE TABLE public.discord_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  bot_token TEXT,
  guild_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to discord_settings" ON public.discord_settings FOR SELECT USING (false);

-- Discord channel settings per position
CREATE TABLE public.discord_channels (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  position_id UUID NOT NULL REFERENCES public.positions(id) ON DELETE CASCADE,
  enabled BOOLEAN NOT NULL DEFAULT false,
  channel_id TEXT,
  ping_roles TEXT[] NOT NULL DEFAULT '{}',
  embed_color TEXT NOT NULL DEFAULT '#FFD700',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.discord_channels ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to discord_channels" ON public.discord_channels FOR SELECT USING (false);

-- Update timestamp function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_positions_updated_at BEFORE UPDATE ON public.positions FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_applications_updated_at BEFORE UPDATE ON public.applications FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_discord_settings_updated_at BEFORE UPDATE ON public.discord_settings FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_discord_channels_updated_at BEFORE UPDATE ON public.discord_channels FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
