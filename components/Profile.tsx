
import React, { useState, useRef, useEffect } from 'react';
import { User, Course, AppVersion, AppRoute } from '../types';
import CourseCard from './CourseCard';
import { getAllAppVersions } from '../services/storage';

interface ProfileProps {
  user: User;
  courses: Course[];
  onCourseClick: (id: string) => void;
  onUpdateUser: (user: User) => void;
  onLogout: () => void;
  setRoute: (route: AppRoute) => void;
}

const Profile: React.FC<ProfileProps> = ({ user, courses, onCourseClick, onUpdateUser, onLogout, setRoute }) => {
  const [isAvatarUploading, setIsAvatarUploading] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  
  // Settings Form State
  const [settingsName, setSettingsName] = useState(user.name);

  const avatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const loadVersions = async () => {
      const data = await getAllAppVersions();
      // Sort by date descending
      setAppVersions(data.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
    };
    loadVersions();
  }, []);

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;

    setIsAvatarUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      const base64 = event.target?.result as string;
      onUpdateUser({ ...user, avatar: base64 });
      setIsAvatarUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveSettings = (e: React.FormEvent) => {
    e.preventDefault();
    if (!settingsName.trim()) return;
    onUpdateUser({ ...user, name: settingsName });
    setIsSettingsOpen(false);
  };

  const latestVersion = appVersions[0];

  return (
    <div className="max-w-7xl mx-auto space-y-6 md:space-y-12 pb-24 animate-in fade-in duration-500">
      
      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-5 bg-slate-950/90 backdrop-blur-2xl">
          <div className="bg-slate-900 w-full max-w-lg rounded-[32px] border border-slate-800 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
            <div className="p-6 md:p-8 border-b border-slate-800 flex items-center justify-between">
              <h3 className="text-base font-black text-slate-100 uppercase tracking-widest">Configuration</h3>
              <button onClick={() => setIsSettingsOpen(false)} className="text-slate-500 hover:text-white p-2"><i className="fas fa-times"></i></button>
            </div>
            <form onSubmit={handleSaveSettings} className="p-6 md:p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity Display</label>
                <input type="text" value={settingsName} onChange={(e) => setSettingsName(e.target.value)} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-white font-bold text-sm outline-none focus:border-indigo-500" />
              </div>
              <button type="submit" className="w-full py-4 bg-indigo-600 text-white font-black uppercase text-[10px] tracking-widest rounded-xl shadow-lg active:scale-95 transition-all">Save Identity Update</button>
            </form>
          </div>
        </div>
      )}

      {/* Header */}
      <section className="bg-slate-900/50 rounded-[32px] md:rounded-[40px] border border-slate-800/60 p-6 md:p-14 shadow-2xl flex flex-col md:flex-row items-center md:items-start gap-8 md:gap-14 relative overflow-hidden">
        <div className="relative z-10">
          <div className="w-24 h-24 md:w-36 md:h-36 rounded-3xl md:rounded-[48px] overflow-hidden border-4 border-slate-800 bg-slate-950 flex items-center justify-center shadow-inner">
            {isAvatarUploading ? <i className="fas fa-spinner fa-spin text-indigo-500 text-xl"></i> : <img src={user.avatar} className="w-full h-full object-cover" alt={user.name} />}
          </div>
          <button onClick={() => avatarInputRef.current?.click()} className="absolute -bottom-1 -right-1 w-9 h-9 bg-indigo-600 text-white rounded-xl flex items-center justify-center border-4 border-slate-900 shadow-xl active:scale-90 transition-all"><i className="fas fa-camera text-[10px]"></i></button>
          <input type="file" ref={avatarInputRef} className="hidden" accept="image/*" onChange={handleAvatarUpload} />
        </div>
        
        <div className="flex-1 text-center md:text-left z-10">
          <h1 className="text-3xl md:text-5xl font-black text-slate-100 tracking-tighter mb-3">{user.name}</h1>
          <div className="flex flex-wrap items-center justify-center md:justify-start gap-3 mb-8">
             <span className="px-3 py-1 bg-indigo-500/10 text-indigo-400 font-black uppercase tracking-widest text-[8px] rounded-full border border-indigo-500/20">{user.role} Identity</span>
             <span className="text-[9px] font-bold text-slate-600 uppercase tracking-widest">Node ID: {user.id}</span>
          </div>
          <div className="flex flex-wrap justify-center md:justify-start gap-3 md:gap-6">
            <div className="px-5 py-4 bg-slate-950/80 rounded-2xl border border-slate-800 min-w-[100px] shadow-inner">
              <p className="text-xl font-black text-white">{courses.length}</p>
              <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Enrolled</p>
            </div>
          </div>
        </div>

        <div className="w-full md:w-auto flex flex-col space-y-3 z-10">
          <button onClick={() => setRoute(AppRoute.DOWNLOADS)} className="w-full md:w-auto px-10 py-4.5 bg-indigo-600 text-white font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl active:scale-95 transition-all">Download Portal</button>
          <button onClick={() => setIsSettingsOpen(true)} className="w-full md:w-auto px-10 py-4.5 bg-slate-100 text-slate-950 font-black text-[10px] uppercase tracking-widest rounded-xl shadow-xl active:scale-95 transition-all">Settings</button>
          <button onClick={onLogout} className="w-full px-10 py-4 bg-rose-600/10 text-rose-500 border border-rose-900/30 font-black text-[9px] uppercase tracking-widest rounded-xl active:scale-95 transition-all">Reset All Local Data</button>
        </div>
        
        <div className="absolute top-0 right-0 w-64 h-64 bg-indigo-600/5 rounded-full blur-[80px] pointer-events-none"></div>
      </section>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12 px-1 md:px-0">
        {/* Left Col: Courses */}
        <div className="lg:col-span-8 space-y-6">
          <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] ml-2 flex items-center">
            <i className="fas fa-brain mr-3 text-indigo-500"></i> Active Streams
          </h2>
          {courses.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {courses.map(course => <CourseCard key={course.id} course={course} onClick={onCourseClick} showProgress />)}
            </div>
          ) : (
            <div className="py-24 bg-slate-900/40 rounded-[32px] border-2 border-dashed border-slate-800/60 flex flex-col items-center justify-center text-center p-8">
              <i className="fas fa-ghost text-4xl text-slate-800 mb-5"></i>
              <p className="text-slate-600 font-black uppercase text-[10px] tracking-widest">No active streams detected in this node.</p>
            </div>
          )}
        </div>

        {/* Right Col: Quick App Access */}
        <div className="lg:col-span-4 space-y-6">
           <h2 className="text-xs font-black text-white uppercase tracking-[0.3em] ml-2 flex items-center">
            <i className="fas fa-cloud-arrow-down mr-3 text-indigo-500"></i> App Access
          </h2>
          
          <div className="bg-slate-900 rounded-[32px] border border-slate-800 p-6 md:p-8 space-y-8 shadow-2xl relative overflow-hidden group">
             {latestVersion ? (
               <div className="relative z-10 space-y-6">
                  <div className="p-5 bg-indigo-600 rounded-2xl text-white shadow-xl shadow-indigo-600/20 relative overflow-hidden group-hover:scale-[1.02] transition-transform duration-500">
                     <div className="relative z-10">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-[10px] font-black uppercase tracking-widest opacity-80">v{latestVersion.version}</span>
                           <span className="px-2 py-0.5 bg-white/20 rounded-full text-[8px] font-black uppercase tracking-widest">Latest</span>
                        </div>
                        <h3 className="text-xl font-black tracking-tight mb-4 truncate">{latestVersion.title}</h3>
                        <button 
                          onClick={() => setRoute(AppRoute.DOWNLOADS)}
                          className="w-full py-3 bg-white text-indigo-600 rounded-xl flex items-center justify-center font-black text-[10px] uppercase tracking-widest hover:bg-indigo-50 active:scale-95 transition-all shadow-lg"
                        >
                          <i className="fas fa-external-link mr-2.5"></i> Open Portal
                        </button>
                     </div>
                     <div className="absolute -bottom-6 -right-6 w-24 h-24 bg-white/10 rounded-full blur-2xl group-hover:scale-150 transition-transform duration-700"></div>
                  </div>
                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] text-center">Visit the portal for full version history.</p>
               </div>
             ) : (
               <div className="py-12 text-center opacity-40 flex flex-col items-center justify-center">
                  <i className="fas fa-box-open text-3xl mb-4 text-slate-600"></i>
                  <p className="text-[9px] font-black uppercase tracking-widest text-slate-600 max-w-[150px]">No binary distributions available.</p>
               </div>
             )}
             <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-600/5 rounded-full blur-[40px] pointer-events-none transition-all"></div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Profile;
