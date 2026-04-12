import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase.js';
import Login from './Login.jsx';
import Home from './Home.jsx';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);

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

  useEffect(() => {
    // 1. 현재 세션 로드 (로그인 되어있는지 체크)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });

    // 2. 로그인/로그아웃 이벤트 감지
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const [{ data: userRes }, { data: meetRes }, { data: storeRes }] = await Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).limit(1).single(),
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

  // 로그인 상태일 때만 데이터 조회
  useEffect(() => {
    if (session) fetchData();
  }, [session]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  // 임시 주문 생성 함수 (POS 테스트용)
  const handleTestOrder = async () => {
    if (!session?.user?.id || stores.length === 0) {
      alert("매장 데이터를 아직 불러오지 못했습니다.");
      return;
    }
    try {
      const orderData = {
        store_id: stores[0].id,
        user_id: session.user.id,
        items: [
          { name: "아메리카노 (HOT)", qty: 2, price: 4500 },
          { name: "초코 무스 케이크", qty: 1, price: 6500 }
        ],
        total_price: 15500, // 4500*2 + 6500
        status: '대기중'
      };

      const { error } = await supabase.from('orders').insert([orderData]);
      if (error) throw error;
      alert("테스트 주문이 매장으로 전송되었습니다!");
    } catch (err) {
      console.error(err);
      alert("주문 실패: " + err.message);
    }
  };

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
    
    // 사용자가 위로 밀어 올리는(실제로는 아래로 스크롤) 행동일 경우 당기기 취소
    if (diff < 0) {
      setPulling(false);
      return;
    }

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
    
    const meeting = meetings?.find(m => m.date_offset === i);
    const dateStr = `${d.getMonth() + 1}.${d.getDate()}(${days[d.getDay()]})`;

    return { i, dateStr, meeting, isToday: i === 0 };
  });

  // 로딩 화면
  if (isSessionLoading) {
    return <div style={{width:'100%', height:'100dvh', backgroundColor: '#000', display:'flex', justifyContent:'center', alignItems:'center'}}><div className="refresh-spinner" style={{display:'block'}}></div></div>;
  }

  // 로그인되지 않은 상태면 Login 화면 렌더링
  if (!session) {
    return <Login />;
  }

  // 로그인 상태면 메인 WURI 앱 렌더링
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
          <div className="profile-area" onClick={handleLogout} style={{cursor:'pointer'}}>
            <div className="dog-silhouette">
              <svg viewBox="0 0 24 24" width="28" height="28">
                <path fill="#000000" d="M19,5.5c0-0.83-0.67-1.5-1.5-1.5S16,4.67,16,5.5c0,0.83,0.67,1.5,1.5,1.5S19,6.33,19,5.5z M22,10.5c0-1.38-1.12-2.5-2.5-2.5h-1.35c-0.34-1.16-1.41-2-2.65-2h-7c-1.38,0-2.5,1.12-2.5,2.5v1.35c-1.16,0.34-2,1.41-2,2.65v7c0,1.38,1.12,2.5,2.5,2.5h1.35c0.34,1.16,1.41,2,2.65,2h7c1.38,0,2.5-1.12,2.5-2.5v-1.35c1.16-0.34,2-1.41,2-2.65V10.5z M10,13.5L10,13.5c-0.83,0-1.5-0.67-1.5-1.5c0-0.83,0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5C11.5,12.83,10.83,13.5,10,13.5z M16,13.5L16,13.5c-0.83,0-1.5-0.67-1.5-1.5c0-0.83,0.67-1.5,1.5-1.5s1.5,0.67,1.5,1.5C17.5,12.83,16.83,13.5,16,13.5z"/>
              </svg>
            </div>
            <div className="user-info">
              <div className="sub-text" style={{fontSize: '0.6rem'}}>{profile?.sub_text || '로딩중...'} (누르면 로그아웃)</div>
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
              return (
                <div 
                  key={item.i} 
                  className={`date-item ${item.isToday ? 'today' : ''}`}
                  onClick={() => {
                     if (navigator.vibrate) navigator.vibrate(30);
                     setSelectedMeeting({ dateStr: item.dateStr, data: item.meeting });
                  }}
                >
                  <div className="date-label">{item.dateStr}</div>
                  <div className="meeting-info">{item.meeting ? '(1: 13:00)' : '-'}</div>
                </div>
              );
            })}
          </div>
        </section>

        <main id="main-scroll" ref={scrollRef}>
          <Routes>
            <Route path="/" element={<Home stores={stores} profile={profile} formatPoints={formatPoints} handleTestOrder={handleTestOrder} />} />
            <Route path="/moiza" element={
              <div style={{color:'#fff', textAlign:'center', marginTop:'50px'}}>
                <h2>MOIZA 모이자 화면</h2><p>기능 준비 중입니다.</p>
              </div>
            } />
            <Route path="/point" element={
              <div style={{color:'#fff', textAlign:'center', marginTop:'50px'}}>
                <h2>POINT Launcher</h2><p>기능 준비 중입니다.</p>
              </div>
            } />
            <Route path="/pos" element={
              <div style={{color:'#fff', textAlign:'center', marginTop:'50px'}}>
                <h2>POS System</h2><p>포스 시스템 연동 준비 중입니다.</p>
              </div>
            } />
          </Routes>
        </main>
      </div>

      <nav id="main-nav">
        <div className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}><div className="nav-icon"></div></div>
        <div className={`nav-item ${location.pathname === '/point' ? 'active' : ''}`} onClick={() => navigate('/point')}><div className="nav-icon"></div></div>
        <div className={`nav-item ${location.pathname === '/moiza' ? 'active' : ''}`} onClick={() => navigate('/moiza')}><div className="nav-icon"></div></div>
        <div className={`nav-item ${location.pathname === '/pos' ? 'active' : ''}`} onClick={() => navigate('/pos')}><div className="nav-icon"></div></div>
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
