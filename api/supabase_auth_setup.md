# Supabase Authentication Setup Guide

This guide will walk you through setting up authentication with Supabase for the VoiceTask AI application.

## 1. Create a Supabase Project

1. Go to [https://supabase.com](https://supabase.com) and sign in
2. Click "New Project"
3. Fill in the project details:
   - **Name**: VoiceTask AI (or any name you prefer)
   - **Database Password**: Create a strong password
   - **Region**: Choose a region closest to your users
4. Click "Create New Project"
5. Wait for your project to be initialized (may take a few minutes)

## 2. Get Your API Keys

1. In your Supabase project dashboard, go to "Project Settings" (the gear icon)
2. Click on "API" in the sidebar
3. You'll see two keys:
   - **anon/public key**: Used for client-side authentication
   - **service_role key**: Used for server-side operations (higher privileges)
4. For our backend, you need the **URL** and the **service_role key**
5. Copy these values to your `.env` file:
   ```
   SUPABASE_URL=https://your-project-id.supabase.co
   SUPABASE_KEY=your-service-role-key
   ```

## 3. Configure Authentication Settings

1. In the Supabase dashboard, go to "Authentication" from the sidebar
2. Click on "Providers" 
3. For email/password authentication (default):
   - Make sure "Email" provider is enabled
   - Configure options according to your preferences:
     - **Confirm email**: If you want users to confirm their email
     - **Secure email change**: Recommended to set to true
     - **Password length**: Minimum 8 characters recommended
4. If you want additional providers (Google, GitHub, etc.), enable them and configure accordingly

## 4. Set Up the Database Schema

1. In the Supabase dashboard, go to "SQL Editor"
2. Create a new query
3. Paste the following SQL (already in your `supabase_schema.sql` file):
   ```sql
   -- Tasks Table
   CREATE TABLE IF NOT EXISTS tasks (
     id uuid DEFAULT uuid_generate_v4() PRIMARY KEY,
     user_id uuid REFERENCES auth.users NOT NULL,
     title text NOT NULL,
     status text NOT NULL DEFAULT 'To Do',
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
   ```
4. Click "Run" to execute the SQL and create your table with proper security policies

## 5. Test Authentication in Supabase Dashboard

1. Go to "Authentication" > "Users" in the Supabase dashboard
2. Click "Add User" to create a test user
3. Fill in the email and password
4. Click "Create User"

This test user will be helpful for initial testing of your API authentication.

## 6. Configure Environment Variables

Ensure your `.env` file has the following variables:

```
# Supabase configuration
SUPABASE_URL=https://your-project-id.supabase.co
SUPABASE_KEY=your-service-role-key

# OpenAI API Configuration
OPENAI_API_KEY=your-openai-api-key

# JWT Secret Key for token signing
SECRET_KEY=your-secure-random-string
```

## 7. Testing Authentication with curl

Once your API is running, you can test authentication with curl:

1. Register a user:
```bash
curl -X POST http://localhost:8002/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@example.com", "password": "securepassword123", "full_name": "New User"}'
```

2. Login to get a token:
```bash
curl -X POST http://localhost:8002/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@example.com", "password": "securepassword123"}'
```

3. Use the token in subsequent requests:
```bash
curl -X GET http://localhost:8002/api/v1/tasks \
  -H "Authorization: Bearer YOUR_TOKEN_HERE"
```

## Common Issues and Troubleshooting

1. **Environment Variables**: Ensure they are correctly set in your `.env` file
2. **CORS Issues**: Supabase has CORS protection; make sure your domain is allowed
3. **RLS Policies**: Ensure row-level security policies are correctly configured
4. **Wrong API Key**: Make sure you're using the service_role key for backend operations
5. **JWT Token**: Verify the secret key for JWT matching between your app and Supabase 