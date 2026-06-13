'use client';

import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Scale, Search, FileSearch, Calendar, Clock, Info, Loader2, ArrowLeft, Printer, Phone } from 'lucide-react';
import Link from 'next/link';

export default function LawyerCaseTracking({ params }: { params: { subdomain: string } }) {
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
  const [searchLoading, setSearchLoading] = useState(false);
  const [caseData, setCaseData] = useState<any>(null);
  const [error, setError] = useState('');

  const [searchParams, setSearchParams] = useState({
    caseNumber: '',
    phone: ''
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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setSearchParams(prev => ({ ...prev, [name]: value }));
  };

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!lawyer) return;
    setSearchLoading(true);
    setError('');
    setCaseData(null);

    try {
      const { data, error: dbError } = await supabase
        .from('client_cases')
        .select('*')
        .eq('lawyer_id', lawyer.id)
        .eq('case_number', searchParams.caseNumber.trim())
        .eq('client_phone', searchParams.phone.trim())
        .single();

      if (dbError || !data) {
        setError('لم يتم العثور على قضية مطابقة. يرجى التأكد من رقم القضية ورقم الهاتف المسجل.');
      } else {
        setCaseData(data);
      }
    } catch (err) {
      console.error(err);
      setError('حدث خطأ أثناء البحث. يرجى المحاولة لاحقاً.');
    } finally {
      setSearchLoading(false);
    }
  };

  const handlePrint = () => {
    // Generate clean A4 printable version
    const printWindow = window.open('', '_blank');
    if (!printWindow) {
      alert("الرجاء السماح بالنوافذ المنبثقة (Pop-ups) لتصدير ملف PDF.");
      return;
    }

    const todayDate = new Date().toLocaleDateString('ar-EG');
    const lawyerTitle = lawyer.title || `مكتب الأستاذ ${lawyer.full_name}`;
    const nextSession = caseData.next_session_date ? new Date(caseData.next_session_date).toLocaleDateString('ar-EG') : 'لم يحدد بعد';

    printWindow.document.write(`
      <html dir="rtl" lang="ar">
        <head>
          <title>تقرير حالة قضية - ${caseData.case_number}</title>
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
              padding: 20px;
              position: relative;
            }
            .header {
              display: flex;
              justify-content: space-between;
              align-items: center;
              border-bottom: 2px solid #d4af37;
              padding-bottom: 20px;
              margin-bottom: 40px;
            }
            .logo-text h2 {
              margin: 0;
              font-size: 22px;
              color: #1a1d24;
            }
            .logo-text span {
              font-size: 14px;
              color: #7f8c8d;
            }
            .doc-info {
              text-align: left;
            }
            .doc-info h3 {
              margin: 0;
              font-size: 20px;
              color: #d4af37;
            }
            .details-table {
              width: 100%;
              border-collapse: collapse;
              margin-bottom: 40px;
            }
            .details-table th, .details-table td {
              border: 1px solid #bdc3c7;
              padding: 12px 15px;
              text-align: right;
            }
            .details-table th {
              background-color: #f8f9fa;
              color: #2c3e50;
              width: 30%;
            }
            .update-box {
              background-color: #fcfcfc;
              border-right: 4px solid #d4af37;
              padding: 20px;
              margin-bottom: 50px;
            }
            .watermark {
              position: absolute;
              top: 50%;
              left: 50%;
              transform: translate(-50%, -50%) rotate(-45deg);
              font-size: 90px;
              color: rgba(212, 175, 55, 0.06);
              font-weight: bold;
              white-space: nowrap;
              pointer-events: none;
              z-index: -1;
            }
            .footer {
              position: fixed;
              bottom: 20px;
              left: 0;
              right: 0;
              border-top: 1px solid #bdc3c7;
              padding-top: 15px;
              display: flex;
              justify-content: space-between;
              font-size: 12px;
              color: #7f8c8d;
            }
          </style>
        </head>
        <body>
          <div class="watermark">${lawyer.full_name}</div>
          
          <div class="header">
            <div class="logo-text">
              <h2>${lawyerTitle}</h2>
              <span>للمحاماة والاستشارات القانونية</span>
            </div>
            <div class="doc-info">
              <h3>تقرير رسمي بحالة دعوى</h3>
              <p style="margin: 5px 0 0 0; font-size: 13px; color: #7f8c8d;">تاريخ الاستخراج: ${todayDate}</p>
            </div>
          </div>

          <table class="details-table">
            <tr>
              <th>رقم القضية (Case ID)</th>
              <td style="font-weight: bold;">${caseData.case_number}</td>
            </tr>
            <tr>
              <th>عنوان / موضوع القضية</th>
              <td>${caseData.title}</td>
            </tr>
            <tr>
              <th>حالة القضية الحالية</th>
              <td style="font-weight: bold; color: #27ae60;">${caseData.status}</td>
            </tr>
            <tr>
              <th>تاريخ الجلسة القادمة</th>
              <td style="font-weight: bold; color: #c0392b;">${nextSession}</td>
            </tr>
          </table>

          <div class="update-box">
            <h4 style="margin: 0 0 10px 0; color: #2c3e50; font-size: 18px;">آخر تحديثات الدعوى والإجراءات المتخذة:</h4>
            <p style="margin: 0; font-size: 16px; text-align: justify;">
              ${caseData.last_update || 'لم يتم كتابة تحديثات بعد.'}
            </p>
          </div>

          <div class="footer">
            <span>رقم هاتف المكتب للتواصل: ${lawyer.public_phone || 'لا يوجد'}</span>
            <span>مستخرج إلكترونياً من منصة سَنَد</span>
          </div>

          <script>
            window.onload = function() {
              window.print();
              setTimeout(function() { window.close(); }, 500);
            };
          </script>
        </body>
      </html>
    `);
    printWindow.document.close();
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
      <main style={{ flex: '1', display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '40px 20px', gap: '30px' }}>
        
        {/* Search Box */}
        <div style={{ width: '100%', maxWidth: '500px', backgroundColor: '#1a1d24', border: '1px solid #2d3748', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div style={{ textAlign: 'center', marginBottom: '10px' }}>
              <h3 style={{ fontSize: '1.35rem', color: '#d4af37', fontWeight: 'bold', marginBottom: '8px' }}>متابعة حالة الدعوى قضائياً</h3>
              <p style={{ color: '#94a3b8', fontSize: '0.85rem', lineHeight: '1.5' }}>أدخل رقم القضية ورقم هاتف الموكل المسجل لدى المكتب للاطلاع على تقرير الجلسات والتطورات.</p>
            </div>

            {error && (
              <div style={{ backgroundColor: 'rgba(231, 76, 60, 0.1)', color: '#e74c3c', border: '1px solid #e74c3c', padding: '10px', borderRadius: '6px', fontSize: '0.85rem', textAlign: 'center' }}>
                {error}
              </div>
            )}

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>رقم القضية (Case ID)</label>
              <div style={{ position: 'relative' }}>
                <FileSearch size={16} color="#d4af37" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="text" 
                  name="caseNumber"
                  required
                  value={searchParams.caseNumber}
                  onChange={handleChange}
                  placeholder="مثال: CASE-12345"
                  style={{ width: '100%', padding: '12px 40px 12px 12px', backgroundColor: '#0f1115', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '0.9rem', color: '#94a3b8' }}>رقم الهاتف المحمول للموكل</label>
              <div style={{ position: 'relative' }}>
                <Phone size={16} color="#d4af37" style={{ position: 'absolute', right: '12px', top: '50%', transform: 'translateY(-50%)' }} />
                <input 
                  type="tel" 
                  name="phone"
                  required
                  value={searchParams.phone}
                  onChange={handleChange}
                  placeholder="رقم الهاتف المسجل للتحقق"
                  style={{ width: '100%', padding: '12px 40px 12px 12px', backgroundColor: '#0f1115', border: '1px solid #2d3748', borderRadius: '6px', color: '#e2e8f0', outline: 'none', direction: 'ltr', textAlign: 'right' }}
                />
              </div>
            </div>

            <button 
              type="submit" 
              disabled={searchLoading}
              style={{ width: '100%', padding: '12px', backgroundColor: '#d4af37', color: '#0f1115', fontWeight: 'bold', border: 'none', borderRadius: '6px', cursor: 'pointer', transition: 'background-color 0.2s', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {searchLoading ? <Loader2 className="spinner" size={18} /> : <><Search size={18} /> استعلام عن الدعوى</>}
            </button>
          </form>
        </div>

        {/* Results Card */}
        {caseData && (
          <div className="animate-fade-in" style={{ width: '100%', maxWidth: '600px', backgroundColor: '#1a1d24', border: '1px solid #2d3748', borderRadius: '12px', padding: '30px', boxShadow: '0 10px 25px rgba(0,0,0,0.5)', display: 'flex', flexDirection: 'column', gap: '25px' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #2d3748', paddingBottom: '15px' }}>
              <div>
                <h4 style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#e2e8f0' }}>رقم الدعوى: {caseData.case_number}</h4>
                <span style={{ fontSize: '0.85rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>موضوع الدعوى: {caseData.title}</span>
              </div>
              <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
                <span style={{ backgroundColor: 'rgba(46, 204, 113, 0.1)', color: '#2ece72', border: '1px solid rgba(46, 204, 113, 0.3)', padding: '6px 12px', borderRadius: '20px', fontSize: '0.8rem', fontWeight: 'bold' }}>
                  {caseData.status || 'قيد المراجعة'}
                </span>
                <button 
                  onClick={handlePrint}
                  style={{ display: 'flex', alignItems: 'center', gap: '6px', padding: '8px 12px', backgroundColor: '#d4af37', color: '#0f1115', fontWeight: 'bold', borderRadius: '6px', border: 'none', cursor: 'pointer', fontSize: '0.85rem' }}
                >
                  <Printer size={14} /> تصدير PDF
                </button>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px' }}>
              
              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: '#0f1115', padding: '15px', borderRadius: '8px', border: '1px solid #2d3748' }}>
                <Calendar size={20} color="#d4af37" style={{ marginTop: '2px' }} />
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block' }}>تاريخ موعد الجلسة القادمة</span>
                  <strong style={{ fontSize: '1.05rem', color: '#e2e8f0', marginTop: '4px', display: 'block' }}>
                    {caseData.next_session_date ? new Date(caseData.next_session_date).toLocaleDateString('ar-EG') : 'لم يحدد بعد'}
                  </strong>
                </div>
              </div>

              <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', backgroundColor: '#0f1115', padding: '15px', borderRadius: '8px', border: '1px solid #2d3748' }}>
                <Info size={20} color="#d4af37" style={{ marginTop: '2px' }} />
                <div>
                  <span style={{ fontSize: '0.8rem', color: '#94a3b8', display: 'block', marginBottom: '8px' }}>آخر إجراء أو تحديث في القضية</span>
                  <p style={{ color: '#e2e8f0', fontSize: '0.95rem', lineHeight: '1.7', margin: 0 }}>
                    {caseData.last_update || 'لم يتم إضافة تحديثات جديدة بعد. يرجى التواصل مع مكتب المحامي.'}
                  </p>
                </div>
              </div>

            </div>

          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{ width: '100%', padding: '20px 5%', borderTop: '1px solid #2d3748', backgroundColor: '#1a1d24', display: 'flex', justifyContent: 'center', alignItems: 'center', fontSize: '0.8rem', color: '#94a3b8' }}>
        <span>جميع الحقوق محفوظة © {new Date().getFullYear()} {lawyer.title || lawyer.full_name}</span>
      </footer>

    </div>
  );
}
