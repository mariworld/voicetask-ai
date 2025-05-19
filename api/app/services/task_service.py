from typing import List, Optional
from uuid import UUID
from ..db.supabase import get_supabase_client
from ..schemas.task import TaskCreate, TaskUpdate, TaskResponse

class TaskService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.table = "tasks"
    
    async def get_tasks(self, user_id: str, status: Optional[str] = None) -> List[dict]:
        """
        Get all tasks for a user, optionally filtered by status
        """
        query = self.supabase.table(self.table).select("*").eq("user_id", user_id)
        
        if status:
            query = query.eq("status", status)
            
        response = query.execute()
        return response.data
    
    async def get_task(self, task_id: str, user_id: str) -> Optional[dict]:
        """
        Get a specific task by ID for a user
        """
        response = self.supabase.table(self.table).select("*").eq("id", task_id).eq("user_id", user_id).limit(1).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    
    async def _ensure_user_exists(self, user_id: str) -> bool:
        """
        Check if user exists in the users table, create if not
        """
        # First check if user exists
        response = self.supabase.table("users").select("*").eq("id", user_id).limit(1).execute()
        
        if response.data and len(response.data) > 0:
            return True
            
        # For testing purposes, create the user if it doesn't exist
        try:
            user_data = {
                "id": user_id,
                "email": f"auto-created-{user_id[:8]}@example.com",
                "created_at": "now()",
                "updated_at": "now()"
            }
            
            self.supabase.table("users").insert(user_data).execute()
            return True
        except Exception as e:
            print(f"Error creating user: {e}")
            return False
    
    async def create_task(self, user_id: str, task_data: TaskCreate) -> Optional[dict]:
        """
        Create a new task for a user
        """
        # Make sure the user exists first
        # await self._ensure_user_exists(user_id)
        
        data = {
            "user_id": user_id,
            "title": task_data.title,
            "status": task_data.status,
            "description": task_data.description,
            "due_date": task_data.due_date.isoformat() if task_data.due_date else None,
            "priority": task_data.priority
        }
        
        print(f"[TaskService] Attempting to create task in Supabase with data: {data}") # Log before insert
        
        response = self.supabase.table(self.table).insert(data).execute()
        
        if response.data and len(response.data) > 0:
            print(f"[TaskService] Successfully created task in Supabase. Response: {response.data[0]}") # Log success
            return response.data[0]
        else:
            print(f"[TaskService] Failed to create task in Supabase. Response: {response}") # Log failure/empty response
            return None
    
    async def update_task(self, task_id: str, user_id: str, task_data: TaskUpdate) -> Optional[dict]:
        """
        Update an existing task
        """
        # Prepare data for update (only non-None values)
        update_data = task_data.model_dump(exclude_unset=True)
            
        if not update_data:
            # If no data to update, just return the current task
            return await self.get_task(task_id, user_id)
            
        response = self.supabase.table(self.table).update(update_data).eq("id", task_id).eq("user_id", user_id).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    
    async def delete_task(self, task_id: str, user_id: str) -> bool:
        """
        Delete a task by ID
        """
        response = self.supabase.table(self.table).delete().eq("id", task_id).eq("user_id", user_id).execute()
        
        # Return True if at least one row was deleted
        return response.data and len(response.data) > 0 