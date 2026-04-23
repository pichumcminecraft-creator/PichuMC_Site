
-- Create roles table
CREATE TABLE public.roles (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  name text NOT NULL UNIQUE,
  color text NOT NULL DEFAULT '#3B82F6',
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  is_system boolean NOT NULL DEFAULT false,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "No direct access to roles" ON public.roles FOR SELECT USING (false);

-- Insert default roles
INSERT INTO public.roles (name, color, is_system, permissions) VALUES
('eigenaar', '#FFD700', true, '{
  "positions_view": true, "positions_manage": true,
  "applications_view": true, "applications_manage": true,
  "discord_view": true, "discord_manage": true,
  "users_view": true, "users_manage": true,
  "roles_view": true, "roles_manage": true,
  "stats_view": true, "content_view": true, "content_manage": true,
  "activity_view": true, "see_passwords": true
}'::jsonb),
('admin', '#EF4444', false, '{
  "positions_view": true, "positions_manage": true,
  "applications_view": true, "applications_manage": true,
  "discord_view": true, "discord_manage": true,
  "users_view": true, "users_manage": false,
  "roles_view": true, "roles_manage": false,
  "stats_view": true, "content_view": true, "content_manage": true,
  "activity_view": true, "see_passwords": false
}'::jsonb),
('moderator', '#3B82F6', false, '{
  "positions_view": true, "positions_manage": false,
  "applications_view": true, "applications_manage": false,
  "discord_view": false, "discord_manage": false,
  "users_view": false, "users_manage": false,
  "roles_view": false, "roles_manage": false,
  "stats_view": true, "content_view": true, "content_manage": false,
  "activity_view": false, "see_passwords": false
}'::jsonb);

-- Add role_id to admin_users
ALTER TABLE public.admin_users ADD COLUMN role_id uuid REFERENCES public.roles(id);

-- Set existing users to their matching role
UPDATE public.admin_users SET role_id = (SELECT id FROM public.roles WHERE name = admin_users.role);

-- Add trigger for updated_at on roles
CREATE TRIGGER update_roles_updated_at
BEFORE UPDATE ON public.roles
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();
