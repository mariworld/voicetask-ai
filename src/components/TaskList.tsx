import TaskItem from './TaskItem';

interface Task {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done';
  due_date?: string;
  created_at?: string;
  updated_at?: string;
  user_id?: string;
}

interface TaskListProps {
  tasks: Task[];
  activeTab: string;
  onAddToCalendar: (id: string) => void;
  onMarkDone: (id: string) => void;
}

const TaskList = ({ 
  tasks, 
  activeTab, 
  onAddToCalendar, 
  onMarkDone 
}: TaskListProps) => {
  // Filter tasks by the active tab
  const filteredTasks = tasks.filter(task => task.status === activeTab);
  
  return (
    <div className="py-4">
      {filteredTasks.length === 0 ? (
        <div className="text-center py-8 text-gray-500">
          No tasks in this category
        </div>
      ) : (
        <div className="space-y-3">
          {filteredTasks.map(task => (
            <TaskItem
              key={task.id}
              id={task.id}
              title={task.title}
              status={task.status}
              due_date={task.due_date}
              onAddToCalendar={onAddToCalendar}
              onMarkDone={onMarkDone}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export default TaskList; 