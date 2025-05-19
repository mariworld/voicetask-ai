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
    # Validate file content type
    content_type = audio.content_type or ""
    print(f"Received audio file: {audio.filename}, content_type: {content_type}, size: {audio.size} bytes")
    
    # List of allowed MIME types
    allowed_mime_types = [
        "audio/mp3", "audio/mpeg", "audio/wav", "audio/wave", 
        "audio/x-wav", "audio/m4a", "audio/mp4", "audio/x-m4a", 
        "audio/aac", "audio/webm", "audio/ogg", "audio/x-aiff",
        "audio/flac", "audio/x-caf", "application/octet-stream"
    ]
    
    # Check if the content-type is allowed
    if content_type and content_type not in allowed_mime_types:
        print(f"Warning: Content-type is not in the allowed list: {content_type}")
        if not content_type.startswith("audio/"):
            print(f"Warning: Content-type does not appear to be audio: {content_type}")
    
    # Read audio content
    try:
        audio_content = await audio.read()
        file_size = len(audio_content)
        print(f"Successfully read {file_size} bytes from uploaded file")
        
        if file_size < 100:
            print(f"Warning: Audio file is very small ({file_size} bytes), possibly empty or corrupted")
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Audio file appears to be empty or corrupted"
            )
    except Exception as e:
        print(f"Error reading audio file: {str(e)}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to read audio file: {str(e)}"
        )
    
    # Transcribe audio
    transcription = await voice_service.transcribe_audio(audio_content)
    
    if not transcription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to transcribe audio. The file may be corrupted or in an unsupported format."
        )
    
    return transcription

@router.post("/extract-tasks-test", response_model=List[TaskCreate])
async def extract_tasks_test(
    transcription_data: dict
):
    """
    Test endpoint: Extract tasks from transcribed text without authentication
    """
    # Extract the transcription string from the request payload
    if not transcription_data or "transcription" not in transcription_data:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Transcription text is required in the request body"
        )
    
    transcription = transcription_data["transcription"]
    print(f"Received transcription for task extraction: {transcription}")
    
    tasks = await voice_service.extract_tasks(transcription)
    
    if not tasks:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to extract tasks from transcription"
        )
    
    return tasks

@router.post("/process-test", response_model=List[TaskResponse])
async def process_voice_test(
    audio: UploadFile = File(...)
):
    """
    Test endpoint: Process voice audio into tasks without authentication
    Uses the test user ID for task creation
    """
    # Use the test user ID
    test_user_id = "180a8d2e-642c-4023-a1dd-008af40b4fd2"
    
    # Read audio content
    audio_content = await audio.read()
    print(f"Processing audio for test user, size: {len(audio_content)} bytes")
    
    # Transcribe audio
    transcription = await voice_service.transcribe_audio(audio_content)
    print(f"Transcription result: {transcription}")
    
    if not transcription:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to transcribe audio"
        )
    
    # Extract tasks from transcription
    task_creates = await voice_service.extract_tasks(transcription)
    print(f"Extracted tasks: {task_creates}")
    
    if not task_creates:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Failed to extract tasks from transcription"
        )
    
    # Create tasks in database
    created_tasks = []
    for task_create in task_creates:
        task = await task_service.create_task(test_user_id, task_create)
        if task:
            created_tasks.append(task)
    
    return created_tasks

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