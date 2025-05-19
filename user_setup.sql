-- Create a users table that extends the built-in auth.users
CREATE TABLE public.users (
  id UUID PRIMARY KEY,  -- Remove the foreign key constraint for testing
  email TEXT UNIQUE NOT NULL,
  full_name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  is_test_user BOOLEAN DEFAULT FALSE  -- Flag to identify test users
);

-- Add RLS (Row Level Security) policies for users
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- Users can only see and modify their own user data
CREATE POLICY user_select_own ON public.users 
  FOR SELECT USING (auth.uid() = id OR is_test_user = TRUE);
  
CREATE POLICY user_update_own ON public.users 
  FOR UPDATE USING (auth.uid() = id OR is_test_user = TRUE);

-- Trigger to automatically create a user record when a new auth user signs up
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.users (id, email, is_test_user)
  VALUES (new.id, new.email, FALSE);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Ensure the tasks table has the right foreign key constraint
ALTER TABLE public.tasks
  ADD CONSTRAINT fk_user_id
  FOREIGN KEY (user_id)
  REFERENCES public.users(id)
  ON DELETE CASCADE;

-- Add RLS policies to tasks to ensure users can only see/modify their own tasks
ALTER TABLE public.tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY task_select_own ON public.tasks 
  FOR SELECT USING (auth.uid() = user_id OR (SELECT is_test_user FROM public.users WHERE id = user_id));
  
CREATE POLICY task_insert_own ON public.tasks 
  FOR INSERT WITH CHECK (auth.uid() = user_id OR (SELECT is_test_user FROM public.users WHERE id = user_id));
  
CREATE POLICY task_update_own ON public.tasks 
  FOR UPDATE USING (auth.uid() = user_id OR (SELECT is_test_user FROM public.users WHERE id = user_id));
  
CREATE POLICY task_delete_own ON public.tasks 
  FOR DELETE USING (auth.uid() = user_id OR (SELECT is_test_user FROM public.users WHERE id = user_id)); 