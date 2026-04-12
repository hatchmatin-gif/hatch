import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

export default function PointLauncher({ session, profile, fetchData }) {
  const [isPC, setIsPC] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsPC(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  if (!isPC) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ color: '#ff6a11', fontSize: '1.5rem' }}>접근 제한</h2>
        <p style={{ marginTop: '20px', color: '#aaa', lineHeight: 1.5 }}>포인트 시뮬레이션 기능은<br/>PC 환경(가로 768px 이상)에서만<br/>접근할 수 있습니다.</p>
      </div>
    );
  }

  const handleCharge = async (amount) => {
    if (!profile || !session) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ points: profile.points + amount })
        .eq('id', session.user.id);
      if (error) throw error;
      alert(`${amount > 0 ? '+' : ''}${amount.toLocaleString()} 포인트가 반영되었습니다.`);
      if (fetchData) await fetchData();
    } catch (e) {
      alert("포인트 갱신 실패: " + e.message);
    }
  };

  return (
    <div style={{ padding: '20px', color: '#fff' }}>
      <h2 style={{color: 'var(--main-orange)'}}>POINT Simulator</h2>
      <p style={{color: '#aaa', fontSize: '0.85rem'}}>PG 연동 전 임시 모의 포인트 관리창입니다.</p>
      
      <div style={{ marginTop: '30px', padding: '25px', backgroundColor: 'var(--dark-gray)', border: '1px solid rgba(255, 106, 17, 0.3)', borderRadius: '20px', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ fontSize: '1rem', color: '#888' }}>현재 보유 포인트</div>
        <div style={{ fontSize: '2rem', fontWeight: 'bold', color: 'var(--main-orange)', marginTop: '8px' }}>
          {profile?.points?.toLocaleString() || 0} <span style={{fontSize: '1rem', color:'#fff'}}>CUP</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '15px', marginTop: '30px' }}>
          <button onClick={() => handleCharge(5000)} style={cBtn}>+ 5,000 CUP</button>
          <button onClick={() => handleCharge(10000)} style={cBtn}>+ 10,000 CUP</button>
          <button onClick={() => handleCharge(50000)} style={cBtn}>+ 50,000 CUP</button>
          <button onClick={() => handleCharge(-5000)} style={{...cBtn, backgroundColor:'#333', color:'#fff', border:'1px solid #555'}}>- 5,000 (차감)</button>
        </div>
      </div>
    </div>
  );
}

const cBtn = {
  padding: '16px',
  backgroundColor: 'var(--main-orange)',
  color: '#000',
  border: 'none',
  borderRadius: '14px',
  fontWeight: 'bold',
  fontSize: '1rem',
  cursor: 'pointer',
  boxShadow: '0 4px 10px rgba(0,0,0,0.5)'
};
