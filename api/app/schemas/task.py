from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime
from uuid import UUID

class TaskBase(BaseModel):
    """Base Task model with common attributes"""
    title: str
    status: Literal["To Do", "In Progress", "Done"] = "To Do"

class TaskCreate(TaskBase):
    """Model for creating a new task"""
    pass

class TaskUpdate(BaseModel):
    """Model for updating an existing task"""
    title: Optional[str] = None
    status: Optional[Literal["To Do", "In Progress", "Done"]] = None

class TaskResponse(TaskBase):
    """Response model for tasks retrieved from the database"""
    id: UUID
    user_id: UUID
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 