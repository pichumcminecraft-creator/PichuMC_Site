
-- Task discord settings
CREATE TABLE IF NOT EXISTS public.task_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  enabled boolean NOT NULL DEFAULT false,
  bot_token text,
  channel_id text,
  ping_role_id text,
  embed_color text NOT NULL DEFAULT '#FFD700',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.task_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY "No direct access to task_settings" ON public.task_settings FOR SELECT USING (false);

-- Track discord message ids so we can edit embeds on status change
ALTER TABLE public.absences ADD COLUMN IF NOT EXISTS discord_message_id text;
ALTER TABLE public.tasks ADD COLUMN IF NOT EXISTS discord_message_id text;
