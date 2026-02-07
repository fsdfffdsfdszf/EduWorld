
import { Course, HostedAsset, AppVersion, DatabaseConfig } from '../types';
import { getSupabaseClient } from './supabase';

const DB_NAME = 'EduWorldDB';
const STORE_NAME = 'courses';
const ASSET_STORE = 'hosted_assets'; 
const WAITLIST_STORE = 'waitlist';
const APP_VERSIONS_STORE = 'app_versions';
const DB_CONFIG_STORE = 'database_configs';
const DB_VERSION = 6;

export interface WaitlistEntry {
  id: string;
  courseId: string;
  email: string;
  timestamp: Date;
}

// IndexedDB Initialization
export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(ASSET_STORE)) db.createObjectStore(ASSET_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(WAITLIST_STORE)) db.createObjectStore(WAITLIST_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(APP_VERSIONS_STORE)) db.createObjectStore(APP_VERSIONS_STORE, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(DB_CONFIG_STORE)) db.createObjectStore(DB_CONFIG_STORE, { keyPath: 'id' });
    };

    request.onsuccess = (event) => resolve((event.target as IDBOpenDBRequest).result);
    request.onerror = (event) => {
      console.error("IndexedDB error", event);
      reject('IndexedDB error: ' + (event.target as IDBOpenDBRequest).error);
    };
  });
};

const dataURLToBlob = (dataURL: string): Blob | null => {
  try {
    if (!dataURL.startsWith('data:')) return null;
    const parts = dataURL.split(',');
    if (parts.length < 2) return null;
    const mime = parts[0].match(/:(.*?);/)?.[1] || 'application/octet-stream';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  } catch (e) {
    return null;
  }
};

// --- COURSES ---

