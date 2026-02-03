
import React, { useState, useEffect, useRef } from 'react';
import { DatabaseConfig } from '../types';
import { saveDatabaseConfig, getAllDatabaseConfigs, deleteDatabaseConfig } from '../services/storage';

const DatabaseEditor: React.FC = () => {
  const [configs, setConfigs] = useState<DatabaseConfig[]>([]);
  const [formData, setFormData] = useState({
    dbName: 'neondb',
    userName: 'neondb_owner',
    password: 'npg_GDiXx5aZBtJ2',
    hostName: 'ep-shiny-pond-a1trjhw6-pooler.ap-southeast-1.aws.neon.tech',
    connectionString: 'postgresql://neondb_owner:npg_GDiXx5aZBtJ2@ep-shiny-pond-a1trjhw6-pooler.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require',
    provider: 'neon' as 'neon' | 'mysql' | 'postgres'
  });
  const [isSyncing, setIsSyncing] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');
  const [consoleInput, setConsoleInput] = useState('SELECT * FROM courses LIMIT 10;');
  const [consoleOutput, setConsoleOutput] = useState<any[]>([]);
  const [isQuerying, setIsQuerying] = useState(false);
  const [activeView, setActiveView] = useState<'topology' | 'sdk'>('topology');
  
  const consoleEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadConfigs();
  }, []);

  const loadConfigs = async () => {
    const data = await getAllDatabaseConfigs();
    setConfigs(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.dbName && !formData.connectionString) return;

    setIsSyncing(true);
    setSuccessMessage('');

    // Simulate Neon coupling sequence
    setTimeout(async () => {
      const newConfig: DatabaseConfig = {
        id: Math.random().toString(36).substr(2, 9),
        dbName: formData.dbName || 'neondb',
        userName: formData.userName || 'neondb_owner',
        password: formData.password,
        hostName: formData.hostName || 'db.neon.tech',
        connectionString: formData.connectionString,
        provider: formData.provider,
        status: 'connected',
        createdAt: new Date()
      };

      await saveDatabaseConfig(newConfig);
      await loadConfigs();
      
      setIsSyncing(false);
      setSuccessMessage(`${formData.provider.toUpperCase()} node coupled to neural core.`);
      setTimeout(() => setSuccessMessage(''), 3500);
    }, 1200);
  };

  const handleRunQuery = () => {
    if (!consoleInput.trim()) return;
    setIsQuerying(true);
    
    // Simulate SQL execution
    setTimeout(() => {
      const mockResults = [
        { id: 'course_1', title: 'Neural Ethics', instructor: 'Aris AI', status: 'deployed' },
        { id: 'course_2', title: 'Quantum Flow', instructor: 'Dept Physics', status: 'syncing' }
      ];
      setConsoleOutput(prev => [...prev, { query: consoleInput, results: mockResults, timestamp: new Date() }]);
      setIsQuerying(false);
      setTimeout(() => consoleEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }, 800);
  };

  const handleDelete = async (id: string) => {
    if (confirm('Sever connection to this Neon database node?')) {
      await deleteDatabaseConfig(id);
      await loadConfigs();
    }
  };

  const codeSnippet = `import { neon } from '@netlify/neon';

const sql = neon(); // automatically uses env NETLIFY_DATABASE_URL

// Fetch content from neural core
const [post] = await sql\`SELECT * FROM posts WHERE id = \${postId}\`;`;

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700 pb-32">
      {/* Neon Hero Header */}
      <div className="relative p-10 md:p-16 bg-black rounded-[40px] border border-emerald-500/20 overflow-hidden shadow-[0_0_80px_rgba(16,185,129,0.05)]">
        <div className="absolute top-0 right-0 p-10 opacity-10">
           <i className="fas fa-bolt-lightning text-[120px] text-emerald-400 rotate-12"></i>
        </div>
        
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
           <div className="space-y-4 text-center md:text-left">
              <div className="flex items-center justify-center md:justify-start space-x-3">
                 <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[9px] font-black uppercase tracking-widest rounded-full border border-emerald-500/20">Neon Integrated</span>
                 <span className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-ping"></span>
              </div>
              <h1 className="text-4xl md:text-6xl font-black text-white tracking-tighter uppercase italic leading-tight">
                 Neon <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-cyan-500">Engine</span>
              </h1>
              <div className="flex items-center space-x-3 mt-2">
                <i className="fas fa-water text-cyan-400 animate-pulse"></i>
                <p className="text-slate-500 font-bold uppercase tracking-[0.4em] text-[10px] md:text-xs">Shiny-Pond Cluster Identified</p>
              </div>
           </div>
           
           <div className="grid grid-cols-2 gap-4">
              <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl text-center min-w-[140px] shadow-inner">
                 <p className="text-2xl font-black text-white">{configs.length}</p>
                 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Nodes</p>
              </div>
              <div className="p-6 bg-slate-900/50 border border-slate-800 rounded-3xl text-center min-w-[140px] shadow-inner">
                 <p className="text-2xl font-black text-emerald-400">Stable</p>
                 <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-1">Link Status</p>
              </div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-10">
        {/* Connection Wizard */}
        <div className="lg:col-span-5 space-y-8">
          <div className="bg-slate-900/40 backdrop-blur-2xl rounded-[32px] border border-slate-800 p-8 md:p-10 shadow-2xl relative overflow-hidden">
            <h3 className="text-xs font-black text-white uppercase tracking-[0.4em] mb-8 flex items-center">
              <i className="fas fa-plug-circle-bolt mr-4 text-emerald-500"></i> Provision Node
            </h3>

            <div className="flex bg-slate-950 p-1 rounded-2xl mb-8 border border-slate-800">
               {['neon', 'postgres', 'mysql'].map((p) => (
                  <button 
                    key={p}
                    onClick={() => setFormData({...formData, provider: p as any})}
                    className={`flex-1 py-2.5 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all ${formData.provider === p ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                  >
                    {p}
                  </button>
               ))}
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-[9px] font-black text-slate-500 uppercase tracking-widest ml-1">Neon Connection String</label>
                <textarea 
                  value={formData.connectionString}
                  onChange={e => setFormData({...formData, connectionString: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-emerald-400 font-mono text-[10px] focus:border-emerald-500/50 outline-none transition-all h-28 no-scrollbar shadow-inner"
                  placeholder="postgres://user:pass@ep-shiny-pond-..."
                />
              </div>

              <div className="relative flex items-center py-2">
                 <div className="flex-1 border-t border-slate-800/50"></div>
                 <span className="px-4 text-[7px] font-black text-slate-700 uppercase tracking-[0.5em]">Identity Profile</span>
                 <div className="flex-1 border-t border-slate-800/50"></div>
              </div>

              <div className="space-y-4">
                <input 
                  type="text" 
                  value={formData.dbName}
                  onChange={e => setFormData({...formData, dbName: e.target.value})}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white font-bold text-xs focus:border-emerald-500/30 outline-none"
                  placeholder="Cluster Name"
                />
                <div className="grid grid-cols-2 gap-4">
                   <input 
                    type="text" 
                    value={formData.userName}
                    onChange={e => setFormData({...formData, userName: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white font-bold text-xs focus:border-emerald-500/30 outline-none"
                    placeholder="User ID"
                  />
                  <input 
                    type="password" 
                    value={formData.password}
                    onChange={e => setFormData({...formData, password: e.target.value})}
                    className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3.5 text-white font-bold text-xs focus:border-emerald-500/30 outline-none"
                    placeholder="Access Key"
                  />
                </div>
              </div>

              {successMessage && (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl text-emerald-400 text-[10px] font-black uppercase tracking-widest text-center animate-in zoom-in">
                  <i className="fas fa-check-circle mr-2"></i> {successMessage}
                </div>
              )}

              <button 
                type="submit" 
                disabled={isSyncing || (!formData.connectionString && !formData.dbName)}
                className="w-full py-5 bg-emerald-600 text-white rounded-[20px] font-black uppercase text-[11px] tracking-[0.4em] shadow-[0_20px_40px_rgba(16,185,129,0.2)] active:scale-95 disabled:opacity-30 transition-all flex items-center justify-center"
              >
                {isSyncing ? <><i className="fas fa-circle-notch fa-spin mr-3"></i> Synchronizing...</> : 'Couple Data Node'}
              </button>
            </form>
          </div>

          {/* Node Status Board */}
          <div className="space-y-4">
             <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.5em] px-4">Cluster Registry</h3>
             <div className="space-y-3">
                {configs.map(config => (
                   <div key={config.id} className="p-5 bg-slate-900 border border-slate-800 rounded-[28px] flex items-center justify-between group hover:border-emerald-500/30 transition-all">
                      <div className="flex items-center space-x-4 min-w-0">
                         <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center text-emerald-400 border border-slate-800 shadow-inner group-hover:scale-105 transition-transform">
                            <i className="fas fa-database text-sm"></i>
                         </div>
                         <div className="min-w-0">
                            <p className="text-sm font-black text-white truncate">{config.dbName}</p>
                            <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{config.provider.toUpperCase()} • {config.hostName.split('-')[1]}</p>
                         </div>
                      </div>
                      <div className="flex items-center space-x-2">
                         <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 border border-emerald-500/20">
                            <i className="fas fa-link text-[10px]"></i>
                         </div>
                         <button onClick={() => handleDelete(config.id)} className="w-8 h-8 rounded-lg hover:bg-rose-500/10 text-slate-700 hover:text-rose-500 transition-all">
                            <i className="fas fa-trash-alt text-[10px]"></i>
                         </button>
                      </div>
                   </div>
                ))}
                {configs.length === 0 && (
                   <div className="py-12 border-2 border-dashed border-slate-800 rounded-[32px] text-center opacity-30">
                      <p className="text-[10px] font-black uppercase tracking-widest">No active nodes provisioned.</p>
                   </div>
                )}
             </div>
          </div>
        </div>

        {/* Neural Console / SDK Logic */}
        <div className="lg:col-span-7 space-y-6">
           <div className="flex bg-slate-900/50 p-1.5 rounded-2xl border border-slate-800">
              <button 
                onClick={() => setActiveView('topology')}
                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center ${activeView === 'topology' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                <i className="fas fa-terminal mr-2"></i> SQL Console
              </button>
              <button 
                onClick={() => setActiveView('sdk')}
                className={`flex-1 py-3 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] transition-all flex items-center justify-center ${activeView === 'sdk' ? 'bg-indigo-600 text-white' : 'text-slate-500 hover:text-white'}`}
              >
                <i className="fas fa-code mr-2"></i> SDK Integration
              </button>
           </div>

           {activeView === 'topology' ? (
             <div className="bg-[#0a0c14] rounded-[40px] border border-slate-800 shadow-2xl flex flex-col h-[750px] overflow-hidden animate-in slide-in-from-right-4">
                <div className="p-6 border-b border-slate-800 flex items-center justify-between bg-slate-950/40">
                   <div className="flex items-center space-x-4">
                      <div className="flex space-x-1.5">
                         <div className="w-2.5 h-2.5 rounded-full bg-rose-500/50"></div>
                         <div className="w-2.5 h-2.5 rounded-full bg-amber-500/50"></div>
                         <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/50"></div>
                      </div>
                      <span className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">Neural SQL Console</span>
                   </div>
                   <div className="flex items-center space-x-4">
                      <span className="text-[8px] font-mono text-emerald-500/50">PostgreSQL 16.2</span>
                      <button 
                        onClick={() => setConsoleOutput([])}
                        className="px-3 py-1 bg-slate-900 border border-slate-800 rounded-lg text-[8px] font-black uppercase text-slate-500 hover:text-white"
                      >
                        Clear Log
                      </button>
                   </div>
                </div>

                <div className="flex-1 overflow-y-auto p-6 md:p-10 space-y-8 no-scrollbar scroll-smooth">
                   {consoleOutput.length === 0 && (
                      <div className="h-full flex flex-col items-center justify-center opacity-10 grayscale">
                         <i className="fas fa-terminal text-[100px] mb-8"></i>
                         <p className="text-xs font-black uppercase tracking-[0.8em]">Awaiting Instruction</p>
                      </div>
                   )}
                   {consoleOutput.map((entry, idx) => (
                      <div key={idx} className="space-y-4 animate-in slide-in-from-left-4 duration-500">
                         <div className="flex items-center space-x-3 text-emerald-400/70 font-mono text-[11px]">
                            <i className="fas fa-angle-right"></i>
                            <span>{entry.query}</span>
                         </div>
                         <div className="bg-black/40 rounded-2xl border border-slate-800/50 overflow-hidden shadow-inner">
                            <table className="w-full text-left font-mono text-[10px]">
                               <thead className="bg-slate-900/50 border-b border-slate-800">
                                  <tr>
                                     {Object.keys(entry.results[0]).map(key => (
                                        <th key={key} className="px-4 py-3 text-slate-600 font-black uppercase tracking-widest">{key}</th>
                                     ))}
                                  </tr>
                               </thead>
                               <tbody>
                                  {entry.results.map((row: any, rIdx: number) => (
                                     <tr key={rIdx} className="border-b border-slate-800/30 hover:bg-emerald-500/5 transition-colors">
                                        {Object.values(row).map((val: any, vIdx) => (
                                           <td key={vIdx} className="px-4 py-3 text-slate-300">{val}</td>
                                        ))}
                                     </tr>
                                  ))}
                               </tbody>
                            </table>
                            <div className="px-4 py-2 bg-slate-950/50 text-[9px] font-bold text-slate-700 flex justify-between uppercase tracking-widest">
                               <span>Rows: {entry.results.length}</span>
                               <span>Runtime: {Math.floor(Math.random() * 50) + 10}ms</span>
                            </div>
                         </div>
                      </div>
                   ))}
                   <div ref={consoleEndRef} />
                </div>

                <div className="p-6 md:p-8 bg-slate-950/80 border-t border-slate-800">
                   <div className="flex flex-col space-y-4">
                      <div className="relative group">
                         <i className="fas fa-terminal absolute left-4 top-4 text-emerald-500 text-xs opacity-50 group-focus-within:opacity-100 transition-opacity"></i>
                         <input 
                           type="text" 
                           value={consoleInput}
                           onChange={e => setConsoleInput(e.target.value)}
                           onKeyDown={e => e.key === 'Enter' && handleRunQuery()}
                           className="w-full bg-black border border-slate-800 rounded-2xl pl-12 pr-4 py-4 text-emerald-400 font-mono text-sm focus:border-emerald-500/50 outline-none transition-all shadow-inner"
                           placeholder="Execute SQL instruction..."
                         />
                      </div>
                      <div className="flex items-center justify-between">
                         <p className="text-[8px] font-black text-slate-700 uppercase tracking-widest px-2">
                            <i className="fas fa-shield-halved mr-2"></i> Real-time Cloud Environment
                         </p>
                         <button 
                          onClick={handleRunQuery}
                          disabled={isQuerying || !consoleInput}
                          className="px-8 py-3 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white transition-all shadow-xl active:scale-95 disabled:opacity-30"
                         >
                           {isQuerying ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-play mr-2"></i>}
                           Execute Query
                         </button>
                      </div>
                   </div>
                </div>
             </div>
           ) : (
             <div className="bg-[#0a0c14] rounded-[40px] border border-slate-800 shadow-2xl p-10 space-y-10 animate-in slide-in-from-left-4 h-[750px] overflow-y-auto no-scrollbar">
                <div className="space-y-4">
                   <div className="flex items-center space-x-4">
                      <div className="w-12 h-12 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-xl">
                        <i className="fas fa-cube text-xl"></i>
                      </div>
                      <div>
                        <h3 className="text-xl font-black text-white tracking-tight italic uppercase">Neon SDK (Edge)</h3>
                        <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Connect your Netlify node to the Shiny-Pond cluster</p>
                      </div>
                   </div>
                </div>

                <div className="space-y-6">
                   <div className="flex items-center justify-between px-2">
                      <h4 className="text-[9px] font-black text-indigo-400 uppercase tracking-[0.4em]">Implementation Template</h4>
                      <button 
                        onClick={() => { navigator.clipboard.writeText(codeSnippet); setSuccessMessage('Snippet copied to clipboard'); setTimeout(() => setSuccessMessage(''), 2000); }}
                        className="text-[8px] font-black text-slate-600 uppercase tracking-widest hover:text-white transition-colors"
                      >
                        <i className="fas fa-copy mr-2"></i> Copy Snippet
                      </button>
                   </div>
                   <div className="bg-black/60 rounded-[32px] border border-slate-800 p-8 md:p-10 font-mono text-sm leading-relaxed relative overflow-hidden group shadow-inner">
                      <pre className="text-emerald-400 overflow-x-auto no-scrollbar">
                        <code>{codeSnippet}</code>
                      </pre>
                      <div className="absolute top-0 right-0 p-8 opacity-5 group-hover:opacity-10 transition-opacity">
                        <i className="fas fa-code text-[120px]"></i>
                      </div>
                   </div>
                </div>

                <div className="p-8 bg-indigo-600/5 border border-indigo-500/20 rounded-[32px] space-y-6">
                   <div className="flex items-start space-x-4">
                      <i className="fas fa-info-circle text-indigo-400 mt-1"></i>
                      <div className="space-y-2">
                        <p className="text-xs font-black text-indigo-100 uppercase tracking-widest">Netlify Deploy Node</p>
                        <p className="text-[10px] text-slate-400 leading-relaxed">
                          Ensure the <code className="text-indigo-400 bg-black/40 px-1.5 py-0.5 rounded">NETLIFY_DATABASE_URL</code> is properly mapped in your node distribution panel.
                        </p>
                      </div>
                   </div>
                   <div className="bg-black/40 p-4 rounded-xl border border-slate-800/50">
                      <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em] mb-2">Target Node Endpoint</p>
                      <p className="text-[11px] font-mono text-emerald-400/70 break-all select-all">postgresql://neondb_owner:npg_GDiXx5aZBtJ2@ep-shiny-pond-a1trjhw6-pooler.ap-southeast-1.aws.neon.tech/neondb</p>
                   </div>
                </div>
             </div>
           )}
        </div>
      </div>
    </div>
  );
};

export default DatabaseEditor;
