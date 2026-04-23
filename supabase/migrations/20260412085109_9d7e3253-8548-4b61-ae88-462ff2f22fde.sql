
-- Site settings (key-value store for editable texts)
CREATE TABLE public.site_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  key text NOT NULL UNIQUE,
  value text NOT NULL DEFAULT '',
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read site_settings" ON public.site_settings FOR SELECT USING (true);

-- Nav items for the home page
CREATE TABLE public.nav_items (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text DEFAULT '',
  icon text NOT NULL DEFAULT 'zap',
  link text NOT NULL DEFAULT '/apply',
  color text NOT NULL DEFAULT '#FFD700',
  sort_order integer NOT NULL DEFAULT 0,
  is_visible boolean NOT NULL DEFAULT true,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.nav_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can read nav_items" ON public.nav_items FOR SELECT USING (true);

-- Insert default site settings
INSERT INTO public.site_settings (key, value) VALUES
  ('home_title', 'PichuMC'),
  ('home_subtitle', 'Welkom bij PichuMC! Kies hieronder waar je heen wilt.'),
  ('apply_title', 'Staff Sollicitaties'),
  ('apply_subtitle', 'Word onderdeel van het PichuMC team! Kies een positie hieronder om te solliciteren.'),
  ('footer_text', '© 2025 PichuMC - Alle rechten voorbehouden');

-- Insert default nav items
INSERT INTO public.nav_items (title, description, icon, link, color, sort_order) VALUES
  ('Solliciteren', 'Solliciteer voor een staff positie', 'clipboard', '/apply', '#FFD700', 0),
  ('Discord', 'Join onze Discord server', 'message-circle', 'https://discord.gg/pichumc', '#5865F2', 1);
