import React from 'react';

export default function Home({ stores, profile, formatPoints, handleTestOrder }) {
  return (
    <>
      {stores.slice(0, 1).map(store => (
        <section key={store.id} className="near-card">
          <div className="near-header">{store.store_name} - {store.item}</div>
          <div style={{flex:1, border:'1px dashed rgba(0,0,0,0.3)', borderRadius:'18px', display:'flex', justifyContent:'center', alignItems:'center', fontSize:'0.85rem', fontWeight:'bold', color:'rgba(0,0,0,0.4)', zIndex: 2}}>
            [ 이미지 / 영상 노출 영역 ]
          </div>
          <div className="near-bg-text">NEAR!</div>
          <div className="near-badge">{store.badge_text}</div>
        </section>
      ))}
      {!stores?.length && <section className="near-card"><div className="near-header">매장 정보 로딩중...</div></section>}

      <section className="grid-container">
        <div className="action-card"><div className="card-title">POINT<br/>Launcher</div></div>
        <div className="action-card filled">
          <div className="card-title">MOIZA</div>
          <div className="card-subtitle">모이자</div>
          <ul>
            <li>- 주선자 포인트 결제</li>
            <li>- 메뉴/결제 미리하기</li>
            <li>- 실시간 위치 공유</li>
          </ul>
        </div>
        <div className="action-card my-usual">
          <div className="point-display">{formatPoints(profile?.points)} (CUP)</div>
          <div className="card-title">MY<br/>USUAL</div>
        </div>
        <div className="action-card" onClick={handleTestOrder} style={{backgroundColor: '#ff3b3b', cursor: 'pointer'}}>
          <div className="card-title" style={{color: '#fff'}}>POS<br/>테스트 주문</div>
        </div>
        <div className="action-card"><div className="card-title" style={{color:'#aaa'}}>추가 기능<br/>준비 중</div></div>
        <div className="action-card"><div className="card-title" style={{color:'#aaa'}}>추가 기능<br/>준비 중</div></div>
        <div className="action-card"><div className="card-title" style={{color:'#aaa'}}>추가 기능<br/>준비 중</div></div>
      </section>
    </>
  );
}
