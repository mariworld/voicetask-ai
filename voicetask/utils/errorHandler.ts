import { Alert } from 'react-native';
import axios from 'axios';

export interface ErrorDetails {
  title: string;
  message: string;
  isRetryable: boolean;
  actions?: Array<{ text: string; onPress: () => void }>;
}

/**
 * Parse error and return user-friendly error details
 */
export function parseError(error: unknown): ErrorDetails {
  // Check if it's an axios error
  if (axios.isAxiosError(error)) {
    const status = error.response?.status;
    const errorData = error.response?.data;

    // Network errors
    if (error.message?.includes('Network Error') || error.code === 'ECONNABORTED') {
      return {
        title: 'Connection Error',
        message: 'Unable to connect to the server. Please check your internet connection and try again.',
        isRetryable: true,
      };
    }

    // Timeout errors
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        title: 'Request Timeout',
        message: 'The request took too long. Please check your connection and try again.',
        isRetryable: true,
      };
    }

    // Handle specific HTTP status codes
    switch (status) {
      case 401:
        return {
          title: 'Authentication Error',
          message: 'Your session has expired. Please log in again.',
          isRetryable: false,
        };
      case 403:
        return {
          title: 'Access Denied',
          message: 'You don\'t have permission to perform this action.',
          isRetryable: false,
        };
      case 404:
        return {
          title: 'Not Found',
          message: 'The requested resource was not found.',
          isRetryable: false,
        };
      case 413:
        return {
          title: 'File Too Large',
          message: 'The audio file is too large. Please record a shorter message.',
          isRetryable: false,
        };
      case 422:
        return {
          title: 'Invalid Data',
          message: errorData?.detail || 'The data provided is invalid. Please try again.',
          isRetryable: false,
        };
      case 429:
        return {
          title: 'Too Many Requests',
          message: 'You\'ve made too many requests. Please wait a moment and try again.',
          isRetryable: true,
        };
      case 500:
      case 502:
      case 503:
      case 504:
        return {
          title: 'Server Error',
          message: 'The server encountered an error. Please try again in a moment.',
          isRetryable: true,
        };
      default:
        return {
          title: 'Error',
          message: errorData?.detail || error.message || 'An unexpected error occurred.',
          isRetryable: true,
        };
    }
  }

  // Handle Error instances
  if (error instanceof Error) {
    // Check for specific error messages
    if (error.message.includes('No authentication token')) {
      return {
        title: 'Not Logged In',
        message: 'Please log in to use this feature.',
        isRetryable: false,
      };
    }

    if (error.message.includes('Audio file does not exist')) {
      return {
        title: 'Recording Error',
        message: 'The audio file could not be found. Please try recording again.',
        isRetryable: true,
      };
    }

    if (error.message.includes('Permission')) {
      return {
        title: 'Permission Required',
        message: error.message,
        isRetryable: false,
      };
    }

    return {
      title: 'Error',
      message: error.message,
      isRetryable: true,
    };
  }

  // Fallback for unknown errors
  return {
    title: 'Unknown Error',
    message: 'An unexpected error occurred. Please try again.',
    isRetryable: true,
  };
}

/**
 * Show error alert with optional retry button
 */
export function showErrorAlert(
  error: unknown,
  onRetry?: () => void,
  onCancel?: () => void
): void {
  const errorDetails = parseError(error);
  const buttons: Array<{ text: string; onPress?: () => void; style?: 'default' | 'cancel' | 'destructive' }> = [];

  if (onCancel) {
    buttons.push({ text: 'Cancel', style: 'cancel', onPress: onCancel });
  }

  if (errorDetails.isRetryable && onRetry) {
    buttons.push({ text: 'Retry', onPress: onRetry });
  } else {
    buttons.push({ text: 'OK' });
  }

  Alert.alert(errorDetails.title, errorDetails.message, buttons);
}

/**
 * Retry a function with exponential backoff
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  initialDelay: number = 1000
): Promise<T> {
  let lastError: unknown;

  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      const errorDetails = parseError(error);

      // Don't retry if error is not retryable
      if (!errorDetails.isRetryable) {
        throw error;
      }

      // If this was the last attempt, throw the error
      if (attempt === maxRetries - 1) {
        throw error;
      }

      // Wait before retrying with exponential backoff
      const delay = initialDelay * Math.pow(2, attempt);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
