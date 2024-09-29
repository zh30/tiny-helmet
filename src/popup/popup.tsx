import '../styles/tailwind.css';
import React from 'react';
import ReactDOM from 'react-dom/client';

const Popup = () => {
  const [count, setCount] = React.useState(0);

  return (
    <div className="p-4 bg-white rounded-lg shadow-md">
      <h1 className="text-2xl font-bold">Hello, World!</h1>
    </div>
  );
};

const container = document.getElementById('root');
const root = ReactDOM.createRoot(container as HTMLElement);
root.render(<Popup />);
