from pydantic import BaseModel, EmailStr
from typing import Optional
from datetime import datetime
from uuid import UUID

class UserBase(BaseModel):
    """Base User model with common attributes"""
    email: EmailStr

class UserUpdate(BaseModel):
    """Model for updating user information"""
    full_name: Optional[str] = None

class UserResponse(UserBase):
    """Response model for users retrieved from the database"""
    id: UUID
    full_name: Optional[str] = None
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True 