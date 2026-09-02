import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL || process.env.VITE_SUPABASE_URL || 'https://test.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || 'test-key';
if (!url || !key) console.warn('Missing Supabase env');
export const supabase = createClient(url, key);
