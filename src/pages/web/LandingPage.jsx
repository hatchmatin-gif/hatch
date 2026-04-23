import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // 페이지 로드 후 2초 뒤에 자연스럽게 동의 배너 표시
    const timer = setTimeout(() => {
      const isAgreed = localStorage.getItem('wuri-consent');
      console.log("Consent Check - isAgreed in localStorage:", isAgreed);
      if (!isAgreed) {
        setShowConsent(true);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
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
          min-height: 100vh;
          background: #fbfbfb;
          color: #1d1d1f;
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Pretendard", sans-serif;
          overflow-x: hidden;
        }
        .hero-section {
          padding: 160px 20px 100px;
          text-align: center;
          max-width: 1000px;
          margin: 0 auto;
        }
        .hero-badge {
          display: inline-block;
          padding: 8px 16px;
          background: #fff;
          border-radius: 100px;
          font-size: 0.85rem;
          font-weight: 700;
          color: #FF6A00;
          box-shadow: 0 4px 15px rgba(0,0,0,0.05);
          margin-bottom: 32px;
          letter-spacing: 1px;
        }
        .hero-title {
          font-size: 4.5rem;
          font-weight: 800;
          line-height: 1.1;
          letter-spacing: -3px;
          margin-bottom: 32px;
        }
        .gradient-text {
          background: linear-gradient(to right, #FF6A00, #FFB800);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .hero-desc {
          font-size: 1.4rem;
          color: #86868b;
          line-height: 1.5;
          margin-bottom: 48px;
          font-weight: 500;
        }
        .hero-btns {
          display: flex;
          justify-content: center;
          gap: 20px;
        }
        .primary-btn {
          padding: 20px 48px;
          font-size: 1.1rem;
          font-weight: 700;
          border-radius: 100px;
          border: none;
          background: #1d1d1f;
          color: #fff;
          cursor: pointer;
          transition: all 0.3s;
        }
        .secondary-btn {
          padding: 20px 48px;
          font-size: 1.1rem;
          font-weight: 700;
          border-radius: 100px;
          border: 1px solid #d2d2d7;
          background: #fff;
          color: #1d1d1f;
          cursor: pointer;
          transition: all 0.3s;
        }
        .primary-btn:hover { transform: scale(1.05); background: #000; }
        .secondary-btn:hover { background: #f5f5f7; }

        /* Consent Banner Styles */
        .consent-banner {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 650px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(30px);
          -webkit-backdrop-filter: blur(30px);
          border: 1px solid rgba(255, 255, 255, 0.5);
          padding: 24px;
          border-radius: 30px;
          box-shadow: 0 30px 60px rgba(0,0,0,0.12);
          z-index: 9999;
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp { from { transform: translate(-50%, 120%); opacity: 0; } to { transform: translate(-50%, 0); opacity: 1; } }
        .consent-content { display: flex; align-items: center; gap: 24px; }
        .consent-icon { font-size: 2.2rem; background: #fff; width: 64px; height: 64px; display: flex; align-items: center; justify-content: center; border-radius: 20px; box-shadow: 0 10px 20px rgba(0,0,0,0.05); }
        .consent-text h4 { margin: 0 0 6px 0; font-size: 1.2rem; font-weight: 800; }
        .consent-text p { margin: 0; font-size: 0.95rem; color: #555; line-height: 1.5; }
        .consent-buttons { display: flex; gap: 15px; margin-left: auto; align-items: center; }
        .btn-agree { background: #111; color: #fff; border: none; padding: 14px 24px; border-radius: 14px; font-weight: 700; cursor: pointer; white-space: nowrap; transition: 0.3s; }
        .btn-deny { background: transparent; color: #999; border: none; cursor: pointer; font-weight: 600; font-size: 0.9rem; }
        
        @media (max-width: 768px) {
          .hero-title { font-size: 2.8rem; letter-spacing: -1.5px; }
          .hero-desc { font-size: 1.1rem; }
          .hero-btns { flex-direction: column; }
          .consent-content { flex-direction: column; text-align: center; gap: 15px; }
          .consent-buttons { margin: 0; width: 100%; justify-content: center; }
        }
      `}</style>

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
          커피의 모든 순간을<br />
          <span className="gradient-text">하나로 연결하다</span>
        </h1>
        <p className="hero-desc">
          더 이상 분산된 시스템에 얽매이지 마세요. B2B 원두 발주부터 매장 POS 연동,<br />
          그리고 B2C 스마트 오더까지. 압도적으로 깨끗하고 우아한 하나의 플랫폼.
        </p>
        <div className="hero-btns">
          <button className="primary-btn" onClick={() => navigate('/app')}>Get Started</button>
          <button className="secondary-btn">Request Demo</button>
        </div>
      </section>
    </div>
  );
}
