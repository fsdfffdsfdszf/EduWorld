
import React, { useState, useEffect } from 'react';
import { User, AppVersion } from '../types';
import { getAllAppVersions } from '../services/storage';

interface AuthProps {
  onLogin: (user: User) => void;
}

const getUsersFromStorage = (): any[] => {
  const users = localStorage.getItem('eduworld_registered_users');
  return users ? JSON.parse(users) : [];
};

const saveUserToStorage = (user: any) => {
  const users = getUsersFromStorage();
  users.push(user);
  localStorage.setItem('eduworld_registered_users', JSON.stringify(users));
};

const Auth: React.FC<AuthProps> = ({ onLogin }) => {
  const [isLogin, setIsLogin] = useState(true);
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [showAppOverlay, setShowAppOverlay] = useState(false);
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);

  useEffect(() => {
    const loadApps = async () => {
      const versions = await getAllAppVersions();
      setAppVersions(versions.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
    };
    loadApps();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!email || !password || (!isLogin && !name)) {
      setError('Required identifiers missing.');
      return;
    }

    if (isAdminMode) {
      if (email === 'shajidrahim007@gmail.com' && password === 'odiksda-a34jasdiao4-alkjwaiy3jdad') {
        onLogin({
          id: 'admin-1',
          name: 'Principal Admin',
          avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=shajid',
          role: 'admin',
          enrolledCourses: [],
          quizScores: {}
        });
        return;
      } else {
        setError('Invalid administrative key.');
        return;
      }
    }

    const registeredUsers = getUsersFromStorage();
    if (isLogin) {
      const userMatch = registeredUsers.find(u => u.email === email && u.password === password);
      if (userMatch) {
        onLogin({ ...userMatch, role: 'student' });
      } else {
        setError('Identity node not found.');
      }
    } else {
      const userExists = registeredUsers.some(u => u.email === email);
      if (userExists) {
        setError('Email already sequenced.');
        return;
      }
      const newUser = {
        id: Math.random().toString(36).substr(2, 9),
        name, email, password,
        avatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${email}`,
        role: 'student', enrolledCourses: [], quizScores: {}
      };
      saveUserToStorage(newUser);
      onLogin(newUser as any);
    }
  };

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      
      {/* Neural Background Orbs */}
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none delay-1000"></div>

      <div className="w-full max-w-[480px] z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {/* App Downloader Overlay */}
        {showAppOverlay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-w-md rounded-[40px] border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
              <div className="p-8 border-b border-slate-800 flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-black text-white uppercase tracking-tight">App Distribution</h3>
                  <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mt-1">Available Binaries & APKs</p>
                </div>
                <button onClick={() => setShowAppOverlay(false)} className="w-10 h-10 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white transition-all">
                  <i className="fas fa-times"></i>
                </button>
              </div>
              <div className="p-6 space-y-3 max-h-[400px] overflow-y-auto no-scrollbar">
                {appVersions.length > 0 ? (
                  appVersions.map(ver => (
                    <a key={ver.id} href={ver.url} className="flex items-center justify-between p-5 bg-slate-950 rounded-3xl border border-slate-800 hover:border-indigo-500/50 transition-all group">
                      <div className="min-w-0">
                        <p className="text-sm font-black text-white truncate">{ver.title}</p>
                        <p className="text-[9px] font-bold text-slate-600 uppercase tracking-widest mt-1">v{ver.version} • Registry Signed</p>
                      </div>
                      <div className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 flex items-center justify-center group-hover:bg-indigo-600 group-hover:text-white transition-all">
                        <i className="fas fa-download text-xs"></i>
                      </div>
                    </a>
                  ))
                ) : (
                  <div className="py-12 text-center opacity-40">
                    <i className="fas fa-box-open text-3xl mb-4 text-slate-600"></i>
                    <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">No binaries detected in sync hub.</p>
                  </div>
                )}
              </div>
              <div className="p-6 bg-slate-950/50 border-t border-slate-800 text-center">
                <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.3em]">Edu World Official Distribution Node</p>
              </div>
            </div>
          </div>
        )}

        <div className="text-center mb-12">
          <div className="w-24 h-24 bg-indigo-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_60px_rgba(79,70,229,0.3)] relative group">
            <i className="fas fa-graduation-cap text-white text-4xl group-hover:scale-110 transition-transform duration-500"></i>
            <div className="absolute inset-0 bg-white/20 rounded-[32px] scale-110 blur-xl -z-10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Edu World</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[9px]">Neural Education Protocol</p>
        </div>

        <div className="bg-slate-900/60 rounded-[48px] border border-slate-800/80 p-8 md:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative overflow-hidden group">
          
          {/* Subtle accent border */}
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-indigo-600/30 to-transparent"></div>

          <div className="flex bg-slate-950/50 p-1.5 rounded-2xl mb-12 relative z-10 border border-slate-800/50 shadow-inner">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isLogin && !isAdminMode ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-400'}`}
            >
              Sequence
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${!isLogin && !isAdminMode ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-600/20' : 'text-slate-600 hover:text-slate-400'}`}
            >
              Registry
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {!isLogin && !isAdminMode && (
              <div className="space-y-2 group">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-indigo-400">Legal Identity</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-[20px] px-6 py-5 focus:bg-slate-900 focus:border-indigo-600/50 outline-none transition-all font-bold text-sm text-white placeholder:text-slate-800 shadow-inner"
                  placeholder="Full name"
                />
              </div>
            )}

            <div className="space-y-2 group">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-indigo-400">Neural Link Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-[20px] px-6 py-5 focus:bg-slate-900 focus:border-indigo-600/50 outline-none transition-all font-bold text-sm text-white placeholder:text-slate-800 shadow-inner"
                placeholder="name@eduworld.ct.ws"
              />
            </div>

            <div className="space-y-2 group">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1 transition-colors group-focus-within:text-indigo-400">Access Key</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-[20px] px-6 py-5 focus:bg-slate-900 focus:border-indigo-600/50 outline-none transition-all font-bold text-sm text-white placeholder:text-slate-800 shadow-inner"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-[10px] font-black text-rose-500 text-center uppercase tracking-[0.2em] animate-pulse h-4">{error}</p>}

            <button
              type="submit"
              className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-[0_20px_50px_rgba(79,70,229,0.3)] active:scale-95 transition-all mt-4 flex items-center justify-center"
            >
              {isLogin ? 'Initiate Sync' : 'Complete Registry'}
            </button>
          </form>

          <div className="mt-12 pt-10 border-t border-slate-800/60 flex flex-col gap-6 items-center">
            <button
              onClick={() => { setIsAdminMode(!isAdminMode); setError(''); setIsLogin(true); }}
              className={`text-[9px] font-black transition-all uppercase tracking-[0.4em] px-6 py-2.5 rounded-full border ${isAdminMode ? 'text-indigo-400 border-indigo-900/40 bg-indigo-500/5' : 'text-slate-600 hover:text-slate-400 border-transparent hover:border-slate-800'}`}
            >
              {isAdminMode ? 'System Standard' : 'Core Administration'}
            </button>
            
            <button 
              onClick={() => setShowAppOverlay(true)}
              className="flex items-center space-x-3 text-slate-700 hover:text-indigo-500 transition-all duration-300"
            >
              <i className="fab fa-android text-lg"></i>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Download Mobile Client</span>
            </button>
          </div>
        </div>
        
        <p className="text-center text-slate-800 font-bold text-[8px] uppercase tracking-[0.5em] mt-12 px-10 leading-loose">
          Secure multi-node learning environment. All neural links are encrypted via protocol 7.2-X.
        </p>
      </div>
    </div>
  );
};

export default Auth;
