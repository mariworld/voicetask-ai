import { create } from 'zustand';

// Task type definition for the entire app
export interface Task {
  id: string;
  title: string;
  completed: boolean;
  status: 'todo' | 'in-progress' | 'done';
}

// Initial tasks data
const initialTasks: Task[] = [
  // To Do tasks
  { id: '1', title: 'Complete project proposal', completed: true, status: 'done' },
  { id: '2', title: 'Schedule team meeting', completed: true, status: 'done' },
  { id: '3', title: 'Take out the trash', completed: false, status: 'todo' },
  { id: '4', title: 'Play basketball', completed: false, status: 'todo' },
  { id: '5', title: 'Go to the store', completed: false, status: 'todo' },
  
  // In Progress tasks
  { id: '6', title: 'Research new APIs', completed: false, status: 'in-progress' },
  { id: '7', title: 'Design product mockups', completed: false, status: 'in-progress' },
  { id: '8', title: 'Create presentation slides', completed: false, status: 'in-progress' },
  
  // Done tasks
  { id: '9', title: 'Update team documentation', completed: true, status: 'done' },
  { id: '10', title: 'Send client invoice', completed: true, status: 'done' },
  { id: '11', title: 'Schedule dentist appointment', completed: true, status: 'done' },
  { id: '12', title: 'Renew gym membership', completed: true, status: 'done' },
];

// Define the task store interface
interface TaskStore {
  tasks: Task[];
  addTask: (task: Task) => void;
  deleteTask: (id: string) => void;
  updateTaskStatus: (id: string, status: 'todo' | 'in-progress' | 'done') => void;
  toggleTaskCompletion: (id: string) => void;
  getTodoTasks: () => Task[];
  getInProgressTasks: () => Task[];
  getDoneTasks: () => Task[];
}

// Create and export the task store
export const useTaskStore = create<TaskStore>((set, get) => ({
  tasks: initialTasks,
  
  // Add a new task
  addTask: (task: Task) => {
    set((state) => ({
      tasks: [...state.tasks, task]
    }));
  },
  
  // Delete a task by ID
  deleteTask: (id: string) => {
    set((state) => ({
      tasks: state.tasks.filter(task => task.id !== id)
    }));
  },
  
  // Update a task's status (and completed flag based on status)
  updateTaskStatus: (id: string, status: 'todo' | 'in-progress' | 'done') => {
    set((state) => ({
      tasks: state.tasks.map(task => {
        if (task.id === id) {
          // Update completed flag based on status
          const completed = status === 'done';
          return { ...task, status, completed };
        }
        return task;
      })
    }));
  },
  
  // Toggle a task's completion status
  toggleTaskCompletion: (id: string) => {
    set((state) => ({
      tasks: state.tasks.map(task => {
        if (task.id === id) {
          const completed = !task.completed;
          // Update status if completing the task
          const status = completed ? 'done' : task.status === 'done' ? 'todo' : task.status;
          return { ...task, completed, status };
        }
        return task;
      })
    }));
  },
  
  // Get tasks filtered by status
  getTodoTasks: () => {
    return get().tasks.filter(task => task.status === 'todo');
  },
  
  getInProgressTasks: () => {
    return get().tasks.filter(task => task.status === 'in-progress');
  },
  
  getDoneTasks: () => {
    return get().tasks.filter(task => task.status === 'done');
  },
})); 