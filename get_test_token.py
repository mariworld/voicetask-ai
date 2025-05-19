import asyncio
import sys
import os
import requests
import json

# Add the API directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'api')))

# Replace with your actual API URL
API_URL = "http://localhost:8000/api/v1"

async def get_test_token():
    # Test user credentials - replace with actual credentials
    login_data = {
        "email": "test@example.com",
        "password": "password123"
    }
    
    # Attempt to login
    try:
        response = requests.post(f"{API_URL}/auth/login", json=login_data)
        
        if response.status_code == 200:
            token_data = response.json()
            token = token_data.get("access_token")
            print(f"✅ Successfully logged in. Your token is:")
            print(f"\n{token}\n")
            print("Use this token in your Authorization header:")
            print(f"Authorization: Bearer {token}")
            return token
        else:
            print(f"❌ Login failed with status code: {response.status_code}")
            print(f"Response: {response.text}")
            
            # Try to register if login fails
            print("\nAttempting to register the test user...")
            register_data = {
                "email": login_data["email"],
                "password": login_data["password"],
                "full_name": "Test User"
            }
            
            reg_response = requests.post(f"{API_URL}/auth/register", json=register_data)
            
            if reg_response.status_code == 200:
                print("✅ User registered successfully. Try logging in again.")
            else:
                print(f"❌ Registration failed with status code: {reg_response.status_code}")
                print(f"Response: {reg_response.text}")
                
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        print("\nMake sure your API server is running!")

if __name__ == "__main__":
    asyncio.run(get_test_token()) 