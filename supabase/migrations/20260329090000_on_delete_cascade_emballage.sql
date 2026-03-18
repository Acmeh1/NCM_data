-- Migration : Redéfinir la contrainte production_emballage_journalier_id_fkey avec ON DELETE CASCADE
ALTER TABLE production_emballage 
DROP CONSTRAINT production_emballage_journalier_id_fkey;

ALTER TABLE production_emballage 
ADD CONSTRAINT production_emballage_journalier_id_fkey 
FOREIGN KEY (journalier_id) REFERENCES production_journalier(id) 
ON DELETE CASCADE;
