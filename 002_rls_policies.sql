-- 002_rls_policies.sql
-- Enable RLS on tables and create example policies.
ALTER TABLE public.company ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.entry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payment ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.receipt ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_user ENABLE ROW LEVEL SECURITY;

-- company: allow authenticated select
CREATE POLICY company_select_authenticated ON public.company
FOR SELECT
TO authenticated
USING (true);

-- company: admin only manage
CREATE POLICY company_admin_manage ON public.company
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_user au WHERE au.id = auth.uid() AND au.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_user au WHERE au.id = auth.uid() AND au.role = 'admin'
  )
);

-- entry: counters/admin can insert
CREATE POLICY entry_insert_counter ON public.entry
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_user au WHERE au.id = auth.uid() AND au.role IN ('counter','admin')
  )
);

-- entry: authenticated select
CREATE POLICY entry_select_authenticated ON public.entry
FOR SELECT
TO authenticated
USING (true);

-- payment: counters/admin can create
CREATE POLICY payment_create_counter ON public.payment
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_user au WHERE au.id = auth.uid() AND au.role IN ('counter','admin')
  )
);

CREATE POLICY payment_select_authenticated ON public.payment
FOR SELECT
TO authenticated
USING (true);

CREATE POLICY payment_delete_admin_only ON public.payment
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_user au WHERE au.id = auth.uid() AND au.role = 'admin'
  )
);

-- admin_user: admin manage only
CREATE POLICY admin_user_admin_manage ON public.admin_user
FOR ALL
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.admin_user au WHERE au.id = auth.uid() AND au.role = 'admin'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.admin_user au WHERE au.id = auth.uid() AND au.role = 'admin'
  )
);
