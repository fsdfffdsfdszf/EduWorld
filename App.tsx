
import React, { useState, useEffect, useCallback, useRef } from 'react';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Explore from './components/Explore';
import CourseView from './components/CourseView';
import AdminPanel from './components/AdminPanel';
import Profile from './components/Profile';
import CourseDetails from './components/CourseDetails';
import UserManagement from './components/UserManagement';
import Downloads from './components/Downloads';
import Auth from './components/Auth';
import { AppRoute, Course, User, ThemeConfig, Resource } from './types';
import { MOCK_COURSES } from './constants';
import { getAllCoursesFromDB, saveCourseToDB, deleteCourseFromDB } from './services/storage';
import { supabaseAuth, getSupabaseClient } from './services/supabase';

const THEME_ACCENTS: Record<string, Record<string, string>> = {
  indigo: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  emerald: { 50: '#ecfdf5', 100: '#d1fae5', 200: '#a7f3d0', 300: '#6ee7b7', 400: '#34d399', 500: '#10b981', 600: '#059669', 700: '#047857', 800: '#065f46', 900: '#064e3b', 950: '#022c22' },
  rose: { 50: '#fff1f2', 100: '#ffe4e6', 200: '#fecdd3', 300: '#fda4af', 400: '#fb7185', 500: '#f43f5e', 600: '#e11d48', 700: '#be123c', 800: '#9f1239', 900: '#881337', 950: '#4c0519' },
  amber: { 50: '#fffbeb', 100: '#fef3c7', 200: '#fde68a', 300: '#fcd34d', 400: '#fbbf24', 500: '#f59e0b', 600: '#d97706', 700: '#b45309', 800: '#92400e', 900: '#78350f', 950: '#451a03' },
  violet: { 50: '#f5f3ff', 100: '#ede9fe', 200: '#ddd6fe', 300: '#c4b5fd', 400: '#a78bfa', 500: '#8b5cf6', 600: '#7c3aed', 700: '#6d28d9', 800: '#5b21b6', 900: '#4c1d95', 950: '#2e1065' },
  sky: { 50: '#f0f9ff', 100: '#e0f2fe', 200: '#bae6fd', 300: '#7dd3fc', 400: '#38bdf8', 500: '#0ea5e9', 600: '#0284c7', 700: '#0369a1', 800: '#075985', 900: '#0c4a6e', 950: '#082f49' },
  fuchsia: { 50: '#fdf4ff', 100: '#fae8ff', 200: '#f5d0fe', 300: '#f0abfc', 400: '#e879f9', 500: '#d946ef', 600: '#c026d3', 700: '#a21caf', 800: '#86198f', 900: '#701a75', 950: '#4a044e' },
  winter: { 50: '#f0fbff', 100: '#def5ff', 200: '#b6ebff', 300: '#7ddcff', 400: '#32c5ff', 500: '#00a3ff', 600: '#0084ff', 700: '#0066ff', 800: '#0052cc', 900: '#0044aa', 950: '#002255' },
  eid: { 50: '#f2fdf5', 100: '#e1f9e9', 200: '#c5f2d4', 300: '#94e7af', 400: '#5ed684', 500: '#2fb35a', 600: '#229145', 700: '#1c7338', 800: '#1a5c2e', 900: '#164d27', 950: '#0b2613' }
};

const THEME_BACKGROUNDS: Record<string, { main: string, surface: string }> = {
  slate: { main: '#020617', surface: '#0f172a' },
  zinc: { main: '#09090b', surface: '#18181b' },
  obsidian: { main: '#000000', surface: '#0a0a0a' },
  midnight: { main: '#020617', surface: '#070c1a' },
  arctic: { main: '#050b18', surface: '#0c162d' },
  royal: { main: '#04140b', surface: '#082415' }
};

