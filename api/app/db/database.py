"""
Database setup instructions for Supabase

This file contains SQL commands for setting up the Supabase database.
Run these commands in the Supabase SQL editor to create the required tables.

1. Go to your Supabase project
2. Navigate to SQL Editor
3. Create a new query
4. Paste the SQL commands below
5. Run the query

"""

# Tasks Table
TASKS_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS tasks (
  id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id uuid REFERENCES auth.users NOT NULL,
  title text NOT NULL,
  status text NOT NULL DEFAULT 'To Do',
  description text NULL,
  due_date timestamp with time zone NULL,
  priority text NULL, 
  created_at timestamp with time zone DEFAULT now() NOT NULL,
  updated_at timestamp with time zone DEFAULT now() NOT NULL
);

-- Enable RLS
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Create policy for users to see only their own tasks
CREATE POLICY "Users can only access their own tasks" 
ON tasks 
FOR ALL 
USING (auth.uid() = user_id);
"""

# Add updated_at trigger function
TRIGGER_FUNCTION_SQL = """
-- Function to automatically set updated_at timestamp
CREATE OR REPLACE FUNCTION trigger_set_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to call function before update
CREATE TRIGGER set_timestamp
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION trigger_set_timestamp();
""" 