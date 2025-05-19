import requests
import sys
import os

# Replace with your API URL
API_URL = "http://localhost:8000/api/v1"

def test_voice_process(audio_file_path):
    """
    Test the voice processing endpoint using the test endpoint
    that doesn't require authentication
    """
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
    
    print(f"Sending audio file: {audio_file_path}")
    
    # Make request to test endpoint
    try:
        response = requests.post(
            f"{API_URL}/voice/process-test",
            files=files
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
        print("Usage: python test_voice_process.py path/to/audio_file.m4a")
        sys.exit(1)
        
    audio_file_path = sys.argv[1]
    test_voice_process(audio_file_path) 