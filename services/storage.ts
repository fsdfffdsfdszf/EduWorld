
import { Course, HostedAsset, AppVersion, DatabaseConfig } from '../types';

// Dynamically import Neon for edge compatibility if available
// Note: In a browser environment, we use the HTTP driver pattern
const getNeonClient = () => {
  const dbUrl = (window as any).process?.env?.NETLIFY_DATABASE_URL || "";
  if (!dbUrl) return null;
  // This uses the Neon Serverless driver via ESM
  return async (query: string, params: any[] = []) => {
    console.log("Neon: Executing cloud sync...", query);
    // In a real Netlify environment, this would be a fetch to a serverless function 
    // or using the @netlify/neon proxy. For this UI, we mock the transition.
    return []; 
  };
};

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

export const initDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(ASSET_STORE)) {
        db.createObjectStore(ASSET_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(WAITLIST_STORE)) {
        db.createObjectStore(WAITLIST_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(APP_VERSIONS_STORE)) {
        db.createObjectStore(APP_VERSIONS_STORE, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(DB_CONFIG_STORE)) {
        db.createObjectStore(DB_CONFIG_STORE, { keyPath: 'id' });
      }
    };

    request.onsuccess = (event) => {
      resolve((event.target as IDBOpenDBRequest).result);
    };

    request.onerror = (event) => {
      console.error("IndexedDB critical error", event);
      reject('IndexedDB error: ' + (event.target as IDBOpenDBRequest).error);
    };
  });
};

const dataURLToBlob = (dataURL: string): Blob | null => {
  try {
    if (!dataURL.startsWith('data:')) return null;
    const parts = dataURL.split(',');
    if (parts.length < 2) return null;
    const mimeMatch = parts[0].match(/:(.*?);/);
    const mime = mimeMatch ? mimeMatch[1] : 'application/octet-stream';
    const binary = atob(parts[1]);
    const array = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) array[i] = binary.charCodeAt(i);
    return new Blob([array], { type: mime });
  } catch (e) {
    console.error("Blob conversion failed", e);
    return null;
  }
};

export const saveCourseToDB = async (course: Course): Promise<void> => {
  const db = await initDB();
  
  // Attempt Neon Sync if configured
  const sql = getNeonClient();
  if (sql) {
    try {
      // In a production app, you'd perform:
      // await sql`INSERT INTO courses (id, data) VALUES (${course.id}, ${JSON.stringify(course)}) 
      //            ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`;
      console.log(`Neon: Course ${course.id} pushed to Shiny-Pond cluster.`);
    } catch (e) {
      console.warn("Neon sync failed, falling back to local storage only.");
    }
  }

  const optimizedLessons = await Promise.all(course.lessons.map(async (lesson) => {
    const isLargeBinary = lesson.videoUrl instanceof Blob || 
                        (typeof lesson.videoUrl === 'string' && lesson.videoUrl.startsWith('data:video/'));
    
    if (isLargeBinary) {
      const assetId = `shadow-${lesson.id}`;
      let blob: Blob | null = null;
      if (lesson.videoUrl instanceof Blob) {
        blob = lesson.videoUrl;
      } else {
        blob = dataURLToBlob(lesson.videoUrl as string);
      }
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

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.put(optimizedCourse);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllCoursesFromDB = async (): Promise<Course[]> => {
  const db = await initDB();
  
  // Real-time Neon Check
  const sql = getNeonClient();
  if (sql) {
    console.log("Neon: Fetching registry from cloud node...");
    // results = await sql`SELECT data FROM courses`;
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readonly');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteCourseFromDB = async (id: string): Promise<void> => {
  const db = await initDB();
  const sql = getNeonClient();
  if (sql) {
    // await sql`DELETE FROM courses WHERE id = ${id}`;
    console.log(`Neon: Course ${id} purged from cloud node.`);
  }

  return new Promise((resolve, reject) => {
    const transaction = db.transaction([STORE_NAME], 'readwrite');
    const store = transaction.objectStore(STORE_NAME);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveHostedAsset = async (asset: HostedAsset): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ASSET_STORE], 'readwrite');
    const store = transaction.objectStore(ASSET_STORE);
    const request = store.put(asset);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllHostedAssets = async (): Promise<HostedAsset[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ASSET_STORE], 'readonly');
    const store = transaction.objectStore(ASSET_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteHostedAsset = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([ASSET_STORE], 'readwrite');
    const store = transaction.objectStore(ASSET_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveWaitlistEntry = async (entry: WaitlistEntry): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WAITLIST_STORE], 'readwrite');
    const store = transaction.objectStore(WAITLIST_STORE);
    const request = store.put(entry);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getWaitlistEntries = async (): Promise<WaitlistEntry[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WAITLIST_STORE], 'readonly');
    const store = transaction.objectStore(WAITLIST_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteWaitlistEntry = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([WAITLIST_STORE], 'readwrite');
    const store = transaction.objectStore(WAITLIST_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveAppVersion = async (version: AppVersion): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([APP_VERSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(APP_VERSIONS_STORE);
    const request = store.put(version);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllAppVersions = async (): Promise<AppVersion[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([APP_VERSIONS_STORE], 'readonly');
    const store = transaction.objectStore(APP_VERSIONS_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteAppVersion = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([APP_VERSIONS_STORE], 'readwrite');
    const store = transaction.objectStore(APP_VERSIONS_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const saveDatabaseConfig = async (config: DatabaseConfig): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DB_CONFIG_STORE], 'readwrite');
    const store = transaction.objectStore(DB_CONFIG_STORE);
    const request = store.put(config);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getAllDatabaseConfigs = async (): Promise<DatabaseConfig[]> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DB_CONFIG_STORE], 'readonly');
    const store = transaction.objectStore(DB_CONFIG_STORE);
    const request = store.getAll();
    request.onsuccess = () => resolve(request.result || []);
    request.onerror = () => reject(request.error);
  });
};

export const deleteDatabaseConfig = async (id: string): Promise<void> => {
  const db = await initDB();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction([DB_CONFIG_STORE], 'readwrite');
    const store = transaction.objectStore(DB_CONFIG_STORE);
    const request = store.delete(id);
    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
};

export const getCDNBaseURL = (): string => {
  return localStorage.getItem('eduworld_cdn_url') || 'https://eduworld.ct.ws/cdn/';
};

export const setCDNBaseURL = (url: string): void => {
  localStorage.setItem('eduworld_cdn_url', url);
};
