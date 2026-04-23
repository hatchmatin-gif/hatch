import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // 랜딩 페이지에서는 스크롤이 가능하도록 전역 스타일 수정
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    const timer = setTimeout(() => {
      const isAgreed = localStorage.getItem('wuri-consent');
      if (!isAgreed) setShowConsent(true);
    }, 2000);
    
    return () => {
      clearTimeout(timer);
      // 페이지를 떠날 때는 다시 모바일용으로 스크롤 잠금
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
        .landing-container {
          position: absolute;
          top: 0;
          left: 0;
          width: 100vw;
          min-height: 100vh;
          background: #ffffff;
          color: #1d1d1f;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Pretendard", sans-serif;
          overflow-x: hidden;
          display: flex;
          flex-direction: column;
          z-index: 9999;
        }
        header {
          padding: 30px 60px;
          display: flex;
          justify-content: flex-start;
          align-items: center;
        }
        .logo {
          font-size: 1.8rem;
          font-weight: 900;
          letter-spacing: -1.5px;
          color: #000;
        }
        .hero-section {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 60px 40px 120px;
          text-align: center;
        }
        .hero-badge {
          display: inline-block;
          padding: 8px 18px;
          background: #fff;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #FF6A00;
          box-shadow: 0 4px 15px rgba(255,106,0,0.1);
          margin-bottom: 40px;
          border: 1px solid rgba(255,106,0,0.1);
        }
        .hero-title {
          font-size: 6rem;
          font-weight: 900;
          line-height: 1.05;
          letter-spacing: -4px;
          margin-bottom: 40px;
          color: #222;
        }
        .gradient-text {
          background: linear-gradient(to right, #FF6A00, #FFB800);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          display: block;
          margin-top: 10px;
        }
        .hero-desc {
          font-size: 1.5rem;
          color: #888;
          line-height: 1.6;
          margin-bottom: 60px;
          font-weight: 500;
          max-width: 800px;
        }
        .hero-btns {
          display: flex;
          justify-content: center;
          gap: 24px;
        }
        .primary-btn {
          padding: 22px 60px;
          font-size: 1.2rem;
          font-weight: 800;
          border-radius: 100px;
          border: none;
          background: #111;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
          box-shadow: 0 10px 20px rgba(0,0,0,0.1);
        }
        .secondary-btn {
          padding: 22px 60px;
          font-size: 1.2rem;
          font-weight: 800;
          border-radius: 100px;
          border: 1px solid #eee;
          background: #fff;
          color: #111;
          cursor: pointer;
          transition: all 0.3s;
        }
        .primary-btn:hover { transform: translateY(-3px); box-shadow: 0 15px 30px rgba(0,0,0,0.2); background: #000; }
        .secondary-btn:hover { background: #f9f9f9; transform: translateY(-3px); }

        /* Consent Banner (Natural & Glassmorphic) */
        .consent-banner {
          position: fixed;
          bottom: 40px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 800px;
          background: rgba(255, 255, 255, 0.85);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 30px 40px;
          border-radius: 40px;
          box-shadow: 0 40px 80px rgba(0,0,0,0.15);
          z-index: 9999;
          animation: slideUp 1s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp { from { transform: translate(-50%, 150%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .consent-content { display: flex; align-items: center; gap: 30px; }
        .consent-icon { font-size: 2.5rem; background: #fff; width: 70px; height: 70px; display: flex; align-items: center; justify-content: center; border-radius: 24px; box-shadow: 0 15px 30px rgba(0,0,0,0.05); }
        .consent-text { flex: 1; }
        .consent-text h4 { margin: 0 0 8px 0; font-size: 1.3rem; font-weight: 900; color: #111; }
        .consent-text p { margin: 0; font-size: 1rem; color: #666; line-height: 1.6; }
        .consent-buttons { display: flex; gap: 20px; align-items: center; }
        .btn-agree { background: #111; color: #fff; border: none; padding: 18px 32px; border-radius: 18px; font-weight: 800; cursor: pointer; white-space: nowrap; transition: 0.3s; font-size: 1rem; }
        .btn-deny { background: transparent; color: #aaa; border: none; cursor: pointer; font-weight: 700; font-size: 1rem; transition: 0.3s; }
        .btn-deny:hover { color: #666; }
        
        @media (max-width: 1024px) {
          .hero-title { font-size: 4rem; }
          header { padding: 30px 40px; }
        }
        @media (max-width: 768px) {
          .hero-title { font-size: 3rem; letter-spacing: -2px; }
          .hero-desc { font-size: 1.1rem; }
          .hero-btns { flex-direction: column; width: 100%; max-width: 300px; }
          .consent-content { flex-direction: column; text-align: center; gap: 20px; }
          .consent-buttons { width: 100%; flex-direction: column-reverse; gap: 10px; }
          .btn-agree { width: 100%; }
        }
      `}</style>

      <header>
        <div className="logo">WURI.</div>
      </header>

      {/* Consent Banner */}
      {showConsent && (
        <div className="consent-banner">
          <div className="consent-content">
            <div className="consent-icon">🛡️</div>
            <div className="consent-text">
              <h4>WURI 서비스 최적화 안내</h4>
              <p>주변 매장 추천 및 보안 강화를 위해 위치 정보와 쿠키 사용에 동의하시겠습니까?</p>
            </div>
            <div className="consent-buttons">
              <button className="btn-deny" onClick={() => handleConsent(false)}>나중에</button>
              <button className="btn-agree" onClick={() => handleConsent(true)}>동의하고 시작하기</button>
            </div>
          </div>
        </div>
      )}

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
    </div>
  );
}
