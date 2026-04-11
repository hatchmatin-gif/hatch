import { createClient } from '@supabase/supabase-js';

// Vercel 환경 변수 규칙을 따르거나 (Vite의 경우 import.meta.env 사용)
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
