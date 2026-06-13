'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Scale, Calendar, Phone, User, FileText, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function LawyerBooking({ params }: { params: { subdomain: string } }) {
  const { subdomain } = params;
  const [lawyer, setLawyer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const getLinkPath = (path: string) => {
    if (typeof window !== 'undefined') {
      if (window.location.pathname.startsWith('/lawyers/')) {
        return `/lawyers/${subdomain}${path === '/' ? '' : path}`;
      }
    }
    return path;
  };

  const getNextDays = () => {
    const days = [];
    const weekdays = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'];
    const months = [
      'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
      'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
    ];
    
    for (let i = 0; i < 7; i++) {
      const date = new Date();
      date.setDate(date.getDate() + i);
      
      const year = date.getFullYear();
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const day = String(date.getDate()).padStart(2, '0');
      const value = `${year}-${month}-${day}`;
      
      const dayName = weekdays[date.getDay()];
      const dayNum = date.getDate();
      const monthName = months[date.getMonth()];
      const label = `${dayNum} ${monthName}`;
      
      days.push({
        value,
        dayName,
        label,
        isToday: i === 0,
        isTomorrow: i === 1
      });
    }
    return days;
  };

  const [submitLoading, setSubmitLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    date: '',
    notes: ''
  });

  useEffect(() => {
    fetchLawyerProfile();
  }, [subdomain]);

  const fetchLawyerProfile = async () => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('subdomain', subdomain)
        .single();

      if (data && !error) {
        setLawyer(data);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lawyer) return;
    setSubmitLoading(true);
    setError('');

    try {
      const { error: insertError } = await supabase
        .from('bookings')
        .insert([{
          lawyer_id: lawyer.id,
          client_name: formData.name,
          client_phone: formData.phone,
          appointment_date: formData.date,
          notes: formData.notes,
          status: 'pending'
        }]);

      if (insertError) throw insertError;
      setSuccess(true);

      // WhatsApp Redirect
      try {
        let publicPhone = lawyer.public_phone || '';
        const cleanPhone = publicPhone.replace(/[^\d]/g, '');
        let normalizedPhone = cleanPhone;
        if (cleanPhone.startsWith('01') && cleanPhone.length === 11) {
          normalizedPhone = '2' + cleanPhone;
        }
        
        const messageText = `السلام عليكم أستاذ ${lawyer.full_name}، أود حجز موعد استشارة قانونية من خلال موقعك الإلكتروني.
        
📋 تفاصيل طلب الاستشارة:
- الاسم: ${formData.name}
- رقم الهاتف: ${formData.phone}
- التاريخ المفضل: ${formData.date}
- الاستشارة/الملاحظات: ${formData.notes || 'لا يوجد'}`;

        const whatsappUrl = `https://api.whatsapp.com/send?phone=${normalizedPhone}&text=${encodeURIComponent(messageText)}`;
        if (typeof window !== 'undefined') {
          window.location.href = whatsappUrl;
        }
      } catch (err) {
        console.error("Error opening WhatsApp:", err);
      }

    } catch (err: any) {
      console.error(err);
      setError('حدث خطأ أثناء إرسال طلب الحجز. يرجى مراجعة البيانات والمحاولة لاحقاً.');
    } finally {
      setSubmitLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ display: 'flex', width: '100%', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1115' }}>
        <Loader2 className="spinner" size={48} />
      </div>
    );
  }

  if (!lawyer) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', width: '100%', height: '100vh', justifyContent: 'center', alignItems: 'center', backgroundColor: '#0f1115', color: '#e2e8f0', padding: '20px', textAlign: 'center' }}>
        <Scale size={64} color="#d4af37" style={{ marginBottom: '20px' }} />
        <h2>عفواً، الموقع غير موجود</h2>
        <a href="https://sanad-law.vercel.app" style={{ color: '#d4af37', textDecoration: 'underline', marginTop: '20px' }}>العودة لمنصة سَنَد الرئيسية</a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#0f1115', color: '#e2e8f0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      
      {/* Header */}
      <header style={{ width: '100%', padding: '20px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d3748', backgroundColor: '#1a1d24' }}>
        <Link href={getLinkPath('/')} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d4af37', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
          <ArrowLeft size={16} /> العودة للرئيسية
        </Link>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', direction: 'rtl' }}>
          <Scale size={24} color="#d4af37" />
          <span style={{ fontSize: '1.05rem', fontWeight: 'bold', color: '#e2e8f0' }}>{lawyer.title || lawyer.full_name}</span>
        </div>
      </header>

      {/* Main Container */}
      <main style={{ flex: '1', display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '40px 20px' }}>
        <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#1a1d24', border: '1px solid #2d3748', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          
          {success ? (
            <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '15px' }}>
              <CheckCircle2 size={64} color="#2ece72" />
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#2ece72' }}>تم تسجيل طلب الحجز بنجاح</h3>
              <p style={{ color: '#94a3b8', lineHeight: '1.7', fontSize: '0.95rem' }}>
                تم استلام طلب موعدك بنجاح. يرجى الضغط على الزر الأخضر أدناه للانتقال إلى واتساب وتأكيد حجزك فوراً مع مكتب الأستاذ.
              </p>
              
              <a 
                href={`https://api.whatsapp.com/send?phone=${(lawyer.public_phone || '').replace(/[^\d]/g, '').startsWith('01') ? '2' + (lawyer.public_phone || '').replace(/[^\d]/g, '') : (lawyer.public_phone || '').replace(/[^\d]/g, '')}&text=${encodeURIComponent(`السلام عليكم أستاذ ${lawyer.full_name}، أود تأكيد حجز موعد استشارة قانونية.
- الاسم: ${formData.name}
- رقم الهاتف: ${formData.phone}
- التاريخ: ${formData.date}
- الاستشارة: ${formData.notes || 'لا يوجد'}`)}`}
                target="_blank" 
                rel="noreferrer"
                style={{ 
                  marginTop: '10px', 
                  color: '#ffffff', 
                  backgroundColor: '#25D366', 
                  padding: '12px 25px', 
                  borderRadius: '8px', 
                  fontWeight: 'bold', 
                  textDecoration: 'none', 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  boxShadow: '0 4px 15px rgba(37, 211, 102, 0.4)',
                  transition: 'all 0.2s',
                  fontSize: '0.95rem'
                }}
              >
                <svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor">
                  <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 001.333 4.982L2 22l5.233-1.371a9.936 9.936 0 004.773 1.218h.004c5.502 0 9.987-4.478 9.988-9.984 0-2.669-1.037-5.176-2.922-7.062C17.182 3.037 14.677 2 12.012 2zm0 1.711c2.204 0 4.277.859 5.838 2.421 1.562 1.562 2.421 3.634 2.421 5.84-.001 4.545-3.697 8.236-8.243 8.236-1.503 0-2.977-.41-4.264-1.189l-.306-.182-3.17.831.846-3.093-.2-.318a8.204 8.204 0 01-1.258-4.283c.001-4.546 3.699-8.246 8.245-8.246zm-2.072 3.823c-.157-.348-.323-.356-.473-.362-.122-.005-.262-.005-.402-.005a.774.774 0 00-.56.262c-.193.21-.735.717-.735 1.748s.75 2.028.855 2.168c.105.14 1.474 2.25 3.572 3.156.499.215.888.344 1.192.44.502.158.959.135 1.32.081.402-.06 1.226-.502 1.398-.987.172-.485.172-.9.121-.987-.05-.087-.193-.14-.403-.245s-1.226-.605-1.415-.674-.323-.105-.46.087c-.137.193-.53.674-.649.805-.12.13-.238.148-.448.043-.21-.105-.888-.327-1.692-1.044-.625-.558-1.047-1.247-1.17-1.457-.122-.21-.013-.323.092-.428.095-.095.21-.245.316-.367.105-.122.14-.21.21-.349.07-.14.035-.262-.018-.367-.052-.105-.466-1.123-.639-1.54z"/>
                </svg>
                متابعة عبر واتساب لتأكيد الحجز
              </a>

              <Link href={getLinkPath('/')} style={{ marginTop: '15px', color: '#94a3b8', fontSize: '0.85rem', textDecoration: 'none', display: 'inline-block', borderBottom: '1px dashed #94a3b8' }}>
                العودة للموقع
              </Link>
            </div>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ textAlign: 'center', marginBottom: '10px' }}>
                <h3 style={{ fontSize: '1.35rem', color: '#d4af37', fontWeight: 'bold', marginBottom: '8px' }}>طلب حجز موعد مقابلة</h3>
                <p style={{ color: '#94a3b8', fontSize: '0.85rem' }}>برجاء ملء البيانات وسيقوم المكتب بالاتصال بك لتأكيد الموعد.</p>
              </div>

              {error && (
                <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', border: '1px solid #e74c3c', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center' }}>
                  {error}
                </div>
              )}

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>الاسم بالكامل</label>
                <div style={{ position: 'relative' }}>
                  <User size={16} color="#d4af37" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="text" 
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleChange}
                    placeholder="اكتب اسمك الثلاثي"
                    style={{ width: '100%', padding: '12px 40px 12px 12px', backgroundColor: '#0f1115', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', outline: 'none' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>رقم الهاتف المحمول</label>
                <div style={{ position: 'relative' }}>
                  <Phone size={16} color="#d4af37" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="tel" 
                    name="phone"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="مثال: 01xxxxxxxxx"
                    style={{ width: '100%', padding: '12px 40px 12px 12px', backgroundColor: '#0f1115', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', outline: 'none', direction: 'ltr', textAlign: 'right' }}
                  />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: '#94a3b8' }}>التاريخ المفضل للمقابلة:</label>
                
                {/* Quick Date Picker */}
                <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px', direction: 'rtl', scrollbarWidth: 'none' }}>
                  {getNextDays().map((day) => {
                    const isSelected = formData.date === day.value;
                    return (
                      <button
                        key={day.value}
                        type="button"
                        onClick={() => setFormData(prev => ({ ...prev, date: day.value }))}
                        style={{
                          flex: '0 0 auto',
                          minWidth: '85px',
                          padding: '8px 6px',
                          borderRadius: '8px',
                          border: isSelected ? '2px solid #d4af37' : '1px solid #2d3748',
                          backgroundColor: isSelected ? 'rgba(212, 175, 55, 0.15)' : '#0f1115',
                          color: isSelected ? '#d4af37' : '#e2e8f0',
                          cursor: 'pointer',
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: '2px',
                          transition: 'all 0.2s ease',
                          outline: 'none'
                        }}
                      >
                        <span style={{ fontSize: '0.7rem', opacity: 0.75 }}>
                          {day.isToday ? 'اليوم' : day.isTomorrow ? 'غداً' : day.dayName}
                        </span>
                        <span style={{ fontSize: '0.85rem', fontWeight: 'bold' }}>{day.label}</span>
                      </button>
                    );
                  })}
                </div>

                {/* Custom Date Picker */}
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} color="#d4af37" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }} />
                  <input 
                    type="date" 
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleChange}
                    onClick={(e) => {
                      try {
                        (e.target as any).showPicker?.();
                      } catch (err) {}
                    }}
                    style={{ width: '100%', padding: '12px 40px 12px 12px', backgroundColor: '#0f1115', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', outline: 'none', direction: 'rtl', cursor: 'pointer' }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>ملاحظات أو موضوع الاستشارة</label>
                <div style={{ position: 'relative' }}>
                  <FileText size={16} color="#d4af37" style={{ position: 'absolute', right: '12px', top: '15px' }} />
                  <textarea 
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    placeholder="اكتب نبذة مختصرة عن مشكلتك القانونية..."
                    style={{ width: '100%', height: '100px', padding: '12px 40px 12px 12px', backgroundColor: '#0f1115', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', outline: 'none', fontFamily: 'inherit', resize: 'none' }}
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={submitLoading}
                style={{ width: '100%', padding: '12px', backgroundColor: '#d4af37', color: '#0f1115', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
              >
                {submitLoading ? <Loader2 className="spinner" size={18} /> : 'إرسال طلب الحجز'}
              </button>
            </form>
          )}

        </div>
      </main>

      {/* Footer */}
      <footer style={{ width: '100%', padding: '20px 5%', borderTop: '1px solid #2d3748', backgroundColor: '#1a1d24', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
        <span>جميع الحقوق محفوظة © {new Date().getFullYear()} {lawyer.title || lawyer.full_name}</span>
      </footer>

    </div>
  );
}
