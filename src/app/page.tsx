'use client';

import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { Paperclip, Send, Settings, BookOpen, FileText, Bot, User, Trash2, Plus, MessageSquare, CheckCircle2, LogOut, Menu, Download, Image as ImageIcon } from 'lucide-react';

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
  content: 'مرحباً بك أستاذي. أنا المساعد القانوني الذكي الخاص بك. تفضل برفع ملف الدعوى واطلب مني ما تشاء.'
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
  const [cases, setCases] = useState<Case[]>([]);
  const [activeCaseId, setActiveCaseId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([DEFAULT_WELCOME_MSG]);
  
  const isChatLocked = messages.some(msg => msg.role === 'agent' && msg.id !== 'welcome');
  
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const router = useRouter();

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
    fetchCases(session.user.id);
    fetchLawFiles();
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
      // Need to wait for activeCaseId to update, so for now we'll just alert
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
    // Format content for print
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

        <h2 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}><MessageSquare size={16} /> القضايا الخاصة بك</h2>
        <div className="session-list">
          {cases.map(c => (
            <div 
              key={c.id} 
              className={`session-item ${c.id === activeCaseId ? 'active' : ''}`}
              onClick={() => { setActiveCaseId(c.id); setIsSidebarOpen(false); }}
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

      {/* Main Chat Area */}
      <main className="main-chat">
        <header className="chat-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
            <button className="mobile-menu-btn" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <h1>المستشار القانوني الذكي</h1>
          </div>
          <Bot size={32} color="var(--accent-color)" />
        </header>

        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={msg.id || index} className={`message ${msg.role}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                {msg.role === 'agent' ? <Bot size={18} /> : <User size={18} />}
                <span>{msg.role === 'agent' ? 'المستشار' : 'أنت'}</span>
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
      </main>

    </div>
  );
}
