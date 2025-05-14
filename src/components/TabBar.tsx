interface TabBarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const TabBar = ({ activeTab, onTabChange }: TabBarProps) => {
  const tabs = ['To Do', 'In Progress', 'Done'];
  
  return (
    <div className="flex w-full border-b border-gray-200">
      {tabs.map((tab) => (
        <button
          key={tab}
          onClick={() => onTabChange(tab)}
          className={`flex-1 py-3 text-center transition-colors
                      ${activeTab === tab 
                        ? 'text-blue-600 border-b-2 border-blue-600 font-medium' 
                        : 'text-gray-500 hover:text-gray-700'}`}
          aria-selected={activeTab === tab}
        >
          {tab}
        </button>
      ))}
    </div>
  );
};

export default TabBar; 