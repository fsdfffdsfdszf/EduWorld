
import React from 'react';
import { User } from '../types';

interface MobileNavProps {
  currentPath: string;
  setRoute: (path: string) => void;
  user: User;
}

const MobileNav: React.FC<MobileNavProps> = ({ currentPath, setRoute, user }) => {
  const items = [
    { id: 'dashboard', path: '/dashboard', icon: 'fa-house', label: 'Home' },
    { id: 'explore', path: '/explore', icon: 'fa-compass', label: 'Explore' },
    ...(user.role === 'admin' ? [{ id: 'admin', path: '/admin', icon: 'fa-shield-halved', label: 'Admin' }] : []),
    { id: 'profile', path: '/profile', icon: 'fa-user', label: 'Profile' }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 flex items-center justify-around px-1 z-[90] safe-area-bottom">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setRoute(item.id)}
          className={`flex flex-col items-center justify-center w-full h-full transition-all ${currentPath.startsWith(item.path) ? 'text-indigo-400' : 'text-slate-500'}`}
        >
          <i className={`fas ${item.icon} text-base mb-1`}></i>
          <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
          {currentPath.startsWith(item.path) && <div className="absolute bottom-1 w-1 h-1 bg-indigo-400 rounded-full shadow-[0_0_8px_#818cf8]"></div>}
        </button>
      ))}
    </div>
  );
};

export default MobileNav;
