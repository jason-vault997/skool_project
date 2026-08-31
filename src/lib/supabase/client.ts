import { createClient } from '@supabase/supabase-js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const meta = import.meta as any;
const supabaseUrl: string = meta.env.VITE_SUPABASE_URL;
const supabaseKey: string = meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn(
    'Missing Supabase environment variables. ' +
    'Ensure VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY are set in .env.local'
  );
}

export const supabase = createClient(supabaseUrl, supabaseKey);
