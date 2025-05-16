// Test script for API connection
const fetch = require('node-fetch');
const fs = require('fs');
const FormData = require('form-data');

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8003';

// Test the API health endpoint
async function testApiHealth() {
  try {
    console.log('Testing API health...');
    const response = await fetch(`${API_BASE_URL}/`);
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Health check result:', data);
    return data;
  } catch (error) {
    console.error('Health check failed:', error.message);
    return null;
  }
}

// Test the voice transcription test endpoint
async function testTranscriptionEndpoint() {
  try {
    console.log('Testing transcription endpoint...');
    
    // Check if we have a test audio file
    if (!fs.existsSync('./Test audio.m4a')) {
      console.error('Test audio file not found. Skipping transcription test.');
      return null;
    }
    
    // Create FormData and append audio file
    const formData = new FormData();
    formData.append('audio', fs.createReadStream('./Test audio.m4a'));
    
    const response = await fetch(`${API_BASE_URL}/api/v1/voice/transcribe-test`, {
      method: 'POST',
      body: formData,
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Transcription test result:', data);
    return data;
  } catch (error) {
    console.error('Transcription test failed:', error.message);
    return null;
  }
}

// Test task extraction endpoint
async function testTaskExtraction() {
  try {
    console.log('Testing task extraction endpoint...');
    const transcription = "Create a task to test the API connection";
    const response = await fetch(`${API_BASE_URL}/api/v1/voice/extract-tasks-test?transcription=${encodeURIComponent(transcription)}`, {
      method: 'POST',
    });
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const data = await response.json();
    console.log('Task extraction test result:', data);
    return data;
  } catch (error) {
    console.error('Task extraction test failed:', error.message);
    return null;
  }
}

// Run all tests
async function runTests() {
  await testApiHealth();
  await testTranscriptionEndpoint();
  await testTaskExtraction();
}

runTests(); 