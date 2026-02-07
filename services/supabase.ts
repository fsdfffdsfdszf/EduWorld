
import { createClient, SupabaseClient } from '@supabase/supabase-js';

const SUPABASE_CONFIG_KEY = 'eduworld_supabase_config';

// Primary Infrastructure Credentials
const DEFAULT_URL = 'https://ixoayobgdamntbycwwsn.supabase.co';
const DEFAULT_KEY = 'sb_publishable_RA_cM5d-UCrkc5BsXR4CMQ_WxJi4TOL'; 

export interface SupabaseConfig {
  url: string;
  key: string;
}

export const getSupabaseConfig = (): SupabaseConfig | null => {
  try {
    const stored = localStorage.getItem(SUPABASE_CONFIG_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (parsed.url && parsed.key) return parsed;
    }
  } catch (e) {
    console.warn("Supabase local config corrupt", e);
  }
  
  if (DEFAULT_URL && DEFAULT_KEY) {
    return { url: DEFAULT_URL, key: DEFAULT_KEY };
  }
  
  return null;
};

export const saveSupabaseConfig = (url: string, key: string) => {
  if (!url || !key) return;
  localStorage.setItem(SUPABASE_CONFIG_KEY, JSON.stringify({ url, key }));
  clientInstance = null; // Reset singleton
};

export const clearSupabaseConfig = () => {
  localStorage.removeItem(SUPABASE_CONFIG_KEY);
  clientInstance = null;
};

let clientInstance: SupabaseClient | null = null;

export const getSupabaseClient = (): SupabaseClient | null => {
  const config = getSupabaseConfig();
  if (!config || !config.url || !config.key) return null;
  
  if (!clientInstance) {
    try {
      clientInstance = createClient(config.url, config.key, {
        auth: {
          persistSession: true,
          autoRefreshToken: true,
          detectSessionInUrl: true
        }
      });
    } catch (err) {
      console.error("Supabase Client Init Failed:", err);
      return null;
    }
  }
  return clientInstance;
};

export const supabaseAuth = {
  async signUp(email: string, pass: string, name: string) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error("Supabase connection offline.");
    return await sb.auth.signUp({ 
      email, 
      password: pass,
      options: { data: { full_name: name } }
    });
  },
  async signIn(email: string, pass: string) {
    const sb = getSupabaseClient();
    if (!sb) throw new Error("Supabase connection offline.");
    return await sb.auth.signInWithPassword({ email, password: pass });
  },
  async signOut() {
    const sb = getSupabaseClient();
    if (sb) await sb.auth.signOut();
  },
  onAuthStateChange(callback: (session: any) => void) {
    const sb = getSupabaseClient();
    if (!sb) {
      setTimeout(() => callback(null), 0);
      return () => {};
    }
    const { data: { subscription } } = sb.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return () => subscription.unsubscribe();
  }
};
