
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation, Navigate, useParams } from 'react-router-dom';
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
import MobileNav from './components/MobileNav';
import CoursePageRoute from './components/CoursePageRoute';
import ViewPageRoute from './components/ViewPageRoute';
import { THEME_ACCENTS, THEME_BACKGROUNDS, ACCENT_OPTIONS, BG_OPTIONS, SeasonalEffects } from './components/ThemeConfig';
import { AppRoute, Course, User, ThemeConfig, Resource } from './types';
import { MOCK_COURSES } from './constants';
import { getAllCoursesFromDB, saveCourseToDB, deleteCourseFromDB } from './services/storage';
import { supabaseAuth, getSupabaseClient } from './services/supabase';

const AdminEditWrapper: React.FC<{ courses: Course[], onAddCourse: any, onUpdateCourse: any, onDeleteCourse: any, navigate: any }> = ({ courses, onAddCourse, onUpdateCourse, onDeleteCourse, navigate }) => {
  const { editId } = useParams();
  return <AdminPanel courses={courses} initialEditCourseId={editId} onAddCourse={async (c: any) => { await onAddCourse(c); navigate('/admin'); }} onUpdateCourse={async (c: any) => { await onUpdateCourse(c); navigate('/admin'); }} onDeleteCourse={async (id: any) => { await onDeleteCourse(id); }} onPreview={() => {}} onCancelEdit={() => navigate('/admin')} />;
};

