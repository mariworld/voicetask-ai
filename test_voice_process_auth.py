import requests
import sys
import os
import asyncio

# Add the API directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'api')))

# Replace with your API URL
API_URL = "http://localhost:8000/api/v1"

async def register_and_get_token():
    """
    Register a test user and get authentication token
    """
    # Test user credentials
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    # Try to login first
    try:
        login_response = requests.post(f"{API_URL}/auth/login", json=login_data)
        
        # If login successful, return token
        if login_response.status_code == 200:
            token_data = login_response.json()
            token = token_data.get("access_token")
            print(f"✅ Login successful")
            return token
            
        # If login fails, try to register
        print("Login failed. Attempting to register...")
        register_data = {
            "email": login_data["email"],
            "password": login_data["password"],
            "full_name": "Test User"
        }
        
        reg_response = requests.post(f"{API_URL}/auth/register", json=register_data)
        
        if reg_response.status_code == 200:
            print("✅ Registration successful. Logging in...")
            
            # Try to login again after registration
            login_response = requests.post(f"{API_URL}/auth/login", json=login_data)
            
            if login_response.status_code == 200:
                token_data = login_response.json()
                token = token_data.get("access_token")
                print(f"✅ Login successful after registration")
                return token
        
        print(f"❌ Failed to get authentication token")
        return None
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        return None

async def test_voice_process_auth(audio_file_path):
    """
    Test the voice processing endpoint with authentication
    """
    # Get auth token
    token = await register_and_get_token()
    
    if not token:
        print("Authentication failed. Cannot proceed with test.")
        return
        
    # Check if file exists
    if not os.path.exists(audio_file_path):
        print(f"❌ Error: File not found: {audio_file_path}")
        return
    
    # Prepare file for upload
    files = {
        'audio': (os.path.basename(audio_file_path), 
                  open(audio_file_path, 'rb'),
                  'audio/m4a')  # Adjust content type if needed
    }
    
    # Set authorization header
    headers = {
        "Authorization": f"Bearer {token}"
    }
    
    print(f"Sending audio file: {audio_file_path} with authentication")
    
    # Make request to the authenticated endpoint
    try:
        response = requests.post(
            f"{API_URL}/voice/process",
            files=files,
            headers=headers
        )
        
        # Check response
        if response.status_code == 200:
            tasks = response.json()
            print(f"✅ Successfully processed audio! Created {len(tasks)} tasks:")
            for i, task in enumerate(tasks, 1):
                print(f"\nTask {i}:")
                print(f"  ID: {task['id']}")
                print(f"  Title: {task['title']}")
                print(f"  Status: {task['status']}")
                print(f"  Description: {task['description']}")
                print(f"  Priority: {task['priority']}")
                print(f"  Due Date: {task.get('due_date', 'None')}")
        else:
            print(f"❌ Error: HTTP {response.status_code}")
            print(f"Response: {response.text}")
            
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print("\nMake sure your API server is running!")

if __name__ == "__main__":
    # Get audio file path from command line argument
    if len(sys.argv) < 2:
        print("Usage: python test_voice_process_auth.py path/to/audio_file.m4a")
        sys.exit(1)
        
    audio_file_path = sys.argv[1]
    asyncio.run(test_voice_process_auth(audio_file_path)) 