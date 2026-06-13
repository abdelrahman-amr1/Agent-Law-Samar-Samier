'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Users, FileText, Database, LogOut, UploadCloud, Trash2, Key, Save, UserPlus, CheckCircle2, AlertCircle, Activity, Briefcase, FileCode, Edit, X } from 'lucide-react';

export default function AdminDashboard() {
  const [profile, setProfile] = useState<any>(null);
  const [lawyers, setLawyers] = useState<any[]>([]);
  const [lawFiles, setLawFiles] = useState<any[]>([]);
  const [systemApiKey, setSystemApiKey] = useState('');
  const [savingKey, setSavingKey] = useState(false);
  
  // New User Form State
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('123456');
  const [newUserSubdomain, setNewUserSubdomain] = useState('');
  const [newUserTitle, setNewUserTitle] = useState('');
  const [newUserPublicPhone, setNewUserPublicPhone] = useState('');
  const [newUserOfficeAddress, setNewUserOfficeAddress] = useState('');
  const [newUserBio, setNewUserBio] = useState('');
  const [creatingUser, setCreatingUser] = useState(false);

  // Toast State
  const [toast, setToast] = useState<{ message: string, type: 'success' | 'error' } | null>(null);

  // Edit Modal State
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [editTargetId, setEditTargetId] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editEmail, setEditEmail] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editQueryLimit, setEditQueryLimit] = useState(150);
  const [editQueriesUsed, setEditQueriesUsed] = useState(0);
  const [editSubdomain, setEditSubdomain] = useState('');
  const [editTitle, setEditTitle] = useState('');
  const [editPublicPhone, setEditPublicPhone] = useState('');
  const [editOfficeAddress, setEditOfficeAddress] = useState('');
  const [editBio, setEditBio] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Token stats states
  const [totalTokensToday, setTotalTokensToday] = useState(0);
  const [totalTokensMonth, setTotalTokensMonth] = useState(0);
  const [requestsToday, setRequestsToday] = useState(0);

  const showToast = (message: string, type: 'success' | 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    checkAdmin();
    fetchLawyersAndStats();
    fetchLawFiles();
    fetchSystemApiKey();
    fetchTokenStats();
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

  const fetchTokenStats = async () => {
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const startOfToday = today.toISOString();

      const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();

      // Fetch today's usage
      const { data: todayData } = await supabase
        .from('ai_token_usage')
        .select('total_tokens')
        .gte('created_at', startOfToday);

      const sumToday = todayData ? todayData.reduce((acc, t) => acc + (t.total_tokens || 0), 0) : 0;
      const reqsToday = todayData ? todayData.length : 0;

      // Fetch month's usage
      const { data: monthData } = await supabase
        .from('ai_token_usage')
        .select('total_tokens')
        .gte('created_at', startOfMonth);

      const sumMonth = monthData ? monthData.reduce((acc, t) => acc + (t.total_tokens || 0), 0) : 0;

      setTotalTokensToday(sumToday);
      setTotalTokensMonth(sumMonth);
      setRequestsToday(reqsToday);
    } catch (e) {
      console.error("Error fetching token stats:", e);
    }
  };

  const fetchLawyersAndStats = async () => {
    // Get all lawyers
    const { data: profiles } = await supabase
      .from('profiles')
      .select('*')
      .eq('role', 'lawyer');

    if (profiles) {
      // Get case counts and token count for each
      const stats = await Promise.all(profiles.map(async (p) => {
        const { count } = await supabase
          .from('cases')
          .select('id', { count: 'exact' })
          .eq('lawyer_id', p.id);

        let tokenCount = 0;
        try {
          const { data: tokenData } = await supabase
            .from('ai_token_usage')
            .select('total_tokens')
            .eq('lawyer_id', p.id);
          if (tokenData) {
            tokenCount = tokenData.reduce((acc, t) => acc + (t.total_tokens || 0), 0);
          }
        } catch (_) {}
        
        return { ...p, caseCount: count || 0, tokenCount };
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

  const fetchSystemApiKey = async () => {
    const { data, error } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'gemini_api_key')
      .single();
    
    if (data) {
      setSystemApiKey(data.value);
    }
  };

  const handleSaveApiKey = async () => {
    setSavingKey(true);
    const { error } = await supabase
      .from('settings')
      .upsert({ key: 'gemini_api_key', value: systemApiKey.trim(), updated_at: new Date().toISOString() });
    
    setSavingKey(false);
    if (error) {
      showToast(`خطأ في حفظ المفتاح: ${error.message}`, 'error');
    } else {
      showToast('تم حفظ المفتاح بنجاح! سيتم تطبيقه على جميع المحامين تلقائياً.', 'success');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreatingUser(true);

    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;

      if (!token) throw new Error('غير مصرح لك');

      const response = await fetch('/api/admin/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          full_name: newUserName,
          email: newUserEmail,
          password: newUserPassword,
          subdomain: newUserSubdomain.trim().toLowerCase() || undefined,
          title: newUserTitle || undefined,
          public_phone: newUserPublicPhone || undefined,
          office_address: newUserOfficeAddress || undefined,
          bio: newUserBio || undefined
        })
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'فشل إنشاء المستخدم');
      }

      showToast('تم إضافة المحامي بنجاح!', 'success');
      setNewUserName('');
      setNewUserEmail('');
      setNewUserPassword('123456');
      setNewUserSubdomain('');
      setNewUserTitle('');
      setNewUserPublicPhone('');
      setNewUserOfficeAddress('');
      setNewUserBio('');
      fetchLawyersAndStats(); // Refresh the list
    } catch (err: any) {
      showToast(`خطأ: ${err.message}`, 'error');
    } finally {
      setCreatingUser(false);
    }
  };

  const handleToggleStatus = async (lawyerId: string, currentStatus: boolean) => {
    if (!confirm(`هل أنت متأكد من رغبتك في ${currentStatus ? 'إيقاف' : 'تفعيل'} هذا الحساب؟`)) return;
    
    const { error } = await supabase
      .from('profiles')
      .update({ is_active: !currentStatus })
      .eq('id', lawyerId);
      
    if (error) {
      showToast(`خطأ في تحديث الحالة: ${error.message}`, 'error');
    } else {
      fetchLawyersAndStats(); // refresh the list
    }
  };

  const handleEditUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsEditing(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch('/api/admin/users', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ 
          targetUserId: editTargetId, 
          full_name: editFullName, 
          email: editEmail,
          password: editPassword || undefined,
          query_limit: editQueryLimit,
          queries_used: editQueriesUsed,
          subdomain: editSubdomain.trim().toLowerCase() || null,
          title: editTitle || null,
          public_phone: editPublicPhone || null,
          office_address: editOfficeAddress || null,
          bio: editBio || null
        })
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast('تم تحديث بيانات المحامي بنجاح', 'success');
      setEditModalOpen(false);
      fetchLawyersAndStats();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsEditing(false);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!confirm('تحذير: سيتم حذف المحامي نهائياً ولن يتمكن من الدخول مجدداً. هل أنت متأكد؟')) return;
    setIsDeleting(true);
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const token = sessionData.session?.access_token;
      const res = await fetch(`/api/admin/users?id=${userId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      showToast('تم حذف الحساب نهائياً', 'success');
      fetchLawyersAndStats();
    } catch (err: any) {
      showToast(err.message, 'error');
    } finally {
      setIsDeleting(false);
    }
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
         showToast('خطأ: لم يتم العثور على Bucket. يرجى الذهاب إلى Supabase Storage وإنشاء Bucket باسم law_files أولاً.', 'error');
      } else {
         showToast(`Error: ${error.message}`, 'error');
      }
    } else {
      showToast('تم رفع المرجع السحابي بنجاح', 'success');
      fetchLawFiles();
    }
  };

  const handleDeleteFile = async (name: string, isLocal: boolean) => {
    if (isLocal) {
       showToast('لا يمكن حذف الملفات المحلية من خلال لوحة التحكم. يجب حذفها يدوياً من مجلد المشروع.', 'error');
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
    <div style={{ flex: 1, width: '100%', overflowY: 'auto', padding: '40px', backgroundColor: 'var(--bg-color)', minHeight: '100vh', color: 'var(--text-primary)' }}>
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

      {/* Analytics Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '20px', marginBottom: '30px' }}>
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '15px', borderRadius: '50%' }}>
            <Users size={24} color="var(--accent-color)" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: 0 }}>{lawyers.length}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>إجمالي المحامين</span>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '50%' }}>
            <Activity size={24} color="#2ecc71" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: 0 }}>{lawyers.filter(l => l.is_active !== false).length}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>محامين نشطين</span>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '15px', borderRadius: '50%' }}>
            <Briefcase size={24} color="#3498db" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.8rem', color: 'var(--text-primary)', margin: 0 }}>{lawyers.reduce((acc, l) => acc + l.caseCount, 0)}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>إجمالي القضايا</span>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)', padding: '15px', borderRadius: '50%' }}>
            <FileCode size={24} color="#9b59b6" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.2rem', color: '#9b59b6', margin: 0, marginTop: '5px' }}>{systemApiKey ? 'متصل' : 'غير متصل'}</h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>الذكاء الاصطناعي</span>
          </div>
        </div>
      </div>

      {/* AI Usage Cards */}
      <h2 style={{ fontSize: '1.2rem', marginBottom: '15px', color: 'var(--text-primary)', fontWeight: 'bold' }}>إحصائيات استخدام الذكاء الاصطناعي (Gemini)</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '20px', marginBottom: '40px' }}>
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(52, 152, 219, 0.1)', padding: '15px', borderRadius: '50%' }}>
            <Activity size={24} color="#3498db" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>
              {requestsToday} <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>/ 560</span>
            </h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>الطلبات اليومية المستهلكة</span>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(230, 126, 34, 0.1)', padding: '15px', borderRadius: '50%' }}>
            <Activity size={24} color="#e67e22" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.5rem', color: 'var(--text-primary)', margin: 0 }}>
              {Math.max(0, 560 - requestsToday).toLocaleString('en-US')}
            </h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>الطلبات المتاحة المتبقية اليوم</span>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', padding: '15px', borderRadius: '50%' }}>
            <FileText size={24} color="#2ecc71" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
              {totalTokensToday.toLocaleString('en-US')}
            </h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>التوكنز المستهلكة اليوم</span>
          </div>
        </div>
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '20px', borderRadius: '12px', border: '1px solid var(--border-color)', display: 'flex', alignItems: 'center', gap: '15px' }}>
          <div style={{ backgroundColor: 'rgba(155, 89, 182, 0.1)', padding: '15px', borderRadius: '50%' }}>
            <FileText size={24} color="#9b59b6" />
          </div>
          <div>
            <h3 style={{ fontSize: '1.4rem', color: 'var(--text-primary)', margin: 0 }}>
              {totalTokensMonth.toLocaleString('en-US')}
            </h3>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>التوكنز المستهلكة هذا الشهر</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '30px', marginBottom: '30px' }}>
        {/* System Settings Panel */}
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)', gridColumn: '1 / -1' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--accent-color)' }}>
            <Key size={20} /> إعدادات النظام (مفتاح الذكاء الاصطناعي المركزي)
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '15px', fontSize: '0.9rem' }}>
            أدخل مفتاح Google Gemini API هنا. سيتم استخدامه تلقائياً بواسطة جميع المحامين في المنصة ولن تظهر لهم نافذة طلب المفتاح بعد الآن.
          </p>
          <div style={{ display: 'flex', gap: '15px', flexDirection: 'row-reverse' }}>
            <button 
              onClick={handleSaveApiKey}
              disabled={savingKey}
              style={{ backgroundColor: 'var(--accent-color)', color: 'var(--bg-color)', border: 'none', padding: '12px 25px', borderRadius: '6px', cursor: savingKey ? 'not-allowed' : 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}
            >
              <Save size={18} /> {savingKey ? 'جاري الحفظ...' : 'حفظ وتطبيق'}
            </button>
            <input 
              type="password" 
              placeholder="Gemini API Key..."
              value={systemApiKey}
              onChange={(e) => setSystemApiKey(e.target.value)}
              style={{ flex: 1, padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr', textAlign: 'left' }}
            />
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(350px, 1fr))', gap: '25px', alignItems: 'start', paddingBottom: '50px' }}>
        {/* Create New User Panel */}
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <h2 style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '20px', color: 'var(--accent-color)' }}>
            <UserPlus size={20} /> إضافة محامٍ جديد
          </h2>
          <form onSubmit={handleCreateUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>الاسم بالكامل</label>
              <input 
                type="text" 
                required
                placeholder="أحمد محمد"
                value={newUserName}
                onChange={e => setNewUserName(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>البريد الإلكتروني</label>
              <input 
                type="email" 
                required
                placeholder="lawyer@example.com"
                value={newUserEmail}
                onChange={e => setNewUserEmail(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>كلمة المرور الافتراضية</label>
              <input 
                type="text" 
                required
                value={newUserPassword}
                onChange={e => setNewUserPassword(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>النطاق الفرعي (Subdomain)</label>
              <input 
                type="text" 
                placeholder="مثال: samarsamier"
                value={newUserSubdomain}
                onChange={e => setNewUserSubdomain(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>اسم المكتب (Title)</label>
              <input 
                type="text" 
                placeholder="مكتب الدكتورة سمر سمير للمحاماة"
                value={newUserTitle}
                onChange={e => setNewUserTitle(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>رقم هاتف التواصل العام</label>
              <input 
                type="text" 
                placeholder="01110487889"
                value={newUserPublicPhone}
                onChange={e => setNewUserPublicPhone(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>عنوان المكتب بالتفصيل</label>
              <input 
                type="text" 
                placeholder="القاهرة، الدقي، شارع التحرير"
                value={newUserOfficeAddress}
                onChange={e => setNewUserOfficeAddress(e.target.value)}
                style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }}
              />
            </div>
            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>نبذة عن المحامي أو المكتب</label>
              <textarea 
                placeholder="اكتب نبذة مختصرة عن المكتب وسنوات الخبرة..."
                value={newUserBio}
                onChange={e => setNewUserBio(e.target.value)}
                style={{ width: '100%', height: '80px', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'none' }}
              />
            </div>
            <button 
              type="submit" 
              disabled={creatingUser}
              style={{ padding: '12px', marginTop: '10px', backgroundColor: 'var(--accent-color)', color: 'var(--bg-color)', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: creatingUser ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {creatingUser ? 'جاري الإضافة...' : 'إنشاء الحساب'}
            </button>
          </form>
        </div>

        {/* Law Files Panel moved under Add Lawyer */}
        <div style={{ backgroundColor: 'var(--panel-bg)', padding: '25px', borderRadius: '12px', border: '1px solid var(--border-color)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', flexWrap: 'wrap', gap: '10px' }}>
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
                <span style={{ display: 'flex', alignItems: 'center', gap: '10px', wordBreak: 'break-word' }}>
                  <FileText size={16} color={f.isLocal ? "#3498db" : "var(--accent-color)"} style={{ flexShrink: 0 }} /> 
                  {f.name} {f.isLocal && <span style={{ fontSize: '0.7rem', backgroundColor: '#3498db', color: '#fff', padding: '2px 6px', borderRadius: '4px', flexShrink: 0 }}>محلي</span>}
                </span>
                <button onClick={() => handleDeleteFile(f.name, f.isLocal)} style={{ background: 'transparent', border: 'none', color: f.isLocal ? 'gray' : '#e74c3c', cursor: f.isLocal ? 'not-allowed' : 'pointer', flexShrink: 0 }}>
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
            {lawFiles.length === 0 && (
              <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد مراجع مرفوعة. يرجى رفع ملفات القانون المصري.</div>
            )}
          </div>
        </div>

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
                <th style={{ padding: '10px' }}>التوكنز المستهلكة</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>حالة الحساب</th>
                <th style={{ padding: '10px', textAlign: 'center' }}>إجراءات</th>
              </tr>
            </thead>
            <tbody>
              {lawyers.map(l => (
                <tr key={l.id} style={{ borderBottom: '1px solid var(--border-color)' }}>
                  <td style={{ padding: '15px 10px' }}>{l.full_name}</td>
                  <td style={{ padding: '15px 10px', fontWeight: 'bold', color: 'var(--accent-color)' }}>{l.caseCount}</td>
                  <td style={{ padding: '15px 10px', fontWeight: 'bold', color: '#3498db' }}>{(l.tokenCount || 0).toLocaleString('en-US')}</td>
                  <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                    <button 
                      onClick={() => handleToggleStatus(l.id, l.is_active !== false)}
                      style={{
                        padding: '6px 12px',
                        borderRadius: '20px',
                        border: 'none',
                        fontWeight: 'bold',
                        cursor: 'pointer',
                        backgroundColor: l.is_active !== false ? 'rgba(46, 204, 113, 0.2)' : 'rgba(231, 76, 60, 0.2)',
                        color: l.is_active !== false ? '#2ecc71' : '#e74c3c',
                        minWidth: '80px'
                      }}
                    >
                      {l.is_active !== false ? 'مفعل' : 'معطل'}
                    </button>
                  </td>
                  <td style={{ padding: '15px 10px', textAlign: 'center' }}>
                    <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                      <button onClick={() => { 
                        setEditTargetId(l.id); 
                        setEditFullName(l.full_name); 
                        setEditEmail(l.email || '');
                        setEditPassword(''); 
                        setEditQueryLimit(l.query_limit || 150);
                        setEditQueriesUsed(l.queries_used || 0);
                        setEditSubdomain(l.subdomain || '');
                        setEditTitle(l.title || '');
                        setEditPublicPhone(l.public_phone || '');
                        setEditOfficeAddress(l.office_address || '');
                        setEditBio(l.bio || '');
                        setEditModalOpen(true); 
                      }} style={{ background: 'none', border: 'none', color: '#3498db', cursor: 'pointer', padding: '5px' }} title="تعديل البيانات"><Edit size={18} /></button>
                      <button onClick={() => handleDeleteUser(l.id)} disabled={isDeleting} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: isDeleting ? 'not-allowed' : 'pointer', padding: '5px' }} title="حذف الحساب نهائياً"><Trash2 size={18} /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {lawyers.length === 0 && (
                <tr><td colSpan={5} style={{ padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>لا يوجد محامين حالياً. قم بإنشاء حساب جديد من اللوحة المجاورة.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Edit User Modal */}
      {editModalOpen && (
        <div className="modal-overlay" onClick={(e) => { if (e.target === e.currentTarget) setEditModalOpen(false); }}>
          <div className="modal-content" style={{ maxWidth: '500px', width: '95%', maxHeight: '90vh', overflowY: 'auto' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, color: 'var(--accent-color)' }}>تعديل بيانات المحامي</h3>
              <button onClick={() => setEditModalOpen(false)} style={{ background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}><X size={20} /></button>
            </div>
            <form onSubmit={handleEditUser} style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>الاسم بالكامل</label>
                <input type="text" required value={editFullName} onChange={e => setEditFullName(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>البريد الإلكتروني</label>
                <input type="email" required value={editEmail} onChange={e => setEditEmail(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>حد الأسئلة المسموح بها</label>
                <input type="number" required value={editQueryLimit} onChange={e => setEditQueryLimit(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>الأسئلة المستخدمة حالياً</label>
                <input type="number" required value={editQueriesUsed} onChange={e => setEditQueriesUsed(parseInt(e.target.value) || 0)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>النطاق الفرعي (Subdomain)</label>
                <input type="text" value={editSubdomain} onChange={e => setEditSubdomain(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>اسم المكتب (Title)</label>
                <input type="text" value={editTitle} onChange={e => setEditTitle(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>رقم الهاتف العام</label>
                <input type="text" value={editPublicPhone} onChange={e => setEditPublicPhone(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', direction: 'ltr' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>العنوان بالتفصيل</label>
                <input type="text" value={editOfficeAddress} onChange={e => setEditOfficeAddress(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>نبذة عن المحامي/المكتب</label>
                <textarea value={editBio} onChange={e => setEditBio(e.target.value)} style={{ width: '100%', height: '80px', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', fontFamily: 'inherit', resize: 'none' }} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem' }}>كلمة المرور الجديدة (اختياري)</label>
                <input type="password" placeholder="اتركها فارغة لعدم التغيير" value={editPassword} onChange={e => setEditPassword(e.target.value)} style={{ width: '100%', padding: '10px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)' }} />
              </div>
              <button type="submit" disabled={isEditing} className="save-btn" style={{ padding: '12px', marginTop: '10px', backgroundColor: 'var(--accent-color)', color: 'var(--bg-color)', border: 'none', borderRadius: '6px', fontWeight: 'bold', cursor: isEditing ? 'not-allowed' : 'pointer' }}>
                {isEditing ? 'جاري الحفظ...' : 'حفظ التعديلات'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Toast Notification Container */}
      <div className="toast-container">
        {toast && (
          <div className={`toast ${toast.type}`}>
            {toast.type === 'success' ? <CheckCircle2 size={20} /> : <AlertCircle size={20} />}
            {toast.message}
          </div>
        )}
      </div>
    </div>
  );
}
