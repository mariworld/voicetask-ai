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
  return 'http://localhost:8001';
})();

// Types
interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done';
  created_at?: string;
  updated_at?: string;
  user_id?: string;
  due_date?: string; // ISO date string
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
  async createTask(
    title: string, 
    status: 'To Do' | 'In Progress' | 'Done' = 'To Do',
    due_date?: string
  ): Promise<Task> {
    const token = getToken();
    if (!token) throw new Error('Authentication required');

    const body: any = {
      title,
      status,
    };

    if (due_date) {
      body.due_date = due_date;
    }

    const response = await fetch(`${API_BASE_URL}/api/v1/tasks/`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(body),
    });
    return handleResponse(response);
  },

  // Update a task
  async updateTask(
    id: string, 
    updates: { 
      title?: string; 
      status?: 'To Do' | 'In Progress' | 'Done';
      due_date?: string;
    }
  ): Promise<Task> {
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

// Date parsing utility
const parseDateFromText = (text: string): string | null => {
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  
  // Convert to lowercase for easier matching
  const lowerText = text.toLowerCase();
  
  // Time patterns - improved to handle "p.m." and "a.m."
  const timeRegex = /(\d{1,2}):?(\d{2})?\s*(a\.?m\.?|p\.?m\.?)/i;
  const timeMatch = lowerText.match(timeRegex);
  
  let hours = 0;
  let minutes = 0;
  
  if (timeMatch) {
    hours = parseInt(timeMatch[1]);
    minutes = timeMatch[2] ? parseInt(timeMatch[2]) : 0;
    
    // Handle AM/PM
    if (timeMatch[3]) {
      const ampm = timeMatch[3].toLowerCase().replace(/\./g, '');
      if (ampm === 'pm' && hours !== 12) {
        hours += 12;
      } else if (ampm === 'am' && hours === 12) {
        hours = 0;
      }
    }
  }
  
  let targetDate = new Date(today);
  
  // Date patterns
  if (lowerText.includes('today')) {
    // Already set to today
  } else if (lowerText.includes('tomorrow')) {
    targetDate.setDate(today.getDate() + 1);
  } else if (lowerText.includes('monday')) {
    const daysUntilMonday = (1 - today.getDay() + 7) % 7;
    targetDate.setDate(today.getDate() + (daysUntilMonday === 0 ? 7 : daysUntilMonday));
  } else if (lowerText.includes('tuesday')) {
    const daysUntilTuesday = (2 - today.getDay() + 7) % 7;
    targetDate.setDate(today.getDate() + (daysUntilTuesday === 0 ? 7 : daysUntilTuesday));
  } else if (lowerText.includes('wednesday')) {
    const daysUntilWednesday = (3 - today.getDay() + 7) % 7;
    targetDate.setDate(today.getDate() + (daysUntilWednesday === 0 ? 7 : daysUntilWednesday));
  } else if (lowerText.includes('thursday')) {
    const daysUntilThursday = (4 - today.getDay() + 7) % 7;
    targetDate.setDate(today.getDate() + (daysUntilThursday === 0 ? 7 : daysUntilThursday));
  } else if (lowerText.includes('friday')) {
    const daysUntilFriday = (5 - today.getDay() + 7) % 7;
    targetDate.setDate(today.getDate() + (daysUntilFriday === 0 ? 7 : daysUntilFriday));
  } else if (lowerText.includes('saturday')) {
    const daysUntilSaturday = (6 - today.getDay() + 7) % 7;
    targetDate.setDate(today.getDate() + (daysUntilSaturday === 0 ? 7 : daysUntilSaturday));
  } else if (lowerText.includes('sunday')) {
    const daysUntilSunday = (0 - today.getDay() + 7) % 7;
    targetDate.setDate(today.getDate() + (daysUntilSunday === 0 ? 7 : daysUntilSunday));
  } else if (lowerText.includes('next week')) {
    targetDate.setDate(today.getDate() + 7);
  } else {
    // Check for specific date patterns like "january 15th", "jan 15", "1/15", etc.
    const datePatterns = [
      /(\d{1,2})\/(\d{1,2})(?:\/(\d{2,4}))?/, // MM/DD or MM/DD/YYYY
      /(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})(?:st|nd|rd|th)?/i, // Handle ordinal numbers
    ];
    
    let dateFound = false;
    for (const pattern of datePatterns) {
      const match = lowerText.match(pattern);
      if (match) {
        if (pattern.source.includes('january')) {
          // Month name pattern
          const months = {
            'january': 0, 'jan': 0, 'february': 1, 'feb': 1, 'march': 2, 'mar': 2,
            'april': 3, 'apr': 3, 'may': 4, 'june': 5, 'jun': 5,
            'july': 6, 'jul': 6, 'august': 7, 'aug': 7, 'september': 8, 'sep': 8,
            'october': 9, 'oct': 9, 'november': 10, 'nov': 10, 'december': 11, 'dec': 11
          };
          const month = months[match[1].toLowerCase() as keyof typeof months];
          const day = parseInt(match[2]);
          targetDate = new Date(now.getFullYear(), month, day);
          
          // If the date has passed this year, assume next year
          if (targetDate < now) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
        } else {
          // MM/DD pattern
          const month = parseInt(match[1]) - 1; // JavaScript months are 0-indexed
          const day = parseInt(match[2]);
          const year = match[3] ? parseInt(match[3]) : now.getFullYear();
          targetDate = new Date(year, month, day);
          
          // If the date has passed this year, assume next year (for MM/DD without year)
          if (!match[3] && targetDate < now) {
            targetDate.setFullYear(now.getFullYear() + 1);
          }
        }
        dateFound = true;
        break;
      }
    }
    
    // If no specific date pattern found and there's a time, assume today
    if (!dateFound && !timeMatch) {
      return null; // No date or time information found
    }
  }
  
  // Set the time if found
  if (timeMatch) {
    targetDate.setHours(hours, minutes, 0, 0);
  } else {
    // If no time specified, set to 9 AM as default
    targetDate.setHours(9, 0, 0, 0);
  }
  
  // Return ISO string
  return targetDate.toISOString();
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
    const result = await handleResponse(response);
    
    // If the result contains transcription, parse due dates and update tasks
    if (result.transcription && result.tasks) {
      const dueDate = parseDateFromText(result.transcription);
      return result.tasks.map((task: Task) => ({
        ...task,
        due_date: dueDate || task.due_date,
      }));
    }
    
    return result;
  },

  // Create tasks from voice transcription with due date parsing
  async createTasksFromVoice(transcription: string, taskTitles: string[]): Promise<Task[]> {
    const dueDate = parseDateFromText(transcription);
    const createdTasks: Task[] = [];
    
    for (const title of taskTitles) {
      try {
        const task = await taskService.createTask(title, 'To Do', dueDate || undefined);
        createdTasks.push(task);
      } catch (error) {
        console.error(`Failed to create task: ${title}`, error);
      }
    }
    
    return createdTasks;
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
      
      const tasks = await response.json();
      
      // Return tasks as-is since the backend now handles due date parsing
      return tasks;
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