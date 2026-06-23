-- 1. Create the unified table
CREATE TABLE IF NOT EXISTS public.production_globale (
  id uuid NOT NULL DEFAULT extensions.uuid_generate_v4(),
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  
  -- Journalier Fields
  date text NULL,
  horaire text NULL,
  heure_debut text NULL,
  heure_fin text NULL,
  groupe text NULL,
  chef_equipe text NULL,
  modele text NULL,
  couleur text NULL,
  format text NULL,
  surface_car_m2 numeric NULL,
  
  -- Totaux Journalier
  total_m2 numeric NULL,
  pressage_m2 numeric NULL,
  project_m2 numeric NULL,
  emaillage_m2 numeric NULL,
  nb_pieces_four numeric NULL,
  cuisson_m2 numeric NULL,
  four_minutes_vides numeric NULL,
  four_consommation_kwh numeric NULL,
  
  -- Tri / Qualité (from stats_linea / emballage logic)
  choix1_pieces numeric NULL DEFAULT 0,
  choix1_surface_m2 numeric NULL DEFAULT 0,
  choix2_pieces numeric NULL DEFAULT 0,
  choix2_surface_m2 numeric NULL DEFAULT 0,
  choix3_pieces numeric NULL DEFAULT 0,
  choix3_surface_m2 numeric NULL DEFAULT 0,
  
  -- Casse (from casse_ceramique)
  casse_press_kg numeric NULL DEFAULT 0,
  casse_sortie_sechoir_kg numeric NULL DEFAULT 0,
  casse_emaillage_kg numeric NULL DEFAULT 0,
  casse_projecta_kg numeric NULL DEFAULT 0,
  casse_entree_four_kg numeric NULL DEFAULT 0,
  casse_cuite_kg numeric NULL DEFAULT 0,
  
  CONSTRAINT production_globale_pkey PRIMARY KEY (id)
);

-- 2. Migrate existing data
INSERT INTO public.production_globale (
  id, created_at, date, horaire, heure_debut, heure_fin, groupe, chef_equipe, 
  modele, couleur, format, surface_car_m2, total_m2, pressage_m2, project_m2, 
  emaillage_m2, nb_pieces_four, cuisson_m2, four_minutes_vides, four_consommation_kwh,
  
  choix1_pieces, choix1_surface_m2,
  choix2_pieces, choix2_surface_m2,
  choix3_pieces, choix3_surface_m2,
  
  casse_press_kg, casse_sortie_sechoir_kg, casse_emaillage_kg, 
  casse_projecta_kg, casse_entree_four_kg, casse_cuite_kg
)
SELECT 
  pj.id::uuid, 
  COALESCE(pj.created_at, now()), 
  pj.date, 
  pj.horaire, 
  pj.heure_debut, 
  pj.heure_fin, 
  pj.groupe, 
  pj.chef_equipe, 
  pj.modele, 
  pj.couleur, 
  pj.format, 
  pj.surface_car_m2, 
  pj.total_m2, 
  pj.pressage_m2, 
  pj."Project_m2", 
  pj.emaillage_m2, 
  pj.nb_pieces_four, 
  pj.cuisson_m2, 
  pj.four_minutes_vides, 
  pj.four_consommation_kwh,
  
  COALESCE(sl.choix1_pieces, 0) as choix1_pieces, 
  COALESCE(sl.choix1_surface_m2, 0) as choix1_surface_m2,
  COALESCE(sl.choix2_pieces, 0) as choix2_pieces, 
  COALESCE(sl.choix2_surface_m2, 0) as choix2_surface_m2,
  COALESCE(sl.choix3_pieces, 0) as choix3_pieces, 
  COALESCE(sl.choix3_surface_m2, 0) as choix3_surface_m2,
  
  COALESCE(cc.press_kg, 0) as casse_press_kg, 
  COALESCE(cc.sortie_sechoir_kg, 0) as casse_sortie_sechoir_kg, 
  COALESCE(cc.emaillage_kg, 0) as casse_emaillage_kg, 
  COALESCE(cc.projecta_kg, 0) as casse_projecta_kg, 
  COALESCE(cc.entree_four_kg, 0) as casse_entree_four_kg, 
  COALESCE(cc.casse_cuite_kg, 0) as casse_cuite_kg

FROM public.production_journalier pj
LEFT JOIN public.stats_linea sl ON sl.production_id = pj.id
LEFT JOIN public.casse_ceramique cc ON 
  cc.date = pj.date AND 
  cc.horaire = pj.horaire AND 
  cc.groupe = pj.groupe;
