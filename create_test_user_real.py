#!/usr/bin/env python3
"""
Create a test user with a realistic email that Supabase will accept
"""
import os
import requests
import json
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

def create_test_user():
    print("🔧 Creating test user via backend API...")
    
    # Use the backend API endpoint
    api_url = "http://localhost:8001/api/v1/auth/register"
    
    # Test user data with realistic email
    user_data = {
        "email": "testuser@gmail.com",  # Realistic email that Supabase should accept
        "password": "testpass123",
        "full_name": "Test User"
    }
    
    print(f"📧 Registering user: {user_data['email']}")
    
    try:
        response = requests.post(
            api_url,
            json=user_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Response status: {response.status_code}")
        print(f"📄 Response: {response.text}")
        
        if response.status_code == 200:
            user_info = response.json()
            print(f"✅ User created successfully!")
            print(f"👤 User ID: {user_info.get('id')}")
            print(f"📧 Email: {user_info.get('email')}")
            return user_info
        else:
            print(f"❌ Registration failed: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Network error: {e}")
        return None

def test_login(email, password):
    print(f"\n🔑 Testing login for {email}...")
    
    api_url = "http://localhost:8001/api/v1/auth/login"
    
    login_data = {
        "email": email,
        "password": password
    }
    
    try:
        response = requests.post(
            api_url,
            json=login_data,
            headers={"Content-Type": "application/json"},
            timeout=10
        )
        
        print(f"📊 Login response status: {response.status_code}")
        
        if response.status_code == 200:
            token_info = response.json()
            print(f"✅ Login successful!")
            print(f"🎫 Access token: {token_info.get('access_token', '')[:20]}...")
            return token_info
        else:
            print(f"❌ Login failed: {response.text}")
            return None
            
    except requests.exceptions.RequestException as e:
        print(f"❌ Login network error: {e}")
        return None

if __name__ == "__main__":
    print("🧪 Creating test user for Supabase authentication")
    print("=" * 50)
    
    # Create user
    user = create_test_user()
    
    if user:
        # Test login
        token = test_login("testuser@gmail.com", "testpass123")
        
        if token:
            print("\n🎊 SUCCESS! You can now use these credentials in your app:")
            print("📧 Email: testuser@gmail.com")
            print("🔑 Password: testpass123")
        else:
            print("\n⚠️ User created but login failed")
    else:
        print("\n❌ Could not create test user") 