'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Users, FileText, Database, LogOut, UploadCloud, Trash2 } from 'lucide-react';

export default function AdminDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [lawFiles, setLawFiles] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
    fetchLawyersAndStats();
    fetchLawFiles();
  }, []);

  const checkAdmin = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    const { data } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (data?.role !== 'admin') {
      router.push('/');
      return;
    }
    setProfile(data);
    setLoading(false);
  };

  const fetchLawyersAndStats = async () => {
    // Get all lawyers
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'lawyer');

    if (profiles) {
      // Get case counts for each
      const stats = await Promise.all(profiles.map(async (p) => {
        const { count } = await supabase
          .from('cases')
          .select('id', { count: 'exact' })
          .eq('lawyer_id', p.id);
        
        return { ...p, caseCount: count || 0 };
      }));
      setLawyers(stats);
    }
  };

  const fetchLawFiles = async () => {
    let allFiles: any[] = [];
    
    // Fetch Local Files
    try {
      const res = await fetch('/api/files');
      const data = await res.json();
      if (data.files) {
        allFiles = data.files.map((f: string) => ({ name: f, isLocal: true }));
      }
    } catch (e) {
      console.error("Local files error:", e);
    }

    // Fetch Cloud Files
    const { data, error } = await supabase.storage.from('law_files').list();
    if (data && !error) {
      const cloudFiles = data.filter(f => f.name !== '.emptyFolderPlaceholder').map(f => ({ name: f.name, isLocal: false }));
      allFiles = [...allFiles, ...cloudFiles];
    }
    
    setLawFiles(allFiles);
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    // Upload to Supabase Storage
    const { error } = await supabase.storage
      .from('law_files')
      .upload(file.name, file, { upsert: true });

    if (error) {
      if (error.message.includes('Bucket not found') || error.message.includes('bucket')) {
         alert('خطأ: لم يتم العثور على Bucket. يرجى الذهاب إلى Supabase Storage وإنشاء Bucket باسم law_files أولاً.');
      } else {
         alert(`Error: ${error.message}`);
      }
    } else {
      alert('تم رفع المرجع السحابي بنجاح');
      fetchLawFiles();
    }
  };

  const handleDeleteFile = async (name: string, isLocal: boolean) => {
    if (isLocal) {
       alert('لا يمكن حذف الملفات المحلية من خلال لوحة التحكم. يجب حذفها يدوياً من مجلد المشروع.');
       return;
    }

    if (!confirm('هل أنت متأكد من حذف هذا المرجع السحابي؟ سيؤثر هذا على إجابات الذكاء الاصطناعي.')) return;
    
    const { error } = await supabase.storage.from('law_files').remove([name]);
    if (!error) {
      fetchLawFiles();
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  if (loading) return <div style={{ color: 'var(--text-primary)', padding: '50px', textAlign: 'center' }}>جاري التحميل...</div>;

  return (
    <div style={{ padding: '40px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', color: 'var(--text-primary)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '40px', borderBottom: '1px solid var(--border-color)', paddingBottom: '20px' }}>
        <h1 style={{ color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '10px' }}>
          <Database size={28} /> لوحة تحكم الإدارة
        </h1>
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          <span>مرحباً، {profile?.full_name}</span>
          <button onClick={handleLogout} style={{ backgroundColor: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px' }}>
            <LogOut size={16} /> تسجيل خروج
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px' }}>
        {/* Lawyers Stats Panel */}
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--accent-color)' }}>
            <Users size={20} /> إحصائيات المحامين
          </h2>
          
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', textAlign: 'right' }}>
                <th style={{ padding: '10px' }}>اسم المحامي</th>
                <th style={{ padding: '10px' }}>إجمالي القضايا (المحادثات)</th>
              </tr>
            </thead>
            <tbody>
              {lawyers.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px 10px' }}>{l.full_name}</td>
                  <td style={{ padding: '15px 10px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{l.caseCount}</td>
                </tr>
              ))}
              {lawyers.length === 0 && (
                <tr><td colSpan={2} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد محامين حالياً. قم بإنشائهم من منصة Supabase.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Law Files Panel */}
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', color: 'var(--accent-color)' }}>
              <FileText size={20} /> المراجع القانونية (قاعدة المعرفة)
            </h2>
            <label style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-color)', padding: '8px 15px', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '5px', fontSize: '0.9rem', fontWeight: 'bold' }}>
              <UploadCloud size={16} /> رفع مرجع جديد
              <input type="file" accept=".pdf,.txt" style={{ display: 'none' }} onChange={handleFileUpload} />
            </label>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
            {lawFiles.map(f => (
              <div key={f.name} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '8px' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <FileText size={16} color={f.isLocal ? "#3498db" : "var(--accent-color)"} /> 
                  {f.name} {f.isLocal && <span style={{ fontSize: '0.7rem', backgroundColor: '#3498db', color: '#fff', padding: '2px 6px', borderRadius: '4px' }}>محلي</span>}
                </span>
                <button onClick={() => handleDeleteFile(f.name, f.isLocal)} style={{ background: 'transparent', border: 'none', color: f.isLocal ? 'gray' : '#e74c3c', cursor: f.isLocal ? 'not-allowed' : 'pointer' }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {lawFiles.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد مراجع مرفوعة. يرجى رفع ملفات القانون المصري.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
