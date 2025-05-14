interface TaskItemProps {
  id: string;
  title: string;
  status: 'To Do' | 'In Progress' | 'Done';
  onAddToCalendar: (id: string) => void;
  onMarkDone: (id: string) => void;
}

const TaskItem = ({ 
  id, 
  title, 
  status, 
  onAddToCalendar, 
  onMarkDone 
}: TaskItemProps) => {
  return (
    <div className="py-3 px-4 bg-white rounded-lg shadow-sm my-2 border border-gray-100">
      <h3 className="text-lg font-medium text-gray-800">{title}</h3>
      
      <div className="flex mt-3 space-x-2">
        {status !== 'Done' && (
          <>
            <button 
              onClick={() => onAddToCalendar(id)}
              className="px-3 py-1 text-sm bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 transition-colors"
              aria-label="Add to calendar"
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Calendar
              </span>
            </button>
            
            <button 
              onClick={() => onMarkDone(id)}
              className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md hover:bg-green-200 transition-colors"
              aria-label="Mark as done"
            >
              <span className="flex items-center">
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Done
              </span>
            </button>
          </>
        )}
        
        {status === 'Done' && (
          <span className="px-3 py-1 text-sm bg-green-100 text-green-700 rounded-md">
            <span className="flex items-center">
              <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
              Completed
            </span>
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskItem; 