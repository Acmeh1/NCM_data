-- ==========================================
-- Création de la table pointage_rh
-- Système de pointage mensuel des employés
-- ==========================================

CREATE TABLE IF NOT EXISTS public.pointage_rh (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  matricule text NOT NULL,
  date date NOT NULL,
  statut text NOT NULL DEFAULT 'PRESENT',
  etat text,
  mise_a_pied boolean DEFAULT false,
  heures_supp numeric DEFAULT 0,
  retard numeric DEFAULT 0,
  commentaire text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),

  -- Contrainte unique pour éviter les doublons
  CONSTRAINT pointage_rh_unique_matricule_date UNIQUE (matricule, date)
);

-- Si la table existe déjà, on renomme la colonne heures_recup en retard
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_schema = 'public' 
      AND table_name = 'pointage_rh' 
      AND column_name = 'heures_recup'
  ) THEN
    ALTER TABLE public.pointage_rh RENAME COLUMN heures_recup TO retard;
  END IF;
END $$;

-- Index pour les requêtes fréquentes
CREATE INDEX IF NOT EXISTS idx_pointage_rh_matricule ON public.pointage_rh (matricule);
CREATE INDEX IF NOT EXISTS idx_pointage_rh_date ON public.pointage_rh (date);
CREATE INDEX IF NOT EXISTS idx_pointage_rh_date_range ON public.pointage_rh (date, matricule);

-- Activer RLS
ALTER TABLE public.pointage_rh ENABLE ROW LEVEL SECURITY;

-- Politique de lecture pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated users can read pointage_rh" ON public.pointage_rh;
CREATE POLICY "Authenticated users can read pointage_rh"
  ON public.pointage_rh FOR SELECT
  TO authenticated
  USING (true);

-- Politique d'insertion pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated users can insert pointage_rh" ON public.pointage_rh;
CREATE POLICY "Authenticated users can insert pointage_rh"
  ON public.pointage_rh FOR INSERT
  TO authenticated
  WITH CHECK (true);

-- Politique de mise à jour pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated users can update pointage_rh" ON public.pointage_rh;
CREATE POLICY "Authenticated users can update pointage_rh"
  ON public.pointage_rh FOR UPDATE
  TO authenticated
  USING (true);

-- Politique de suppression pour les utilisateurs authentifiés
DROP POLICY IF EXISTS "Authenticated users can delete pointage_rh" ON public.pointage_rh;
CREATE POLICY "Authenticated users can delete pointage_rh"
  ON public.pointage_rh FOR DELETE
  TO authenticated
  USING (true);

-- Trigger pour mettre à jour updated_at automatiquement
CREATE OR REPLACE FUNCTION public.update_pointage_rh_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_pointage_rh_updated_at ON public.pointage_rh;
CREATE TRIGGER set_pointage_rh_updated_at
  BEFORE UPDATE ON public.pointage_rh
  FOR EACH ROW
  EXECUTE FUNCTION public.update_pointage_rh_updated_at();

-- ==========================================
-- Vue pour le Dashboard RH (absentéisme)
-- ==========================================

DROP VIEW IF EXISTS public."Vue_Pointage_Matricule";
CREATE OR REPLACE VIEW public."Vue_Pointage_Matricule" AS
SELECT
  p.date AS "Date",
  p.matricule AS "Matricule",
  f."Service" AS "Service",
  CASE
    WHEN p.statut = 'PRESENT' THEN 1
    WHEN p.statut IN ('ABS_AUTORISEE', 'ABS_NON_AUTORISEE') THEN 0
    ELSE NULL
  END AS "Présence",
  CASE
    WHEN p.statut = 'ABS_NON_AUTORISEE' THEN 'Absence Non Autorisée'
    WHEN p.statut = 'ABS_AUTORISEE' THEN
      CASE p.etat
        WHEN 'CONGE_ANNUEL' THEN 'Congé Annuel'
        WHEN 'CONGE_MALADIE' THEN 'Congé Maladie'
        WHEN 'CONGE_DECES' THEN 'Congé Décès'
        WHEN 'CONGE_MARIAGE' THEN 'Congé Mariage'
        WHEN 'FORMATION' THEN 'Formation'
        WHEN 'CONGE_SANS_SOLDE' THEN 'Congé sans solde'
        WHEN 'CONGE_CIRCONCISION' THEN 'Congé Circoncision'
        WHEN 'RECUPERATION' THEN 'Récupération'
        WHEN 'CONGE_NAISSANCE' THEN 'Congé Naissance'
        ELSE 'Absence Autorisée'
      END
    WHEN p.statut = 'PRESENT' AND p.retard > 0 THEN concat(p.retard, 'h Retard')
    ELSE NULL
  END AS "Motif_Absence"
FROM public.pointage_rh p
LEFT JOIN public."fichRH" f ON p.matricule = f."Matricule";
