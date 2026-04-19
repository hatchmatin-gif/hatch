import React, { useState, useEffect } from 'react';
import { supabase } from '../supabase.js';

const RECIPES = {
  "아메리카노 (HOT)": "에스프레소 2샷 + 뜨거운 물 250ml",
  "아메리카노 (ICE)": "에스프레소 2샷 + 얼음 + 차가운 물 200ml",
  "초코 무스 케이크": "냉장고 C구역 2칸에서 꺼내기 (데코 불필요)",
  "라떼 (HOT)": "에스프레소 1.5샷 + 스팀 밀크 200ml"
};

export default function PosTest() {
  const [orders, setOrders] = useState([]);
  const [fadingOrderIds, setFadingOrderIds] = useState(new Set());

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

  useEffect(() => {
    const fetchOrders = async () => {
      const { data } = await supabase
        .from('orders')
        .select('*')
        .in('status', ['대기중', '수락됨'])
        .order('created_at', { ascending: true });
      if (data) setOrders(data);
    };

    fetchOrders();

    const channel = supabase.channel('public:orders')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, (payload) => {
        if (payload.eventType === 'INSERT') {
          setOrders(prev => [...prev, payload.new]);
          if (navigator.vibrate) navigator.vibrate([100, 50, 100]);
        } else if (payload.eventType === 'UPDATE') {
          if (payload.new.status === '완료됨') {
            // 외부(다른 기기)에서 완료된 경우에도 애니메이션 효과 적용
            triggerFadeOut(payload.new.id);
          } else {
            setOrders(prev => prev.map(o => String(o.id) === String(payload.new.id) ? payload.new : o));
          }
        } else if (payload.eventType === 'DELETE') {
          setOrders(prev => prev.filter(o => String(o.id) !== String(payload.old.id)));
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const triggerFadeOut = (id) => {
    const stringId = String(id);
    setFadingOrderIds(prev => new Set(prev).add(stringId));
    setTimeout(() => {
      setOrders(prev => prev.filter(o => String(o.id) !== stringId));
      setFadingOrderIds(prev => {
        const next = new Set(prev);
        next.delete(stringId);
        return next;
      });
    }, 1200);
  };

  const updateStatus = async (id, newStatus) => {
    if (navigator.vibrate) navigator.vibrate(40);

    const stringId = String(id);

    // 1. 로컬 주문 처리 (OKPOS)
    if (stringId.startsWith('OKPOS-')) {
      if (newStatus === '완료됨') {
        triggerFadeOut(id);
      } else {
        setOrders(prev => prev.map(o => String(o.id) === stringId ? { ...o, status: newStatus } : o));
      }
      return;
    }

    // 2. Optimistic UI
    if (newStatus === '완료됨') {
      triggerFadeOut(id);
    } else {
      setOrders(prev => prev.map(o => String(o.id) === stringId ? { ...o, status: newStatus } : o));
    }

    // 3. DB 주문 처리
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', id);
    if (error) {
      alert('상태 변경 실패: ' + error.message);
      // Rollback or refetch
      const { data } = await supabase.from('orders').select('*').in('status', ['대기중', '수락됨']).order('created_at', { ascending: true });
      if (data) setOrders(data);
    }
  };

  return (
    <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'var(--bg-light)', color: '#000', overflow: 'hidden', zIndex: 9999 }}>
      {/* Header */}
      <header style={{ 
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', 
        padding: 'calc(max(20px, env(safe-area-inset-top)) + 15px) 24px 15px', 
        backgroundColor: 'var(--accent-black)', color: '#fff',
        flexShrink: 0
      }}>
        <h1 style={{ fontSize: '1.1rem', fontWeight: '900', margin: 0 }}>WURI KONTROL DISPLAY</h1>
        <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#4caf50' }}>{orders.length} Active</div>
      </header>

      {/* List Area */}
      <main style={{ 
        padding: '20px 20px 140px 20px', 
        height: '100%',
        overflowY: 'auto', 
        display: 'flex', flexDirection: 'column', gap: '20px' 
      }}>
        {orders.map(order => (
          <div key={order.id} className={fadingOrderIds.has(String(order.id)) ? 'order-card-fade-out' : ''} style={{ 
            backgroundColor: '#fff', border: '1px solid #eee', 
            borderRadius: '24px', overflow: 'hidden', 
            boxShadow: 'var(--card-shadow)', width: '100%',
            flexShrink: 0
          }}>
            
            <div style={{ 
              backgroundColor: order.status === '대기중' ? '#000' : (order.status === '수락됨' ? 'var(--main-orange)' : '#f5f5f5'), 
              color: (order.status === '대기중' || order.status === '수락됨') ? '#fff' : '#000', 
              padding: '16px 20px', display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '0.9rem',
              transition: 'background-color 0.3s ease'
            }}>
              <span>ORDER #{order.id.toString().slice(-4).toUpperCase()}</span>
              <span style={{opacity: 0.7}}>{new Date(order.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
            </div>

            <div style={{ padding: '20px' }}>
              {order.items?.map((item, idx) => (
                <div key={idx} style={{ marginBottom: '15px' }}>
                  <div style={{ fontSize: '1rem', fontWeight: '800', display: 'flex', justifyContent: 'space-between' }}>
                    <span>{item.name}</span>
                    <span style={{ color: '#000' }}>{item.qty}개</span>
                  </div>
                  <div style={{ 
                    marginTop: '8px', fontSize: '0.8rem', color: '#666', 
                    backgroundColor: '#f9f9f9', padding: '12px', 
                    borderRadius: '16px', borderLeft: '4px solid #ddd' 
                  }}>
                    👨‍🍳 {RECIPES[item.name] || "기본 레시피대로 조리해 주세요."}
                  </div>
                </div>
              ))}
            </div>

            <div style={{ padding: '0 20px 20px' }}>
              {order.status === '대기중' ? (
                 <button 
                  onClick={() => updateStatus(order.id, '수락됨')} 
                  style={{...btnStyleActive, backgroundColor: '#000'}}
                 >
                  주문접수
                 </button>
              ) : (
                 <SwipeButton 
                  onConfirm={() => updateStatus(order.id, '완료됨')} 
                  text="준비완료"
                 />
              )}
            </div>
          </div>
        ))}
        {orders.length === 0 && (
          <div style={{ textAlign: 'center', marginTop: '80px', color: '#ccc' }}>
            <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:'15px'}}><rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect><line x1="9" y1="3" x2="9" y2="21"></line></svg>
            <h2 style={{fontSize: '1.2rem', fontWeight: '800'}}>대기 중인 주문이 없습니다</h2>
          </div>
        )}
      </main>
    </div>
  );
}

function SwipeButton({ onConfirm, text }) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = React.useRef(null);

  const handleStart = (e) => {
    setIsDragging(true);
    setStartX(e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    const x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const walk = Math.max(0, x - startX);
    const trackWidth = trackRef.current.offsetWidth - 60; // 60 is knob width
    setCurrentX(Math.min(walk, trackWidth));
    
    // Trigger at 90%
    if (walk > trackWidth * 0.9) {
      setIsDragging(false);
      setCurrentX(trackWidth);
      onConfirm();
      if (navigator.vibrate) navigator.vibrate(100);
    }
  };

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    setCurrentX(0); // Reset
  };

  return (
    <div 
      ref={trackRef}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
      style={{
        position: 'relative', height: '60px', backgroundColor: 'var(--main-orange)', 
        borderRadius: '30px', overflow: 'hidden', display: 'flex', alignItems: 'center', 
        justifyContent: 'center', cursor: 'grab', userSelect: 'none'
      }}
    >
      <div style={{ color: '#fff', fontWeight: 'bold', fontSize: '1rem', opacity: 0.8 }}>
        {currentX > 20 ? "" : `→ ${text}`}
      </div>
      <div 
        style={{
          position: 'absolute', left: currentX + 5, width: '50px', height: '50px', 
          backgroundColor: '#fff', borderRadius: '50%', display: 'flex', 
          justifyContent: 'center', alignItems: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.2)',
          transition: isDragging ? 'none' : 'left 0.3s ease'
        }}
      >
        <div style={{ width: '10px', height: '10px', borderRight: '3px solid var(--main-orange)', borderBottom: '3px solid var(--main-orange)', transform: 'rotate(-45deg)', marginLeft: '-3px' }}></div>
      </div>
    </div>
  );
}

const btnStyleActive = {
  width: '100%', padding: '16px', border: 'none', borderRadius: '30px', 
  color: '#fff', fontSize: '1rem', fontWeight: 'bold', cursor: 'pointer',
  transition: 'background-color 0.3s ease'
};
