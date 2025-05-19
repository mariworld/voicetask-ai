from typing import List, Optional, Dict
from ..db.supabase import get_supabase_client

class UserService:
    def __init__(self):
        self.supabase = get_supabase_client()
        self.table = "users"
    
    async def get_user(self, user_id: str) -> Optional[dict]:
        """
        Get user information by ID
        """
        response = self.supabase.table(self.table).select("*").eq("id", user_id).limit(1).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    
    async def update_user(self, user_id: str, user_data: Dict) -> Optional[dict]:
        """
        Update user information
        
        Args:
            user_id: The user's UUID
            user_data: Dictionary with user data to update (full_name, etc.)
        """
        # Only allow updatable fields
        allowed_fields = ["full_name"]
        update_data = {k: v for k, v in user_data.items() if k in allowed_fields}
        
        if not update_data:
            return await self.get_user(user_id)
        
        response = self.supabase.table(self.table).update(update_data).eq("id", user_id).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None
    
    async def ensure_user_exists(self, user_id: str, email: str) -> Optional[dict]:
        """
        Make sure a user exists in the users table
        Used for testing or when a user record might not have been created automatically
        """
        # First check if user exists
        existing_user = await self.get_user(user_id)
        if existing_user:
            return existing_user
            
        # Create user if doesn't exist - mark as test user
        user_data = {
            "id": user_id,
            "email": email,
            "is_test_user": True  # Mark this as a test user
        }
        
        print(f"Creating test user with data: {user_data}")
        
        response = self.supabase.table(self.table).insert(user_data).execute()
        
        if response.data and len(response.data) > 0:
            return response.data[0]
        return None 