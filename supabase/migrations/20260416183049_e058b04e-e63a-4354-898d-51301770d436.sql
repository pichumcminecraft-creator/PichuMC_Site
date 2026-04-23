-- Add questions column to positions
ALTER TABLE public.positions ADD COLUMN IF NOT EXISTS questions jsonb NOT NULL DEFAULT '[
  {"key":"motivation","label":"Motivatie","type":"textarea","required":true},
  {"key":"experience","label":"Ervaring","type":"textarea","required":false},
  {"key":"availability","label":"Beschikbaarheid","type":"text","required":false}
]'::jsonb;

-- Insert default theme settings
INSERT INTO public.site_settings (key, value)
VALUES
  ('theme_primary', '43 96% 56%'),
  ('theme_background', '220 25% 7%'),
  ('theme_card', '220 20% 10%'),
  ('theme_foreground', '210 40% 92%'),
  ('theme_secondary', '220 15% 16%'),
  ('theme_border', '220 15% 18%'),
  ('theme_destructive', '0 84% 60%'),
  ('site_logo_url', ''),
  ('admin_panel_title', 'PichuMC Staff')
ON CONFLICT (key) DO NOTHING;
