import { useState, useEffect, useRef } from 'react';
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom';
import { supabase } from '../supabase.js';
import Login from './Login.jsx';
import Home from './Home.jsx';
import PointLauncher from './PointLauncher.jsx';
import PosTest from './PosTest.jsx';
import MapView from './MapView.jsx';
import Settings from './Settings.jsx';
import ZoneSetup from './ZoneSetup.jsx';
import LandingPage from './pages/web/LandingPage.jsx';
import AdminLogin from './pages/admin/AdminLogin.jsx';
import AdminDashboard from './pages/admin/AdminDashboard.jsx';

export default function App() {
  const navigate = useNavigate();
  const location = useLocation();
  const [session, setSession] = useState(null);
  const [isSessionLoading, setIsSessionLoading] = useState(true);
  const [loadingTimeout, setLoadingTimeout] = useState(false); // 최대 3초 로딩 보호

  const [profile, setProfile] = useState(null);
  const [meetings, setMeetings] = useState([]);
  const [stores, setStores] = useState([]);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [needsZoneSetup, setNeedsZoneSetup] = useState(false);

  // Desktop detection for separating web vs mobile UI
  // Use userAgent to reliably detect PCs even on low resolutions or narrow windows
  const isMobileDevice = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const [isDesktop, setIsDesktop] = useState(!isMobileDevice);

  useEffect(() => {
    if (window.__TAURI__ && location.pathname === '/') {
      navigate('/pos');
    }
  }, [navigate, location]);
  
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

  // 로딩 타임아웃: 최대 3초 후 강제 해제 (네트워크 지연 등 대비)
  useEffect(() => {
    const t = setTimeout(() => setLoadingTimeout(true), 3000);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    // 1. 현재 세션 로드 (로그인 되어있는지 체크)
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setIsSessionLoading(false);
    });

    // 2. 로그인/로그아웃 이벤트 감지
    // SIGNED_IN: 신규 OAuth 로그인 시에만 super_admin을 대시보드로 이동
    // INITIAL_SESSION: 새 탭에서 기존 세션 복원 시 → 리다이렉트 안 함
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      setSession(session);

      if (event === 'SIGNED_IN' && session) {
        try {
          const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', session.user.id)
            .single();
          // 데스크톱(PC) 접속일 때만 최고 관리자를 대시보드로 자동 리다이렉트 (모바일은 앱 화면 유지)
          if (profile?.role === 'super_admin' && !isMobileDevice) {
            navigate('/admin/dashboard');
          }
        } catch (e) { /* silent */ }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const fetchData = async () => {
    if (!session?.user?.id) return;
    try {
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('fetchData timeout')), 4000));
      
      const fetchPromise = Promise.all([
        supabase.from('profiles').select('*').eq('id', session.user.id).limit(1).single(),
        supabase.from('meetings').select('*'),
        supabase.from('stores').select('*')
      ]);

      const [{ data: userRes }, { data: meetRes }, { data: storeRes }] = await Promise.race([fetchPromise, timeoutPromise]);
      
      if (userRes) {
        setProfile(userRes);
        // 동네 미설정 체크
        setNeedsZoneSetup(!userRes.home_zone_name);
      }
      if (meetRes) setMeetings(meetRes);
      if (storeRes) setStores(storeRes);
    } catch (error) {
      console.error('Error fetching data:', error);
      // DB 연결 실패 시에도 임시로 UI가 작동하도록 데모 데이터 삽입
      if (stores.length === 0) {
        setStores([{ id: 'mock1', store_name: '해치카페 테스트점' }]);
      }
    }
  };

  const [isNotifOpen, setIsNotifOpen] = useState(false);

  // 현재 로그인 상태면 데이터 조회
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

  // 실제 원두 주문 및 포인트 차감 로직
  const handleBeanOrder = async (beanName, price) => {
    if (!session?.user?.id || stores.length === 0) {
      alert("데이터를 아직 불러오지 못했습니다.");
      return;
    }
    
    if (profile.points < price) {
      alert(`잔여 포인트가 부족합니다.\n(현재: ${formatPoints(profile.points)}P / 필요: ${formatPoints(price)}P)`);
      return;
    }

    if (!window.confirm(`${beanName}을(를) 주문하시겠습니까?\n${formatPoints(price)} CUP이 차감됩니다.`)) return;

    try {
      const newPoints = profile.points - price;
      
      // 1. 포인트 차감 업데이트
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ points: newPoints })
        .eq('id', session.user.id);
        
      if (profileError) throw profileError;

      // 로컬 프로필 상태 즉시 업데이트
      setProfile(prev => ({ ...prev, points: newPoints }));

      // 2. 주문 내역 기록
      const orderData = {
        store_id: stores[0].id,
        user_id: session.user.id,
        items: [
          { name: beanName, qty: 1, price: price }
        ],
        total_price: price, // 주문 총액 추가
        status: '주문완료' // 매장 테스트할 땐 대기중이겠지만 원두 발주는 주문완료
      };

      const { error: orderError } = await supabase.from('orders').insert([orderData]);
      if (orderError) throw orderError;
      
      alert(`주문이 완료되었습니다!\n남은 잔여 CUP: ${formatPoints(newPoints)}P`);
    } catch (err) {
      console.error(err);
      alert("결제 실패: " + err.message);
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
    if (!pulling) {
      if (pullY > 0 && !isRefreshing) setPullY(0); // 강제 복구 안전장치
      return;
    }
    setPulling(false);
    
    if (readyToRefresh) {
      setIsRefreshing(true);
      
      try {
        if (navigator.vibrate) navigator.vibrate([50, 50, 50]);
      } catch (vibrateErr) {
        // 브라우저 권한에 의해 vibrate가 에러를 던질 수 있음
      }
      
      // 혹시 모를 데드락을 대비해 강제로 4초 후 UI 복구
      const fallbackTimer = setTimeout(() => {
        setIsRefreshing(false);
        setReadyToRefresh(false);
        setPullY(0);
      }, 4000);

      try {
        await fetchData();
      } catch (fetchErr) {
        console.error("fetchData error:", fetchErr);
      } finally {
        clearTimeout(fallbackTimer);
        setIsRefreshing(false);
        setReadyToRefresh(false);
        setPullY(0);
      }
    } else {
      setPullY(0);
    }
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

  // (super_admin 리다이렉트는 onAuthStateChange SIGNED_IN 이벤트에서 처리)


  // --- 2) 최고 관리자 숨겨진 라우팅 (모바일 UI 래퍼를 씌우지 않음) ---
  const isAdminRoute = location.pathname.startsWith('/admin');
  if (isAdminRoute) {
    return (
      <Routes>
        <Route path="/admin/login" element={<AdminLogin />} />
        <Route path="/admin/dashboard" element={<AdminDashboard />} />
      </Routes>
    );
  }

  // OAuth 파라미터는 SIGNED_IN 이벤트에서 처리되므로 별도 체크 불필요
  // 스피너는 isSessionLoading 중에만, 단 최대 3초로 제한
  if (isSessionLoading && !loadingTimeout) {
    return <div style={{width:'100%', height:'100dvh', backgroundColor: '#fff', display:'flex', justifyContent:'center', alignItems:'center'}}><div className="refresh-spinner" style={{display:'block'}}></div></div>;
  }
  
  // PC 데스크톱에서 '/'는 항상 랜딩 페이지 (세션 유무 무관)
  // 어드민은 SIGNED_IN 이벤트로 /admin/dashboard로 자동 이동됨
  const isWebLanding = isDesktop && location.pathname === '/' && !window.__TAURI__;
  
  if (isWebLanding) {
    return <LandingPage />;
  }

  // --- 4) 로그인되지 않은 일반 모바일(또는 기타 경로) 사용자 ---
  if (!session && !isAdminRoute) {
    return <Login />;
  }

  // 동네 미설정 시 강제로 설정 창으로 보내는 로직 제거 (메인 화면 우선 진입)
  // 향후 사용자가 팝업이나 설정 탭을 통해 자발적으로 동네를 설정할 수 있도록 유도합니다.
  // 로그인 상태면 메인 WURI 앱 렌더링
  return (
    <div id="app-container">
      <div 
        id="pull-wrapper" 
        style={wrapperStyle}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
      >
        <div id="pull-indicator">
          <div id="pull-text">
            {isRefreshing ? '데이터 동기화 중...' : readyToRefresh ? '손을 놓으면 동기화됩니다' : '↓ 아래로 당겨서 동기화'}
          </div>
          <div className="refresh-spinner" style={{ display: isRefreshing ? 'block' : 'none' }}></div>
        </div>

        <header>
          <div className="profile-area" onClick={() => navigate('/settings')} style={{cursor:'pointer'}}>
            <div className="user-avatar">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                <circle cx="12" cy="7" r="4"></circle>
              </svg>
            </div>
            <div className="user-info">
              <div className="sub-text">
                {profile?.home_zone_name && (
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor" stroke="none" style={{marginRight:'3px', opacity:0.5}}><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg>
                )}
                {profile?.home_zone_name || profile?.sub_text || 'WURI Member'}
              </div>
              <div className="main-text">Hello, {profile?.name || 'Guest'}</div>
            </div>
          </div>
          <div 
            className={`notification-bell ${meetings.length > 0 ? 'active' : ''}`}
            onClick={() => {
              if (navigator.vibrate) navigator.vibrate(30);
              setIsNotifOpen(true);
            }}
          >
            <svg className="bell-icon" viewBox="0 0 24 24">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
              <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
            </svg>
          </div>
        </header>

        <section className="calendar-section">
          <div className="calendar-pill">
            {calendarItems.map((item) => (
              <div 
                key={item.i} 
                className={`date-dot ${item.isToday ? 'active' : ''}`}
                onClick={() => {
                   if (navigator.vibrate) navigator.vibrate(30);
                   setSelectedMeeting({ dateStr: item.dateStr, data: item.meeting });
                }}
              >
                {item.dateStr.split('(')[0]}
              </div>
            ))}
          </div>
        </section>

        <main id="main-scroll" ref={scrollRef}>
          <Routes>
            <Route path="/" element={<Home stores={stores} profile={profile} formatPoints={formatPoints} handleTestOrder={handleTestOrder} handleBeanOrder={handleBeanOrder} />} />
            <Route path="/moiza" element={
              <div style={{color:'#fff', textAlign:'center', marginTop:'50px'}}>
                <h2>MOIZA 모이자 화면</h2><p>기능 준비 중입니다.</p>
              </div>
            } />
            <Route path="/point" element={<PointLauncher session={session} profile={profile} fetchData={fetchData} />} />
            <Route path="/map" element={<MapView profile={profile} stores={stores} />} />
            <Route path="/settings" element={
              <Settings session={session} profile={profile} onProfileUpdate={fetchData} />
            } />
            <Route path="/pos" element={<PosTest />} />
            <Route path="*" element={<Home stores={stores} profile={profile} formatPoints={formatPoints} handleTestOrder={handleTestOrder} handleBeanOrder={handleBeanOrder} />} />
          </Routes>
        </main>
      </div>

      <nav id="main-nav">
        <div className={`nav-item ${location.pathname === '/' ? 'active' : ''}`} onClick={() => navigate('/')}>
          <svg className="nav-icon" viewBox="0 0 24 24"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
          <span className="nav-label">홈</span>
        </div>
        <div className={`nav-item ${location.pathname === '/map' ? 'active' : ''}`} onClick={() => navigate('/map')}>
          <svg className="nav-icon" viewBox="0 0 24 24"><rect x="2" y="3" width="20" height="14" rx="2" ry="2"></rect><line x1="8" y1="21" x2="16" y2="21"></line><line x1="12" y1="17" x2="12" y2="21"></line></svg>
          <span className="nav-label">비즈</span>
        </div>
        <div className={`nav-item ${location.pathname === '/moiza' ? 'active' : ''}`} onClick={() => navigate('/moiza')}>
          <svg className="nav-icon" viewBox="0 0 24 24"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"></path><circle cx="9" cy="7" r="4"></circle><path d="M23 21v-2a4 4 0 0 0-3-3.87"></path><path d="M16 3.13a4 4 0 0 1 0 7.75"></path></svg>
          <span className="nav-label">모임생성</span>
        </div>
        <div className={`nav-item ${location.pathname === '/point' ? 'active' : ''}`} onClick={() => navigate('/point')}>
          <svg className="nav-icon" viewBox="0 0 24 24"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path><polyline points="22 6 12 13 2 6"></polyline></svg>
          <span className="nav-label">초대</span>
        </div>
      </nav>

      {/* 알림 팝업 */}
      {isNotifOpen && (
        <div id="overlay-container" onClick={() => setIsNotifOpen(false)} style={{backdropFilter: 'blur(20px)'}}>
          <div className="detail-popup" onClick={e => e.stopPropagation()}>
            <h3 style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
              <span>새로운 알림</span>
              <span style={{fontSize: '0.7rem', color:'#aaa', fontWeight:'normal'}}>{meetings.length}건</span>
            </h3>
            
            <div style={{ maxHeight: '380px', overflowY: 'auto', margin: '0 -25px' }}>
              {meetings.length > 0 ? (
                meetings.map((m, idx) => (
                  <div key={idx} className="notif-item" style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <div style={{ padding: '15px' }}>
                      <div className="notif-time">오늘</div>
                      <div className="notif-title">{m.who}님과의 미팅 제안</div>
                      <div className="notif-desc">{m.what} 장소: {m.where_location}</div>
                      
                      <MeetingActionSlider 
                        onAccept={() => {
                          if (navigator.vibrate) navigator.vibrate([40, 30, 40]);
                          alert(`${m.who}님의 미팅을 승인했습니다.`);
                        }}
                        onDecline={() => {
                          if (navigator.vibrate) navigator.vibrate(50);
                          alert(`${m.who}님의 미팅을 거절했습니다.`);
                        }}
                      />
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ textAlign: 'center', padding: '40px 0', color: '#ccc' }}>
                  <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" style={{marginBottom:'15px'}}><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path><path d="M13.73 21a2 2 0 0 1-3.46 0"></path></svg>
                  <p style={{fontSize:'0.9rem'}}>새로운 알림이 없습니다.</p>
                </div>
              )}
            </div>

            <button className="close-btn" onClick={() => setIsNotifOpen(false)} style={{marginTop: '20px'}}>확인</button>
          </div>
        </div>
      )}

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
function MeetingActionSlider({ onAccept, onDecline }) {
  const [startX, setStartX] = useState(0);
  const [currentX, setCurrentX] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const trackRef = useRef(null);

  const handleStart = (e) => {
    setIsDragging(true);
    setStartX(e.type === 'touchstart' ? e.touches[0].clientX : e.clientX);
  };

  const handleMove = (e) => {
    if (!isDragging) return;
    const x = e.type === 'touchmove' ? e.touches[0].clientX : e.clientX;
    const walk = x - startX;
    
    const trackWidth = trackRef.current.offsetWidth;
    const halfTrack = (trackWidth - 40) / 2; // Knob is 40px
    setRelativeX(Math.max(-halfTrack, Math.min(walk, halfTrack)));
  };

  const [relativeX, setRelativeX] = useState(0);

  const handleEnd = () => {
    if (!isDragging) return;
    setIsDragging(false);
    
    const trackWidth = trackRef.current.offsetWidth;
    const threshold = (trackWidth / 2) * 0.7; // 70% threshold

    if (relativeX > threshold) {
      onAccept();
    } else if (relativeX < -threshold) {
      onDecline();
    }
    setRelativeX(0); // Reset
  };

  const leftWidth = relativeX < 0 ? Math.abs(relativeX) + 20 : 0;
  const rightWidth = relativeX > 0 ? relativeX + 20 : 0;

  return (
    <div 
      className="pill-slider-track"
      ref={trackRef}
      onMouseDown={handleStart}
      onMouseMove={handleMove}
      onMouseUp={handleEnd}
      onMouseLeave={handleEnd}
      onTouchStart={handleStart}
      onTouchMove={handleMove}
      onTouchEnd={handleEnd}
    >
      <div className="pill-slider-bg-left" style={{ width: leftWidth, transition: isDragging ? 'none' : 'width 0.3s' }}></div>
      <div className="pill-slider-bg-right" style={{ width: rightWidth, transition: isDragging ? 'none' : 'width 0.3s' }}></div>
      
      <div className="pill-slider-label" style={{ left: '20px', opacity: relativeX < -20 ? 1 : 0.3 }}>거절</div>
      <div className="pill-slider-label" style={{ right: '20px', opacity: relativeX > 20 ? 1 : 0.3 }}>승인</div>

      <div 
        className="pill-slider-knob" 
        style={{ 
          transform: `translateX(${relativeX}px)`,
          transition: isDragging ? 'none' : 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
        }}
      >
        <div style={{ display:'flex', gap:'3px' }}>
          <div style={{ width:'3px', height:'3px', backgroundColor:'#ddd', borderRadius:'50%' }}></div>
          <div style={{ width:'3px', height:'3px', backgroundColor:'#ddd', borderRadius:'50%' }}></div>
          <div style={{ width:'3px', height:'3px', backgroundColor:'#ddd', borderRadius:'50%' }}></div>
        </div>
      </div>
    </div>
  );
}
