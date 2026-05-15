'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Paperclip, Send, Settings, BookOpen, FileText, Bot, User, Trash2, Plus, MessageSquare, CheckCircle2 } from 'lucide-react';

interface Message {
  id: string;
  role: 'user' | 'agent';
  content: string;
  fileName?: string;
}

interface Session {
  id: string;
  title: string;
  messages: Message[];
  updatedAt: number;
}

const DEFAULT_WELCOME_MSG: Message = {
  id: '1',
  role: 'agent',
  content: 'مرحباً بك أستاذي. أنا المساعد القانوني الذكي الخاص بك. قمت بالاطلاع على جميع القوانين والمراجع المرفقة وجاهز لتحليل الدعاوى واستخراج الدفوع. تفضل برفع ملف الدعوى واطلب مني ما تشاء.'
};

const THINKING_STEPS = [
  'جاري قراءة وتحليل وقائع الدعوى...',
  'جاري البحث في المراجع وقوانين محكمة النقض...',
  'جاري استخراج الدفوع والثغرات القانونية...',
  'جاري صياغة الرد القانوني والتوثيق من المراجع...'
];

export default function Home() {
  const [apiKey, setApiKey] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [lawFiles, setLawFiles] = useState<string[]>([]);
  
  // Chat History State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [activeSessionId, setActiveSessionId] = useState<string>('');
  
  const [inputMessage, setInputMessage] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(-1);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const thinkingIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize and load sessions
  useEffect(() => {
    const savedKey = localStorage.getItem('gemini_api_key');
    if (savedKey) setApiKey(savedKey);
    else setIsModalOpen(true);

    fetch('/api/files')
      .then(res => res.json())
      .then(data => { if (data.files) setLawFiles(data.files); })
      .catch(err => console.error("Failed to load files", err));

    const savedSessions = localStorage.getItem('law_sessions');
    if (savedSessions) {
      const parsed = JSON.parse(savedSessions);
      setSessions(parsed);
      if (parsed.length > 0) {
        setActiveSessionId(parsed[0].id);
      } else {
        createNewSession();
      }
    } else {
      createNewSession();
    }
  }, []);

  // Save sessions to localStorage whenever they change
  useEffect(() => {
    if (sessions.length > 0) {
      localStorage.setItem('law_sessions', JSON.stringify(sessions));
    }
  }, [sessions]);

  const activeSession = sessions.find(s => s.id === activeSessionId);
  const messages = activeSession ? activeSession.messages : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, currentStepIndex]);

  const createNewSession = () => {
    const newSession: Session = {
      id: Date.now().toString(),
      title: `قضية جديدة ${sessions.length + 1}`,
      messages: [DEFAULT_WELCOME_MSG],
      updatedAt: Date.now()
    };
    setSessions(prev => [newSession, ...prev]);
    setActiveSessionId(newSession.id);
  };

  const updateSessionMessages = (newMessages: Message[], titleUpdate?: string) => {
    setSessions(prev => prev.map(session => {
      if (session.id === activeSessionId) {
        return {
          ...session,
          messages: newMessages,
          title: titleUpdate || session.title,
          updatedAt: Date.now()
        };
      }
      return session;
    }));
  };

  const saveApiKey = () => {
    if (apiKey.trim()) {
      localStorage.setItem('gemini_api_key', apiKey.trim());
      setIsModalOpen(false);
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() && !selectedFile) return;
    if (!apiKey) {
      alert("الرجاء إدخال مفتاح API الخاص بـ Gemini أولاً.");
      setIsModalOpen(true);
      return;
    }

    const newMessageId = Date.now().toString();
    const userMessage: Message = {
      id: newMessageId,
      role: 'user',
      content: inputMessage,
      fileName: selectedFile ? selectedFile.name : undefined
    };

    const updatedMessages = [...messages, userMessage];
    
    // Auto-update title based on first user message if it's currently "قضية جديدة"
    let newTitle = undefined;
    if (activeSession?.title.includes('قضية جديدة') && inputMessage.trim()) {
      newTitle = inputMessage.trim().substring(0, 30) + '...';
    }

    updateSessionMessages(updatedMessages, newTitle);
    setInputMessage('');
    setIsLoading(true);
    setCurrentStepIndex(0);

    // Simulate thinking steps progression
    thinkingIntervalRef.current = setInterval(() => {
      setCurrentStepIndex(prev => {
        if (prev < THINKING_STEPS.length - 1) return prev + 1;
        return prev;
      });
    }, 2500);

    const formData = new FormData();
    formData.append('message', userMessage.content || 'الرجاء تحليل هذا الملف');
    if (selectedFile) {
      formData.append('file', selectedFile);
    }

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'x-api-key': apiKey
        },
        body: formData
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'حدث خطأ غير متوقع');
      }

      const agentMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: data.response
      };

      updateSessionMessages([...updatedMessages, agentMessage]);
      setSelectedFile(null);
    } catch (error: any) {
      console.error(error);
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'agent',
        content: `❌ عذراً، حدث خطأ: ${error.message}`
      };
      updateSessionMessages([...updatedMessages, errorMessage]);
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
    let formatted = text.replace(/\\*\\*(.*?)\\*\\*/g, '<strong>$1</strong>');
    formatted = formatted.replace(/\\n/g, '<br />');
    return <div dangerouslySetInnerHTML={{ __html: formatted }} />;
  };

  return (
    <div className="app-container">
      {/* Sidebar */}
      <aside className="sidebar">
        <button className="new-case-btn" onClick={createNewSession}>
          <Plus size={18} /> محادثة جديدة (قضية جديدة)
        </button>

        <h2><MessageSquare size={18} /> سجل القضايا</h2>
        <div className="session-list">
          {sessions.map(session => (
            <div 
              key={session.id} 
              className={`session-item ${session.id === activeSessionId ? 'active' : ''}`}
              onClick={() => setActiveSessionId(session.id)}
            >
              <div className="session-title">
                <MessageSquare size={14} color={session.id === activeSessionId ? 'var(--accent-color)' : 'var(--text-secondary)'} />
                {session.title}
              </div>
            </div>
          ))}
        </div>

        <div className="section-divider"></div>

        <h2><BookOpen size={18} /> المراجع المرفقة</h2>
        <div className="file-list">
          {lawFiles.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>جاري تحميل الملفات...</p>
          ) : (
            lawFiles.map((file, idx) => (
              <div key={idx} className="file-item">
                <FileText size={14} color="var(--accent-color)" />
                <span title={file}>{file.substring(0, 25)}{file.length > 25 ? '...' : ''}</span>
              </div>
            ))
          )}
        </div>
        
        <div style={{ marginTop: 'auto' }}>
          <button 
            onClick={() => setIsModalOpen(true)}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', padding: '10px' }}
          >
            <Settings size={16} /> الإعدادات ومفتاح API
          </button>
        </div>
      </aside>

      {/* Main Chat Area */}
      <main className="main-chat">
        <header className="chat-header">
          <h1>المستشار القانوني الذكي</h1>
          <Bot size={32} color="var(--accent-color)" />
        </header>

        <div className="chat-messages">
          {messages.map(msg => (
            <div key={msg.id} className={`message ${msg.role}`}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-color)', fontWeight: 'bold' }}>
                {msg.role === 'agent' ? <Bot size={18} /> : <User size={18} />}
                <span>{msg.role === 'agent' ? 'المستشار' : 'أنت'}</span>
              </div>
              
              {msg.fileName && (
                <div style={{ backgroundColor: 'rgba(0,0,0,0.2)', padding: '8px 12px', borderRadius: '6px', marginBottom: '10px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem' }}>
                  <FileText size={14} color="var(--accent-color)" /> 
                  مرفق: {msg.fileName}
                </div>
              )}
              
              <div style={{ lineHeight: '1.7' }}>
                {formatMessage(msg.content)}
              </div>
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
          {selectedFile && (
            <div className="upload-case-area" style={{ marginBottom: '10px' }}>
              <div style={{ backgroundColor: 'var(--user-msg-bg)', padding: '5px 10px', borderRadius: '4px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <FileText size={14} color="var(--accent-color)" />
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
                accept=".pdf,.txt,.docx" 
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
              disabled={isLoading}
            />
            
            <button 
              onClick={handleSendMessage} 
              disabled={isLoading || (!inputMessage.trim() && !selectedFile)}
              title="إرسال"
            >
              <Send size={20} />
            </button>
          </div>
        </div>
      </main>

      {/* Settings Modal */}
      {isModalOpen && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>إعدادات النظام</h3>
            <p style={{ marginBottom: '15px', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              أدخل مفتاح Google Gemini API لتفعيل قدرات الذكاء الاصطناعي للمستشار القانوني.
            </p>
            <input 
              type="password" 
              placeholder="Gemini API Key" 
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
            <button className="save-btn" onClick={saveApiKey}>حفظ وبدء الاستخدام</button>
          </div>
        </div>
      )}
    </div>
  );
}
