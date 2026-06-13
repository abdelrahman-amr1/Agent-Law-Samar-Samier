'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Scale, Calendar, Phone, User, FileText, Loader2, ArrowLeft, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

export default function LawyerBooking({ params }: { params: { subdomain: string } }) {
  const { subdomain } = params;
  const [lawyer, setLawyer] = useState<any>(null);
  const [loading, setLoading] = useState(true);
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
        <Link href={`/`} style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#d4af37', textDecoration: 'none', fontSize: '0.9rem', fontWeight: 'bold' }}>
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
              <h3 style={{ fontSize: '1.4rem', fontWeight: 'bold', color: '#2ece72' }}>تم إرسال طلب الحجز بنجاح</h3>
              <p style={{ color: '#94a3b8', lineHeight: '1.7', fontSize: '0.95rem' }}>
                نشكرك على ثقتك. تم استلام طلب موعدك بنجاح، وسيقوم مكتب الأستاذ بالتواصل معك لتأكيد الموعد النهائي قريباً.
              </p>
              <Link href={`/`} style={{ marginTop: '15px', color: '#0f1115', backgroundColor: '#d4af37', padding: '10px 25px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none', display: 'inline-block' }}>
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

              <div>
                <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>التاريخ المفضل للمقابلة</label>
                <div style={{ position: 'relative' }}>
                  <Calendar size={16} color="#d4af37" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                  <input 
                    type="date" 
                    name="date"
                    required
                    value={formData.date}
                    onChange={handleChange}
                    style={{ width: '100%', padding: '12px 40px 12px 12px', backgroundColor: '#0f1115', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', outline: 'none', direction: 'rtl' }}
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
