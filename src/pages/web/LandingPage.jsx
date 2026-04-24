import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showConsent, setShowConsent] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const scrollTimeoutRef = useRef(null);
  const triggerRef = useRef(false);
  const keyBufferRef = useRef('');
  const keyBufferTimerRef = useRef(null);
  const SECRET_CODE = 'gocl';

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    const handleScroll = () => {
      // 스크롤 시작 시 상태 변경
      setIsScrolling(true);
      document.body.classList.add('is-scrolling');

      // 기존 타이머 제거 후 새로운 타이머 설정 (멈춤 감지)
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      scrollTimeoutRef.current = setTimeout(() => {
        setIsScrolling(false);
        document.body.classList.remove('is-scrolling');
      }, 500);
    };

    const handleF12 = (e) => {
      if (e.key === 'F12') {
        const randomDelay = Math.random() * (15100 - 4200) + 4200;
        console.warn(`[Security Alert] Developer tools access detected. Scheduled refresh in ${(randomDelay/1000).toFixed(1)}s.`);
        setTimeout(() => { window.location.reload(); }, randomDelay);
      }
    };

    const handleSecretKey = (e) => {
      if (!triggerRef.current) return;
      // 버퍼에 키 추가 (영문 소문자만)
      const key = e.key.toLowerCase();
      if (key.length === 1 && /[a-z]/.test(key)) {
        keyBufferRef.current += key;
        // 시크릿 코드 끝부분과 매칭
        if (keyBufferRef.current.endsWith(SECRET_CODE)) {
          keyBufferRef.current = '';
          triggerRef.current = false;
          navigate('/admin/login');
          return;
        }
        // 5초 후 버퍼 자동 초기화
        if (keyBufferTimerRef.current) clearTimeout(keyBufferTimerRef.current);
        keyBufferTimerRef.current = setTimeout(() => {
          keyBufferRef.current = '';
          triggerRef.current = false;
        }, 5000);
      }
    };

    window.addEventListener('scroll', handleScroll);
    window.addEventListener('keydown', handleF12);
    window.addEventListener('keydown', handleSecretKey);

    const timer = setTimeout(() => {
      const isAgreed = localStorage.getItem('wuri-consent');
      if (!isAgreed) setShowConsent(true);
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      if (scrollTimeoutRef.current) clearTimeout(scrollTimeoutRef.current);
      if (keyBufferTimerRef.current) clearTimeout(keyBufferTimerRef.current);
      window.removeEventListener('scroll', handleScroll);
      window.removeEventListener('keydown', handleF12);
      window.removeEventListener('keydown', handleSecretKey);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
      document.body.classList.remove('is-scrolling');
    };
  }, []);

  const handleConsent = (agreed) => {
    if (agreed) {
      localStorage.setItem('wuri-consent', 'true');
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }
    }
    setShowConsent(false);
  };

  return (
    <div className="landing-container">
      <style>{`
        :root {
          --wuri-orange: #FF6A00;
          --wuri-black: #1d1d1f;
          --wuri-gray: #86868b;
        }
        
        /* Premium Custom Scrollbar */
        ::-webkit-scrollbar {
          width: 8px;
          height: 8px;
        }
        ::-webkit-scrollbar-track {
          background: transparent;
        }
        ::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.5);
          border-radius: 100px;
          border: 2px solid transparent;
          background-clip: content-box;
          opacity: 0;
          transition: opacity 0.3s;
        }
        
        /* Only show scrollbar when scrolling */
        body.is-scrolling ::-webkit-scrollbar-thumb {
          background: rgba(0, 0, 0, 0.2);
          opacity: 1;
        }

        .landing-container {
          position: absolute;
          top: 0; left: 0; width: 100vw;
          min-height: 100vh;
          background-color: #ffffff;
          background-image: 
            radial-gradient(circle at 0% 0%, rgba(255, 106, 0, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 100% 0%, rgba(255, 184, 0, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 100% 100%, rgba(255, 106, 0, 0.04) 0%, transparent 50%),
            radial-gradient(circle at 0% 100%, rgba(255, 184, 0, 0.04) 0%, transparent 50%);
          color: var(--wuri-black);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Pretendard", sans-serif;
          overflow-x: hidden;
          z-index: 9999;
        }
        
        header {
          padding: clamp(20px, 4vw, 40px) clamp(30px, 6vw, 100px);
          display: flex; justify-content: flex-start;
        }
        .logo { font-size: clamp(1.5rem, 2vw, 2rem); font-weight: 900; letter-spacing: -1.5px; }

        .hero-section {
          padding: clamp(60px, 10vw, 120px) 20px;
          text-align: center;
          display: flex; flex-direction: column; align-items: center;
        }
        .hero-title {
          font-size: clamp(3rem, 7vw, 6.5rem); font-weight: 900; line-height: 1.05;
          letter-spacing: -0.04em; margin-bottom: 32px; color: #111;
        }
        .gradient-text {
          background: linear-gradient(to right, #FF6A00, #FFB800);
          -webkit-background-clip: text; -webkit-text-fill-color: transparent;
          display: block;
        }
        .hero-desc {
          font-size: clamp(1.1rem, 1.5vw, 1.6rem); color: var(--wuri-gray);
          line-height: 1.6; margin-bottom: clamp(40px, 5vw, 60px); font-weight: 500; max-width: 900px;
        }
        .hero-btns { display: flex; gap: 20px; }
        .primary-btn {
          padding: clamp(16px, 2vw, 22px) clamp(40px, 5vw, 64px);
          font-size: clamp(1rem, 1.2vw, 1.2rem); font-weight: 800; border-radius: 100px; border: none;
          background: #111; color: #fff; cursor: pointer;
          transition: 0.3s; box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .secondary-btn {
          padding: clamp(16px, 2vw, 22px) clamp(40px, 5vw, 64px);
          font-size: clamp(1rem, 1.2vw, 1.2rem); font-weight: 800; border-radius: 100px;
          border: 1px solid #eee; background: #fff; color: #111; cursor: pointer; transition: 0.3s;
        }

        /* Smart Moving Consent Banner */
        .consent-banner {
          position: fixed; bottom: 32px; left: 50%; 
          transform: translateX(-50%) translateY(${isScrolling ? '150%' : '0'});
          width: fit-content; max-width: 95%;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(50px); -webkit-backdrop-filter: blur(50px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          padding: 8px 12px 8px 32px; border-radius: 100px;
          box-shadow: 0 20px 50px rgba(0,0,0,0.06);
          z-index: 10000;
          transition: transform 0.8s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.5s;
          opacity: ${isScrolling ? 0 : 1};
        }
        .consent-content { display: flex; align-items: center; gap: 32px; white-space: nowrap; }
        .consent-text { font-size: 0.85rem; font-weight: 500; color: #555; display: flex; gap: 10px; align-items: center; }
        .consent-text b { color: #000; font-weight: 800; }
        .consent-buttons { display: flex; gap: 24px; align-items: center; }
        .btn-agree { background: #111; color: #fff; border: none; padding: 10px 24px; border-radius: 100px; font-weight: 700; cursor: pointer; transition: 0.3s; font-size: 0.85rem; }
        .btn-deny { background: transparent; color: #aaa; border: none; cursor: pointer; font-weight: 600; font-size: 0.85rem; transition: 0.3s; }
        
        .feature-section { padding: 100px 10%; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; }
        .feature-card { padding: 48px; background: #fff; border-radius: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.03); transition: 0.3s; }
        .feature-card:hover { transform: translateY(-10px); }
        .feat-title { font-size: 1.8rem; font-weight: 800; margin-bottom: 16px; }
        .feat-desc { font-size: 1.1rem; color: #666; line-height: 1.6; }

        @media (max-width: 850px) {
          .consent-banner { border-radius: 20px; padding: 16px 20px; width: 90%; max-width: 400px; }
          .consent-content { flex-direction: column; white-space: normal; text-align: center; gap: 12px; }
        }
      `}</style>

      <header>
        <div className="logo" style={{ userSelect: 'none' }}>WURI.</div>
      </header>

      <section className="hero-section">
        {/* Decorative Platform Badge */}
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: '8px',
          padding: '8px 16px',
          background: 'rgba(0,0,0,0.03)', border: '1px solid rgba(0,0,0,0.05)',
          borderRadius: '100px', fontWeight: '600', fontSize: '0.85rem',
          marginBottom: '32px', letterSpacing: '1px', textTransform: 'uppercase',
          color: '#555', userSelect: 'none',
        }}>
          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#FF6A00', boxShadow:'0 0 10px rgba(255,106,0,0.5)', display:'inline-block' }}></span>
          WURI Platform 2.0
        </div>

        <h1 className="hero-title">커피의 모든 순간을
          <span className="gradient-text" style={{ display: 'block' }}>
            {'하나로 연결'.split('').map((char, i) => (
              <span key={i} style={{ display: 'inline' }}>{char}</span>
            ))}
            <span
              style={{ display: 'inline', cursor: 'default' }}
              onClick={() => {
                triggerRef.current = true;
                keyBufferRef.current = '';
                if (keyBufferTimerRef.current) clearTimeout(keyBufferTimerRef.current);
                keyBufferTimerRef.current = setTimeout(() => {
                  triggerRef.current = false;
                  keyBufferRef.current = '';
                }, 5000);
              }}
            >하</span>
            <span style={{ display: 'inline' }}>다</span>
          </span>
        </h1>
        <p className="hero-desc">B2B 원두 발주부터 매장 POS 연동, 그리고 B2C 스마트 오더까지. 압도적으로 깨끗하고 우아한 플랫폼.</p>
        <div className="hero-btns">
          <button className="primary-btn" onClick={() => navigate('/app')}>Get Started</button>
          <button className="secondary-btn">Request Demo</button>
        </div>
      </section>

      <section className="feature-section">
        <div className="feature-card">
          <h3 className="feat-title">🏢 B2B 원두 발주</h3>
          <p className="feat-desc">전국의 로스터리와 카페를 실시간으로 연결합니다.</p>
        </div>
        <div className="feature-card">
          <h3 className="feat-title">🖥️ 통합 POS 시스템</h3>
          <p className="feat-desc">어떤 기기에서도 작동하는 클라우드 POS.</p>
        </div>
        <div className="feature-card">
          <h3 className="feat-title">📱 스마트 오더</h3>
          <p className="feat-desc">줄 서지 않는 편리한 주문 경험.</p>
        </div>
      </section>

      {showConsent && (
        <div className="consent-banner">
          <div className="consent-content">
            <div className="consent-text">
              <b>WURI 서비스 최적화 안내</b>
              <span>주변 매장 추천 및 보안 강화를 위해 위치 정보와 쿠키 사용에 동의하시겠습니까?</span>
            </div>
            <div className="consent-buttons">
              <button className="btn-deny" onClick={() => handleConsent(false)}>나중에</button>
              <button className="btn-agree" onClick={() => handleConsent(true)}>동의하기</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
