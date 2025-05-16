// Test script for frontend API connection
const fetch = require('node-fetch');

const API_BASE_URL = 'http://127.0.0.1:8003';

// Test the voice test endpoints from our frontend perspective
async function testVoiceApi() {
  try {
    console.log('Testing voice API from frontend perspective...');
    
    // Test the extract tasks endpoint
    const transcription = "Create a task to test the API connection";
    const response = await fetch(
      `${API_BASE_URL}/api/v1/voice/extract-tasks-test?transcription=${encodeURIComponent(transcription)}`, 
      { method: 'POST' }
    );
    
    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }
    
    const tasks = await response.json();
    console.log('Task extraction result from frontend perspective:', tasks);
    
    // Verify the response format matches what our frontend expects
    if (Array.isArray(tasks) && tasks.length > 0 && tasks[0].title && tasks[0].status) {
      console.log('✅ Response format is valid for frontend integration');
    } else {
      console.log('❌ Response format may not be compatible with frontend expectations');
    }
    
    return tasks;
  } catch (error) {
    console.error('Test failed:', error.message);
    return null;
  }
}

// Run all tests
async function runTests() {
  await testVoiceApi();
  console.log('\nConnection test complete. If all tests passed, the frontend should be able to connect to the backend API.');
}

runTests(); 