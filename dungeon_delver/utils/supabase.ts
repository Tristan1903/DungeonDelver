// =============================================================================
// 📘 FILE: utils/supabase.ts
// =============================================================================
// 🎯 PURPOSE: Initializes and exports the Supabase client for cloud database
//    access. Supabase is an open-source Firebase alternative using PostgreSQL.
//
// 🧠 REACT CONCEPT: External Service Client
//    This is a simple file that creates a client instance ONCE (at module load
//    time) and exports it for use across the app. The Supabase client handles:
//    - Authentication (if enabled)
//    - Database queries (read/write to PostgreSQL)
//    - Real-time subscriptions (like WebSocket for DB changes)
//
// 🔧 HOW TO ALTER:
//    - Change project: update NEXT_PUBLIC_SUPABASE_URL
//    - Add anon key: update NEXT_PUBLIC_SUPABASE_ANON_KEY in .env.local
//    - Add auth: use supabase.auth methods before queries
// =============================================================================

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export function isSupabaseReady(): boolean {
  return supabaseUrl.startsWith('https://') && supabaseAnonKey.startsWith('eyJ');
}
