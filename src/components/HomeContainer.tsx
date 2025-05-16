"use client";

import { useState } from 'react';
import Header from './Header';
import RecordButton from './RecordButton';
import TabBar from './TabBar';
import TaskList from './TaskList';
import { voiceService } from '../services/api';

// Mock tasks for initial display
const MOCK_TASKS = [
  { id: '1', title: 'Complete project proposal', status: 'To Do' },
  { id: '2', title: 'Schedule team meeting', status: 'To Do' },
  { id: '3', title: 'Research market competitors', status: 'In Progress' },
  { id: '4', title: 'Update documentation', status: 'In Progress' },
  { id: '5', title: 'Fix login bug', status: 'Done' },
];

const HomeContainer = () => {
  const [activeTab, setActiveTab] = useState<string>('To Do');
  const [tasks, setTasks] = useState(MOCK_TASKS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Detect iOS/Safari browser
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);
  
  const handleRecordingComplete = async (audioBlob: Blob) => {
    // Don't do anything if the blob is empty
    if (audioBlob.size === 0) {
      setError("The recorded audio is empty. Please try again.");
      return;
    }
    
    setIsProcessing(true);
    setError(null);
    
    try {
      // Log information for debugging
      console.log(`Recording received: size=${audioBlob.size}B, type=${audioBlob.type}`);
      
      // Process the audio based on the browser
      let processedBlob = audioBlob;
      
      // For iOS/Safari, we need to ensure we have the right MIME type
      if (isIOS || isSafari) {
        // If type is empty or not specified, try to set an appropriate type
        if (!audioBlob.type || audioBlob.type === 'audio/' || audioBlob.type === '') {
          processedBlob = new Blob([audioBlob], { type: 'audio/mp4' });
          console.log('Set blob type to audio/mp4 for iOS/Safari');
        }
      } else {
        // For other browsers, prefer webm format
        if (!audioBlob.type || audioBlob.type === 'audio/' || audioBlob.type === '') {
          processedBlob = new Blob([audioBlob], { type: 'audio/webm' });
          console.log('Set blob type to audio/webm for other browsers');
        }
      }
      
      // Create an audio element to check if the recorded audio plays correctly
      try {
        const audioURL = URL.createObjectURL(processedBlob);
        const audioElement = new Audio(audioURL);
        
        // Monitor if the audio can be played
        audioElement.onloadedmetadata = () => {
          console.log(`Audio duration: ${audioElement.duration} seconds`);
          if (audioElement.duration < 0.5) {
            console.warn('Audio is too short, may indicate recording issues');
          }
        };
        
        audioElement.onerror = (e) => {
          console.error('Error loading audio:', e);
        };
      } catch (err) {
        console.warn('Could not create test audio element:', err);
      }

      // For testing, we'll use the test endpoint that doesn't require authentication
      let transcription;
      try {
        // Check that we have a reasonable file size before sending
        if (processedBlob.size < 100) {
          throw new Error('Audio file is too small to contain speech');
        }
        
        console.log(`Sending audio for transcription: size=${processedBlob.size}B, type=${processedBlob.type}`);
        transcription = await voiceService.transcribeTest(processedBlob);
        console.log('Transcription:', transcription);
      } catch (err) {
        console.error('Transcription error:', err);
        
        // If the first attempt fails, try with a different format
        if ((isIOS || isSafari) && processedBlob.type !== 'audio/mp4') {
          const mp4Blob = new Blob([audioBlob], { type: 'audio/mp4' });
          console.log('Retrying with audio/mp4 format for iOS/Safari');
          transcription = await voiceService.transcribeTest(mp4Blob);
        } else if (!isIOS && !isSafari && processedBlob.type !== 'audio/webm') {
          const webmBlob = new Blob([audioBlob], { type: 'audio/webm' });
          console.log('Retrying with audio/webm format for other browsers');
          transcription = await voiceService.transcribeTest(webmBlob);
        } else {
          throw err;
        }
      }
      
      // Now extract tasks from the transcription
      if (!transcription || transcription === '') {
        setError('No speech was detected in the recording. Please try again and speak clearly.');
        return;
      }
      
      const extractedTasks = await voiceService.extractTasksTest(transcription);
      console.log('Extracted tasks:', extractedTasks);
      
      // Add the extracted tasks to our task list
      if (extractedTasks && extractedTasks.length > 0) {
        // The API might return full task objects, or just titles
        // Handle both cases
        const newTasks = extractedTasks.map((task: any, index: number) => {
          if (typeof task === 'string') {
            return {
              id: `temp-${Date.now()}-${index}`,
              title: task,
              status: 'To Do'
            };
          } else {
            return {
              ...task,
              id: task.id || `temp-${Date.now()}-${index}`,
              status: task.status || 'To Do'
            };
          }
        });
        
        setTasks([...tasks, ...newTasks]);
        // Show success message
        setError(null);
      } else {
        // If no tasks were extracted, add the transcription as a task
        const newTask = {
          id: `temp-${Date.now()}`,
          title: transcription.length > 100 ? `${transcription.substring(0, 97)}...` : transcription,
          status: 'To Do'
        };
        
        setTasks([...tasks, newTask]);
        // Show success message
        setError(null);
      }
    } catch (error) {
      console.error('Error processing audio:', error);
      
      // Show a more helpful error message based on browser
      if (isIOS || isSafari) {
        setError('Safari had trouble processing your recording. Please try again and speak clearly. Make sure you are connected to the same WiFi as the server.');
      } else {
        setError('Failed to process your recording. Please try again and check your internet connection.');
      }
    } finally {
      setIsProcessing(false);
    }
  };
  
  const handleAddToCalendar = (taskId: string) => {
    // In a real implementation, this would add the task to a calendar
    console.log('Add to calendar', taskId);
  };
  
  const handleMarkDone = (taskId: string) => {
    setTasks(tasks.map(task => 
      task.id === taskId 
        ? { ...task, status: 'Done' } 
        : task
    ));
  };
  
  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-6">
      <Header userName="Mari" />
      
      <RecordButton onRecordingComplete={handleRecordingComplete} />
      
      {isProcessing && (
        <div className="text-center text-sm text-blue-600 mb-4">
          Processing your audio...
        </div>
      )}
      
      {error && (
        <div className="text-center text-sm text-red-600 mb-4">
          {error}
        </div>
      )}
      
      <div className="mx-4 bg-white rounded-xl shadow-sm overflow-hidden">
        <TabBar 
          activeTab={activeTab} 
          onTabChange={setActiveTab} 
        />
        
        <TaskList 
          tasks={tasks}
          activeTab={activeTab}
          onAddToCalendar={handleAddToCalendar}
          onMarkDone={handleMarkDone}
        />
      </div>
    </div>
  );
};

export default HomeContainer; 