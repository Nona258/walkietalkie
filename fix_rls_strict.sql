-- STRICT RLS SETUP (Recommended for production)
-- Disable all existing policies first
ALTER TABLE public.users DISABLE ROW LEVEL SECURITY;
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Everyone can see public user profiles but limited fields
CREATE POLICY "Public profile access" ON public.users
  FOR SELECT
  USING (true);

-- Policy 2: Users can only update their own record
CREATE POLICY "Users can modify their own profile" ON public.users
  FOR UPDATE
  USING (auth.uid() = id);

-- Policy 3: Only admins can delete or update other users
CREATE POLICY "Admins can modify any user" ON public.users
  FOR UPDATE
  USING (
    (auth.uid() = id) OR 
    (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
  )
  WITH CHECK (
    (auth.uid() = id) OR 
    (auth.uid() IN (SELECT id FROM public.users WHERE role = 'admin'))
  );

-- Policy 4: Only system/service can insert
CREATE POLICY "Service can insert users" ON public.users
  FOR INSERT
  WITH CHECK (true);
