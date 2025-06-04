import os
import tempfile
import json
import traceback
from typing import Optional, List
from datetime import datetime, timedelta, timezone
import re
from openai import OpenAI
from ..config import settings
from ..schemas.task import TaskCreate

# Initialize OpenAI client
client = OpenAI(api_key=settings.OPENAI_API_KEY)

def parse_date_from_text(text: str, timezone_offset_minutes: Optional[int] = None) -> Optional[datetime]:
    """
    Parse natural language date/time expressions into timezone-aware datetime objects (UTC)
    
    Args:
        text: Natural language text containing date/time
        timezone_offset_minutes: User's timezone offset in minutes from UTC (e.g., -420 for PDT)
    """
    if not text:
        return None
        
    print(f"Parsing date from text: {text}")
    print(f"User timezone offset: {timezone_offset_minutes} minutes")
    
    # Calculate user's timezone
    if timezone_offset_minutes is not None:
        # JavaScript getTimezoneOffset() returns negative for ahead of UTC
        # So PDT (-7 hours) returns +420 minutes
        user_tz = timezone(timedelta(minutes=-timezone_offset_minutes))
        now = datetime.now(user_tz)
    else:
        # Fallback to UTC if no timezone provided
        user_tz = timezone.utc
        now = datetime.now(timezone.utc)
    
    print(f"Current time in user timezone: {now}")
    
    today = now.replace(hour=0, minute=0, second=0, microsecond=0)
    
    # Time patterns (12-hour format)
    time_patterns = [
        r'(\d{1,2}):(\d{2})\s*(a\.?m\.?|p\.?m\.?)',  # 3:30 PM, 6:00 a.m.
        r'(\d{1,2})\s*(a\.?m\.?|p\.?m\.?)',          # 6 PM, 3 a.m.
    ]
    
    time_match = None
    for pattern in time_patterns:
        time_match = re.search(pattern, text, re.IGNORECASE)
        if time_match:
            break
    
    # Extract time components
    if time_match:
        if len(time_match.groups()) == 3:  # hour:minute format
            hour = int(time_match.group(1))
            minute = int(time_match.group(2))
            am_pm = time_match.group(3).lower()
        else:  # hour only format
            hour = int(time_match.group(1))
            minute = 0
            am_pm = time_match.group(2).lower()
        
        # Convert to 24-hour format
        if 'p' in am_pm and hour != 12:
            hour += 12
        elif 'a' in am_pm and hour == 12:
            hour = 0
        
        print(f"Extracted time: {hour:02d}:{minute:02d}")
    else:
        hour, minute = 9, 0  # Default time: 9:00 AM
        print(f"No time found, using default: {hour:02d}:{minute:02d}")
    
    # Date patterns
    result_date = None
    
    # Check for relative dates
    if re.search(r'\btoday\b', text, re.IGNORECASE):
        result_date = today
        print("Found: today")
    elif re.search(r'\btomorrow\b', text, re.IGNORECASE):
        result_date = today + timedelta(days=1)
        print("Found: tomorrow")
    elif re.search(r'\bnext week\b', text, re.IGNORECASE):
        result_date = today + timedelta(weeks=1)
        print("Found: next week")
    
    # Check for day names
    if not result_date:
        days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        for i, day in enumerate(days):
            if re.search(rf'\b{day}\b', text, re.IGNORECASE):
                days_ahead = (i - today.weekday()) % 7
                if days_ahead == 0:  # If it's the same day of week, assume next week
                    days_ahead = 7
                result_date = today + timedelta(days=days_ahead)
                print(f"Found day: {day}, {days_ahead} days ahead")
                break
    
    # Check for specific dates
    if not result_date:
        # Month names with day (e.g., "June 5th", "December 25")
        month_pattern = r'\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+(\d{1,2})(?:st|nd|rd|th)?\b'
        month_match = re.search(month_pattern, text, re.IGNORECASE)
        
        if month_match:
            month_name = month_match.group(1).lower()
            day = int(month_match.group(2))
            
            months = ['january', 'february', 'march', 'april', 'may', 'june',
                     'july', 'august', 'september', 'october', 'november', 'december']
            month = months.index(month_name) + 1
            
            # Determine year - use current year, but if date is >30 days in past, assume next year
            year = now.year
            try:
                candidate_date = now.replace(year=year, month=month, day=day, hour=0, minute=0, second=0, microsecond=0)
                if candidate_date < now - timedelta(days=30):
                    year += 1
                    candidate_date = now.replace(year=year, month=month, day=day, hour=0, minute=0, second=0, microsecond=0)
                result_date = candidate_date
                print(f"Found specific date: {month_name} {day}, {year}")
            except ValueError:
                print(f"Invalid date: {month_name} {day}")
        
        # Numeric date formats (e.g., "1/15", "12/25")
        if not result_date:
            date_pattern = r'\b(\d{1,2})/(\d{1,2})\b'
            date_match = re.search(date_pattern, text)
            
            if date_match:
                month = int(date_match.group(1))
                day = int(date_match.group(2))
                year = now.year
                
                try:
                    candidate_date = now.replace(year=year, month=month, day=day, hour=0, minute=0, second=0, microsecond=0)
                    if candidate_date < now - timedelta(days=30):
                        year += 1
                        candidate_date = now.replace(year=year, month=month, day=day, hour=0, minute=0, second=0, microsecond=0)
                    result_date = candidate_date
                    print(f"Found numeric date: {month}/{day}/{year}")
                except ValueError:
                    print(f"Invalid numeric date: {month}/{day}")
    
    # If no date found, use today
    if not result_date:
        result_date = today
        print("No date found, using today")
    
    # Combine date and time in user's timezone
    final_datetime = result_date.replace(hour=hour, minute=minute, second=0, microsecond=0)
    
    # Convert to UTC for storage
    if final_datetime.tzinfo is None:
        # If no timezone info, assume it's in user's timezone
        final_datetime = final_datetime.replace(tzinfo=user_tz)
    
    final_datetime_utc = final_datetime.astimezone(timezone.utc)
    
    print(f"Final datetime in user timezone: {final_datetime}")
    print(f"Final datetime in UTC: {final_datetime_utc}")
    
    return final_datetime_utc

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
            
    async def extract_tasks(self, transcription: str, timezone_offset_minutes: Optional[int] = None) -> List[TaskCreate]:
        """
        Extract tasks from transcription text using OpenAI API
        
        Args:
            transcription: The transcribed text
            timezone_offset_minutes: User's timezone offset in minutes from UTC
        """
        print(f"Extracting tasks from transcription: {transcription}")
        print(f"User timezone offset: {timezone_offset_minutes} minutes")
        
        if not transcription or len(transcription.strip()) < 3:
            return []

        try:
            # Enhanced prompt for better task extraction including dates/times
            prompt = f"""
            Extract tasks from the following transcription. For each task, identify:
            1. The task title/description
            2. Any due date or time mentioned
            3. The status (assume "To Do" unless explicitly mentioned as done/complete)

            Transcription: "{transcription}"

            Return a JSON array of objects with this exact format:
            [
                {{
                    "title": "task description",
                    "status": "To Do",
                    "due_date_text": "extracted date/time text or null"
                }}
            ]

            Important rules:
            - Extract ALL tasks mentioned, even if multiple
            - Keep task titles concise but descriptive
            - For due_date_text, extract the exact date/time phrase from transcription (e.g., "tomorrow at 3 PM", "June 5th", "today")
            - If no date/time mentioned, set due_date_text to null
            - Status should be "To Do" unless explicitly stated as completed
            """

            response = client.chat.completions.create(
                model="gpt-4",
                messages=[
                    {"role": "system", "content": "You are a helpful assistant that extracts structured task information from voice transcriptions. Always return valid JSON."},
                    {"role": "user", "content": prompt}
                ],
                temperature=0.1,
                max_tokens=500
            )

            content = response.choices[0].message.content
            print(f"OpenAI response: {content}")

            # Parse JSON response
            try:
                tasks_data = json.loads(content)
            except json.JSONDecodeError as e:
                print(f"JSON decode error: {e}")
                print(f"Raw content: {content}")
                # Try to extract JSON from content if it's wrapped in markdown
                import re
                json_match = re.search(r'```(?:json)?\s*(\[.*?\])\s*```', content, re.DOTALL)
                if json_match:
                    tasks_data = json.loads(json_match.group(1))
                else:
                    return []

            tasks = []
            for task_data in tasks_data:
                title = task_data.get("title", "").strip()
                status = task_data.get("status", "To Do").strip()
                due_date_text = task_data.get("due_date_text")
                
                if not title:
                    continue
                    
                # Parse due date if present
                due_date = None
                if due_date_text:
                    due_date = parse_date_from_text(due_date_text, timezone_offset_minutes)
                    print(f"Task '{title}' - due_date_text: '{due_date_text}' -> parsed: {due_date}")
                
                # Create task
                task = TaskCreate(
                    title=title,
                    status=status,
                    due_date=due_date
                )
                tasks.append(task)
                print(f"Created task: {task}")

            return tasks

        except Exception as e:
            print(f"Error in extract_tasks: {str(e)}")
            print(f"Traceback: {traceback.format_exc()}")
            return [] 