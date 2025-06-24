/*
  # Fix user signup triggers

  1. Database Functions
    - Create or replace handle_new_user function to create user profile
    - Create or replace create_user_stats function to initialize user stats
  
  2. Triggers
    - Set up trigger on auth.users to automatically create profile and stats
  
  3. Security
    - Ensure proper RLS policies are in place
    - Handle edge cases in user creation
*/

-- Create or replace the handle_new_user function
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Create user profile
  INSERT INTO public.user_profiles (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW());
  
  -- Create user stats
  INSERT INTO public.user_stats (user_id, created_at, updated_at)
  VALUES (NEW.id, NOW(), NOW());
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger on auth.users table
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure RLS is enabled on user_profiles (should already be enabled based on schema)
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

-- Ensure RLS is enabled on user_stats (should already be enabled based on schema)
ALTER TABLE public.user_stats ENABLE ROW LEVEL SECURITY;

-- Create or replace RLS policies for user_profiles if they don't exist
DO $$
BEGIN
  -- Check if policy exists, if not create it
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_profiles' 
    AND policyname = 'Users can read and update their own profile'
  ) THEN
    CREATE POLICY "Users can read and update their own profile"
      ON public.user_profiles
      FOR ALL
      TO public
      USING (auth.uid() = user_id);
  END IF;
END $$;

-- Create or replace RLS policies for user_stats if they don't exist
DO $$
BEGIN
  -- Policy for SELECT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_stats' 
    AND policyname = 'Users can read own stats'
  ) THEN
    CREATE POLICY "Users can read own stats"
      ON public.user_stats
      FOR SELECT
      TO authenticated
      USING (auth.uid() = user_id);
  END IF;

  -- Policy for INSERT
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_stats' 
    AND policyname = 'Users can insert own stats'
  ) THEN
    CREATE POLICY "Users can insert own stats"
      ON public.user_stats
      FOR INSERT
      TO authenticated
      WITH CHECK (auth.uid() = user_id);
  END IF;

  -- Policy for UPDATE
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE tablename = 'user_stats' 
    AND policyname = 'Users can update own stats'
  ) THEN
    CREATE POLICY "Users can update own stats"
      ON public.user_stats
      FOR UPDATE
      TO authenticated
      USING (auth.uid() = user_id)
      WITH CHECK (auth.uid() = user_id);
  END IF;
END $$;

-- Grant necessary permissions
GRANT USAGE ON SCHEMA public TO anon, authenticated;
GRANT ALL ON public.user_profiles TO anon, authenticated;
GRANT ALL ON public.user_stats TO anon, authenticated;
GRANT ALL ON public.tasks TO anon, authenticated;
GRANT ALL ON public.subtasks TO anon, authenticated;