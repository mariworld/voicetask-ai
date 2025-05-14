import { format } from 'date-fns';

interface HeaderProps {
  userName: string;
}

const Header = ({ userName = 'Mari' }: HeaderProps) => {
  const today = new Date();
  const formattedDate = format(today, 'EEEE, MMMM d');
  
  return (
    <header className="py-6 px-4">
      <h1 className="text-2xl font-bold text-gray-800">
        Hey {userName}, today is {formattedDate}
      </h1>
    </header>
  );
};

export default Header; 