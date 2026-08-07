import { createClient } from '@supabase/supabase-js';

// Polyfill WebSocket for Node < 22 to prevent RealtimeClient crash
if (typeof WebSocket === 'undefined') {
  global.WebSocket = require('ws');
}

const supabaseUrl = process.env.SUPABASE_URL || 'https://placeholder.supabase.co';
const supabaseKey = process.env.SUPABASE_KEY || 'placeholder-key';

export const supabase = createClient(supabaseUrl, supabaseKey);
