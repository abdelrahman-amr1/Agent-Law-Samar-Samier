import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { supabase as normalSupabase } from '@/lib/supabase'; // to verify requester token

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ychlfrrmtmvoqgsimlfq.supabase.co';
const serviceRoleKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljaGxmcnJtdG12b3Fnc2ltbGZxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3ODg4MjgzNiwiZXhwIjoyMDk0NDU4ODM2fQ.XBWUlL8IgwYJrt0mQ9VCXTtHuLIrnvauqs76rRq9RB0';

// Admin-level Supabase client
const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

export async function POST(req: Request) {
  try {
    // 1. Verify that the requester is an admin
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) {
      return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await normalSupabase.auth.getUser(token);
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Check profile role
    const { data: profile } = await normalSupabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single();

    if (profile?.role !== 'admin') {
      return NextResponse.json({ error: 'Forbidden: Admins only' }, { status: 403 });
    }

    // 2. Check Service Role Key existence
    if (!serviceRoleKey) {
      return NextResponse.json({ error: 'SUPABASE_SERVICE_ROLE_KEY is not configured on the server. Please add it to Vercel Environment Variables.' }, { status: 500 });
    }

    // 3. Extract payload
    const { email, password, full_name } = await req.json();

    if (!email || !password || !full_name) {
      return NextResponse.json({ error: 'Email, password, and full_name are required' }, { status: 400 });
    }

    // 4. Create User in auth.users
    const { data: authData, error: createUserError } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true // bypass email confirmation
    });

    if (createUserError) {
      return NextResponse.json({ error: createUserError.message }, { status: 400 });
    }

    const newUserId = authData.user.id;

    // 5. Insert into profiles table
    const { error: profileError } = await supabaseAdmin.from('profiles').insert({
      id: newUserId,
      full_name,
      role: 'lawyer'
    });

    if (profileError) {
      // Rollback auth user creation if profile fails
      await supabaseAdmin.auth.admin.deleteUser(newUserId);
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }

    return NextResponse.json({ success: true, user: authData.user });

  } catch (err: any) {
    console.error('Create User Error:', err);
    return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
  }
}
