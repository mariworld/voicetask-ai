#!/usr/bin/env python3
"""
Test authentication connectivity from different network interfaces
"""
import requests
import json
import time

def test_endpoint(base_url, endpoint, method="GET", data=None):
    """Test an API endpoint and return detailed results"""
    url = f"{base_url}{endpoint}"
    print(f"🔍 Testing {method} {url}")
    
    try:
        if method == "POST":
            response = requests.post(url, json=data, timeout=5)
        else:
            response = requests.get(url, timeout=5)
            
        print(f"  ✅ Status: {response.status_code}")
        print(f"  📄 Response: {response.text[:100]}...")
        return response.status_code == 200 or response.status_code == 201
        
    except requests.exceptions.Timeout:
        print(f"  ❌ Timeout - server not responding")
        return False
    except requests.exceptions.ConnectionError:
        print(f"  ❌ Connection Error - can't reach server")
        return False
    except Exception as e:
        print(f"  ❌ Error: {e}")
        return False

def main():
    print("🧪 Testing Authentication Connectivity")
    print("=" * 50)
    
    # Test different base URLs
    base_urls = [
        "http://localhost:8001/api/v1",
        "http://127.0.0.1:8001/api/v1", 
        "http://192.168.1.140:8001/api/v1"
    ]
    
    # Test credentials
    login_data = {
        "email": "testuser@gmail.com",
        "password": "testpass123"
    }
    
    register_data = {
        "email": f"test{int(time.time())}@gmail.com",
        "password": "testpass123",
        "full_name": "Test User"
    }
    
    for base_url in base_urls:
        print(f"\n🌐 Testing {base_url}")
        print("-" * 30)
        
        # Test basic connectivity
        health_ok = test_endpoint(base_url.replace("/api/v1", ""), "/")
        
        if health_ok:
            # Test auth endpoints
            test_endpoint(base_url, "/auth/login", "POST", login_data)
            test_endpoint(base_url, "/auth/register", "POST", register_data)
        else:
            print("  ⚠️ Basic connectivity failed, skipping auth tests")
    
    print(f"\n📱 Mobile App Configuration:")
    print(f"Your app should use: http://192.168.1.140:8001/api/v1")
    print(f"Make sure your phone is on the same WiFi network!")

if __name__ == "__main__":
    main() 