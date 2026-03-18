
-- Add can_view and can_edit columns
ALTER TABLE public.user_permissions
  ADD COLUMN can_view boolean NOT NULL DEFAULT false,
  ADD COLUMN can_edit boolean NOT NULL DEFAULT false;

-- Migrate existing data
UPDATE public.user_permissions SET can_view = granted, can_edit = granted;

-- Drop old column
ALTER TABLE public.user_permissions DROP COLUMN granted;

-- Update the trigger function to use new columns
CREATE OR REPLACE FUNCTION public.handle_new_user_permissions()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  INSERT INTO public.user_permissions (user_id, permission_key, can_view, can_edit)
  VALUES 
    (NEW.id, 'production', false, false),
    (NEW.id, 'maintenance', false, false);
  RETURN NEW;
END;
$$;
