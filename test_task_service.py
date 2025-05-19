import asyncio
import sys
import os
from datetime import datetime
import uuid

# Add the API directory to the path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), 'api')))

from app.services.task_service import TaskService
from app.services.user_service import UserService
from app.schemas.task import TaskCreate

async def test_create_and_verify_task():
    # Initialize services
    task_service = TaskService()
    
    # Use the provided user ID
    test_user_id = "180a8d2e-642c-4023-a1dd-008af40b4fd2"  # Real user ID
    
    print(f"Using existing user with ID: {test_user_id}")
    
    # Create a test task for the user
    task_data = TaskCreate(
        title=f"Test Task {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}",
        status="To Do",
        description="This is a test task created by the verification script",
        due_date=datetime.now(),
        priority="medium"
    )
    
    print(f"Creating test task: {task_data}")
    created_task = await task_service.create_task(test_user_id, task_data)
    
    if created_task:
        print(f"✅ Task successfully created with ID: {created_task['id']}")
        
        # Verify we can retrieve the task
        retrieved_task = await task_service.get_task(created_task['id'], test_user_id)
        
        if retrieved_task:
            print(f"✅ Task successfully retrieved: {retrieved_task}")
            print("Supabase integration is working correctly!")
        else:
            print("❌ Failed to retrieve the created task")
    else:
        print("❌ Failed to create task in Supabase")

if __name__ == "__main__":
    asyncio.run(test_create_and_verify_task()) 