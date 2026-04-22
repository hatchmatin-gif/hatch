import React, { useEffect, useState } from 'react';
import { supabase } from '../../../supabase.js';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
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
        navigate('/'); // Landing or Mobile Home
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

  if (loading) return <div style={{height: '100vh', backgroundColor:'#000', color:'#fff', display:'flex', justifyContent:'center', alignItems:'center'}}>보안 키 검증 중...</div>;

  if (!isAdmin) return null;

  return (
    <div style={{ display: 'flex', height: '100vh', backgroundColor: '#f0f2f5', color: '#111' }}>
      <aside style={{ width: '250px', backgroundColor: '#1e2432', color: '#fff', padding: '20px', display: 'flex', flexDirection: 'column' }}>
        <h2 style={{ fontSize: '1.5rem', marginBottom: '40px', color: '#4a90e2' }}>WURI Admin</h2>
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '15px', flex: 1 }}>
          <div style={{ cursor: 'pointer', padding: '10px', borderRadius: '6px', backgroundColor: 'rgba(255,255,255,0.1)' }}>전체 대시보드</div>
          <div style={{ cursor: 'pointer', padding: '10px', borderRadius: '6px' }}>가입자 (6등급) 관리</div>
          <div style={{ cursor: 'pointer', padding: '10px', borderRadius: '6px' }}>결제 및 수수료 내역</div>
        </nav>
        <button onClick={handleLogout} style={{ padding: '10px', backgroundColor: 'transparent', border: '1px solid #4a90e2', color: '#4a90e2', borderRadius: '6px', cursor: 'pointer' }}>시스템 로그아웃</button>
      </aside>
      
      <main style={{ flex: 1, padding: '40px', overflowY: 'auto' }}>
        <h1 style={{ fontSize: '2rem', marginBottom: '20px' }}>Dashboard Overview</h1>
        
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '20px', marginBottom: '40px' }}>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#666', fontSize: '1rem', marginBottom: '10px' }}>총 활성 로스터리/카페</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>124 <span style={{fontSize:'1rem', color:'#aaa', fontWeight:'normal'}}>매장</span></div>
          </div>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#666', fontSize: '1rem', marginBottom: '10px' }}>오늘 원두 발주량</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>42 <span style={{fontSize:'1rem', color:'#aaa', fontWeight:'normal'}}>건</span></div>
          </div>
          <div style={{ backgroundColor: '#fff', padding: '24px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#666', fontSize: '1rem', marginBottom: '10px' }}>이번주 누적 커피챗</h3>
            <div style={{ fontSize: '2rem', fontWeight: 'bold' }}>3,192 <span style={{fontSize:'1rem', color:'#aaa', fontWeight:'normal'}}>회</span></div>
          </div>
        </div>

        <h2 style={{ fontSize: '1.5rem', marginBottom: '20px' }}>역할별 사용자 현황 (6등급)</h2>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
          {/* 가맹점 그룹 */}
          <div style={{ backgroundColor: '#fff', borderLeft: '4px solid #4a90e2', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#333', fontSize: '1.1rem', marginBottom: '5px' }}>로스터리A</h3>
            <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '15px' }}>원두 공급 및 커핑 세팅</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>12 <span style={{fontSize:'0.9rem', color:'#aaa', fontWeight:'normal'}}>명</span></div>
          </div>
          <div style={{ backgroundColor: '#fff', borderLeft: '4px solid #4a90e2', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#333', fontSize: '1.1rem', marginBottom: '5px' }}>카페B</h3>
            <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '15px' }}>원두 자동주문 (포스 3인)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>78 <span style={{fontSize:'0.9rem', color:'#aaa', fontWeight:'normal'}}>명</span></div>
          </div>
          <div style={{ backgroundColor: '#fff', borderLeft: '4px solid #4a90e2', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#333', fontSize: '1.1rem', marginBottom: '5px' }}>카페C</h3>
            <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '15px' }}>일반 매장 (포스 1인)</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>34 <span style={{fontSize:'0.9rem', color:'#aaa', fontWeight:'normal'}}>명</span></div>
          </div>
          
          {/* 파트너 그룹 */}
          <div style={{ backgroundColor: '#fff', borderLeft: '4px solid #f5a623', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#333', fontSize: '1.1rem', marginBottom: '5px' }}>협력사</h3>
            <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '15px' }}>셀프 주문 관리 및 기기연동</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>8 <span style={{fontSize:'0.9rem', color:'#aaa', fontWeight:'normal'}}>사</span></div>
          </div>

          {/* 일반 유저 그룹 */}
          <div style={{ backgroundColor: '#fff', borderLeft: '4px solid #7ed321', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#333', fontSize: '1.1rem', marginBottom: '5px' }}>유료구독 (프리미엄)</h3>
            <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '15px' }}>마이레시피 및 픽업 기반</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>1,430 <span style={{fontSize:'0.9rem', color:'#aaa', fontWeight:'normal'}}>명</span></div>
          </div>
          <div style={{ backgroundColor: '#fff', borderLeft: '4px solid #7ed321', padding: '20px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.05)' }}>
            <h3 style={{ color: '#333', fontSize: '1.1rem', marginBottom: '5px' }}>입문 (일반)</h3>
            <div style={{ color: '#888', fontSize: '0.85rem', marginBottom: '15px' }}>원격주문 1km 이내</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>12,840 <span style={{fontSize:'0.9rem', color:'#aaa', fontWeight:'normal'}}>명</span></div>
          </div>
        </div>
      </main>
    </div>
  );
}
