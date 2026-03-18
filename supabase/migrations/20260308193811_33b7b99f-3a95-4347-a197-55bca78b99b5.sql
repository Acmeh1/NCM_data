
-- Update trigger to also create dashboard permission for new users
CREATE OR REPLACE FUNCTION public.handle_new_user_permissions()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.user_permissions (user_id, permission_key, can_view, can_edit)
  VALUES 
    (NEW.id, 'production', false, false),
    (NEW.id, 'maintenance', false, false),
    (NEW.id, 'dashboard', false, false);
  RETURN NEW;
END;
$function$;

-- Add dashboard permission for existing users who don't have it
INSERT INTO public.user_permissions (user_id, permission_key, can_view, can_edit)
SELECT p.id, 'dashboard', false, false
FROM public.profiles p
WHERE NOT EXISTS (
  SELECT 1 FROM public.user_permissions up 
  WHERE up.user_id = p.id AND up.permission_key = 'dashboard'
);
