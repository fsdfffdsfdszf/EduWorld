
import React from 'react';
import { AppRoute, User } from '../types';

interface SidebarProps {
  currentRoute: AppRoute;
  user: User;
  setRoute: (route: AppRoute) => void;
  onLogout: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ currentRoute, user, setRoute, onLogout }) => {
  const navItems = [
    { id: AppRoute.DASHBOARD, label: 'Dashboard', icon: 'fa-house' },
    { id: AppRoute.COURSES, label: 'Explore Courses', icon: 'fa-compass' },
    { id: AppRoute.PROFILE, label: 'My Profile', icon: 'fa-user' },
  ];

  return (
    <div className="w-64 h-full bg-slate-950 border-r border-slate-800 flex flex-col">
      {/* Brand Header */}
      <div className="p-8 lg:p-10 flex items-center space-x-4">
        <div className="w-12 h-12 bg-indigo-600 rounded-2xl flex items-center justify-center shadow-2xl shadow-indigo-600/20">
          <i className="fas fa-graduation-cap text-white text-xl"></i>
        </div>
        <span className="text-2xl font-black text-white tracking-tighter">Edu World</span>
      </div>

      {/* Main Navigation */}
      <nav className="flex-1 px-5 mt-4 space-y-1.5 overflow-y-auto">
        <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 opacity-50">PLATFORM MAP</p>
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => setRoute(item.id)}
            className={`w-full flex items-center px-5 py-4 text-sm font-bold rounded-2xl transition-all group ${
              currentRoute === item.id
                ? 'bg-indigo-600/10 text-indigo-400 border border-indigo-500/10'
                : 'text-slate-500 hover:bg-slate-900 hover:text-white'
            }`}
          >
            <i className={`fas ${item.icon} w-6 mr-3 text-lg transition-colors ${currentRoute === item.id ? 'text-indigo-400' : 'text-slate-600 group-hover:text-indigo-400'}`}></i>
            {item.label}
          </button>
        ))}

        {user.role === 'admin' && (
          <div className="mt-10">
            <p className="px-4 text-[9px] font-black text-slate-600 uppercase tracking-[0.3em] mb-4 opacity-50">ADMINISTRATION</p>
            <button
              onClick={() => setRoute(AppRoute.ADMIN)}
              className={`w-full flex items-center px-5 py-4 text-sm font-bold rounded-2xl transition-all mb-2 ${
                currentRoute === AppRoute.ADMIN
                  ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30'
                  : 'text-slate-500 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <i className={`fas fa-shield-halved w-6 mr-3 text-lg`}></i>
              Admin Panel
            </button>
            <button
              onClick={() => setRoute(AppRoute.USERS)}
              className={`w-full flex items-center px-5 py-4 text-sm font-bold rounded-2xl transition-all mb-2 ${
                currentRoute === AppRoute.USERS
                  ? 'bg-indigo-600 text-white shadow-2xl shadow-indigo-600/30'
                  : 'text-slate-500 hover:bg-slate-900 hover:text-white'
              }`}
            >
              <i className={`fas fa-users-gear w-6 mr-3 text-lg`}></i>
              User Access
            </button>
          </div>
        )}
      </nav>

      {/* Footer / User Profile */}
      <div className="p-6 border-t border-slate-900 bg-slate-950/50">
        <div className="flex items-center p-4 space-x-4 bg-slate-900/50 rounded-2xl border border-slate-800 mb-6">
          <div className="relative">
            <img src={user.avatar} className="w-10 h-10 rounded-xl object-cover border border-slate-800" alt="avatar" />
            <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-900"></div>
          </div>
          <div className="flex-1 overflow-hidden">
            <p className="text-xs font-black text-white truncate">{user.name}</p>
            <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest leading-none mt-1">{user.role}</p>
          </div>
        </div>
        <button 
          onClick={onLogout} 
          className="w-full flex items-center justify-center px-4 py-3.5 text-[9px] font-black text-slate-500 hover:bg-slate-900/50 rounded-2xl transition-all uppercase tracking-[0.2em] border border-transparent hover:border-slate-800"
        >
          <i className="fas fa-rotate-left mr-3"></i>
          Reset Session
        </button>
      </div>
    </div>
  );
};

export default Sidebar;
