import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables from .env file
load_dotenv()

def test_supabase_connection():
    """Test connection to Supabase"""
    
    # Get Supabase credentials from environment variables
    supabase_url = os.getenv("SUPABASE_URL")
    supabase_key = os.getenv("SUPABASE_KEY")
    
    if not supabase_url or not supabase_key:
        print("ERROR: Supabase URL and API key must be set in environment variables")
        print(f"SUPABASE_URL: {'Set' if supabase_url else 'Not set'}")
        print(f"SUPABASE_KEY: {'Set' if supabase_key else 'Not set'}")
        return False
    
    try:
        # Initialize Supabase client
        supabase: Client = create_client(supabase_url, supabase_key)
        
        # Test by getting a list of users (requires service_role key)
        response = supabase.auth.admin.list_users()
        
        # If we get here without errors, the connection is successful
        print("✅ Supabase connection successful!")
        
        # Print user count if available, otherwise just confirm success
        if hasattr(response, 'users'):
            print(f"Number of users in your Supabase project: {len(response.users)}")
        elif isinstance(response, dict) and 'users' in response:
            print(f"Number of users in your Supabase project: {len(response['users'])}")
        elif isinstance(response, list):
            print(f"Number of users in your Supabase project: {len(response)}")
        else:
            print("Connected successfully, but couldn't determine user count")
            
        return True
        
    except Exception as e:
        print(f"❌ Error connecting to Supabase: {str(e)}")
        # Print more detailed error info for debugging
        print(f"Error type: {type(e).__name__}")
        return False

def show_auth_instructions():
    """Show instructions for setting up authentication"""
    print("\n===== SUPABASE AUTHENTICATION SETUP =====")
    print("1. Create a Supabase project at https://supabase.com")
    print("2. Get your Supabase URL and service_role key from the API settings")
    print("3. Set these values in your .env file:")
    print("   SUPABASE_URL=https://your-project-id.supabase.co")
    print("   SUPABASE_KEY=your-service-role-key")
    print("4. Run this script again to verify connection")
    print("5. For detailed setup instructions, see api/supabase_auth_setup.md")

if __name__ == "__main__":
    print("Testing Supabase connection...")
    success = test_supabase_connection()
    
    if not success:
        show_auth_instructions()
    else:
        print("\nYou're all set! Your FastAPI backend can now use Supabase for authentication and storage.")
        print("Follow the instructions in api/supabase_auth_setup.md for additional configuration.") 