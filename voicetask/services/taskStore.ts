import { create } from 'zustand';
import { apiService } from '@/services/api';

// Task type definition for the entire app
export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  status: 'To Do' | 'In Progress' | 'Done';
  dueDate?: string;
  priority?: 'low' | 'medium' | 'high';
  subtasks?: { id: string; title: string; completed: boolean }[];
}

// Define the task store interface
interface TaskStore {
  tasks: Task[];
  isLoading: boolean;
  error: string | null;
  fetchTasks: () => Promise<void>;
  addTask: (task: Task) => void;
  deleteTask: (id: string) => Promise<void>;
  updateTask: (id: string, updatedData: Partial<Task>) => void;
  updateTaskStatus: (id: string, status: 'To Do' | 'In Progress' | 'Done') => Promise<void>;
  toggleTaskCompletion: (id: string) => Promise<void>;
  reorderTasks: (tasks: Task[]) => Promise<void>;
  getTaskById: (id: string) => Task | undefined;
  getTodoTasks: () => Task[];
  getInProgressTasks: () => Task[];
  getDoneTasks: () => Task[];
}

// Create and export the task store
export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: [],
  isLoading: false,
  error: null,
  
  fetchTasks: async () => {
    set({ isLoading: true, error: null });
    try {
      const fetchedTasks = await apiService.getTasks();
      set({ tasks: fetchedTasks || [], isLoading: false });
    } catch (e: any) {
      set({ error: e.message || 'Failed to fetch tasks', isLoading: false });
      console.error("Failed to fetch tasks:", e);
    }
  },
  
  addTask: (task: Task) => {
    set((state) => ({
      tasks: [...state.tasks, task]
    }));
  },
  
  deleteTask: async (id: string) => {
    // Store current tasks for rollback in case of error
    const previousTasks = get().tasks;
    
    // Optimistically update UI first (remove the task immediately)
    set((state) => ({
      tasks: state.tasks.filter(task => task.id !== id)
    }));
    
    try {
      // Then call the API to delete the task
      await apiService.deleteTask(id);
      // No need to update state again as we already removed it
    } catch (e: any) {
      // If API call fails, rollback to previous state
      console.error("Failed to delete task:", e);
      set({ 
        tasks: previousTasks,
        error: e.message || 'Failed to delete task'
      });
    }
  },

  updateTask: (id: string, updatedData: Partial<Task>) => {
    set((state) => ({
      tasks: state.tasks.map(task =>
        task.id === id ? { ...task, ...updatedData } : task
      ),
    }));
  },
  
  updateTaskStatus: async (id: string, status: 'To Do' | 'In Progress' | 'Done') => {
    // Store current tasks for rollback in case of error
    const previousTasks = get().tasks;
    
    // Optimistically update UI first
    set((state) => ({
      tasks: state.tasks.map(task => {
        if (task.id === id) {
          const completed = status === 'Done';
          return { ...task, status, completed };
        }
        return task;
      })
    }));
    
    try {
      // Then call the API to update the task status
      await apiService.updateTaskStatus(id, status);
      // No need to update state again as we already updated it
    } catch (e: any) {
      // If API call fails, rollback to previous state
      console.error("Failed to update task status:", e);
      set({
        tasks: previousTasks,
        error: e.message || 'Failed to update task status'
      });
    }
  },
  
  toggleTaskCompletion: async (id: string) => {
    // Get the current task
    const task = get().tasks.find(task => task.id === id);
    if (!task) return;
    
    // Determine the new status
    const completed = !task.completed;
    const newStatus = completed ? 'Done' : task.status === 'Done' ? 'To Do' : task.status;
    
    // Use the updateTaskStatus method which already calls the API
    await get().updateTaskStatus(id, newStatus);
  },
  
  reorderTasks: async (reorderedTasks: Task[]) => {
    try {
      // Store current tasks for rollback in case of error
      const previousTasks = get().tasks;
      
      // Create a map of reordered task IDs to their new positions
      const reorderedIds = reorderedTasks.map(task => task.id);
      
      // Update the local state with the reordered tasks, keeping other tasks unchanged
      set((state) => ({
        tasks: state.tasks.map(task => {
          // If the task is in the reordered list, return the reordered task
          if (reorderedIds.includes(task.id)) {
            return reorderedTasks.find(t => t.id === task.id) || task;
          }
          // Otherwise return the task unchanged
          return task;
        })
      }));
      
      // Call API to save the new order (if you have this endpoint)
      // If you don't have an API endpoint for this yet, you can add a comment
      // TODO: Call API to save the task order when endpoint is available
      // await apiService.updateTaskOrder(reorderedTasks);
      
    } catch (e: any) {
      // Handle errors
      console.error("Failed to reorder tasks:", e);
      set({
        error: e.message || 'Failed to reorder tasks'
      });
    }
  },
  
  getTaskById: (id: string) => {
    return get().tasks.find(task => task.id === id);
  },

  getTodoTasks: () => {
    return get().tasks.filter(task => task.status === 'To Do');
  },
  
  getInProgressTasks: () => {
    return get().tasks.filter(task => task.status === 'In Progress');
  },
  
  getDoneTasks: () => {
    return get().tasks.filter(task => task.status === 'Done');
  },
})); 