
ALTER TABLE public.admin_users DROP CONSTRAINT admin_users_role_check;

ALTER TABLE public.roles ADD COLUMN IF NOT EXISTS sort_order integer NOT NULL DEFAULT 0;
