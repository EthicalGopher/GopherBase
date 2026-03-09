import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Navbar from './Navbar';

export default function Layout() {
  return (
    <div className="flex w-full h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 flex flex-col min-w-0 bg-background-light dark:bg-[#0d0e14] relative overflow-hidden">
        <Navbar />
        <div className="flex-1 flex flex-col min-h-0 relative overflow-hidden">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
