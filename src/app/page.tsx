'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Paperclip, Send, Settings, BookOpen, FileText, Bot, User, Trash2, Plus, MessageSquare, CheckCircle2, LogOut, Menu, Download, Image as ImageIcon, Globe, ClipboardList, Check, X, Edit, Save, Loader2, Calendar } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  file_name?: string;
  created_at?: string;
}

interface Case {
  id: string;
  title: string;
  created_at: string;
}

const DEFAULT_WELCOME_MSG: Message = {
  id: 'welcome',
  role: 'agent',
  content: 'مرحباً بك أستاذي. أنا سَنَد، شريكك القانوني الذكي. تفضل برفع ملف الدعوى واطلب مني ما تشاء.'
};

const THINKING_STEPS = [
  'جاري قراءة وتحليل وقائع الدعوى...',
  'جاري البحث في المراجع وقوانين محكمة النقض السحابية...',
  'جاري استخراج الدفوع والثغرات القانونية...',
  'جاري صياغة الرد القانوني والتوثيق من المراجع...'
];

export default function Home() {
  const [lawFiles, setLawFiles] = useState<any[]>([]);
  
  // Supabase Auth & Cases State
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<any>(null);
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MSG]);
  
  const isChatLocked = false; // Always keep the chat open
  
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

  // Subdomain & Lawyer Profile Settings
  const [activeTab, setActiveTab] = useState<'chat' | 'subdomain' | 'bookings' | 'cases_mgmt'>('chat');
  const [subdomain, setSubdomain] = useState('');
  const [title, setTitle] = useState('');
  const [bio, setBio] = useState('');
  const [officeAddress, setOfficeAddress] = useState('');
  const [publicPhone, setPublicPhone] = useState('');
  const [saveLoading, setSaveLoading] = useState(false);

  // Bookings State
  const [bookings, setBookings] = useState<any[]>([]);

  // Public Case Tracking Management State
  const [mgmtCaseNumber, setMgmtCaseNumber] = useState('');
  const [mgmtClientPhone, setMgmtClientPhone] = useState('');
  const [mgmtStatus, setMgmtStatus] = useState('');
  const [mgmtNextSessionDate, setMgmtNextSessionDate] = useState('');
  const [mgmtLastUpdate, setMgmtLastUpdate] = useState('');
  const [selectedMgmtCaseId, setSelectedMgmtCaseId] = useState('');

  useEffect(() => {
    checkAuthAndLoad();
  }, []);

  useEffect(() => {
    if (activeCaseId) {
      fetchMessages(activeCaseId);
    }
  }, [activeCaseId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStepIndex]);

  const checkAuthAndLoad = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      router.push('/login');
      return;
    }

    // Check profile active status
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single();

    if (profile?.role !== 'admin' && profile?.is_active === false) {
      await supabase.auth.signOut();
      alert("تم إيقاف حسابك مؤقتاً. يرجى التواصل مع الإدارة لتجديد الاشتراك.");
      router.push('/login?error=suspended');
      return;
    }

    setUser(session.user);
    setProfile(profile);
    if (profile) {
      setSubdomain(profile.subdomain || '');
      setTitle(profile.title || '');
      setBio(profile.bio || '');
      setOfficeAddress(profile.office_address || '');
      setPublicPhone(profile.public_phone || '');
    }
    fetchCases(session.user.id);
    fetchLawFiles();
    fetchBookings(session.user.id);
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

  const fetchCases = async (userId: string) => {
    const { data } = await supabase
      .from('cases')
      .select('*')
      .eq('lawyer_id', userId)
      .order('created_at', { ascending: false });
    
    if (data && data.length > 0) {
      setCases(data);
      setActiveCaseId(data[0].id);
    }
  };

  const fetchBookings = async (userId: string) => {
    try {
      const { data, error } = await supabase
        .from('bookings')
        .select('*')
        .eq('lawyer_id', userId)
        .order('created_at', { ascending: false });
      if (data && !error) {
        setBookings(data);
      }
    } catch (e) {
      console.error("Error fetching bookings:", e);
    }
  };

  const fetchMessages = async (caseId: string) => {
    const { data } = await supabase
      .from('messages')
      .select('*')
      .eq('case_id', caseId)
      .order('created_at', { ascending: true });
    
    if (data && data.length > 0) {
      setMessages(data);
    } else {
      setMessages([DEFAULT_WELCOME_MSG]);
    }
  };

  const createNewCase = async () => {
    if (!user) return;
    const title = `قضية جديدة ${cases.length + 1}`;
    const { data, error } = await supabase
      .from('cases')
      .insert([{ lawyer_id: user.id, title }])
      .select()
      .single();
    
    if (data && !error) {
      setCases([data, ...cases]);
      setActiveCaseId(data.id);
      setMessages([DEFAULT_WELCOME_MSG]);
      setActiveTab('chat');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/login');
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedFile) return;
    if (!activeCaseId) {
      await createNewCase();
      if (!activeCaseId) {
         alert("الرجاء تحديد أو إنشاء قضية أولاً");
         return;
      }
    }

    const currentCaseId = activeCaseId;
    const userMsgContent = inputMessage;
    const fileName = selectedFile ? selectedFile.name : undefined;

    // 1. Save User Message to Supabase
    const { data: insertedUserMsg } = await supabase.from('messages').insert([{
      case_id: currentCaseId,
      role: 'user',
      content: userMsgContent,
      file_name: fileName
    }]).select().single();

    if (insertedUserMsg) {
      setMessages(prev => [...prev, insertedUserMsg]);
    }

    setInputMessage('');
    setIsLoading(true);
    setCurrentStepIndex(0);

    // Simulate thinking steps
    thinkingIntervalRef.current = setInterval(() => {
      setCurrentStepIndex(prev => prev < THINKING_STEPS.length - 1 ? prev + 1 : prev);
    }, 2500);

    const formData = new FormData();
    formData.append('message', userMsgContent || 'الرجاء تحليل هذا الملف');
    if (selectedFile) formData.append('file', selectedFile);
    if (user?.id) formData.append('lawyer_id', user.id);

    // Add chat history
    const history = messages
      .filter(m => m.id !== 'welcome') // Ignore welcome msg
      .map(m => ({
        role: m.role === 'agent' ? 'model' : 'user',
        parts: [{ text: m.content }]
      }));
    formData.append('history', JSON.stringify(history));

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        body: formData
      });

      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'حدث خطأ غير متوقع');

      // 2. Save Agent Message to Supabase
      const { data: insertedAgentMsg } = await supabase.from('messages').insert([{
        case_id: currentCaseId,
        role: 'agent',
        content: data.response
      }]).select().single();

      if (insertedAgentMsg) {
        setMessages(prev => [...prev, insertedAgentMsg]);
      }

      // Log AI token usage stats
      if (data.usage && user) {
        try {
          await supabase.from('ai_token_usage').insert([{
            lawyer_id: user.id,
            model_used: data.model || 'gemini-3.5-flash',
            prompt_tokens: data.usage.promptTokens,
            completion_tokens: data.usage.completionTokens,
            total_tokens: data.usage.totalTokens
          }]);
        } catch (e) {
          console.error("Token logging error:", e);
        }
      }

      // Update case title if it's the first real message
      const currentCase = cases.find(c => c.id === currentCaseId);
      if (currentCase?.title.includes('قضية جديدة') && userMsgContent.trim()) {
        const newTitle = userMsgContent.trim().substring(0, 30) + '...';
        await supabase.from('cases').update({ title: newTitle }).eq('id', currentCaseId);
        setCases(cases.map(c => c.id === currentCaseId ? { ...c, title: newTitle } : c));
      }

      setSelectedFile(null);
    } catch (error: any) {
      console.error(error);
      const { data: errData } = await supabase.from('messages').insert([{
        case_id: currentCaseId,
        role: 'agent',
        content: `❌ عذراً، حدث خطأ: ${error.message}`
      }]).select().single();
      if (errData) setMessages(prev => [...prev, errData]);
    } finally {
      setIsLoading(false);
      setCurrentStepIndex(-1);
      if (thinkingIntervalRef.current) clearInterval(thinkingIntervalRef.current);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const formatMessage = (text: string) => {
    let formatted = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\n/g, '<br />');
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  const handleDownloadMemo = (content: string) => {
    let printContent = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    printContent = printContent.replace(/\n/g, '<br />');

    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("الرجاء السماح بالنوافذ المنبثقة (Pop-ups) لتحميل المذكرة.");
      return;
    }

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>مذكرة دفاع</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Amiri:wght@400;700&display=swap');
            @page {
              size: A4;
              margin: 2cm;
            }
            body {
              font-family: 'Amiri', serif;
              background: white;
              color: black;
              line-height: 1.8;
              font-size: 14pt;
              margin: 0;
              padding: 0;
            }
            .memo-container {
              border: 3px double #000;
              padding: 30px;
              min-height: 100vh;
              box-sizing: border-box;
            }
            strong {
              font-size: 1.1em;
            }
          </style>
        </head>
        <body>
          <div class="memo-container">
            ${printContent}
          </div>
          <script>
            window.onload = () => {
              window.print();
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  // Subdomain Settings Save
  const handleSaveSubdomain = async () => {
    if (!subdomain.trim()) {
      alert("الرجاء كتابة اسم النطاق الفرعي (Subdomain).");
      return;
    }
    const subdomainRegex = /^[a-zA-Z0-9-]+$/;
    if (!subdomainRegex.test(subdomain)) {
      alert("اسم النطاق الفرعي يجب أن يحتوي على أحرف إنجليزية وأرقام وعلامة الشرطة (-) فقط، بدون مسافات أو رموز خاصة.");
      return;
    }

    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from('profiles')
        .update({
          subdomain: subdomain.trim().toLowerCase(),
          title: title.trim(),
          bio: bio.trim(),
          office_address: officeAddress.trim(),
          public_phone: publicPhone.trim()
        })
        .eq('id', user.id);

      if (error) throw error;
      
      setProfile({
        ...profile,
        subdomain: subdomain.trim().toLowerCase(),
        title: title.trim(),
        bio: bio.trim(),
        office_address: officeAddress.trim(),
        public_phone: publicPhone.trim()
      });
      alert("تم حفظ إعدادات الموقع وتحديث الدومين الفرعي بنجاح!");
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('unique constraint') || err.code === '23505') {
        alert("عذراً، هذا النطاق الفرعي محجوز لمحامٍ آخر. يرجى اختيار اسم آخر.");
      } else {
        alert("حدث خطأ أثناء حفظ الإعدادات: " + err.message);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  // Booking Actions
  const handleApproveBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'approved' })
        .eq('id', id);
      if (error) throw error;
      setBookings(bookings.map(b => b.id === id ? { ...b, status: 'approved' } : b));
      alert("تم قبول الحجز وتأكيد الموعد بنجاح.");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تحديث حالة الحجز.");
    }
  };

  const handleRejectBooking = async (id: string) => {
    try {
      const { error } = await supabase
        .from('bookings')
        .update({ status: 'rejected' })
        .eq('id', id);
      if (error) throw error;
      setBookings(bookings.map(b => b.id === id ? { ...b, status: 'rejected' } : b));
      alert("تم رفض طلب الحجز.");
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء تحديث حالة الحجز.");
    }
  };

  const handleDeleteBooking = async (id: string) => {
    if (!confirm("هل أنت متأكد من حذف هذا الحجز نهائياً؟")) return;
    try {
      const { error } = await supabase
        .from('bookings')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setBookings(bookings.filter(b => b.id !== id));
    } catch (e) {
      console.error(e);
      alert("حدث خطأ أثناء حذف الحجز.");
    }
  };

  // Public Case Tracking Management
  const handleSelectMgmtCase = (caseId: string) => {
    setSelectedMgmtCaseId(caseId);
    const c = cases.find(item => item.id === caseId);
    if (c) {
      const anyCase = c as any;
      setMgmtCaseNumber(anyCase.case_number || '');
      setMgmtClientPhone(anyCase.client_phone || '');
      setMgmtStatus(anyCase.status || 'قيد المراجعة');
      setMgmtNextSessionDate(anyCase.next_session_date || '');
      setMgmtLastUpdate(anyCase.last_update || '');
    }
  };

  const handleSaveCaseMgmt = async () => {
    if (!selectedMgmtCaseId) {
      alert("الرجاء اختيار قضية لتعديلها أولاً.");
      return;
    }
    if (!mgmtCaseNumber.trim() || !mgmtClientPhone.trim()) {
      alert("رقم القضية ورقم هاتف الموكل حقول إجبارية للتتبع.");
      return;
    }

    setSaveLoading(true);
    try {
      const { error } = await supabase
        .from('cases')
        .update({
          case_number: mgmtCaseNumber.trim(),
          client_phone: mgmtClientPhone.trim(),
          status: mgmtStatus.trim(),
          next_session_date: mgmtNextSessionDate ? mgmtNextSessionDate : null,
          last_update: mgmtLastUpdate.trim()
        })
        .eq('id', selectedMgmtCaseId);

      if (error) throw error;

      setCases(cases.map(c => c.id === selectedMgmtCaseId ? {
        ...c,
        case_number: mgmtCaseNumber.trim(),
        client_phone: mgmtClientPhone.trim(),
        status: mgmtStatus.trim(),
        next_session_date: mgmtNextSessionDate,
        last_update: mgmtLastUpdate.trim()
      } as any : c));

      alert("تم حفظ تفاصيل تتبع القضية بنجاح!");
    } catch (err: any) {
      console.error(err);
      if (err.message?.includes('unique constraint') || err.code === '23505') {
        alert("رقم القضية هذا مستخدم بالفعل لقضية أخرى. يرجى إدخال رقم قضية فريد.");
      } else {
        alert("حدث خطأ أثناء حفظ تفاصيل التتبع: " + err.message);
      }
    } finally {
      setSaveLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Sidebar Overlay for Mobile */}
      <div className={`sidebar-overlay ${isSidebarOpen ? 'open' : ''}`} onClick={() => setIsSidebarOpen(false)}></div>

      {/* Sidebar */}
      <aside className={`sidebar ${isSidebarOpen ? 'open' : ''}`}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
          <h2 style={{ margin: 0 }}><Bot size={20} /> مساحة المحامي</h2>
          <button onClick={handleLogout} style={{ background: 'none', border: 'none', color: '#e74c3c', cursor: 'pointer' }} title="تسجيل الخروج"><LogOut size={18} /></button>
        </div>

        <button className="new-case-btn" onClick={createNewCase}>
          <Plus size={18} /> إضافة قضية جديدة
        </button>

        {/* Remaining Questions Progress Card */}
        {profile && profile.role !== 'admin' && (
          <div style={{ 
            backgroundColor: 'rgba(212, 175, 55, 0.1)', 
            padding: '12px 15px', 
            borderRadius: '8px', 
            border: '1px solid rgba(212, 175, 55, 0.2)', 
            margin: '15px 0', 
            display: 'flex', 
            flexDirection: 'column', 
            gap: '5px' 
          }}>
            <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>باقة الأسئلة المتاحة:</span>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: 'var(--accent-color)' }}>
                {Math.max(0, (profile.query_limit || 150) - (profile.queries_used || 0))} سؤال متبقي
              </span>
              <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                من أصل {profile.query_limit || 150}
              </span>
            </div>
            {/* Gold Progress Bar */}
            <div style={{ width: '100%', height: '5px', backgroundColor: 'rgba(255,255,255,0.1)', borderRadius: '3px', marginTop: '5px', overflow: 'hidden' }}>
              <div style={{ 
                width: `${Math.min(100, Math.max(0, 100 - (((profile.queries_used || 0) / (profile.query_limit || 150)) * 100)))}%`, 
                height: '100%', 
                backgroundColor: 'var(--accent-color)',
                transition: 'width 0.3s ease'
              }}></div>
            </div>
          </div>
        )}

        {/* Subdomain SaaS Navigation Tabs */}
        <div className="section-divider"></div>
        <h2 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><Globe size={16} /> موقعك الإلكتروني (SaaS)</h2>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '20px' }}>
          <button 
            onClick={() => { setActiveTab('chat'); setIsSidebarOpen(false); }}
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              backgroundColor: activeTab === 'chat' ? 'var(--user-msg-bg)' : 'transparent',
              border: activeTab === 'chat' ? '1px solid var(--accent-color)' : '1px solid transparent',
              borderRadius: '8px',
              color: activeTab === 'chat' ? 'var(--accent-color)' : 'var(--text-primary)',
              textAlign: 'right',
              fontWeight: 'normal',
              cursor: 'pointer'
            }}
          >
            <MessageSquare size={16} /> المحادثة الذكية (AI)
          </button>
          
          <button 
            onClick={() => { setActiveTab('subdomain'); setIsSidebarOpen(false); }}
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              backgroundColor: activeTab === 'subdomain' ? 'var(--user-msg-bg)' : 'transparent',
              border: activeTab === 'subdomain' ? '1px solid var(--accent-color)' : '1px solid transparent',
              borderRadius: '8px',
              color: activeTab === 'subdomain' ? 'var(--accent-color)' : 'var(--text-primary)',
              textAlign: 'right',
              fontWeight: 'normal',
              cursor: 'pointer'
            }}
          >
            <Globe size={16} /> إعدادات موقعك الفرعي
          </button>

          <button 
            onClick={() => { setActiveTab('bookings'); setIsSidebarOpen(false); }}
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              backgroundColor: activeTab === 'bookings' ? 'var(--user-msg-bg)' : 'transparent',
              border: activeTab === 'bookings' ? '1px solid var(--accent-color)' : '1px solid transparent',
              borderRadius: '8px',
              color: activeTab === 'bookings' ? 'var(--accent-color)' : 'var(--text-primary)',
              textAlign: 'right',
              fontWeight: 'normal',
              cursor: 'pointer'
            }}
          >
            <Calendar size={16} /> طلبات حجز الموكلين
          </button>

          <button 
            onClick={() => { setActiveTab('cases_mgmt'); setIsSidebarOpen(false); }}
            style={{ 
              width: '100%', 
              padding: '10px 12px', 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              backgroundColor: activeTab === 'cases_mgmt' ? 'var(--user-msg-bg)' : 'transparent',
              border: activeTab === 'cases_mgmt' ? '1px solid var(--accent-color)' : '1px solid transparent',
              borderRadius: '8px',
              color: activeTab === 'cases_mgmt' ? 'var(--accent-color)' : 'var(--text-primary)',
              textAlign: 'right',
              fontWeight: 'normal',
              cursor: 'pointer'
            }}
          >
            <ClipboardList size={16} /> تتبع قضايا الموكلين
          </button>
        </div>

        <div className="section-divider"></div>

        <h2 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><MessageSquare size={16} /> القضايا الخاصة بك</h2>
        <div className="session-list">
          {cases.map(c => (
            <div 
              key={c.id} 
              className={`session-item ${c.id === activeCaseId ? 'active' : ''}`}
              onClick={() => { setActiveCaseId(c.id); setActiveTab('chat'); setIsSidebarOpen(false); }}
            >
              <div className="session-title">
                <MessageSquare size={14} color={c.id === activeCaseId ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                {c.title}
              </div>
            </div>
          ))}
          {cases.length === 0 && <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>لا يوجد قضايا حالياً</p>}
        </div>

        <div className="section-divider"></div>

        <h2 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><BookOpen size={16} /> مراجع النظام (السحابية)</h2>
        <div className="file-list">
          {lawFiles.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>لا يوجد مراجع مرفوعة من الإدارة...</p>
          ) : (
            lawFiles.map((file, idx) => (
              <div key={idx} className="file-item">
                <FileText size={14} color="var(--accent-color)" />
                <span title={file.name}>{file.name.substring(0, 25)}{file.name.length > 25 ? '...' : ''}</span>
              </div>
            ))
          )}
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-chat">
        <header className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h1>
              {activeTab === 'chat' && 'سَنَد | شريكك القانوني الذكي'}
              {activeTab === 'subdomain' && 'إعدادات موقعك الإلكتروني الفرعي'}
              {activeTab === 'bookings' && 'إدارة حجوزات واستشارات الموكلين'}
              {activeTab === 'cases_mgmt' && 'تفعيل تتبع قضايا الموكلين'}
            </h1>
          </div>
          <Bot size={32} color="var(--accent-color)" />
        </header>

        {/* TAB 1: Chat Workspace */}
        {activeTab === 'chat' && (
          <>
            <div className="chat-messages">
              {messages.map((msg, index) => (
                <div key={msg.id || index} className={`message ${msg.role}`}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                    {msg.role === 'agent' ? <Bot size={18} /> : <User size={18} />}
                    <span>{msg.role === 'agent' ? 'سَنَد' : 'أنت'}</span>
                  </div>
                  
                  {msg.file_name && (
                    <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                      <FileText size={14} color="var(--accent-color)" /> 
                      مرفق: {msg.file_name}
                    </div>
                  )}
                  
                  <div style={{ lineHeight: '1.7' }}>
                    {formatMessage(msg.content)}
                  </div>
                  
                  {msg.role === 'agent' && msg.id !== 'welcome' && (
                    <div style={{ marginTop: '15px', display: 'flex', justifyContent: 'flex-end' }}>
                      <button 
                        onClick={() => handleDownloadMemo(msg.content)}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          backgroundColor: 'var(--accent-color)',
                          color: 'var(--bg-color)',
                          border: 'none',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: 'bold',
                          fontSize: '0.9rem'
                        }}
                        title="تحميل وطباعة مذكرة الدفاع بالتنسيق الرسمي"
                      >
                        <Download size={16} /> طباعة المذكرة (PDF)
                      </button>
                    </div>
                  )}
                </div>
              ))}

              {/* Thinking Steps UI */}
              {isLoading && currentStepIndex >= 0 && (
                <div className="thinking-container">
                  {THINKING_STEPS.map((step, index) => {
                    if (index > currentStepIndex) return null;
                    const isActive = index === currentStepIndex;
                    const isCompleted = index < currentStepIndex;
                    
                    return (
                      <div key={index} className={`thinking-step ${isActive ? 'active' : ''}`}>
                        {isActive ? (
                          <div className="spinner"></div>
                        ) : isCompleted ? (
                          <CheckCircle2 size={16} color="var(--accent-color)" />
                        ) : null}
                        <span>{step}</span>
                      </div>
                    );
                  })}
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            <div className="input-area">
              {isChatLocked ? (
                <div style={{ textAlign: 'center', padding: '20px', backgroundColor: 'var(--panel-bg)', borderRadius: '8px', border: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                  تم إغلاق هذه القضية وإصدار المذكرة. يرجى <button onClick={createNewCase} style={{ background: 'none', border: 'none', color: 'var(--accent-color)', cursor: 'pointer', fontWeight: 'bold', textDecoration: 'underline', padding: 0 }}>فتح قضية جديدة</button> لطلب جديد.
                </div>
              ) : (
                <>
                  {selectedFile && (
                    <div className="upload-case-area" style={{ marginBottom: '10px' }}>
                      <div style={{ backgroundColor: 'var(--user-msg-bg)', padding: '5px 10px', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        {selectedFile.type.startsWith('image/') ? <ImageIcon size={14} color="var(--accent-color)" /> : <FileText size={14} color="var(--accent-color)" />}
                        {selectedFile.name}
                        <Trash2 
                          size={14} 
                          color="#e74c3c" 
                          style={{ cursor: 'pointer', marginLeft: '10px' }} 
                          onClick={() => setSelectedFile(null)} 
                        />
                      </div>
                    </div>
                  )}

                  <div className="input-box">
                    <label className="file-input-label" title="إرفاق ملف الدعوى">
                      <input 
                        type="file" 
                        style={{ display: 'none' }} 
                        accept=".pdf,.txt,.png,.jpg,.jpeg,.webp" 
                        onChange={(e) => {
                          if (e.target.files && e.target.files.length > 0) {
                            setSelectedFile(e.target.files[0]);
                          }
                        }}
                      />
                      <Paperclip size={20} />
                    </label>
                    
                    <textarea 
                      placeholder='اكتب هنا (مثال: "حلل هذه الدعوى بصفتك محامي المدعى عليه واستخرج لي أقوى 3 دفوع قانونية...")'
                      value={inputMessage}
                      onChange={(e) => setInputMessage(e.target.value)}
                      onKeyDown={handleKeyDown}
                      disabled={isLoading || !activeCaseId}
                    />
                    
                    <button 
                      onClick={handleSendMessage} 
                      disabled={isLoading || (!inputMessage.trim() && !selectedFile) || !activeCaseId}
                      title="إرسال"
                    >
                      <Send size={20} />
                    </button>
                  </div>
                </>
              )}
            </div>
          </>
        )}

        {/* TAB 2: Subdomain Settings */}
        {activeTab === 'subdomain' && (
          <div style={{ padding: '30px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto', width: '100%', direction: 'rtl' }}>
            
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ color: 'var(--accent-color)', fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>معلومات الموقع والنطاق</h3>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>النطاق الفرعي (Subdomain)</label>
                <div style={{ display: 'flex', alignItems: 'stretch', direction: 'ltr' }}>
                  <span style={{ backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRight: 'none', padding: '10px 15px', display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', fontSize: '0.9rem', borderTopLeftRadius: '6px', borderBottomLeftRadius: '6px' }}>
                    .sanad-law.vercel.app
                  </span>
                  <input 
                    type="text" 
                    value={subdomain} 
                    onChange={(e) => setSubdomain(e.target.value)}
                    placeholder="e.g. ahmed-lawyer" 
                    style={{ flex: 1, padding: '10px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderTopRightRadius: '6px', borderBottomRightRadius: '6px', color: 'var(--text-primary)', outline: 'none', direction: 'ltr' }}
                  />
                </div>
                {subdomain.trim() && (
                  <div style={{ marginTop: '12px', fontSize: '0.85rem', color: 'var(--text-secondary)', direction: 'rtl', textAlign: 'right', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    <div>
                      <span>🔗 رابط المعاينة والوصول المباشر (التجريبي): </span>
                      <a href={`https://sanad-law.vercel.app/lawyers/${subdomain.toLowerCase()}`} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-color)', textDecoration: 'underline', fontWeight: 'bold', marginRight: '5px' }}>
                        {`https://sanad-law.vercel.app/lawyers/${subdomain.toLowerCase()}`}
                      </a>
                    </div>
                    <div style={{ opacity: 0.85, fontSize: '0.8rem' }}>
                      <span>🌐 رابط الدومين الفرعي (يتطلب دومين مخصص): </span>
                      <a href={`https://${subdomain.toLowerCase()}.sanad-law.vercel.app`} target="_blank" rel="noreferrer" style={{ color: 'var(--text-primary)', textDecoration: 'underline', marginRight: '5px' }}>
                        {`https://${subdomain.toLowerCase()}.sanad-law.vercel.app`}
                      </a>
                      <span style={{ color: '#e74c3c', marginRight: '5px', fontSize: '0.75rem' }}>(غير مدعوم افتراضياً على vercel.app بدون إضافة دومين مخصص لمشروعك في Vercel)</span>
                    </div>
                  </div>
                )}
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>اسم المكتب (Title)</label>
                  <input 
                    type="text" 
                    value={title} 
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="مثال: مكتب الأستاذ أحمد علي للمحاماة" 
                    style={{ width: '100%', padding: '10px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                  />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>رقم هاتف التواصل العام</label>
                  <input 
                    type="text" 
                    value={publicPhone} 
                    onChange={(e) => setPublicPhone(e.target.value)}
                    placeholder="رقم الهاتف العام المعروض للعملاء" 
                    style={{ width: '100%', padding: '10px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', direction: 'ltr', textAlign: 'right' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>عنوان المكتب التفصيلي</label>
                <input 
                  type="text" 
                  value={officeAddress} 
                  onChange={(e) => setOfficeAddress(e.target.value)}
                  placeholder="مثال: القاهرة، الدقي، شارع التحرير، برج الأهرام، الدور الخامس" 
                  style={{ width: '100%', padding: '10px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                />
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>نبذة عن المكتب أو المحامي (Bio)</label>
                <textarea 
                  value={bio} 
                  onChange={(e) => setBio(e.target.value)}
                  placeholder="اكتب نبذة تظهر للزوار في الصفحة الرئيسية..."
                  style={{ width: '100%', height: '100px', padding: '12px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', resize: 'none' }}
                />
              </div>

              <button 
                onClick={handleSaveSubdomain} 
                disabled={saveLoading}
                style={{ alignSelf: 'flex-start', padding: '12px 30px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
              >
                {saveLoading ? <Loader2 className="spinner" size={18} /> : <><Save size={18} /> حفظ إعدادات الموقع</>}
              </button>

            </div>

          </div>
        )}

        {/* TAB 3: Bookings Manager */}
        {activeTab === 'bookings' && (
          <div style={{ padding: '30px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', width: '100%', maxWidth: '1000px', margin: '0 auto', direction: 'rtl' }}>
            
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '25px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ color: 'var(--accent-color)', fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>طلبات حجز الاستشارات الواردة</h3>
                <button onClick={() => user && fetchBookings(user.id)} style={{ padding: '6px 12px', fontSize: '0.8rem', backgroundColor: 'var(--user-msg-bg)', border: '1px solid var(--border-color)', color: 'var(--text-primary)' }}>تحديث</button>
              </div>

              {bookings.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', textAlign: 'center', padding: '40px 0', fontSize: '0.95rem' }}>لا توجد طلبات حجز مواعيد مرسلة من الموكلين عبر موقعك الفرعي حالياً.</p>
              ) : (
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'right', fontSize: '0.9rem' }}>
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)' }}>
                        <th style={{ padding: '12px' }}>اسم العميل</th>
                        <th style={{ padding: '12px' }}>رقم الهاتف</th>
                        <th style={{ padding: '12px' }}>التاريخ المطلوب</th>
                        <th style={{ padding: '12px' }}>موضوع الاستشارة</th>
                        <th style={{ padding: '12px' }}>الحالة</th>
                        <th style={{ padding: '12px', textAlign: 'center' }}>الخيارات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.map((booking) => (
                        <tr key={booking.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                          <td style={{ padding: '12px', fontWeight: 'bold' }}>{booking.client_name}</td>
                          <td style={{ padding: '12px', direction: 'ltr', textAlign: 'right' }}>{booking.client_phone}</td>
                          <td style={{ padding: '12px' }}>{new Date(booking.appointment_date).toLocaleDateString('ar-EG')}</td>
                          <td style={{ padding: '12px', maxWidth: '250px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }} title={booking.notes}>{booking.notes || '—'}</td>
                          <td style={{ padding: '12px' }}>
                            {booking.status === 'pending' && <span style={{ backgroundColor: 'rgba(241,196,15,0.1)', color: '#f1c40f', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>معلق</span>}
                            {booking.status === 'approved' && <span style={{ backgroundColor: 'rgba(46,204,113,0.1)', color: '#2ece72', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>مقبول</span>}
                            {booking.status === 'rejected' && <span style={{ backgroundColor: 'rgba(231,76,60,0.1)', color: '#e74c3c', padding: '4px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 'bold' }}>مرفوض</span>}
                          </td>
                          <td style={{ padding: '12px', display: 'flex', gap: '8px', justifyContent: 'center', alignItems: 'center' }}>
                            {booking.status === 'pending' && (
                              <>
                                <button onClick={() => handleApproveBooking(booking.id)} style={{ padding: '5px 10px', backgroundColor: '#2ece72', color: '#0f1115', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <Check size={12} /> قبول
                                </button>
                                <button onClick={() => handleRejectBooking(booking.id)} style={{ padding: '5px 10px', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                  <X size={12} /> رفض
                                </button>
                              </>
                            )}
                            <button onClick={() => handleDeleteBooking(booking.id)} style={{ padding: '5px', backgroundColor: 'transparent', border: '1px solid #e74c3c', color: '#e74c3c', borderRadius: '4px', cursor: 'pointer' }} title="حذف">
                              <Trash2 size={12} />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

            </div>

          </div>
        )}

        {/* TAB 4: Case Tracking Management */}
        {activeTab === 'cases_mgmt' && (
          <div style={{ padding: '30px', overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '800px', margin: '0 auto', width: '100%', direction: 'rtl' }}>
            
            <div style={{ backgroundColor: 'var(--panel-bg)', border: '1px solid var(--border-color)', borderRadius: '12px', padding: '25px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <h3 style={{ color: 'var(--accent-color)', fontSize: '1.2rem', margin: 0, fontWeight: 'bold' }}>تفعيل تتبع قضية للموكل</h3>
              
              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>اختر القضية المحددة للتعديل</label>
                <select 
                  value={selectedMgmtCaseId} 
                  onChange={(e) => handleSelectMgmtCase(e.target.value)}
                  style={{ width: '100%', padding: '12px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', fontSize: '0.95rem' }}
                >
                  <option value="">-- اختر من قضايا المحادثة الحالية --</option>
                  {cases.map((c) => (
                    <option key={c.id} value={c.id}>{c.title}</option>
                  ))}
                </select>
              </div>

              {selectedMgmtCaseId && (
                <div className="animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px', borderTop: '1px solid var(--border-color)', paddingTop: '20px' }}>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>رقم القضية في المحكمة (Case ID)</label>
                      <input 
                        type="text" 
                        value={mgmtCaseNumber} 
                        onChange={(e) => setMgmtCaseNumber(e.target.value)}
                        placeholder="مثال: CASE-20043" 
                        style={{ width: '100%', padding: '10px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>رقم هاتف الموكل للتحقق</label>
                      <input 
                        type="tel" 
                        value={mgmtClientPhone} 
                        onChange={(e) => setMgmtClientPhone(e.target.value)}
                        placeholder="رقم الهاتف للتحقق أثناء الاستعلام" 
                        style={{ width: '100%', padding: '10px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', direction: 'ltr', textAlign: 'right' }}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>حالة الدعوى العامة</label>
                      <input 
                        type="text" 
                        value={mgmtStatus} 
                        onChange={(e) => setMgmtStatus(e.target.value)}
                        placeholder="مثال: قيد المرافعة / مؤجلة للمستندات" 
                        style={{ width: '100%', padding: '10px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none' }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>تاريخ موعد الجلسة القادمة</label>
                      <input 
                        type="date" 
                        value={mgmtNextSessionDate} 
                        onChange={(e) => setMgmtNextSessionDate(e.target.value)}
                        style={{ width: '100%', padding: '10px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', direction: 'rtl' }}
                      />
                    </div>
                  </div>

                  <div>
                    <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>آخر الإجراءات أو التطورات المتخذة (للموكل)</label>
                    <textarea 
                      value={mgmtLastUpdate} 
                      onChange={(e) => setMgmtLastUpdate(e.target.value)}
                      placeholder="صف بالتفصيل ما تم في الجلسة أو ما هي الأوراق المطلوبة من الموكل حالياً..."
                      style={{ width: '100%', height: '100px', padding: '12px 15px', backgroundColor: 'var(--bg-color)', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', outline: 'none', fontFamily: 'inherit', resize: 'none' }}
                    />
                  </div>

                  <button 
                    onClick={handleSaveCaseMgmt} 
                    disabled={saveLoading}
                    style={{ alignSelf: 'flex-start', padding: '12px 30px', display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 'bold' }}
                  >
                    {saveLoading ? <Loader2 className="spinner" size={18} /> : <><Save size={18} /> حفظ تفاصيل التتبع</>}
                  </button>

                </div>
              )}

            </div>

          </div>
        )}

      </main>

    </div>
  );
}
