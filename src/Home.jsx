import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import MapView from './MapView';

export default function Home({ stores, profile, formatPoints, handleTestOrder, handleBeanOrder }) {
  const navigate = useNavigate();
  const [activeCard, setActiveCard] = useState(null); // 'store' | 'cafe' | 'beans' | null
  const [isMapMode, setIsMapMode] = useState(false);
  const [showBeansList, setShowBeansList] = useState(false);

  const toggleMapMode = () => {
    if (navigator.vibrate) navigator.vibrate(15);
    setIsMapMode(prev => !prev);
    setActiveCard(null); // 맵 모드 진입 시 모든 카드 노멀 화
  };

  const toggleCard = (cardName) => {
    if (navigator.vibrate) navigator.vibrate(15);
    setActiveCard(prev => {
      const nextState = prev === cardName ? null : cardName;
      if (nextState !== 'beans') setShowBeansList(false);
      return nextState;
    });
  };


  // 최근 방문 카페 데이터 (향후 DB 연동)
  const recentCafes = [
    { name: '인하대점', item: '아이스 아메리카노', date: '오늘' },
    { name: '종각점', item: '카페라떼', date: '어제' },
    { name: '을지로점', item: '핸드드립', date: '3일 전' },
    { name: '성수점', item: '콜드브루', date: '1주 전' },
  ];

  return (
    <div className={`home-interactive ${isMapMode ? 'map-active' : ''}`}>
      {/* 1. Balance Card - 맵 모드 시 콤팩트로 전환 (데이터는 유지하며 레이아웃만 변형) */}
      <section className={`balance-card ${isMapMode ? 'compact' : ''}`}>
        <div className="balance-compact-row">
          <div className="balance-info-mini">
            <span className="mini-label">My Cup</span>
            <span className="mini-value">CUP {formatPoints(profile?.points)}</span>
          </div>
          <button className="balance-topup mini">Top Up</button>
        </div>
        
        <div className="balance-full-content">
          <div className="balance-header">
            <span className="balance-label">My Cup</span>
            <button className="balance-topup">Top Up</button>
          </div>
          <div className="balance-amount">
            CUP {formatPoints(profile?.points)}
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{opacity: 0.5}}><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path><circle cx="12" cy="12" r="3"></circle></svg>
          </div>
          <div className="balance-actions">
            <button className="balance-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 3L21 7L17 11"></path><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><path d="M7 21L3 17L7 13"></path><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></svg>
              Transfer
            </button>
            <button className="balance-btn">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="16"></line><line x1="8" y1="12" x2="16" y2="12"></line></svg>
              Receive
            </button>
          </div>
        </div>
      </section>

      <div className="home-layout-container">
        {/* 왼쪽 섹션 컬럼 (맵 모드 세는 사이드바 아이콘으로 변함) */}
        <div className="sections-column">
          {/* 2. 내 주변매장 - 피크 캐러셀 */}
          <StoreCarousel 
            stores={stores} 
            onMapClick={toggleMapMode} 
            isSidebar={isMapMode} 
            forceCompact={activeCard !== null && activeCard !== 'store'}
            onClickHeader={() => toggleCard('store')}
          />

          {/* 3. 우리카페 */}
          <CafeSection 
            isExpanded={activeCard === 'cafe'}
            isCompact={activeCard !== null && activeCard !== 'cafe'}
            toggleCafe={() => toggleCard('cafe')}
            onRestoreCafe={() => setActiveCard(null)}
            recentCafes={recentCafes} 
            handleTestOrder={handleTestOrder} 
            isSidebar={isMapMode}
          />

          {/* 4. 원두주문 버튼 */}
          <div 
            className={`beans-order-card ${isMapMode ? 'sidebar-mode' : ''} ${activeCard === 'beans' ? 'expanded' : ''} ${activeCard !== null && activeCard !== 'beans' ? 'compact' : ''}`}
            onClick={() => {
              if (isMapMode) {
                toggleMapMode(); // 사이드바 클릭 시 맵 종료 (홈 복귀)
              } else {
                toggleCard('beans');
              }
            }}
          >
            <div className="beans-order-main">
              <div className="beans-order-icon">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2z"></path>
                  <path d="M8 12c0-2.5 1.5-4.5 4-4.5s4 2 4 4.5-1.5 4.5-4 4.5-4-2-4-4.5z"></path>
                </svg>
              </div>
              <div className="beans-order-text hide-in-sidebar">
                <div className="beans-order-title">원두주문하기</div>
                <div className="beans-order-subtitle text-truncate">원하는곳으로 배송</div>
              </div>
              <div className={`expand-arrow beans-arrow hide-in-sidebar ${activeCard === 'beans' ? 'rotated' : ''}`}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
              </div>
            </div>

            {/* 확장 영역: 추가 버튼 (사이드바일때는 완전 숨김) */}
            <div className={`beans-expand hide-in-sidebar ${activeCard === 'beans' ? 'open' : ''}`}>
              <div className="beans-expand-divider" />
              <div className="beans-expand-grid">
                <button 
                  className="beans-expand-btn w-100" 
                  style={{ flex: 1, flexDirection: 'row', justifyContent: 'space-between', padding: '14px 20px', background: 'rgba(255,255,255,0.15)' }}
                  onClick={(e) => { 
                    e.stopPropagation(); 
                    setShowBeansList(prev => !prev);
                  }}
                >
                  <span style={{ fontSize: '0.95rem', fontWeight: 'bold' }}>해치커피로스터리</span>
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ transform: showBeansList ? 'rotate(180deg)' : 'none', transition: 'transform 0.2s' }}><polyline points="6 9 12 15 18 9"></polyline></svg>
                </button>
              </div>
              
              <div className={`beans-sub-list ${showBeansList ? 'open' : ''}`}>
                {[
                  { name: '해치너트', price: 22000 }, 
                  { name: '해치프룻', price: 28000 }, 
                  { name: '디카페인', price: 36000 }, 
                  { name: '해치너트2', price: 24000 }, 
                  { name: '해치너트3', price: 24000 }
                ].map((bean, idx) => (
                  <button key={idx} className="beans-sub-item-btn" onClick={(e) => { e.stopPropagation(); handleBeanOrder(bean.name, bean.price); }}>
                    <span>{bean.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>{formatPoints(bean.price)}P</span>
                      <span className="order-plus">+</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* 오른쪽 지도 컬럼 (맵 모드 활성화 시 등장) */}
        <div className={`map-column ${isMapMode ? 'active' : ''}`}>
          {isMapMode && (
            <MapView 
              profile={profile} 
              stores={stores} 
              onClose={() => setIsMapMode(false)} 
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ==========================================
   StoreCarousel - 피크 캐러셀 (좌우 카드 보임)
   ========================================== */
function StoreCarousel({ stores, onMapClick, isSidebar, forceCompact, onClickHeader }) {
  const [internalCompact, setInternalCompact] = useState(true); // 앱 구동 시 기본적으로 최소화(Compact) 상태
  const isCompact = forceCompact || internalCompact;
  const [current, setCurrent] = useState(0);
  const [isAutoPlay, setIsAutoPlay] = useState(true);
  const touchStartX = useRef(0);
  const touchStartY = useRef(0);
  const touchDeltaX = useRef(0);
  const touchDeltaY = useRef(0);
  const [dragging, setDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const autoPlayRef = useRef(null);

  // 데모 데이터 (항상 추가하여 캐러셀 동작을 확인할 수 있도록 함)
  const demoStores = [
    { id: 'd1', store_name: '해치카페 굴포천점', item: '아이스 아메리카노 T', badge_text: '이벤트' },
    { id: 'd2', store_name: '해치다방 부평고점', item: '카페라떼', badge_text: null },
    { id: 'd3', store_name: '종각점', item: '핸드드립 커피', badge_text: '신메뉴' },
  ];

  // DB에서 불러온 매장이 있든 없든 데모 매장을 합쳐서 캐러셀이 항상 움직이게 설정
  const allStores = [...stores, ...demoStores];
  const total = allStores.length;

  // 자동 슬라이딩 (4초마다 왼쪽으로)
  useEffect(() => {
    if (!isAutoPlay || total <= 1) return;
    autoPlayRef.current = setInterval(() => {
      setCurrent(prev => (prev + 1) % total);
    }, 4000);
    return () => clearInterval(autoPlayRef.current);
  }, [isAutoPlay, total]);

  // 드래그 시작
  const handleDragStart = (clientX, clientY) => {
    setIsAutoPlay(false);
    clearInterval(autoPlayRef.current);
    touchStartX.current = clientX;
    touchStartY.current = clientY;
    setDragging(true);
  };

  // 드래그 이동
  const handleDragMove = (clientX, clientY) => {
    if (!dragging) return;
    const deltaX = clientX - touchStartX.current;
    const deltaY = clientY - touchStartY.current;
    touchDeltaX.current = deltaX;
    touchDeltaY.current = deltaY;
    
    // 수평 이동(좌우)만 카드를 움직이는 오프셋으로 반영합니다.
    setDragOffset(deltaX);
  };

  // 드래그 종료
  const handleDragEnd = () => {
    if (!dragging) return;
    setDragging(false);
    
    const thresholdX = 40; // 좌우 스와이프 임계값
    const thresholdY = -15; // 위로 스와이프 임계값 (민감도를 50에서 15로 대폭 낮춰 즉각적으로 반응하게 함)

    // Y축(위쪽)으로 크고, 상하 각도가 좌우보다 클 때 콤팩트 모드 스위치
    if (touchDeltaY.current < thresholdY && Math.abs(touchDeltaY.current) > Math.abs(touchDeltaX.current)) {
      setInternalCompact(true); // 위로 스와이프: 콤팩트 모드 켬
      setIsAutoPlay(true); // 상단 이동 시 로테이션 즉시 재개
    } else if (touchDeltaY.current > -thresholdY && Math.abs(touchDeltaY.current) > Math.abs(touchDeltaX.current)) {
      setInternalCompact(false); // 아래로 스와이프: 콤팩트 모드 끔
    } else {
      // 일반적인 좌우 로테이션 동작
      if (touchDeltaX.current < -thresholdX) {
        setCurrent(prev => (prev + 1) % total);
      } else if (touchDeltaX.current > thresholdX) {
        setCurrent(prev => (prev - 1 + total) % total);
      }
    }
    
    setDragOffset(0);
    touchDeltaX.current = 0;
    touchDeltaY.current = 0;
    // 5초 후 자동재생 재개
    setTimeout(() => setIsAutoPlay(true), 5000);
  };

  // 각 카드의 위치 계산
  const getCardStyle = (idx) => {
    const diff = idx - current;
    // 무한루프 처리
    let normalizedDiff = diff;
    if (diff > total / 2) normalizedDiff = diff - total;
    if (diff < -total / 2) normalizedDiff = diff + total;

    // 콤팩트 모드일 땐 카드가 100% 너비를 차지하여 밖으로 완전히 밀려나게 함
    const cardWidth = 100; // %
    const gap = isCompact ? 0 : 16; // px

    let opacity = Math.abs(normalizedDiff) > 1 ? 0 : normalizedDiff === 0 ? 1 : 0.4;
    if (isCompact && normalizedDiff !== 0) {
      opacity = 0; // 콤팩트 모드에서는 겹침 방지를 위해 옆 카드는 투명하게
    }

    return {
      // 너비 %와 간격 px, 그리고 드래그 옵셋을 calc로 계산
      transform: `translateX(calc(${normalizedDiff * cardWidth}% + ${normalizedDiff * gap}px + ${dragOffset * 0.4}px))`,
      opacity,
      scale: isCompact ? '1' : (normalizedDiff === 0 ? '1' : '0.88'),
      zIndex: normalizedDiff === 0 ? 2 : 1,
      // 바운스 효과 대신 천천히 일정한 속도로 부드럽게 이동하게 변경 (1.2s ease-in-out)
      transition: dragging ? 'none' : 'all 1.2s ease-in-out',
      pointerEvents: normalizedDiff === 0 ? 'auto' : 'none',
    };
  };

  if (total === 0) {
    return (
      <div className="store-carousel-empty">주변 매장이 없습니다</div>
    );
  }

  return (
    <div 
      className={`store-carousel-wrapper ${isCompact ? 'compact' : ''} ${isSidebar ? 'sidebar-mode' : ''}`}
      onClick={(e) => {
        if (isSidebar) {
           onMapClick(); // 사이드바 상태에서 클릭 시 맵 종료
           return;
        }
        // 헤더 빈 공간이나 카드 여백을 터치하면 이 카드를 메인(Normal/Expanded)으로 포커싱합니다.
        if (onClickHeader) onClickHeader();
        if (internalCompact) setInternalCompact(false);
      }}
    >
      <div className="section-header store-header">
        <span className="section-title">내 주변매장</span>
        <span className="section-link" onClick={(e) => {
          e.stopPropagation();
          onMapClick();
        }}>
          지도에서 보기
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{marginLeft:'3px'}}><polyline points="9 18 15 12 9 6"></polyline></svg>
        </span>
      </div>

      <div
        className="store-carousel"
        // 모바일 터치 이벤트
        onTouchStart={(e) => handleDragStart(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchMove={(e) => handleDragMove(e.touches[0].clientX, e.touches[0].clientY)}
        onTouchEnd={handleDragEnd}
        onTouchCancel={handleDragEnd}
        // 데스크탑 마우스 이벤트
        onMouseDown={(e) => handleDragStart(e.clientX, e.clientY)}
        onMouseMove={(e) => handleDragMove(e.clientX, e.clientY)}
        onMouseUp={handleDragEnd}
        onMouseLeave={handleDragEnd}
      >
      <div className="store-carousel-track">
        {allStores.map((store, idx) => (
          <div
            key={store.id}
            className="store-carousel-card"
            style={getCardStyle(idx)}
          >
            <div className="carousel-card-inner">
              <div className="activity-icon">
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path><polyline points="9 22 9 12 15 12 15 22"></polyline></svg>
              </div>
              <div className="activity-info hide-in-sidebar">
                <div className="activity-main">
                  <span className="store-name">{store.store_name}</span>
                  <div className="status-tag blue compact-only">영업중</div>
                </div>
                <div className="activity-sub">
                  <span className="item-name">{store.item}</span>
                  <div className={`store-event-badge compact-only ${store.badge_text ? '' : 'v-hidden'}`}>
                    <span className="event-dot"></span>
                    이벤트
                  </div>
                </div>
              </div>
              <div className={`store-event-badge normal-only hide-in-sidebar ${store.badge_text ? '' : 'v-hidden'}`}>
                <span className="event-dot"></span>
                이벤트
              </div>
              <div className="status-tag blue normal-only hide-in-sidebar">영업중</div>
            </div>
          </div>
        ))}
      </div>

      {/* 인디케이터 */}
      {total > 1 && (
        <div className="carousel-indicators">
          {allStores.map((_, idx) => (
            <div
              key={idx}
              className={`carousel-dot ${idx === current ? 'active' : ''}`}
              onClick={() => { setCurrent(idx); setIsAutoPlay(false); setTimeout(() => setIsAutoPlay(true), 5000); }}
            />
          ))}
        </div>
      )}
    </div>
    </div>
  );
}

/* ==========================================
   CafeSection - 우리카페 콤팩트 & 확장 가능 섹션
   ========================================== */
function CafeSection({ isCompact, isExpanded, toggleCafe, onRestoreCafe, recentCafes, handleTestOrder, isSidebar }) {
  const [internalCompact, setInternalCompact] = useState(true); // 앱 구동 시 기본적으로 최소화(Compact) 상태
  const touchStartY = useRef(0);
  const touchDeltaY = useRef(0);
  const wasDragged = useRef(false);

  // 부모가 콤팩트를 요구할 땐 강제 적용, 아닐 땐 스스로 숨긴 상태인지 확인
  const effectiveCompact = isCompact || internalCompact;

  const handleDragStart = (clientY) => {
    touchStartY.current = clientY;
    touchDeltaY.current = 0;
    wasDragged.current = false;
  };

  const handleDragMove = (clientY) => {
    touchDeltaY.current = clientY - touchStartY.current;
    if (Math.abs(touchDeltaY.current) > 10) {
      wasDragged.current = true;
    }
  };

  const handleDragEnd = () => {
    // 제스처가 헤더 영역에서만 작동하므로 다시 조금 더 직관적인 -25px 임계값 적용
    if (touchDeltaY.current < -25) {
      if (isExpanded) {
        onRestoreCafe();
      } else {
        setInternalCompact(true); // 수동으로 축소(Compact) 상태로 만듦
      }
    } else if (touchDeltaY.current > 25) {
      if (!isExpanded && !effectiveCompact) toggleCafe();
    }
    touchDeltaY.current = 0;
    
    // 유령 클릭 방지
    setTimeout(() => {
      wasDragged.current = false;
    }, 50);
  };

  return (
    <div 
      className={`cafe-wrapper ${effectiveCompact ? 'compact' : ''} ${isExpanded ? 'expanded-mode' : ''} ${isSidebar ? 'sidebar-mode' : ''}`}
      onClick={() => {
        if (isSidebar) {
          onRestoreCafe(); // 맵 모드 종료 연동
          return;
        }
        if (effectiveCompact) {
          setInternalCompact(false); // 수동 콤팩트 상태 해제
          onRestoreCafe(); 
        }
      }}
    >
      <div className="section-header store-header">
        <span className="section-title">우리카페</span>
        <span className="section-link" onClick={(e) => { e.stopPropagation(); toggleCafe(); }}>전체보기</span>
      </div>
      
      <div 
        className={`elastic-card ${isExpanded ? 'expanded' : ''}`}
        onClick={(e) => {
          if (wasDragged.current) {
            e.preventDefault();
            e.stopPropagation();
            return;
          }
          if (!effectiveCompact) toggleCafe();
        }}
      >
        {/* 상단 라벨(cafe-main-row)에만 스와이프 제스처를 달아, 하단 리스트 스크롤 시 오작동하는 치명적 쾌적함 저하를 완전히 뿌리뽑습니다. */}
        <div 
          className="cafe-main-row"
          onTouchStart={(e) => handleDragStart(e.touches[0].clientY)}
          onTouchMove={(e) => handleDragMove(e.touches[0].clientY)}
          onTouchEnd={handleDragEnd}
          onTouchCancel={handleDragEnd}
          onMouseDown={(e) => handleDragStart(e.clientY)}
          onMouseMove={(e) => { if (e.buttons > 0) handleDragMove(e.clientY); }}
          onMouseUp={handleDragEnd}
          onMouseLeave={handleDragEnd}
        >
          <div className="activity-icon cafe-icon">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8h1a4 4 0 0 1 0 8h-1"></path><path d="M2 8h16v9a4 4 0 0 1-4 4H6a4 4 0 0 1-4-4V8z"></path><line x1="6" y1="1" x2="6" y2="4"></line><line x1="10" y1="1" x2="10" y2="4"></line><line x1="14" y1="1" x2="14" y2="4"></line></svg>
          </div>
          <div className="activity-info hide-in-sidebar">
            <div className="activity-main compact-flex">주문하기</div>
            <div className="activity-sub">원하는 곳으로 배송 · 선물하기</div>
          </div>
          <div className={`expand-arrow hide-in-sidebar ${isExpanded && !effectiveCompact ? 'rotated' : ''}`}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </div>
        </div>

        {/* 확장 영역: 최근 방문 카페 목록 (사이드바일때는 완전 수납) */}
        <div className={`cafe-expand-list hide-in-sidebar ${isExpanded ? 'open' : ''}`}>
          <div className="cafe-expand-divider" />
          <div className="cafe-expand-title">최근 방문한 매장</div>
          {recentCafes.map((cafe, idx) => (
            <div key={idx} className="cafe-expand-item" onClick={(e) => { e.stopPropagation(); handleTestOrder(); }}>
              <div className="cafe-expand-icon">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path><circle cx="12" cy="10" r="3"></circle></svg>
              </div>
              <div className="cafe-expand-info">
                <span className="cafe-expand-name">{cafe.name}</span>
                <span className="cafe-expand-item-name">{cafe.item}</span>
              </div>
              <span className="cafe-expand-date">{cafe.date}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
