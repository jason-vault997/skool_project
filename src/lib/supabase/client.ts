import { createClient } from '@supabase/supabase-js';

const supabaseUrl   = import.meta.env.VITE_SUPABASE_URL   ?? '';
const supabaseKey   = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? '';

// Guard: if env vars are missing, log clearly instead of crashing blank
if (!supabaseUrl || !supabaseKey) {
  console.error(
    '[BUILD100] Missing Supabase env vars.\n' +
    'VITE_SUPABASE_URL:', supabaseUrl ? '✓ set' : '✗ MISSING', '\n' +
    'VITE_SUPABASE_PUBLISHABLE_KEY:', supabaseKey ? '✓ set' : '✗ MISSING'
  );
}

export const supabase = createClient(
  supabaseUrl  || 'https://placeholder.supabase.co',
  supabaseKey  || 'placeholder-key'
);
