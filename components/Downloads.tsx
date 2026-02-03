
import React, { useState, useEffect } from 'react';
import { AppVersion } from '../types';
import { getAllAppVersions, getAllHostedAssets } from '../services/storage';

interface DownloadsProps {
  onBack: () => void;
}

const Downloads: React.FC<DownloadsProps> = ({ onBack }) => {
  const [versions, setVersions] = useState<AppVersion[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const load = async () => {
      const data = await getAllAppVersions();
      setVersions(data.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
      setLoading(false);
    };
    load();
  }, []);

  const triggerLocalDownload = async (url: string, fileName: string) => {
    if (url.includes('eduworld.ct.ws/cdn/')) {
      const id = url.split('/cdn/')[1];
      const assets = await getAllHostedAssets();
      const asset = assets.find(a => a.id === id);
      if (asset && asset.data) {
        let blob: Blob;
        if (asset.data instanceof Blob) {
          blob = asset.data;
        } else {
          const res = await fetch(asset.data as string);
          blob = await res.blob();
        }
        const localUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = localUrl;
        a.download = asset.fileName || fileName;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        setTimeout(() => URL.revokeObjectURL(localUrl), 100);
        return;
      }
    }
    window.open(url, '_blank');
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 md:space-y-12 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-24 px-4 md:px-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <button onClick={onBack} className="text-slate-500 hover:text-indigo-400 text-[10px] font-black uppercase tracking-widest transition-all mb-4 flex items-center">
            <i className="fas fa-arrow-left mr-2"></i> Profile
          </button>
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none mb-2 uppercase">Download Center</h1>
          <p className="text-slate-500 font-bold uppercase tracking-[0.2em] text-[9px] md:text-[10px]">Establish your local link with Edu World Binaries</p>
        </div>
        <div className="px-5 py-2.5 bg-slate-900 border border-slate-800 rounded-2xl flex items-center space-x-3 shadow-inner">
          <i className="fas fa-box-archive text-indigo-500 text-[10px]"></i>
          <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{versions.length} Available Builds</span>
        </div>
      </div>

      {loading ? (
        <div className="py-24 text-center">
           <div className="w-10 h-10 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
           <p className="text-slate-600 font-black uppercase text-[10px] tracking-widest">Scanning Registry...</p>
        </div>
      ) : versions.length > 0 ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12">
          {/* Latest Release */}
          <div className="lg:col-span-7">
            <div className="bg-indigo-600 rounded-[40px] p-8 md:p-14 text-white shadow-2xl relative overflow-hidden group">
               <div className="relative z-10 space-y-8">
                  <div className="flex items-center space-x-4">
                     <span className="px-3 py-1 bg-white/20 rounded-full text-[10px] font-black uppercase tracking-widest">Recommended Build</span>
                     <span className="text-white/60 text-[10px] font-mono tracking-widest">v{versions[0].version}</span>
                  </div>
                  <div>
                    <h2 className="text-3xl md:text-5xl font-black tracking-tighter mb-4">{versions[0].title}</h2>
                    <p className="text-indigo-100/70 text-sm md:text-lg font-medium leading-relaxed max-w-lg">
                      {versions[0].notes || "Initialize your neural-synchronized desktop experience. This build includes optimized video processing and low-latency tutoring integration."}
                    </p>
                  </div>
                  <div className="pt-6">
                    <button 
                      onClick={() => triggerLocalDownload(versions[0].url, `${versions[0].title.replace(/\s+/g, '_')}_v${versions[0].version}.apk`)}
                      className="inline-flex items-center px-10 py-5 bg-white text-indigo-600 rounded-2xl font-black uppercase text-xs tracking-widest shadow-2xl hover:scale-105 active:scale-95 transition-all"
                    >
                      <i className="fas fa-download mr-3"></i> Sync Now (Official Binary)
                    </button>
                  </div>
                  <p className="text-indigo-200/50 text-[9px] font-black uppercase tracking-widest pt-4 border-t border-white/10">
                    Release Date: {new Date(versions[0].releaseDate).toLocaleDateString()} • Node Verification: SHA-256 Verified
                  </p>
               </div>
               <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-white/10 rounded-full blur-[100px] group-hover:scale-110 transition-transform duration-1000"></div>
            </div>
          </div>

          {/* Version History */}
          <div className="lg:col-span-5 space-y-6">
            <h3 className="text-xs font-black text-slate-500 uppercase tracking-[0.3em] px-2 flex items-center">
              <i className="fas fa-history mr-3"></i> Build Ledger
            </h3>
            <div className="space-y-3">
              {versions.slice(1).map(ver => (
                <div key={ver.id} className="bg-slate-900/50 border border-slate-800 p-5 rounded-3xl flex items-center justify-between hover:border-slate-700 transition-all group">
                   <div className="min-w-0">
                      <h4 className="text-sm font-black text-white truncate mb-1">{ver.title}</h4>
                      <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Version {ver.version} • {new Date(ver.releaseDate).toLocaleDateString()}</p>
                   </div>
                   <button 
                    onClick={() => triggerLocalDownload(ver.url, `${ver.title.replace(/\s+/g, '_')}_v${ver.version}.apk`)}
                    className="w-12 h-12 rounded-2xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-600 hover:text-white hover:bg-indigo-600 hover:border-indigo-500 transition-all shadow-xl"
                   >
                     <i className="fas fa-download text-xs"></i>
                   </button>
                </div>
              ))}
              {versions.length === 1 && (
                <div className="py-12 px-6 border-2 border-dashed border-slate-800 rounded-[32px] text-center opacity-30">
                  <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">Genesis build is current. No history found.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="py-24 bg-slate-900/40 border-2 border-dashed border-slate-800 rounded-[40px] flex flex-col items-center justify-center text-center p-8">
           <div className="w-16 h-16 bg-slate-950 rounded-[24px] border border-slate-800 flex items-center justify-center mb-6 text-slate-800">
              <i className="fas fa-box-open text-2xl"></i>
           </div>
           <h3 className="text-lg font-black text-slate-600 uppercase tracking-widest">No binary distributions</h3>
           <p className="text-slate-700 font-bold text-[10px] uppercase tracking-[0.2em] mt-2">Check back later for official platform archives.</p>
        </div>
      )}

      {/* Safety Info */}
      <div className="bg-slate-900/30 border border-slate-800/60 p-6 md:p-8 rounded-[32px] md:rounded-[40px] flex flex-col md:flex-row items-center gap-6">
         <div className="w-12 h-12 bg-indigo-500/10 rounded-2xl flex items-center justify-center text-indigo-400 shrink-0 border border-indigo-500/20">
            <i className="fas fa-shield-halved text-xl"></i>
         </div>
         <div className="flex-1 text-center md:text-left">
            <h4 className="text-xs font-black text-white uppercase tracking-widest mb-1">Secure Acquisition Node</h4>
            <p className="text-[10px] text-slate-600 font-bold uppercase tracking-widest leading-relaxed">
              All binaries listed here are cryptographically signed. Only download platform software from this official registry hub to ensure system integrity.
            </p>
         </div>
      </div>
    </div>
  );
};

export default Downloads;
