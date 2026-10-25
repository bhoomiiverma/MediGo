import { createClient } from '@supabase/supabase-js';
import { demoMode, supabaseAnonKey, supabaseUrl } from '@/lib/demo-mode';

const url = supabaseUrl();
const key = supabaseAnonKey();

export const supabase = url && key ? createClient(url, key) : null;

export function useSupabase() {
  return supabase;
}

export { demoMode };
