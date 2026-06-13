import { NextResponse } from 'next/server';
import { supabase as normalSupabase, supabaseAdmin } from '@/lib/supabase'; // to verify requester token

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



    // 3. Extract payload
    const { email, password, full_name, subdomain, title, bio, office_address, public_phone } = await req.json();

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
      email,
      role: 'lawyer',
      subdomain: subdomain ? subdomain.trim().toLowerCase() : null,
      title: title || null,
      bio: bio || null,
      office_address: office_address || null,
      public_phone: public_phone || null
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

export async function PUT(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await normalSupabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await normalSupabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { targetUserId, full_name, email, password, query_limit, queries_used, subdomain, title, bio, office_address, public_phone } = await req.json();
    if (!targetUserId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    const updateData: any = {};
    if (full_name) updateData.full_name = full_name;
    if (email) updateData.email = email;
    if (query_limit !== undefined) updateData.query_limit = query_limit;
    if (queries_used !== undefined) updateData.queries_used = queries_used;
    if (subdomain !== undefined) updateData.subdomain = subdomain ? subdomain.trim().toLowerCase() : null;
    if (title !== undefined) updateData.title = title || null;
    if (bio !== undefined) updateData.bio = bio || null;
    if (office_address !== undefined) updateData.office_address = office_address || null;
    if (public_phone !== undefined) updateData.public_phone = public_phone || null;

    if (Object.keys(updateData).length > 0) {
      const { error } = await supabaseAdmin.from('profiles').update(updateData).eq('id', targetUserId);
      if (error) throw error;
    }

    // Update Auth Email if present
    if (email) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { email });
      if (error) throw error;
    }

    if (password) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(targetUserId, { password });
      if (error) throw error;
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return NextResponse.json({ error: 'Missing Authorization header' }, { status: 401 });

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await normalSupabase.auth.getUser(token);
    if (authError || !user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const { data: profile } = await normalSupabase.from('profiles').select('role').eq('id', user.id).single();
    if (profile?.role !== 'admin') return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const url = new URL(req.url);
    const targetUserId = url.searchParams.get('id');
    if (!targetUserId) return NextResponse.json({ error: 'User ID is required' }, { status: 400 });

    // Delete from auth.users (this should cascade to profiles if foreign key has ON DELETE CASCADE, 
    // but in Supabase it's better to delete profile first or just delete auth user)
    // Actually, profiles id REFERENCES auth.users(id), without ON DELETE CASCADE.
    // So we MUST delete from profiles first, then auth.users.
    
    // Delete profile
    const { error: profileError } = await supabaseAdmin.from('profiles').delete().eq('id', targetUserId);
    if (profileError) throw profileError;

    // Delete auth user
    const { error: authDeleteError } = await supabaseAdmin.auth.admin.deleteUser(targetUserId);
    if (authDeleteError) throw authDeleteError;

    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
