import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../supabase.js';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';

// --- Long Press Hook ---
function useLongPress(callback, ms = 600) {
  const [startLongPress, setStartLongPress] = useState(false);
  const timerRef = useRef();
  useEffect(() => {
    if (startLongPress) timerRef.current = setTimeout(callback, ms);
    else clearTimeout(timerRef.current);
    return () => clearTimeout(timerRef.current);
  }, [startLongPress, callback, ms]);
  return {
    onMouseDown: () => setStartLongPress(true),
    onMouseUp: () => setStartLongPress(false),
    onMouseLeave: () => setStartLongPress(false),
    onTouchStart: () => setStartLongPress(true),
    onTouchEnd: () => setStartLongPress(false),
  };
}

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 기본값: 종합
  const [isBlurred, setIsBlurred] = useState(false);
  const [securityLogs, setSecurityLogs] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  
  const [sheetData, setSheetData] = useState({
    운영: [], 인사: [], 생산: [], 과제: []
  });

  const navigate = useNavigate();

  // --- Mock Data ---
  const MOCK_DATA = {
    운영: [
      { id: 1, 업체명: '(주)해치코리아', 상태: '운영중', 월매출: '4,500만원', 담당자: '김우리', 최근점검: '2024-04-20' },
      { id: 2, 업체명: '우리카페 본점', 상태: '운영중', 월매출: '2,800만원', 담당자: '이해치', 최근점검: '2024-04-22' },
      { id: 3, 업체명: '해치 물류센터', 상태: '주의', 월매출: '-', 담당자: '박생산', 최근점검: '2024-04-15' },
    ],
    인사: [
      { id: 1, 이름: '김우리', 부서: '운영팀', 직책: '팀장', 입사일: '2022-01-10', 연락처: '010-1234-5678' },
      { id: 2, 이름: '이해치', 부서: '개발팀', 직책: '수석', 입사일: '2023-05-15', 연락처: '010-9876-5432' },
      { id: 3, 이름: '박생산', 부서: '제조팀', 직책: '매니저', 입사일: '2023-11-01', 연락처: '010-5555-4444' },
    ],
    생산: [
      { id: 1, 품목: '해치 블렌드 A', 수량: '500kg', 상태: '정상', 창고: '본사A', 업데이트: '2시간 전' },
      { id: 2, 품목: '우리스마일 원두', 수량: '1,200kg', 상태: '부족', 창고: '지사B', 업데이트: '5분 전' },
    ],
    과제: [
      { id: 1, 과제명: '스마트 물류 시스템 고도화', 담당자: '이해치', 진행률: '85%', 마감일: '2024-05-30', 상태: '진행중' },
      { id: 2, 과제명: '어드민 보안 대시보드 구축', 담당자: '김우리', 진행률: '95%', 마감일: '2024-04-30', 상태: '마무리' },
    ]
  };

  const checkAdminRole = async () => {
    try {
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session) { navigate('/admin/login'); return; }

      const { data: profile, error: profileError } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();
      
      if (profileError || profile?.role !== 'super_admin') {
        console.error('Not an admin:', profileError);
        navigate('/');
        return;
      }
      setIsAdmin(true);
    } catch (err) {
      console.error('Auth check failed:', err);
      navigate('/admin/login');
    } finally {
      setLoading(false); // 어떤 경우에도 로딩은 해제
    }
  };

  const fetchSecurityLogs = async () => {
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10);
    setSecurityLogs(data || []);
  };

  useEffect(() => {
    checkAdminRole();
    fetchSecurityLogs();
    setSheetData(MOCK_DATA);
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // --- UI Components ---
  const DetailModal = ({ data, onClose }) => (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-overlay" onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="modal-content" onClick={e => e.stopPropagation()}
      >
        <h2>상세 데이터 정보</h2>
        <div className="detail-list">
          {Object.entries(data).map(([key, value]) => (
            <div key={key} className="detail-item">
              <span className="detail-key">{key}</span>
              <span className="detail-val">{value}</span>
            </div>
          ))}
        </div>
        <button className="close-btn" onClick={onClose}>닫기</button>
      </motion.div>
    </motion.div>
  );

  const SheetItem = ({ item, type, isSummary = false }) => {
    const longPressProps = useLongPress(() => setSelectedDetail(item));
    return (
      <motion.div 
        {...longPressProps}
        whileHover={{ scale: 1.01, translateY: -4 }}
        whileTap={{ scale: 0.98 }}
        className={`card-item ${isSummary ? 'summary' : ''}`}
      >
        <div className="card-tag">{type}</div>
        <h3 className="card-title">{item.업체명 || item.이름 || item.품목 || item.과제명}</h3>
        <div className="card-info">
          {item.상태 && <span>{item.상태}</span>}
          {item.담당자 && <span>• {item.담당자}</span>}
          {item.수량 && <span>• {item.수량}</span>}
          {item.부서 && <span>• {item.부서}</span>}
        </div>
        {!isSummary && <div className="hold-hint">Hold for details</div>}
      </motion.div>
    );
  };

  if (loading) return (
    <div style={{height: '100vh', width:'100vw', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', background:'#fff'}}>
      <div className="refresh-spinner" style={{display:'block', marginBottom:'20px'}}></div>
      <div style={{fontWeight:'700', color:'#111'}}>보안 세션 확인 중...</div>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="admin-layout">
      <style>{`
        .admin-layout { display: flex; height: 100vh; width: 100vw; background: #fbfbfb; color: #111; font-family: 'Inter', sans-serif; overflow: hidden; }
        .sidebar { width: 260px; background: #fff; border-right: 1px solid #eee; padding: 32px 20px; display: flex; flex-direction: column; flex-shrink: 0; }
        .sidebar-logo { font-size: 1.4rem; font-weight: 900; margin-bottom: 40px; display: flex; align-items: center; gap: 10px; cursor: default; }
        .sidebar-logo-icon { width: 28px; height: 28px; border-radius: 8px; background: #FF6A00; }
        
        .nav-group { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .nav-item { padding: 12px 16px; border-radius: 12px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 12px; color: #666; font-weight: 600; font-size: 0.95rem; }
        .nav-item:hover { background: #f5f5f5; color: #111; }
        .nav-item.active { background: #111; color: #fff; }
        
        .sidebar-footer { padding-top: 20px; border-top: 1px solid #eee; display: flex; flex-direction: column; gap: 10px; }
        .blur-btn { padding: 12px; border-radius: 12px; border: 1px solid #eee; background: #fff; cursor: pointer; font-weight: 700; transition: 0.3s; font-size: 0.85rem; }
        .blur-btn.active { background: #FF6A00; color: #fff; border-color: #FF6A00; }
        .logout-btn { padding: 12px; border-radius: 12px; border: 1px solid #ddd; background: #fff; cursor: pointer; font-weight: 700; font-size: 0.85rem; }

        .main-content { flex: 1; padding: 48px 60px; overflow-y: auto; filter: ${isBlurred ? 'blur(30px)' : 'none'}; transition: filter 0.4s ease; }
        .page-header { margin-bottom: 40px; }
        .page-header h1 { fontSize: 2.4rem; font-weight: 900; letter-spacing: -1.5px; margin-bottom: 8px; }
        .page-header p { color: #888; font-weight: 500; }

        .grid-wide { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 24px; width: 100%; }
        .card-item { background: #fff; padding: 28px; border-radius: 24px; border: 1px solid #eee; position: relative; transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 4px 12px rgba(0,0,0,0.02); }
        .card-item.summary { min-height: 160px; }
        .card-tag { font-size: 0.7rem; font-weight: 800; color: #FF6A00; margin-bottom: 8px; text-transform: uppercase; letter-spacing: 0.5px; }
        .card-title { font-size: 1.25rem; font-weight: 800; margin-bottom: 12px; line-height: 1.3; }
        .card-info { font-size: 0.9rem; color: #666; font-weight: 500; display: flex; gap: 8px; flex-wrap: wrap; }
        .hold-hint { position: absolute; right: 24px; bottom: 20px; font-size: 0.65rem; color: #ccc; font-weight: 700; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.7); backdrop-filter: blur(12px); z-index: 10000; display: flex; justifyContent: center; alignItems: center; }
        .modal-content { background: #fff; padding: 40px; border-radius: 32px; width: 540px; max-width: 90%; box-shadow: 0 40px 80px rgba(0,0,0,0.3); }
        .modal-content h2 { font-size: 1.8rem; font-weight: 900; margin-bottom: 24px; border-bottom: 2px solid #f0f0f0; padding-bottom: 16px; }
        .detail-list { display: flex; flex-direction: column; gap: 14px; }
        .detail-item { display: flex; justify-content: space-between; border-bottom: 1px solid #f9f9f9; padding-bottom: 8px; }
        .detail-key { color: #aaa; font-weight: 600; font-size: 0.9rem; }
        .detail-val { font-weight: 700; color: #111; }
        .close-btn { width: 100%; marginTop: 32px; padding: 18px; background: #111; color: #fff; border: none; borderRadius: 16px; fontWeight: 800; cursor: pointer; transition: 0.2s; }
        .close-btn:hover { background: #333; }

        .overview-section { margin-bottom: 48px; }
        .section-title { font-size: 1.4rem; font-weight: 800; margin-bottom: 20px; display: flex; align-items: center; gap: 12px; }
        .section-title::before { content:''; width:4px; height:20px; background:#FF6A00; border-radius:10px; }
      `}</style>

      <AnimatePresence>
        {selectedDetail && <DetailModal data={selectedDetail} onClose={() => setSelectedDetail(null)} />}
      </AnimatePresence>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"></div>
          WURI. Admin
        </div>
        <nav className="nav-group">
          <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>💎 종합 리포트</div>
          <div className={`nav-item ${activeTab === '운영' ? 'active' : ''}`} onClick={() => setActiveTab('운영')}>🏢 운영 관리</div>
          <div className={`nav-item ${activeTab === '인사' ? 'active' : ''}`} onClick={() => setActiveTab('인사')}>👥 인사 정보</div>
          <div className={`nav-item ${activeTab === '생산' ? 'active' : ''}`} onClick={() => setActiveTab('생산')}>📦 생산 현황</div>
          <div className={`nav-item ${activeTab === '과제' ? 'active' : ''}`} onClick={() => setActiveTab('과제')}>📅 과제 진행</div>
          <div className={`nav-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>🔐 보안 로그</div>
        </nav>
        <div className="sidebar-footer">
          <button className={`blur-btn ${isBlurred ? 'active' : ''}`} onClick={() => setIsBlurred(!isBlurred)}>
            {isBlurred ? '🔓 Unlock Screen' : '🔒 Blur Screen'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>Logout</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <h1>{activeTab === 'overview' ? 'Business Intelligence' : `${activeTab} Management`}</h1>
          <p>{activeTab === 'overview' ? '전체 사업체의 운영 현황을 실시간으로 모니터링합니다.' : `상세 데이터를 확인하고 롱클릭하여 세부 정보를 수정할 수 있습니다.`}</p>
        </header>

        {activeTab === 'overview' ? (
          <div className="overview-container">
            {['운영', '인사', '생산', '과제'].map(type => (
              <div key={type} className="overview-section">
                <div className="section-title">{type} 요약</div>
                <div className="grid-wide">
                  {sheetData[type].slice(0, 3).map(item => (
                    <SheetItem key={`${type}-${item.id}`} item={item} type={type} isSummary={true} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : activeTab === 'security' ? (
          <div className="card-item" style={{ padding:'40px' }}>
             <h3 style={{ marginBottom:'24px', fontWeight:'900' }}>실시간 보안 감사 로그</h3>
             {securityLogs.length > 0 ? securityLogs.map(log => (
               <div key={log.id} style={{ padding:'16px 0', borderBottom:'1px solid #f5f5f5', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                 <div>
                   <div style={{ fontWeight:'700', fontSize:'1rem' }}>{log.event_type}</div>
                   <div style={{ color:'#888', fontSize:'0.8rem' }}>{log.email} • {new Date(log.created_at).toLocaleString()}</div>
                 </div>
                 <div style={{ textAlign:'right' }}>
                   <div style={{ fontWeight:'600', color:'#FF6A00' }}>{log.device} ({log.os})</div>
                   <div style={{ fontSize:'0.75rem', color:'#aaa' }}>{log.status}</div>
                 </div>
               </div>
             )) : <p style={{ color:'#888' }}>보안 로그가 존재하지 않습니다.</p>}
          </div>
        ) : (
          <div className="grid-wide">
            {sheetData[activeTab].map(item => (
              <SheetItem key={item.id} item={item} type={activeTab} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
