const { createClient } = require('@supabase/supabase-js');
const supabaseUrl = 'https://ychlfrrmtmvoqgsimlfq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljaGxmcnJtdG12b3Fnc2ltbGZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg4MjgzNiwiZXhwIjoyMDk0NDU4ODM2fQ.XBWUlL8IgwYJrt0mQ9VCXTtHuLIrnvauqs76rRq9RB0';
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

async function check() {
  const { data } = await supabaseAdmin.from('ai_token_usage').select('*');
  console.log('AI token usage count:', data ? data.length : 0);
  console.log('Last 5 usages:', data ? JSON.stringify(data.slice(-5), null, 2) : 'none');
}
check();
