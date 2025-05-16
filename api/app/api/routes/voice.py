from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from typing import List
from ...services.voice_service import VoiceService
from ...services.task_service import TaskService
from ...schemas.task import TaskCreate, TaskResponse
from ...dependencies import get_current_user

router = APIRouter(prefix="/voice", tags=["voice"])
voice_service = VoiceService()
task_service = TaskService()

@router.post("/transcribe-test", response_model=str)
async def transcribe_audio_test(
    audio: UploadFile = File(...)
):
    """
    Test endpoint: Transcribe audio to text without authentication
    """
    # Read audio content
    audio_content = await audio.read()
    
    # Transcribe audio
    transcription = await voice_service.transcribe_audio(audio_content)
    
    if not transcription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to transcribe audio"
        )
    
    return transcription

@router.post("/extract-tasks-test", response_model=List[TaskCreate])
async def extract_tasks_test(
    transcription: str
):
    """
    Test endpoint: Extract tasks from transcribed text without authentication
    """
    tasks = await voice_service.extract_tasks(transcription)
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to extract tasks from transcription"
        )
    
    return tasks

@router.post("/transcribe", response_model=str)
async def transcribe_audio(
    audio: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """
    Transcribe audio to text
    """
    # Read audio content
    audio_content = await audio.read()
    
    # Transcribe audio
    transcription = await voice_service.transcribe_audio(audio_content)
    
    if not transcription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to transcribe audio"
        )
    
    return transcription

@router.post("/extract-tasks", response_model=List[TaskCreate])
async def extract_tasks(
    transcription: str,
    user_id: str = Depends(get_current_user)
):
    """
    Extract tasks from transcribed text
    """
    tasks = await voice_service.extract_tasks(transcription)
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to extract tasks from transcription"
        )
    
    return tasks

@router.post("/process", response_model=List[TaskResponse])
async def process_voice(
    audio: UploadFile = File(...),
    user_id: str = Depends(get_current_user)
):
    """
    Process voice audio into tasks
    1. Transcribe audio to text
    2. Extract tasks from transcription
    3. Create tasks in database
    """
    # Read audio content
    audio_content = await audio.read()
    
    # Transcribe audio
    transcription = await voice_service.transcribe_audio(audio_content)
    
    if not transcription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to transcribe audio"
        )
    
    # Extract tasks from transcription
    task_creates = await voice_service.extract_tasks(transcription)
    
    if not task_creates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to extract tasks from transcription"
        )
    
    # Create tasks in database
    created_tasks = []
    for task_create in task_creates:
        task = await task_service.create_task(user_id, task_create)
        if task:
            created_tasks.append(task)
    
    return created_tasks 