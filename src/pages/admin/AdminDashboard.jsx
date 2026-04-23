import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase.js';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  const navigate = useNavigate();

  useEffect(() => {
    checkAdminRole();
  }, []);

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
        alert("접근 권한이 없습니다. (최고 관리자 전용)");
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
        .sidebar-item:hover {
          background: rgba(0,0,0,0.03);
          color: #111;
        }
        .sidebar-item.active {
          background: #111;
          color: #fff;
          box-shadow: 0 4px 12px rgba(0,0,0,0.1);
        }
        .stat-card {
          background: #fff;
          padding: 30px;
          border-radius: 24px;
          border: 1px solid rgba(0,0,0,0.03);
          box-shadow: 0 10px 30px rgba(0,0,0,0.02);
          transition: transform 0.3s;
        }
        .stat-card:hover { transform: translateY(-5px); }
        .role-pill {
          padding: 6px 12px;
          border-radius: 100px;
          font-size: 0.75rem;
          font-weight: 700;
          text-transform: uppercase;
        }
        .chart-bar {
          flex: 1;
          background: #f0f0f0;
          border-radius: 4px;
          position: relative;
          min-height: 100px;
        }
        .chart-fill {
          position: absolute;
          bottom: 0; left: 0; right: 0;
          background: linear-gradient(to top, #FF6A00, #FFA000);
          border-radius: 4px;
          transition: height 1s ease-out;
        }
      `}</style>

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
          <button onClick={handleLogout} style={{ width:'100%', padding: '14px', backgroundColor: 'transparent', border: '1px solid #ddd', color: '#666', borderRadius: '12px', cursor: 'pointer', fontWeight:'600' }}>
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main style={{ flex: 1, padding: '60px', overflowY: 'auto' }}>
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
          {/* Mock Chart Area */}
          <div className="stat-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '32px' }}>Weekly Activity Trend</h3>
            <div style={{ display: 'flex', alignItems: 'flex-end', gap: '15px', height: '200px' }}>
              {[40, 70, 45, 90, 65, 80, 50].map((h, i) => (
                <div key={i} className="chart-bar">
                  <div className="chart-fill" style={{ height: `${h}%` }}></div>
                </div>
              ))}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: '16px', color: '#aaa', fontSize: '0.8rem', fontWeight: '600' }}>
              <span>MON</span><span>TUE</span><span>WED</span><span>THU</span><span>FRI</span><span>SAT</span><span>SUN</span>
            </div>
          </div>

          {/* Role Distribution */}
          <div className="stat-card">
            <h3 style={{ fontSize: '1.2rem', fontWeight: '800', marginBottom: '24px' }}>Permissions</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{fontWeight:'600'}}>Roastery (A)</span>
                <span className="role-pill" style={{background:'#FF6A00', color:'#fff'}}>12</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{fontWeight:'600'}}>Cafe (B)</span>
                <span className="role-pill" style={{background:'#eee', color:'#666'}}>78</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{fontWeight:'600'}}>Cafe (C)</span>
                <span className="role-pill" style={{background:'#eee', color:'#666'}}>34</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{fontWeight:'600'}}>Partners</span>
                <span className="role-pill" style={{background:'#eee', color:'#666'}}>8</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{fontWeight:'600'}}>Subscribers</span>
                <span className="role-pill" style={{background:'#eee', color:'#666'}}>1.4K</span>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
