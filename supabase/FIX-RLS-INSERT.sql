-- ============================================================================
-- FIX: Allow authenticated users to INSERT/SELECT/UPDATE on pasca_hajj_lab
-- and all child tables (screening, vital_sign, pre_hajj_*)
-- Run in Supabase Dashboard → SQL Editor → paste → Run
-- ============================================================================

-- Drop existing restrictive policies on pasca_hajj_lab
drop policy if exists pasca_hajj_lab_sel on public.pasca_hajj_lab;
drop policy if exists pasca_hajj_lab_ins on public.pasca_hajj_lab;
drop policy if exists pasca_hajj_lab_upd on public.pasca_hajj_lab;
drop policy if exists pasca_hajj_lab_del on public.pasca_hajj_lab;

-- Recreate with simple: any authenticated user can INSERT/SELECT/UPDATE
create policy pasca_hajj_lab_sel on public.pasca_hajj_lab for select using (auth.uid() is not null);
create policy pasca_hajj_lab_ins on public.pasca_hajj_lab for insert with check (auth.uid() is not null);
create policy pasca_hajj_lab_upd on public.pasca_hajj_lab for update using (auth.uid() is not null);
create policy pasca_hajj_lab_del on public.pasca_hajj_lab for delete using (auth.uid() is not null);

-- Also fix all other child tables (same pattern — allow any authenticated user)
do $$
declare
  t text;
begin
  foreach t in array array[
    'screening','vital_sign',
    'pre_hajj_vital','pre_hajj_lab','pre_hajj_chronic','pre_hajj_screening',
    'pre_hajj_medication','pre_hajj_immunization','pre_hajj_fitness',
    'pre_hajj_education','pre_hajj_ai_assessment',
    'telemedicine_request','telemedicine_schedule','telemedicine_ai_summary'
  ]
  loop
    execute format('drop policy if exists %1$s_sel on public.%1$s', t);
    execute format('drop policy if exists %1$s_ins on public.%1$s', t);
    execute format('drop policy if exists %1$s_upd on public.%1$s', t);
    execute format('drop policy if exists %1$s_del on public.%1$s', t);
    execute format('create policy %1$s_sel on public.%1$s for select using (auth.uid() is not null)', t);
    execute format('create policy %1$s_ins on public.%1$s for insert with check (auth.uid() is not null)', t);
    execute format('create policy %1$s_upd on public.%1$s for update using (auth.uid() is not null)', t);
    execute format('create policy %1$s_del on public.%1$s for delete using (auth.uid() is not null)', t);
  end loop;
end; $$;