export const saveCourseToDB = async (course: Course): Promise<void> => {
  const db = await initDB();
  const sb = getSupabaseClient();

  // Optimizing large binaries before storage
  const optimizedLessons = await Promise.all(course.lessons.map(async (lesson) => {
    const isLargeBinary = lesson.videoUrl instanceof Blob || (typeof lesson.videoUrl === 'string' && lesson.videoUrl.startsWith('data:video/'));
    if (isLargeBinary) {
      const assetId = `shadow-${lesson.id}`;
      let blob = lesson.videoUrl instanceof Blob ? lesson.videoUrl : dataURLToBlob(lesson.videoUrl as string);
      if (blob) {
        const asset: HostedAsset = {
          id: assetId,
          title: `Pointer for ${lesson.title}`,
          fileName: (lesson.videoUrl instanceof File) ? (lesson.videoUrl as File).name : `${lesson.id}.mp4`,
          data: blob,
          mimeType: blob.type,
          url: `https://eduworld.ct.ws/cdn/${assetId}`,
          createdAt: new Date(),
        };
        await saveHostedAsset(asset);
        return { ...lesson, videoUrl: asset.url };
      }
    }
    return lesson;
  }));
  const optimizedCourse = { ...course, lessons: optimizedLessons };

  // Supabase Sync
  if (sb) {
    // We assume a table 'courses' exists with columns: id (text), data (jsonb)
    try {
      const { error } = await sb.from('courses').upsert({ id: optimizedCourse.id, data: optimizedCourse });
      if (error) console.error("Supabase Sync Error (Courses):", error);
    } catch (e) { console.error("Supabase Exception:", e); }
  }

  // Local IDB
  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const req = tx.objectStore(STORE_NAME).put(optimizedCourse);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getAllCoursesFromDB = async (): Promise<Course[]> => {
  const db = await initDB();
  const sb = getSupabaseClient();

  if (sb) {
    try {
      const { data, error } = await sb.from('courses').select('data');
      if (!error && data) {
        return data.map(row => row.data);
      }
    } catch (e) { console.warn("Supabase fetch failed, falling back to IDB", e); }
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readonly');
    const req = tx.objectStore(STORE_NAME).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const deleteCourseFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  const sb = getSupabaseClient();

  if (sb) {
    try { await sb.from('courses').delete().eq('id', id); } catch (e) {}
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([STORE_NAME], 'readwrite');
    const req = tx.objectStore(STORE_NAME).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- ASSETS ---

export const saveHostedAsset = async (asset: HostedAsset): Promise<void> => {
  const db = await initDB();
  const sb = getSupabaseClient();

  if (sb) {
    try {
      // NOTE: Storing large base64 in JSONB is not ideal for production but fits the user's request "save my data"
      // without setting up Supabase Storage buckets complexity in this snippet.
      // Table: assets (id text, data jsonb)
      await sb.from('assets').upsert({ id: asset.id, data: asset });
    } catch (e) {}
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([ASSET_STORE], 'readwrite');
    const req = tx.objectStore(ASSET_STORE).put(asset);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getAllHostedAssets = async (): Promise<HostedAsset[]> => {
  const db = await initDB();
  const sb = getSupabaseClient();

  if (sb) {
    try {
      const { data } = await sb.from('assets').select('data');
      if (data) return data.map(row => row.data);
    } catch (e) {}
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([ASSET_STORE], 'readonly');
    const req = tx.objectStore(ASSET_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const deleteHostedAsset = async (id: string): Promise<void> => {
  const db = await initDB();
  const sb = getSupabaseClient();

  if (sb) { try { await sb.from('assets').delete().eq('id', id); } catch (e) {} }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([ASSET_STORE], 'readwrite');
    const req = tx.objectStore(ASSET_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- WAITLIST ---

export const saveWaitlistEntry = async (entry: WaitlistEntry): Promise<void> => {
  const db = await initDB();
  const sb = getSupabaseClient();
  
  if (sb) { try { await sb.from('waitlist').upsert({ id: entry.id, data: entry }); } catch (e) {} }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([WAITLIST_STORE], 'readwrite');
    const req = tx.objectStore(WAITLIST_STORE).put(entry);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getWaitlistEntries = async (): Promise<WaitlistEntry[]> => {
  const db = await initDB();
  const sb = getSupabaseClient();
  
  if (sb) {
    try {
      const { data } = await sb.from('waitlist').select('data');
      if (data) return data.map(row => row.data);
    } catch (e) {}
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([WAITLIST_STORE], 'readonly');
    const req = tx.objectStore(WAITLIST_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const deleteWaitlistEntry = async (id: string): Promise<void> => {
  const db = await initDB();
  const sb = getSupabaseClient();
  if (sb) { try { await sb.from('waitlist').delete().eq('id', id); } catch (e) {} }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([WAITLIST_STORE], 'readwrite');
    const req = tx.objectStore(WAITLIST_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- APP VERSIONS ---

export const saveAppVersion = async (version: AppVersion): Promise<void> => {
  const db = await initDB();
  const sb = getSupabaseClient();
  if (sb) { try { await sb.from('app_versions').upsert({ id: version.id, data: version }); } catch (e) {} }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([APP_VERSIONS_STORE], 'readwrite');
    const req = tx.objectStore(APP_VERSIONS_STORE).put(version);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getAllAppVersions = async (): Promise<AppVersion[]> => {
  const db = await initDB();
  const sb = getSupabaseClient();
  if (sb) {
    try {
      const { data } = await sb.from('app_versions').select('data');
      if (data) return data.map(row => row.data);
    } catch (e) {}
  }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([APP_VERSIONS_STORE], 'readonly');
    const req = tx.objectStore(APP_VERSIONS_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const deleteAppVersion = async (id: string): Promise<void> => {
  const db = await initDB();
  const sb = getSupabaseClient();
  if (sb) { try { await sb.from('app_versions').delete().eq('id', id); } catch (e) {} }

  return new Promise((resolve, reject) => {
    const tx = db.transaction([APP_VERSIONS_STORE], 'readwrite');
    const req = tx.objectStore(APP_VERSIONS_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

// --- DB CONFIGS (Local Only) ---

export const saveDatabaseConfig = async (config: DatabaseConfig): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DB_CONFIG_STORE], 'readwrite');
    const req = tx.objectStore(DB_CONFIG_STORE).put(config);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getAllDatabaseConfigs = async (): Promise<DatabaseConfig[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DB_CONFIG_STORE], 'readonly');
    const req = tx.objectStore(DB_CONFIG_STORE).getAll();
    req.onsuccess = () => resolve(req.result || []);
    req.onerror = () => reject(req.error);
  });
};

export const deleteDatabaseConfig = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const tx = db.transaction([DB_CONFIG_STORE], 'readwrite');
    const req = tx.objectStore(DB_CONFIG_STORE).delete(id);
    req.onsuccess = () => resolve();
    req.onerror = () => reject(req.error);
  });
};

export const getCDNBaseURL = (): string => {
  return localStorage.getItem('eduworld_cdn_url') || 'https://eduworld.ct.ws/cdn/';
};

export const setCDNBaseURL = (url: string): void => {
  localStorage.setItem('eduworld_cdn_url', url);
};
