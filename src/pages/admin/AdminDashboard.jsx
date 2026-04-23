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
  
  const [usageData, setUsageData] = useState({
    dbRows: 0,
    dbLimit: 500000,
    bandwidth: 12.5,
    bandwidthLimit: 100,
    storage: 0.2,
    storageLimit: 1.0,
  });

  const [securityLogs, setSecurityLogs] = useState([]);

  const navigate = useNavigate();
  const blurTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    checkAdminRole();
    fetchRealUsage();
    fetchSecurityLogs();
    logAuditEvent('DASHBOARD_ACCESS', 'SUCCESS');
  }, []);

  const logAuditEvent = async (eventType, status) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // IP 정보 가져오기 (무료 API 사용 예시)
      const ipRes = await fetch('https://api.ipify.org?format=json');
      const { ip } = await ipRes.json();

      await supabase.from('audit_logs').insert([{
        user_id: session.user.id,
        email: session.user.email,
        event_type: eventType,
        ip_address: ip,
        user_agent: navigator.userAgent,
        status: status
      }]);
    } catch (err) {
      console.error("Audit log failed:", err);
    }
  };

  const fetchSecurityLogs = async () => {
    try {
      const { data, error } = await supabase
        .from('audit_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(5);
      
      if (!error) setSecurityLogs(data || []);
    } catch (err) { console.error(err); }
  };

  const fetchRealUsage = async () => {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    setUsageData(prev => ({ ...prev, dbRows: count || 0 }));
  };

  // ... (Blur & Timer Logic - Keep as is)
  useEffect(() => {
    if (isBlurred) {
      blurTimeoutRef.current = setTimeout(() => { setShowLogoutTimer(true); }, 10000);
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
          if (prev <= 1) { clearInterval(countdownIntervalRef.current); handleLogout(); return 0; }
          return prev - 1;
        });
      }, 1000);
    } else { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); }
    return () => { if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current); };
  }, [showLogoutTimer]);

  const checkAdminRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/admin/login'); return; }
      const { data: profile, error } = await supabase.from('profiles').select('role').eq('id', session.user.id).single();
      if (error || profile?.role !== 'super_admin') {
        await logAuditEvent('UNAUTHORIZED_ACCESS_ATTEMPT', 'CRITICAL');
        alert("접근 권한이 없습니다.");
        await supabase.auth.signOut();
        navigate('/');
        return;
      }
      setIsAdmin(true);
    } catch (err) { navigate('/'); } finally { setLoading(false); }
  };

  const handleLogout = async () => {
    await logAuditEvent('LOGOUT', 'SUCCESS');
    await supabase.auth.signOut();
    navigate('/');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return (
    <div style={{height: '100vh', backgroundColor:'#FFFFFF', display:'flex', justifyContent:'center', alignItems:'center', fontFamily:'Inter'}}>
      <div className="loader"></div>
      <style>{`.loader { width: 40px; height: 40px; border: 3px solid #f3f3f3; border-top: 3px solid #FF6A00; border-radius: 50%; animation: spin 1s linear infinite; } @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }`}</style>
    </div>
  );

  if (!isAdmin) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#F8F9FA', color: '#111', fontFamily: "'Inter', sans-serif" }}>
      <style>{`
        .sidebar-item { padding: 14px 20px; border-radius: 12px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 12px; color: #666; font-weight: 500; }
        .sidebar-item.active { background: #111; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .stat-card { background: #fff; padding: 30px; border-radius: 24px; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .log-row { padding: 12px 0; border-bottom: 1px solid #f0f0f0; display: flex; justify-content: space-between; align-items: center; font-size: 0.85rem; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 0.7rem; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: '280px', backgroundColor: '#fff', borderRight: '1px solid rgba(0,0,0,0.05)', padding: '40px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-1px', marginBottom: '48px', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{width:'32px', height:'32px', borderRadius:'8px', background:'#FF6A00'}}></div>
          WURI. Admin
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Overview</div>
          <div className={`sidebar-item ${activeTab === 'infrastructure' ? 'active' : ''}`} onClick={() => setActiveTab('infrastructure')}>🛡️ Infrastructure</div>
          <div className={`sidebar-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>🔐 Security Logs</div>
        </nav>
        <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button style={{ width:'100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', background: isBlurred ? 'rgba(255,106,0,0.05)' : '#fff', color: isBlurred ? '#FF6A00' : '#666', cursor: 'pointer', fontWeight:'600', marginBottom:'12px' }} onClick={() => setIsBlurred(!isBlurred)}>
            {isBlurred ? '🔓 Unlock Screen' : '🔒 Privacy Blur'}
          </button>
          <button onClick={handleLogout} style={{ width:'100%', padding: '14px', border: '1px solid #ddd', color: '#666', borderRadius: '12px', cursor: 'pointer', fontWeight:'600' }}>Logout</button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '60px', overflowY: 'auto', filter: isBlurred ? 'blur(20px)' : 'none' }}>
        {showLogoutTimer && (
          <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 24px', borderRadius: '100px', zIndex: 9999, display:'flex', gap:'12px' }}>
            <span style={{color:'#FF6A00'}}>⚠️ Security Alert</span><span>Auto-Logout in {formatTime(countdown)}</span>
          </div>
        )}

        <header style={{ marginBottom: '48px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800' }}>{activeTab === 'security' ? 'Security Audit' : 'Control Center'}</h1>
          <p style={{ color: '#888' }}>Monitoring system activity and access logs.</p>
        </header>

        {activeTab === 'overview' && (
          <div style={{ display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap:'30px' }}>
            <div className="stat-card">
              <div style={{ color: '#888', fontSize: '0.9rem', marginBottom: '16px' }}>TOTAL REVENUE</div>
              <div style={{ fontSize: '2.2rem', fontWeight: '800' }}>₩14,290,000</div>
            </div>
            {/* ... other overview cards ... */}
          </div>
        )}

        {activeTab === 'security' && (
          <div className="stat-card">
            <h3 style={{ marginBottom: '24px', fontWeight: '800' }}>Recent Security Events</h3>
            {securityLogs.map(log => (
              <div key={log.id} className="log-row">
                <div>
                  <div style={{ fontWeight: '700', marginBottom: '2px' }}>{log.event_type}</div>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleString()} • {log.ip_address}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div className="status-badge" style={{ 
                    background: log.status === 'SUCCESS' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                    color: log.status === 'SUCCESS' ? '#10b981' : '#ef4444' 
                  }}>{log.status}</div>
                  <div style={{ color: '#aaa', fontSize: '0.7rem', marginTop: '4px' }}>{log.email}</div>
                </div>
              </div>
            ))}
            {securityLogs.length === 0 && <p style={{color:'#888', textAlign:'center', padding:'40px'}}>No security events recorded yet.</p>}
          </div>
        )}

        {activeTab === 'infrastructure' && (
           <div className="stat-card">
              <h3 style={{ marginBottom:'24px' }}>🛡️ Infrastructure Status</h3>
              <p>Database Rows: {usageData.dbRows.toLocaleString()} / 500,000</p>
           </div>
        )}
      </main>
    </div>
  );
}
