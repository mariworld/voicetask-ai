#!/bin/bash

# Create .env file
cat > .env << EOL
# OpenAI API
OPENAI_API_KEY=your_openai_api_key
EOL

echo ".env file created. Please update it with your actual OpenAI API key." 