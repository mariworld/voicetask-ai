"use client";

import { useState } from 'react';
import Header from './Header';
import RecordButton from './RecordButton';
import TabBar from './TabBar';
import TaskList from './TaskList';

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
  
  const handleRecordingComplete = (audioBlob: Blob) => {
    // In a real implementation, this would send the audio to the backend
    // for transcription and task extraction
    console.log('Recording complete', audioBlob);
    
    // Mock adding a new task after recording
    const newTask = {
      id: `${tasks.length + 1}`,
      title: `New voice task ${tasks.length + 1}`,
      status: 'To Do'
    };
    
    setTasks([...tasks, newTask]);
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