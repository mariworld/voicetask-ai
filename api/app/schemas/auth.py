from pydantic import BaseModel, EmailStr, Field
from typing import Optional
from uuid import UUID

class UserBase(BaseModel):
    """Base user model with common attributes"""
    email: EmailStr
    full_name: Optional[str] = None

class UserCreate(UserBase):
    """Model for user registration"""
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    """Model for user login"""
    email: EmailStr
    password: str

class UserResponse(UserBase):
    """Response model for user information"""
    id: UUID
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

class TokenData(BaseModel):
    """Token payload data"""
    sub: str  # User ID
    exp: Optional[int] = None 