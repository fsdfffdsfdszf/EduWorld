
export interface QuizAttempt {
  score: number;
  total: number;
  date: Date;
}

export interface ChatMessage {
  role: 'user' | 'model';
  text: string;
  timestamp: Date;
  image?: string;
  groundingUrls?: { title: string; uri: string }[];
}

export interface User {
  id: string;
  name: string;
  avatar: string;
  role: 'student' | 'instructor' | 'admin';
  enrolledCourses: string[];
  quizScores: Record<string, QuizAttempt>; // Key is lessonId
  notes?: Record<string, string>; // Key is lessonId, value is HTML content
}

export interface ThemeConfig {
  accentColor: 'indigo' | 'emerald' | 'rose' | 'amber' | 'violet' | 'sky' | 'fuchsia' | 'winter' | 'eid';
  backgroundStyle: 'slate' | 'zinc' | 'obsidian' | 'midnight' | 'arctic' | 'royal';
}

export interface Resource {
  id: string;
  title: string;
  url: string;
  type: 'link' | 'video' | 'zip';
  description?: string;
  tags?: string[];
}

export interface QuizQuestion {
  id: string;
  question: string;
  options: string[];
  correctAnswer: number; // Index of the correct option
}

export interface Lesson {
  id: string;
  title: string;
  content: string;
  videoUrl?: string | Blob; 
  duration: string;
  completed?: boolean;
  resources?: Resource[];
  instructorNotes?: string;
  quiz?: QuizQuestion[];
  subjectId?: string; 
  subSubjectId?: string; 
  unitId?: string; 
  hasAiFeature?: boolean; 
  isExamMode?: boolean; 
  examDuration?: number; 
}

export interface Unit {
  id: string;
  name: string;
}

export interface SubSubject {
  id: string;
  name: string;
  units: Unit[]; 
}

export interface SubjectGroup {
  id: string;
  name: string;
  icon: string;
  color: string;
  subSubjects: SubSubject[]; 
}

export interface SupplementalItem {
  id: string;
  title: string;
  thumbnail: string;
  action: string; 
}

export interface RoadmapItem {
  id: string;
  icon: string;
  text: string;
}

export interface HostedAsset {
  id: string;
  title: string;
  fileName: string;
  data: Blob | string;
  mimeType: string;
  url: string;
  createdAt: Date;
}

export interface AppVersion {
  id: string;
  title: string;
  version: string;
  url: string;
  releaseDate: Date;
  notes?: string;
}

export interface DatabaseConfig {
  id: string;
  dbName: string;
  userName: string;
  password?: string;
  hostName: string;
  connectionString?: string;
  provider: 'neon' | 'mysql' | 'postgres';
  status: 'connected' | 'disconnected';
  createdAt: Date;
}

export interface Course {
  id: string;
  title: string;
  description: string;
  instructor: string;
  instructorAvatar: string;
  thumbnail: string;
  lessons: Lesson[];
  category: string;
  rating: number;
  studentsCount: number;
  price: number; 
  progress?: number;
  subjects: SubjectGroup[];
  supplementalContent?: SupplementalItem[];
  roadmap?: RoadmapItem[];
  expiryDate?: string; 
  isComingSoon?: boolean; 
  syncProgress?: number;
  comingSoonDate?: string; 
  comingSoonTagline?: string; 
  isStockOut?: boolean; 
}

export enum AppRoute {
  DASHBOARD = 'dashboard',
  COURSES = 'courses',
  COURSE_DETAILS = 'course-details',
  COURSE_VIEW = 'course-view',
  PROFILE = 'profile',
  ADMIN = 'admin',
  USERS = 'users',
  DOWNLOADS = 'downloads'
}
