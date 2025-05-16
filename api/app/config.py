import os
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

class Settings(BaseModel):
    # API settings
    API_V1_STR: str = "/api/v1"
    PROJECT_NAME: str = "VoiceTask AI API"
    
    # CORS settings
    CORS_ORIGINS: list[str] = [
        "https://localhost:3000",                                      # HTTPS local development
        "https://127.0.0.1:3000",                                      # HTTPS local development alternative
        "https://192.168.1.214:3000",                                    # HTTPS local IP for mobile testing
        "http://localhost:3000",                                         # Local development
        "http://127.0.0.1:3000",                                         # Local development alternative
        "http://192.168.1.214:3000",                                     # Local IP for mobile testing
        "https://*.ngrok.io",                                            # Ngrok domains
        "https://*.ngrok-free.app",                                      # New ngrok free domains
        "https://e999-2603-8000-b6f0-7720-358d-32e7-95be-8dff.ngrok-free.app", # Previous ngrok domain
        "https://8038-2603-8000-b6f0-7720-358d-32e7-95be-8dff.ngrok-free.app", # Latest ngrok domain
        "*",                                                              # Allow all origins for testing (remove in production)
        "https://10dd-2603-8000-b6f0-7720-358d-32e7-95be-8dff.ngrok-free.app"  # Another ngrok domain
    ]
    
    # Supabase settings
    SUPABASE_URL: str = os.getenv("SUPABASE_URL", "")
    SUPABASE_KEY: str = os.getenv("SUPABASE_KEY", "")
    
    # OpenAI settings for speech-to-text and task extraction
    OPENAI_API_KEY: str = os.getenv("OPENAI_API_KEY", "")
    
    # JWT settings
    SECRET_KEY: str = os.getenv("SECRET_KEY", "development_secret_key")
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 60 * 24 * 7  # 7 days


settings = Settings() 