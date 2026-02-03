
import React, { useState, useMemo } from 'react';
import { AppRoute, Course, SubjectGroup, SubSubject, Unit, Lesson, User, QuizAttempt } from '../types';

interface DashboardProps {
  user: User;
  onCourseClick: (id: string, lessonId?: string) => void;
  setRoute: (route: AppRoute) => void;
  courses: Course[];
  selectedCourseId: string | null;
  onSelectCourse: (id: string) => void;
  selectedSubjectId: string | null;
  setSelectedSubjectId: (id: string | null) => void;
  selectedSubSubjectId: string | null;
  setSelectedSubSubjectId: (id: string | null) => void;
  selectedUnitId: string | null;
  setSelectedUnitId: (id: string | null) => void;
}

const Dashboard: React.FC<DashboardProps> = ({ 
  user,
  onCourseClick, 
  setRoute, 
  courses, 
  selectedCourseId, 
  onSelectCourse,
  selectedSubjectId,
  setSelectedSubjectId,
  selectedSubSubjectId,
  setSelectedSubSubjectId,
  selectedUnitId,
  setSelectedUnitId
}) => {
  const [showCoursePicker, setShowCoursePicker] = useState(false);
  const [lessonSearch, setLessonSearch] = useState('');
  
  const activeCourse = useMemo(() => 
    courses.find(c => c.id === (selectedCourseId || courses[0]?.id)) || null
  , [courses, selectedCourseId]);

  const selectedSubject = useMemo(() => activeCourse?.subjects?.find(s => s.id === selectedSubjectId) || null, [activeCourse, selectedSubjectId]);
  const selectedSubSubject = useMemo(() => selectedSubject?.subSubjects?.find(ss => ss.id === selectedSubSubjectId) || null, [selectedSubject, selectedSubSubjectId]);
  const selectedUnit = useMemo(() => selectedSubSubject?.units?.find(u => u.id === selectedUnitId) || null, [selectedSubSubject, selectedUnitId]);

  const timeRemaining = useMemo(() => {
    if (!activeCourse?.expiryDate) return null;
    const now = new Date();
    const expiry = new Date(activeCourse.expiryDate);
    const diff = expiry.getTime() - now.getTime();
    const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
    
    if (days < 0) return "Access Expired";
    if (days === 0) return "Expires Today";
    if (days === 1) return "1 day remaining";
    return `${days} days remaining`;
  }, [activeCourse]);

  if (!activeCourse) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center p-6 bg-transparent animate-in fade-in">
        <div className="w-20 h-20 bg-slate-900 text-indigo-400 rounded-[32px] flex items-center justify-center mb-8 border border-slate-800 shadow-2xl">
          <i className="fas fa-satellite-dish text-2xl animate-pulse"></i>
        </div>
        <h2 className="text-xl md:text-3xl font-black text-slate-100 mb-4 px-4 tracking-tighter">Initialize your learning portal.</h2>
        <p className="text-slate-500 mb-8 max-w-md text-[11px] md:text-sm font-medium uppercase tracking-widest px-4">Enroll in expert programs to start your neural journey.</p>
        <button onClick={() => setRoute(AppRoute.COURSES)} className="w-full sm:w-auto px-10 py-5 bg-indigo-600 text-white rounded-[20px] font-black uppercase text-xs tracking-widest shadow-2xl shadow-indigo-600/30 active:scale-95 transition-all">Launch Catalog</button>
      </div>
    );
  }

  const handleSubjectClick = (subj: SubjectGroup) => {
    setSelectedSubjectId(subj.id);
    setSelectedSubSubjectId(null);
    setSelectedUnitId(null);
  };

  const handleSubSubjectClick = (ss: SubSubject) => {
    setSelectedSubSubjectId(ss.id);
    setSelectedUnitId(null);
  };

  const handleUnitClick = (unit: Unit) => {
    setSelectedUnitId(unit.id);
  };

  const handleBack = () => {
    if (selectedUnit) setSelectedUnitId(null);
    else if (selectedSubSubject) setSelectedSubSubjectId(null);
    else if (selectedSubject) setSelectedSubjectId(null);
  };

  const filteredLessons = useMemo(() => {
    let list = [];
    if (selectedUnit) {
      list = activeCourse.lessons.filter(l => 
        l.subjectId === selectedSubjectId && 
        l.subSubjectId === selectedSubSubjectId &&
        l.unitId === selectedUnitId
      );
    } else if (!selectedSubject) {
      list = activeCourse.lessons.filter(l => !l.subjectId);
    }
    
    if (lessonSearch.trim()) {
      list = list.filter(l => l.title.toLowerCase().includes(lessonSearch.toLowerCase()));
    }
    return list;
  }, [activeCourse.lessons, selectedSubjectId, selectedSubSubjectId, selectedUnitId, selectedUnit, selectedSubject, lessonSearch]);

  const mainTitle = useMemo(() => {
    if (selectedUnit) return selectedUnit.name;
    if (selectedSubSubject) return selectedSubSubject.name;
    if (selectedSubject) return selectedSubject.name;
    return activeCourse.title;
  }, [selectedSubject, selectedSubSubject, selectedUnit, activeCourse.title]);

  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return "Good morning";
    if (hour < 18) return "Good afternoon";
    return "Good evening";
  }, []);

  return (
    <div className="space-y-6 md:space-y-12 animate-in fade-in duration-500 max-w-6xl mx-auto">
      {/* Top Bar */}
      {!selectedSubjectId && (
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 px-1 md:px-0">
          <div>
            <h2 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em] mb-1">{greeting}, {user.name.split(' ')[0]}</h2>
            <h1 className="text-2xl md:text-3xl font-black text-white tracking-tighter">Ready to accelerate?</h1>
          </div>

          <div className="relative w-full md:w-auto">
            <button 
              onClick={() => setShowCoursePicker(!showCoursePicker)}
              className="w-full md:w-auto flex items-center justify-between space-x-4 px-5 py-3.5 bg-slate-900 border border-slate-800 rounded-2xl hover:border-indigo-500 transition-all group shadow-xl"
            >
              <div className="flex items-center space-x-3 overflow-hidden">
                <img src={activeCourse.thumbnail} className="w-6 h-6 rounded-md object-cover border border-slate-800 shrink-0" alt="" />
                <span className="text-[10px] font-black text-slate-300 uppercase tracking-widest truncate max-w-[160px] md:max-w-[200px]">{activeCourse.title}</span>
              </div>
              <i className={`fas fa-chevron-down text-[9px] text-slate-600 transition-transform ${showCoursePicker ? 'rotate-180' : ''}`}></i>
            </button>
            {showCoursePicker && (
              <div className="absolute top-full right-0 mt-3 w-full md:w-80 bg-slate-900/95 backdrop-blur-xl border border-slate-800 rounded-[28px] shadow-[0_20px_50px_rgba(0,0,0,0.8)] z-[100] p-2 animate-in zoom-in-95 duration-200">
                <p className="px-4 py-2 text-[8px] font-black text-slate-600 uppercase tracking-[0.3em]">Program Registry</p>
                <div className="space-y-1 max-h-[300px] overflow-y-auto no-scrollbar">
                  {courses.map(c => (
                    <button 
                      key={c.id}
                      onClick={() => {
                        onSelectCourse(c.id);
                        setShowCoursePicker(false);
                        setSelectedSubjectId(null);
                        setSelectedSubSubjectId(null);
                        setSelectedUnitId(null);
                      }}
                      className={`w-full text-left p-4 rounded-2xl transition-all flex items-center space-x-4 group border ${activeCourse.id === c.id ? 'bg-indigo-600/10 border-indigo-500/20' : 'hover:bg-slate-800 border-transparent'}`}
                    >
                      <img src={c.thumbnail} className="w-10 h-10 rounded-xl object-cover border border-slate-800 group-hover:scale-105 transition-transform" alt="" />
                      <div className="min-w-0 flex-1">
                        <p className={`text-xs font-black truncate ${activeCourse.id === c.id ? 'text-white' : 'text-slate-400'}`}>{c.title}</p>
                        <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-1">
                          {c.isComingSoon ? 'SYNC PENDING' : `${c.lessons.length} Modules`}
                        </p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Hero Header Card */}
      <div className="px-0">
        <div className={`bg-slate-900/40 rounded-[32px] md:rounded-[40px] border p-8 md:p-14 relative overflow-hidden group shadow-2xl backdrop-blur-sm ${activeCourse.isComingSoon ? 'border-amber-500/20' : 'border-slate-800/60'}`}>
          {(selectedSubject || selectedSubSubject || selectedUnit) && (
            <button 
              onClick={handleBack}
              className="absolute left-4 md:left-10 top-6 md:top-1/2 md:-translate-y-1/2 w-9 h-9 md:w-14 md:h-14 bg-slate-950/80 backdrop-blur-md border border-slate-800 rounded-xl md:rounded-2xl flex items-center justify-center text-slate-500 hover:text-white hover:border-indigo-500/50 transition-all z-20 shadow-2xl"
            >
              <i className="fas fa-chevron-left text-[10px] md:text-xs"></i>
            </button>
          )}

          <div className="relative z-10 space-y-4 md:space-y-6 text-center">
            {/* Breadcrumbs */}
            <div className="flex items-center justify-center space-x-2 text-[8px] md:text-[9px] font-black text-slate-500 uppercase tracking-[0.2em] px-10">
              {selectedSubject && (
                <>
                  <span className="hover:text-indigo-400 cursor-pointer transition-colors truncate max-w-[80px] md:max-w-none" onClick={() => {setSelectedSubSubjectId(null); setSelectedUnitId(null);}}>{selectedSubject.name}</span>
                  {selectedSubSubject && (
                    <>
                      <i className="fas fa-chevron-right text-[7px] opacity-30 shrink-0"></i>
                      <span className="hover:text-indigo-400 cursor-pointer transition-colors truncate max-w-[80px] md:max-w-none" onClick={() => setSelectedUnitId(null)}>{selectedSubSubject.name}</span>
                    </>
                  )}
                </>
              )}
            </div>

            <h1 className="text-xl md:text-5xl font-black text-white tracking-tighter leading-tight md:leading-none px-2">
              {mainTitle}
            </h1>
            
            <div className="flex justify-center">
              {activeCourse.isComingSoon ? (
                 <div className="inline-flex items-center px-4 py-1.5 bg-amber-500/10 rounded-full border border-amber-500/20">
                    <span className="w-1.5 h-1.5 rounded-full mr-2.5 animate-pulse bg-amber-400"></span>
                    <span className="text-[9px] md:text-[10px] font-black text-amber-500 uppercase tracking-widest">Neural Link Synchronizing</span>
                 </div>
              ) : timeRemaining && !selectedSubject && (
                <div className="inline-flex items-center px-4 py-1.5 bg-indigo-600/10 rounded-full border border-indigo-500/20">
                   <span className={`w-1.5 h-1.5 rounded-full mr-2.5 animate-pulse ${timeRemaining.includes('Access Expired') ? 'bg-rose-500' : 'bg-emerald-400'}`}></span>
                   <span className="text-[9px] md:text-[10px] font-black text-indigo-400 uppercase tracking-widest">{timeRemaining}</span>
                </div>
              )}
            </div>
          </div>

          <div className={`absolute -bottom-24 -left-24 w-64 md:w-96 h-64 md:h-96 rounded-full blur-[80px] md:blur-[120px] pointer-events-none group-hover:opacity-60 transition-all duration-1000 ${activeCourse.isComingSoon ? 'bg-amber-600/10' : 'bg-indigo-600/10'}`}></div>
        </div>
      </div>

      {/* Content Navigator */}
      <div className="px-0 pb-10">
        <div className="bg-slate-900/30 rounded-[32px] md:rounded-[40px] border border-slate-800/40 p-5 md:p-10 shadow-2xl backdrop-blur-sm min-h-[400px]">
          {activeCourse.isComingSoon ? (
            <div className="flex flex-col items-center justify-center py-16 text-center animate-in fade-in duration-700">
               <div className="w-20 h-20 bg-slate-900 rounded-[28px] border border-amber-500/20 flex items-center justify-center mb-6 shadow-2xl">
                  <i className="fas fa-microchip text-2xl text-amber-500 animate-pulse"></i>
               </div>
               <h3 className="text-xl md:text-3xl font-black text-white mb-4 tracking-tight">Synchronizing...</h3>
               <div className="w-full max-w-xs bg-slate-950 h-1.5 rounded-full overflow-hidden border border-slate-800 mb-4">
                  <div className="h-full bg-amber-500 shadow-[0_0_10px_rgba(245,158,11,0.5)] animate-pulse" style={{ width: `${activeCourse.syncProgress || 10}%` }}></div>
               </div>
               <p className="text-[8px] font-black text-slate-700 uppercase tracking-[0.4em]">Node Health: {activeCourse.syncProgress || 10}%</p>
            </div>
          ) : (
            <>
              {/* Subject Cards */}
              {!selectedSubject && (
                <div className="space-y-10">
                  <div className="flex items-center">
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em] flex items-center">
                      <i className="fas fa-sitemap mr-3 text-indigo-500"></i> Curriculum Paths
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
                    {(activeCourse.subjects || []).map((subj) => (
                      <button 
                        key={subj.id} 
                        onClick={() => handleSubjectClick(subj)}
                        className="flex flex-col p-7 md:p-8 bg-slate-950/60 border border-slate-800 rounded-[28px] md:rounded-[32px] hover:border-indigo-500/40 hover:bg-slate-900 transition-all group shadow-xl active:scale-[0.97] text-left h-full"
                      >
                        <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center text-xl shadow-inner border border-white/5 ${subj.color} mb-6`}>
                          <i className={`fas ${subj.icon || 'fa-book-open'}`}></i>
                        </div>
                        <div className="space-y-1.5 flex-1">
                          <h4 className="text-lg md:text-xl font-black text-slate-100 group-hover:text-white transition-colors tracking-tight leading-tight">{subj.name}</h4>
                          <p className="text-[8px] font-black text-slate-600 uppercase tracking-[0.2em]">{subj.subSubjects.length} Specializations</p>
                        </div>
                        <div className="mt-8 pt-5 border-t border-slate-800/50 flex items-center justify-between text-[9px] font-black uppercase tracking-widest text-slate-500 group-hover:text-indigo-400">
                          <span>Enter Node</span>
                          <i className="fas fa-arrow-right-long group-hover:translate-x-1.5 transition-transform"></i>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* SubSubject Level */}
              {selectedSubject && !selectedSubSubject && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                   <div className="flex items-center space-x-3 mb-4">
                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center border ${selectedSubject.color}`}><i className={`fas ${selectedSubject.icon} text-xs`}></i></div>
                    <h3 className="text-[10px] font-black text-white uppercase tracking-[0.3em]">{selectedSubject.name}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedSubject.subSubjects.map((ss) => (
                      <button 
                        key={ss.id} 
                        onClick={() => handleSubSubjectClick(ss)}
                        className="flex flex-col p-6 bg-slate-950/80 border border-slate-800/60 rounded-[24px] md:rounded-[32px] hover:border-indigo-500/40 hover:bg-slate-900 transition-all group shadow-xl active:scale-[0.97] text-left"
                      >
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base bg-slate-900 text-indigo-400 border border-slate-800 mb-5 shadow-inner`}><i className="fas fa-folder-tree"></i></div>
                        <span className="text-base font-black text-slate-100 group-hover:text-indigo-400 transition-colors leading-tight">{ss.name}</span>
                        <p className="text-[7px] font-black text-slate-600 uppercase tracking-widest mt-2">{ss.units.length} Modules</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Unit Level */}
              {selectedSubSubject && !selectedUnit && (
                <div className="space-y-8 animate-in slide-in-from-right-4 duration-500">
                  <div className="flex items-center mb-4">
                    <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-[0.3em]">{selectedSubSubject.name}</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {selectedSubSubject.units?.map((unit) => {
                      const hasExam = activeCourse.lessons.some(l => l.unitId === unit.id && l.isExamMode);
                      return (
                        <button 
                          key={unit.id} 
                          onClick={() => handleUnitClick(unit)}
                          className={`flex flex-col p-6 bg-slate-950/80 border rounded-[24px] transition-all group shadow-xl active:scale-[0.97] text-left h-full ${hasExam ? 'border-rose-500/30 hover:border-rose-500/50' : 'border-slate-800/60 hover:border-emerald-500/40'}`}
                        >
                          <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-base bg-slate-900 border border-slate-800 mb-5 shadow-inner ${hasExam ? 'text-rose-400' : 'text-emerald-400'}`}>
                            <i className={`fas ${hasExam ? 'fa-file-signature' : 'fa-box-open'}`}></i>
                          </div>
                          <span className="text-base font-black text-slate-100 group-hover:text-white transition-colors leading-tight mb-2">{unit.name}</span>
                          <div className="flex items-center justify-between mt-auto pt-4 border-t border-white/5">
                            <span className="text-[7px] font-black text-slate-600 uppercase tracking-widest">Access Node</span>
                            {hasExam && <span className="text-[6px] font-black text-rose-500 uppercase tracking-widest bg-rose-500/5 px-1.5 py-0.5 rounded border border-rose-500/10">EXAM ACTIVE</span>}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Lesson List */}
              {selectedUnit && (
                <div className="space-y-6 animate-in slide-in-from-right-4 duration-500">
                  <div className="flex flex-col gap-4 border-b border-slate-800 pb-6 mb-4">
                    <h3 className="text-lg font-black text-white tracking-tight leading-none">{selectedUnit.name} Modules</h3>
                    <div className="flex items-center bg-slate-950 px-4 py-3 rounded-xl border border-slate-800 w-full shadow-inner">
                       <i className="fas fa-magnifying-glass text-slate-700 mr-3 text-[10px]"></i>
                       <input type="text" value={lessonSearch} onChange={(e) => setLessonSearch(e.target.value)} placeholder="Filter unit content..." className="w-full bg-transparent border-none focus:ring-0 text-[11px] text-slate-300 font-bold placeholder:text-slate-800" />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 md:gap-5">
                    {filteredLessons.map((lesson) => (
                      <button 
                        key={lesson.id} 
                        onClick={() => onCourseClick(activeCourse.id, lesson.id)}
                        className="flex items-center p-4 md:p-6 bg-slate-950/80 border border-slate-800/60 rounded-[20px] md:rounded-[32px] hover:border-indigo-500/40 hover:bg-slate-900 transition-all group active:scale-[0.98] shadow-md text-left"
                      >
                        <div className={`w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl flex items-center justify-center text-xs border mr-4 md:mr-6 transition-all shrink-0 ${lesson.isExamMode ? 'bg-rose-500/10 text-rose-500 border-rose-500/30' : 'bg-slate-900 text-slate-500 border-slate-800 group-hover:text-indigo-400 shadow-inner'}`}>
                          <i className={`fas ${lesson.isExamMode ? 'fa-file-signature' : 'fa-book-open'}`}></i>
                        </div>
                        <div className="flex-1 min-w-0">
                          <h4 className="font-bold text-slate-100 group-hover:text-white transition-colors text-sm md:text-base leading-tight truncate">{lesson.title}</h4>
                          {lesson.hasAiFeature && !lesson.isExamMode && (
                            <div className="inline-flex items-center space-x-1 mt-1 px-1.5 py-0.5 bg-indigo-500/10 text-indigo-400 rounded border border-indigo-500/20">
                              <i className="fas fa-sparkles text-[6px]"></i>
                              <span className="text-[6px] font-black uppercase tracking-widest">AI ENABLED</span>
                            </div>
                          )}
                        </div>
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center border transition-all shrink-0 ml-2 ${lesson.isExamMode ? 'bg-rose-600 text-white border-rose-500' : 'bg-indigo-600/10 text-indigo-400 border-indigo-500/20 group-hover:bg-indigo-600 group-hover:text-white'}`}>
                          <i className={`fas ${lesson.videoUrl ? 'fa-play' : 'fa-book-open'} text-[8px]`}></i>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
