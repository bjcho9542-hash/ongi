-- 001_create_schema.sql
-- Enable pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- COMPANY
CREATE TABLE IF NOT EXISTS public.company (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  code varchar(4) NOT NULL UNIQUE,
  contact_name text,
  contact_phone varchar(30),
  password_hash text,
  business_number varchar(20),
  address text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE OR REPLACE FUNCTION public.trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_timestamp ON public.company;
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON public.company
FOR EACH ROW
EXECUTE PROCEDURE public.trigger_set_timestamp();

CREATE INDEX IF NOT EXISTS idx_company_code ON public.company(code);

-- ADMIN USER
CREATE TABLE IF NOT EXISTS public.admin_user (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE,
  name text,
  role text NOT NULL CHECK (role IN ('admin','counter')),
  password_hash text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- ENTRY
CREATE TABLE IF NOT EXISTS public.entry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id) ON DELETE CASCADE,
  entry_date date NOT NULL,
  count integer NOT NULL CHECK (count >= 1 AND count <= 20),
  signer text,
  created_by uuid REFERENCES public.admin_user(id),
  created_at timestamptz DEFAULT now(),
  is_paid boolean DEFAULT false,
  payment_id uuid NULL
);

CREATE INDEX IF NOT EXISTS idx_entry_company_date ON public.entry(company_id, entry_date);

-- PAYMENT
CREATE TABLE IF NOT EXISTS public.payment (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.company(id),
  from_date date NOT NULL,
  to_date date NOT NULL,
  total_count integer NOT NULL,
  unit_price integer NOT NULL DEFAULT 8000,
  total_amount bigint GENERATED ALWAYS AS (total_count * unit_price) STORED,
  paid_at timestamptz DEFAULT now(),
  paid_by uuid REFERENCES public.admin_user(id),
  receipt_url text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_payment_company_paidat ON public.payment(company_id, paid_at);

-- RECEIPT
CREATE TABLE IF NOT EXISTS public.receipt (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  payment_id uuid REFERENCES public.payment(id) ON DELETE CASCADE,
  file_path text NOT NULL,
  uploaded_by uuid REFERENCES public.admin_user(id),
  uploaded_at timestamptz DEFAULT now()
);

-- AUDIT LOG
CREATE TABLE IF NOT EXISTS public.audit_log (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_id uuid,
  actor_name text,
  action text NOT NULL,
  target_table text,
  target_id uuid,
  payload jsonb,
  created_at timestamptz DEFAULT now()
);
