import asyncio
import sys
import os
from datetime import datetime

# Add the API directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'api')))

from app.db.supabase import get_supabase_client

async def create_test_user():
    # Initialize Supabase client
    supabase = get_supabase_client()
    
    # The test user ID
    test_user_id = "180a8d2e-642c-4023-a1dd-008af40b4fd2"
    test_email = "test_user@example.com"  # Can be any email
    
    # First check if user already exists in the public.users table
    response = supabase.table("users").select("*").eq("id", test_user_id).execute()
    
    if response.data and len(response.data) > 0:
        print(f"✅ Test user already exists: {response.data[0]}")
        return
    
    # User doesn't exist, create it in the public.users table
    user_data = {
        "id": test_user_id,
        "email": test_email,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat()
    }
    
    print(f"Creating user with data: {user_data}")
    
    try:
        response = supabase.table("users").insert(user_data).execute()
        print(f"✅ User created successfully: {response.data[0]}")
    except Exception as e:
        print(f"❌ Error creating user: {e}")
        
        # Check if the users table exists
        try:
            table_response = supabase.table("users").select("*").limit(1).execute()
            print(f"Users table exists, returned: {table_response}")
        except Exception as table_error:
            print(f"❌ Error accessing users table: {table_error}")
            print("You might need to create the users table first. Run the SQL in user_setup.sql")

if __name__ == "__main__":
    asyncio.run(create_test_user()) 