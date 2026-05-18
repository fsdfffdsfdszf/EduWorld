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
  onLessonChange?: (lessonId: string) => void;
}

const CourseView: React.FC<CourseViewProps> = ({ course, user, onBack, initialLessonId, onQuizComplete, onNotesUpdate, onLessonChange }) => {
  const [activeLessonId, setActiveLessonId] = useState(initialLessonId || course.lessons[0]?.id);
  const [activeTab, setActiveTab] = useState<'overview' | 'resources' | 'quiz' | 'notes'>('overview');
  const [isAiOpen, setIsAiOpen] = useState(false);
  const [direction, setDirection] = useState<'next' | 'prev' | null>(null);
  const [lessonVideoUrl, setLessonVideoUrl] = useState<string | null>(null);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [videoError, setVideoError] = useState<string | null>(null);
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
  const [playbackSpeed, setPlaybackSpeed] = useState(1);

  useEffect(() => {
    if (initialLessonId && initialLessonId !== activeLessonId) {
      setActiveLessonId(initialLessonId);
    }
  }, [initialLessonId]);

  useEffect(() => {
    if (activeLessonId && onLessonChange) {
      onLessonChange(activeLessonId);
    }
  }, [activeLessonId, onLessonChange]);

  const activeLessonIndex = useMemo(() => 
    course.lessons.findIndex(l => l.id === activeLessonId)
  , [course.lessons, activeLessonId]);

  const activeLesson = useMemo(() => 
    course.lessons[activeLessonIndex] || course.lessons[0]
  , [course.lessons, activeLessonIndex]);

  const nextLesson = course.lessons[activeLessonIndex + 1];
  const prevLesson = course.lessons[activeLessonIndex - 1];

  const videoSourceInfo = useMemo(() => {
    if (!lessonVideoUrl) return { type: 'none' as const };
    const url = lessonVideoUrl.toLowerCase();
    
    // YouTube
    const ytRegex = /(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
    const ytMatch = lessonVideoUrl.match(ytRegex);
    if (ytMatch) return { type: 'youtube' as const, id: ytMatch[1] };
    
    // Vimeo
    const vimeoRegex = /vimeo\.com\/(?:video\/)?(\d+)/i;
    const vimeoMatch = lessonVideoUrl.match(vimeoRegex);
    if (vimeoMatch) return { type: 'vimeo' as const, id: vimeoMatch[1] };
    
    return { type: 'native' as const };
  }, [lessonVideoUrl]);

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

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') return;
      if (videoSourceInfo.type !== 'native') return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        skipForward();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        skipBackward();
      } else if (e.key === ' ') {
        e.preventDefault();
        togglePlay();
      } else if (e.key.toLowerCase() === 'f') {
        e.preventDefault();
        toggleFullscreen();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [lessonVideoUrl]);

  useEffect(() => {
    if (videoRef.current && videoSourceInfo.type === 'native') {
      videoRef.current.playbackRate = playbackSpeed;
    }
  }, [playbackSpeed, lessonVideoUrl]);

  const resolveAssetUrl = async (url: any): Promise<string> => {
    if (!url) return '';
    if (url instanceof Blob) return URL.createObjectURL(url);
    const urlStr = String(url);
    
    // Only resolve internal CDN links from IndexedDB
    if (urlStr.includes('eduworld.ct.ws/cdn/')) {
      const parts = urlStr.split('/cdn/');
      const id = parts[parts.length - 1];
      const assets = await getAllHostedAssets();
      const asset = assets.find(a => a.id === id);
      if (asset && asset.data) {
        if (asset.data instanceof Blob) return URL.createObjectURL(asset.data);
        const res = await fetch(asset.data);
        const blob = await res.blob();
        return URL.createObjectURL(blob);
      }
    }
    // External links (YouTube, etc) are returned as-is
    return urlStr;
  };

  useEffect(() => {
    let currentObjectUrl: string | null = null;
    const loadVideo = async () => {
      setIsVideoLoading(true);
      setVideoError(null);
      setLessonVideoUrl(null);
      setIsPlaying(false);
      setProgress(0);
      
      if (!activeLesson.videoUrl) {
        setIsVideoLoading(false);
        return;
      }

      try {
        const resolved = await resolveAssetUrl(activeLesson.videoUrl);
        setLessonVideoUrl(resolved);
        if (resolved.startsWith('blob:')) currentObjectUrl = resolved;
      } catch (err) {
        setVideoError("153"); 
      } finally {
        setIsVideoLoading(false);
      }
    };
    loadVideo();
    return () => { if (currentObjectUrl) URL.revokeObjectURL(currentObjectUrl); };
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
    if (!videoRef.current || videoSourceInfo.type !== 'native') return;
    if (videoRef.current.paused) {
      videoRef.current.play().catch(() => setVideoError("153"));
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

  const skipForward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime += 10;
  };

  const skipBackward = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (!videoRef.current) return;
    videoRef.current.currentTime -= 10;
  };

  const toggleSpeed = (e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newSpeed = playbackSpeed === 1 ? 2 : 1;
    setPlaybackSpeed(newSpeed);
    if (videoRef.current) {
      videoRef.current.playbackRate = newSpeed;
    }
  };

  const handleOpenResource = async (res: Resource) => {
    const isVaultAsset = res.url.includes('eduworld.ct.ws/cdn/');
    if (isVaultAsset) {
      const resolvedUrl = await resolveAssetUrl(res.url);
      window.open(resolvedUrl, '_blank');
    } else {
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
        <header className={`absolute top-0 left-0 right-0 z-50 p-4 md:p-6 flex items-center justify-between pointer-events-none transition-all duration-500 ${!lessonVideoUrl || isFullscreen || videoError ? 'opacity-0 translate-y-[-100%]' : 'opacity-100'}`}>
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
        </header>

        <div ref={contentAreaRef} className="flex-1 overflow-y-auto no-scrollbar scroll-smooth pb-32" onScroll={(e) => {
          const target = e.currentTarget;
          const progressValue = (target.scrollTop / (target.scrollHeight - target.clientHeight)) * 100;
          setScrollProgress(progressValue);
        }}>
          {isVideoLoading && (
            <div className="bg-black aspect-video flex items-center justify-center">
              <div className="text-center space-y-4">
                <div className="w-12 h-12 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
                <p className="text-[10px] font-black text-indigo-400 uppercase tracking-[0.4em]">Initializing Neural Stream</p>
              </div>
            </div>
          )}

          {videoError === "153" && (
            <div className="bg-black aspect-video flex items-center justify-center p-6 text-center">
               <div className="space-y-6 max-w-sm animate-in zoom-in duration-500">
                  <div className="w-20 h-20 bg-rose-500/10 border border-rose-500/30 rounded-[32px] flex items-center justify-center mx-auto text-rose-500 text-3xl shadow-2xl">
                     <i className="fas fa-link-slash"></i>
                  </div>
                  <div className="space-y-2">
                     <h3 className="text-xl font-black text-white uppercase tracking-tight">Protocol Error 153</h3>
                     <p className="text-slate-500 font-bold uppercase tracking-widest text-[9px]">Neural Link Integrity Failure</p>
                  </div>
                  <p className="text-slate-400 text-xs leading-relaxed">The media source node is unreachable or improperly formatted.</p>
                  <div className="flex gap-2 justify-center">
                    <button onClick={() => location.reload()} className="px-6 py-3 bg-indigo-600 text-white rounded-xl text-[9px] font-black uppercase tracking-widest shadow-xl active:scale-95 transition-all">Re-Sync Node</button>
                    <button onClick={onBack} className="px-6 py-3 bg-slate-900 border border-slate-800 rounded-xl text-[9px] font-black uppercase tracking-widest hover:text-white transition-all">Back</button>
                  </div>
               </div>
            </div>
          )}

          {!isVideoLoading && !videoError && lessonVideoUrl && (
            <div ref={containerRef} className={`bg-black aspect-video relative group flex items-center justify-center overflow-hidden shadow-2xl transition-all duration-700 ${isCinemaMode ? 'h-[70vh] md:h-[90vh] aspect-auto' : ''} ${isFullscreen ? '!h-screen !w-screen' : ''}`}>
              {videoSourceInfo.type === 'youtube' ? (
                <iframe src={`https://www.youtube.com/embed/${videoSourceInfo.id}?autoplay=1&modestbranding=1&rel=0`} className="w-full h-full border-none" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen />
              ) : videoSourceInfo.type === 'vimeo' ? (
                <iframe src={`https://player.vimeo.com/video/${videoSourceInfo.id}?autoplay=1&badge=0&autopause=0`} className="w-full h-full border-none" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen />
              ) : (
                <>
                  <video 
                    ref={videoRef} 
                    src={lessonVideoUrl} 
                    className="w-full h-full object-contain" 
                    onTimeUpdate={() => setProgress((videoRef.current!.currentTime / videoRef.current!.duration) * 100)} 
                    onLoadedMetadata={() => {
                      setDuration(videoRef.current!.duration);
                      if (videoRef.current) videoRef.current.playbackRate = playbackSpeed;
                    }} 
                    onError={() => setVideoError("153")} 
                    onClick={togglePlay} 
                    playsInline 
                  />
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
                    <div className="relative mb-3 md:mb-6"><div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden"><div className="h-full bg-indigo-500 shadow-[0_0_15px_rgba(99,102,241,0.8)]" style={{ width: `${progress}%` }}></div></div></div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 md:space-x-8 text-white">
                        <button onClick={skipBackward} className="text-sm md:text-2xl hover:text-indigo-400 transition-colors p-2 md:p-3" title="Back 10s"><i className="fas fa-rotate-left"></i></button>
                        <button onClick={togglePlay} className="text-lg md:text-3xl hover:text-indigo-400 transition-colors p-2 md:p-3"><i className={`fas ${isPlaying ? 'fa-pause' : 'fa-play'}`}></i></button>
                        <button onClick={skipForward} className="text-sm md:text-2xl hover:text-indigo-400 transition-colors p-2 md:p-3" title="Forward 10s"><i className="fas fa-rotate-right"></i></button>
                        <span className="text-[10px] md:text-sm font-black tracking-[0.1em] text-slate-400 tabular-nums">{Math.floor((videoRef.current?.currentTime || 0) / 60)}:{(Math.floor((videoRef.current?.currentTime || 0) % 60)).toString().padStart(2, '0')} <span className="mx-1 md:mx-2 opacity-30">/</span> {Math.floor(duration / 60)}:{(Math.floor(duration % 60)).toString().padStart(2, '0')}</span>
                      </div>
                      <div className="flex items-center space-x-2 md:space-x-4">
                        <button onClick={toggleSpeed} className="px-2 py-1 md:px-3 md:py-1.5 bg-slate-800/80 hover:bg-indigo-600 border border-slate-700 rounded-lg text-[8px] md:text-[10px] font-black text-white uppercase tracking-widest transition-all">
                          {playbackSpeed}x Speed
                        </button>
                        <button onClick={toggleFullscreen} className="text-slate-400 hover:text-white transition-colors p-1 md:p-2"><i className={`fas ${isFullscreen ? 'fa-compress' : 'fa-expand'} text-[10px] md:text-sm`}></i></button>
                      </div>
                    </div>
                  </div>
                </>
              )}
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
                    <div className="space-y-8">
                      {/* Results Card */}
                      <div className="bg-slate-900/80 border border-slate-800 rounded-[28px] md:rounded-[40px] p-8 md:p-14 text-center shadow-2xl relative overflow-hidden group">
                          <div className={`w-14 h-14 md:w-20 md:h-20 rounded-3xl flex items-center justify-center mx-auto mb-6 text-xl md:text-3xl border shadow-inner ${activeLesson.isExamMode ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20'}`}>
                            <i className={`fas ${activeLesson.isExamMode ? 'fa-shield-check' : 'fa-award'}`}></i>
                          </div>
                          <h3 className="text-xl md:text-3xl font-black text-white mb-2 tracking-tighter">
                            {activeLesson.isExamMode ? 'Examination Finalized' : 'Knowledge Authenticated'}
                          </h3>
                          <p className="text-slate-500 text-[9px] md:text-xs font-black uppercase tracking-[0.4em]">
                            Neural Efficiency: <span className="text-white">{quizState.score}</span> / {activeLesson.quiz?.length}
                          </p>
                      </div>

                      {/* Instructor Solution Box (Styled as per User Image) */}
                      {activeLesson.instructorNotes && (
                        <div className="bg-emerald-500/10 border-l-[6px] border-emerald-500/80 rounded-r-3xl p-8 md:p-10 animate-in slide-in-from-left-2 duration-700">
                          <h4 className="text-emerald-500 font-black text-[10px] md:text-xs uppercase tracking-widest mb-4">Solution:</h4>
                          <div className="prose prose-invert max-w-none text-slate-300 text-sm md:text-lg leading-relaxed">
                            {activeLesson.instructorNotes}
                          </div>
                        </div>
                      )}

                      {/* User Notes Area - Repositioned Under Question Results */}
                      <div className="space-y-4 pt-6">
                        <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] flex items-center">
                          <i className="fas fa-pen-nib mr-2 text-indigo-500"></i> Personal Study Hub
                        </h4>
                        <textarea 
                          value={user.notes?.[activeLesson.id] || ''} 
                          onChange={(e) => onNotesUpdate(activeLesson.id, e.target.value)} 
                          placeholder="Consolidate module insights..." 
                          className="w-full h-[180px] bg-slate-950/80 border border-slate-800 rounded-3xl p-6 text-slate-300 font-medium placeholder:text-slate-800 outline-none shadow-inner leading-relaxed text-sm focus:border-indigo-500/30 transition-all" 
                        />
                      </div>

                      {/* Retake Button - At the bottom of the stack */}
                      <button 
                        onClick={() => setQuizState({ complete: false, score: 0, answers: {} })} 
                        className="w-full py-5 bg-slate-900 border border-slate-800 hover:border-indigo-500/50 text-white rounded-2xl md:rounded-[24px] text-[10px] md:text-xs font-black uppercase tracking-[0.2em] transition-all shadow-xl active:scale-95 flex items-center justify-center"
                      >
                        <i className="fas fa-rotate-left mr-3"></i>
                        Re-initiate Assessment
                      </button>
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
                      
                      {/* USER NOTES UNDER QUESTIONS WHILE TAKING QUIZ */}
                      <div className="space-y-4 pt-4">
                        <h4 className="text-[10px] font-black text-slate-600 uppercase tracking-[0.3em] flex items-center">
                          <i className="fas fa-pencil mr-2 text-indigo-400"></i> Identity Study Notes
                        </h4>
                        <textarea 
                          value={user.notes?.[activeLesson.id] || ''} 
                          onChange={(e) => onNotesUpdate(activeLesson.id, e.target.value)} 
                          placeholder="Draft module insights while solving..." 
                          className="w-full h-[150px] bg-slate-950/50 border border-slate-800/50 rounded-2xl p-5 text-slate-400 font-medium placeholder:text-slate-800 outline-none shadow-inner leading-relaxed text-xs focus:border-indigo-500/30 transition-all" 
                        />
                      </div>

                      {activeLesson.quiz && activeLesson.quiz.length > 0 && <button onClick={handleSubmitExam} className={`w-full py-4 md:py-6 text-white rounded-[12px] md:rounded-[32px] font-black uppercase text-[8px] md:text-xs tracking-[0.2em] md:tracking-[0.5em] shadow-2xl transition-all ${activeLesson.isExamMode ? 'bg-rose-600' : 'bg-indigo-600 shadow-indigo-600/20 hover:bg-indigo-500 active:scale-[0.99]'}`}>{activeLesson.isExamMode ? 'Submit Exam' : 'Commit Neural Responses'}</button>}
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