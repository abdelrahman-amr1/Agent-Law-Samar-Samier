import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://ychlfrrmtmvoqgsimlfq.supabase.co';
const supabaseAnonKey = 'sb_publishable_wVQXN9EVg16yG1O5gUXvfA__WmdSARs';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