const ACCENT_OPTIONS: { id: ThemeConfig['accentColor'], color: string, icon?: string }[] = [
  { id: 'indigo', color: 'bg-indigo-600' },
  { id: 'emerald', color: 'bg-emerald-600' },
  { id: 'rose', color: 'bg-rose-600' },
  { id: 'amber', color: 'bg-amber-600' },
  { id: 'violet', color: 'bg-violet-600' },
  { id: 'sky', color: 'bg-sky-600' },
  { id: 'fuchsia', color: 'bg-fuchsia-600' },
  { id: 'winter', color: 'bg-blue-300', icon: 'fa-snowflake' },
  { id: 'eid', color: 'bg-emerald-800', icon: 'fa-moon' }
];

const BG_OPTIONS: { id: ThemeConfig['backgroundStyle'], label: string }[] = [
  { id: 'slate', label: 'Slate' },
  { id: 'zinc', label: 'Zinc' },
  { id: 'midnight', label: 'Midnight' },
  { id: 'obsidian', label: 'Obsidian' },
  { id: 'arctic', label: 'Arctic' },
  { id: 'royal', label: 'Royal' }
];

const SeasonalEffects: React.FC<{ theme: ThemeConfig }> = ({ theme }) => {
  if (theme.accentColor === 'winter') {
    return (
      <div className="seasonal-overlay pointer-events-none fixed inset-0 z-0">
        {[...Array(20)].map((_, i) => (
          <div key={i} className="absolute bg-white rounded-full animate-snowfall"
            style={{
              left: `${Math.random() * 100}%`,
              width: `${Math.random() * 4 + 2}px`,
              height: `${Math.random() * 4 + 2}px`,
              animationDuration: `${Math.random() * 5 + 5}s`,
              animationDelay: `${Math.random() * 5}s`,
              opacity: Math.random() * 0.5 + 0.3
            }}
          />
        ))}
      </div>
    );
  }
  return null;
};

const MobileNav: React.FC<{ currentRoute: AppRoute, setRoute: (r: AppRoute) => void, user: User }> = ({ currentRoute, setRoute, user }) => {
  const items = [
    { id: AppRoute.DASHBOARD, icon: 'fa-house', label: 'Home' },
    { id: AppRoute.COURSES, icon: 'fa-compass', label: 'Explore' },
    ...(user.role === 'admin' ? [{ id: AppRoute.ADMIN, icon: 'fa-shield-halved', label: 'Admin' }] : []),
    { id: AppRoute.PROFILE, icon: 'fa-user', label: 'Profile' }
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 h-16 bg-slate-950/80 backdrop-blur-xl border-t border-slate-800 flex items-center justify-around px-1 z-[90] safe-area-bottom">
      {items.map(item => (
        <button
          key={item.id}
          onClick={() => setRoute(item.id)}
          className={`flex flex-col items-center justify-center w-full h-full transition-all ${currentRoute === item.id ? 'text-indigo-400' : 'text-slate-500'}`}
        >
          <i className={`fas ${item.icon} text-base mb-1`}></i>
          <span className="text-[7px] font-black uppercase tracking-widest">{item.label}</span>
          {currentRoute === item.id && <div className="absolute bottom-1 w-1 h-1 bg-indigo-400 rounded-full shadow-[0_0_8px_#818cf8]"></div>}
        </button>
      ))}
    </div>
  );
};

