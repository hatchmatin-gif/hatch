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

  const checkAdminRole = async () => {
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Session timeout')), 3000));
      
      const { data: { session }, error: sessionError } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);
      
      if (sessionError || !session) { navigate('/admin/login'); return; }

      const { data: profile, error: profileError } = await Promise.race([
        supabase.from('profiles').select('role').eq('id', session.user.id).single(),
        timeoutPromise
      ]);
      
      if (profileError || profile?.role !== 'super_admin') {
        navigate('/');
        return;
      }
      setIsAdmin(true);
    } catch (err) {
      console.error("Auth check error:", err);
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  const fetchSecurityLogs = async () => {
    try {
      const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10);
      setSecurityLogs(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUnifiedData = async () => {
    try {
      const [opsData, hrData, prodData, taskData] = await Promise.all([
        supabase.from('wuri_unified_ops').select('*').order('target_date', { ascending: false }),
        supabase.from('wuri_unified_hr').select('*').order('target_date', { ascending: false }),
        supabase.from('wuri_unified_prod').select('*').order('target_date', { ascending: false }),
        supabase.from('wuri_unified_task').select('*').order('target_date', { ascending: false })
      ]);

      const processData = (dataList) => {
        const seen = new Set();
        const result = [];
        (dataList || []).forEach(item => {
          const uniqueKey = `${item.category}-${item.label_name}`;
          if (!seen.has(uniqueKey)) {
            seen.add(uniqueKey);
            result.push(item);
          }
        });
        return result;
      };

      setSheetData({
        운영: processData(opsData.data),
        인사: processData(hrData.data),
        생산: processData(prodData.data),
        과제: processData(taskData.data)
      });
    } catch (e) {
      console.error("fetchUnifiedData error:", e);
    }
  };

  useEffect(() => {
    let mounted = true;
    const fallbackTimer = setTimeout(() => {
      if (mounted && loading) {
        setLoading(false);
      }
    }, 3500);

    checkAdminRole();
    fetchSecurityLogs();
    fetchUnifiedData();

    const tables = ['wuri_unified_ops', 'wuri_unified_hr', 'wuri_unified_prod', 'wuri_unified_task'];
    const subscriptions = tables.map(table => 
      supabase.channel(`channel_${table}`)
        .on('postgres_changes', { event: '*', schema: 'public', table: table }, payload => {
          fetchUnifiedData();
        })
        .subscribe()
    );

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      subscriptions.forEach(sub => supabase.removeChannel(sub));
    };
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  // --- UI Components ---
  const KpiCard = ({ title, value, unit, color, icon }) => (
    <motion.div 
      initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
      className="kpi-card"
    >
      <div className="kpi-icon" style={{ background: `${color}15`, color: color }}>{icon}</div>
      <div className="kpi-content">
        <div className="kpi-title">{title}</div>
        <div className="kpi-value-row">
          <span className="kpi-value">{value}</span>
          <span className="kpi-unit">{unit}</span>
        </div>
      </div>
    </motion.div>
  );

  const DetailModal = ({ data, onClose }) => (
    <motion.div 
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="modal-overlay" onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.9, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: 0.9, y: 20 }}
        className="modal-content" onClick={e => e.stopPropagation()}
      >
        <h2>{data.category} 상세 정보</h2>
        <div className="detail-list">
          <div className="detail-item"><span className="detail-key">항목명</span><span className="detail-val">{data.label_name}</span></div>
          <div className="detail-item"><span className="detail-key">적용일자</span><span className="detail-val">{data.target_date}</span></div>
          <div className="detail-item"><span className="detail-key">상태/비고</span><span className="detail-val">{data.status_text || '-'}</span></div>
          <div className="detail-item"><span className="detail-key">목표/예산</span><span className="detail-val">{data.target_value ? data.target_value.toLocaleString() : '-'}</span></div>
          <div className="detail-item"><span className="detail-key">현재/누적</span><span className="detail-val">{data.current_value ? data.current_value.toLocaleString() : '-'}</span></div>
        </div>
        <button className="close-btn" onClick={onClose}>닫기</button>
      </motion.div>
    </motion.div>
  );

  const SheetItem = ({ item, type, isSummary = false }) => {
    const longPressProps = useLongPress(() => setSelectedDetail(item));
    const progress = item.target_value ? Math.min(100, Math.round((item.current_value / item.target_value) * 100)) : 0;

    return (
      <motion.div 
        {...longPressProps}
        whileHover={{ scale: 1.01, translateY: -4 }}
        whileTap={{ scale: 0.98 }}
        className={`card-item ${isSummary ? 'summary' : ''}`}
      >
        <div className="card-top">
          <div className="card-tag">{item.category}</div>
          {isSummary && progress > 0 && <div className="progress-tag">{progress}%</div>}
        </div>
        <h3 className="card-title">{item.label_name}</h3>
        
        <div className="card-info">
          {item.status_text && <div className="status-badge"><span className="dot"></span> {item.status_text}</div>}
          <div className="value-row">
            <span className="label">Current</span>
            <span className="val">{item.current_value?.toLocaleString() || '0'}</span>
          </div>
          {item.target_value && (
            <div className="progress-container">
              <div className="progress-bar" style={{ width: `${progress}%` }}></div>
            </div>
          )}
        </div>
        {!isSummary && <div className="hold-hint">Hold for details</div>}
      </motion.div>
    );
  };

  const stats = {
    totalBudget: sheetData['운영'].reduce((acc, cur) => acc + (cur.current_value || 0), 0),
    personnel: sheetData['인사'].length,
    prodRate: sheetData['생산'].length > 0 ? Math.round(sheetData['생산'].reduce((acc, cur) => acc + (cur.target_value ? (cur.current_value / cur.target_value) * 100 : 0), 0) / sheetData['생산'].length) : 0,
    activeTasks: sheetData['과제'].filter(t => t.status_text !== '완료').length
  };

  if (loading) return (
    <div style={{height: '100vh', width:'100vw', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', background:'#fff'}}>
      <div className="refresh-spinner" style={{display:'block', marginBottom:'20px'}}></div>
      <div style={{fontWeight:'700', color:'#111'}}>동기화 세션 확인 중...</div>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div className="admin-layout">
      <style>{`
        .admin-layout { display: flex; height: 100vh; width: 100vw; background: #f6f8fa; color: #111; font-family: 'Pretendard', sans-serif; overflow: hidden; }
        .sidebar { width: 280px; background: #fff; border-right: 1px solid #e1e4e8; padding: 40px 24px; display: flex; flex-direction: column; flex-shrink: 0; }
        .sidebar-logo { font-size: 1.5rem; font-weight: 900; margin-bottom: 48px; display: flex; align-items: center; gap: 12px; color: #FF6A00; }
        .sidebar-logo-icon { width: 32px; height: 32px; border-radius: 10px; background: #FF6A00; box-shadow: 0 4px 12px rgba(255,106,0,0.3); }
        
        .nav-group { display: flex; flex-direction: column; gap: 6px; flex: 1; }
        .nav-item { padding: 14px 18px; border-radius: 14px; cursor: pointer; transition: 0.25s cubic-bezier(0.4, 0, 0.2, 1); display: flex; align-items: center; gap: 14px; color: #57606a; font-weight: 600; font-size: 0.95rem; }
        .nav-item:hover { background: #f3f4f6; color: #111; }
        .nav-item.active { background: #111; color: #fff; box-shadow: 0 10px 20px rgba(0,0,0,0.1); }
        
        .sidebar-footer { padding-top: 24px; border-top: 1px solid #e1e4e8; display: flex; flex-direction: column; gap: 12px; }
        .blur-btn { padding: 14px; border-radius: 14px; border: 1px solid #e1e4e8; background: #fff; cursor: pointer; font-weight: 700; transition: 0.3s; font-size: 0.85rem; color: #24292f; }
        .blur-btn.active { background: #FF6A00; color: #fff; border-color: #FF6A00; }
        .logout-btn { padding: 14px; border-radius: 14px; border: 1px solid #e1e4e8; background: #fff; cursor: pointer; font-weight: 700; font-size: 0.85rem; color: #cf222e; }

        .main-content { flex: 1; padding: 60px 80px; overflow-y: auto; filter: ${isBlurred ? 'blur(40px)' : 'none'}; transition: filter 0.5s ease; }
        .page-header { margin-bottom: 56px; display: flex; justify-content: space-between; align-items: flex-end; }
        .page-header h1 { font-size: 2.8rem; font-weight: 900; letter-spacing: -2px; line-height: 1; margin-bottom: 12px; }
        .page-header p { color: #57606a; font-weight: 500; font-size: 1.1rem; }

        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 24px; margin-bottom: 48px; }
        .kpi-card { background: #fff; padding: 24px; border-radius: 24px; border: 1px solid #e1e4e8; display: flex; align-items: center; gap: 20px; transition: transform 0.3s ease; }
        .kpi-card:hover { transform: translateY(-5px); box-shadow: 0 12px 24px rgba(0,0,0,0.05); }
        .kpi-icon { width: 56px; height: 56px; border-radius: 18px; display: flex; align-items: center; justify-content: center; font-size: 1.5rem; }
        .kpi-title { font-size: 0.85rem; color: #57606a; font-weight: 700; margin-bottom: 4px; }
        .kpi-value-row { display: flex; align-items: baseline; gap: 4px; }
        .kpi-value { font-size: 1.6rem; font-weight: 850; letter-spacing: -0.5px; }
        .kpi-unit { font-size: 0.9rem; color: #888; font-weight: 600; }

        .grid-wide { display: grid; grid-template-columns: repeat(auto-fill, minmax(360px, 1fr)); gap: 28px; width: 100%; }
        .card-item { background: #fff; padding: 32px; border-radius: 28px; border: 1px solid #e1e4e8; position: relative; transition: all 0.4s cubic-bezier(0.16, 1, 0.3, 1); box-shadow: 0 2px 8px rgba(0,0,0,0.02); }
        .card-top { display: flex; justify-content: space-between; align-items: center; margin-bottom: 16px; }
        .card-tag { font-size: 0.75rem; font-weight: 800; color: #FF6A00; text-transform: uppercase; letter-spacing: 1px; }
        .progress-tag { font-size: 0.75rem; font-weight: 900; color: #111; background: #f3f4f6; padding: 4px 10px; border-radius: 8px; }
        .card-title { font-size: 1.4rem; font-weight: 850; margin-bottom: 24px; line-height: 1.2; letter-spacing: -0.5px; }
        
        .status-badge { display: inline-flex; align-items: center; gap: 6px; padding: 6px 12px; background: #fff8f4; border-radius: 100px; font-size: 0.85rem; font-weight: 700; color: #FF6A00; border: 1px solid #ffe8d9; margin-bottom: 16px; }
        .status-badge .dot { width: 6px; height: 6px; border-radius: 50%; background: #FF6A00; }
        
        .value-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
        .value-row .label { font-size: 0.85rem; color: #888; font-weight: 600; }
        .value-row .val { font-size: 1.1rem; font-weight: 800; }
        
        .progress-container { width: 100%; height: 8px; background: #f3f4f6; border-radius: 4px; overflow: hidden; margin-top: 8px; }
        .progress-bar { height: 100%; background: #FF6A00; border-radius: 4px; transition: width 1s ease-out; }

        .modal-overlay { position: fixed; top: 0; left: 0; width: 100vw; height: 100vh; background: rgba(0,0,0,0.8); backdrop-filter: blur(20px); z-index: 10000; display: flex; justifyContent: center; alignItems: center; }
        .modal-content { background: #fff; padding: 48px; border-radius: 40px; width: 560px; max-width: 90%; box-shadow: 0 40px 100px rgba(0,0,0,0.4); }
        .modal-content h2 { font-size: 2rem; font-weight: 900; margin-bottom: 32px; border-bottom: 2px solid #f3f4f6; padding-bottom: 20px; letter-spacing: -1px; }

        .overview-section { margin-bottom: 64px; }
        .section-header { display: flex; justify-content: space-between; align-items: flex-end; margin-bottom: 28px; }
        .section-title { font-size: 1.6rem; font-weight: 900; display: flex; align-items: center; gap: 14px; letter-spacing: -0.5px; }
        .section-title::before { content:''; width:6px; height:24px; background:#FF6A00; border-radius:10px; }
        .view-all { color: #888; font-weight: 700; font-size: 0.9rem; cursor: pointer; transition: 0.2s; }
        .view-all:hover { color: #111; text-decoration: underline; }
      `}</style>

      <AnimatePresence>
        {selectedDetail && <DetailModal data={selectedDetail} onClose={() => setSelectedDetail(null)} />}
      </AnimatePresence>

      <aside className="sidebar">
        <div className="sidebar-logo">
          <div className="sidebar-logo-icon"></div>
          WURI BI
        </div>
        <nav className="nav-group">
          <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 종합 리포트</div>
          <div className={`nav-item ${activeTab === '운영' ? 'active' : ''}`} onClick={() => setActiveTab('운영')}>🏢 운영 관리</div>
          <div className={`nav-item ${activeTab === '인사' ? 'active' : ''}`} onClick={() => setActiveTab('인사')}>👥 인사 정보</div>
          <div className={`nav-item ${activeTab === '생산' ? 'active' : ''}`} onClick={() => setActiveTab('생산')}>📦 생산 현황</div>
          <div className={`nav-item ${activeTab === '과제' ? 'active' : ''}`} onClick={() => setActiveTab('과제')}>📅 과제 진행</div>
          <div className={`nav-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>🔐 보안 감사</div>
        </nav>
        <div className="sidebar-footer">
          <button className={`blur-btn ${isBlurred ? 'active' : ''}`} onClick={() => setIsBlurred(!isBlurred)}>
            {isBlurred ? '🔓 데이터 잠금 해제' : '🔒 프라이버시 보호'}
          </button>
          <button className="logout-btn" onClick={handleLogout}>시스템 로그아웃</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{activeTab === 'overview' ? 'Integrated Insight' : `${activeTab} Management`}</h1>
            <p>{activeTab === 'overview' ? '비즈니스 핵심 지표를 실시간으로 집계합니다.' : `실시간 동기화된 ${activeTab} 데이터를 관리합니다.`}</p>
          </div>
          {activeTab === 'overview' && (
            <div style={{ textAlign:'right', color:'#FF6A00', fontWeight:'800', fontSize:'0.9rem' }}>
              ● LIVE SYNC
            </div>
          )}
        </header>

        {activeTab === 'overview' ? (
          <div className="overview-container">
            <div className="kpi-grid">
              <KpiCard title="운영 예산 총액" value={stats.totalBudget.toLocaleString()} unit="CUP" color="#FF6A00" icon="💰" />
              <KpiCard title="활성 인원" value={stats.personnel} unit="명" color="#0366d6" icon="👥" />
              <KpiCard title="평균 생산율" value={stats.prodRate} unit="%" color="#28a745" icon="📦" />
              <KpiCard title="진행 과제" value={stats.activeTasks} unit="건" color="#6f42c1" icon="📅" />
            </div>

            {['운영', '인사', '생산', '과제'].map(type => (
              <div key={type} className="overview-section">
                <div className="section-header">
                  <div className="section-title">{type} 현황</div>
                  <div className="view-all" onClick={() => setActiveTab(type)}>전체보기 →</div>
                </div>
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
             <h3 style={{ marginBottom:'24px', fontWeight:'900', fontSize:'1.6rem' }}>보안 감사 로그</h3>
             {securityLogs.length > 0 ? securityLogs.map(log => (
               <div key={log.id} style={{ padding:'20px 0', borderBottom:'1px solid #f3f4f6', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                 <div>
                   <div style={{ fontWeight:'800', fontSize:'1.1rem' }}>{log.event_type}</div>
                   <div style={{ color:'#888', fontSize:'0.9rem', marginTop:'4px' }}>{log.email} • {new Date(log.created_at).toLocaleString()}</div>
                 </div>
                 <div style={{ textAlign:'right' }}>
                   <div style={{ fontWeight:'700', color:'#FF6A00', background:'#fff4ee', padding:'6px 12px', borderRadius:'10px' }}>{log.device} ({log.os})</div>
                   <div style={{ fontSize:'0.8rem', color:'#aaa', marginTop:'6px' }}>Status: {log.status}</div>
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
