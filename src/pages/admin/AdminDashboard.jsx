import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../supabase.js';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { TENANT_CONFIG } from '../../config/tenant.js';

// --- Privacy Scramble Hooks & Components ---
function usePrivacyButton(initialState = 'normal', onLogout) {
  const [privacyState, setPrivacyState] = useState(initialState);
  const timerRef = useRef();
  const isLongPress = useRef(false);

  const startPress = () => {
    isLongPress.current = false;
    timerRef.current = setTimeout(() => {
      isLongPress.current = true;
      setPrivacyState('normal');
      if (navigator.vibrate) navigator.vibrate([50, 50]);
    }, 1300);
  };

  const cancelPress = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
  };

  const handleClick = (e) => {
    if (isLongPress.current) {
      e.preventDefault();
      return;
    }
    setPrivacyState(prev => {
      if (prev === 'normal') return 'scrambling';
      if (prev === 'scrambling') return 'trap';
      if (prev === 'trap') {
        if (onLogout) onLogout();
        return 'trap';
      }
      return prev;
    });
  };

  return { privacyState, handlers: { onMouseDown: startPress, onMouseUp: cancelPress, onMouseLeave: cancelPress, onTouchStart: startPress, onTouchEnd: cancelPress, onClick: handleClick } };
}

const KOREAN_CHARS = "가나다라마바사아자차카타파하거너더러머버서어저처커터퍼허고노도로모보소오조초코토포호구누두루무부수우주추쿠투푸후기니디리미비시이지치키티피히";
const ENG_CHARS = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
const NUM_ALPHABET = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

const getRandomChar = (type) => {
  if (type === 'ko') return KOREAN_CHARS[Math.floor(Math.random() * KOREAN_CHARS.length)];
  if (type === 'en') return ENG_CHARS[Math.floor(Math.random() * ENG_CHARS.length)];
  if (type === 'num_alpha') return NUM_ALPHABET[Math.floor(Math.random() * NUM_ALPHABET.length)];
  return '*';
};

