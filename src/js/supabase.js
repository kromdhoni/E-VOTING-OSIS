import { createClient } from '@supabase/supabase-js';
const url = import.meta.env.VITE_SUPABASE_URL || 'https://qjzlzlgxoziwwawcfbad.supabase.co';
const key = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_ClTYlSfpvSgW4GhnGlw8sA_0FSQyf4U';
if (!url || !key || url === 'https://test.supabase.co') console.warn('Missing Supabase env');
export const supabase = createClient(url, key);
