import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

export default function PointLauncher({ session, profile, fetchData }) {
  const [isPC, setIsPC] = useState(window.innerWidth >= 768);

  useEffect(() => {
    const handleResize = () => setIsPC(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleCharge = async (amount) => {
    if (!profile || !session) {
      alert("로그인 정보가 없습니다.");
      return;
    }
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
    <div style={{ padding: '0 0 20px 0' }}>
      <h2 style={{fontSize: '1.4rem', fontWeight: '800', marginBottom: '8px'}}>POINT Simulator</h2>
      <p style={{color: 'var(--text-sub)', fontSize: '0.85rem', marginBottom: '25px'}}>PG 연동 전 임시 모의 포인트 관리창입니다.</p>
      
      <div style={{ padding: '28px', backgroundColor: 'var(--bg-pure)', border: '1px solid #eee', borderRadius: 'var(--border-radius)', boxShadow: 'var(--card-shadow)' }}>
        <div style={{ fontSize: '0.85rem', color: 'var(--text-sub)' }}>현재 보유 포인트</div>
        <div style={{ fontSize: '2.2rem', fontWeight: '900', color: 'var(--text-main)', marginTop: '8px' }}>
          {profile?.points?.toLocaleString() || 0} <span style={{fontSize: '1rem', color: 'var(--text-sub)', fontWeight: 'normal'}}>CUP</span>
        </div>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: '30px' }}>
          <button onClick={() => handleCharge(5000)} style={cBtn}>+ 5,000</button>
          <button onClick={() => handleCharge(10000)} style={cBtn}>+ 10,000</button>
          <button onClick={() => handleCharge(50000)} style={cBtn}>+ 50,000</button>
          <button onClick={() => handleCharge(-5000)} style={{...cBtn, backgroundColor:'#eee', color:'#666', boxShadow: 'none'}}>- 5,000</button>
        </div>
      </div>
    </div>
  );
}

const cBtn = {
  padding: '16px',
  backgroundColor: 'var(--accent-black)',
  color: 'var(--text-white)',
  border: 'none',
  borderRadius: '16px',
  fontWeight: 'bold',
  fontSize: '0.9rem',
  cursor: 'pointer',
  boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
};
