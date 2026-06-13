import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ychlfrrmtmvoqgsimlfq.supabase.co';
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljaGxmcnJtdG12b3Fnc2ltbGZxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg4ODI4MzYsImV4cCI6MjA5NDQ1ODgzNn0.Uszfft00Wwe_KzL6W4ngd2ThJ8IN4qrCWMtwaVsUB18';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljaGxmcnJtdG12b3Fnc2ltbGZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg4MjgzNiwiZXhwIjoyMDk0NDU4ODM2fQ.XBWUlL8IgwYJrt0mQ9VCXTtHuLIrnvauqs76rRq9RB0';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

