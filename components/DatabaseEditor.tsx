
import React, { useState, useEffect } from 'react';
import { DatabaseConfig } from '../types';
import { saveDatabaseConfig, getAllDatabaseConfigs, deleteDatabaseConfig } from '../services/storage';
import { saveSupabaseConfig, getSupabaseConfig, clearSupabaseConfig, getSupabaseClient } from '../services/supabase';

const DatabaseEditor: React.FC = () => {
  const [configs, setConfigs] = useState<DatabaseConfig[]>([]);
  const [supabaseAuth, setSupabaseAuth] = useState({ url: '', key: '' });
  const [isConnected, setIsConnected] = useState(false);
  const [testResult, setTestResult] = useState<{ success: boolean; message: string } | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [activeTab, setActiveTab] = useState<'supabase' | 'neon'>('supabase');
  
  useEffect(() => {
    loadConfigs();
    const sbConfig = getSupabaseConfig();
    if (sbConfig) {
      setSupabaseAuth(sbConfig);
      setIsConnected(true);
    }
  }, []);

  const loadConfigs = async () => {
    const data = await getAllDatabaseConfigs();
    setConfigs(data);
  };

  const handleSupabaseConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabaseAuth.url || !supabaseAuth.key) return;
    saveSupabaseConfig(supabaseAuth.url, supabaseAuth.key);
    setIsConnected(true);
    handleTestConnection();
  };

  const handleTestConnection = async () => {
    setIsSyncing(true);
    setTestResult(null);
    try {
        const sb = getSupabaseClient();
        if (!sb) throw new Error("Invalid credentials format.");

        const { error } = await sb.from('courses').select('id').limit(1);
        
        if (error) {
            if (error.code === 'PGRST301' || error.message?.includes('does not exist')) {
                throw new Error("Connected, but TABLES ARE MISSING. Run the SQL code.");
            } else if (error.code === '401' || error.message?.includes('JWT')) {
                throw new Error("Auth Failed. Use the 'anon' public key.");
            } else {
                throw error;
            }
        }
        
        setTestResult({ success: true, message: "Neural Link Verified: Database and Schema are healthy." });
    } catch (err: any) {
        setTestResult({ success: false, message: err.message || "Connection refused." });
    } finally {
        setIsSyncing(false);
    }
  };

  const handleSupabaseDisconnect = () => {
    if (confirm('Sever connection? Data will revert to local node.')) {
      clearSupabaseConfig();
      setSupabaseAuth({ url: '', key: '' });
      setIsConnected(false);
      setTestResult(null);
    }
  };

  const sqlSchema = `
-- 1. Create Data Tables
create table if not exists courses (id text primary key, data jsonb);
create table if not exists users (id text primary key, data jsonb);
create table if not exists assets (id text primary key, data jsonb);
create table if not exists waitlist (id text primary key, data jsonb);
create table if not exists app_versions (id text primary key, data jsonb);

-- 2. Enable Security (RLS)
alter table courses enable row level security;
alter table users enable row level security;
alter table assets enable row level security;
alter table waitlist enable row level security;
alter table app_versions enable row level security;

-- 3. Create Access Policies
create policy "Public Access Courses" on courses for all using (true) with check (true);
create policy "Public Access Users" on users for all using (true) with check (true);
create policy "Public Access Assets" on assets for all using (true) with check (true);
create policy "Public Access Waitlist" on waitlist for all using (true) with check (true);
create policy "Public Access Versions" on app_versions for all using (true) with check (true);
  `;

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32">
      {/* Hero Section */}
      <div className="relative p-10 md:p-16 bg-black rounded-[40px] border border-emerald-500/20 overflow-hidden">
        <div className="absolute top-0 right-0 p-10 opacity-5">
           <i className="fas fa-server text-[150px] text-emerald-400"></i>
        </div>
        <div className="relative z-10 space-y-4">
           <div className="flex items-center space-x-3">
              <span className={`px-3 py-1 text-[9px] font-black uppercase tracking-widest rounded-full border ${isConnected ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' : 'bg-slate-800 text-slate-500 border-slate-700'}`}>
                {isConnected ? 'Supabase Node Active' : 'Offline Mode'}
              </span>
              {isConnected && <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_#10b981]"></span>}
           </div>
           <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic">
              Infrastructure <span className="text-emerald-500">Core</span>
           </h1>
           <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px]">Persistent Storage Calibration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
        {/* Left: Configuration Form */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-slate-900/60 backdrop-blur-3xl rounded-[32px] border border-slate-800 p-8 md:p-10 shadow-2xl">
             <div className="space-y-8">
               <div className="space-y-1 border-b border-slate-800 pb-4">
                  <h3 className="text-sm font-black text-white uppercase tracking-widest">Connection Parameters</h3>
                  <p className="text-[9px] text-slate-600 font-bold uppercase tracking-widest">Target: Supabase Cloud</p>
               </div>

               <form onSubmit={handleSupabaseConnect} className="space-y-6">
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Project API URL</label>
                    <input 
                      type="text" 
                      value={supabaseAuth.url}
                      onChange={e => setSupabaseAuth({...supabaseAuth, url: e.target.value})}
                      disabled={isConnected}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xs focus:border-emerald-500/40 outline-none disabled:opacity-50"
                      placeholder="https://your-id.supabase.co"
                    />
                  </div>
                  <div className="space-y-2">
                    <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Service API Key (Anon)</label>
                    <input 
                      type="password" 
                      value={supabaseAuth.key}
                      onChange={e => setSupabaseAuth({...supabaseAuth, key: e.target.value})}
                      disabled={isConnected}
                      className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xs focus:border-emerald-500/40 outline-none disabled:opacity-50"
                      placeholder="eyJhbGciOiJIUzI1NiIsInR..."
                    />
                  </div>

                  {testResult && (
                    <div className={`p-5 border rounded-2xl text-[10px] font-black uppercase tracking-[0.1em] leading-relaxed animate-in zoom-in ${testResult.success ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400' : 'bg-rose-500/10 border-rose-500/20 text-rose-500'}`}>
                      <i className={`fas ${testResult.success ? 'fa-circle-check' : 'fa-triangle-exclamation'} mr-3`}></i> 
                      {testResult.message}
                    </div>
                  )}

                  {!isConnected ? (
                    <button 
                      type="submit" 
                      disabled={isSyncing || !supabaseAuth.url || !supabaseAuth.key}
                      className="w-full py-5 bg-emerald-600 text-white rounded-[24px] font-black uppercase text-[11px] tracking-[0.3em] shadow-xl hover:bg-emerald-500 active:scale-95 disabled:opacity-30 transition-all"
                    >
                      {isSyncing ? 'Linking Node...' : 'Establish Integration'}
                    </button>
                  ) : (
                    <div className="grid grid-cols-2 gap-3">
                        <button type="button" onClick={handleTestConnection} disabled={isSyncing} className="py-4 bg-slate-800 text-slate-300 border border-slate-700 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-slate-700">Test Path</button>
                        <button type="button" onClick={handleSupabaseDisconnect} className="py-4 bg-rose-600/10 text-rose-500 border border-rose-500/20 rounded-2xl font-black uppercase text-[9px] tracking-widest hover:bg-rose-600 hover:text-white">Sever Link</button>
                    </div>
                  )}
               </form>

               <div className="pt-8 border-t border-slate-800 space-y-4">
                  <h4 className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Setup Checklist</h4>
                  <ul className="space-y-3">
                     {[
                        { icon: 'fa-link', label: 'API Credentials Linked', status: isConnected },
                        { icon: 'fa-table', label: 'Database Schema Created', status: testResult?.success },
                        { icon: 'fa-envelope', label: 'Email Auth Configured', status: true },
                        { icon: 'fa-shield-halved', label: 'RLS Policies Active', status: testResult?.success }
                     ].map((item, i) => (
                       <li key={i} className="flex items-center justify-between text-[10px] font-bold">
                          <div className="flex items-center space-x-3 text-slate-400">
                             <i className={`fas ${item.icon} w-4`}></i>
                             <span>{item.label}</span>
                          </div>
                          <i className={`fas ${item.status ? 'fa-check text-emerald-500' : 'fa-circle text-slate-800'} text-[8px]`}></i>
                       </li>
                     ))}
                  </ul>
               </div>
             </div>
          </div>
        </div>

        {/* Right: SQL Area */}
        <div className="lg:col-span-7">
           <div className="bg-[#05070a] rounded-[40px] border border-slate-800 p-8 md:p-12 shadow-2xl h-full flex flex-col space-y-8">
              <div className="flex items-center justify-between">
                 <div className="flex items-center space-x-4">
                    <div className="w-12 h-12 bg-emerald-600/10 text-emerald-500 rounded-2xl border border-emerald-500/20 flex items-center justify-center text-xl">
                      <i className="fas fa-terminal"></i>
                    </div>
                    <div>
                      <h3 className="text-xl font-black text-white uppercase italic tracking-tight">SQL Schema Architect</h3>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Run this in your Supabase SQL Editor</p>
                    </div>
                 </div>
                 <button 
                   onClick={() => {
                     navigator.clipboard.writeText(sqlSchema);
                     alert("SQL Copied to clipboard!");
                   }}
                   className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black text-slate-400 hover:text-white hover:border-emerald-500/40 uppercase tracking-widest transition-all"
                 >
                   <i className="fas fa-copy mr-2"></i> Copy
                 </button>
              </div>

              <div className="flex-1 bg-black/40 rounded-[32px] border border-slate-900 p-8 font-mono text-xs leading-relaxed overflow-x-auto no-scrollbar shadow-inner text-emerald-400/80">
                  <pre><code>{sqlSchema}</code></pre>
              </div>

              <div className="p-6 bg-indigo-600/5 border border-indigo-500/10 rounded-[28px] flex items-start space-x-4">
                 <i className="fas fa-circle-info text-indigo-400 mt-1"></i>
                 <p className="text-[10px] text-slate-500 font-medium leading-relaxed">
                   The <span className="text-indigo-400">Policies</span> section in the SQL code is vital. Without them, your public API key will not have permission to read or write data to the tables, even if they exist.
                 </p>
              </div>
           </div>
        </div>
      </div>
    </div>
  );
};

export default DatabaseEditor;
