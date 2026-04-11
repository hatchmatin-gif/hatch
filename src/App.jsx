import { useState, useEffect, useRef } from 'react';
import { supabase } from '../supabase.js';

export default function App() {
  const [profile, setProfile] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  
  // Pull to refresh states
  const [pulling, setPulling] = useState(false);
  const [pullY, setPullY] = useState(0);
  const [readyToRefresh, setReadyToRefresh] = useState(false);
  const scrollRef = useRef(null);
  const startYRef = useRef(0);
  const wrapperStyle = {
    transform: `translateY(${pullY}px)`,
    transition: pulling ? 'none' : 'transform 0.4s cubic-bezier(0.25, 0.8, 0.25, 1)',
    filter: selectedMeeting ? 'blur(15px)' : 'none'
  };

  const fetchData = async () => {
    try {
      const [{ data: userRes }, { data: meetRes }, { data: storeRes }] = await Promise.all([
        supabase.from('profiles').select('*').limit(1).single(),
        supabase.from('meetings').select('*'),
        supabase.from('stores').select('*')
      ]);
      if (userRes) setProfile(userRes);
      if (meetRes) setMeetings(meetRes);
      if (storeRes) setStores(storeRes);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Format currency
  const formatPoints = (p) => p ? p.toLocaleString() : 0;

  // Touch handlers
  const handleTouchStart = (e) => {
    if (scrollRef.current && scrollRef.current.scrollTop === 0) {
      startYRef.current = e.touches[0].pageY;
      setPulling(true);
      setReadyToRefresh(false);
    }
  };

  const handleTouchMove = (e) => {
    if (!pulling) return;
    const currentY = e.touches[0].pageY;
    let diff = (currentY - startYRef.current) * 0.4;
    
    if (diff > 0) {
      if (diff > 120) {
        diff = 120 + (diff - 120) * 0.2;
        if (!readyToRefresh && diff > 130) {
          setReadyToRefresh(true);
          if (navigator.vibrate) navigator.vibrate(30);
        }
      } else {
        setReadyToRefresh(false);
      }
      setPullY(diff);
    }
  };

  const handleTouchEnd = async (e) => {
    if (!pulling) return;
    setPulling(false);
    
    if (readyToRefresh) {
      setIsRefreshing(true);
      if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      await fetchData();
      setIsRefreshing(false);
      setReadyToRefresh(false);
    }
    setPullY(0);
  };

  // Calendar setup (14 days)
  const days = ['일', '월', '화', '수', '목', '금', '토'];
  const now = new Date();
  const calendarItems = Array.from({ length: 14 }).map((_, i) => {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    
    // Find meeting matching this offset
    const meeting = meetings?.find(m => m.date_offset === i);
    const dateStr = `${d.getMonth() + 1}.${d.getDate()}(${days[d.getDay()]})`;

    return { i, dateStr, meeting, isToday: i === 0 };
  });

  return (
    <div id="app-container">
      <div 
        id="pull-wrapper" 
        style={wrapperStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        <div id="pull-indicator">
          <div id="pull-text">
            {isRefreshing ? '업데이트 중...' : readyToRefresh ? '손을 놓으면 업데이트 됩니다' : '↓ 아래로 당겨서 업데이트'}
          </div>
          <div className="refresh-spinner" style={{ display: isRefreshing ? 'block' : 'none' }}></div>
        </div>

        <header>
          <div className="profile-area">
            <div className="dog-silhouette">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path fill="#000000" d="M19,5.5c0-0.83-0.67-1.5-1.5-1.5S16,4.67,16,5.5c0,0.83,0.67,1.5,1.5,1.5S19,6.33,19,5.5z M22,10.5c0-1.38-1.12-2.5-2.5-2.5h-1.35c-0.34-1.16-1.41-2-2.65-2h-7c-1.38,0-2.5,1.12-2.5,2.5v1.35c-1.16,0.34-2,1.41-2,2.65v7c0,1.38,1.12,2.5,2.5,2.5h1.35c0.34,1.16,1.41,2,2.65,2h7c1.38,0,2.5-1.12,2.5-2.5v-1.35c1.16-0.34,2-1.41,2-2.65V10.5z M10,13.5L10,13.5c-0.83,0-1.5-0.67-1.5-1.5c0-0.83,0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5C11.5,12.83,10.83,13.5,10,13.5z M16,13.5L16,13.5c-0.83,0-1.5-0.67-1.5-1.5c0-0.83,0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5C17.5,12.83,16.83,13.5,16,13.5z"/>
              </svg>
            </div>
            <div className="user-info">
              <div className="sub-text">{profile?.sub_text || '로딩중...'}</div>
              <div className="main-text">{profile?.name || '...'}</div>
            </div>
          </div>
          <div className="notification-bell">
            <svg className="bell-icon" viewBox="0 0 24 24">
              <path d="M12 22c1.1 0 2-.9 2-2h-4c0 1.1.9 2 2 2zm6-6v-5c0-3.07-1.63-5.64-4.5-6.32V4c0-.83-.67-1.5-1.5-1.5s-1.5.67-1.5 1.5v.68C7.64 5.36 6 7.92 6 11v5l-2 2v1h16v-1l-2-2z"/>
            </svg>
            <div className="notification-badge">3</div>
          </div>
        </header>

        <section className="calendar-section">
          <div className="calendar-strip">
            {calendarItems.map((item) => {
              let isScrolling = false;
              let pressTimer;

              const tsStart = () => {
                isScrolling = false;
                pressTimer = setTimeout(() => {
                  if (!isScrolling) {
                    if (navigator.vibrate) navigator.vibrate(50);
                    setSelectedMeeting({ dateStr: item.dateStr, data: item.meeting });
                  }
                }, 400); 
              };

              return (
                <div 
                  key={item.i} 
                  className={`date-item ${item.isToday ? 'today' : ''}`}
                  onTouchStart={tsStart}
                  onTouchMove={() => { isScrolling = true; clearTimeout(pressTimer); }}
                  onTouchEnd={() => clearTimeout(pressTimer)}
                  onTouchCancel={() => clearTimeout(pressTimer)}
                >
                  <div className="date-label">{item.dateStr}</div>
                  <div className="meeting-info">{item.meeting ? '(1: 13:00)' : '-'}</div>
                </div>
              );
            })}
          </div>
        </section>

        <main id="main-scroll" ref={scrollRef}>
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
            <div className="action-card"><div className="card-title" style={{color:'#aaa'}}>추가 기능<br/>준비 중</div></div>
            <div className="action-card"><div className="card-title" style={{color:'#aaa'}}>추가 기능<br/>준비 중</div></div>
          </section>
        </main>
      </div>

      <nav id="main-nav">
        <div className="nav-item active"><div className="nav-icon"></div></div>
        <div className="nav-item"><div className="nav-icon"></div></div>
        <div className="nav-item"><div className="nav-icon"></div></div>
        <div className="nav-item"><div className="nav-icon"></div></div>
      </nav>

      {selectedMeeting && (
        <div id="overlay-container" onClick={() => setSelectedMeeting(null)}>
          <div className="detail-popup" onClick={e => e.stopPropagation()}>
            <h3>{selectedMeeting.dateStr} 미팅</h3>
            {selectedMeeting.data ? (
              <>
                <div className="detail-row"><span className="detail-label">누구랑 :</span><span className="detail-value">{selectedMeeting.data.who}</span></div>
                <div className="detail-row"><span className="detail-label">어디서 :</span><span className="detail-value">{selectedMeeting.data.where_location}</span></div>
                <div className="detail-row"><span className="detail-label">무엇을 :</span><span className="detail-value">{selectedMeeting.data.what}</span></div>
                <div className="detail-row"><span className="detail-label">결제자 :</span><span className="detail-value">{selectedMeeting.data.payer}</span></div>
              </>
            ) : (
              <div style={{textAlign:'center', color:'#aaa', margin:'20px 0'}}>일정이 없습니다.</div>
            )}
            <button className="close-btn" onClick={() => setSelectedMeeting(null)}>확인</button>
          </div>
        </div>
      )}
    </div>
  );
}
