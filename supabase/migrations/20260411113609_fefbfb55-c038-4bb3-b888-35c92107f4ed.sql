
-- Service role policies for admin management via edge functions
CREATE POLICY "Service role full access admin_users" ON public.admin_users FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access applications" ON public.applications FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access discord_settings" ON public.discord_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role full access discord_channels" ON public.discord_channels FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Service role manage positions" ON public.positions FOR ALL USING (true) WITH CHECK (true);

-- Make these policies only apply to service_role by using auth.role() check
-- Actually, let's drop and recreate with proper role checks

DROP POLICY "Service role full access admin_users" ON public.admin_users;
DROP POLICY "Service role full access applications" ON public.applications;
DROP POLICY "Service role full access discord_settings" ON public.discord_settings;
DROP POLICY "Service role full access discord_channels" ON public.discord_channels;
DROP POLICY "Service role manage positions" ON public.positions;

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert default admin user (password: admin123)
INSERT INTO public.admin_users (username, password_hash, role) VALUES ('LikeAPichu', crypt('admin123', gen_salt('bf')), 'eigenaar');
