
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Course, Lesson, SubjectGroup, QuizQuestion, Resource, HostedAsset } from '../types';
import { saveHostedAsset, getAllHostedAssets, deleteHostedAsset } from '../services/storage';

interface AdminPanelProps {
  courses: Course[];
  initialEditCourseId?: string | null;
  onAddCourse: (course: Course) => void;
  onUpdateCourse: (course: Course) => void;
  onDeleteCourse: (id: string) => void;
  onPreview: () => void;
  onStartEditing?: (id: string | null) => void;
  onCancelEdit?: () => void;
}

const COLOR_PRESETS = [
  'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
  'bg-blue-500/10 text-blue-500 border-blue-500/20',
  'bg-rose-500/10 text-rose-500 border-rose-500/20',
  'bg-indigo-500/10 text-indigo-400 border-indigo-500/20',
  'bg-orange-500/10 text-orange-500 border-orange-500/20',
  'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
  'bg-purple-500/10 text-purple-500 border-purple-500/20',
  'bg-slate-500/10 text-slate-400 border-slate-500/20',
];

const ICON_OPTIONS = [
  'fa-book', 'fa-book-open', 'fa-graduation-cap', 'fa-microscope', 'fa-flask', 'fa-atom', 
  'fa-dna', 'fa-vial', 'fa-language', 'fa-earth-americas', 'fa-calculator', 'fa-square-root-variable', 
  'fa-code', 'fa-terminal', 'fa-laptop-code', 'fa-tower-broadcast', 'fa-brain', 'fa-palette', 
  'fa-music', 'fa-feather', 'fa-landmark', 'fa-scale-balanced', 'fa-briefcase', 'fa-heart-pulse', 
  'fa-volleyball', 'fa-person-running', 'fa-gears', 'fa-shield-halved', 'fa-chart-pie', 'fa-compass',
  'fa-star', 'fa-lightbulb', 'fa-magnifying-glass', 'fa-pencil', 'fa-user-graduate', 'fa-globe', 'fa-award', 'fa-certificate'
];

