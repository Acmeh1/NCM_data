
-- Add approved column to profiles (admins are auto-approved)
ALTER TABLE public.profiles ADD COLUMN approved boolean NOT NULL DEFAULT false;

-- Auto-approve existing users
UPDATE public.profiles SET approved = true;

-- Replace handle_new_user to set approved = false for new users
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, approved)
  VALUES (NEW.id, NEW.email, NEW.raw_user_meta_data->>'full_name', false);
  
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'user');
  
  RETURN NEW;
END;
$function$;

-- Allow users to read their own approved status
-- (already covered by existing "Users can read own profile" policy)
