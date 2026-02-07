
import React, { useState, useEffect } from 'react';
import { User, AppVersion } from '../types';
import { getAllAppVersions } from '../services/storage';
import { supabaseAuth } from '../services/supabase';

interface AuthProps {
  onLogin: (user: any) => void; // App.tsx handles the session sync
}

const Auth: React.FC<AuthProps> = () => {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showAppOverlay, setShowAppOverlay] = useState(false);
  const [showVerificationMsg, setShowVerificationMsg] = useState(false);
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);

  useEffect(() => {
    const loadApps = async () => {
      try {
        const versions = await getAllAppVersions();
        setAppVersions(versions.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      } catch (e) { console.error("App versions load failed", e); }
    };
    loadApps();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    if (!email || !password || (!isLogin && !name)) {
      setError('Required identifiers missing.');
      setLoading(false);
      return;
    }

    try {
      if (isLogin) {
        const { error: signInErr } = await supabaseAuth.signIn(email, password);
        if (signInErr) throw signInErr;
      } else {
        const { error: signUpErr } = await supabaseAuth.signUp(email, password, name);
        if (signUpErr) throw signUpErr;
        setShowVerificationMsg(true);
      }
    } catch (err: any) {
      setError(err.message || 'Authentication sequence failed.');
    } finally {
      setLoading(false);
    }
  };

  if (showVerificationMsg) {
    return (
      <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-slate-100 relative overflow-hidden">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
        <div className="w-full max-w-[480px] z-10 animate-in fade-in zoom-in-95 duration-700">
          <div className="text-center mb-12">
            <div className="w-24 h-24 bg-emerald-600 rounded-[32px] flex items-center justify-center mx-auto mb-8 shadow-[0_20px_60px_rgba(16,185,129,0.3)] relative group">
              <i className="fas fa-envelope-open-text text-white text-4xl animate-bounce"></i>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Neural Link Sent</h1>
            <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[9px]">Awaiting Identity Confirmation</p>
          </div>

          <div className="bg-slate-900/60 rounded-[48px] border border-slate-800/80 p-8 md:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl text-center">
            <h2 className="text-xl font-black text-white mb-4">Go to email to verify your email</h2>
            <p className="text-slate-400 text-sm leading-relaxed mb-8">
              We've sent a secure verification link to <span className="text-indigo-400 font-bold">{email}</span>. 
              Please click the link in your inbox to activate your Edu World account.
            </p>
            
            <div className="p-4 bg-slate-950/50 rounded-2xl border border-slate-800 mb-8">
              <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Can't find it?</p>
              <p className="text-[9px] text-slate-600 mt-1 uppercase tracking-widest font-bold">Check your Spam or Promotions folder</p>
            </div>

            <button
              onClick={() => {
                setShowVerificationMsg(false);
                setIsLogin(true);
              }}
              className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl active:scale-95 transition-all"
            >
              Return to Access Hub
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#020617] flex items-center justify-center p-6 text-slate-100 relative overflow-hidden">
      <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none"></div>
      <div className="absolute bottom-1/4 right-1/4 w-[400px] h-[400px] bg-emerald-600/10 rounded-full blur-[120px] animate-pulse pointer-events-none delay-1000"></div>

      <div className="w-full max-w-[480px] z-10 animate-in fade-in zoom-in-95 duration-700">
        
        {showAppOverlay && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-xl animate-in fade-in duration-300">
            <div className="bg-slate-900 w-full max-m-md rounded-[40px] border border-slate-800 shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300">
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
          </div>
          <h1 className="text-4xl font-black text-white tracking-tighter uppercase mb-2">Edu World</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[9px]">Neural Education Protocol</p>
        </div>

        <div className="bg-slate-900/60 rounded-[48px] border border-slate-800/80 p-8 md:p-14 shadow-[0_50px_100px_rgba(0,0,0,0.8)] backdrop-blur-2xl relative overflow-hidden">
          <div className="absolute inset-x-0 top-0 h-1.5 bg-gradient-to-r from-transparent via-indigo-600/30 to-transparent"></div>

          <div className="flex bg-slate-950/50 p-1.5 rounded-2xl mb-12 relative z-10 border border-slate-800/50">
            <button
              onClick={() => { setIsLogin(true); setError(''); }}
              className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${isLogin ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-600'}`}
            >
              Access
            </button>
            <button
              onClick={() => { setIsLogin(false); setError(''); }}
              className={`flex-1 py-3.5 rounded-xl text-[10px] font-black uppercase tracking-[0.2em] transition-all duration-300 ${!isLogin ? 'bg-indigo-600 text-white shadow-xl' : 'text-slate-600'}`}
            >
              Registry
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {!isLogin && (
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Identity Display Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-slate-950/80 border border-slate-800 rounded-[20px] px-6 py-5 focus:border-indigo-600/50 outline-none font-bold text-sm text-white"
                  placeholder="Full name"
                />
              </div>
            )}

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Email Node</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-[20px] px-6 py-5 focus:border-indigo-600/50 outline-none font-bold text-sm text-white"
                placeholder="name@example.com"
              />
            </div>

            <div className="space-y-2">
              <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Access Key</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-slate-950/80 border border-slate-800 rounded-[20px] px-6 py-5 focus:border-indigo-600/50 outline-none font-bold text-sm text-white"
                placeholder="••••••••"
              />
            </div>

            {error && <p className="text-[10px] font-black text-rose-500 text-center uppercase tracking-[0.2em]">{error}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full py-5 bg-indigo-600 text-white rounded-[24px] font-black text-xs uppercase tracking-[0.3em] hover:bg-indigo-700 shadow-xl active:scale-95 transition-all disabled:opacity-50"
            >
              {loading ? 'Authenticating...' : (isLogin ? 'Initiate Sync' : 'Create Identity')}
            </button>
          </form>

          <div className="mt-12 text-center">
            <button 
              onClick={() => setShowAppOverlay(true)}
              className="flex items-center justify-center space-x-3 text-slate-700 hover:text-indigo-500 transition-all mx-auto"
            >
              <i className="fab fa-android text-lg"></i>
              <span className="text-[10px] font-black uppercase tracking-[0.2em]">Platform Distribution</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;
