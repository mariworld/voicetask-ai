import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';

// Base URL for API - change this to your actual backend URL
// For development, use your local network IP that can be accessed from your device
const API_BASE_URL = 'http://192.168.1.214:8001/api/v1'; // Updated port to 8001

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Increased timeout to 60 seconds
});

// API methods
export const apiService = {
  /**
   * Send audio for transcription
   * @param audioUri - URI of the recorded audio file
   * @returns The transcribed text
   */
  async transcribeAudio(audioUri: string): Promise<string> {
    try {
      console.log('🎙️ API: Transcribing audio from URI:', audioUri);
      
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(audioUri, { size: true, md5: true });
      console.log('🎙️ API: File info:', JSON.stringify(fileInfo, null, 2));
      
      if (!fileInfo.exists) {
        console.error('❌ API: Audio file does not exist at path:', audioUri);
        throw new Error('Audio file does not exist');
      }
      
      if (fileInfo.size === 0) {
        console.error('❌ API: Audio file is empty (0 bytes)');
        throw new Error('Audio file is empty (0 bytes)');
      }
      
      // Log additional details about the file
      console.log(`🎙️ API: Audio file size: ${fileInfo.size} bytes`);
      
      // Create form data with audio file
      const formData = new FormData();
      
      // Append file with proper URI and type
      const uriParts = audioUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1].toLowerCase();
      console.log('🎙️ API: File extension detected:', fileExtension);
      
      // Properly handle the file URI based on platform
      const fileUri = Platform.OS === 'ios' 
        ? audioUri.replace('file://', '') 
        : audioUri;
      
      console.log('🎙️ API: Platform-adjusted URI:', fileUri);
      
      // Use a more appropriate content type based on file extension
      let mimeType: string;
      switch (fileExtension) {
        case 'mp3':
          mimeType = 'audio/mpeg';
          break;
        case 'wav':
          mimeType = 'audio/wav';
          break;
        case 'm4a':
          mimeType = 'audio/m4a';
          break;
        case 'aac':
          mimeType = 'audio/aac';
          break;
        default:
          mimeType = `audio/${fileExtension}`;
      }
      
      const fileObj = {
        uri: fileUri,
        name: `recording.${fileExtension}`,
        type: mimeType,
      };
      
      console.log('🎙️ API: Appending file to form data:', fileObj);
      formData.append('audio', fileObj as any);
      
      console.log('🎙️ API: Sending request to:', `${API_BASE_URL}/voice/transcribe-test`);
      
      // For development/testing, use the test endpoint that doesn't require auth
      const response = await axios.post(
        `${API_BASE_URL}/voice/transcribe-test`, 
        formData,
        {
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'multipart/form-data',
          },
          transformRequest: (data, headers) => {
            // Return FormData object directly
            return data;
          },
          timeout: 60000, // Increased timeout to 60 seconds
        }
      );
      
      console.log('🎙️ API: Transcription response status:', response.status);
      console.log('🎙️ API: Transcription response data:', response.data);
      return response.data;
    } catch (error) {
      console.error('❌ API: Error transcribing audio:', error);
      
      // Log more details about the error
      if (axios.isAxiosError(error)) {
        console.error('❌ API: Axios error details:', {
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers,
        });
      }
      
      throw new Error(`Failed to transcribe audio: ${error}`);
    }
  },
  
  /**
   * Extract tasks from transcribed text
   * @param transcription - The transcribed text
   * @returns Array of tasks extracted from the text
   */
  async extractTasks(transcription: string) {
    try {
      console.log('Extracting tasks from:', transcription);
      
      // For development/testing, use the test endpoint that doesn't require auth
      const response = await api.post('/voice/extract-tasks-test', {
        transcription: transcription
      });
      
      console.log('Extracted tasks:', response.data);
      return response.data;
    } catch (error) {
      console.error('Error extracting tasks:', error);
      throw new Error('Failed to extract tasks from transcription');
    }
  },
  
  /**
   * Process audio to extract tasks in one call
   * @param audioUri - URI of the recorded audio file
   * @returns Array of created tasks
   */
  async processVoice(audioUri: string) {
    try {
      // Get file info
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      
      if (!fileInfo.exists) {
        throw new Error('Audio file does not exist');
      }
      
      // Create form data with audio file
      const formData = new FormData();
      
      // Append file with proper URI and type
      const uriParts = audioUri.split('.');
      const fileExtension = uriParts[uriParts.length - 1];
      
      // Properly handle the file URI based on platform
      const fileUri = Platform.OS === 'ios' 
        ? audioUri.replace('file://', '') 
        : audioUri;
      
      formData.append('audio', {
        uri: fileUri,
        name: `recording.${fileExtension}`,
        type: `audio/${fileExtension === 'mp3' ? 'mpeg' : fileExtension}`,
      } as any);

      // Note: This endpoint requires authentication in the backend
      // For now, we're focusing on transcription without auth
      const response = await axios.post(
        `${API_BASE_URL}/voice/process`, 
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
            // Authentication would be added here
          },
        }
      );
      
      return response.data;
    } catch (error) {
      console.error('Error processing voice:', error);
      throw new Error('Failed to process voice recording');
    }
  }
}; 