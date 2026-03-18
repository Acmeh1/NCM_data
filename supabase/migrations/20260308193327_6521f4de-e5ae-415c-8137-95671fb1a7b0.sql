
-- Create a security definer function to check if user can edit production
CREATE OR REPLACE FUNCTION public.can_edit_production(_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = 'admin'
  )
  OR EXISTS (
    SELECT 1 FROM public.user_permissions 
    WHERE user_id = _user_id 
      AND permission_key = 'production' 
      AND can_edit = true
  )
$$;

-- Drop old permissive policies for INSERT/UPDATE/DELETE on production tables
-- production_journalier
DROP POLICY IF EXISTS "Allow public insert production_journalier" ON public.production_journalier;
DROP POLICY IF EXISTS "Allow public update production_journalier" ON public.production_journalier;
DROP POLICY IF EXISTS "Allow public delete production_journalier" ON public.production_journalier;

CREATE POLICY "Editors can insert production_journalier" ON public.production_journalier
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can update production_journalier" ON public.production_journalier
  FOR UPDATE TO authenticated USING (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can delete production_journalier" ON public.production_journalier
  FOR DELETE TO authenticated USING (public.can_edit_production(auth.uid()));

-- production_emballage
DROP POLICY IF EXISTS "Allow public insert production_emballage" ON public.production_emballage;
DROP POLICY IF EXISTS "Allow public update production_emballage" ON public.production_emballage;
DROP POLICY IF EXISTS "Allow public delete production_emballage" ON public.production_emballage;

CREATE POLICY "Editors can insert production_emballage" ON public.production_emballage
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can update production_emballage" ON public.production_emballage
  FOR UPDATE TO authenticated USING (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can delete production_emballage" ON public.production_emballage
  FOR DELETE TO authenticated USING (public.can_edit_production(auth.uid()));

-- production_selection
DROP POLICY IF EXISTS "Allow public insert production_selection" ON public.production_selection;
DROP POLICY IF EXISTS "Allow public update production_selection" ON public.production_selection;
DROP POLICY IF EXISTS "Allow public delete production_selection" ON public.production_selection;

CREATE POLICY "Editors can insert production_selection" ON public.production_selection
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can update production_selection" ON public.production_selection
  FOR UPDATE TO authenticated USING (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can delete production_selection" ON public.production_selection
  FOR DELETE TO authenticated USING (public.can_edit_production(auth.uid()));

-- production_arrets_zone
DROP POLICY IF EXISTS "Allow public insert production_arrets_zone" ON public.production_arrets_zone;
DROP POLICY IF EXISTS "Allow public update production_arrets_zone" ON public.production_arrets_zone;
DROP POLICY IF EXISTS "Allow public delete production_arrets_zone" ON public.production_arrets_zone;

CREATE POLICY "Editors can insert production_arrets_zone" ON public.production_arrets_zone
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can update production_arrets_zone" ON public.production_arrets_zone
  FOR UPDATE TO authenticated USING (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can delete production_arrets_zone" ON public.production_arrets_zone
  FOR DELETE TO authenticated USING (public.can_edit_production(auth.uid()));

-- stats_linea
DROP POLICY IF EXISTS "Allow public insert stats_linea" ON public.stats_linea;
DROP POLICY IF EXISTS "Allow public update stats_linea" ON public.stats_linea;
DROP POLICY IF EXISTS "Allow public delete stats_linea" ON public.stats_linea;

CREATE POLICY "Editors can insert stats_linea" ON public.stats_linea
  FOR INSERT TO authenticated WITH CHECK (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can update stats_linea" ON public.stats_linea
  FOR UPDATE TO authenticated USING (public.can_edit_production(auth.uid()));
CREATE POLICY "Editors can delete stats_linea" ON public.stats_linea
  FOR DELETE TO authenticated USING (public.can_edit_production(auth.uid()));

-- Keep SELECT policies as-is (read access for authenticated users)
