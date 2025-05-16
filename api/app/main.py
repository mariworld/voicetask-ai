from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .config import settings
from .api.routes import tasks, voice, auth

# Initialize FastAPI app
app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
)

# Set CORS middleware with more permissive settings for development
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Allow exposing all headers to the client
    max_age=86400,        # Cache preflight requests for 24 hours
)

# Include API routers
app.include_router(auth.router, prefix=f"{settings.API_V1_STR}", tags=["auth"])
app.include_router(tasks.router, prefix=f"{settings.API_V1_STR}", tags=["tasks"])
app.include_router(voice.router, prefix=f"{settings.API_V1_STR}", tags=["voice"])

@app.get("/", tags=["health"])
async def health_check():
    """
    Root endpoint - can be used for health check
    """
    return {"status": "ok", "message": "VoiceTask AI API is running"} 