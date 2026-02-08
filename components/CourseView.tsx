
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { Course, QuizAttempt, User, Lesson, Resource } from '../types';
import AIAssistant from './AIAssistant';
import { getAllHostedAssets } from '../services/storage';

interface CourseViewProps {
  course: Course;
  user: User;
  onBack: () => void;
  initialLessonId?: string;
  onQuizComplete: (lessonId: string, attempt: QuizAttempt) => void;
  onNotesUpdate: (lessonId: string, content: string) => void;
  onAddResource: (lessonId: string, resource: Resource) => void;
}

const CourseView: React.FC<CourseViewProps> = ({ course, user, onBack, initialLessonId, onQuizComplete, onNotesUpdate }) => {
  const [activeLessonId, setActiveLessonId] = useState(initialLessonId || course.lessons[0]?.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'quiz' | 'notes'>('overview');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [lessonVideoUrl, setLessonVideoUrl] = useState<string | null>(null);
  const [scrollProgress, setScrollProgress] = useState(0);
  
  const [quizState, setQuizState] = useState({
    complete: false,
    score: 0,
    answers: {} as Record<string, number>
  });

  const [examTimeLeft, setExamTimeLeft] = useState<number | null>(null);
  const examTimerRef = useRef<any>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const contentAreaRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isCinemaMode, setIsCinemaMode] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const activeLessonIndex = useMemo(() => 
    course.lessons.findIndex(l => l.id === activeLessonId)
  , [course.lessons, activeLessonId]);

  const activeLesson = useMemo(() => 
    course.lessons[activeLessonIndex] || course.lessons[0]
  , [course.lessons, activeLessonIndex]);

  const nextLesson = course.lessons[activeLessonIndex + 1];
  const prevLesson = course.lessons[activeLessonIndex - 1];

  const handleSubmitExam = useCallback(() => {
    const questions = activeLesson.quiz || [];
    if (questions.length === 0) return;
    if (examTimerRef.current) {
      clearInterval(examTimerRef.current);
      examTimerRef.current = null;
    }
    let score = 0;
    questions.forEach(q => { if (quizState.answers[q.id] === q.correctAnswer) score++; });
    const attempt: QuizAttempt = { score, total: questions.length, date: new Date() };
    setQuizState(prev => ({ ...prev, complete: true, score }));
    onQuizComplete(activeLesson.id, attempt);
    setExamTimeLeft(null);
  }, [activeLesson, quizState.answers, onQuizComplete]);

  useEffect(() => {
    if (activeLesson.isExamMode && !quizState.complete && examTimeLeft === null) {
      const durationSeconds = (activeLesson.examDuration || 30) * 60;
      setExamTimeLeft(durationSeconds);
      examTimerRef.current = setInterval(() => {
        setExamTimeLeft(prev => {
          if (prev === null) return null;
          if (prev <= 1) {
            handleSubmitExam();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => { if (examTimerRef.current) clearInterval(examTimerRef.current); };
  }, [activeLesson.id, activeLesson.isExamMode, quizState.complete, handleSubmitExam, examTimeLeft]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      const isNowFullscreen = !!document.fullscreenElement;
      setIsFullscreen(isNowFullscreen);
      if (isNowFullscreen) setIsCinemaMode(true);
    };
    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => document.removeEventListener('fullscreenchange', handleFullscreenChange);
  }, []);

  const resolveAssetUrl = async (url: string): Promise<string> => {
    if (url.includes('eduworld.ct.ws/cdn/')) {
      const id = url.split('/cdn/')[1];
      const assets = await getAllHostedAssets();
      const asset = assets.find(a => a.id === id);
      if (asset && asset.data) {
        let blob: Blob;
        if (asset.data instanceof Blob) {
          blob = asset.data;
        } else {
          const response = await fetch(asset.data as string);
          blob = await response.blob();
        }
        return URL.createObjectURL(blob);
      }
    }
    return url;
  };

  useEffect(() => {
    let currentUrl: string | null = null;
    const loadVideo = async () => {
      setLessonVideoUrl(null);
      setIsPlaying(false);
      if (!activeLesson.videoUrl) return;
      if (activeLesson.videoUrl instanceof Blob) {
        currentUrl = URL.createObjectURL(activeLesson.videoUrl);
        setLessonVideoUrl(currentUrl);
      } else {
        const resolved = await resolveAssetUrl(activeLesson.videoUrl);
        setLessonVideoUrl(resolved);
        if (resolved.startsWith('blob:')) currentUrl = resolved;
      }
    };
    loadVideo();
    return () => { if (currentUrl) URL.revokeObjectURL(currentUrl); };
  }, [activeLesson.id, activeLesson.videoUrl]);

  useEffect(() => {
    const existingScore = user.quizScores[activeLesson.id];
    setQuizState({ complete: !!existingScore, score: existingScore?.score || 0, answers: {} });
    setExamTimeLeft(null); 
    if (activeLesson.isExamMode) setActiveTab('quiz');
    else setActiveTab('overview');
    if (contentAreaRef.current) contentAreaRef.current.scrollTo({ top: 0, behavior: 'smooth' });
  }, [activeLesson.id, user.quizScores, activeLesson.isExamMode]);

  const handleNavigate = (lessonId: string, dir: 'next' | 'prev') => {
    if (activeLesson.isExamMode && examTimeLeft !== null && !quizState.complete) {
      if (!confirm('Exam in progress. Navigation will forfeit current progress. Continue?')) return;
    }
    setDirection(dir);
    setActiveLessonId(lessonId);
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => {});
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const toggleFullscreen = async () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) await containerRef.current.requestFullscreen();
    else await document.exitFullscreen();
  };

  const handleOpenResource = async (res: Resource) => {
    // Determine if it's a vault asset or external URL
    const isVaultAsset = res.url.includes('eduworld.ct.ws/cdn/');
    if (isVaultAsset) {
      const resolvedUrl = await resolveAssetUrl(res.url);
      window.open(resolvedUrl, '_blank');
    } else {
      // Strictly open external links natively
      window.open(res.url, '_blank');
    }
  };

  const formatExamTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h > 0 ? h + ':' : ''}${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex h-screen bg-[#020617] overflow-hidden relative">
      <div className="fixed top-0 left-0 right-0 h-1 z-[100] bg-slate-900 overflow-hidden">
        <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)] transition-all duration-300" style={{ width: `${scrollProgress}%` }} />
      </div>

      <div className="flex-1 flex flex-col overflow-hidden relative">
        <header className={`absolute top-0 left-0 right-0 z-50 p-4 md:p-6 flex items-center justify-between pointer-events-none transition-all duration-500 ${!lessonVideoUrl || isFullscreen ? 'opacity-0 translate-y-[-100%]' : 'opacity-100'}`}>
           <button onClick={onBack} className="pointer-events-auto flex items-center space-x-2 md:space-x-3 px-3 py-2 md:px-5 md:py-3 bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-xl md:rounded-2xl text-slate-400 hover:text-white transition-all shadow-2xl">
              <i className="fas fa-arrow-left text-[9px] md:text-[10px]"></i>
              <span className="text-[8px] md:text-[10px] font-black uppercase tracking-widest pt-0.5">Return</span>
           </button>
           {activeLesson.isExamMode && examTimeLeft !== null && (
             <div className="pointer-events-auto flex items-center space-x-2 md:space-x-4 px-3 py-2 md:px-6 md:py-3 bg-rose-600/90 backdrop-blur-xl rounded-xl md:rounded-2xl shadow-2xl border border-rose-500/30 animate-in zoom-in-95">
                <i className="fas fa-clock-rotate-left text-white animate-pulse text-xs"></i>
                <span className="text-white font-black text-xs md:text-sm tracking-[0.2em]">{formatExamTime(examTimeLeft)}</span>
             </div>
           )}
           {lessonVideoUrl && (
            <button onClick={() => setIsCinemaMode(!isCinemaMode)} className="pointer-events-auto px-3 py-2 md:px-5 md:py-3 bg-slate-900/60 backdrop-blur-xl border border-slate-800/50 rounded-xl md:rounded-2xl text-slate-400 hover:text-indigo-400 transition-all shadow-2xl">
                <i className={`fas ${isCinemaMode ? 'fa-compress' : 'fa-expand-arrows-alt'} text-[9px] md:text-[11px]`}></i>
            </button>
           )}
        </header>

        <div ref={contentAreaRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pb-32" onScroll={(e) => {
          const target = e.currentTarget;
          const progressValue = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
          setScrollProgress(progressValue);
        }}>
          {lessonVideoUrl && (
            <div ref={containerRef} className={`bg-black aspect-video relative group flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-700 ${isCinemaMode ? 'h-[70vh] md:h-[90vh] aspect-auto' : ''} ${isFullscreen ? '!h-screen !w-screen' : ''}`}>
              <video ref={videoRef} src={lessonVideoUrl} className="w-full h-full object-contain" onTimeUpdate={() => setProgress((videoRef.current!.currentTime / videoRef.current!.duration) * 100)} onLoadedMetadata={() => setDuration(videoRef.current!.duration)} onClick={togglePlay} playsInline />
              <div className="absolute inset-0 pointer-events-none overflow-hidden z-[15]">
                  <div className="animate-watermark-drift text-[6px] md:text-[9px] font-black uppercase tracking-[0.4em] md:tracking-[0.6em] text-white/5 whitespace-nowrap select-none bg-black/5 px-2 py-1 md:px-4 md:py-2 rounded-full backdrop-blur-[0.5px]">
                    NODE: {user.id.toUpperCase()} • SECURE NEURAL FEED • {new Date().toLocaleDateString()}
                  </div>
              </div>
              {!isPlaying && (
                <div onClick={togglePlay} className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-[2px] cursor-pointer z-10">
                  <div className="w-14 h-14 md:w-24 md:h-24 bg-indigo-600/90 text-white rounded-[20px] md:rounded-[40px] flex items-center justify-center text-xl md:text-3xl shadow-[0_0_50px_rgba(99,102,241,0.5)] transform transition-all hover:scale-110">
                    <i className="fas fa-play ml-1"></i>
                  </div>
                </div>
              )}
              <div className={`absolute bottom-0 left-0 right-0 p-4 md:p-8 bg-gradient-to-t from-black via-black/40 to-transparent transition-all duration-500 z-20 ${isPlaying ? 'opacity-0 group-hover:opacity-100' : 'opacity-100'}`}>
                <div className="relative mb-3 md:mb-6">
                  <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                      <div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]" style={{ width: `${progress}%` }}></div>
                  </div>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3 md:space-x-8 text-white">
                    <button onClick={togglePlay} className="text-sm md:text-xl hover:text-indigo-400 transition-colors p-1 md:p-2"><i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i></button>
                    <span className="text-[8px] md:text-[11px] font-black tracking-[0.1em] text-slate-400">
                      {Math.floor((videoRef.current?.currentTime || 0) / 60)}:{(Math.floor((videoRef.current?.currentTime || 0) % 60)).toString().padStart(2, '0')} 
                      <span className="mx-1 md:mx-2 opacity-30">/</span> 
                      {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}
                    </span>
                  </div>
                  <div className="flex items-center space-x-2 md:space-x-6">
                      <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white transition-colors p-1 md:p-2"><i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-[10px] md:text-sm`}></i></button>
                  </div>
                </div>
              </div>
            </div>
          )}

          <div key={activeLessonId} className={`max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-12 relative animate-in fade-in duration-700 ${!lessonVideoUrl ? 'pt-20 md:pt-32' : 'pt-4 md:pt-12'} ${direction === 'next' ? 'slide-in-from-right-12' : direction === 'prev' ? 'slide-in-from-left-12' : 'slide-in-from-bottom-6'}`}>
            <div className="mb-6 md:mb-12 space-y-3 md:space-y-4">
               <div className="flex items-center space-x-3 md:space-x-4">
                  <span className={`px-2 py-0.5 md:px-3 md:py-1 text-[7px] md:text-[9px] font-black uppercase tracking-widest rounded-full border shadow-sm ${activeLesson.isExamMode ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20'}`}>
                    {activeLesson.isExamMode ? 'Exam Node' : `Module ${activeLessonIndex + 1} of ${course.lessons.length}`}
                  </span>
                  <div className="h-[1px] flex-1 bg-slate-800/50"></div>
               </div>
               <h1 className="text-xl md:text-5xl font-black text-white tracking-tighter leading-tight">{activeLesson.title}</h1>
            </div>

            <div className="flex items-center justify-between gap-2 mb-6 md:mb-10 relative z-10 border-b border-slate-800/50 overflow-hidden">
               <div className="flex space-x-4 md:space-x-10 overflow-x-auto no-scrollbar pb-1 -mb-[1px] snap-x w-full">
                {[
                  { id: 'overview', label: 'Theory', icon: 'fa-book-open', disabled: activeLesson.isExamMode && !quizState.complete },
                  { id: 'resources', label: 'Assets', icon: 'fa-folder-open', count: activeLesson.resources?.length, disabled: activeLesson.isExamMode && !quizState.complete },
                  { id: 'quiz', label: activeLesson.isExamMode ? 'Examination' : 'Assessment', icon: activeLesson.isExamMode ? 'fa-file-signature' : 'fa-vial' },
                  { id: 'notes', label: 'Notes', icon: 'fa-pen-nib', disabled: activeLesson.isExamMode && !quizState.complete }
                ].map(tab => (
                  <button 
                    key={tab.id} 
                    disabled={tab.disabled}
                    onClick={() => setActiveTab(tab.id as any)} 
                    className={`pb-3 md:pb-4 text-[7px] md:text-[10px] font-black uppercase tracking-[0.2em] transition-all border-b-2 flex items-center space-x-2 md:space-x-3 whitespace-nowrap snap-start ${tab.disabled ? 'opacity-20 cursor-not-allowed' : activeTab === tab.id ? 'text-indigo-400 border-indigo-400' : 'text-slate-600 border-transparent hover:text-slate-400'}`}
                  >
                    <i className={`fas ${tab.icon} text-[8px] md:text-[10px]`}></i>
                    <span>{tab.label}</span>
                    {tab.count !== undefined && tab.count > 0 && <span className={`text-[6px] md:text-[8px] px-1 md:px-1.5 py-0.5 rounded-full ${activeTab === tab.id ? 'bg-indigo-600 text-white' : 'bg-slate-800 text-slate-500'}`}>{tab.count}</span>}
                  </button>
                ))}
               </div>
            </div>

            <div className="relative z-10 min-h-[40vh] md:min-h-[50vh]">
              {activeTab === 'overview' && (
                <div className="prose prose-invert max-w-none text-sm md:text-base">
                  <div className="ql-editor p-0 !m-0 !min-h-0" dangerouslySetInnerHTML={{ __html: activeLesson.content }} />
                </div>
              )}
              {activeTab === 'quiz' && (
                <div className="space-y-6 md:space-y-8 animate-in slide-in-from-right-8 duration-500">
                  {quizState.complete ? (
                    <div className="bg-slate-900/80 border border-slate-800 rounded-[20px] md:rounded-[24px] p-6 md:p-16 text-center shadow-2xl relative overflow-hidden group">
                        <div className={`w-12 h-12 md:w-24 md:h-24 rounded-full flex items-center justify-center mx-auto mb-4 text-lg md:text-3xl border shadow-inner ${activeLesson.isExamMode ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20'}`}>
                          <i className={`fas ${activeLesson.isExamMode ? 'fa-shield-check' : 'fa-award'}`}></i>
                        </div>
                        <h3 className="text-base md:text-3xl font-black text-white mb-2 tracking-tighter">{activeLesson.isExamMode ? 'Exam Completed' : 'Knowledge Authenticated'}</h3>
                        <p className="text-slate-500 text-[8px] md:text-xs font-black uppercase tracking-[0.4em] mb-6 md:mb-12">Neural Efficiency: {quizState.score} / {activeLesson.quiz?.length}</p>
                        {!activeLesson.isExamMode && <button onClick={() => setQuizState({ complete: false, score: 0, answers: {} })} className="px-4 py-2 md:px-6 md:py-3 bg-slate-800 hover:bg-slate-700 rounded-xl text-[8px] md:text-[9px] font-black uppercase tracking-[0.3em] transition-all shadow-xl">Re-Sync</button>}
                    </div>
                  ) : (
                    <div className="space-y-6 md:space-y-12">
                      {(activeLesson.quiz || []).map((q, qIdx) => (
                        <div key={q.id} className="bg-slate-900/40 border border-slate-800 rounded-[16px] md:rounded-[32px] p-5 md:p-10 shadow-lg group">
                          <p className="text-[7px] text-slate-600 font-black uppercase tracking-[0.4em] mb-4 md:mb-8 border-b border-slate-800 pb-2 md:pb-4 flex justify-between items-center"><span>Index {qIdx + 1}</span></p>
                          <p className="text-sm md:text-2xl font-black text-slate-100 mb-6 md:mb-10 leading-tight">{q.question}</p>
                          <div className="grid grid-cols-1 gap-2 md:gap-4">
                            {q.options.map((opt, i) => (
                              <button key={i} onClick={() => setQuizState(prev => ({ ...prev, answers: { ...prev.answers, [q.id]: i } }))} className={`p-3 md:p-6 rounded-[12px] md:rounded-[28px] text-left text-[11px] md:text-sm font-bold transition-all border flex items-center space-x-3 md:space-x-6 ${quizState.answers[q.id] === i ? 'bg-indigo-600 border-indigo-500 text-white shadow-xl' : 'bg-slate-950 border-slate-800 text-slate-500'}`}>
                                <span className={`w-6 h-6 md:w-10 md:h-10 rounded-lg md:rounded-xl flex items-center justify-center text-[8px] md:text-[11px] font-black border ${quizState.answers[q.id] === i ? 'bg-indigo-500 border-white/20 text-white' : 'bg-slate-900 border-slate-800'}`}>{String.fromCharCode(65 + i)}</span>
                                <span className="flex-1 leading-snug">{opt}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                      {activeLesson.quiz && activeLesson.quiz.length > 0 && <button onClick={handleSubmitExam} className={`w-full py-4 md:py-6 text-white rounded-[12px] md:rounded-[32px] font-black uppercase text-[8px] md:text-xs tracking-[0.2em] md:tracking-[0.5em] shadow-2xl transition-all ${activeLesson.isExamMode ? 'bg-rose-600' : 'bg-indigo-600'}`}>{activeLesson.isExamMode ? 'Submit Exam' : 'Commit Neural Responses'}</button>}
                    </div>
                  )}
                </div>
              )}
              {activeTab === 'resources' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 md:gap-6 animate-in slide-in-from-right-8 duration-500">
                  {(activeLesson.resources || []).map(res => (
                    <button key={res.id} onClick={() => handleOpenResource(res)} className="flex items-center p-3 md:p-6 bg-slate-900/50 border border-slate-800 rounded-[16px] md:rounded-[32px] hover:border-indigo-500/50 transition-all text-left group">
                       <div className={`w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-2xl bg-slate-950 flex items-center justify-center mr-3 md:mr-5 text-xs md:text-xl transition-all ${res.url.includes('eduworld.ct.ws') ? 'text-indigo-400 group-hover:bg-indigo-600 group-hover:text-white' : 'text-emerald-400 group-hover:bg-emerald-600 group-hover:text-white'}`}>
                          <i className={`fas ${res.type === 'video' ? 'fa-play-circle' : res.type === 'zip' ? 'fa-file-zipper' : 'fa-link'}`}></i>
                       </div>
                       <div className="flex-1 min-w-0">
                          <p className={`text-[11px] md:text-base font-black text-white truncate leading-tight transition-colors ${res.url.includes('eduworld.ct.ws') ? 'group-hover:text-indigo-400' : 'group-hover:text-emerald-400'}`}>{res.title}</p>
                          <p className="text-[6px] md:text-[10px] font-black text-slate-600 uppercase tracking-widest mt-0.5">
                            {res.url.includes('eduworld.ct.ws') ? 'VAULT' : 'EXTERNAL'} • {res.type.toUpperCase()}
                          </p>
                       </div>
                    </button>
                  ))}
                </div>
              )}
              {activeTab === 'notes' && (
                <div className="animate-in slide-in-from-right-8 duration-500 h-full">
                  <textarea value={user.notes?.[activeLesson.id] || ''} onChange={(e) => onNotesUpdate(activeLesson.id, e.target.value)} placeholder="Establish module insights..." className="w-full h-[300px] md:h-[600px] bg-slate-950/80 border border-slate-800 rounded-[16px] md:rounded-[40px] p-4 md:p-12 text-slate-300 font-medium placeholder:text-slate-800 outline-none shadow-inner leading-relaxed text-xs md:text-lg" />
                </div>
              )}
            </div>

            <div className="mt-8 md:mt-12 p-1 bg-slate-900/80 backdrop-blur-3xl border border-slate-800 rounded-[20px] md:rounded-[36px] flex flex-row items-stretch md:items-center justify-between gap-1 shadow-2xl z-40">
               {prevLesson ? (
                  <button onClick={() => handleNavigate(prevLesson.id, 'prev')} className="flex items-center space-x-2 md:space-x-4 p-2 rounded-[16px] md:rounded-[32px] hover:bg-slate-950 transition-all shrink-0 text-left min-w-0">
                      <div className="w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-center text-slate-500 shrink-0"><i className="fas fa-chevron-left text-[8px] md:text-[10px]"></i></div>
                      <div className="min-w-0 flex-1 hidden sm:block">
                          <p className="text-[7px] md:text-[9px] font-black text-slate-600 uppercase tracking-widest">Prev</p>
                          <p className="text-[8px] md:text-xs font-bold text-slate-300 truncate max-w-[100px] md:max-w-[150px]">{prevLesson.title}</p>
                      </div>
                  </button>
               ) : <div className="w-8 md:w-14"></div>}
               <div className="flex px-4 md:px-10 py-3 md:py-4 bg-indigo-600/10 rounded-full border border-indigo-500/20 shadow-inner items-center">
                  <span className="text-[9px] md:text-[11px] font-black text-indigo-400 uppercase tracking-[0.3em] md:tracking-[0.4em] whitespace-nowrap">{activeLessonIndex + 1} / {course.lessons.length}</span>
               </div>
               {nextLesson ? (
                  <button onClick={() => handleNavigate(nextLesson.id, 'next')} className="flex items-center space-x-2 md:space-x-4 p-2 rounded-[16px] md:rounded-[32px] bg-slate-950/50 border border-indigo-500/10 transition-all shrink-0 text-right min-w-0">
                      <div className="min-w-0 flex-1 hidden sm:block">
                          <p className="text-[7px] md:text-[9px] font-black text-indigo-400 uppercase tracking-widest">Next</p>
                          <p className="text-[8px] md:text-xs font-bold text-slate-100 truncate max-w-[100px] md:max-w-[150px]">{nextLesson.title}</p>
                      </div>
                      <div className="w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-indigo-600 text-white flex items-center justify-center text-[8px] md:text-[10px] shrink-0"><i className="fas fa-chevron-right"></i></div>
                  </button>
               ) : (
                  <button onClick={onBack} className="flex items-center space-x-2 md:space-x-4 p-2 rounded-[16px] md:rounded-[32px] bg-emerald-600/10 border border-emerald-500/20 transition-all shrink-0 text-right">
                      <div className="w-8 h-8 md:w-14 md:h-14 rounded-lg md:rounded-xl bg-emerald-600 text-white flex items-center justify-center text-[8px] md:text-[10px] shrink-0"><i className="fas fa-flag-checkered"></i></div>
                  </button>
               )}
            </div>
          </div>
        </div>
        <button onClick={() => setIsAiOpen(!isAiOpen)} className={`fixed bottom-6 right-6 md:bottom-10 md:right-10 w-12 h-12 md:w-20 md:h-20 rounded-[12px] md:rounded-[32px] flex items-center justify-center transition-all shadow-2xl z-[100] group ${isAiOpen ? 'bg-rose-600 text-white rotate-90' : 'bg-indigo-600 text-white shadow-indigo-600/40'} ${isFullscreen ? 'opacity-0 pointer-events-none' : ''}`}>
          <i className={`fas ${isAiOpen ? 'fa-times' : 'fa-sparkles'} text-base md:text-2xl`}></i>
        </button>
        <div className={`fixed inset-y-0 right-0 w-full md:w-[500px] bg-slate-950 md:border-l md:border-slate-800 z-[110] transition-transform duration-700 ${isAiOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          {activeLesson && <AIAssistant course={course} lesson={activeLesson} user={user} />}
        </div>
      </div>
    </div>
  );
};

export default CourseView;