const AdminPanel: React.FC<AdminPanelProps> = ({ courses, initialEditCourseId, onAddCourse, onUpdateCourse, onDeleteCourse, onCancelEdit }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [currentCourse, setCurrentCourse] = useState<Partial<Course> | null>(null);
  const [activeTab, setActiveTab] = useState<'info' | 'curriculum' | 'structure'>('info');
  const [editingLessonIdx, setEditingLessonIdx] = useState<number | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [iconPickerOpenId, setIconPickerOpenId] = useState<string | null>(null);
  const [moduleSearch, setModuleSearch] = useState('');
  
  const [mainView, setMainView] = useState<'courses' | 'assets'>('courses');
  const [hostedAssets, setHostedAssets] = useState<HostedAsset[]>([]);
  const [copyFeedback, setCopyFeedback] = useState<string | null>(null);
  const [vaultSearch, setVaultSearch] = useState('');
  const [manualUrl, setManualUrl] = useState('');

  const thumbnailInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const resourceInputRef = useRef<HTMLInputElement>(null);
  const quillRef = useRef<HTMLDivElement>(null);
  const quillInstance = useRef<any>(null);

  const updatingResourceIdx = useRef<number | null>(null);

  useEffect(() => {
    if (initialEditCourseId) {
      const course = courses.find(c => c.id === initialEditCourseId);
      if (course) {
        setCurrentCourse({ ...course });
        setIsEditing(true);
      }
    }
  }, [initialEditCourseId, courses]);

  useEffect(() => {
    const loadAssets = async () => {
      const assets = await getAllHostedAssets();
      setHostedAssets(assets.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
    };
    if (mainView === 'assets' || (isEditing && editingLessonIdx !== null)) {
      loadAssets();
    }
  }, [mainView, isEditing, editingLessonIdx]);

  useEffect(() => {
    if (editingLessonIdx !== null && quillRef.current && !quillInstance.current) {
      const Quill = (window as any).Quill;
      if (Quill) {
        if (quillRef.current) quillRef.current.innerHTML = '';
        quillInstance.current = new Quill(quillRef.current, {
          theme: 'snow',
          modules: {
            toolbar: [
              [{ 'header': [1, 2, 3, false] }],
              ['bold', 'italic', 'underline', 'strike'],
              [{ 'color': [] }, { 'background': [] }],
              [{ 'script': 'sub'}, { 'script': 'super' }],
              [{ 'list': 'ordered'}, { 'list': 'bullet' }],
              [{ 'indent': '-1'}, { 'indent': '+1' }],
              [{ 'align': [] }],
              ['formula'],
              ['link', 'blockquote', 'code-block'],
              ['clean']
            ]
          }
        });
        const initialContent = currentCourse?.lessons?.[editingLessonIdx]?.content || '';
        quillInstance.current.root.innerHTML = initialContent;
        const handleUpdate = () => {
          const html = quillInstance.current.root.innerHTML;
          updateLesson(editingLessonIdx, { content: html });
        };
        quillInstance.current.on('text-change', handleUpdate);
        return () => {
          if (quillInstance.current) {
            quillInstance.current.off('text-change', handleUpdate);
            quillInstance.current = null;
          }
        };
      }
    }
  }, [editingLessonIdx]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentCourse) return;
    
    const finalCourse: Course = {
      id: currentCourse.id || Math.random().toString(36).substr(2, 9),
      title: currentCourse.title || 'Untitled Program',
      description: currentCourse.description || '',
      instructor: currentCourse.instructor || 'Lead Instructor',
      instructorAvatar: currentCourse.instructorAvatar || 'https://api.dicebear.com/7.x/avataaars/svg?seed=edu',
      thumbnail: currentCourse.thumbnail || 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?auto=format&fit=crop&q=80&w=800',
      category: currentCourse.category || 'Academic',
      rating: currentCourse.rating || 5.0,
      studentsCount: currentCourse.studentsCount || 0,
      price: currentCourse.price || 0,
      lessons: currentCourse.lessons || [],
      subjects: currentCourse.subjects || [],
      roadmap: currentCourse.roadmap || [],
      supplementalContent: currentCourse.supplementalContent || [],
      expiryDate: currentCourse.expiryDate
    };
    
    const isExisting = courses.some(c => c.id === finalCourse.id);
    if (isExisting) onUpdateCourse(finalCourse);
    else onAddCourse(finalCourse);
    
    setIsEditing(false);
    setCurrentCourse(null);
  };

  const handleThumbnailUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = (event) => {
      setCurrentCourse(prev => ({ ...prev, thumbnail: event.target?.result as string }));
      setIsUploading(false);
    };
    reader.readAsDataURL(file);
  };

  const handleVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (editingLessonIdx !== null) {
      updateLesson(editingLessonIdx, { videoUrl: file });
    }
    e.target.value = '';
  };

  const handleAssetUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const assetId = Math.random().toString(36).substr(2, 6);
      
      const newAsset: HostedAsset = {
        id: assetId,
        title: file.name.split('.')[0],
        fileName: file.name,
        data: base64,
        mimeType: file.type,
        url: `https://eduworld.ct.ws/cdn/${assetId}`,
        createdAt: new Date(),
      };

      await saveHostedAsset(newAsset);
      setHostedAssets(prev => [newAsset, ...prev]);
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const handleResourceUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || editingLessonIdx === null) return;

    setIsUploading(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      const base64 = event.target?.result as string;
      const assetId = `res-${Math.random().toString(36).substr(2, 6)}`;
      
      const newAsset: HostedAsset = {
        id: assetId,
        title: file.name,
        fileName: file.name,
        data: base64,
        mimeType: file.type,
        url: `https://eduworld.ct.ws/cdn/${assetId}`,
        createdAt: new Date(),
      };

      await saveHostedAsset(newAsset);

      if (updatingResourceIdx.current !== null) {
        updateResource(updatingResourceIdx.current, {
          title: file.name.split('.')[0],
          url: newAsset.url,
          type: file.type.includes('video') ? 'video' : (file.type.includes('zip') ? 'zip' : 'link'),
          description: `Attached: ${file.name}`
        });
        updatingResourceIdx.current = null;
      } else {
        const newResource: Resource = {
          id: Math.random().toString(36).substr(2, 9),
          title: file.name.split('.')[0],
          url: newAsset.url,
          type: file.type.includes('video') ? 'video' : (file.type.includes('zip') ? 'zip' : 'link'),
          description: `Attached: ${file.name}`
        };
        const currentResources = [...(currentCourse?.lessons?.[editingLessonIdx]?.resources || [])];
        updateLesson(editingLessonIdx, { resources: [...currentResources, newResource] });
      }
      
      setIsUploading(false);
      if (resourceInputRef.current) resourceInputRef.current.value = '';
    };
    reader.readAsDataURL(file);
  };

  const triggerLocalDownload = async (asset: HostedAsset) => {
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
      a.download = asset.fileName || 'asset';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(localUrl), 100);
    }
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopyFeedback(id);
    setTimeout(() => setCopyFeedback(null), 2000);
  };

  const handleDeleteAsset = async (id: string) => {
    if (confirm('Permanently purge this asset from the Vault?')) {
      await deleteHostedAsset(id);
      setHostedAssets(prev => prev.filter(a => a.id !== id));
    }
  };

  const getAssetIcon = (mime: string) => {
    if (mime.includes('image')) return 'fa-file-image text-emerald-400';
    if (mime.includes('video')) return 'fa-file-video text-indigo-400';
    if (mime.includes('pdf')) return 'fa-file-pdf text-rose-400';
    if (mime.includes('android') || mime.includes('package')) return 'fa-robot text-amber-400';
    return 'fa-file-zipper text-slate-400';
  };

  const updateLesson = (idx: number, updates: Partial<Lesson>) => {
    setCurrentCourse(prev => {
      if (!prev?.lessons) return prev;
      const lessons = [...prev.lessons];
      lessons[idx] = { ...lessons[idx], ...updates };
      return { ...prev, lessons };
    });
  };

  const addQuizQuestion = () => {
    if (editingLessonIdx === null) return;
    const newQuestion: QuizQuestion = {
      id: Math.random().toString(36).substr(2, 6),
      question: 'New Question?',
      options: ['Option A', 'Option B', 'Option C', 'Option D'],
      correctAnswer: 0
    };
    const currentQuiz = currentCourse?.lessons?.[editingLessonIdx]?.quiz || [];
    updateLesson(editingLessonIdx, { quiz: [...currentQuiz, newQuestion] });
  };

  const updateQuizQuestion = (qIdx: number, updates: Partial<QuizQuestion>) => {
    if (editingLessonIdx === null) return;
    const currentQuiz = [...(currentCourse?.lessons?.[editingLessonIdx]?.quiz || [])];
    currentQuiz[qIdx] = { ...currentQuiz[qIdx], ...updates };
    updateLesson(editingLessonIdx, { quiz: currentQuiz });
  };

  const removeQuizQuestion = (qIdx: number) => {
    if (editingLessonIdx === null) return;
    const currentQuiz = (currentCourse?.lessons?.[editingLessonIdx]?.quiz || []).filter((_, i) => i !== qIdx);
    updateLesson(editingLessonIdx, { quiz: currentQuiz });
  };

  const updateResource = (rIdx: number, updates: Partial<Resource>) => {
    if (editingLessonIdx === null) return;
    setCurrentCourse(prev => {
      if (!prev?.lessons) return prev;
      const lessons = [...prev.lessons];
      const lesson = { ...lessons[editingLessonIdx] };
      const currentResources = [...(lesson.resources || [])];
      currentResources[rIdx] = { ...currentResources[rIdx], ...updates };
      lesson.resources = currentResources;
      lessons[editingLessonIdx] = lesson;
      return { ...prev, lessons };
    });
  };

  const removeResource = (rIdx: number) => {
    if (editingLessonIdx === null) return;
    setCurrentCourse(prev => {
      if (!prev?.lessons) return prev;
      const lessons = [...prev.lessons];
      const lesson = { ...lessons[editingLessonIdx] };
      const currentResources = (lesson.resources || []).filter((_, i) => i !== rIdx);
      lesson.resources = currentResources;
      lessons[editingLessonIdx] = lesson;
      return { ...prev, lessons };
    });
  };

  const handleAddManualUrl = () => {
    if (!manualUrl.trim() || editingLessonIdx === null) return;
    const url = manualUrl.trim();
    const formattedUrl = url.startsWith('http') ? url : `https://${url}`;
    const newResource: Resource = {
      id: Math.random().toString(36).substr(2, 9),
      title: formattedUrl.length > 30 ? 'Linked Asset' : formattedUrl,
      url: formattedUrl,
      type: 'link',
      description: 'Externally attached URL'
    };
    const currentResources = [...(currentCourse?.lessons?.[editingLessonIdx]?.resources || [])];
    updateLesson(editingLessonIdx, { resources: [...currentResources, newResource] });
    setManualUrl('');
  };

  const addSubject = () => {
    const newSubj: SubjectGroup = { id: Math.random().toString(36).substr(2, 9), name: 'New Subject', icon: 'fa-book', color: COLOR_PRESETS[3], subSubjects: [] };
    setCurrentCourse(prev => ({ ...prev, subjects: [...(prev?.subjects || []), newSubj] }));
  };

  const addSubSubject = (subjectId: string) => {
    setCurrentCourse(prev => ({
      ...prev,
      subjects: (prev?.subjects || []).map(s => s.id === subjectId ? { ...s, subSubjects: [...s.subSubjects, { id: Math.random().toString(36).substr(2, 9), name: 'New Sub-group', units: [] }] } : s)
    }));
  };

  const addUnit = (subjId: string, ssId: string) => {
    setCurrentCourse(prev => ({
      ...prev,
      subjects: (prev?.subjects || []).map(s => s.id === subjId ? { 
        ...s, 
        subSubjects: s.subSubjects.map(ss => ss.id === ssId ? { ...ss, units: [...(ss.units || []), { id: Math.random().toString(36).substr(2, 9), name: 'New Unit' }] } : ss) 
      } : s)
    }));
  };

  const handleCancel = () => {
    if (onCancelEdit) onCancelEdit();
    setIsEditing(false);
    setCurrentCourse(null);
  };

  const filteredLessonsForView = useMemo(() => {
    if (!moduleSearch.trim()) return currentCourse?.lessons || [];
    return (currentCourse?.lessons || []).filter(l => 
      l.title.toLowerCase().includes(moduleSearch.toLowerCase())
    );
  }, [currentCourse?.lessons, moduleSearch]);

  if (isEditing && currentCourse) {
    const isEditingLesson = editingLessonIdx !== null;
    const currentLesson = isEditingLesson ? currentCourse.lessons![editingLessonIdx!] : null;

    return (
      <div className="max-w-5xl mx-auto space-y-6 md:space-y-8 pb-24 animate-in fade-in duration-500 px-4 md:px-0">
        
        {isEditingLesson && currentLesson && (
          <div className="fixed inset-0 z-[150] bg-slate-950 overflow-y-auto flex flex-col animate-in slide-in-from-right-8 duration-500">
            <div className="max-w-5xl mx-auto w-full space-y-6 md:space-y-8 p-4 md:p-12">
              <div className="flex flex-col md:flex-row md:items-center justify-between border-b border-slate-800 pb-6 md:pb-8 gap-4">
                <div className="flex items-center space-x-4 md:space-x-6">
                  <button onClick={() => setEditingLessonIdx(null)} className="w-10 h-10 md:w-12 md:h-12 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-400 hover:text-white transition-all shadow-xl"><i className="fas fa-arrow-left"></i></button>
                  <h2 className="text-xl md:text-3xl font-black text-white tracking-tight">Module Architect</h2>
                </div>
                <button onClick={() => setEditingLessonIdx(null)} className="w-full md:w-auto px-8 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Close Architect</button>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 md:gap-8">
                <div className="lg:col-span-8 space-y-6 md:space-y-8 order-2 lg:order-1">
                  <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] border border-slate-800 p-6 md:p-8 space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="md:col-span-2 space-y-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Module Title</label>
                        <input type="text" value={currentLesson.title} onChange={e => updateLesson(editingLessonIdx!, { title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:border-indigo-500 outline-none transition-all text-sm" />
                      </div>
                      <div className="space-y-2">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Length (EST)</label>
                        <input type="text" value={currentLesson.duration} onChange={e => updateLesson(editingLessonIdx!, { duration: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:border-indigo-500 outline-none transition-all text-sm" />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-800">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                        <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Video Resource</label>
                        <button onClick={() => videoInputRef.current?.click()} className="w-full sm:w-auto px-4 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600/20 transition-all">
                          {isUploading ? 'Processing...' : <><i className="fas fa-upload mr-2"></i>Select Video</>}
                        </button>
                        <input type="file" ref={videoInputRef} onChange={handleVideoUpload} className="hidden" accept="video/*" />
                      </div>
                      <input 
                        type="text" 
                        value={typeof currentLesson.videoUrl === 'string' ? currentLesson.videoUrl : (currentLesson.videoUrl instanceof File ? `Local File: ${currentLesson.videoUrl.name}` : '')} 
                        onChange={e => updateLesson(editingLessonIdx!, { videoUrl: e.target.value })} 
                        placeholder="Video source URL..." 
                        className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-slate-400 font-mono text-xs focus:border-indigo-500 outline-none transition-all" 
                      />
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] border border-slate-800 p-6 md:p-8">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1 mb-6">Academic Content</h3>
                    <div className="bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden min-h-[300px] md:min-h-[400px]">
                      <div ref={quillRef} className="text-slate-200 min-h-[300px] md:min-h-[400px]"></div>
                    </div>
                  </div>

                  <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] border border-slate-800 p-6 md:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assessment Logic</h3>
                       <button onClick={addQuizQuestion} className="w-full sm:w-auto px-4 py-2 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-700 transition-all">+ Add Question</button>
                    </div>
                    <div className="space-y-6">
                      {(currentLesson.quiz || []).map((q, qIdx) => (
                        <div key={q.id} className="p-6 bg-slate-950 border border-slate-800 rounded-[24px] space-y-5 relative group">
                          <button onClick={() => removeQuizQuestion(qIdx)} className="absolute top-4 right-4 text-slate-800 hover:text-rose-500 p-2"><i className="fas fa-trash-alt"></i></button>
                          <div className="space-y-2">
                             <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Question {qIdx + 1}</label>
                             <input type="text" value={q.question} onChange={e => updateQuizQuestion(qIdx, { question: e.target.value })} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-4 py-3 text-white text-xs font-bold" />
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {q.options.map((opt, optIdx) => (
                              <div key={optIdx} className="space-y-1 relative">
                                <label className="text-[7px] font-black text-slate-800 uppercase tracking-widest ml-1 flex justify-between">
                                  <span>Option {String.fromCharCode(65 + optIdx)}</span>
                                  {q.correctAnswer === optIdx && <span className="text-emerald-500">Correct Key</span>}
                                </label>
                                <div className="flex items-center space-x-2">
                                  <input 
                                    type="text" 
                                    value={opt} 
                                    onChange={e => {
                                      const newOpts = [...q.options];
                                      newOpts[optIdx] = e.target.value;
                                      updateQuizQuestion(qIdx, { options: newOpts });
                                    }} 
                                    className={`flex-1 bg-slate-900 border rounded-xl px-4 py-2 text-[11px] font-medium ${q.correctAnswer === optIdx ? 'border-emerald-500/50 text-white' : 'border-slate-800 text-slate-400'}`} 
                                  />
                                  <button 
                                    onClick={() => updateQuizQuestion(qIdx, { correctAnswer: optIdx })}
                                    className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${q.correctAnswer === optIdx ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-600 hover:text-slate-400'}`}
                                  >
                                    <i className="fas fa-check text-[10px]"></i>
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Resource Manager */}
                  <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] border border-slate-800 p-6 md:p-8 space-y-6">
                    <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Asset Library</h3>
                       <div className="flex gap-2">
                          <button onClick={() => { updatingResourceIdx.current = null; resourceInputRef.current?.click(); }} className="w-full sm:w-auto px-4 py-2 bg-emerald-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center">
                            {isUploading ? <i className="fas fa-spinner fa-spin mr-2"></i> : <i className="fas fa-file-arrow-up mr-2"></i>}
                            Upload New File
                          </button>
                       </div>
                       <input type="file" ref={resourceInputRef} className="hidden" onChange={handleResourceUpload} />
                    </div>

                    {/* Unified Link Attachment System */}
                    <div className="space-y-4">
                      <div className="relative">
                         <div className="flex flex-col md:flex-row gap-2">
                            <div className="flex-1 flex items-center bg-slate-950 border border-slate-800 rounded-2xl px-5 py-1.5 shadow-inner focus-within:border-indigo-500/50 transition-all group">
                               <i className="fas fa-search text-slate-700 mr-3 text-xs"></i>
                               <input 
                                 type="text" 
                                 placeholder="Search vault or enter external URL..." 
                                 className="bg-transparent border-none focus:ring-0 text-[10px] text-white w-full uppercase font-black placeholder:text-slate-800 py-3"
                                 value={vaultSearch}
                                 onChange={e => setVaultSearch(e.target.value)}
                               />
                            </div>
                            <div className="flex items-center bg-slate-950 border border-slate-800 rounded-2xl px-5 py-1.5 shadow-inner focus-within:border-emerald-500/50 transition-all">
                               <i className="fas fa-link text-slate-700 mr-3 text-xs"></i>
                               <input 
                                 type="text" 
                                 placeholder="Direct External URL..." 
                                 className="bg-transparent border-none focus:ring-0 text-[10px] text-white w-full font-mono placeholder:text-slate-800 py-3"
                                 value={manualUrl}
                                 onChange={e => setManualUrl(e.target.value)}
                                 onKeyDown={e => e.key === 'Enter' && handleAddManualUrl()}
                               />
                               {manualUrl.trim() && (
                                 <button 
                                   onClick={handleAddManualUrl}
                                   className="ml-2 px-4 py-2 bg-emerald-600 text-white rounded-xl text-[8px] font-black uppercase tracking-widest shadow-lg"
                                 >
                                   Attach Link
                                 </button>
                               )}
                            </div>
                         </div>
                         
                         {vaultSearch.trim() && (
                            <div className="absolute top-full left-0 right-0 mt-3 bg-slate-900 border border-slate-800 rounded-3xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[160] max-h-64 overflow-y-auto p-3 space-y-2 no-scrollbar animate-in zoom-in-95 duration-200">
                               <div className="px-3 py-2 border-b border-slate-800 mb-2">
                                  <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest">Vault Matching Results</p>
                               </div>
                               {hostedAssets.filter(a => a.title.toLowerCase().includes(vaultSearch.toLowerCase()) || a.fileName.toLowerCase().includes(vaultSearch.toLowerCase())).map(asset => (
                                  <button 
                                    key={asset.id} 
                                    onClick={() => {
                                      const newResource: Resource = {
                                        id: Math.random().toString(36).substr(2, 9),
                                        title: asset.title,
                                        url: asset.url,
                                        type: asset.mimeType.includes('video') ? 'video' : (asset.mimeType.includes('zip') ? 'zip' : 'link'),
                                        description: `Vault Attachment: ${asset.fileName}`
                                      };
                                      const currentResources = [...(currentCourse?.lessons?.[editingLessonIdx!]?.resources || [])];
                                      updateLesson(editingLessonIdx!, { resources: [...currentResources, newResource] });
                                      setVaultSearch('');
                                    }}
                                    className="w-full text-left p-4 hover:bg-slate-950 rounded-2xl flex items-center space-x-4 group transition-all border border-transparent hover:border-slate-800"
                                  >
                                     <div className="w-10 h-10 rounded-xl bg-slate-950 flex items-center justify-center border border-slate-800 shrink-0">
                                        <i className={`fas ${getAssetIcon(asset.mimeType)} text-xs opacity-50 group-hover:text-indigo-400 group-hover:opacity-100`}></i>
                                     </div>
                                     <div className="min-w-0 flex-1">
                                        <p className="text-[10px] font-black text-white truncate">{asset.title}</p>
                                        <p className="text-[7px] font-bold text-slate-600 truncate uppercase tracking-widest font-mono">{asset.url}</p>
                                     </div>
                                  </button>
                               ))}
                            </div>
                         )}
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 gap-4">
                      {(currentLesson.resources || []).map((res, rIdx) => (
                        <div key={res.id} className="p-5 bg-slate-950 border border-slate-800 rounded-2xl flex items-center gap-6 relative group transition-all hover:border-slate-700">
                          <div className={`w-12 h-12 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center ${res.url.includes('eduworld.ct.ws') ? 'text-indigo-400' : 'text-emerald-400'}`}>
                             <i className={`fas ${res.type === 'video' ? 'fa-file-video' : res.type === 'zip' ? 'fa-file-zipper' : 'fa-link'} text-xl`}></i>
                          </div>
                          <div className="flex-1 min-w-0 space-y-1">
                             <input 
                               type="text" 
                               value={res.title} 
                               onChange={e => updateResource(rIdx, { title: e.target.value })} 
                               className="bg-transparent border-none focus:ring-0 text-white font-black text-sm p-0 w-full outline-none" 
                               placeholder="Resource Title"
                             />
                             <div className="flex items-center space-x-3 text-[9px] font-mono w-full overflow-hidden">
                                <span className={`px-2 py-0.5 rounded font-black uppercase shrink-0 ${res.url.includes('eduworld.ct.ws') ? 'bg-indigo-600/10 text-indigo-400' : 'bg-emerald-600/10 text-emerald-400'}`}>
                                   {res.url.includes('eduworld.ct.ws') ? 'Vault' : 'External'}
                                </span>
                                <input 
                                  type="text" 
                                  value={res.url} 
                                  onChange={e => updateResource(rIdx, { url: e.target.value })} 
                                  className="bg-transparent border-none focus:ring-0 text-slate-600 font-medium p-0 w-full outline-none truncate" 
                                  placeholder="Resource URL"
                                />
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <button 
                               onClick={() => { updatingResourceIdx.current = rIdx; resourceInputRef.current?.click(); }}
                               className="w-10 h-10 rounded-xl bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"
                               title="Replace with Local File"
                             >
                                <i className="fas fa-sync-alt text-[10px]"></i>
                             </button>
                             <button onClick={() => removeResource(rIdx)} className="w-10 h-10 rounded-xl bg-rose-600/10 text-rose-500 border border-rose-600/20 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                          </div>
                        </div>
                      ))}
                      {(currentLesson.resources || []).length === 0 && (
                        <div className="py-12 border-2 border-dashed border-slate-900 rounded-[28px] flex flex-col items-center justify-center opacity-40">
                           <i className="fas fa-link text-xl mb-3 text-slate-500"></i>
                           <p className="text-[9px] font-black uppercase tracking-[0.3em] text-slate-500">No resources linked to this node.</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="lg:col-span-4 space-y-6 md:space-y-8 order-1 lg:order-2">
                  <div className="bg-slate-900 rounded-[24px] md:rounded-[32px] border border-slate-800 p-6 md:p-8 space-y-6">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Assessment Engine</h3>
                    <div className="space-y-4">
                       <div className="flex items-center justify-between p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                          <div className="space-y-0.5">
                             <p className="text-[10px] font-black text-white uppercase tracking-widest">Exam Node</p>
                             <p className="text-[7px] font-black text-slate-600 uppercase tracking-[0.2em]">Enforce strict timing</p>
                          </div>
                          <button 
                            onClick={() => updateLesson(editingLessonIdx!, { isExamMode: !currentLesson.isExamMode })}
                            className={`w-12 h-6 rounded-full relative transition-all ${currentLesson.isExamMode ? 'bg-indigo-600' : 'bg-slate-800'}`}
                          >
                            <div className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${currentLesson.isExamMode ? 'left-7' : 'left-1'}`}></div>
                          </button>
                       </div>
                       {currentLesson.isExamMode && (
                         <div className="space-y-1 animate-in zoom-in-95 duration-200">
                            <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Duration (Minutes)</label>
                            <input type="number" value={currentLesson.examDuration || 30} onChange={e => updateLesson(editingLessonIdx!, { examDuration: parseInt(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black text-white outline-none focus:border-indigo-500" />
                         </div>
                       )}
                       <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Parent Subject</label>
                        <select value={currentLesson.subjectId || ''} onChange={e => updateLesson(editingLessonIdx!, { subjectId: e.target.value, subSubjectId: undefined, unitId: undefined })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-400 outline-none">
                          <option value="">Unassigned</option>
                          {currentCourse.subjects?.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Target Group</label>
                        <select disabled={!currentLesson.subjectId} value={currentLesson.subSubjectId || ''} onChange={e => updateLesson(editingLessonIdx!, { subSubjectId: e.target.value, unitId: undefined })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-400 disabled:opacity-20 outline-none">
                          <option value="">None</option>
                          {currentCourse.subjects?.find(s => s.id === currentLesson.subjectId)?.subSubjects.map(ss => <option key={ss.id} value={ss.id}>{ss.name}</option>)}
                        </select>
                      </div>
                      <div className="space-y-1">
                        <label className="text-[8px] font-black text-slate-700 uppercase tracking-widest ml-1">Specific Unit</label>
                        <select disabled={!currentLesson.subSubjectId} value={currentLesson.unitId || ''} onChange={e => updateLesson(editingLessonIdx!, { unitId: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-xl px-4 py-3 text-[10px] font-black uppercase text-slate-400 disabled:opacity-20 outline-none">
                          <option value="">None</option>
                          {currentCourse.subjects?.flatMap(s => s.subSubjects).find(ss => ss.id === currentLesson.subSubjectId)?.units?.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                        </select>
                      </div>
                    </div>
                  </div>
                  <button onClick={() => { if (confirm('Purge module?')) { const l = currentCourse.lessons!.filter((_, i) => i !== editingLessonIdx); setCurrentCourse({ ...currentCourse, lessons: l }); setEditingLessonIdx(null); } }} className="w-full py-4 bg-rose-600/10 text-rose-500 border border-rose-600/20 rounded-2xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all">Delete Module</button>
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6">
          <button onClick={handleCancel} className="text-slate-500 hover:text-white text-[10px] font-black uppercase tracking-widest transition-colors flex items-center"><i className="fas fa-arrow-left mr-2"></i> Registry Hub</button>
          <button onClick={handleSave} className="w-full sm:w-auto px-10 py-4 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Commit Registry</button>
        </div>

        <div className="bg-slate-900 rounded-[32px] border border-slate-800 overflow-hidden shadow-2xl">
          <div className="flex border-b border-slate-800 bg-slate-950/50 overflow-x-auto no-scrollbar scroll-smooth">
            {['info', 'curriculum', 'structure'].map(tab => (
              <button key={tab} onClick={() => setActiveTab(tab as any)} className={`flex-1 min-w-[120px] py-5 text-[9px] font-black uppercase tracking-[0.2em] transition-all border-b-2 ${activeTab === tab ? 'text-indigo-400 border-indigo-500 bg-slate-900' : 'text-slate-600 border-transparent hover:text-slate-400'}`}>{tab === 'info' ? 'Profile' : tab === 'curriculum' ? 'Modules' : 'Framework'}</button>
            ))}
          </div>

          <div className="p-6 md:p-12">
            {activeTab === 'info' && (
              <div className="space-y-10 animate-in fade-in duration-300">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                  <div className="space-y-6">
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Program Title</label>
                      <input type="text" value={currentCourse.title || ''} onChange={e => setCurrentCourse({ ...currentCourse!, title: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:border-indigo-500 outline-none text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Category</label>
                      <input type="text" value={currentCourse.category || ''} onChange={e => setCurrentCourse({ ...currentCourse!, category: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:border-indigo-500 outline-none text-sm" />
                    </div>
                    <div className="space-y-2">
                      <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Enrollment Fee ($)</label>
                      <input type="number" value={currentCourse.price || 0} onChange={e => setCurrentCourse({ ...currentCourse!, price: parseFloat(e.target.value) })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-white font-bold focus:border-indigo-500 outline-none text-sm" />
                    </div>
                  </div>
                  <div className="space-y-4">
                    <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Visual Identity</label>
                    <div className="aspect-video bg-slate-950 rounded-3xl border border-slate-800 overflow-hidden relative group">
                      {currentCourse.thumbnail ? (
                        <img src={currentCourse.thumbnail} className="w-full h-full object-cover" alt="preview" />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center text-slate-700 font-black uppercase text-[10px]">Pending Thumbnail</div>
                      )}
                      <div className="absolute inset-0 bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button onClick={() => thumbnailInputRef.current?.click()} className="px-6 py-2 bg-white text-slate-950 rounded-xl font-black text-[9px] uppercase shadow-xl">Upload Asset</button>
                      </div>
                    </div>
                    <input type="file" ref={thumbnailInputRef} className="hidden" accept="image/*" onChange={handleThumbnailUpload} />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-[9px] font-black text-slate-600 uppercase tracking-widest ml-1">Abstract</label>
                  <textarea rows={4} value={currentCourse.description || ''} onChange={e => setCurrentCourse({ ...currentCourse!, description: e.target.value })} className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-5 py-4 text-slate-400 outline-none focus:border-indigo-500/30 text-sm" />
                </div>
              </div>
            )}

            {activeTab === 'curriculum' && (
              <div className="space-y-6 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-6">
                   <div className="space-y-2 flex-1">
                      <h3 className="text-xl font-black text-white tracking-tight">Modules</h3>
                      <div className="flex items-center bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 w-full max-w-sm shadow-inner group focus-within:border-indigo-500/50 transition-all">
                        <i className="fas fa-search text-slate-700 mr-3 text-[10px] group-focus-within:text-indigo-400 transition-colors"></i>
                        <input 
                          type="text" 
                          placeholder="Search modules by title..." 
                          value={moduleSearch}
                          onChange={e => setModuleSearch(e.target.value)}
                          className="bg-transparent border-none focus:ring-0 text-[10px] text-slate-300 font-bold w-full placeholder:text-slate-800 py-1"
                        />
                      </div>
                   </div>
                   <button onClick={() => {
                      const newLesson: Lesson = { id: Math.random().toString(36).substr(2, 9), title: 'New Module', content: '<p>Start building...</p>', duration: '10:00', quiz: [], resources: [] };
                      setCurrentCourse(prev => ({ ...prev, lessons: [...(prev?.lessons || []), newLesson] }));
                   }} className="w-full sm:w-auto px-6 py-3 bg-indigo-600 text-white rounded-xl text-[10px] font-black uppercase tracking-widest active:scale-95 transition-all self-end shadow-xl">+ New Module</button>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {filteredLessonsForView.map((lesson) => {
                    const originalIdx = currentCourse.lessons!.findIndex(l => l.id === lesson.id);
                    return (
                      <div key={lesson.id} className={`bg-slate-950 border rounded-3xl p-5 flex flex-col justify-between group transition-all ${lesson.isExamMode ? 'border-rose-500/30 hover:border-rose-500/60' : 'border-slate-800 hover:border-indigo-500/30'}`}>
                        <div className="flex items-center space-x-4 mb-4">
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg border shrink-0 ${lesson.isExamMode ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/10'}`}>
                            <i className={`fas ${lesson.isExamMode ? 'fa-file-signature' : lesson.videoUrl ? 'fa-video' : 'fa-file-lines'}`}></i>
                          </div>
                          <div className="min-w-0 flex-1">
                             <h4 className="font-black text-slate-100 truncate text-sm">{lesson.title}</h4>
                             <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-0.5">{lesson.isExamMode ? 'Exam Node' : 'Learning Module'}</p>
                          </div>
                        </div>
                        <div className="flex items-center justify-between border-t border-slate-800/50 pt-4">
                          <button onClick={() => setEditingLessonIdx(originalIdx)} className="px-4 py-2 bg-slate-900 border border-slate-800 text-[9px] font-black text-slate-500 hover:text-white rounded-xl transition-all uppercase tracking-widest">Architect</button>
                          <button onClick={() => setCurrentCourse({ ...currentCourse, lessons: currentCourse.lessons?.filter(l => l.id !== lesson.id) })} className="text-slate-800 hover:text-rose-500 transition-colors"><i className="fas fa-trash-alt"></i></button>
                        </div>
                      </div>
                    );
                  })}
                  {filteredLessonsForView.length === 0 && (
                    <div className="col-span-full py-12 border-2 border-dashed border-slate-900 rounded-[32px] flex flex-col items-center justify-center opacity-40">
                        <i className="fas fa-magnifying-glass text-2xl mb-3 text-slate-700"></i>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-600">No matching modules found.</p>
                    </div>
                  )}
                </div>
              </div>
            )}

            {activeTab === 'structure' && (
              <div className="space-y-8 animate-in fade-in duration-300">
                <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4 mb-4">
                  <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Subject Framework</h3>
                  <button onClick={addSubject} className="w-full sm:w-auto px-4 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">+ Add Subject</button>
                </div>
                <div className="space-y-6">
                  {currentCourse.subjects?.map((subj, sIdx) => (
                    <div key={subj.id} className="bg-slate-950 border border-slate-800 rounded-[32px] p-6 md:p-8 space-y-8">
                      <div className="flex flex-col md:flex-row items-center gap-6">
                        <div className="relative">
                          <button onClick={() => setIconPickerOpenId(iconPickerOpenId === subj.id ? null : subj.id)} className={`w-14 h-14 rounded-2xl flex items-center justify-center text-2xl shadow-xl border-2 border-white/10 hover:scale-105 active:scale-95 transition-all shrink-0 ${subj.color}`}>
                            <i className={`fas ${subj.icon}`}></i>
                          </button>
                          {iconPickerOpenId === subj.id && (
                            <>
                              <div className="fixed inset-0 z-[190]" onClick={() => setIconPickerOpenId(null)}></div>
                              <div className="absolute z-[200] mt-4 left-0 p-4 bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl grid grid-cols-4 sm:grid-cols-6 gap-2 w-64 sm:w-80 max-h-64 overflow-y-auto no-scrollbar animate-in zoom-in-95">
                                {ICON_OPTIONS.map(icon => (
                                  <button key={icon} onClick={() => { const subjs = [...currentCourse.subjects!]; subjs[sIdx].icon = icon; setCurrentCourse({ ...currentCourse, subjects: subjs }); setIconPickerOpenId(null); }} className={`w-10 h-10 rounded-xl flex items-center justify-center border border-slate-800 text-slate-400 hover:bg-indigo-600 hover:text-white ${subj.icon === icon ? 'bg-indigo-600 text-white' : 'bg-slate-950'}`}>
                                    <i className={`fas ${icon} text-xs`}></i>
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </div>
                        <div className="flex-1 w-full">
                           <input type="text" value={subj.name} onChange={e => { const subjs = [...currentCourse.subjects!]; subjs[sIdx].name = e.target.value; setCurrentCourse({ ...currentCourse, subjects: subjs }); }} className="w-full bg-slate-900 border border-slate-800 rounded-xl px-5 py-3 text-white font-black text-lg focus:border-indigo-500 outline-none" />
                        </div>
                        <div className="flex items-center gap-3 w-full md:w-auto">
                           <button onClick={() => addSubSubject(subj.id)} className="flex-1 sm:flex-none px-4 py-2 bg-indigo-600/10 text-indigo-400 border border-indigo-600/20 rounded-xl text-[9px] font-black uppercase tracking-widest hover:bg-indigo-600 hover:text-white transition-all">+ Group</button>
                           <button onClick={() => setCurrentCourse({ ...currentCourse, subjects: currentCourse.subjects?.filter(s => s.id !== subj.id) })} className="w-10 h-10 rounded-xl bg-rose-500/5 text-slate-800 hover:text-rose-500 border border-transparent hover:border-rose-500/20"><i className="fas fa-trash-alt"></i></button>
                        </div>
                      </div>
                      <div className="md:pl-16 space-y-6 md:border-l-2 border-slate-800/40">
                        {subj.subSubjects?.map((ss, ssIdx) => (
                          <div key={ss.id} className="bg-slate-900/50 border border-slate-800 rounded-[24px] p-5 space-y-5 shadow-sm">
                            <div className="flex items-center gap-3">
                              <input type="text" value={ss.name} onChange={e => { const s = [...currentCourse.subjects!]; s[sIdx].subSubjects[ssIdx].name = e.target.value; setCurrentCourse({ ...currentCourse, subjects: s }); }} className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-4 py-2.5 text-slate-200 font-bold text-sm" />
                              <button onClick={() => addUnit(subj.id, ss.id)} className="px-3 py-1.5 bg-emerald-600/10 text-emerald-400 border border-emerald-500/20 rounded-lg text-[8px] font-black uppercase tracking-widest hover:bg-emerald-600 hover:text-white">+ Unit</button>
                              <button onClick={() => { const s = [...currentCourse.subjects!]; s[sIdx].subSubjects = s[sIdx].subSubjects.filter(subS => subS.id !== ss.id); setCurrentCourse({ ...currentCourse, subjects: s }); }} className="text-slate-800 hover:text-rose-500 p-2"><i className="fas fa-times text-xs"></i></button>
                            </div>
                            <div className="space-y-2">
                              {(ss.units || []).map((unit, uIdx) => (
                                <div key={unit.id} className="flex items-center gap-3 bg-slate-950 border border-slate-800/40 rounded-xl px-4 py-2">
                                  <input type="text" value={unit.name} onChange={e => { const s = [...currentCourse.subjects!]; s[sIdx].subSubjects[ssIdx].units[uIdx].name = e.target.value; setCurrentCourse({ ...currentCourse, subjects: s }); }} className="flex-1 bg-transparent border-none focus:ring-0 text-xs font-bold text-slate-500 focus:text-slate-100" />
                                  <button onClick={() => { const s = [...currentCourse.subjects!]; s[sIdx].subSubjects[ssIdx].units = ss.units.filter(u => u.id !== unit.id); setCurrentCourse({ ...currentCourse, subjects: s }); }} className="text-slate-800 hover:text-rose-500 p-1"><i className="fas fa-times text-[10px]"></i></button>
                                </div>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 md:space-y-12 animate-in fade-in duration-500 px-4 md:px-0 pb-32 md:pb-0">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div className="space-y-2">
          <h1 className="text-3xl md:text-5xl font-black text-white tracking-tight leading-none mb-2 uppercase">Management Portal</h1>
          <div className="flex bg-slate-950 p-1.5 rounded-2xl border border-slate-800 shadow-inner">
             {['courses', 'assets'].map((view) => (
                <button key={view} onClick={() => setMainView(view as any)} className={`px-6 py-2.5 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all ${mainView === view ? 'bg-indigo-600 text-white shadow-lg' : 'text-slate-600 hover:text-slate-400'}`}>
                  {view === 'courses' ? 'Registry Hub' : 'Asset Vault'}
                </button>
             ))}
          </div>
        </div>
        {mainView === 'courses' ? (
          <button onClick={() => { setCurrentCourse({ id: Math.random().toString(36).substr(2, 9), title: 'New Program', lessons: [], subjects: [], category: 'Academic', price: 0, roadmap: [] }); setIsEditing(true); }} className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl tracking-widest active:scale-95 transition-all">Initialize Program</button>
        ) : (
          <button onClick={() => fileInputRef.current?.click()} disabled={isUploading} className="w-full md:w-auto px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-[10px] uppercase shadow-xl tracking-widest active:scale-95 transition-all">
            {isUploading ? <i className="fas fa-spinner fa-spin mr-3"></i> : <i className="fas fa-cloud-arrow-up mr-3"></i>}
            Deploy New Asset
          </button>
        )}
        <input type="file" ref={fileInputRef} className="hidden" onChange={handleAssetUpload} />
      </div>

      {mainView === 'courses' && (
        <div className="grid grid-cols-1 gap-4 animate-in slide-in-from-left-4 duration-500">
          {courses.map(course => (
            <div key={course.id} className="bg-slate-900 rounded-[28px] border border-slate-800 p-5 md:p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 group hover:border-indigo-500/40 transition-all">
               <div className="flex items-center space-x-6 min-w-0">
                  <div className="w-16 h-12 md:w-24 md:h-16 overflow-hidden rounded-xl border border-slate-800 shrink-0 shadow-inner">
                    <img src={course.thumbnail} className="w-full h-full object-cover" alt="" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h4 className="font-black text-slate-100 text-base md:text-xl group-hover:text-indigo-400 transition-colors truncate">{course.title}</h4>
                    <div className="flex items-center space-x-3 mt-1 text-[8px] md:text-[9px] font-black uppercase text-slate-600 tracking-widest">
                       <span>{course.category}</span>
                       <span>•</span>
                       <span className="text-indigo-400">${(course.price || 0).toFixed(2)}</span>
                    </div>
                  </div>
               </div>
               <div className="flex items-center gap-3 w-full md:w-auto border-t md:border-none border-slate-800 pt-5 md:pt-0">
                  <button onClick={() => { setCurrentCourse({ ...course }); setIsEditing(true); }} className="flex-1 md:flex-none h-12 px-6 bg-slate-950 rounded-xl text-slate-500 hover:text-white border border-slate-800 hover:border-indigo-500 transition-all text-[9px] font-black uppercase tracking-widest"><i className="fas fa-edit mr-2"></i> Architect</button>
                  <button onClick={() => { if(confirm('Purge record?')) onDeleteCourse(course.id); }} className="h-12 w-12 bg-slate-950 rounded-xl text-slate-700 hover:text-rose-500 border border-slate-800 transition-all"><i className="fas fa-trash-alt"></i></button>
               </div>
            </div>
          ))}
        </div>
      )}

      {mainView === 'assets' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 animate-in slide-in-from-right-4 duration-500">
          {hostedAssets.map(asset => (
            <div key={asset.id} className="bg-slate-900 border border-slate-800 rounded-[28px] p-5 space-y-4 group hover:border-indigo-500/30 transition-all shadow-sm">
               <div className="aspect-square bg-slate-950 rounded-2xl flex items-center justify-center border border-slate-800 group-hover:bg-slate-800 transition-all overflow-hidden relative">
                  {asset.mimeType.includes('image') ? (
                     <img src={asset.data as string} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" alt="" />
                  ) : (
                     <i className={`fas ${getAssetIcon(asset.mimeType)} text-3xl opacity-40 group-hover:opacity-100 group-hover:scale-110 transition-all`}></i>
                  )}
                  <div className="absolute top-2 right-2 flex flex-col gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                     <button onClick={() => triggerLocalDownload(asset)} className="w-8 h-8 rounded-lg bg-indigo-600/20 text-indigo-400 flex items-center justify-center hover:bg-indigo-600 hover:text-white transition-all"><i className="fas fa-download text-[10px]"></i></button>
                     <button onClick={() => handleDeleteAsset(asset.id)} className="w-8 h-8 rounded-lg bg-rose-600/20 text-rose-500 flex items-center justify-center hover:bg-rose-600 hover:text-white transition-all"><i className="fas fa-trash-alt text-[10px]"></i></button>
                  </div>
               </div>
               <div className="space-y-1 min-w-0">
                  <p className="text-[11px] font-black text-white truncate">{asset.fileName}</p>
                  <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest truncate font-mono">{asset.mimeType}</p>
               </div>
               <div className="pt-2 border-t border-slate-800/50 flex items-center gap-2">
                  <button onClick={() => copyToClipboard(asset.url, asset.id)} className="flex-1 py-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-500 hover:text-indigo-400 hover:border-indigo-500/30 text-[8px] font-black uppercase tracking-widest transition-all flex items-center justify-center">
                     {copyFeedback === asset.id ? 'Copied' : <><i className="fas fa-link mr-2"></i> Copy URL</>}
                  </button>
               </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
