
import React, { useState, useRef, useEffect, useMemo } from 'react';
import { User, Course, ThemeConfig, HostedAsset, AppVersion } from '../types';
import { 
  saveHostedAsset, 
  getAllHostedAssets, 
  deleteHostedAsset, 
  getWaitlistEntries, 
  deleteWaitlistEntry, 
  WaitlistEntry,
  saveAppVersion,
  getAllAppVersions,
  deleteAppVersion,
  getCDNBaseURL,
  setCDNBaseURL,
  getAllCoursesFromDB,
  saveCourseToDB
} from '../services/storage';

interface UserManagementProps {
  registeredUsers: User[];
  courses: Course[];
  onToggleEnrollment: (userId: string, courseId: string) => void;
  onUpdateCourse: (course: Course) => void;
  onAddCourse: (course: Course) => void;
  theme: ThemeConfig;
  setTheme: (theme: ThemeConfig) => void;
  accentOptions: { id: ThemeConfig['accentColor'], color: string, icon?: string }[];
  bgOptions: { id: ThemeConfig['backgroundStyle'], label: string }[];
}

const UserManagement: React.FC<UserManagementProps> = ({ 
  registeredUsers, 
  courses, 
  onToggleEnrollment, 
  onUpdateCourse,
  onAddCourse,
  theme, 
  setTheme, 
  accentOptions, 
  bgOptions 
}) => {
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  
  // CDN & Routing State
  const [hostedAssets, setHostedAssets] = useState<HostedAsset[]>([]);
  const [isUploading, setIsUploading] = useState(false);
  const [cdnUrl, setCdnUrl] = useState(getCDNBaseURL());
  const [isResyncing, setIsResyncing] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const binaryInputRef = useRef<HTMLInputElement>(null);

  // Waitlist State
  const [waitlistEntries, setWaitlistEntries] = useState<WaitlistEntry[]>([]);
  const [activeWaitlistTab, setActiveWaitlistTab] = useState<string | null>(null);

  // App Manager State
  const [appVersions, setAppVersions] = useState<AppVersion[]>([]);
  const [newAppVersion, setNewAppVersion] = useState({ title: '', version: '', url: '', notes: '' });
  const [isPublishingApp, setIsPublishingApp] = useState(false);
  const [binaryUploadProgress, setBinaryUploadProgress] = useState(false);

  // Quick Deploy State
  const [quickDeploy, setQuickDeploy] = useState({ title: '', category: '' });
  const [isDeploying, setIsDeploying] = useState(false);

  useEffect(() => {
    const loadData = async () => {
      const assets = await getAllHostedAssets();
      setHostedAssets(assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
      const entries = await getWaitlistEntries();
      setWaitlistEntries(entries);
      const versions = await getAllAppVersions();
      setAppVersions(versions.sort((a, b) => new Date(b.releaseDate).getTime() - new Date(a.releaseDate).getTime()));
    };
    loadData();
  }, []);

  const handleDetectUrl = () => {
    const origin = window.location.origin;
    const suggested = origin.endsWith('/') ? `${origin}cdn/` : `${origin}/cdn/`;
    setCdnUrl(suggested);
  };

  const handleUpdateBaseURL = () => {
    setCDNBaseURL(cdnUrl);
    setCopyFeedback('url-saved');
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleFullResync = async () => {
    if (!confirm('This will update ALL existing asset links in the registry to match the new Base URL. This is irreversible. Proceed?')) return;
    setIsResyncing(true);
    const newBase = getCDNBaseURL();

    try {
      const allAssets = await getAllHostedAssets();
      for (const asset of allAssets) {
        asset.url = `${newBase}${asset.id}`;
        await saveHostedAsset(asset);
      }
      setHostedAssets(allAssets);

      const allApps = await getAllAppVersions();
      for (const ver of allApps) {
        if (ver.url.includes('/cdn/')) {
          const id = ver.url.split('/cdn/')[1];
          ver.url = `${newBase}${id}`;
          await saveAppVersion(ver);
        }
      }
      setAppVersions(allApps);

      const allCourses = await getAllCoursesFromDB();
      for (const course of allCourses) {
        let changed = false;
        course.lessons.forEach(lesson => {
          lesson.resources?.forEach(res => {
            if (res.url.includes('/cdn/')) {
              const id = res.url.split('/cdn/')[1];
              res.url = `${newBase}${id}`;
              changed = true;
            }
          });
          if (typeof lesson.videoUrl === 'string' && lesson.videoUrl.includes('/cdn/')) {
            const id = lesson.videoUrl.split('/cdn/')[1];
            lesson.videoUrl = `${newBase}${id}`;
            changed = true;
          }
        });
        if (changed) {
          await saveCourseToDB(course);
          onUpdateCourse(course);
        }
      }
      
      setCopyFeedback('resync-complete');
    } catch (e) {
      console.error(e);
      alert('Neural Resync Failed.');
    } finally {
      setIsResyncing(false);
      setTimeout(() => setCopyFeedback(null), 3000);
    }
  };

  const triggerLocalDownload = async (url: string, fileName: string) => {
    if (url.includes('/cdn/')) {
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

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const assetId = Math.random().toString(36).substr(2, 6);
      const cdnBase = getCDNBaseURL();
      
      const newAsset: HostedAsset = {
        id: assetId,
        title: file.name.split('.')[0],
        fileName: file.name,
        data: base64,
        mimeType: file.type,
        url: `${cdnBase}${assetId}`,
        createdAt: new Date(),
      };

      await saveHostedAsset(newAsset);
      setHostedAssets(prev => [newAsset, ...prev]);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleBinaryUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setBinaryUploadProgress(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const assetId = `app-bin-${Math.random().toString(36).substr(2, 6)}`;
      const cdnBase = getCDNBaseURL();
      
      const newAsset: HostedAsset = {
        id: assetId,
        title: `Binary: ${file.name}`,
        fileName: file.name,
        data: base64,
        mimeType: file.type || 'application/vnd.android.package-archive',
        url: `${cdnBase}${assetId}`,
        createdAt: new Date(),
      };

      await saveHostedAsset(newAsset);
      setHostedAssets(prev => [newAsset, ...prev]);
      setNewAppVersion(prev => ({ ...prev, url: newAsset.url, title: prev.title || file.name.split('.')[0] }));
      setBinaryUploadProgress(false);
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleDeleteAsset = async (id: string) => {
    if (confirm('Permanently purge this asset from the CDN?')) {
      await deleteHostedAsset(id);
      setHostedAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  const handleToggleComingSoon = (course: Course) => {
    const updatedCourse = { 
      ...course, 
      isComingSoon: !course.isComingSoon,
      syncProgress: !course.isComingSoon ? (course.syncProgress || 10) : course.syncProgress,
      comingSoonDate: !course.isComingSoon ? (course.comingSoonDate || 'Q4 2026') : course.comingSoonDate
    };
    onUpdateCourse(updatedCourse);
  };

  const handleToggleStockOut = (course: Course) => {
    const updatedCourse = { ...course, isStockOut: !course.isStockOut };
    onUpdateCourse(updatedCourse);
  };

  const handleDeleteWaitlistEntry = async (id: string) => {
    if (confirm('Remove this lead from the waitlist?')) {
      await deleteWaitlistEntry(id);
      setWaitlistEntries(prev => prev.filter(e => e.id !== id));
    }
  };

  const handlePublishAppVersion = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newAppVersion.title || !newAppVersion.version || !newAppVersion.url) return;
    setIsPublishingApp(true);
    
    const version: AppVersion = {
      id: Math.random().toString(36).substr(2, 9),
      title: newAppVersion.title,
      version: newAppVersion.version,
      url: newAppVersion.url,
      notes: newAppVersion.notes,
      releaseDate: new Date()
    };

    await saveAppVersion(version);
    setAppVersions(prev => [version, ...prev]);
    setNewAppVersion({ title: '', version: '', url: '', notes: '' });
    setIsPublishingApp(false);
  };

  const handleDeleteAppVersion = async (id: string) => {
    if (confirm('Sever this binary from the distribution hub?')) {
      await deleteAppVersion(id);
      setAppVersions(prev => prev.filter(v => v.id !== id));
    }
  };

  const handleQuickDeploy = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!quickDeploy.title) return;
    setIsDeploying(true);
    
    setTimeout(() => {
      const newCourse: Course = {
        id: Math.random().toString(36).substr(2, 9),
        title: quickDeploy.title,
        category: quickDeploy.category || 'Academic',
        description: 'New neural curriculum node currently undergoing architectural definition.',
        instructor: 'Node Architect',
        instructorAvatar: `https://api.dicebear.com/7.x/avataaars/svg?seed=${quickDeploy.title}`,
        thumbnail: 'https://images.unsplash.com/photo-1614850523296-d8c1af93d400?auto=format&fit=crop&q=80&w=800',
        lessons: [],
        subjects: [],
        rating: 5.0,
        studentsCount: 0,
        price: 0,
        isComingSoon: true,
        syncProgress: 10,
        comingSoonDate: 'Q4 2026',
        comingSoonTagline: 'Calibrating Modules...'
      };
      
      onAddCourse(newCourse);
      setQuickDeploy({ title: '', category: '' });
      setIsDeploying(false);
    }, 1000);
  };

  const groupedWaitlist = useMemo(() => {
    const map: Record<string, WaitlistEntry[]> = {};
    waitlistEntries.forEach(entry => {
      if (!map[entry.courseId]) map[entry.courseId] = [];
      map[entry.courseId].push(entry);
    });
    return map;
  }, [waitlistEntries]);

  const uniqueWaitlistCount = useMemo(() => {
    const set = new Set(waitlistEntries.map(e => e.email));
    return set.size;
  }, [waitlistEntries]);

  const getAssetIcon = (mime: string) => {
    if (mime.includes('image')) return 'fa-file-image text-emerald-400';
    if (mime.includes('video')) return 'fa-file-video text-indigo-400';
    if (mime.includes('pdf')) return 'fa-file-pdf text-rose-400';
    if (mime.includes('android') || mime.includes('package')) return 'fa-robot text-amber-400';
    return 'fa-file-zipper text-slate-400';
  };

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 pb-32">
      {/* System Routing & URL Changer */}
      <section>
        <div className="bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-800 p-6 md:p-12 shadow-2xl relative overflow-hidden">
           <div className="relative z-10 space-y-8">
              <div className="space-y-2 border-b border-slate-800 pb-8">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">System Routing</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Platform Domain & CDN Endpoint Calibration</p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
                 <div className="space-y-6">
                    <div className="space-y-2">
                       <div className="flex justify-between items-center mb-1">
                          <label className="text-[10px] font-black text-slate-600 uppercase tracking-widest ml-1">CDN Base URL Prefix</label>
                          <button onClick={handleDetectUrl} className="text-[8px] font-black text-indigo-400 uppercase tracking-widest hover:text-white transition-colors">Detect Current Origin</button>
                       </div>
                       <div className="flex gap-3">
                          <input 
                            type="text" 
                            value={cdnUrl}
                            onChange={e => setCdnUrl(e.target.value)}
                            className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-mono text-xs focus:border-indigo-500 outline-none transition-all shadow-inner"
                            placeholder="https://your-domain.com/cdn/"
                          />
                          <button 
                            onClick={handleUpdateBaseURL}
                            className="px-6 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-widest hover:bg-indigo-700 transition-all shadow-xl active:scale-95 shrink-0"
                          >
                            Save
                          </button>
                       </div>
                    </div>
                    {copyFeedback === 'url-saved' && (
                       <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-500 text-[10px] font-black uppercase tracking-widest text-center animate-in zoom-in">
                          Routing prefix updated.
                       </div>
                    )}
                 </div>

                 <div className="p-6 bg-slate-950/50 border border-slate-800 rounded-[28px] space-y-4 shadow-inner flex flex-col justify-center">
                    <div className="flex items-center space-x-4 mb-2">
                       <div className="w-10 h-10 rounded-xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                          <i className="fas fa-sync-alt fa-spin"></i>
                       </div>
                       <div className="flex-1">
                          <h4 className="text-[10px] font-black text-white uppercase tracking-widest">Neural Link Re-sync</h4>
                          <p className="text-[8px] text-slate-600 font-bold uppercase tracking-widest mt-1">Updates ALL existing links to match the new prefix.</p>
                       </div>
                    </div>
                    <button 
                       disabled={isResyncing}
                       onClick={handleFullResync}
                       className="w-full py-3.5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-slate-400 hover:text-white rounded-xl text-[9px] font-black uppercase tracking-widest transition-all disabled:opacity-30"
                    >
                       {isResyncing ? 'Re-mapping Neural Core...' : 'Sync Registry Links'}
                    </button>
                    {copyFeedback === 'resync-complete' && <p className="text-[8px] text-emerald-500 font-black uppercase tracking-[0.3em] text-center">Global Re-sync Successful</p>}
                 </div>
              </div>
           </div>
        </div>
      </section>

      {/* Registry Availability Hub */}
      <section>
        <div className="bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-800 p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-8 md:space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Availability Hub</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[8px] md:text-[9px]">Capacity Locks & Neural Pre-releases</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="px-5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center space-x-3 shadow-inner">
                  <i className="fas fa-satellite-dish text-amber-500 text-[10px] animate-pulse"></i>
                  <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{uniqueWaitlistCount} Identity Captures</span>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="space-y-6 order-2 lg:order-1">
                 <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1 flex items-center">
                    <i className="fas fa-bolt text-amber-500 mr-2"></i> Quick Deploy
                 </h3>
                 <form onSubmit={handleQuickDeploy} className="bg-slate-950/50 border border-slate-800 rounded-[28px] p-6 space-y-4 shadow-inner">
                    <div className="space-y-1.5">
                       <label className="text-[7px] font-black text-slate-700 uppercase tracking-widest ml-1">Title</label>
                       <input 
                          type="text" 
                          required
                          value={quickDeploy.title}
                          onChange={e => setQuickDeploy({...quickDeploy, title: e.target.value})}
                          placeholder="e.g. Bio-Neural Ethics" 
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-amber-500/50 transition-all font-bold" 
                       />
                    </div>
                    <div className="space-y-1.5">
                       <label className="text-[7px] font-black text-slate-700 uppercase tracking-widest ml-1">Category</label>
                       <input 
                          type="text" 
                          value={quickDeploy.category}
                          onChange={e => setQuickDeploy({...quickDeploy, category: e.target.value})}
                          placeholder="Science" 
                          className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white outline-none focus:border-amber-500/50 transition-all font-bold" 
                       />
                    </div>
                    <button 
                       type="submit" 
                       disabled={isDeploying || !quickDeploy.title}
                       className="w-full py-4 bg-amber-500/10 text-amber-500 border border-amber-500/20 rounded-2xl text-[9px] font-black uppercase tracking-[0.2em] hover:bg-amber-500 hover:text-slate-950 transition-all active:scale-95 disabled:opacity-30 h-12"
                    >
                       {isDeploying ? <i className="fas fa-spinner fa-spin"></i> : 'Initialize Node'}
                    </button>
                 </form>
              </div>

              <div className="space-y-6 order-1 lg:order-2">
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Registry States</h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
                  {courses.map(course => (
                    <div key={course.id} className={`bg-slate-950 border rounded-2xl p-4 flex flex-col gap-4 transition-all shadow-sm ${course.isStockOut ? 'border-rose-500/30' : 'border-slate-800 hover:border-indigo-500/20'}`}>
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center space-x-3 min-w-0">
                           <div className={`w-10 h-10 rounded-xl border border-slate-800 overflow-hidden shrink-0 ${course.isStockOut ? 'grayscale' : ''}`}>
                              <img src={course.thumbnail} className={`w-full h-full object-cover ${course.isComingSoon ? 'grayscale brightness-75' : ''}`} alt="" />
                           </div>
                           <div className="min-w-0">
                              <p className="text-[11px] font-black text-white truncate max-w-[120px]">{course.title}</p>
                              <p className={`text-[7px] font-black uppercase tracking-widest mt-0.5 ${course.isStockOut ? 'text-rose-500' : course.isComingSoon ? 'text-amber-500' : 'text-emerald-500'}`}>
                                {course.isStockOut ? 'Locked' : course.isComingSoon ? 'Sync Mode' : 'Online'}
                              </p>
                           </div>
                        </div>
                        <div className="flex flex-col items-end gap-2 shrink-0">
                           <button onClick={() => handleToggleComingSoon(course)} className={`px-2 py-1 rounded-md text-[6px] font-black uppercase tracking-widest border transition-all ${course.isComingSoon ? 'bg-amber-600 border-amber-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>Soon</button>
                           <button onClick={() => handleToggleStockOut(course)} className={`px-2 py-1 rounded-md text-[6px] font-black uppercase tracking-widest border transition-all ${course.isStockOut ? 'bg-rose-600 border-rose-500 text-white' : 'bg-slate-900 border-slate-800 text-slate-600'}`}>Lock</button>
                        </div>
                      </div>
                      
                      {course.isComingSoon && (
                        <div className="pt-3 border-t border-slate-800/50 flex items-center justify-between gap-2">
                           <div className="flex-1 h-1.5 bg-slate-900 rounded-full overflow-hidden">
                              <div className="h-full bg-amber-500" style={{ width: `${course.syncProgress || 10}%` }}></div>
                           </div>
                           <span className="text-[7px] font-black text-slate-500 whitespace-nowrap">{course.syncProgress || 10}% Sync</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div className="space-y-6 order-3">
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Identity Nodes</h3>
                <div className="bg-slate-950 border border-slate-800 rounded-[28px] h-[500px] flex flex-col overflow-hidden shadow-inner">
                  {Object.keys(groupedWaitlist).length > 0 ? (
                    <>
                      <div className="flex border-b border-slate-800 bg-slate-900/50 p-2 overflow-x-auto no-scrollbar gap-2 shrink-0">
                        {Object.keys(groupedWaitlist).map(courseId => {
                          const course = courses.find(c => c.id === courseId);
                          return (
                            <button 
                              key={courseId}
                              onClick={() => setActiveWaitlistTab(courseId)}
                              className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all whitespace-nowrap border shrink-0 ${activeWaitlistTab === courseId ? 'bg-amber-600 text-white border-amber-500' : 'bg-slate-950 text-slate-600 border-slate-800'}`}
                            >
                              {course?.title?.split(' ')[0] || 'Node'} ({groupedWaitlist[courseId].length})
                            </button>
                          );
                        })}
                      </div>
                      <div className="flex-1 overflow-y-auto p-4 space-y-2 no-scrollbar">
                        {activeWaitlistTab && groupedWaitlist[activeWaitlistTab] ? (
                          groupedWaitlist[activeWaitlistTab].map(entry => (
                            <div key={entry.id} className="flex items-center justify-between p-3 bg-slate-900/50 border border-slate-800 rounded-xl">
                               <div className="min-w-0">
                                  <p className="text-[10px] font-bold text-slate-200 truncate">{entry.email}</p>
                                  <p className="text-[6px] text-slate-600 font-black uppercase tracking-widest mt-0.5">{new Date(entry.timestamp).toLocaleDateString()}</p>
                               </div>
                               <button onClick={() => handleDeleteWaitlistEntry(entry.id)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-rose-500/10 text-slate-700 hover:text-rose-500 transition-all shrink-0">
                                 <i className="fas fa-trash-alt text-[9px]"></i>
                               </button>
                            </div>
                          ))
                        ) : (
                          <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-4">
                            <i className="fas fa-inbox text-2xl mb-3"></i>
                            <p className="text-[8px] font-black uppercase tracking-widest leading-relaxed">Select node to audit identities</p>
                          </div>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center opacity-20 text-center px-10">
                      <i className="fas fa-users-slash text-3xl mb-4"></i>
                      <p className="text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed">No waitlisted nodes detected.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CDN Storage Section */}
      <section>
        <div className="bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-800 p-6 md:p-12 shadow-2xl relative overflow-hidden">
           <div className="relative z-10 space-y-10">
              <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
                 <div className="space-y-2">
                    <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Neural CDN & Asset Vault</h2>
                    <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Global persistent storage for course assets & binaries</p>
                 </div>
                 <button 
                    onClick={() => fileInputRef.current?.click()} 
                    disabled={isUploading}
                    className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all shadow-xl flex items-center"
                 >
                    {isUploading ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-cloud-arrow-up mr-3"></i>}
                    Deploy Asset
                 </button>
                 <input type="file" ref={fileInputRef} className="hidden" onChange={handleFileUpload} />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                 {hostedAssets.map(asset => (
                    <div key={asset.id} className="bg-slate-950 border border-slate-800 rounded-[28px] p-5 space-y-4 group hover:border-indigo-500/30 transition-all shadow-sm">
                       <div className="aspect-square bg-slate-900 rounded-2xl flex items-center justify-center border border-slate-800 group-hover:bg-slate-800 transition-all overflow-hidden relative">
                          {asset.mimeType.includes('image') ? (
                             <img src={asset.data as string} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                          ) : (
                             <i className={`fas ${getAssetIcon(asset.mimeType)} text-3xl opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all`}></i>
                          )}
                          <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                             <button onClick={() => triggerLocalDownload(asset.url, asset.fileName)} className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all">
                                <i className="fas fa-download text-[10px]"></i>
                             </button>
                             <button onClick={() => handleDeleteAsset(asset.id)} className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all">
                                <i className="fas fa-trash-alt text-[10px]"></i>
                             </button>
                          </div>
                       </div>
                       <div className="space-y-1 min-w-0">
                          <p className="text-[11px] font-black text-white truncate">{asset.fileName}</p>
                          <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest truncate">{asset.mimeType}</p>
                       </div>
                       <div className="pt-2 border-t border-slate-800/50 flex items-center gap-2">
                          <button 
                             onClick={() => copyToClipboard(asset.url, asset.id)}
                             className="flex-1 py-2 rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center"
                          >
                             {copyFeedback === asset.id ? 'Copied' : <><i className="fas fa-link mr-2"></i> Copy URL</>}
                          </button>
                       </div>
                    </div>
                 ))}
              </div>
           </div>
        </div>
      </section>

      {/* Binary Distribution Section */}
      <section>
        <div className="bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-800 p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Binary Distribution Registry</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Deploy new APK/Executable builds to the network</p>
              </div>
              <div className="px-5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center space-x-3 shadow-inner">
                <i className="fas fa-code-branch text-indigo-500 text-[10px]"></i>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{appVersions.length} Available Releases</span>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-10">
              <div className="lg:col-span-5 space-y-6">
                <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1 flex items-center">
                  <i className="fas fa-rocket mr-2 text-indigo-500"></i> Deploy New Build
                </h3>
                <form onSubmit={handlePublishAppVersion} className="bg-slate-950/50 border border-slate-800 rounded-[32px] p-8 space-y-5 shadow-inner">
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Release Title</label>
                    <input 
                      type="text" required value={newAppVersion.title}
                      onChange={e => setNewAppVersion({...newAppVersion, title: e.target.value})}
                      placeholder="e.g. Edu World Android Sync"
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-indigo-500/50"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">SemVer</label>
                      <input 
                        type="text" required value={newAppVersion.version}
                        onChange={e => setNewAppVersion({...newAppVersion, version: e.target.value})}
                        placeholder="1.0.0"
                        className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-indigo-500/50"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Link Target / APK</label>
                      <div className="flex gap-2">
                        <input 
                          type="text" required value={newAppVersion.url}
                          onChange={e => setNewAppVersion({...newAppVersion, url: e.target.value})}
                          placeholder="https://..."
                          className="flex-1 bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-white font-bold outline-none focus:border-indigo-500/50"
                        />
                        <button 
                          type="button"
                          onClick={() => binaryInputRef.current?.click()}
                          className={`w-12 h-12 bg-slate-800 rounded-xl flex items-center justify-center border border-slate-700 text-indigo-400 hover:bg-slate-700 transition-all ${binaryUploadProgress ? 'animate-pulse' : ''}`}
                        >
                          {binaryUploadProgress ? <i className="fas fa-spinner fa-spin"></i> : <i className="fab fa-android"></i>}
                        </button>
                        <input type="file" ref={binaryInputRef} className="hidden" onChange={handleBinaryUpload} />
                      </div>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Release Protocol Notes</label>
                    <textarea 
                      value={newAppVersion.notes}
                      onChange={e => setNewAppVersion({...newAppVersion, notes: e.target.value})}
                      placeholder="Specify build characteristics..."
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-xs text-slate-400 outline-none focus:border-indigo-500/50 h-24 no-scrollbar"
                    />
                  </div>
                  <button 
                    type="submit" disabled={isPublishingApp || binaryUploadProgress}
                    className="w-full py-4.5 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] shadow-2xl shadow-indigo-600/20 active:scale-95 transition-all flex items-center justify-center"
                  >
                    {isPublishingApp ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-cloud-arrow-up mr-3"></i>}
                    Commit Distribution
                  </button>
                </form>
              </div>

              <div className="lg:col-span-7 space-y-6">
                 <h3 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.2em] ml-1">Build Ledger</h3>
                 <div className="space-y-3 max-h-[500px] overflow-y-auto no-scrollbar pr-1">
                    {appVersions.map(ver => (
                       <div key={ver.id} className="flex items-center justify-between p-5 bg-slate-950/50 border border-slate-800 rounded-3xl hover:border-slate-700 transition-all group">
                          <div className="min-w-0 flex-1 pr-4">
                             <div className="flex items-center space-x-3 mb-1">
                                <h4 className="text-sm font-black text-white truncate">{ver.title}</h4>
                                <span className="px-2 py-0.5 bg-indigo-500/10 text-indigo-400 text-[8px] font-black uppercase rounded border border-indigo-500/20">v{ver.version}</span>
                             </div>
                             <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest">Released: {new Date(ver.releaseDate).toLocaleDateString()}</p>
                          </div>
                          <div className="flex items-center space-x-2">
                             <button 
                              onClick={() => triggerLocalDownload(ver.url, `${ver.title.replace(/\s+/g, '_')}_v${ver.version}.apk`)}
                              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-500 hover:text-white transition-all"
                             >
                                <i className="fas fa-download text-[10px]"></i>
                             </button>
                             <button onClick={() => handleDeleteAppVersion(ver.id)} className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-900 border border-slate-800 text-slate-800 hover:text-rose-500 transition-all">
                                <i className="fas fa-trash-alt text-[10px]"></i>
                             </button>
                          </div>
                       </div>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Atmosphere Section */}
      <section>
        <div className="bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-800 p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-8">
            <div className="space-y-2">
              <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Platform Atmosphere</h2>
              <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Branding DNA & Seasonal Calibrations</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
              <div className="space-y-4">
                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Accent Calibration</p>
                 <div className="grid grid-cols-5 md:flex md:flex-wrap gap-2.5">
                    {accentOptions.map(opt => (
                      <button 
                        key={opt.id} 
                        onClick={() => setTheme({ ...theme, accentColor: opt.id })} 
                        className={`aspect-square md:w-11 md:h-11 rounded-xl border-2 transition-all flex items-center justify-center ${opt.color} ${theme.accentColor === opt.id ? 'border-white ring-4 ring-white/10 scale-105' : 'border-transparent opacity-60 hover:opacity-100'}`} 
                      >
                        {opt.icon && <i className={`fas ${opt.icon} text-[10px] text-white/80`}></i>}
                      </button>
                    ))}
                 </div>
              </div>
              <div className="space-y-4">
                 <p className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Surface Depth</p>
                 <div className="flex flex-wrap items-center gap-2 bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
                    {bgOptions.map(opt => (
                      <button 
                        key={opt.id} 
                        onClick={() => setTheme({ ...theme, backgroundStyle: opt.id })} 
                        className={`px-4 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all flex-1 md:flex-none ${theme.backgroundStyle === opt.id ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}
                      >
                        {opt.label}
                      </button>
                    ))}
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* User Registry Section */}
      <section>
        <div className="bg-slate-900 rounded-[32px] md:rounded-[40px] border border-slate-800 p-6 md:p-12 shadow-2xl relative overflow-hidden">
          <div className="relative z-10 space-y-10">
            <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 border-b border-slate-800 pb-8">
              <div className="space-y-2">
                <h2 className="text-2xl md:text-3xl font-black text-white tracking-tight">Identity Registry</h2>
                <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Access Control & Permission Arrays</p>
              </div>
              <div className="px-5 py-2.5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center space-x-3 shadow-inner">
                <i className="fas fa-users text-indigo-500 text-[10px]"></i>
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest">{registeredUsers.length} Active Nodes</span>
              </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {registeredUsers.map(regUser => (
                <div key={regUser.id} className="bg-slate-950/80 border border-slate-800 rounded-3xl p-5 space-y-5 shadow-sm">
                  <div className="flex items-center space-x-4">
                     <div className="relative shrink-0">
                        <img src={regUser.avatar} className="w-12 h-12 rounded-xl border border-slate-800 shadow-xl" alt="" />
                        <div className="absolute -bottom-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-slate-950"></div>
                     </div>
                     <div className="min-w-0 flex-1">
                        <h4 className="font-black text-white text-base truncate leading-none mb-1.5">{regUser.name}</h4>
                        <div className="flex items-center space-x-2">
                           <span className={`text-[7px] font-black uppercase tracking-widest px-2 py-0.5 rounded border ${regUser.role === 'admin' ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/30' : 'bg-slate-900 text-slate-500 border-slate-800'}`}>
                              {regUser.role}
                           </span>
                           <span className="text-[8px] font-bold text-slate-700 truncate">ID: {regUser.id}</span>
                        </div>
                     </div>
                  </div>
                  <div className="pt-4 border-t border-slate-800/50">
                     <div className="flex flex-wrap gap-2">
                        {courses.map(course => {
                          const isEnrolled = (regUser.enrolledCourses || []).includes(course.id);
                          return (
                            <button 
                              key={course.id} 
                              onClick={() => onToggleEnrollment(regUser.id, course.id)} 
                              className={`px-3 py-2 rounded-xl text-[8px] font-black uppercase tracking-widest transition-all border flex items-center space-x-2 active:scale-95 ${isEnrolled ? 'bg-indigo-600 text-white border-indigo-500 shadow-lg' : 'bg-slate-900 text-slate-700 border-slate-800'}`}
                            >
                              <i className={`fas ${isEnrolled ? 'fa-check' : 'fa-plus'} text-[8px]`}></i>
                              <span className="truncate max-w-[80px]">{course.title.split(' ')[0]}</span>
                            </button>
                          );
                        })}
                     </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
};

export default UserManagement;
