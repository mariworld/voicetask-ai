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
            file_ext = ".wav"  # Default to WAV instead of m4a
            
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
                print("Could not detect audio format from header, using default .wav extension")
                
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
                    # CONVERSION FALLBACK APPROACHES:
                    print("Starting audio conversion fallback process...")
                    # Use multiple fallback approaches to try and convert the audio
                    
                    # 1. Try ffmpeg with various formats
                    print("Approach 1: Using ffmpeg with various format options")
                    wav_temp = await self._try_ffmpeg_conversion(temp_filename)
                    if wav_temp and os.path.exists(wav_temp):
                        # Try to transcribe the converted file
                        try:
                            print(f"Transcribing converted file: {wav_temp}")
                            with open(wav_temp, "rb") as wav_file:
                                transcription = client.audio.transcriptions.create(
                                    model="whisper-1", 
                                    file=wav_file
                                )
                                print(f"Transcription successful from converted file!")
                                
                                # Clean up temporary files
                                os.unlink(wav_temp)
                                if os.path.exists(temp_filename):
                                    os.unlink(temp_filename)
                                
                                return transcription.text
                        except Exception as wav_error:
                            print(f"Error transcribing converted file: {str(wav_error)}")
                    
                    # 2. Try the pydub approach if available
                    print("Approach 2: Using pydub for conversion")
                    pydub_wav = await self._try_pydub_conversion(audio_content)
                    if pydub_wav and os.path.exists(pydub_wav):
                        # Try to transcribe the pydub converted file
                        try:
                            print(f"Transcribing pydub converted file: {pydub_wav}")
                            with open(pydub_wav, "rb") as wav_file:
                                transcription = client.audio.transcriptions.create(
                                    model="whisper-1", 
                                    file=wav_file
                                )
                                print(f"Transcription successful from pydub converted file!")
                                
                                # Clean up temporary files
                                os.unlink(pydub_wav)
                                if os.path.exists(temp_filename):
                                    os.unlink(temp_filename)
                                
                                return transcription.text
                        except Exception as pydub_error:
                            print(f"Error transcribing pydub converted file: {str(pydub_error)}")
                    
                    # 3. Last resort - try directly creating a basic WAV from raw bytes
                    print("Approach 3: Creating a basic WAV file")
                    raw_wav = await self._create_basic_wav(audio_content)
                    if raw_wav and os.path.exists(raw_wav):
                        # Try to transcribe the basic WAV file
                        try:
                            print(f"Transcribing basic WAV file: {raw_wav}")
                            with open(raw_wav, "rb") as wav_file:
                                transcription = client.audio.transcriptions.create(
                                    model="whisper-1", 
                                    file=wav_file
                                )
                                print(f"Transcription successful from basic WAV file!")
                                
                                # Clean up temporary files
                                os.unlink(raw_wav)
                                if os.path.exists(temp_filename):
                                    os.unlink(temp_filename)
                                
                                return transcription.text
                        except Exception as raw_error:
                            print(f"Error transcribing basic WAV file: {str(raw_error)}")
                        
                    # If all approaches failed, raise the original error
                    print("All conversion approaches failed")
                    raise
        
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

    async def _try_ffmpeg_conversion(self, input_file: str) -> Optional[str]:
        """Attempt to convert audio using ffmpeg with multiple approaches"""
        try:
            import subprocess
            
            # First, try to get info about the file
            print("Running ffmpeg to get file info:")
            info_cmd = ["ffmpeg", "-i", input_file, "-f", "null", "-"]
            try:
                subprocess.run(info_cmd, stderr=subprocess.PIPE, text=True, check=False)
            except Exception as info_error:
                print(f"Info command failed (this is just diagnostic): {str(info_error)}")
            
            # List of conversion approaches to try
            approaches = [
                # 1. Standard PCM conversion
                {
                    "name": "Standard PCM",
                    "cmd": [
                        "ffmpeg", "-nostdin", "-y", "-i", input_file, 
                        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                        f"{input_file}_1.wav"
                    ]
                },
                # 2. Force format approach
                {
                    "name": "Force format",
                    "cmd": [
                        "ffmpeg", "-nostdin", "-y", "-f", "m4a", "-i", input_file,
                        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                        f"{input_file}_2.wav"
                    ]
                },
                # 3. Copy codec approach
                {
                    "name": "Copy codec",
                    "cmd": [
                        "ffmpeg", "-nostdin", "-y", "-i", input_file,
                        "-c:a", "copy", f"{input_file}_temp.m4a"
                    ],
                    "second_cmd": [
                        "ffmpeg", "-nostdin", "-y", "-i", f"{input_file}_temp.m4a",
                        "-acodec", "pcm_s16le", "-ar", "16000", "-ac", "1",
                        f"{input_file}_3.wav"
                    ]
                }
            ]
            
            # Try each approach
            for i, approach in enumerate(approaches):
                print(f"Trying conversion approach {i+1}: {approach['name']}")
                
                try:
                    # Run the command
                    process = subprocess.run(
                        approach["cmd"],
                        stderr=subprocess.PIPE,
                        stdout=subprocess.PIPE,
                        text=True,
                        check=False
                    )
                    
                    # For approaches with a second command
                    if process.returncode == 0 and "second_cmd" in approach:
                        process = subprocess.run(
                            approach["second_cmd"],
                            stderr=subprocess.PIPE,
                            stdout=subprocess.PIPE,
                            text=True,
                            check=False
                        )
                    
                    output_file = approach["cmd"][-1]
                    if "second_cmd" in approach:
                        output_file = approach["second_cmd"][-1]
                    
                    # Check if the output file exists and has content
                    if process.returncode == 0 and os.path.exists(output_file) and os.path.getsize(output_file) > 1000:
                        print(f"Approach {i+1} successful! Created file: {output_file}")
                        return output_file
                    else:
                        print(f"Approach {i+1} failed with code {process.returncode}")
                        print(f"Error output: {process.stderr}")
                        
                        # Clean up any temporary files
                        if "second_cmd" in approach and os.path.exists(f"{input_file}_temp.m4a"):
                            os.unlink(f"{input_file}_temp.m4a")
                
                except Exception as e:
                    print(f"Error in approach {i+1}: {str(e)}")
            
            # If all approaches failed, return None
            return None
            
        except Exception as e:
            print(f"Error in ffmpeg conversion: {str(e)}")
            return None
    
    async def _try_pydub_conversion(self, audio_content: bytes) -> Optional[str]:
        """Attempt to convert audio using pydub"""
        try:
            # Try to import pydub
            try:
                from pydub import AudioSegment
                print("Successfully imported pydub")
            except ImportError:
                print("pydub not available, installing...")
                import subprocess
                subprocess.check_call(["pip", "install", "pydub"])
                from pydub import AudioSegment
                print("pydub successfully installed")
            
            # Create temporary files
            in_file = tempfile.NamedTemporaryFile(suffix=".m4a", delete=False)
            out_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            
            try:
                # Write audio content to the temp file
                in_file.write(audio_content)
                in_file.close()
                
                # Try to convert with pydub
                try:
                    print(f"Converting with pydub: {in_file.name} -> {out_file.name}")
                    audio = AudioSegment.from_file(in_file.name, format="m4a")
                    
                    # Export as WAV
                    audio.export(out_file.name, format="wav")
                    print(f"Pydub conversion successful, output size: {os.path.getsize(out_file.name)} bytes")
                    return out_file.name
                    
                except Exception as pydub_error:
                    print(f"Pydub conversion failed: {str(pydub_error)}")
                    
                    # Try raw format as fallback
                    try:
                        print("Trying pydub with raw format...")
                        audio = AudioSegment.from_file(in_file.name, format="raw", 
                                                    frame_rate=16000, channels=1, sample_width=2)
                        audio.export(out_file.name, format="wav")
                        print(f"Pydub raw conversion successful, output size: {os.path.getsize(out_file.name)} bytes")
                        return out_file.name
                    except Exception as raw_error:
                        print(f"Pydub raw conversion failed: {str(raw_error)}")
                        return None
            finally:
                # Cleanup
                if os.path.exists(in_file.name):
                    os.unlink(in_file.name)
                
                # Don't delete the output file as we need to return it
            
        except Exception as e:
            print(f"Error in pydub conversion: {str(e)}")
            return None
            
    async def _create_basic_wav(self, audio_content: bytes) -> Optional[str]:
        """Create a basic WAV file from raw audio bytes"""
        try:
            # Create WAV file
            wav_file = tempfile.NamedTemporaryFile(suffix=".wav", delete=False)
            
            try:
                # Simple WAV header for 16kHz mono PCM
                header = bytearray()
                
                # RIFF header
                header.extend(b'RIFF')
                header.extend((len(audio_content) + 36).to_bytes(4, 'little'))  # File size - 8
                header.extend(b'WAVE')
                
                # Format chunk
                header.extend(b'fmt ')
                header.extend((16).to_bytes(4, 'little'))  # Chunk size
                header.extend((1).to_bytes(2, 'little'))   # Audio format (1 = PCM)
                header.extend((1).to_bytes(2, 'little'))   # Num channels
                header.extend((16000).to_bytes(4, 'little'))  # Sample rate
                header.extend((32000).to_bytes(4, 'little'))  # Byte rate
                header.extend((2).to_bytes(2, 'little'))   # Block align
                header.extend((16).to_bytes(2, 'little'))  # Bits per sample
                
                # Data chunk
                header.extend(b'data')
                header.extend((len(audio_content)).to_bytes(4, 'little'))  # Chunk size
                
                # Write header and data
                wav_file.write(header)
                wav_file.write(audio_content)
                wav_file.close()
                
                print(f"Created basic WAV file: {wav_file.name}, size: {os.path.getsize(wav_file.name)} bytes")
                return wav_file.name
                
            except Exception as wav_error:
                print(f"Error creating basic WAV: {str(wav_error)}")
                if os.path.exists(wav_file.name):
                    os.unlink(wav_file.name)
                return None
                
        except Exception as e:
            print(f"Error in basic WAV creation: {str(e)}")
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