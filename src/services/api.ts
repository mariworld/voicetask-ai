// API base URL - change this to your deployed API URL when deploying to production
const API_BASE_URL = (() => {
  // First, check for environment variable
  if (process.env.NEXT_PUBLIC_API_URL) {
    const apiUrl = process.env.NEXT_PUBLIC_API_URL;
    
    // Fix malformed URLs that are missing a hostname (e.g., http://:8003)
    if (apiUrl.match(/^https?:\/\/:/)) {
      return apiUrl.replace(/^(https?:\/\/)(:)/, '$1localhost$2');
    }
    
    return apiUrl;
  }
  
  // Default fallback when no environment variable is set
  return 'http://localhost:8003';
})();

// Types
interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done';
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
}

interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

// Helper function for handling API responses
const handleResponse = async (response: Response) => {
  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(
      errorData?.detail || `API error: ${response.status} ${response.statusText}`
    );
  }
  return response.json();
};

// Helper function to get the auth token from localStorage
const getToken = () => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('auth_token');
};

// Authentication Services
export const authService = {
  // Register a new user
  async register(email: string, password: string, fullName?: string) {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
        full_name: fullName,
      }),
    });
    return handleResponse(response);
  },

  // Login user
  async login(email: string, password: string): Promise<AuthResponse> {
    const response = await fetch(`${API_BASE_URL}/api/v1/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email,
        password,
      }),
    });
    const data = await handleResponse(response);
    // Store the token in localStorage for future requests
    if (data.access_token) {
      localStorage.setItem('auth_token', data.access_token);
      localStorage.setItem('user', JSON.stringify(data.user));
    }
    return data;
  },

  // Logout user
  logout() {
    localStorage.removeItem('auth_token');
    localStorage.removeItem('user');
  },

  // Check if user is logged in
  isLoggedIn() {
    return !!getToken();
  },

  // Get current user
  getCurrentUser(): User | null {
    if (typeof window === 'undefined') return null;
    const userStr = localStorage.getItem('user');
    if (!userStr) return null;
    try {
      return JSON.parse(userStr);
    } catch (e) {
      return null;
    }
  },
};

// Task Services
export const taskService = {
  // Get all tasks
  async getTasks(status?: string): Promise<Task[]> {
    const token = getToken();
    if (!token) throw new Error('Authentication required');

    const url = status
      ? `${API_BASE_URL}/api/v1/tasks/?status=${encodeURIComponent(status)}`
      : `${API_BASE_URL}/api/v1/tasks/`;

    const response = await fetch(url, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
    return handleResponse(response);
  },

  // Create a new task
  async createTask(title: string, status: 'To Do' | 'In Progress' | 'Done' = 'To Do'): Promise<Task> {
    const token = getToken();
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/api/v1/tasks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({
        title,
        status,
      }),
    });
    return handleResponse(response);
  },

  // Update a task
  async updateTask(id: string, updates: { title?: string; status?: 'To Do' | 'In Progress' | 'Done' }): Promise<Task> {
    const token = getToken();
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(updates),
    });
    return handleResponse(response);
  },

  // Delete a task
  async deleteTask(id: string): Promise<void> {
    const token = getToken();
    if (!token) throw new Error('Authentication required');

    const response = await fetch(`${API_BASE_URL}/api/v1/tasks/${id}`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(
        errorData?.detail || `API error: ${response.status} ${response.statusText}`
      );
    }
  },
};

// Voice Services
export const voiceService = {
  // Process voice recording into tasks
  async processVoice(audioBlob: Blob): Promise<Task[]> {
    const token = getToken();
    if (!token) throw new Error('Authentication required');

    const formData = new FormData();
    const filename = `recording.${getFileExtension(audioBlob.type)}`;
    formData.append('audio', audioBlob, filename);

    const response = await fetch(`${API_BASE_URL}/api/v1/voice/process`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    return handleResponse(response);
  },

  // Transcribe voice without authentication (test endpoint)
  async transcribeTest(audioBlob: Blob): Promise<string> {
    const formData = new FormData();
    const filename = `recording.${getFileExtension(audioBlob.type)}`;
    formData.append('audio', audioBlob, filename);

    try {
      const response = await fetch(`${API_BASE_URL}/api/v1/voice/transcribe-test`, {
        method: 'POST',
        body: formData,
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to transcribe audio: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  },

  // Extract tasks from transcription without authentication (test endpoint)
  async extractTasksTest(transcription: string): Promise<Task[]> {
    try {
      const response = await fetch(
        `${API_BASE_URL}/api/v1/voice/extract-tasks-test?transcription=${encodeURIComponent(transcription)}`,
        {
          method: 'POST',
        }
      );
      
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Failed to extract tasks: ${response.status} ${response.statusText}`);
      }
      
      const result = await response.json();
      return result;
    } catch (error) {
      throw error;
    }
  },
};

// Helper to get file extension from MIME type
function getFileExtension(mimeType: string): string {
  switch(mimeType) {
    case 'audio/webm':
      return 'webm';
    case 'audio/mp4':
      return 'm4a';
    case 'audio/mpeg':
      return 'mp3';
    case 'audio/wav':
    case 'audio/x-wav':
      return 'wav';
    case 'audio/ogg':
      return 'ogg';
    default:
      // Default based on user agent detection
      const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
      const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
      return (isIOS || isSafari) ? 'm4a' : 'webm';
  }
} 