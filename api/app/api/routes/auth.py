from fastapi import APIRouter, Depends, HTTPException, status
from ...services.auth_service import AuthService
from ...schemas.auth import UserCreate, UserLogin, UserResponse, Token

router = APIRouter(prefix="/auth", tags=["auth"])
auth_service = AuthService()

@router.post("/register", response_model=UserResponse)
async def register(user_data: UserCreate):
    """
    Register a new user
    """
    user = await auth_service.register_user(user_data)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Registration failed. Email may already be in use."
        )
    return user

@router.post("/login", response_model=Token)
async def login(user_login: UserLogin):
    """
    Authenticate and get access token
    """
    token = await auth_service.authenticate_user(user_login)
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return token 