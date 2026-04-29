
-- Fix RLS recursion issues on user_roles and profiles
-- This version uses a SECURITY DEFINER function to bypass recursion

-- 1. Drop old problematic policies
DROP POLICY IF EXISTS "Admins can manage roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can read all roles" ON public.user_roles;
DROP POLICY IF EXISTS "Users can read own roles" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage all user_roles" ON public.user_roles;

DROP POLICY IF EXISTS "Admins can read all profiles" ON public.profiles;
DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;

-- 2. Define has_role as SECURITY DEFINER to bypass RLS checks inside the function
CREATE OR REPLACE FUNCTION public.check_user_is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- This query bypasses RLS because it is SECURITY DEFINER
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id::text = (auth.uid())::text AND role::text = 'admin'
  );
END;
$$;

-- 3. Re-create policies using the safe function
-- A user can always read their own roles
CREATE POLICY "Users can read own roles" 
  ON public.user_roles FOR SELECT 
  TO authenticated 
  USING (user_id::text = (auth.uid())::text);

-- Admins can manage all user_roles via the safe function
CREATE POLICY "Admins can manage all user_roles"
  ON public.user_roles FOR ALL
  TO authenticated
  USING (public.check_user_is_admin());

-- 4. Admins can read/update all profiles
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.check_user_is_admin());

CREATE POLICY "Admins can update all profiles"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (public.check_user_is_admin());

-- 5. Keep legacy has_role function for compatibility
CREATE OR REPLACE FUNCTION public.has_role(_user_id uuid, _role text)
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id::text = _user_id::text AND role::text = _role
  );
END;
$$;
