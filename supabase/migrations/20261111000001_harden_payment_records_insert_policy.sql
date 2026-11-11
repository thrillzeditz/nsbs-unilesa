-- ============================================================================
-- Migration: 20261111000001_harden_payment_records_insert_policy.sql
-- Purpose: Harden public payment submission policy.
--
-- Guarantees:
-- 1. Anonymous users can ONLY insert records with 'Pending Verification'.
-- 2. Prevents submission of pre-approved or manipulated statuses.
-- 3. Validates that amount_paid > 0 and student identifiers are non-empty.
-- 4. Preserves full admin management (SELECT, INSERT, UPDATE, DELETE).
-- ============================================================================

BEGIN;

-- Ensure RLS is enabled on payment_records
ALTER TABLE public.payment_records ENABLE ROW LEVEL SECURITY;

-- 1. Replace permissive public insert policy with hardened check
DROP POLICY IF EXISTS "payment_records: public insert" ON public.payment_records;

CREATE POLICY "payment_records: public insert"
  ON public.payment_records FOR INSERT
  WITH CHECK (
    payment_status = 'Pending Verification'
    AND amount_paid > 0
    AND length(trim(coalesce(matric_number, ''))) > 0
    AND length(trim(coalesce(email, ''))) > 0
    AND length(trim(coalesce(surname, ''))) > 0
    AND length(trim(coalesce(first_name, ''))) > 0
  );

-- 2. Preserve full administrator management (SELECT, INSERT, UPDATE, DELETE)
DROP POLICY IF EXISTS "payment_records: admin full access" ON public.payment_records;

CREATE POLICY "payment_records: admin full access"
  ON public.payment_records FOR ALL TO authenticated
  USING (public.is_any_admin())
  WITH CHECK (public.is_any_admin());

COMMIT;

