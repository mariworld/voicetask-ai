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
    
    async def create_task(self, user_id: str, task_data: TaskCreate) -> Optional[dict]:
        """
        Create a new task for a user
        """
        data = {
            "user_id": user_id,
            "title": task_data.title,
            "status": task_data.status
        }
        
        response = self.supabase.table(self.table).insert(data).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    
    async def update_task(self, task_id: str, user_id: str, task_data: TaskUpdate) -> Optional[dict]:
        """
        Update an existing task
        """
        # Prepare data for update (only non-None values)
        update_data = {}
        if task_data.title is not None:
            update_data["title"] = task_data.title
        if task_data.status is not None:
            update_data["status"] = task_data.status
            
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