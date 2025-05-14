"use client";

import { useState } from 'react';

interface RecordButtonProps {
  onRecordingComplete: (audioBlob: Blob) => void;
}

const RecordButton = ({ onRecordingComplete }: RecordButtonProps) => {
  const [isRecording, setIsRecording] = useState(false);
  
  const handleRecordClick = () => {
    // In a real implementation, this would start/stop actual audio recording
    // For now, we'll just toggle the recording state
    setIsRecording(!isRecording);
    
    if (isRecording) {
      // Simulate recording completion with a mock blob
      // In a real implementation, this would be the actual audio data
      const mockAudioBlob = new Blob([], { type: 'audio/webm' });
      onRecordingComplete(mockAudioBlob);
    }
  };
  
  return (
    <div className="flex justify-center my-8">
      <button
        onClick={handleRecordClick}
        className={`w-20 h-20 rounded-full flex items-center justify-center transition-all 
                    ${isRecording 
                      ? 'bg-red-500 scale-110' 
                      : 'bg-blue-500 hover:bg-blue-600'}`}
        aria-label={isRecording ? "Stop recording" : "Start recording"}
      >
        <svg 
          xmlns="http://www.w3.org/2000/svg" 
          viewBox="0 0 24 24" 
          fill="white" 
          className="w-10 h-10"
        >
          <path d="M12 15c1.66 0 3-1.34 3-3V6c0-1.66-1.34-3-3-3S9 4.34 9 6v6c0 1.66 1.34 3 3 3z" />
          <path d="M17 12c0 2.76-2.24 5-5 5s-5-2.24-5-5H5c0 3.53 2.61 6.43 6 6.92V21h2v-2.08c3.39-.49 6-3.39 6-6.92h-2z" />
        </svg>
      </button>
    </div>
  );
};

export default RecordButton; 