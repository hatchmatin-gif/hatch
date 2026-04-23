import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../supabase.js';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isBlurred, setIsBlurred] = useState(false);
  const [showLogoutTimer, setShowLogoutTimer] = useState(false);
  const [countdown, setCountdown] = useState(300);
  
  // Usage Stats
  const [usageData, setUsageData] = useState({
    dbRows: 0,
    dbLimit: 500000,
    bandwidth: 12.5,
    bandwidthLimit: 100,
    storage: 0.2,
    storageLimit: 1.0,
  });

  const navigate = useNavigate();
  const blurTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    checkAdminRole();
    fetchRealUsage();
  }, []);

  const fetchRealUsage = async () => {
    try {
      // 실제 DB 행 개수 추산 (profiles 테이블 예시)
      const { count, error } = await supabase
        .from('profiles')
        .select('*', { count: 'exact', head: true });
      
      if (!error) {
        setUsageData(prev => ({
          ...prev,
          dbRows: count || 0
        }));
      }
    } catch (err) {
      console.error("Usage fetch failed:", err);
    }
  };

  // ... (Blur & Timer Logic - Keep as is)
  useEffect(() => {
    if (isBlurred) {
      blurTimeoutRef.current = setTimeout(() => {
        setShowLogoutTimer(true);
      }, 10000);
    } else {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowLogoutTimer(false);
      setCountdown(300);
    }
    return () => { if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current); };
  }, [isBlurred]);

  useEffect(() => {
    if (showLogoutTimer) {
      countdownIntervalRef.current = setInterval(() => {
        setCountdown((prev) => {
          if (prev <= 1) {
            clearInterval(countdownIntervalRef.current);
            handleLogout();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    }
    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
  }, [showLogoutTimer]);

  const checkAdminRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/admin/login'); return; }
      const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (error || profile?.role !== 'super_admin') {
        alert("접근 권한이 없습니다.");
        await supabase.auth.signOut();
        navigate('/');
        return;
      }
      setIsAdmin(true);
    } catch (err) { navigate('/'); } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return (
    <div style={{height: '100vh', backgroundColor:'#FFFFFF', color:'#111', display:'flex', justifyContent:'center', alignItems:'center', fontFamily:'Inter'}}>
      <div className="loader"></div>
      <style>{`
        .loader { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #FF6A00; border-radius: 50%; animation: spin 1s linear infinite; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
      `}</style>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F8F9FA', color: '#111', fontFamily: "'Inter', 'Noto Sans KR', sans-serif" }}>
      <style>{`
        .sidebar-item { padding: 14px 20px; border-radius: 12px; cursor: pointer; transition: all 0.3s; display: flex; align-items: center; gap: 12px; color: #666; font-weight: 500; }
        .sidebar-item:hover { background: rgba(0,0,0,0.03); color: #111; }
        .sidebar-item.active { background: #111; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .stat-card { background: #fff; padding: 30px; border-radius: 24px; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 10px 30px rgba(0,0,0,0.02); transition: all 0.5s; }
        .blurred-content { filter: ${isBlurred ? 'blur(20px)' : 'none'}; pointer-events: ${isBlurred ? 'none' : 'auto'}; transition: filter 0.5s ease; }
        .progress-container { height: 8px; background: #eee; border-radius: 10px; margin: 15px 0; overflow: hidden; }
        .progress-bar { height: 100%; transition: width 0.5s ease-in-out; }
        .usage-tag { font-size: 0.75rem; padding: 4px 8px; border-radius: 6px; font-weight: 700; margin-left: 8px; }
        .logout-timer-banner { position: fixed; top: 20px; left: 50%; transform: translateX(-50%); background: #111; color: #fff; padding: 10px 24px; border-radius: 100px; font-size: 0.9rem; font-weight: 700; z-index: 9999; display: flex; align-items: center; gap: 12px; box-shadow: 0 10px 30px rgba(0,0,0,0.2); }
      `}</style>

      {showLogoutTimer && (
        <div className="logout-timer-banner">
          <span style={{color: '#FF6A00'}}>⚠️ Security Alert</span>
          <span>Auto-Logout in {formatTime(countdown)}</span>
        </div>
      )}

      {/* Sidebar */}
      <aside style={{ width: '280px', backgroundColor: '#fff', borderRight: '1px solid rgba(0,0,0,0.05)', padding: '40px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-1px', marginBottom: '48px', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{width:'32px', height:'32px', borderRadius:'8px', background:'#FF6A00'}}></div>
          WURI. Admin
        </div>

        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Overview</div>
          <div className={`sidebar-item ${activeTab === 'infrastructure' ? 'active' : ''}`} onClick={() => setActiveTab('infrastructure')}>🛡️ Infrastructure</div>
          <div className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>👥 User Permissions</div>
        </nav>

        <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button style={{ width:'100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', background: isBlurred ? 'rgba(255,106,0,0.05)' : '#fff', color: isBlurred ? '#FF6A00' : '#666', cursor: 'pointer', fontWeight:'600', marginBottom:'12px' }} onClick={() => setIsBlurred(!isBlurred)}>
            {isBlurred ? '🔓 Unlock Screen' : '🔒 Privacy Blur'}
          </button>
          <button onClick={handleLogout} style={{ width:'100%', padding: '14px', backgroundColor: 'transparent', border: '1px solid #ddd', color: '#666', borderRadius: '12px', cursor: 'pointer', fontWeight:'600' }}>Logout</button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="blurred-content" style={{ flex: 1, padding: '60px', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px' }}>{activeTab === 'overview' ? 'Control Center' : 'Infrastructure Status'}</h1>
            <p style={{ color: '#888', marginTop: '4px' }}>Real-time service health and limits.</p>
          </div>
          <div style={{ display:'flex', gap:'12px' }}>
            <div style={{ padding:'10px 20px', background:'#fff', borderRadius:'12px', border:'1px solid #eee', fontWeight:'600', fontSize:'0.9rem' }}>
              Cloud Status: <span style={{color:'#10b981'}}>Active</span>
            </div>
          </div>
        </header>

        {activeTab === 'overview' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '48px' }}>
            <div className="stat-card">
              <div style={{ color: '#888', fontSize: '0.9rem', fontWeight: '600', marginBottom: '16px' }}>TOTAL REVENUE</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800' }}>₩14,290,000</div>
              <div style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '8px', fontWeight:'700' }}>↑ 12.5%</div>
            </div>
            {/* ... other overview cards ... */}
          </div>
        )}

        {activeTab === 'infrastructure' && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '30px' }}>
            {/* Supabase Card */}
            <div className="stat-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
                <h3 style={{ fontSize:'1.2rem', fontWeight:'800' }}>⚡ Supabase (Database)</h3>
                <span className="usage-tag" style={{ background:'rgba(16,185,129,0.1)', color:'#10b981' }}>FREE PLAN</span>
              </div>
              
              <div style={{ marginBottom:'24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.9rem', marginBottom:'8px' }}>
                  <span style={{color:'#666'}}>Database Rows</span>
                  <span style={{fontWeight:'700'}}>{usageData.dbRows.toLocaleString()} / {usageData.dbLimit.toLocaleString()}</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${(usageData.dbRows / usageData.dbLimit) * 100}%`, background: '#10b981' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.9rem', marginBottom:'8px' }}>
                  <span style={{color:'#666'}}>Storage Usage</span>
                  <span style={{fontWeight:'700'}}>{usageData.storage} GB / {usageData.storageLimit} GB</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${(usageData.storage / usageData.storageLimit) * 100}%`, background: '#10b981' }}></div>
                </div>
              </div>
            </div>

            {/* Vercel Card */}
            <div className="stat-card">
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'24px' }}>
                <h3 style={{ fontSize:'1.2rem', fontWeight:'800' }}>▲ Vercel (Hosting)</h3>
                <span className="usage-tag" style={{ background:'rgba(16,185,129,0.1)', color:'#10b981' }}>HOBBY</span>
              </div>

              <div style={{ marginBottom:'24px' }}>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.9rem', marginBottom:'8px' }}>
                  <span style={{color:'#666'}}>Monthly Bandwidth</span>
                  <span style={{fontWeight:'700'}}>{usageData.bandwidth} GB / {usageData.bandwidthLimit} GB</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: `${(usageData.bandwidth / usageData.bandwidthLimit) * 100}%`, background: '#4a90e2' }}></div>
                </div>
              </div>

              <div>
                <div style={{ display:'flex', justifyContent:'space-between', fontSize:'0.9rem', marginBottom:'8px' }}>
                  <span style={{color:'#666'}}>Edge Function Invocations</span>
                  <span style={{fontWeight:'700'}}>4.2K / 500K</span>
                </div>
                <div className="progress-container">
                  <div className="progress-bar" style={{ width: '0.8%', background: '#4a90e2' }}></div>
                </div>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
