-- Migration : Mise à jour des contraintes Foreign Key avec ON DELETE CASCADE

-- 1. MISE À JOUR TABLE EMBALLAGE
ALTER TABLE production_emballage 
DROP CONSTRAINT IF EXISTS production_emballage_journalier_id_fkey;
ALTER TABLE production_emballage 
ADD CONSTRAINT production_emballage_journalier_id_fkey 
FOREIGN KEY (journalier_id) REFERENCES production_journalier(id) 
ON DELETE CASCADE;

-- 2. MISE À JOUR TABLE ARRÊTS ZONE
ALTER TABLE production_arrets_zone 
DROP CONSTRAINT IF EXISTS production_arrets_zone_journalier_id_fkey;
ALTER TABLE production_arrets_zone 
ADD CONSTRAINT production_arrets_zone_journalier_id_fkey 
FOREIGN KEY (journalier_id) REFERENCES production_journalier(id) 
ON DELETE CASCADE;

-- 3. MISE À JOUR TABLE SÉLECTION (QUALITÉ)
ALTER TABLE production_selection 
DROP CONSTRAINT IF EXISTS production_selection_journalier_id_fkey;
ALTER TABLE production_selection 
ADD CONSTRAINT production_selection_journalier_id_fkey 
FOREIGN KEY (journalier_id) REFERENCES production_journalier(id) 
ON DELETE CASCADE;
