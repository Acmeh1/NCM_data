-- Modification de la table casse_ceramique existante pour qu'elle corresponde exactement à l'Excel
ALTER TABLE public.casse_ceramique 
  RENAME COLUMN press_kg TO presse_casse_kg;

ALTER TABLE public.casse_ceramique 
  ADD COLUMN IF NOT EXISTS format text,
  ADD COLUMN IF NOT EXISTS presse_poudre_recyclee_kg numeric not null default 0,
  ADD COLUMN IF NOT EXISTS presse_elev_tamis_kg numeric not null default 0,
  ADD COLUMN IF NOT EXISTS sortie_four_kg numeric not null default 0,
  ADD COLUMN IF NOT EXISTS marteaux_kg numeric not null default 0,
  ADD COLUMN IF NOT EXISTS empileur_kg numeric not null default 0,
  ADD COLUMN IF NOT EXISTS robot_kg numeric not null default 0;


-- Et pour que l'application puisse enregistrer tout ça dans notre NOUVELLE table globale "production_globale" :
ALTER TABLE public.production_globale 
  RENAME COLUMN casse_press_kg TO casse_presse_casse_kg;

ALTER TABLE public.production_globale
  ADD COLUMN IF NOT EXISTS casse_presse_poudre_recyclee_kg numeric NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS casse_presse_elev_tamis_kg numeric NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS casse_sortie_four_kg numeric NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS casse_marteaux_kg numeric NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS casse_empileur_kg numeric NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS casse_robot_kg numeric NULL DEFAULT 0;
