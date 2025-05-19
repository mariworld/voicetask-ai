from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional
from ...services.task_service import TaskService
from ...schemas.task import TaskCreate, TaskUpdate, TaskResponse
from ...dependencies import get_current_user

router = APIRouter(prefix="/tasks", tags=["tasks"])
task_service = TaskService()

@router.get("/", response_model=List[TaskResponse])
async def get_tasks(
    status: Optional[str] = None,
    user_id: str = Depends(get_current_user)
):
    """
    Get all tasks for the authenticated user, optionally filtered by status
    """
    tasks = await task_service.get_tasks(user_id, status)
    return tasks

@router.get("/{task_id}", response_model=TaskResponse)
async def get_task(
    task_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Get a specific task by ID
    """
    task = await task_service.get_task(task_id, user_id)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return task

@router.post("/", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def create_task(
    task_data: TaskCreate,
    user_id: str = Depends(get_current_user)
):
    """
    Create a new task
    """
    task = await task_service.create_task(user_id, task_data)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create task"
        )
    return task

@router.post("/test-create", response_model=TaskResponse, status_code=status.HTTP_201_CREATED)
async def test_create_task():
    """
    Test endpoint to create a task and verify Supabase integration
    Uses a test user account - no auth required
    """
    from datetime import datetime
    
    # Use a specific test user
    test_user_id = "180a8d2e-642c-4023-a1dd-008af40b4fd2"
    
    # Create a test task with current timestamp to ensure uniqueness
    current_time = datetime.now().strftime("%Y-%m-%d %H:%M:%S")
    task_data = TaskCreate(
        title=f"Test Task {current_time}",
        status="To Do",  # Must be one of: "To Do", "In Progress", "Done"
        description=f"This is a test task created at {current_time}",
        due_date=datetime.now(),
        priority="medium"  # Must be one of: "low", "medium", "high"
    )
    
    # Create the task
    task = await task_service.create_task(test_user_id, task_data)
    if not task:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to create test task - Supabase integration may not be working"
        )
    
    # Verify we can retrieve the task
    retrieved_task = await task_service.get_task(task['id'], test_user_id)
    if not retrieved_task:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Created task but couldn't retrieve it - partial Supabase integration failure"
        )
    
    return task

@router.put("/{task_id}", response_model=TaskResponse)
async def update_task(
    task_id: str,
    task_data: TaskUpdate,
    user_id: str = Depends(get_current_user)
):
    """
    Update an existing task
    """
    updated_task = await task_service.update_task(task_id, user_id, task_data)
    if not updated_task:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return updated_task

@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_task(
    task_id: str,
    user_id: str = Depends(get_current_user)
):
    """
    Delete a task
    """
    success = await task_service.delete_task(task_id, user_id)
    if not success:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Task not found"
        )
    return None 