import axios from 'axios';
import { Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Base URL for API - change this to your actual backend URL
// For development, use your local network IP that can be accessed from your device
const API_BASE_URL = 'http://192.168.1.214:8001/api/v1'; // Updated port to 8001

// Token storage key
const AUTH_TOKEN_KEY = 'auth_token';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 60000, // Increased timeout to 60 seconds
  maxRedirects: 5, // Allow redirects and maintain headers
  withCredentials: false, // Don't send cookies (but do maintain headers)
});

// Ensure redirect behavior is consistent
api.defaults.maxRedirects = 5;

// Add an interceptor to include auth token in requests
api.interceptors.request.use(
  async (config) => {
    const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Authentication methods
export const authService = {
  /**
   * Register a new user
   */
  async register(email: string, password: string, fullName: string) {
    try {
      const response = await api.post('/auth/register', {
        email,
        password,
        full_name: fullName,
      });
      return response.data;
    } catch (error) {
      console.error('Error registering user:', error);
      throw error;
    }
  },

  /**
   * Login user and store token
   */
  async login(email: string, password: string) {
    try {
      const response = await api.post('/auth/login', {
        email,
        password,
      });
      
      // Save token to secure storage
      const { access_token } = response.data;
      await AsyncStorage.setItem(AUTH_TOKEN_KEY, access_token);
      
      return response.data;
    } catch (error) {
      console.error('Error logging in:', error);
      throw error;
    }
  },

  /**
   * Logout user and clear token
   */
  async logout() {
    try {
      await AsyncStorage.removeItem(AUTH_TOKEN_KEY);
    } catch (error) {
      console.error('Error logging out:', error);
      throw error;
    }
  },

  /**
   * Check if user is logged in
   */
  async isLoggedIn() {
    try {
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      return !!token;
    } catch (error) {
      console.error('Error checking login status:', error);
      return false;
    }
  },

  /**
   * Get the current auth token
   */
  async getToken() {
    return AsyncStorage.getItem(AUTH_TOKEN_KEY);
  },
};

// API methods
export const apiService = {
  /**
   * Send audio for transcription
   * @param audioUri - URI of the recorded audio file
   * @param useAuth - Whether to use authentication (default: true)
   * @returns The transcribed text
   */
  async transcribeAudio(audioUri: string, useAuth = true): Promise<string> {
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
      
      // Set up headers and endpoint
      const headers: Record<string, string> = {
        'Accept': 'application/json',
        'Content-Type': 'multipart/form-data',
      };
      
      // Add auth token if needed
      if (useAuth) {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (token) {
          headers['Authorization'] = `Bearer ${token}`;
        }
        
        console.log('🎙️ API: Using authenticated endpoint for transcription');
        console.log('🎙️ API: Sending request to:', `${API_BASE_URL}/voice/transcribe`);
        
        // Authenticated endpoint
        const response = await axios.post(
          `${API_BASE_URL}/voice/transcribe`, 
          formData,
          {
            headers,
            transformRequest: (data, headers) => {
              // Return FormData object directly
              return data;
            },
            timeout: 60000,
          }
        );
        
        console.log('🎙️ API: Transcription response status:', response.status);
        console.log('🎙️ API: Transcription response data:', response.data);
        return response.data;
      } else {
        // Use test endpoint without auth
        console.log('🎙️ API: Using test endpoint for transcription');
        console.log('🎙️ API: Sending request to:', `${API_BASE_URL}/voice/transcribe-test`);
        
        const response = await axios.post(
          `${API_BASE_URL}/voice/transcribe-test`, 
          formData,
          {
            headers,
            transformRequest: (data, headers) => {
              // Return FormData object directly
              return data;
            },
            timeout: 60000,
          }
        );
        
        console.log('🎙️ API: Transcription response status:', response.status);
        console.log('🎙️ API: Transcription response data:', response.data);
        return response.data;
      }
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
   * @param useAuth - Whether to use authentication (default: true)
   * @returns Array of tasks extracted from the text
   */
  async extractTasks(transcription: string, useAuth = true) {
    try {
      console.log('Extracting tasks from:', transcription);
      
      if (useAuth) {
        console.log('Using authenticated endpoint for task extraction');
        const response = await api.post('/voice/extract-tasks', transcription);
        console.log('Extracted tasks:', response.data);
        return response.data;
      } else {
        console.log('Using test endpoint for task extraction');
        const response = await api.post('/voice/extract-tasks-test', {
          transcription: transcription
        });
        console.log('Extracted tasks:', response.data);
        return response.data;
      }
    } catch (error) {
      console.error('Error extracting tasks:', error);
      throw new Error('Failed to extract tasks from transcription');
    }
  },
  
  /**
   * Process audio to extract tasks in one call
   * @param audioUri - URI of the recorded audio file
   * @param useAuth - Whether to use authentication (default: true)
   * @returns Array of created tasks
   */
  async processVoice(audioUri: string, useAuth = true) {
    try {
      console.log('🎙️ API: Processing voice from URI:', audioUri);
      
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
      
      // Get user's timezone offset (in minutes)
      const timezoneOffset = new Date().getTimezoneOffset();
      console.log('🌍 API: User timezone offset (minutes):', timezoneOffset);
      
      formData.append('audio', {
        uri: audioUri,
        type: `audio/${fileExtension}`,
        name: `recording.${fileExtension}`,
      } as any);
      
      // Add timezone offset to the request
      formData.append('timezone_offset', timezoneOffset.toString());
      
      let headers: Record<string, string> = {
        'Content-Type': 'multipart/form-data',
      };
      
      if (useAuth) {
        const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
        if (!token) {
          throw new Error('No authentication token found');
        }
        headers['Authorization'] = `Bearer ${token}`;
      }
      
      // Make API request
      const response = await api.post('/voice/process', formData, {
        headers,
        timeout: 30000, // 30 second timeout
      });
      
      console.log('🎙️ API: Raw voice processing response:', JSON.stringify(response.data, null, 2));
      
      // Map backend field names to frontend field names for newly created tasks
      const mappedTasks = response.data.map((task: any) => {
        const mapped = {
          ...task,
          dueDate: task.due_date, // Map due_date to dueDate
          completed: task.status === 'Done' // Set completed based on status
        };
        console.log(`🎙️ API: New task ${task.id} - due_date: ${task.due_date} -> dueDate: ${mapped.dueDate}`);
        return mapped;
      });
      
      console.log('🎙️ API: Final mapped new tasks:', JSON.stringify(mappedTasks, null, 2));
      
      return mappedTasks;
    } catch (error: any) {
      console.error('🎙️ API: Error processing voice:', error);
      
      // Handle different error types with more specific messages
      if (error.message?.includes('Network Error')) {
        throw new Error('Network connection failed. Please check your internet connection.');
      } else if (error.response?.status === 401) {
        throw new Error('Authentication failed. Please log in again.');
      } else if (error.response?.status === 413) {
        throw new Error('Audio file is too large. Please record a shorter message.');
      } else if (error.response?.status >= 500) {
        throw new Error('Server error. Please try again later.');
      } else {
        throw new Error(error.message || 'Failed to process voice recording');
      }
    }
  },

  /**
   * Get all tasks for the authenticated user
   * @returns Array of tasks
   */
  async getTasks() {
    try {
      console.log('🔄 API: Fetching tasks for authenticated user');
      
      // Get token directly
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Make request with explicit auth header
      const response = await api.get('/tasks/', {
        headers: {
          'Authorization': `Bearer ${token}`
        } as Record<string, string>
      });
      
      console.log('🔄 API: Raw backend response:', JSON.stringify(response.data, null, 2));
      
      // Map backend field names to frontend field names
      const mappedTasks = response.data.map((task: any) => {
        const mapped = {
          ...task,
          dueDate: task.due_date, // Map due_date to dueDate
          completed: task.status === 'Done' // Set completed based on status
        };
        console.log(`🔄 API: Task ${task.id} - due_date: ${task.due_date} -> dueDate: ${mapped.dueDate}`);
        return mapped;
      });
      
      console.log('🔄 API: Final mapped tasks:', JSON.stringify(mappedTasks, null, 2));
      
      return mappedTasks;
    } catch (error) {
      console.error('❌ API: Error fetching tasks:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ API: Axios error details:', {
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers,
        });
      }
      throw new Error('Failed to fetch tasks');
    }
  },

  /**
   * Delete a task by ID
   * @param taskId - The ID of the task to delete
   * @returns True if deletion was successful
   */
  async deleteTask(taskId: string) {
    try {
      console.log('🗑️ API: Deleting task with ID:', taskId);
      
      // Get token directly
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Make request with explicit auth header
      const response = await api.delete(`/tasks/${taskId}`, {
        headers: {
          'Authorization': `Bearer ${token}`
        } as Record<string, string>
      });
      
      console.log('🗑️ API: Task deleted successfully');
      return true;
    } catch (error) {
      console.error('❌ API: Error deleting task:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ API: Axios error details:', {
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers,
        });
      }
      throw new Error('Failed to delete task');
    }
  },

  /**
   * Update a task's status
   * @param taskId - The ID of the task to update
   * @param status - The new status
   * @returns The updated task
   */
  async updateTaskStatus(taskId: string, status: 'To Do' | 'In Progress' | 'Done') {
    try {
      console.log(`🔄 API: Updating task ${taskId} status to: ${status}`);
      
      // Get token directly
      const token = await AsyncStorage.getItem(AUTH_TOKEN_KEY);
      if (!token) {
        throw new Error('No authentication token found');
      }
      
      // Create properly typed headers
      const headers: Record<string, string> = {
        'Authorization': `Bearer ${token}`
      };
      
      // Make request with explicit auth header
      const response = await api.put(`/tasks/${taskId}`, 
        { status },
        { headers }
      );
      
      console.log('🔄 API: Task status updated successfully');
      return response.data;
    } catch (error) {
      console.error('❌ API: Error updating task status:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ API: Axios error details:', {
          response: error.response?.data,
          status: error.response?.status,
          headers: error.response?.headers,
        });
      }
      throw new Error('Failed to update task status');
    }
  }
}; 