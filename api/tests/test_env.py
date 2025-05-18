import os
from dotenv import load_dotenv

# Load environment variables from .env file
load_dotenv()

# Print the environment variables
print("Supabase URL:", os.getenv("SUPABASE_URL", "Not set"))
print("Supabase Key:", os.getenv("SUPABASE_KEY", "Not set"))
print("OpenAI API Key:", os.getenv("OPENAI_API_KEY", "Not set"))
print("Secret Key:", os.getenv("SECRET_KEY", "Not set"))

# Check if the .env file exists in the current directory
import pathlib
env_file = pathlib.Path(".env")
print(".env file exists:", env_file.exists())
if env_file.exists():
    print(".env file path:", env_file.absolute())
    print(".env file contents first line (safe to show):", env_file.read_text().split("\n")[0]) 