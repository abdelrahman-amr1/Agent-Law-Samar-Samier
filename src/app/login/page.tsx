'use client';

import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Bot, LogIn } from 'lucide-react';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  React.useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      if (params.get('error') === 'suspended') {
        setError('تم إيقاف حسابك مؤقتاً. يرجى التواصل مع الإدارة لتجديد الاشتراك.');
      }
    }
  }, []);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) throw error;

      // Check role
      const { data: profile } = await supabase
        .from('profiles')
        .select('role, is_active')
        .eq('id', data.user.id)
        .single();

      if (profile?.role !== 'admin' && profile?.is_active === false) {
        await supabase.auth.signOut();
        throw new Error('تم إيقاف حسابك مؤقتاً. يرجى التواصل مع الإدارة لتجديد الاشتراك.');
      }

      if (profile?.role === 'admin') {
        router.push('/admin');
      } else {
        router.push('/');
      }
    } catch (err: any) {
      setError(err.message || 'فشل تسجيل الدخول. تأكد من البريد وكلمة المرور.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', width: '100%', minHeight: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: 'var(--bg-color)', padding: '20px' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '40px', backgroundColor: 'var(--panel-bg)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
        <div style={{ textAlign: 'center', marginBottom: '30px' }}>
          <Bot size={48} color="var(--accent-color)" style={{ marginBottom: '10px' }} />
          <h2 style={{ color: 'var(--accent-color)' }}>نظام المستشار القانوني</h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '5px' }}>تسجيل الدخول للمحامين والإدارة</p>
        </div>

        {error && (
          <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', padding: '10px', borderRadius: '6px', marginBottom: '20px', fontSize: '0.9rem', textAlign: 'center', border: '1px solid #e74c3c' }}>
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>البريد الإلكتروني</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>كلمة المرور</label>
            <input 
              type="password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr' }}
            />
          </div>
          
          <button 
            type="submit" 
            disabled={loading}
            style={{ width: '100%', padding: '12px', marginTop: '10px', backgroundColor: 'var(--accent-color)', color: 'var(--bg-color)', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: loading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            {loading ? 'جاري تسجيل الدخول...' : <><LogIn size={18} /> دخول</>}
          </button>
        </form>
      </div>
    </div>
  );
}

// Trigger Vercel build
