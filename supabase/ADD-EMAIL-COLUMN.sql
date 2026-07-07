-- ============================================================================
-- Add 'email' column to jamaah table
-- ============================================================================
-- Run this in the Supabase SQL Editor to fix the PGRST204 error:
-- "Could not find the 'email' column of 'jamaah'"
-- ============================================================================

-- 1. Add email column (TEXT, nullable — not all jamaah have accounts yet)
ALTER TABLE public.jamaah ADD COLUMN IF NOT EXISTS email text;

-- 2. Create unique index on email (allows NULLs — only non-NULL emails must be unique)
-- This prevents duplicate jamaah records with the same email.
CREATE UNIQUE INDEX IF NOT EXISTS idx_jamaah_email_unique
  ON public.jamaah(email)
  WHERE email IS NOT NULL;

-- 3. Create regular index for fast lookup during signup
CREATE INDEX IF NOT EXISTS idx_jamaah_email ON public.jamaah(email);

-- 4. Verify the column was added
-- Run: SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'jamaah' AND column_name = 'email';
