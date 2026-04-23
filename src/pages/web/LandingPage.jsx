import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    const timer = setTimeout(() => {
      const isAgreed = localStorage.getItem('wuri-consent');
      if (!isAgreed) setShowConsent(true);
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
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
        .landing-container {
          position: absolute;
          top: 0; left: 0; width: 100vw;
          min-height: 100vh;
          background: #ffffff;
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
        .hero-badge {
          display: inline-block; padding: 8px 16px; background: #fff; border-radius: 100px;
          font-size: clamp(0.7rem, 1vw, 0.85rem); font-weight: 700; color: var(--wuri-orange);
          box-shadow: 0 4px 15px rgba(255,106,0,0.1); margin-bottom: clamp(24px, 4vw, 48px);
          border: 1px solid rgba(255,106,0,0.1);
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
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1); box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .secondary-btn {
          padding: clamp(16px, 2vw, 22px) clamp(40px, 5vw, 64px);
          font-size: clamp(1rem, 1.2vw, 1.2rem); font-weight: 800; border-radius: 100px;
          border: 1px solid #eee; background: #fff; color: #111; cursor: pointer; transition: all 0.3s;
        }
        .primary-btn:hover { transform: translateY(-3px); background: #000; box-shadow: 0 15px 30px rgba(0,0,0,0.2); }

        .feature-section { padding: 100px 10%; background: #f9f9f9; display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 40px; }
        .feature-card { padding: 48px; background: #fff; border-radius: 32px; box-shadow: 0 10px 40px rgba(0,0,0,0.03); transition: 0.3s; }
        .feature-card:hover { transform: translateY(-10px); }
        .feat-icon { font-size: 2.5rem; margin-bottom: 24px; display: block; }
        .feat-title { font-size: 1.8rem; font-weight: 800; margin-bottom: 16px; }
        .feat-desc { font-size: 1.1rem; color: #666; line-height: 1.6; }

        /* Sleek Single-Line Consent Banner */
        .consent-banner {
          position: fixed; bottom: 32px; left: 50%; transform: translateX(-50%);
          width: 90%; max-width: 900px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(50px); -webkit-backdrop-filter: blur(50px);
          border: 1px solid rgba(255, 255, 255, 0.4);
          padding: 16px 32px; border-radius: 100px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.08);
          z-index: 10000;
          animation: slideUp 1.2s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp { from { transform: translate(-50%, 150%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .consent-content { display: flex; align-items: center; justify-content: space-between; gap: 24px; }
        .consent-text { font-size: 0.95rem; font-weight: 600; color: #333; display: flex; gap: 12px; align-items: center; }
        .consent-text b { color: #000; }
        .consent-buttons { display: flex; gap: 24px; align-items: center; }
        .btn-agree { background: #111; color: #fff; border: none; padding: 12px 32px; border-radius: 100px; font-weight: 800; cursor: pointer; transition: 0.3s; font-size: 0.9rem; }
        .btn-deny { background: transparent; color: #999; border: none; cursor: pointer; font-weight: 700; font-size: 0.9rem; transition: 0.3s; }
        .btn-deny:hover { color: #111; }
        .btn-agree:hover { transform: scale(1.05); background: #000; }
        
        @media (max-width: 768px) {
          .consent-banner { border-radius: 24px; padding: 20px; }
          .consent-content { flex-direction: column; text-align: center; gap: 15px; }
          .consent-text { flex-direction: column; gap: 4px; }
          .consent-buttons { width: 100%; justify-content: center; gap: 20px; }
        }
      `}</style>

      <header>
        <div className="logo">WURI.</div>
      </header>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-badge">● WURI PLATFORM 2.0</div>
        <h1 className="hero-title">
          커피의 모든 순간을
          <span className="gradient-text">하나로 연결하다</span>
        </h1>
        <p className="hero-desc">
          더 이상 분산된 시스템에 얽매이지 마세요. B2B 원두 발주부터 매장 POS 연동, 그리고 B2C 스마트 오더까지. 압도적으로 깨끗하고 우아한 하나의 플랫폼.
        </p>
        <div className="hero-btns">
          <button className="primary-btn" onClick={() => navigate('/app')}>Get Started</button>
          <button className="secondary-btn">Request Demo</button>
        </div>
      </section>

      {/* Feature Section */}
      <section className="feature-section">
        <div className="feature-card">
          <span className="feat-icon">🏢</span>
          <h3 className="feat-title">B2B 원두 발주</h3>
          <p className="feat-desc">전국의 로스터리와 카페를 실시간으로 연결합니다. 품질 관리부터 배송 추적까지 한 번에 해결하세요.</p>
        </div>
        <div className="feature-card">
          <span className="feat-icon">🖥️</span>
          <h3 className="feat-title">통합 POS 시스템</h3>
          <p className="feat-desc">어떤 기기에서도 작동하는 클라우드 POS. 매장 운영 데이터가 실시간으로 분석되어 매출 성장을 돕습니다.</p>
        </div>
        <div className="feature-card">
          <span className="feat-icon">📱</span>
          <h3 className="feat-title">스마트 오더</h3>
          <p className="feat-desc">줄 서지 않는 카페 경험. 고객은 편리하게 주문하고, 점주는 효율적으로 주문을 관리합니다.</p>
        </div>
      </section>

      {/* Extra Info Section */}
      <section style={{ padding: '120px 20px', textAlign: 'center', background: '#fff' }}>
        <h2 style={{ fontSize: '3.5rem', fontWeight: 800, marginBottom: '24px', letterSpacing: '-2px' }}>Everything you need.</h2>
        <p style={{ fontSize: '1.4rem', color: '#888', maxWidth: '700px', margin: '0 auto 60px' }}>
          WURI는 카페 비즈니스의 시작부터 끝까지, 모든 복잡함을 걷어내고 본질에만 집중하게 합니다.
        </p>
        <img src="https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&q=80&w=1200" alt="Cafe" style={{ width: '90%', maxWidth: '1100px', borderRadius: '40px', boxShadow: '0 40px 100px rgba(0,0,0,0.1)' }} />
      </section>

      {/* Refined Single-Line Consent Banner */}
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
