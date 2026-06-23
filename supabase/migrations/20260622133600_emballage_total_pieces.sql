-- Add total_pieces column to production_emballage if not exists
ALTER TABLE production_emballage 
ADD COLUMN IF NOT EXISTS total_pieces numeric;
