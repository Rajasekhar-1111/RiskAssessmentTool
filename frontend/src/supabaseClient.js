import { createClient } from '@supabase/supabase-js';

// Initialize the Supabase client using the keys provided
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://qonedsvysgxxulbbfnhf.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'sb_publishable_SflZjW2GjXHIurzIJaf6zw_UGLv81yI';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
