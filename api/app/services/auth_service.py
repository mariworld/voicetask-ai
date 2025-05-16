from datetime import datetime, timedelta
from jose import jwt
from ..db.supabase import get_supabase_client
from ..config import settings
from ..schemas.auth import UserCreate, UserLogin, UserResponse, Token
from typing import Optional

class AuthService:
    def __init__(self):
        self.supabase = get_supabase_client()
    
    async def register_user(self, user_data: UserCreate) -> Optional[UserResponse]:
        """
        Register a new user in Supabase Auth
        """
        try:
            # Register user with Supabase Auth
            auth_response = self.supabase.auth.sign_up({
                "email": user_data.email,
                "password": user_data.password,
                "options": {
                    "data": {
                        "full_name": user_data.full_name or ""
                    }
                }
            })
            
            # Handle different response structures
            user = None
            if hasattr(auth_response, 'user') and auth_response.user:
                user = auth_response.user
            elif isinstance(auth_response, dict) and auth_response.get('user'):
                user = auth_response['user']
                
            if user:
                # Get user metadata safely
                user_metadata = {}
                if hasattr(user, 'user_metadata'):
                    user_metadata = user.user_metadata
                elif hasattr(user, 'get') and user.get('user_metadata'):
                    user_metadata = user.get('user_metadata')
                
                # Create UserResponse
                return UserResponse(
                    id=user.id if hasattr(user, 'id') else user.get('id'),
                    email=user.email if hasattr(user, 'email') else user.get('email'),
                    full_name=user_metadata.get("full_name", "")
                )
            return None
        except Exception as e:
            print(f"Error registering user: {str(e)}")
            return None
    
    async def authenticate_user(self, user_login: UserLogin) -> Optional[Token]:
        """
        Authenticate a user with email and password
        """
        try:
            # Authenticate with Supabase Auth
            auth_response = self.supabase.auth.sign_in_with_password({
                "email": user_login.email,
                "password": user_login.password
            })
            
            # Handle different response structures
            user = None
            if hasattr(auth_response, 'user') and auth_response.user:
                user = auth_response.user
            elif isinstance(auth_response, dict) and auth_response.get('user'):
                user = auth_response['user']
                
            if user:
                # Get user metadata safely
                user_metadata = {}
                if hasattr(user, 'user_metadata'):
                    user_metadata = user.user_metadata
                elif hasattr(user, 'get') and user.get('user_metadata'):
                    user_metadata = user.get('user_metadata')
                
                # Create UserResponse
                user_response = UserResponse(
                    id=user.id if hasattr(user, 'id') else user.get('id'),
                    email=user.email if hasattr(user, 'email') else user.get('email'),
                    full_name=user_metadata.get("full_name", "")
                )
                
                # Create access token with JWT
                access_token = self._create_access_token(str(user_response.id))
                
                return Token(
                    access_token=access_token,
                    user=user_response
                )
            return None
        except Exception as e:
            print(f"Error authenticating user: {str(e)}")
            return None
    
    def _create_access_token(self, subject: str) -> str:
        """
        Create a JWT access token
        """
        expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        to_encode = {"sub": subject, "exp": expire}
        return jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM) 