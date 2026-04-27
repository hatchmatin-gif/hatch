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
        @keyframes pulse-orange {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }

        .admin-layout { display: flex; height: 100vh; width: 100vw; background: #fff; color: #111; font-family: 'Pretendard', sans-serif; overflow: hidden; }
        .sidebar { width: 240px; background: #fff; border-right: 1px solid #f0f0f0; padding: 40px 20px; display: flex; flex-direction: column; flex-shrink: 0; }
        
        .sidebar-logo { margin-bottom: 60px; display: flex; flex-direction: column; cursor: pointer; color: #111; width: 200px; }
        .logo-text-stack { display: flex; flex-direction: column; width: 100%; }
        .logo-main { font-size: 2.6rem; font-weight: 950; letter-spacing: -2px; line-height: 1; width: 100%; }
        .logo-sub { display: flex; justify-content: space-between; font-size: 1.1rem; font-weight: 900; margin-top: 6px; border-top: 3px solid #111; padding-top: 6px; width: 100%; }
        
        .nav-group { display: flex; flex-direction: column; gap: 4px; flex: 1; }
        .nav-item { padding: 10px 14px; border-radius: 8px; cursor: pointer; transition: 0.2s; display: flex; align-items: center; gap: 10px; color: #888; font-weight: 600; font-size: 0.85rem; }
        .nav-item:hover { color: #111; background: #f8f8f8; }
        .nav-item.active { background: #111; color: #fff; }
        .nav-item .dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; opacity: 0.5; }
        
        .sidebar-footer { padding-top: 20px; border-top: 1px solid #f0f0f0; display: flex; flex-direction: column; gap: 8px; }
        .footer-btn { padding: 10px; border-radius: 8px; border: 1px solid #eee; background: #fff; cursor: pointer; font-weight: 700; font-size: 0.75rem; color: #666; transition: 0.2s; }
        .footer-btn:hover { background: #f8f8f8; color: #111; }
        .footer-btn.active { background: #111; color: #fff; border-color: #111; }

        .main-content { flex: 1; padding: 40px 80px; overflow-y: auto; filter: ${isBlurred ? 'blur(40px)' : 'none'}; transition: filter 0.5s ease; }
        .page-header { margin-bottom: 56px; display: flex; justify-content: space-between; align-items: flex-start; }
        .page-header h1 { font-size: 2.6rem; font-weight: 950; letter-spacing: -2px; line-height: 1; margin-bottom: 15px; }
        .page-header p { color: #888; font-weight: 500; font-size: 1.1rem; line-height: 1; margin-top: 5px; }

        .status-panel { text-align: right; display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
        .live-sync-badge { display: flex; align-items: center; justify-content: flex-end; gap: 8px; font-weight: 900; font-size: 0.8rem; color: #FF6A00; }
        .live-pulse { width: 8px; height: 8px; border-radius: 50%; background: #FF6A00; animation: pulse-orange 1.5s infinite ease-in-out; }
        
        .usage-metrics { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
        .metric-row { font-size: 0.65rem; font-weight: 700; color: #aaa; display: flex; gap: 10px; }
        .metric-val { color: #666; }

        .kpi-grid { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; margin-bottom: 60px; }
        .kpi-card { background: #fff; padding: 24px; border-radius: 20px; border: 1px solid #f0f0f0; display: flex; flex-direction: column; gap: 12px; transition: 0.3s; }
        .kpi-card:hover { border-color: #111; transform: translateY(-2px); }
        .kpi-label { font-size: 0.75rem; color: #888; font-weight: 700; }
        .kpi-value-row { display: flex; align-items: baseline; gap: 4px; }
        .kpi-value { font-size: 1.8rem; font-weight: 900; letter-spacing: -0.5px; }
        .kpi-unit { font-size: 0.8rem; color: #ccc; font-weight: 600; }

        .grid-wide { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; width: 100%; }
        .card-item { background: #fff; padding: 28px; border-radius: 24px; border: 1px solid #f0f0f0; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
        .card-item:hover { border-color: #111; }
        .card-tag { font-size: 0.7rem; font-weight: 800; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 12px; }
        .card-title { font-size: 1.3rem; font-weight: 900; margin-bottom: 24px; letter-spacing: -0.5px; }
        
        .status-badge-mini { display: inline-flex; align-items: center; gap: 5px; font-size: 0.75rem; font-weight: 800; color: #111; margin-bottom: 16px; padding: 4px 8px; background: #f5f5f5; border-radius: 6px; }
        .value-row { display: flex; justify-content: space-between; align-items: center; margin-bottom: 8px; }
        .value-row .label { font-size: 0.8rem; color: #aaa; font-weight: 600; }
        .value-row .val { font-size: 1rem; font-weight: 800; }
        
        .progress-container { width: 100%; height: 4px; background: #f0f0f0; border-radius: 2px; overflow: hidden; margin-top: 12px; }
        .progress-bar { height: 100%; background: #111; transition: width 1.5s cubic-bezier(0.16, 1, 0.3, 1); }

        .overview-section { margin-bottom: 60px; }
        .section-header { display: flex; justify-content: space-between; align-items: baseline; margin-bottom: 24px; padding-bottom: 12px; border-bottom: 2px solid #111; }
        .section-title { font-size: 1.4rem; font-weight: 950; letter-spacing: -0.5px; }
        .view-all { color: #aaa; font-weight: 700; font-size: 0.8rem; cursor: pointer; transition: 0.2s; }
        .view-all:hover { color: #111; }
      `}</style>

      <AnimatePresence>
        {selectedDetail && <DetailModal data={selectedDetail} onClose={() => setSelectedDetail(null)} />}
      </AnimatePresence>

      <aside className="sidebar">
        <div className="sidebar-logo" onClick={() => window.location.href = 'https://www.wuricafe.com/'}>
          <div className="logo-text-stack">
            <div className="logo-main">WURI.</div>
            <div className="logo-sub">
              <span>H</span><span>A</span><span>T</span><span>C</span><span>H</span>
            </div>
          </div>
        </div>
        <nav className="nav-group">
          <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><span className="dot"></span> 종합 리포트</div>
          <div className={`nav-item ${activeTab === '운영' ? 'active' : ''}`} onClick={() => setActiveTab('운영')}><span className="dot"></span> 운영 관리</div>
          <div className={`nav-item ${activeTab === '인사' ? 'active' : ''}`} onClick={() => setActiveTab('인사')}><span className="dot"></span> 인사 정보</div>
          <div className={`nav-item ${activeTab === '생산' ? 'active' : ''}`} onClick={() => setActiveTab('생산')}><span className="dot"></span> 생산 현황</div>
          <div className={`nav-item ${activeTab === '과제' ? 'active' : ''}`} onClick={() => setActiveTab('과제')}><span className="dot"></span> 과제 진행</div>
          <div className={`nav-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}><span className="dot"></span> 보안 감사</div>
        </nav>
        <div className="sidebar-footer">
          <button className={`footer-btn ${isBlurred ? 'active' : ''}`} onClick={() => setIsBlurred(!isBlurred)}>
            프라이버시 보호 {isBlurred ? 'ON' : 'OFF'}
          </button>
          <button className="footer-btn" onClick={handleLogout} style={{color:'#cf222e'}}>로그아웃</button>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{activeTab === 'overview' ? 'Business Overview' : `${activeTab} Management`}</h1>
            <p>{activeTab === 'overview' ? '통합 비즈니스 인텔리전스 시스템' : `실시간 동기화 데이터 세트`}</p>
          </div>
          <div className="status-panel">
            <div className="live-sync-badge">
              <div className="live-pulse"></div>
              LIVE SYNC
            </div>
            <div className="usage-metrics">
              <div className="metric-row">SUPABASE <span className="metric-val">1.2k / 50k (2.4%)</span></div>
              <div className="metric-row">VERCEL REQ <span className="metric-val">1.3%</span></div>
              <div className="metric-row">VERCEL BAND <span className="metric-val">0.35%</span></div>
            </div>
          </div>
        </header>

        {activeTab === 'overview' ? (
          <div className="overview-container">
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label">OPERATING BUDGET</div>
                <div className="kpi-value-row">
                  <span className="kpi-value">{stats.totalBudget.toLocaleString()}</span>
                  <span className="kpi-unit">CUP</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">ACTIVE PERSONNEL</div>
                <div className="kpi-value-row">
                  <span className="kpi-value">{stats.personnel}</span>
                  <span className="kpi-unit">PERSONS</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">PRODUCTION RATE</div>
                <div className="kpi-value-row">
                  <span className="kpi-value">{stats.prodRate}</span>
                  <span className="kpi-unit">%</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label">ACTIVE TASKS</div>
                <div className="kpi-value-row">
                  <span className="kpi-value">{stats.activeTasks}</span>
                  <span className="kpi-unit">UNITS</span>
                </div>
              </div>
            </div>

            {['운영', '인사', '생산', '과제'].map(type => (
              <div key={type} className="overview-section">
                <div className="section-header">
                  <div className="section-title">{type}</div>
                  <div className="view-all" onClick={() => setActiveTab(type)}>VIEW ALL</div>
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
          <div className="card-item" style={{ padding:'40px', borderRadius:'0', borderLeft:'none', borderRight:'none' }}>
             <h3 style={{ marginBottom:'32px', fontWeight:'950', fontSize:'1.8rem' }}>SECURITY AUDIT</h3>
             {securityLogs.length > 0 ? securityLogs.map(log => (
               <div key={log.id} style={{ padding:'20px 0', borderBottom:'1px solid #f0f0f0', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                 <div>
                   <div style={{ fontWeight:'900', fontSize:'1rem' }}>{log.event_type}</div>
                   <div style={{ color:'#aaa', fontSize:'0.75rem', marginTop:'4px' }}>{log.email} • {new Date(log.created_at).toLocaleString()}</div>
                 </div>
                 <div style={{ textAlign:'right' }}>
                   <div style={{ fontWeight:'800', color:'#111', fontSize:'0.85rem' }}>{log.device}</div>
                   <div style={{ fontSize:'0.7rem', color:'#ccc', marginTop:'4px' }}>{log.status}</div>
                 </div>
               </div>
             )) : <p style={{ color:'#888' }}>No logs found.</p>}
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