const ScrambleText = ({ text, mode }) => {
  const [displayText, setDisplayText] = useState(text);
  const displayRef = useRef(text);

  useEffect(() => {
    if (mode === 'normal') {
      setDisplayText(text);
      displayRef.current = text;
      return;
    }
    if (mode === 'trap') return;
    
    if (mode === 'scrambling') {
      const strArr = String(text).split('');
      let letterTimeout;
      let numberTimeout;

      const scrambleLetters = () => {
        const koIndices = [];
        const enIndices = [];
        strArr.forEach((char, i) => {
          if (/[가-힣]/.test(char)) koIndices.push(i);
          else if (/[a-zA-Z]/.test(char)) enIndices.push(i);
        });
        let candidates = [...koIndices.map(i => ({ i, type: 'ko' })), ...enIndices.map(i => ({ i, type: 'en' }))];
        candidates.sort(() => Math.random() - 0.5);
        candidates.slice(0, 2).forEach(({ i, type }) => strArr[i] = getRandomChar(type));
        displayRef.current = strArr.join('');
        setDisplayText(displayRef.current);
        letterTimeout = setTimeout(scrambleLetters, Math.random() * 2000 + 1000);
      };

      const scrambleNumbers = () => {
        const numIndices = [];
        strArr.forEach((char, i) => {
          if (/[0-9]/.test(char)) numIndices.push(i);
        });
        let candidates = numIndices.map(i => ({ i, type: 'num_alpha' }));
        candidates.sort(() => Math.random() - 0.5);
        candidates.slice(0, 3).forEach(({ i, type }) => strArr[i] = getRandomChar(type));
        displayRef.current = strArr.join('');
        setDisplayText(displayRef.current);
        numberTimeout = setTimeout(scrambleNumbers, Math.random() * 1000 + 500);
      };

      const allNumIndices = [];
      const allAlphaIndices = [];
      strArr.forEach((char, i) => {
        if (/[0-9]/.test(char)) allNumIndices.push(i);
        else if (/[가-힣]/.test(char)) allAlphaIndices.push({i, type: 'ko'});
        else if (/[a-zA-Z]/.test(char)) allAlphaIndices.push({i, type: 'en'});
      });
      allNumIndices.forEach(i => strArr[i] = getRandomChar('num_alpha'));
      allAlphaIndices.forEach(({i, type}) => strArr[i] = getRandomChar(type));
      displayRef.current = strArr.join('');
      setDisplayText(displayRef.current);

      letterTimeout = setTimeout(scrambleLetters, Math.random() * 2000 + 1000);
      numberTimeout = setTimeout(scrambleNumbers, Math.random() * 1000 + 500);

      return () => { clearTimeout(letterTimeout); clearTimeout(numberTimeout); };
    }
  }, [text, mode]);

  return <>{displayText}</>;
};

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview'); // 기본값: 종합
  const { privacyState, handlers: privacyHandlers } = usePrivacyButton('normal', () => handleLogout());
  const [securityLogs, setSecurityLogs] = useState([]);
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);
  
  const [sheetData, setSheetData] = useState({
    운영: [], 인사: [], 생산: [], 과제: []
  });
  const [beanSales, setBeanSales] = useState(0);
  const [dessertSales, setDessertSales] = useState(0);
  const [syncStatus, setSyncStatus] = useState('connecting');
  const [lastSyncTime, setLastSyncTime] = useState(null);
  const [monthOrderCount, setMonthOrderCount] = useState(0);
  const [usageStats, setUsageStats] = useState({ supabase: null, vercel: null, configured: { supabase: false, vercel: false } });
  const [isKpiRefreshing, setIsKpiRefreshing] = useState(false);
  const [beanSalesFlash, setBeanSalesFlash] = useState(false);
  const prevBeanSalesRef = useRef(0);

  // 원두 매출 변경 감지 → 카드 깜빡임
  useEffect(() => {
    if (beanSales > 0 && beanSales !== prevBeanSalesRef.current && prevBeanSalesRef.current > 0) {
      setBeanSalesFlash(true);
    }
    prevBeanSalesRef.current = beanSales;
  }, [beanSales]);

  const navigate = useNavigate();

  const checkAdminRole = async () => {
    try {
      // F5 새로고침 시 세션 복구 시간을 확보하기 위해 짧은 지연 추가
      await new Promise(r => setTimeout(r, 500));
      
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('Session timeout')), 5000));
      
      const { data: { session }, error: sessionError } = await Promise.race([
        supabase.auth.getSession(),
        timeoutPromise
      ]);
      
      if (sessionError || !session) { 
        console.log("No session found, navigating to login...");
        navigate('/admin/login'); 
        return; 
      }

      const { data: profile, error: profileError } = await Promise.race([
        supabase.from('profiles').select('role').eq('id', session.user.id).single(),
        timeoutPromise
      ]);
      
      if (profileError || profile?.role !== 'super_admin') {
        console.log("Not a super admin, navigating to home...");
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

  const fetchOrderSales = async () => {
    try {
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();
      const endOfMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0, 23, 59, 59, 999).toISOString();
      console.log('[매출조회] 범위:', startOfMonth, '~', endOfMonth);
      const { data, error } = await supabase
        .from('orders')
        .select('total_price, order_type')
        .gte('created_at', startOfMonth)
        .lte('created_at', endOfMonth);
      if (error) {
        console.error('[매출조회] 에러:', error);
        return;
      }
      if (data) {
        const bean = data.filter(o => o.order_type === '원두').reduce((acc, cur) => acc + (cur.total_price || 0), 0);
        const dessert = data.filter(o => o.order_type === '디저트').reduce((acc, cur) => acc + (cur.total_price || 0), 0);
        console.log(`[매출조회] 총 ${data.length}건 | 원두: ${bean} | 디저트: ${dessert} | types:`, data.map(o => o.order_type));
        setBeanSales(bean);
        setDessertSales(dessert);
        setMonthOrderCount(data.length);
        setLastSyncTime(new Date());
      }
    } catch (e) {
      console.error('fetchOrderSales error:', e);
    }
  };

  const fetchUsageStats = async () => {
    try {
      const res = await fetch('/api/usage');
      if (res.ok) {
        const data = await res.json();
        setUsageStats(data);
      }
    } catch (e) {
      console.error('fetchUsageStats error:', e);
    }
  };

  const handleKpiRefresh = async () => {
    if (isKpiRefreshing) return;
    setIsKpiRefreshing(true);
    // Vercel 등에 배포된 최신 UI 코드까지 완벽하게 불러오기 위해 진짜 새로고침 수행
    window.location.reload();
  };

  const fetchUnifiedData = async () => {
    try {
      const [opsData, hrData, prodData, taskData] = await Promise.all([
        supabase.from('wuri_unified_ops').select('*').order('target_date', { ascending: false }),
        supabase.from('wuri_unified_hr').select('*').order('target_date', { ascending: false }),
        supabase.from('wuri_unified_prod').select('*').order('target_date', { ascending: false }),
        supabase.from('wuri_unified_task').select('*').order('target_date', { ascending: false }),
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
      console.error('fetchUnifiedData error:', e);
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
    fetchOrderSales();
    fetchUsageStats();

    // Realtime 구독 (즉시 반영 시도)
    const dashboardChannel = supabase.channel('admin_dashboard');
    const unifiedTables = ['wuri_unified_ops', 'wuri_unified_hr', 'wuri_unified_prod', 'wuri_unified_task'];
    
    unifiedTables.forEach(table => {
      dashboardChannel.on('postgres_changes', { event: '*', schema: 'public', table }, (payload) => {
        console.log(`[RT] ${table} 변경 감지:`, payload);
        fetchUnifiedData();
      });
    });

    dashboardChannel.on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
      console.log('[RT] orders 변경 감지:', payload);
      fetchOrderSales();
    });
    
    dashboardChannel.subscribe((status) => {
      console.log('[RT] 채널 상태:', status);
      if (status === 'SUBSCRIBED') setSyncStatus('live');
      else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') setSyncStatus('polling');
    });

    // 5초마다 주문 매출 자동 갱신 (월 ~170MB, 무료티어 2GB의 8.5% — 안전)
    const salesPolling = setInterval(() => {
      fetchOrderSales();
    }, 5000);

    // 5분마다 사용량 지표 갱신 (API 호출 반복 최소화)
    const usagePolling = setInterval(() => {
      fetchUsageStats();
    }, 300000);

    return () => {
      mounted = false;
      clearTimeout(fallbackTimer);
      clearInterval(salesPolling);
      clearInterval(usagePolling);
      supabase.removeChannel(dashboardChannel);
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
    <div className="admin-layout" key={reloadKey}>
      <style>{`
        @keyframes pulse-orange {
          0% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.95); }
          100% { opacity: 1; transform: scale(1); }
        }

        .kpi-card-flash {
          box-shadow: inset 0 0 0 3px #FF6A00;
          cursor: pointer;
        }

        .admin-layout { display: flex; height: 100vh; width: 100vw; background: #fff; color: #111; font-family: 'Pretendard', sans-serif; overflow: hidden; }
        .sidebar { width: 160px; background: #fff; border-right: 1px solid #f0f0f0; padding: 40px 16px; display: flex; flex-direction: column; flex-shrink: 0; }
        
        .sidebar-logo { margin-top: 24px; margin-bottom: 58px; display: flex; flex-direction: column; cursor: pointer; color: #111; width: 100%; }
        .logo-text-stack { display: flex; flex-direction: column; width: 100%; }
        .logo-main { display: flex; justify-content: space-between; font-size: 2.4rem; font-weight: 950; line-height: 1; width: 100%; }
        .logo-sub { display: flex; justify-content: space-between; font-size: 1.2rem; font-weight: 900; margin-top: 4px; border-top: 2.5px solid #111; padding-top: 4px; width: 100%; }
        
        .nav-group { display: flex; flex-direction: column; gap: 6px; flex: 1; margin-top: 0px; }
        .nav-item { padding: 12px 8px; border-radius: 8px; cursor: pointer; transition: 0.2s; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 6px; color: #888; font-weight: 700; font-size: 0.7rem; text-align: center; }
        .nav-item:hover { color: #111; background: #f8f8f8; }
        .nav-item.active { background: #111; color: #fff; }
        .nav-item .dot { width: 4px; height: 4px; border-radius: 50%; background: currentColor; display: none; }
        
        .sidebar-footer { padding-top: 20px; border-top: 1px solid #f0f0f0; display: flex; flex-direction: column; gap: 6px; }
        .footer-btn { padding: 8px 4px; border-radius: 6px; border: 1px solid #eee; background: #fff; cursor: pointer; font-weight: 800; font-size: 0.6rem; color: #666; transition: 0.2s; white-space: nowrap; }
        .footer-btn:hover { background: #f8f8f8; color: #111; }
        .footer-btn.active { background: #111; color: #fff; border-color: #111; }
 
        .main-content { flex: 1; padding: 40px 50px; overflow-y: auto; filter: ${privacyState === 'scrambling' ? 'blur(8px)' : 'none'}; transition: filter 0.5s ease; }
        .page-header { margin-bottom: 20px; display: flex; flex-direction: column; justify-content: flex-start; align-items: flex-start; min-height: 85px; }
        .page-header h1 { font-size: 2.6rem; font-weight: 950; letter-spacing: -2px; line-height: 1; margin: 0; }
        .page-header p { color: #888; font-weight: 500; font-size: 1.1rem; line-height: 1; margin: 0; margin-top: 15px; }

        .status-panel { text-align: right; display: flex; flex-direction: column; gap: 12px; margin-top: 4px; }
        .live-sync-badge { display: flex; align-items: center; justify-content: flex-end; gap: 8px; font-weight: 900; font-size: 0.8rem; color: #FF6A00; }
        .live-pulse { width: 8px; height: 8px; border-radius: 50%; background: #FF6A00; animation: pulse-orange 1.5s infinite ease-in-out; }
        
        .usage-metrics { display: flex; flex-direction: column; gap: 4px; align-items: flex-end; }
        .metric-row { font-size: 0.65rem; font-weight: 700; color: #aaa; display: flex; gap: 10px; }
        .metric-val { color: #666; }

        .kpi-grid { display: grid; grid-template-columns: repeat(8, 1fr); gap: 20px; margin-bottom: 60px; width: 100%; }
        .kpi-card { background: #fff; padding: 20px; border-radius: 16px; border: 1px solid #f0f0f0; display: flex; flex-direction: column; gap: 8px; justify-content: center; align-items: center; text-align: center; aspect-ratio: 1 / 1; transition: 0.3s; }
        .kpi-card-empty { background: #fafafa; border: 1.5px dashed #d0d0d0; border-radius: 16px; aspect-ratio: 1 / 1; }
        .kpi-card:hover { border-color: #111; transform: translateY(-2px); }
        .kpi-label { font-size: 1.0rem; color: #888; font-weight: 800; margin-top: -4px; margin-bottom: -4px; letter-spacing: -0.5px; }
        .kpi-value-row { display: flex; align-items: baseline; justify-content: center; gap: 4px; }
        .kpi-value { font-size: 1.2rem; font-weight: 900; letter-spacing: -0.5px; }
        .kpi-unit { font-size: 0.8rem; color: #ccc; font-weight: 600; }

        .grid-wide { display: grid; grid-template-columns: repeat(auto-fill, minmax(320px, 1fr)); gap: 24px; width: 100%; }
        .card-item { background: #fff; padding: 28px; border-radius: 16px; border: 1px solid #f0f0f0; transition: 0.4s cubic-bezier(0.16, 1, 0.3, 1); }
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
        <div className="sidebar-logo" onClick={() => window.location.href = TENANT_CONFIG.brand.websiteUrl}>
          <div className="logo-text-stack">
            <div className="logo-main">
              {TENANT_CONFIG.brand.mainName.split('').map((char, i) => <span key={`main-${i}`}>{char}</span>)}
            </div>
            <div className="logo-sub">
              {TENANT_CONFIG.brand.subName.split('').map((char, i) => <span key={`sub-${i}`}>{char}</span>)}
            </div>
          </div>
        </div>
        <nav className="nav-group">
          <div className={`nav-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}><span className="dot"></span> 종합 리포트</div>
          <div className={`nav-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}><span className="dot"></span> 보안 감사</div>
        </nav>
        <div className="sidebar-footer">
          <button 
            className={`footer-btn ${privacyState === 'scrambling' ? 'active' : ''}`} 
            {...privacyHandlers}
            style={{ userSelect: 'none' }}
          >
            프라이버시 보호 {privacyState === 'scrambling' ? 'ON' : 'OFF'}
          </button>
          <button className="footer-btn" onClick={handleLogout} style={{color:'#cf222e'}}>로그아웃</button>
          <div style={{ fontSize: '0.6rem', color: '#ccc', marginTop: '6px', fontWeight: 600, textAlign: 'center' }}>{TENANT_CONFIG.meta.version}</div>
        </div>
      </aside>

      <main className="main-content">
        <header className="page-header">
          <div>
            <h1>{activeTab === 'overview' ? TENANT_CONFIG.dashboard.overviewTitle : `${activeTab} Management`}</h1>
            <p>{activeTab === 'overview' ? TENANT_CONFIG.dashboard.overviewSubtitle : `실시간 동기화 데이터 세트`}</p>
          </div>
        </header>

        {activeTab === 'overview' ? (
          <div className="overview-container">
            <div className="kpi-grid">
              <div className="kpi-card">
                <div className="kpi-label"><ScrambleText text="당월 기준" mode={privacyState} /></div>
                <div className="kpi-value-row">
                  <span className="kpi-value" style={{ fontSize: '1.0rem' }}><ScrambleText text={`${new Date().getFullYear()}년 ${new Date().getMonth() + 1}월`} mode={privacyState} /></span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label"><ScrambleText text={TENANT_CONFIG.dashboard.kpiLabels.budget1} mode={privacyState} /></div>
                <div className="kpi-value-row">
                  <span className="kpi-value"><ScrambleText text={stats.totalBudget.toLocaleString()} mode={privacyState} /></span>
                  <span className="kpi-unit">원</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label"><ScrambleText text={TENANT_CONFIG.dashboard.kpiLabels.budget2} mode={privacyState} /></div>
                <div className="kpi-value-row">
                  <span className="kpi-value"><ScrambleText text={stats.personnel.toLocaleString()} mode={privacyState} /></span>
                  <span className="kpi-unit">원</span>
                </div>
              </div>
              <div className={`kpi-card${beanSalesFlash ? ' kpi-card-flash' : ''}`} onClick={() => setBeanSalesFlash(false)}>
                <div className="kpi-label"><ScrambleText text={TENANT_CONFIG.dashboard.kpiLabels.sales1} mode={privacyState} /></div>
                <div className="kpi-value-row">
                  <span className="kpi-value"><ScrambleText text={beanSales.toLocaleString()} mode={privacyState} /></span>
                  <span className="kpi-unit">원</span>
                </div>
              </div>
              <div className="kpi-card">
                <div className="kpi-label"><ScrambleText text={TENANT_CONFIG.dashboard.kpiLabels.sales2} mode={privacyState} /></div>
                <div className="kpi-value-row">
                  <span className="kpi-value"><ScrambleText text={dessertSales.toLocaleString()} mode={privacyState} /></span>
                  <span className="kpi-unit">원</span>
                </div>
              </div>
              <div className="kpi-card-empty" />
              <div className="kpi-card-empty" />
              <div className="kpi-card" onClick={handleKpiRefresh} style={{ gap: '0', background: syncStatus === 'live' ? '#fff' : '#fffaf7', position: 'relative', padding: '16px', alignItems: 'flex-start', justifyContent: 'flex-start', cursor: 'pointer', transition: 'transform 0.15s', transform: isKpiRefreshing ? 'scale(0.96)' : 'scale(1)' }}>
                {/* 상단: 상태 배지 */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '10px' }}>
                  <div style={{ width: '7px', height: '7px', borderRadius: '50%', background: syncStatus === 'live' ? '#FF6A00' : '#ccc', animation: syncStatus === 'live' ? 'pulse-orange 1.5s infinite' : 'none', flexShrink: 0 }} />
                  <span style={{ fontSize: '0.7rem', fontWeight: 900, color: syncStatus === 'live' ? '#FF6A00' : '#aaa', letterSpacing: '0.5px' }}>
                    {syncStatus === 'live' ? 'LIVE' : syncStatus === 'polling' ? 'POLL' : 'CONN...'}
                  </span>
                </div>
                {/* 중단: Supabase / Vercel 사용량 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', width: '100%' }}>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                    <span>SUPABASE DB</span>
                    <span style={{ color: '#FF6A00' }}>
                      {usageStats.configured?.supabase 
                        ? `${usageStats.supabase?.dbPercent || 0}%` 
                        : '설정 필요'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                    <span>API REQ</span>
                    <span style={{ color: '#666' }}>
                      {usageStats.configured?.supabase 
                        ? `${usageStats.supabase?.apiPercent || 0}%` 
                        : '—'}
                    </span>
                  </div>
                  <div style={{ fontSize: '0.62rem', fontWeight: 700, color: '#aaa', display: 'flex', justifyContent: 'space-between' }}>
                    <span>VERCEL BW</span>
                    <span style={{ color: '#666' }}>
                      {usageStats.configured?.vercel 
                        ? `${usageStats.vercel?.bandwidthPercent || 0}%` 
                        : '설정 필요'}
                    </span>
                  </div>
                </div>
                {/* 하단 우측: 마지막 동기 시간 */}
                <div style={{ position: 'absolute', bottom: '10px', right: '12px', fontSize: '0.55rem', color: isKpiRefreshing ? '#FF6A00' : '#ccc', fontWeight: 600, textAlign: 'right', transition: 'color 0.3s' }}>
                  {isKpiRefreshing ? '↻ 갱신 중...' : lastSyncTime
                    ? `${lastSyncTime.getHours().toString().padStart(2,'0')}:${lastSyncTime.getMinutes().toString().padStart(2,'0')}:${lastSyncTime.getSeconds().toString().padStart(2,'0')}`
                    : '--:--:--'}
                </div>
              </div>
              
              {/* 하단 확장 섹션: 8열 x 3행 그리드 추가 */}
              {[...Array(24)].map((_, i) => (
                <div key={i} className="kpi-card-empty" />
              ))}
            </div>
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
