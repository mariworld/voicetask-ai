import os
import tempfile
import json
import traceback
from typing import Optional, List
from openai import OpenAI
from ..config import settings
from ..schemas.task import TaskCreate

# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

class VoiceService:
    async def transcribe_audio(self, audio_content: bytes) -> Optional[str]:
        """
        Transcribe audio file using OpenAI Whisper API
        """
        temp_filename = None
        try:
            # Print debugging information
            print(f"Starting transcription. Audio content length: {len(audio_content)} bytes")
            print(f"OpenAI API key found: {'Yes' if settings.OPENAI_API_KEY else 'No, key is empty'}")
            
            if len(audio_content) < 100:
                print("WARNING: Audio content is very small, might be empty or corrupted")
                return None
                
            # Determine the file extension based on the first few bytes
            # This is a simple magic number check
            file_ext = ".m4a"  # Default extension
            
            # Magic number checks for common audio formats
            if audio_content.startswith(b'RIFF'):
                file_ext = ".wav"
                print("Detected WAV format from file header")
            elif audio_content.startswith(b'ID3') or audio_content.startswith(b'\xFF\xFB'):
                file_ext = ".mp3"
                print("Detected MP3 format from file header")
            elif audio_content.startswith(b'OggS'):
                file_ext = ".ogg"
                print("Detected OGG format from file header")
            elif audio_content.startswith(b'\x1A\x45\xDF\xA3'):
                file_ext = ".webm"
                print("Detected WEBM format from file header")
            else:
                print("Could not detect audio format from header, using default .m4a extension")
                
            # Create a temporary file with the appropriate extension
            with tempfile.NamedTemporaryFile(suffix=file_ext, delete=False) as temp_audio:
                temp_filename = temp_audio.name
                # Write audio content to the temporary file
                temp_audio.write(audio_content)
            
            print(f"Created temporary file: {temp_filename}")
            print(f"Temporary file size: {os.path.getsize(temp_filename)} bytes")
            
            # Transcribe using OpenAI's Whisper API
            with open(temp_filename, "rb") as audio_file:
                print("Calling OpenAI API for transcription...")
                try:
                    transcription = client.audio.transcriptions.create(
                        model="whisper-1", 
                        file=audio_file
                    )
                    print(f"Transcription response received: {transcription}")
                    
                    # Clean up temporary file
                    if os.path.exists(temp_filename):
                        os.unlink(temp_filename)
                        print(f"Cleaned up temporary file: {temp_filename}")
                    
                    # Return the transcribed text
                    return transcription.text
                except Exception as api_error:
                    print(f"OpenAI API error: {str(api_error)}")
                    # Try to convert file to wav as a fallback if original format failed
                    if file_ext != ".wav":
                        print("Trying to convert to WAV format as fallback...")
                        try:
                            import subprocess
                            wav_temp = temp_filename + ".wav"
                            subprocess.run(["ffmpeg", "-i", temp_filename, "-acodec", "pcm_s16le", wav_temp], check=True)
                            
                            if os.path.exists(wav_temp):
                                print(f"Converted to WAV: {wav_temp}, size: {os.path.getsize(wav_temp)}")
                                with open(wav_temp, "rb") as wav_file:
                                    transcription = client.audio.transcriptions.create(
                                        model="whisper-1", 
                                        file=wav_file
                                    )
                                    print(f"WAV transcription response: {transcription}")
                                    
                                # Clean up temporary files
                                os.unlink(wav_temp)
                                if os.path.exists(temp_filename):
                                    os.unlink(temp_filename)
                                
                                return transcription.text
                        except Exception as convert_error:
                            print(f"Error converting to WAV: {str(convert_error)}")
                    raise  # Re-raise the original API error if conversion failed
        
        except Exception as e:
            print(f"Error transcribing audio: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            print(f"Error traceback: {traceback.format_exc()}")
            
            # Clean up temp file if it exists
            if temp_filename and os.path.exists(temp_filename):
                try:
                    os.unlink(temp_filename)
                    print(f"Cleaned up temporary file: {temp_filename}")
                except Exception as cleanup_error:
                    print(f"Error cleaning up temporary file: {str(cleanup_error)}")
            
            return None
    
    async def extract_tasks(self, transcription: str) -> List[TaskCreate]:
        """
        Extract tasks from transcribed text using OpenAI GPT
        """
        try:
            # Prompt to extract tasks
            system_prompt = """
            You are an AI assistant that extracts tasks from transcribed voice notes.
            Extract all tasks or action items from the provided text.
            For each task, determine the status (To Do, In Progress, Done).
            Respond with a JSON array where each task has 'title' and 'status'.
            Example format:
            {
                "tasks": [
                    {"title": "Call John about project", "status": "To Do"},
                    {"title": "Submit quarterly report", "status": "In Progress"}
                ]
            }
            """
            
            # Call OpenAI API to extract tasks
            response = client.chat.completions.create(
                model="gpt-3.5-turbo",
                messages=[
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": f"Extract tasks from this transcription: {transcription}"}
                ],
                temperature=0.3,
                response_format={"type": "json_object"}
            )
            
            # Parse the response
            response_content = response.choices[0].message.content
            tasks_data = json.loads(response_content)
            
            # Convert to TaskCreate objects
            tasks = []
            for task_data in tasks_data.get("tasks", []):
                # Default to "To Do" if status is not valid
                status = task_data.get("status", "To Do")
                if status not in ["To Do", "In Progress", "Done"]:
                    status = "To Do"
                    
                tasks.append(TaskCreate(
                    title=task_data.get("title"),
                    status=status
                ))
            
            return tasks
        
        except Exception as e:
            print(f"Error extracting tasks: {str(e)}")
            print(f"Error type: {type(e).__name__}")
            print(f"Error traceback: {traceback.format_exc()}")
            return [] 