const App: React.FC = () => {
  const [route, setRoute] = useState<AppRoute>(AppRoute.DASHBOARD);
  const [activeCourseId, setActiveCourseId] = useState<string | null>(null);
  const [initialLessonId, setInitialLessonId] = useState<string | undefined>(undefined);
  const [selectedCourseId, setSelectedCourseId] = useState<string | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [editingCourseId, setEditingCourseId] = useState<string | null>(null);
  const [isEditorActive, setIsEditorActive] = useState(false);
  const [theme, setTheme] = useState<ThemeConfig>({ accentColor: 'indigo', backgroundStyle: 'slate' });
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

  const [selectedSubjectId, setSelectedSubjectId] = useState<string | null>(null);
  const [selectedSubSubjectId, setSelectedSubSubjectId] = useState<string | null>(null);
  const [selectedUnitId, setSelectedUnitId] = useState<string | null>(null);

  const authTimeoutRef = useRef<number | null>(null);

  // Sync Extended User Data
  const syncExtendedUser = useCallback(async (sbUser: any) => {
    if (!sbUser) {
      setUser(null);
      setIsAuthLoading(false);
      return;
    }
    
    const sb = getSupabaseClient();
    let profile: Partial<User> = {};
    
    if (sb) {
      try {
        const { data, error } = await sb.from('users').select('data').eq('id', sbUser.id).maybeSingle();
        if (data && !error) profile = data.data;
      } catch (e) {
        console.warn("User profile sync failed:", e);
      }
    }

    const mergedUser: User = {
      id: sbUser.id,
      name: profile.name || sbUser.user_metadata?.full_name || sbUser.email?.split('@')[0] || "Learner",
      avatar: profile.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${sbUser.id}`,
      role: profile.role || (sbUser.email === 'shajidrahim007@gmail.com' ? 'admin' : 'student'),
      enrolledCourses: profile.enrolledCourses || [],
      quizScores: profile.quizScores || {}
    };

    setUser(mergedUser);
    localStorage.setItem('eduworld_user', JSON.stringify(mergedUser));
    setIsAuthLoading(false);
  }, []);

  useEffect(() => {
    authTimeoutRef.current = window.setTimeout(() => {
      if (isAuthLoading) {
        setIsAuthLoading(false);
      }
    }, 5000);

    const unsub = supabaseAuth.onAuthStateChange((session) => {
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
      syncExtendedUser(session?.user || null);
    });
    
    return () => {
      unsub();
      if (authTimeoutRef.current) clearTimeout(authTimeoutRef.current);
    };
  }, [syncExtendedUser]);

  useEffect(() => {
    const root = document.documentElement;
    const accent = THEME_ACCENTS[theme.accentColor];
    const bg = THEME_BACKGROUNDS[theme.backgroundStyle];
    if (accent && bg) {
      Object.entries(accent).forEach(([key, value]) => root.style.setProperty(`--brand-${key}`, value));
      root.style.setProperty('--bg-main', bg.main);
      root.style.setProperty('--bg-surface', bg.surface);
    }
    localStorage.setItem('eduworld_theme', JSON.stringify(theme));
  }, [theme]);

  useEffect(() => {
    const init = async () => {
      try {
        const savedCourses = await getAllCoursesFromDB();
        let currentCourses = savedCourses || [];
        if (currentCourses.length === 0) {
          for (const c of MOCK_COURSES) await saveCourseToDB(c);
          currentCourses = MOCK_COURSES;
        }
        setCourses(currentCourses);
        
        const savedThemeStr = localStorage.getItem('eduworld_theme');
        if (savedThemeStr) {
           try { setTheme(JSON.parse(savedThemeStr)); } catch(e) {}
        }
      } catch (e) {
        console.error("LMS Init Error:", e);
      } finally {
        setIsLoading(false);
      }
    };
    init();
  }, []);

  const handleLogout = async () => {
    await supabaseAuth.signOut();
    localStorage.removeItem('eduworld_user');
    setUser(null);
    setRoute(AppRoute.DASHBOARD);
  };

  const navigate = (r: AppRoute) => {
    setRoute(r);
    setIsEditorActive(false);
    setEditingCourseId(null);
    window.scrollTo(0, 0);
  };

  const handleCourseClick = (id: string, lessonId?: string) => {
    setActiveCourseId(id);
    setInitialLessonId(lessonId);
    const isEnrolled = user?.enrolledCourses?.includes(id);
    setRoute(isEnrolled ? AppRoute.COURSE_VIEW : AppRoute.COURSE_DETAILS);
  };

  const handleEnroll = async (courseId: string) => {
    if (!user) return;
    const currentEnrolled = user.enrolledCourses || [];
    const updated = { ...user, enrolledCourses: [...new Set([...currentEnrolled, courseId])] };
    setUser(updated);
    
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb.from('users').upsert({ id: user.id, data: updated });
      } catch (e) {
        console.error("Sync to Supabase failed:", e);
      }
    }
    
    localStorage.setItem('eduworld_user', JSON.stringify(updated));
    setSelectedCourseId(courseId);
    setActiveCourseId(courseId);
    setRoute(AppRoute.DASHBOARD);
  };

  const handleUpdateUser = async (u: User) => {
    setUser(u);
    const sb = getSupabaseClient();
    if (sb) {
      try {
        await sb.from('users').upsert({ id: u.id, data: u });
      } catch (e) {
        console.error("User profile update failed:", e);
      }
    }
    localStorage.setItem('eduworld_user', JSON.stringify(u));
  };

  const handleAddLessonResource = async (courseId: string, lessonId: string, resource: Resource) => {
    const updatedCourses = courses.map(c => {
      if (c.id === courseId) {
        const updatedLessons = (c.lessons || []).map(l => {
          if (l.id === lessonId) return { ...l, resources: [...(l.resources || []), resource] };
          return l;
        });
        const updatedCourse = { ...c, lessons: updatedLessons };
        saveCourseToDB(updatedCourse);
        return updatedCourse;
      }
      return c;
    });
    setCourses(updatedCourses);
  };

  const handleAddCourse = async (course: Course) => {
    setCourses(prev => [...prev, course]);
    await saveCourseToDB(course);
  };

  const handleUpdateCourse = async (updatedCourse: Course) => {
    const updatedCourses = courses.map(c => c.id === updatedCourse.id ? updatedCourse : c);
    setCourses(updatedCourses);
    await saveCourseToDB(updatedCourse);
  };

  const handleStartEditing = (courseId: string | null) => {
    setEditingCourseId(courseId);
    setIsEditorActive(true);
    window.scrollTo(0, 0);
  };

  const handleCloseEditor = () => {
    setIsEditorActive(false);
    setEditingCourseId(null);
  };

  const activeCourse = courses.find(c => c.id === activeCourseId);
  const enrolledCourses = user ? courses.filter(c => user.enrolledCourses?.includes(c.id)) : [];
  const exploreCourses = user ? courses.filter(c => !user.enrolledCourses?.includes(c.id)) : courses;

  if (isAuthLoading) {
    return (
      <div className="h-screen w-full bg-slate-950 flex flex-col items-center justify-center space-y-6">
        <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <div className="text-center">
          <p className="text-indigo-400 font-black uppercase tracking-[0.3em] text-xs">Authenticating Neural Link...</p>
          <p className="text-slate-600 font-bold uppercase tracking-widest text-[8px] mt-2">Checking Database Connection</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Auth onLogin={() => {}} />;
  }

  return (
    <div className={`flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative transition-all duration-500`}>
      {isLoading ? (
        <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-indigo-400 font-black uppercase tracking-widest animate-pulse text-xs">Syncing Neural Core...</div>
      ) : (
        <>
          <SeasonalEffects theme={theme} />
          {route !== AppRoute.COURSE_VIEW && (
            <div className="hidden md:block h-full border-r border-slate-800 z-10">
              <Sidebar currentRoute={route} user={user} setRoute={navigate} onLogout={handleLogout} />
            </div>
          )}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden z-10 relative">
            <main className="flex-1 overflow-y-auto relative scroll-smooth bg-transparent">
              <div className={route !== AppRoute.COURSE_VIEW ? "px-4 py-6 md:p-12 pb-32 md:pb-12 max-w-[1600px] mx-auto" : "h-full"}>
                {route === AppRoute.DASHBOARD && (
                  <Dashboard user={user} onCourseClick={handleCourseClick} setRoute={navigate} courses={enrolledCourses} selectedCourseId={selectedCourseId} onSelectCourse={setSelectedCourseId} selectedSubjectId={selectedSubjectId} setSelectedSubjectId={setSelectedSubjectId} selectedSubSubjectId={selectedSubSubjectId} setSelectedSubSubjectId={setSelectedSubSubjectId} selectedUnitId={selectedUnitId} setSelectedUnitId={setSelectedUnitId} />
                )}
                {route === AppRoute.COURSES && <Explore onCourseClick={handleCourseClick} courses={exploreCourses} />}
                {route === AppRoute.PROFILE && <Profile user={user} courses={enrolledCourses} onCourseClick={handleCourseClick} onUpdateUser={handleUpdateUser} onLogout={handleLogout} setRoute={navigate} />}
                {route === AppRoute.DOWNLOADS && <Downloads onBack={() => setRoute(AppRoute.PROFILE)} />}
                {route === AppRoute.ADMIN && user.role === 'admin' && (
                  <div className="space-y-12">
                     <div className="flex justify-end mb-4">
                        <button onClick={() => setRoute(AppRoute.USERS)} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-white transition-all">
                            <i className="fas fa-users-gear mr-2"></i> User & System Hub
                        </button>
                     </div>
                    {!isEditorActive ? (
                      <AdminPanel courses={courses} onAddCourse={handleAddCourse} onUpdateCourse={handleUpdateCourse} onDeleteCourse={async (id) => { setCourses(prev => prev.filter(item => item.id !== id)); await deleteCourseFromDB(id); }} onPreview={() => {}} onStartEditing={handleStartEditing} />
                    ) : (
                      <AdminPanel courses={courses} initialEditCourseId={editingCourseId} onAddCourse={async (c) => { await handleAddCourse(c); handleCloseEditor(); }} onUpdateCourse={async (c) => { await handleUpdateCourse(c); handleCloseEditor(); }} onDeleteCourse={async (id) => { setCourses(prev => prev.filter(item => item.id !== id)); await deleteCourseFromDB(id); }} onPreview={() => {}} onCancelEdit={handleCloseEditor} />
                    )}
                  </div>
                )}
                {route === AppRoute.USERS && user.role === 'admin' && (
                  <div className="space-y-12">
                    <UserManagement registeredUsers={registeredUsers} courses={courses} onToggleEnrollment={() => {}} onUpdateCourse={handleUpdateCourse} onAddCourse={handleAddCourse} theme={theme} setTheme={setTheme} accentOptions={ACCENT_OPTIONS} bgOptions={BG_OPTIONS} />
                  </div>
                )}
                {route === AppRoute.COURSE_DETAILS && activeCourse && (
                  <CourseDetails course={activeCourse} isAdmin={user.role === 'admin'} isEnrolled={user.enrolledCourses?.includes(activeCourse.id) || false} onEnroll={handleEnroll} onAdminEdit={() => handleStartEditing(activeCourse.id)} onBack={() => setRoute(AppRoute.COURSES)} />
                )}
                {route === AppRoute.COURSE_VIEW && activeCourse && (
                  <CourseView course={activeCourse} user={user} onBack={() => setRoute(AppRoute.DASHBOARD)} initialLessonId={initialLessonId} onQuizComplete={(lid, att) => { const updated = { ...user, quizScores: { ...user.quizScores, [lid]: att } }; handleUpdateUser(updated); }} onNotesUpdate={(lid, content) => { const updated = { ...user, notes: { ...(user.notes || {}), [lid]: content } }; handleUpdateUser(updated); }} onAddResource={(rid, res) => handleAddLessonResource(activeCourse.id, rid, res)} />
                )}
              </div>
            </main>
            {route !== AppRoute.COURSE_VIEW && <MobileNav currentRoute={route} setRoute={navigate} user={user} />}
          </div>
        </>
      )}
    </div>
  );
};

export default App;
