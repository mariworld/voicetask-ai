const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

// Define multiple possible API URLs to test
const API_URLS = [
  { name: 'Default port 8000', url: 'http://192.168.1.214:8000/api/v1' },
  { name: 'Alternative port 8001', url: 'http://192.168.1.214:8001/api/v1' },
  { name: 'Local loopback', url: 'http://127.0.0.1:8000/api/v1' },
  { name: 'Local loopback alt port', url: 'http://127.0.0.1:8001/api/v1' }
];

// Simple health check test for multiple URLs
async function testHealthCheck() {
  console.log('\n🔍 Testing server health checks on multiple ports...');
  
  let foundWorkingUrl = false;
  
  for (const api of API_URLS) {
    try {
      console.log(`\n Testing ${api.name}: ${api.url.replace('/api/v1', '')}`);
      const response = await axios.get(`${api.url.replace('/api/v1', '')}/`, {
        timeout: 5000 // 5 second timeout for health check
      });
      console.log(` ✅ Health check success for ${api.name}:`, response.data);
      foundWorkingUrl = true;
      api.working = true;
    } catch (error) {
      console.error(` ❌ Health check failed for ${api.name}:`, error.message);
      api.working = false;
      if (error.code === 'ECONNREFUSED') {
        console.error(`   The server appears to be down or unreachable at ${api.url.replace('/api/v1', '')}`);
      }
    }
  }
  
  return foundWorkingUrl;
}

// Test voice transcription endpoint with a small test file
async function testTranscription() {
  console.log('\n🔍 Testing voice transcription endpoint...');
  
  // Find the first working API URL
  const workingApis = API_URLS.filter(api => api.working);
  
  if (workingApis.length === 0) {
    console.error('❌ No working API URLs found. Skipping transcription test.');
    return;
  }
  
  for (const api of workingApis) {
    try {
      console.log(`\n Testing transcription with ${api.name}: ${api.url}/voice/transcribe-test`);
      
      // Create a form with a small test file
      const formData = new FormData();
      
      // Try to use a test audio file if it exists
      const testFile = './Test audio.m4a'; // Using the existing test file
      
      if (fs.existsSync(testFile)) {
        formData.append('audio', fs.createReadStream(testFile), {
          filename: 'test.m4a',
          contentType: 'audio/m4a'
        });
        
        console.log('📁 Using test audio file:', testFile);
        console.log('📊 File size:', fs.statSync(testFile).size, 'bytes');
        
        // Set a longer timeout for audio processing
        console.log('🕒 Sending request to transcription API (may take up to 60 seconds)...');
        const response = await axios.post(
          `${api.url}/voice/transcribe-test`,
          formData,
          {
            headers: {
              ...formData.getHeaders(),
            },
            timeout: 60000, // 60 seconds
          }
        );
        
        console.log('✅ Transcription request successful!');
        console.log('📝 Response data:', response.data);
        return true; // Return after first successful test
      } else {
        console.error('❌ Test audio file not found:', testFile);
        console.log('   Creating a test text instead...');
        
        // Test the extract tasks endpoint instead with some text
        return await testExtractTasks(api.url);
      }
    } catch (error) {
      console.error(`❌ Transcription test failed with ${api.name}:`, error.message);
      
      // Detailed error information for debugging
      if (error.response) {
        console.error('   Status:', error.response.status);
        console.error('   Response data:', error.response.data);
      } else if (error.request) {
        console.error('   No response received. Request made but no response.');
        console.error('   This could indicate a network issue or server timeout.');
      }
      
      // Common error solutions
      if (error.code === 'ECONNREFUSED') {
        console.error('   The server appears to be down or the IP address is incorrect.');
      } else if (error.message.includes('timeout')) {
        console.error('   Request timed out. The server might be slow or overloaded.');
        console.error('   Check the server logs for processing errors.');
      }
    }
  }
  
  return false;
}

// Test task extraction endpoint
async function testExtractTasks(apiUrl) {
  if (!apiUrl) {
    const workingApis = API_URLS.filter(api => api.working);
    if (workingApis.length === 0) {
      console.error('❌ No working API URLs found. Skipping task extraction test.');
      return false;
    }
    apiUrl = workingApis[0].url;
  }
  
  console.log(`\n🔍 Testing task extraction endpoint on ${apiUrl}...`);
  
  try {
    const response = await axios.post(
      `${apiUrl}/voice/extract-tasks-test`,
      {
        transcription: "I need to buy groceries today, finish the report by tomorrow, and don't forget to call mom."
      },
      {
        headers: {
          'Content-Type': 'application/json',
        },
        timeout: 30000, // 30 seconds
      }
    );
    
    console.log('✅ Task extraction successful!');
    console.log('📋 Extracted tasks:', JSON.stringify(response.data, null, 2));
    return true;
  } catch (error) {
    console.error('❌ Task extraction test failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Response data:', error.response.data);
    }
    return false;
  }
}

// Run all tests
async function runTests() {
  console.log('🧪 Starting API connection tests...');
  
  try {
    const foundServer = await testHealthCheck();
    
    if (!foundServer) {
      console.log('\n⚠️ No working API server found. Make sure the FastAPI server is running and accessible.');
      console.log('   Check for these possible issues:');
      console.log('   1. The server might be running on a different port');
      console.log('   2. There might be a network connectivity issue');
      console.log('   3. The server might be running but not responding to requests');
      console.log('\n💡 Try starting the server with: python start_api.py');
      return;
    }
    
    await testTranscription();
  } catch (error) {
    console.error('❌ Test runner error:', error.message);
  }
  
  console.log('\n🏁 API connection tests completed');
}

// Execute the tests
runTests(); 