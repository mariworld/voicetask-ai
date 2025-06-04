"use client";

import { useState, useEffect } from 'react';
import Header from './Header';
import RecordButton from './RecordButton';
import TabBar from './TabBar';
import TaskList from './TaskList';
import { voiceService, taskService } from '../services/api';

// Task interface that matches the API
interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done';
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

const HomeContainer = () => {
  const [activeTab, setActiveTab] = useState<string>('To Do');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  
  // Detect iOS/Safari browser
  const isIOS = typeof navigator !== 'undefined' && /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isSafari = typeof navigator !== 'undefined' && /^((?!chrome|android).)*safari/i.test(navigator.userAgent);

  // Fetch tasks on component mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        setIsLoading(true);
        const fetchedTasks = await taskService.getTasks();
        setTasks(fetchedTasks || []);
        setError(null);
      } catch (err: any) {
        console.error('Failed to fetch tasks:', err);
        setError('Failed to load tasks. Please try again.');
        setTasks([]); // Set empty array as fallback
      } finally {
        setIsLoading(false);
      }
    };

    fetchTasks();
  }, []);

  // Handle voice recording completion
  const handleRecordingComplete = async (audioBlob: Blob) => {
    console.log('Recording completed, blob size:', audioBlob.size);
    
    if (audioBlob.size === 0) {
      setError('Recording is empty. Please try again.');
      return;
    }

    try {
      setIsProcessing(true);
      setError(null);
      
      const extractedTasks = await voiceService.processVoice(audioBlob);
      console.log('Extracted tasks:', extractedTasks);
      
      if (extractedTasks && extractedTasks.length > 0) {
        // Refresh the task list to include newly created tasks
        const updatedTasks = await taskService.getTasks();
        setTasks(updatedTasks || []);
      } else {
        console.log('No tasks extracted from voice recording');
      }
      
    } catch (err: any) {
      console.error('Voice processing error:', err);
      setError(err.message || 'Failed to process voice recording. Please try again.');
    } finally {
      setIsProcessing(false);
    }
  };
  
  // Handle adding task to calendar
  const handleAddToCalendar = async (id: string) => {
    try {
      const task = tasks.find(t => t.id === id);
      if (!task) return;

      // If the task has a due date, create a calendar event
      if (task.due_date) {
        const dueDate = new Date(task.due_date);
        const title = encodeURIComponent(task.title);
        const startDate = dueDate.toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        const endDate = new Date(dueDate.getTime() + 60 * 60 * 1000).toISOString().replace(/[-:]/g, '').split('.')[0] + 'Z';
        
        // Create Google Calendar URL
        const calendarUrl = `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${startDate}/${endDate}&details=${encodeURIComponent('Task: ' + task.title)}`;
        window.open(calendarUrl, '_blank');
      } else {
        // If no due date, just show an alert
        alert('This task does not have a due date set.');
      }
    } catch (err: any) {
      console.error('Failed to add to calendar:', err);
      setError('Failed to add task to calendar.');
    }
  };
  
  // Handle marking task as done
  const handleMarkDone = async (id: string) => {
    try {
      // Optimistically update the UI
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === id ? { ...task, status: 'Done' as const } : task
        )
      );

      // Update the task on the server
      await taskService.updateTask(id, { status: 'Done' });
      
      setError(null);
    } catch (err: any) {
      console.error('Failed to mark task as done:', err);
      setError('Failed to update task. Please try again.');
      
      // Revert the optimistic update
      const updatedTasks = await taskService.getTasks();
      setTasks(updatedTasks || []);
    }
  };
  
  return (
    <div className="max-w-md mx-auto bg-gray-50 min-h-screen pb-6">
      <Header userName="Mari" />
      
      <RecordButton onRecordingComplete={handleRecordingComplete} />
      
      {isLoading && (
        <div className="text-center text-sm text-blue-600 mb-4">
          Loading tasks...
        </div>
      )}
      
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