import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const RECIPES = {
  "아메리카노 (HOT)": "에스프레소 2샷 + 뜨거운 물 250ml",
  "아메리카노 (ICE)": "에스프레소 2샷 + 얼음 + 차가운 물 200ml",
  "초코 무스 케이크": "냉장고 C구역 2칸에서 꺼내기 (데코 불필요)",
  "라떼 (HOT)": "에스프레소 1.5샷 + 스팀 밀크 200ml"
};

export default function PosTest() {
  const [isPC, setIsPC] = useState(window.innerWidth >= 768);
  const [orders, setOrders] = useState([]);

  // 화면 크기 체크
  useEffect(() => {
    const handleResize = () => setIsPC(window.innerWidth >= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // OKPOS 로컬 데스크탑 이벤트 리스너 (Tauri 전용)
  useEffect(() => {
    if (window.__TAURI__) {
      let unlistenFn;
      import('@tauri-apps/api/event').then(({ listen }) => {
        listen('okpos-sale', (event) => {
          const { product, qty } = event.payload;
          const newOrder = {
            id: `OKPOS-${Date.now().toString().slice(-6)}`,
            created_at: new Date().toISOString(),
            status: '대기중',
            items: [{ name: product, qty: parseInt(qty, 10) || 1 }]
          };
          setOrders(prev => [...prev, newOrder]);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        }).then(unlisten => {
          unlistenFn = unlisten;
        });
      });
      return () => {
        if (unlistenFn) unlistenFn();
      };
    }
  }, []);

  // 주문 데이터 로드 및 Realtime 구독
  useEffect(() => {
    if (!isPC) return;

    const fetchOrders = async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['대기중', '수락됨'])
        .order('created_at', { ascending: true });
      if (data) setOrders(data);
    };

    fetchOrders();

    const channel = supabase.channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        // CUD 이벤트 처리
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [...prev, payload.new]);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]); // 소리/진동 임시
        } else if (payload.eventType === 'UPDATE') {
          setOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
        } else if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => o.id !== payload.old.id));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [isPC]);

  const updateStatus = async (id, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (error) alert('상태 변경 실패: ' + error.message);
  };

  if (!isPC) {
    return (
      <div style={{ padding: '40px 20px', textAlign: 'center', color: '#fff' }}>
        <h2 style={{ color: '#ff6a11', fontSize: '1.5rem' }}>접근 제한</h2>
        <p style={{ marginTop: '20px', color: '#aaa', lineHeight: 1.5 }}>POS 모니터링 기능은<br/>태블릿/PC 환경(가로 768px 이상)에서만<br/>접근할 수 있습니다.</p>
      </div>
    );
  }

  // POS 모니터용 가로 레이아웃
  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: '#000', color: '#fff', overflow: 'hidden', zIndex: 99999 }}>
      {/* 헤더 */}
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '15px 30px', backgroundColor: '#111', borderBottom: '2px solid var(--main-orange)' }}>
        <h1 style={{ color: 'var(--main-orange)', fontSize: '1.8rem', margin: 0 }}>WURI POS MONITOR (KDS)</h1>
        <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>대기 주문: <span style={{color:'#ff3b30'}}>{orders.filter(o => o.status === '대기중').length}</span>건</div>
      </header>

      {/* 주문 그리드 */}
      <main style={{ padding: '20px 30px', height: 'calc(100vh - 70px)', overflowY: 'auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '20px', alignContent: 'start' }}>
        {orders.map(order => (
          <div key={order.id} style={{ backgroundColor: '#1a1a1c', border: order.status === '대기중' ? '2px solid #ff3b30' : '2px solid var(--main-orange)', borderRadius: '16px', overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: '0 10px 25px rgba(0,0,0,0.8)' }}>
            
            {/* 카드 헤더 */}
            <div style={{ backgroundColor: order.status === '대기중' ? '#ff3b30' : 'var(--main-orange)', color: order.status === '대기중' ? '#fff' : '#000', padding: '12px 15px', display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
              <span>주문번호: {order.id.split('-')[0]}</span>
              <span>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>

            {/* 주문 품목 리스트 */}
            <div style={{ padding: '15px', flex: 1 }}>
              {order.items?.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '1.2rem', fontWeight: 'bold', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.name}</span>
                    <span style={{ color: 'var(--main-orange)' }}>x {item.qty}</span>
                  </div>
                  {/* 하드코딩된 레시피 출력 */}
                  <div style={{ marginTop: '5px', fontSize: '0.9rem', color: '#aaa', backgroundColor: '#222', padding: '8px', borderRadius: '8px', borderLeft: '3px solid #666' }}>
                    📖 {RECIPES[item.name] || "기본 레시피 참조"}
                  </div>
                </div>
              ))}
            </div>

            {/* 액션 버튼 */}
            <div style={{ padding: '15px', borderTop: '1px solid #333', display: 'flex', gap: '10px' }}>
              {order.status === '대기중' ? (
                 <button onClick={() => updateStatus(order.id, '수락됨')} style={{...btnStyle, backgroundColor: '#ff6a11', color: '#000'}}>접수하기</button>
              ) : (
                 <button onClick={() => updateStatus(order.id, '완료됨')} style={{...btnStyle, backgroundColor: '#4caf50', color: '#fff'}}>제조 완료</button>
              )}
            </div>
          </div>
        ))}

        {orders.length === 0 && (
          <div style={{ gridColumn: '1 / -1', textAlign: 'center', marginTop: '100px', color: '#888' }}>
            <h2 style={{fontSize: '2rem'}}>대기 중인 주문이 없습니다.</h2>
            <p style={{fontSize: '1.2rem'}}>모바일 홈 화면에서 [POS 테스트 주문]을 눌러보세요.</p>
          </div>
        )}
      </main>
    </div>
  );
}

const btnStyle = {
  flex: 1, padding: '14px', border: 'none', borderRadius: '10px', 
  fontSize: '1.1rem', fontWeight: 'bold', cursor: 'pointer'
};
