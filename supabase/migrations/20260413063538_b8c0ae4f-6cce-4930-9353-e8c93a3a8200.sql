CREATE TABLE public.absence_settings (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  enabled boolean NOT NULL DEFAULT false,
  message_channel_id text,
  role_channel_id text,
  role_id text,
  bot_token text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.absence_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to absence_settings"
ON public.absence_settings FOR SELECT TO public
USING (false);

-- Add tasks_manage and absences_manage permissions to the permissions list
-- (These are stored in the roles.permissions JSONB, no schema change needed)