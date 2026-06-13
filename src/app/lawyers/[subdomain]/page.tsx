'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Scale, Phone, MapPin, Calendar, FileSearch, Loader2, Award, Clock } from 'lucide-react';
import Link from 'next/link';

export default function LawyerHome({ params }: { params: { subdomain: string } }) {
  const { subdomain } = params;
  const [lawyer, setLawyer] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
      console.error("Error fetching lawyer:", e);
    } finally {
      setLoading(false);
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
        <h2 style={{ marginBottom: '10px', fontSize: '1.8rem', fontWeight: 'bold' }}>موقع غير مسجل</h2>
        <p style={{ color: '#94a3b8', marginBottom: '25px', maxWidth: '400px', lineHeight: '1.6' }}>
          عذراً، هذا الرابط الفرعي غير مرتبط بأي محامٍ مسجل في منصة سَنَد حالياً.
        </p>
        <a href="https://sanad-law.vercel.app" style={{ color: '#d4af37', textDecoration: 'none', border: '1px solid #d4af37', padding: '10px 20px', borderRadius: '6px', fontWeight: 'bold', transition: 'all 0.2s' }}>
          العودة لمنصة سَنَد الرئيسية
        </a>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', width: '100%', backgroundColor: '#0f1115', color: '#e2e8f0', display: 'flex', flexDirection: 'column', overflowY: 'auto' }}>
      
      {/* Header / Navbar */}
      <header style={{ width: '100%', padding: '20px 5%', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d3748', backgroundColor: '#1a1d24' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <Scale size={32} color="#d4af37" />
          <div>
            <h1 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#d4af37' }}>{lawyer.title || `مكتب الأستاذ ${lawyer.full_name}`}</h1>
            <span style={{ fontSize: '0.8rem', color: '#94a3b8' }}>شريكك القانوني الموثوق</span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '15px' }}>
          <Link href={`/booking`} style={{ color: '#0f1115', backgroundColor: '#d4af37', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem', transition: 'background-color 0.2s' }}>
            حجز استشارة
          </Link>
          <Link href={`/track-case`} style={{ color: '#d4af37', border: '1px solid #d4af37', padding: '8px 16px', borderRadius: '6px', fontWeight: 'bold', textDecoration: 'none', fontSize: '0.9rem', transition: 'all 0.2s' }}>
            تتبع قضيتك
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <section style={{ padding: '80px 5%', display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', background: 'radial-gradient(circle at top, #1e2430 0%, #0f1115 70%)', borderBottom: '1px solid #2d3748' }}>
        <div style={{ backgroundColor: 'rgba(212, 175, 55, 0.1)', padding: '15px', borderRadius: '50%', marginBottom: '20px', display: 'inline-flex', border: '1px solid rgba(212, 175, 55, 0.3)' }}>
          <Scale size={48} color="#d4af37" />
        </div>
        <h2 style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '15px', color: '#e2e8f0' }}>{lawyer.title || `مكتب الأستاذ ${lawyer.full_name}`}</h2>
        <h3 style={{ fontSize: '1.2rem', color: '#d4af37', marginBottom: '25px', fontWeight: 'normal' }}>للمحاماة والاستشارات القانونية</h3>
        <p style={{ maxWidth: '700px', lineHeight: '1.8', color: '#94a3b8', fontSize: '1.1rem', marginBottom: '35px' }}>
          {lawyer.bio || 'نقدم خدمات قانونية متكاملة واحترافية لحماية مصالحكم وحقوقكم بالاعتماد على أحدث الاستراتيجيات والأحكام القانونية المعتمدة.'}
        </p>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', justifyContent: 'center' }}>
          <Link href={`/booking`} style={{ color: '#0f1115', backgroundColor: '#d4af37', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '1.05rem', boxShadow: '0 4px 14px rgba(212, 175, 55, 0.3)' }}>
            حجز موعد مقابلة
          </Link>
          <Link href={`/track-case`} style={{ color: '#e2e8f0', border: '1px solid #2d3748', backgroundColor: '#1a1d24', padding: '12px 30px', borderRadius: '8px', fontWeight: 'bold', textDecoration: 'none', fontSize: '1.05rem' }}>
            الاستعلام عن قضية
          </Link>
        </div>
      </section>

      {/* Info & Cards */}
      <section style={{ padding: '60px 5%', flex: '1', display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: '100%', maxWidth: '1200px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '30px' }}>
          
          {/* Card 1: Specialization */}
          <div style={{ backgroundColor: '#1a1d24', padding: '30px', borderRadius: '12px', border: '1px solid #2d3748', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Award size={24} color="#d4af37" />
              <h3 style={{ fontSize: '1.25rem', color: '#d4af37', fontWeight: 'bold' }}>تخصصات المكتب</h3>
            </div>
            <p style={{ color: '#94a3b8', lineHeight: '1.7', fontSize: '0.95rem' }}>
              يقدم المكتب تمثيلاً قانونياً أمام كافة المحاكم المصرية في:
            </p>
            <ul style={{ listStyleType: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '8px', color: '#e2e8f0', fontSize: '0.9rem' }}>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#d4af37' }}>◆</span> القضايا المدنية والتجارية ومنازعات العقود</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#d4af37' }}>◆</span> قضايا الأحوال الشخصية والأسرة والمواريث</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#d4af37' }}>◆</span> الدفاع في القضايا الجنائية والجنح</li>
              <li style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><span style={{ color: '#d4af37' }}>◆</span> تأسيس الشركات وصياغة العقود الاستثمارية</li>
            </ul>
          </div>

          {/* Card 2: Contact Info */}
          <div style={{ backgroundColor: '#1a1d24', padding: '30px', borderRadius: '12px', border: '1px solid #2d3748', display: 'flex', flexDirection: 'column', gap: '15px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Clock size={24} color="#d4af37" />
              <h3 style={{ fontSize: '1.25rem', color: '#d4af37', fontWeight: 'bold' }}>بيانات التواصل والمواعيد</h3>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <MapPin size={20} color="#d4af37" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e2e8f0' }}>العنوان</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '3px' }}>{lawyer.office_address || 'القاهرة، جمهورية مصر العربية'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Phone size={20} color="#d4af37" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e2e8f0' }}>رقم الهاتف</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '3px' }}>{lawyer.public_phone || 'لا يوجد رقم تواصل عام حالياً'}</p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '10px' }}>
                <Calendar size={20} color="#d4af37" style={{ marginTop: '2px', flexShrink: 0 }} />
                <div>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: 'bold', color: '#e2e8f0' }}>مواعيد العمل</h4>
                  <p style={{ color: '#94a3b8', fontSize: '0.9rem', marginTop: '3px' }}>يومياً من الساعة 1:00 ظهراً إلى 9:00 مساءً (ماعدا الجمعة)</p>
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Footer */}
      <footer style={{ width: '100%', padding: '20px 5%', borderTop: '1px solid #2d3748', backgroundColor: '#1a1d24', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '15px', fontSize: '0.85rem', color: '#94a3b8' }}>
        <span>جميع الحقوق محفوظة © {new Date().getFullYear()} {lawyer.title || lawyer.full_name}</span>
        <span>بدعم من منصة <a href="https://sanad-law.vercel.app" style={{ color: '#d4af37', textDecoration: 'none', fontWeight: 'bold' }}>سَنَد القانونية</a></span>
      </footer>

    </div>
  );
}
