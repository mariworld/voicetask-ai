"use client";

import { useState, useRef, useEffect } from 'react';

interface RecordButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

const RecordButton = ({ onRecordingComplete }: RecordButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [permissionAttempted, setPermissionAttempted] = useState(false);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  
  // Detect browser capabilities
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  const isSecureContext = typeof window !== 'undefined' && 
    (window.location.protocol === 'https:' || 
     window.location.hostname === 'localhost' || 
     window.location.hostname === '127.0.0.1' ||
     window.location.hostname.includes('192.168.'));
  
  // Check if getUserMedia is available
  const hasGetUserMedia = typeof navigator !== 'undefined' && 
    (navigator.mediaDevices?.getUserMedia || 
     (navigator as any).webkitGetUserMedia || 
     (navigator as any).mozGetUserMedia);
  
  // Better detection for mobile browsers
  const isMobile = typeof navigator !== 'undefined' && 
    (/Android/i.test(navigator.userAgent) || 
     /iPhone|iPad|iPod/i.test(navigator.userAgent));
  
  // Check and request microphone permissions
  useEffect(() => {
    async function setupAudioCapture() {
      setIsLoading(true);
      setError(null);
      
      // Log what's available for debugging
      console.log(`Browser detection: iOS=${isIOS}, Safari=${isSafari}, Mobile=${isMobile}, Secure=${isSecureContext}`);
      console.log('Navigator media capabilities:', {
        mediaDevices: !!navigator.mediaDevices,
        getUserMedia: !!navigator.mediaDevices?.getUserMedia,
        webkitGetUserMedia: !!(navigator as any).webkitGetUserMedia,
        mozGetUserMedia: !!(navigator as any).mozGetUserMedia
      });
      console.log('Current protocol:', window.location.protocol);
      
      try {
        // Check if we're in a browser with the required APIs
        if (typeof window === 'undefined' || typeof navigator === 'undefined') {
          throw new Error('Running in a non-browser environment');
        }
        
        // Check for secure context (required for getUserMedia)
        if (!isSecureContext) {
          throw new Error('getUserMedia requires a secure context (HTTPS)');
        }
        
        // Check if getUserMedia is available at all
        if (!hasGetUserMedia) {
          throw new Error('getUserMedia API is not available in this browser');
        }
        
        // For Safari on iOS, we need a workaround
        let getUserMediaFn;
        
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          getUserMediaFn = navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
        } else if ((navigator as any).webkitGetUserMedia) {
          // Safari/WebKit specific
          getUserMediaFn = (constraints: MediaStreamConstraints) => {
            return new Promise<MediaStream>((resolve, reject) => {
              (navigator as any).webkitGetUserMedia(constraints, resolve, reject);
            });
          };
        } else if ((navigator as any).mozGetUserMedia) {
          // Firefox specific
          getUserMediaFn = (constraints: MediaStreamConstraints) => {
            return new Promise<MediaStream>((resolve, reject) => {
              (navigator as any).mozGetUserMedia(constraints, resolve, reject);
            });
          };
        } else {
          throw new Error('No getUserMedia implementation available');
        }
        
        // Try to get permission
        let stream;
        try {
          // Request access with minimal constraints for higher success rate
          stream = await getUserMediaFn({ 
            audio: true,
            video: false
          });
          setPermissionAttempted(true);
        } catch (err) {
          if (isIOS && isSafari) {
            console.warn('First iOS permission attempt failed, trying with basic constraints');
            // iOS Safari sometimes needs a simpler constraint object
            stream = await getUserMediaFn({ audio: true });
            setPermissionAttempted(true);
          } else {
            throw err;
          }
        }
        
        if (!stream) {
          throw new Error('Failed to get audio stream');
        }
        
        // We got a stream, now stop it (we just wanted to check permission)
        if (stream.getTracks) {
          stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }
        
        // Successfully got permission
        setHasPermission(true);
      } catch (err) {
        console.error('Microphone setup error:', err);
        setPermissionAttempted(true);
        
        // Show appropriate error messages based on the error
        if (err instanceof DOMException && err.name === 'NotAllowedError') {
          setError('Microphone access denied. Please allow access in your browser settings.');
        } else if (err instanceof DOMException && err.name === 'NotFoundError') {
          setError('No microphone detected. Please connect a microphone and try again.');
        } else if (!isSecureContext) {
          setError('Microphone access requires a secure connection (HTTPS). For mobile browsers, try accessing via HTTPS.');
        } else if (isMobile && window.location.protocol !== 'https:') {
          setError('Mobile browsers require HTTPS for microphone access. Please use a secure connection.');
        } else if (!hasGetUserMedia) {
          setError('Your browser does not support microphone access. Please try a different browser.');
        } else {
          setError(`Microphone error: ${err instanceof Error ? err.message : 'Unknown issue'}. Try reloading the page.`);
        }
        
        setHasPermission(false);
      } finally {
        setIsLoading(false);
      }
    }
    
    setupAudioCapture();
    
    // Clean up function
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track: MediaStreamTrack) => track.stop());
      }
    };
  }, [hasGetUserMedia, isIOS, isSafari, isSecureContext, isMobile]);
  
  const startRecording = async () => {
    try {
      setError(null);
      audioChunksRef.current = [];
      setAudioUrl(null);
      
      // Get a fresh stream - try different approaches based on browser
      let stream;
      let attempts = 0;
      const maxAttempts = 2;
      
      while (!stream && attempts < maxAttempts) {
        attempts++;
        console.log(`Audio capture attempt ${attempts}/${maxAttempts}`);
        
        try {
          if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            // Modern approach
            const constraints = attempts === 1 
              ? { audio: { echoCancellation: true, noiseSuppression: true } }
              : { audio: true }; // Simpler fallback
              
            console.log(`Using mediaDevices.getUserMedia with constraints:`, constraints);
            stream = await navigator.mediaDevices.getUserMedia(constraints);
          } else if ((navigator as any).webkitGetUserMedia) {
            // Safari fallback
            console.log('Using webkitGetUserMedia');
            stream = await new Promise<MediaStream>((resolve, reject) => {
              (navigator as any).webkitGetUserMedia({ audio: true }, resolve, reject);
            });
          } else {
            throw new Error('No getUserMedia method available');
          }
        } catch (err) {
          console.warn(`Attempt ${attempts} failed:`, err);
          if (attempts >= maxAttempts) throw err;
        }
      }
      
      if (!stream) {
        throw new Error('Failed to access microphone after multiple attempts');
      }
      
      streamRef.current = stream;
      
      // Set up MediaRecorder with options appropriate for the browser
      const options: MediaRecorderOptions = {};
      
      // MIME type selection based on browser
      if (isIOS || isSafari) {
        // Safari prefers these formats
        if (MediaRecorder.isTypeSupported('audio/mp4')) {
          options.mimeType = 'audio/mp4';
        }
      } else {
        // Chrome and Firefox prefer these formats
        if (MediaRecorder.isTypeSupported('audio/webm')) {
          options.mimeType = 'audio/webm';
        } else if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
          options.mimeType = 'audio/webm;codecs=opus';
        }
      }
      
      // Create MediaRecorder with appropriate options
      console.log(`Creating MediaRecorder with options:`, options);
      const mediaRecorder = new MediaRecorder(stream, options);
      mediaRecorderRef.current = mediaRecorder;
      
      // Set up event handlers
      mediaRecorder.ondataavailable = (event) => {
        console.log(`Data available: size=${event.data?.size || 0}`);
        if (event.data && event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        console.log(`MediaRecorder stopped, collected ${audioChunksRef.current.length} chunks`);
        // Check if we collected any audio data
        if (audioChunksRef.current.length === 0) {
          setError('No audio data was captured. Please try again.');
          return;
        }
        
        // Create appropriate blob based on browser
        const mimeType = options.mimeType || (isIOS || isSafari ? 'audio/mp4' : 'audio/webm');
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        
        if (audioBlob.size > 0) {
          const url = URL.createObjectURL(audioBlob);
          setAudioUrl(url);
          onRecordingComplete(audioBlob);
          
          console.log(`Recording completed: size=${audioBlob.size}, type=${audioBlob.type}`);
        } else {
          setError('Recording failed - empty audio data');
        }
        
        // Release the stream
        if (stream) {
          stream.getTracks().forEach((track: MediaStreamTrack) => track.stop());
        }
      };
      
      // Start recording with frequent data collection
      mediaRecorder.start(1000); // Collect data every second
      setIsRecording(true);
      
    } catch (err) {
      console.error('Error starting recording:', err);
      setError('Failed to start recording. Please check your microphone access and try again.');
      setHasPermission(false);
    }
  };
  
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      try {
        mediaRecorderRef.current.stop();
      } catch (err) {
        console.error('Error stopping recording:', err);
        setError('Error stopping recording.');
      }
      setIsRecording(false);
    }
  };
  
  const handleRecordClick = () => {
    if (isRecording) {
      stopRecording();
    } else {
      startRecording();
    }
  };
  
  // Show loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center my-8">
        <div className="text-blue-500 mb-4">Initializing microphone...</div>
        <div className="w-20 h-20 rounded-full bg-gray-300 flex items-center justify-center animate-pulse">
          <svg 
            xmlns="http://www.w3.org/2000/svg" 
            viewBox="0 0 24 24" 
            fill="white" 
            className="w-10 h-10"
          >
            <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
            <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
          </svg>
        </div>
      </div>
    );
  }
  
  return (
    <div className="flex flex-col items-center my-8">
      {error && (
        <div className="text-red-500 mb-4 text-sm max-w-xs text-center">{error}</div>
      )}
      
      {isIOS && !permissionAttempted && (
        <div className="text-orange-500 mb-4 text-sm text-center max-w-xs">
          <p className="font-bold">iOS Safari requires you to:</p>
          <ul className="list-disc text-left pl-5 mt-1">
            <li>Tap the record button to request permission</li>
            <li>Choose "Allow" when prompted</li>
          </ul>
        </div>
      )}
      
      {isIOS && permissionAttempted && hasPermission === false && (
        <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg mb-4 text-sm text-center max-w-xs">
          <p className="font-bold text-yellow-700 mb-2">Microphone access denied</p>
          <p className="text-yellow-600 mb-2">To fix this in Safari:</p>
          <ol className="list-decimal text-left pl-5 text-yellow-600">
            <li>Tap <span className="font-mono">aA</span> in the address bar</li>
            <li>Tap "Website Settings"</li>
            <li>Enable "Microphone"</li>
            <li>Reload the page</li>
          </ol>
        </div>
      )}
      
      <button
        onClick={handleRecordClick}
        disabled={hasPermission === false}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all 
                   ${isRecording 
                     ? 'bg-red-500 scale-110' 
                     : hasPermission === false
                       ? 'bg-gray-400 cursor-not-allowed'
                       : 'bg-blue-500 hover:bg-blue-600'}`}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="white" 
          className="w-10 h-10"
        >
          {isRecording ? (
            // Square stop icon
            <rect x="6" y="6" width="12" height="12" />
          ) : (
            // Microphone icon (when not recording)
            <>
              <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
              <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
            </>
          )}
        </svg>
      </button>
      
      {audioUrl && (
        <div className="mt-4 w-full max-w-xs">
          <audio src={audioUrl} controls className="w-full" />
        </div>
      )}
    </div>
  );
};

export default RecordButton; 