const App: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [courses, setCourses] = useState<Course[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthLoading, setIsAuthLoading] = useState(true);
  const [theme, setTheme] = useState<ThemeConfig>({ accentColor: 'indigo', backgroundStyle: 'slate' });
  const [registeredUsers, setRegisteredUsers] = useState<User[]>([]);

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
    navigate('/');
  };

  const handleCourseClick = (id: string, lessonId?: string) => {
    const isEnrolled = user?.enrolledCourses?.includes(id);
    if (isEnrolled) {
      navigate(lessonId ? `/view/${id}/${lessonId}` : `/view/${id}`);
    } else {
      navigate(`/course/${id}`);
    }
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
    navigate(`/view/${courseId}`);
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

  const isCourseView = location.pathname.startsWith('/view/');

  return (
    <div className={`flex h-screen bg-slate-950 text-slate-100 overflow-hidden relative transition-all duration-500`}>
      {isLoading ? (
        <div className="h-screen w-full bg-slate-950 flex items-center justify-center text-indigo-400 font-black uppercase tracking-widest animate-pulse text-xs">Syncing Neural Core...</div>
      ) : (
        <>
          <SeasonalEffects theme={theme} />
          {!isCourseView && (
            <div className="hidden md:block h-full border-r border-slate-800 z-10">
              <Sidebar currentPath={location.pathname} user={user} setRoute={(r) => navigate(`/${r}`)} onLogout={handleLogout} />
            </div>
          )}
          <div className="flex-1 flex flex-col min-w-0 overflow-hidden z-10 relative">
            <main className="flex-1 overflow-y-auto relative scroll-smooth bg-transparent">
              <div className={!isCourseView ? "px-4 py-6 md:p-12 pb-32 md:pb-12 max-w-[1600px] mx-auto" : "h-full"}>
                <Routes>
                  <Route path="/" element={<Navigate to="/dashboard" replace />} />
                  <Route path="/dashboard" element={<Dashboard user={user} onCourseClick={handleCourseClick} courses={enrolledCourses} />} />
                  <Route path="/dashboard/:courseId" element={<Dashboard user={user} onCourseClick={handleCourseClick} courses={enrolledCourses} />} />
                  <Route path="/dashboard/:courseId/subject/:subjectId" element={<Dashboard user={user} onCourseClick={handleCourseClick} courses={enrolledCourses} />} />
                  <Route path="/dashboard/:courseId/subject/:subjectId/sub/:subId" element={<Dashboard user={user} onCourseClick={handleCourseClick} courses={enrolledCourses} />} />
                  <Route path="/dashboard/:courseId/subject/:subjectId/sub/:subId/unit/:unitId" element={<Dashboard user={user} onCourseClick={handleCourseClick} courses={enrolledCourses} />} />
                  
                  <Route path="/explore" element={<Explore onCourseClick={handleCourseClick} courses={exploreCourses} />} />
                  <Route path="/explore/category/:category" element={<Explore onCourseClick={handleCourseClick} courses={exploreCourses} />} />
                  <Route path="/profile" element={<Profile user={user} courses={enrolledCourses} onCourseClick={handleCourseClick} onUpdateUser={handleUpdateUser} onLogout={handleLogout} setRoute={(r) => navigate(`/${r}`)} />} />
                  <Route path="/profile/:tab" element={<Profile user={user} courses={enrolledCourses} onCourseClick={handleCourseClick} onUpdateUser={handleUpdateUser} onLogout={handleLogout} setRoute={(r) => navigate(`/${r}`)} />} />
                  <Route path="/downloads" element={<Downloads onBack={() => navigate('/profile')} />} />
                  <Route path="/admin" element={user.role === 'admin' ? (
                    <div className="space-y-12">
                       <div className="flex justify-end mb-4">
                          <button onClick={() => navigate('/users')} className="px-4 py-2 bg-slate-900 border border-slate-800 rounded-xl text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-white transition-all">
                              <i className="fas fa-users-gear mr-2"></i> User & System Hub
                          </button>
                       </div>
                       <AdminPanel courses={courses} onAddCourse={handleAddCourse} onUpdateCourse={handleUpdateCourse} onDeleteCourse={async (id) => { setCourses(prev => prev.filter(item => item.id !== id)); await deleteCourseFromDB(id); }} onPreview={() => {}} />
                    </div>
                  ) : <Navigate to="/" />} />
                  <Route path="/admin/assets" element={user.role === 'admin' ? (
                    <div className="space-y-12 text-white">
                       <p className="font-black text-rose-500">Asset Management redirected to Admin Portal</p>
                       <AdminPanel courses={courses} onAddCourse={handleAddCourse} onUpdateCourse={handleUpdateCourse} onDeleteCourse={async (id) => { setCourses(prev => prev.filter(item => item.id !== id)); await deleteCourseFromDB(id); }} onPreview={() => {}} initialView="assets" />
                    </div>
                  ) : <Navigate to="/" />} />
                  <Route path="/admin/edit/:editId" element={user.role === 'admin' ? (
                    <AdminEditWrapper courses={courses} onAddCourse={handleAddCourse} onUpdateCourse={handleUpdateCourse} onDeleteCourse={async (id: any) => { setCourses(prev => prev.filter(item => item.id !== id)); await deleteCourseFromDB(id); }} navigate={navigate} />
                  ) : <Navigate to="/" />} />
                  <Route path="/admin/new" element={user.role === 'admin' ? (
                    <AdminPanel courses={courses} initialEditCourseId="new" onAddCourse={async (c) => { await handleAddCourse(c); navigate('/admin'); }} onUpdateCourse={async (c) => { await handleUpdateCourse(c); navigate('/admin'); }} onDeleteCourse={async (id) => { setCourses(prev => prev.filter(item => item.id !== id)); await deleteCourseFromDB(id); }} onPreview={() => {}} onCancelEdit={() => navigate('/admin')} />
                  ) : <Navigate to="/" />} />
                  <Route path="/users" element={user.role === 'admin' ? (
                    <div className="space-y-12">
                      <UserManagement registeredUsers={registeredUsers} courses={courses} onToggleEnrollment={() => {}} onUpdateCourse={handleUpdateCourse} onAddCourse={handleAddCourse} theme={theme} setTheme={setTheme} accentOptions={ACCENT_OPTIONS} bgOptions={BG_OPTIONS} />
                    </div>
                  ) : <Navigate to="/" />} />
                  <Route path="/course/:id" element={<CoursePageRoute courses={courses} user={user} handleEnroll={handleEnroll} handleStartEditing={(id) => navigate(`/admin/edit/${id}`)} />} />
                  <Route path="/view/:id" element={<ViewPageRoute courses={courses} user={user} handleUpdateUser={handleUpdateUser} handleAddLessonResource={handleAddLessonResource} />} />
                  <Route path="/view/:id/:lessonId" element={<ViewPageRoute courses={courses} user={user} handleUpdateUser={handleUpdateUser} handleAddLessonResource={handleAddLessonResource} />} />
                  <Route path="*" element={<Navigate to="/dashboard" />} />
                </Routes>
              </div>
            </main>
            {!isCourseView && <MobileNav currentPath={location.pathname} setRoute={(r) => navigate(`/${r}`)} user={user} />}
          </div>
        </>
      )}
    </div>
  );
};

export default App;

