-- 003_admin_user_lockout.sql
ALTER TABLE public.admin_user
  ADD COLUMN IF NOT EXISTS failed_attempts integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS locked_until timestamptz;

CREATE INDEX IF NOT EXISTS idx_admin_user_locked_until ON public.admin_user(locked_until);
