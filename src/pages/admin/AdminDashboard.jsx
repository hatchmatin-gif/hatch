import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '../../../supabase.js';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const [isBlurred, setIsBlurred] = useState(false);
  const [showLogoutTimer, setShowLogoutTimer] = useState(false);
  const [countdown, setCountdown] = useState(300); // 5 minutes
  const navigate = useNavigate();
  
  const blurTimeoutRef = useRef(null);
  const countdownIntervalRef = useRef(null);

  useEffect(() => {
    checkAdminRole();
  }, []);

  // Blur & Timer Logic
  useEffect(() => {
    if (isBlurred) {
      // 10초 뒤에 타이머 표시
      blurTimeoutRef.current = setTimeout(() => {
        setShowLogoutTimer(true);
      }, 10000);
    } else {
      // 블러 해제 시 모든 타이머 초기화
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
      setShowLogoutTimer(false);
      setCountdown(300);
    }

    return () => {
      if (blurTimeoutRef.current) clearTimeout(blurTimeoutRef.current);
    };
  }, [isBlurred]);

  // Countdown Logic
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

    return () => {
      if (countdownIntervalRef.current) clearInterval(countdownIntervalRef.current);
    };
  }, [showLogoutTimer]);

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
        
      if (error || profile?.role !== 'super_admin') {
        alert("접근 권한이 없습니다.");
        await supabase.auth.signOut();
        navigate('/');
        return;
      }
      
      setIsAdmin(true);
    } catch (err) {
      console.error(err);
      navigate('/');
    } finally {
      setLoading(false);
    }
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
        .sidebar-item {
          padding: 14px 20px;
          border-radius: 12px;
          cursor: pointer;
          transition: all 0.3s;
          display: flex;
          align-items: center;
          gap: 12px;
          color: #666;
          font-weight: 500;
        }
        .sidebar-item:hover { background: rgba(0,0,0,0.03); color: #111; }
        .sidebar-item.active { background: #111; color: #fff; box-shadow: 0 4px 12px rgba(0,0,0,0.1); }
        .stat-card {
          background: #fff;
          padding: 30px;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.03);
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          transition: all 0.5s cubic-bezier(0.4, 0, 0.2, 1);
        }
        .stat-card:hover { transform: translateY(-5px); }
        .blurred-content {
          filter: ${isBlurred ? 'blur(20px)' : 'none'};
          pointer-events: ${isBlurred ? 'none' : 'auto'};
          transition: filter 0.5s ease;
        }
        .security-btn {
          width: 100%;
          padding: 12px;
          border-radius: 12px;
          border: 1px solid ${isBlurred ? '#FF6A00' : '#eee'};
          background: ${isBlurred ? 'rgba(255,106,0,0.05)' : '#fff'};
          color: ${isBlurred ? '#FF6A00' : '#666'};
          cursor: pointer;
          font-weight: 600;
          margin-bottom: 12px;
          display: flex;
          justify-content: center;
          align-items: center;
          gap: 8px;
          transition: all 0.3s;
        }
        .security-btn:hover { background: ${isBlurred ? 'rgba(255,106,0,0.1)' : '#f9f9f9'}; }
        .logout-timer-banner {
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: #111;
          color: #fff;
          padding: 10px 24px;
          border-radius: 100px;
          font-size: 0.9rem;
          font-weight: 700;
          z-index: 9999;
          display: flex;
          align-items: center;
          gap: 12px;
          box-shadow: 0 10px 30px rgba(0,0,0,0.2);
          animation: slideIn 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes slideIn { from { top: -60px; } to { top: 20px; } }
      `}</style>

      {/* Logout Timer Banner */}
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
          <div className={`sidebar-item ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>
            📊 Overview
          </div>
          <div className={`sidebar-item ${activeTab === 'stores' ? 'active' : ''}`} onClick={() => setActiveTab('stores')}>
            ☕ Stores & Roasteries
          </div>
          <div className={`sidebar-item ${activeTab === 'users' ? 'active' : ''}`} onClick={() => setActiveTab('users')}>
            👥 User Permissions
          </div>
          <div className={`sidebar-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            📦 Global Orders
          </div>
        </nav>

        <div style={{ paddingTop: '20px', borderTop: '1px solid rgba(0,0,0,0.05)' }}>
          <button className="security-btn" onClick={() => setIsBlurred(!isBlurred)}>
            {isBlurred ? '🔓 Unlock Screen' : '🔒 Privacy Blur'}
          </button>
          <button onClick={handleLogout} style={{ width:'100%', padding: '14px', backgroundColor: 'transparent', border: '1px solid #ddd', color: '#666', borderRadius: '12px', cursor: 'pointer', fontWeight:'600' }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="blurred-content" style={{ flex: 1, padding: '60px', overflowY: 'auto' }}>
        <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '48px' }}>
          <div>
            <h1 style={{ fontSize: '2.5rem', fontWeight: '800', letterSpacing: '-1px' }}>Control Center</h1>
            <p style={{ color: '#888', marginTop: '4px' }}>Welcome back, System Admin.</p>
          </div>
          <div style={{ display:'flex', gap:'12px' }}>
            <div style={{ padding:'10px 20px', background:'#fff', borderRadius:'12px', border:'1px solid #eee', fontWeight:'600', fontSize:'0.9rem' }}>
              System Status: <span style={{color:'#10b981'}}>Healthy</span>
            </div>
          </div>
        </header>

        {/* Stats Grid */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '30px', marginBottom: '48px' }}>
          <div className="stat-card">
            <div style={{ color: '#888', fontSize: '0.9rem', fontWeight: '600', marginBottom: '16px' }}>TOTAL REVENUE</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '800' }}>₩14,290,000</div>
            <div style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '8px', fontWeight:'700' }}>↑ 12.5% from last week</div>
          </div>
          <div className="stat-card">
            <div style={{ color: '#888', fontSize: '0.9rem', fontWeight: '600', marginBottom: '16px' }}>ACTIVE STORES</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '800' }}>124 <span style={{fontSize:'1rem', color:'#aaa'}}>Units</span></div>
            <div style={{ color: '#10b981', fontSize: '0.85rem', marginTop: '8px', fontWeight:'700' }}>5 New stores today</div>
          </div>
          <div className="stat-card">
            <div style={{ color: '#888', fontSize: '0.9rem', fontWeight: '600', marginBottom: '16px' }}>AVG. CUP USAGE</div>
            <div style={{ fontSize: '2.2rem', fontWeight: '800' }}>3,192 <span style={{fontSize:'1rem', color:'#aaa'}}>Points</span></div>
            <div style={{ color: '#FF6A00', fontSize: '0.85rem', marginTop: '8px', fontWeight:'700' }}>Daily peak at 2 PM</div>
          </div>
        </div>

        {/* Chart & Roles Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }}>
          <div className="stat-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '32px' }}>Weekly Activity Trend</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', height: '200px' }}>
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                <div key={i} style={{flex: 1, background: '#f0f0f0', borderRadius: '4px', position: 'relative', minHeight: '100px'}}>
                  <div style={{position: 'absolute', bottom: 0, left: 0, right: 0, background: 'linear-gradient(to top, #FF6A00, #FFA000)', borderRadius: '4px', height: `${h}%`, transition: 'height 1s ease-out'}}></div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', color: '#aaa', fontSize: '0.8rem', fontWeight: '600' }}>
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>
          </div>

          <div className="stat-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '24px' }}>Permissions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{fontWeight:'600'}}>Roastery (A)</span>
                <span style={{padding: '6px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700', background:'#FF6A00', color:'#fff'}}>12</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{fontWeight:'600'}}>Cafe (B)</span>
                <span style={{padding: '6px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700', background:'#eee', color:'#666'}}>78</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{fontWeight:'600'}}>Cafe (C)</span>
                <span style={{padding: '6px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700', background:'#eee', color:'#666'}}>34</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{fontWeight:'600'}}>Partners</span>
                <span style={{padding: '6px 12px', borderRadius: '100px', fontSize: '0.75rem', fontWeight: '700', background:'#eee', color:'#666'}}>8</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
