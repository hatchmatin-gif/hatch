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
  
  const [usageData, setUsageData] = useState({ dbRows: 0, dbLimit: 500000 });
  const [securityLogs, setSecurityLogs] = useState([]);

  const navigate = useNavigate();
  const blurTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  const checkAdminRole = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate('/admin/login');
        return;
      }
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', session.user.id)
        .single();

      if (error || !profile) {
        alert('프로필 정보를 찾을 수 없습니다. 다시 로그인해 주세요.');
        navigate('/admin/login');
        return;
      }
      if (profile.role !== 'super_admin') {
        alert(`접근 권한이 없습니다. (현재 권한: ${profile.role})`);
        navigate('/');
        return;
      }
      setIsAdmin(true);
    } catch (err) {
      console.error('Admin check error:', err);
      navigate('/admin/login');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const init = async () => {
      await checkAdminRole();
      await fetchRealUsage();
      await logAuditEvent('DASHBOARD_ACCESS', 'SUCCESS'); // 먼저 기록
      await fetchSecurityLogs(); // 그 다음 조회 (방금 기록 포함)
    };
    init();
  }, []);

  const getDeviceInfo = () => {
    const ua = navigator.userAgent;
    let os = "Unknown OS";
    let device = "Desktop/Unknown";

    if (ua.indexOf("Win") !== -1) os = "Windows";
    if (ua.indexOf("Mac") !== -1) os = "MacOS";
    if (ua.indexOf("X11") !== -1) os = "UNIX";
    if (ua.indexOf("Linux") !== -1) os = "Linux";
    if (ua.indexOf("Android") !== -1) os = "Android";
    if (ua.indexOf("iPhone") !== -1) os = "iOS (iPhone)";

    if (/Mobile|Android|iPhone|iPad/i.test(ua)) device = "Mobile Device";
    else device = "PC / Desktop";

    return { os, device };
  };

  const getGPS = () => {
    return new Promise((resolve) => {
      if (!navigator.geolocation) return resolve({ lat: null, lng: null });
      navigator.geolocation.getCurrentPosition(
        (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 5000 }
      );
    });
  };

  const logAuditEvent = async (eventType, status) => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { os, device } = getDeviceInfo();
      const { lat, lng } = await getGPS();

      // IP 및 지역 정보 (HTTPS API 사용 - Mixed Content 방지)
      let ipAddress = null, locationName = null, ipLat = null, ipLon = null;
      try {
        const ipRes = await fetch('https://ipapi.co/json/');
        const ipData = await ipRes.json();
        ipAddress = ipData.ip;
        locationName = `${ipData.city || ''}, ${ipData.country_name || ''}`.trim().replace(/^,\s*/, '');
        ipLat = ipData.latitude;
        ipLon = ipData.longitude;
      } catch (ipErr) {
        console.warn('IP lookup failed (non-critical):', ipErr);
      }

      const { error } = await supabase.from('audit_logs').insert([{
        user_id: session.user.id,
        email: session.user.email,
        event_type: eventType,
        ip_address: ipAddress,
        location_name: locationName,
        user_agent: navigator.userAgent,
        os: os,
        device: device,
        latitude: lat || ipLat,
        longitude: lng || ipLon,
        status: status
      }]);

      if (error) console.error('Audit insert error:', error);
      else fetchSecurityLogs();
    } catch (err) { console.error('Audit log failed:', err); }
  };

  const fetchSecurityLogs = async () => {
    const { data } = await supabase.from('audit_logs').select('*').order('created_at', { ascending: false }).limit(10);
    setSecurityLogs(data || []);
  };

  const fetchRealUsage = async () => {
    const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
    setUsageData(prev => ({ ...prev, dbRows: count || 0 }));
  };

  const handleLogout = async () => {
    // 로그 기록은 백그라운드에서 진행
    logAuditEvent('LOGOUT', 'SUCCESS');
    await supabase.auth.signOut();
    navigate('/');
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  if (loading) return <div style={{height: '100vh', display:'flex', justifyContent:'center', alignItems:'center'}}>Loading...</div>;

  if (!isAdmin) return null;

  return (
    <div style={{ 
      display: 'flex', height: '100vh', 
      backgroundColor: '#ffffff',
      backgroundImage: `
        radial-gradient(circle at 0% 0%, rgba(255, 106, 0, 0.04) 0%, transparent 50%),
        radial-gradient(circle at 100% 0%, rgba(255, 184, 0, 0.04) 0%, transparent 50%),
        radial-gradient(circle at 100% 100%, rgba(255, 106, 0, 0.04) 0%, transparent 50%),
        radial-gradient(circle at 0% 100%, rgba(255, 184, 0, 0.04) 0%, transparent 50%)
      `,
      color: '#111', fontFamily: "'Inter', sans-serif" 
    }}>
      <style>{`
        .sidebar-item { padding: 14px 20px; border-radius: 12px; cursor: pointer; transition: 0.3s; display: flex; align-items: center; gap: 12px; color: #666; font-weight: 500; }
        .sidebar-item.active { background: #111; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .stat-card { background: #fff; padding: 30px; border-radius: 24px; border: 1px solid rgba(0,0,0,0.03); box-shadow: 0 10px 30px rgba(0,0,0,0.02); }
        .log-row { padding: 16px 0; border-bottom: 1px solid #f0f0f0; display: grid; grid-template-columns: 2fr 1fr 1fr; align-items: center; font-size: 0.85rem; }
        .status-badge { padding: 4px 8px; border-radius: 4px; font-weight: 700; font-size: 0.7rem; width: fit-content; }
      `}</style>

      {/* Sidebar */}
      <aside style={{ width: '280px', backgroundColor: '#fff', borderRight: '1px solid rgba(0,0,0,0.05)', padding: '40px 24px', display: 'flex', flexDirection: 'column' }}>
        <div style={{ fontSize: '1.5rem', fontWeight: '900', marginBottom: '48px', display:'flex', alignItems:'center', gap:'10px' }}>
          <div style={{width:'32px', height:'32px', borderRadius:'8px', background:'#FF6A00'}}></div>
          WURI. Admin
        </div>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', flex: 1 }}>
          <div className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>📊 Overview</div>
          <div className={`sidebar-item ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>🔐 Security Logs</div>
        </nav>
        <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button style={{ width:'100%', padding: '12px', borderRadius: '12px', border: '1px solid #eee', background: isBlurred ? 'rgba(255,106,0,0.05)' : '#fff', color: isBlurred ? '#FF6A00' : '#666', cursor: 'pointer', fontWeight:'600', marginBottom:'12px' }} onClick={() => setIsBlurred(!isBlurred)}>
            {isBlurred ? '🔓 Unlock' : '🔒 Blur'}
          </button>
          <button onClick={handleLogout} style={{ width:'100%', padding: '14px', border: '1px solid #ddd', borderRadius: '12px', cursor: 'pointer', fontWeight:'600' }}>Logout</button>
        </div>
      </aside>

      <main style={{ flex: 1, padding: '60px', overflowY: 'auto', filter: isBlurred ? 'blur(20px)' : 'none' }}>
        {showLogoutTimer && (
          <div style={{ position: 'fixed', top: '20px', left: '50%', transform: 'translateX(-50%)', background: '#111', color: '#fff', padding: '10px 24px', borderRadius: '100px', zIndex: 9999 }}>
            ⚠️ Security Alert: Auto-Logout in {formatTime(countdown)}
          </div>
        )}

        <header style={{ marginBottom: '48px' }}>
          <h1 style={{ fontSize: '2.5rem', fontWeight: '800' }}>{activeTab === 'security' ? 'Security Audit' : 'Control Center'}</h1>
          <p style={{ color: '#888' }}>GPS, OS, and Device tracking enabled.</p>
        </header>

        {activeTab === 'security' && (
          <div className="stat-card">
            <h3 style={{ marginBottom: '24px', fontWeight: '800' }}>Real-time Access Monitoring</h3>
            <div style={{ fontWeight: '700', fontSize: '0.75rem', color: '#aaa', paddingBottom: '10px', borderBottom: '2px solid #f0f0f0', display: 'grid', gridTemplateColumns: '2fr 1fr 1fr' }}>
              <span>EVENT / INFO</span>
              <span>LOCATION / IP</span>
              <span>DEVICE / OS</span>
            </div>
            {securityLogs.map(log => (
              <div key={log.id} className="log-row">
                <div>
                  <div style={{ fontWeight: '700' }}>{log.event_type}</div>
                  <div style={{ color: '#888', fontSize: '0.75rem' }}>{new Date(log.created_at).toLocaleString()}</div>
                  <div className="status-badge" style={{ 
                    marginTop: '4px',
                    background: log.status === 'SUCCESS' ? 'rgba(16,185,129,0.1)' : 'rgba(239,68,68,0.1)', 
                    color: log.status === 'SUCCESS' ? '#10b981' : '#ef4444' 
                  }}>{log.status}</div>
                </div>
                <div>
                  <div style={{ fontWeight: '600' }}>📍 {log.location_name || 'Unknown'}</div>
                  <div style={{ color: '#888' }}>{log.ip_address}</div>
                  <div style={{ fontSize: '0.7rem', color: '#aaa' }}>{log.latitude?.toFixed(4)}, {log.longitude?.toFixed(4)}</div>
                </div>
                <div>
                  <div style={{ fontWeight: '600' }}>📱 {log.device}</div>
                  <div style={{ color: '#666' }}>💻 {log.os}</div>
                </div>
              </div>
            ))}
          </div>
        )}
        
        {activeTab === 'overview' && (
          <div className="stat-card">
            <p>Welcome to the enhanced security dashboard.</p>
          </div>
        )}
      </main>
    </div>
  );
}
