import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import './LandingPage.css';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showConsent, setShowConsent] = useState(false);

  useEffect(() => {
    // 페이지 로드 후 2초 뒤에 자연스럽게 동의 배너 표시
    const timer = setTimeout(() => {
      const isAgreed = localStorage.getItem('wuri-consent');
      console.log("Consent Check - isAgreed in localStorage:", isAgreed);
      
      if (!isAgreed) {
        console.log("Showing Consent Banner...");
        setShowConsent(true);
      }
    }, 2000);
    
    return () => clearTimeout(timer);
  }, []);

  const handleConsent = (agreed) => {
    if (agreed) {
      localStorage.setItem('wuri-consent', 'true');
      // 위치 권한 미리 요청 (자연스럽게)
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(() => {}, () => {});
      }
    }
    setShowConsent(false);
  };

  return (
    <div className="landing-container">
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
        <div className="hero-badge hide-animate">● WURI PLATFORM 2.0</div>
        <h1 className="hero-title hide-animate">
          커피의 모든 순간을<br />
          <span className="gradient-text">하나로 연결하다</span>
        </h1>
        <p className="hero-desc hide-animate">
          더 이상 분산된 시스템에 얽매이지 마세요. B2B 원두 발주부터 매장 POS 연동,<br />
          그리고 B2C 스마트 오더까지. 압도적으로 깨끗하고 우아한 하나의 플랫폼.
        </p>
        <div className="hero-btns hide-animate">
          <button className="primary-btn" onClick={() => navigate('/app')}>Get Started</button>
          <button className="secondary-btn">Request Demo</button>
        </div>
      </section>

      {/* 추가 섹션들 (기존 내용 유지) */}
      <style>{`
        .consent-banner {
          position: fixed;
          bottom: 30px;
          left: 50%;
          transform: translateX(-50%);
          width: 90%;
          max-width: 600px;
          background: rgba(255, 255, 255, 0.8);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.3);
          padding: 24px;
          border-radius: 24px;
          box-shadow: 0 20px 40px rgba(0,0,0,0.1);
          z-index: 9999;
          animation: slideUp 0.8s cubic-bezier(0.16, 1, 0.3, 1);
        }
        @keyframes slideUp {
          from { transform: translate(-50%, 100%); opacity: 0; }
          to { transform: translate(-50%, 0); opacity: 1; }
        }
        .consent-content {
          display: flex;
          align-items: center;
          gap: 20px;
        }
        .consent-icon {
          font-size: 2rem;
          background: #fff;
          width: 60px;
          height: 60px;
          display: flex;
          align-items: center;
          justify-content: center;
          border-radius: 18px;
          box-shadow: 0 10px 20px rgba(0,0,0,0.05);
        }
        .consent-text h4 { margin: 0 0 4px 0; font-size: 1.1rem; font-weight: 800; }
        .consent-text p { margin: 0; font-size: 0.9rem; color: #666; line-height: 1.5; }
        .consent-buttons { display: flex; gap: 10px; margin-left: auto; }
        .btn-agree {
          background: #111;
          color: #fff;
          border: none;
          padding: 12px 20px;
          border-radius: 12px;
          font-weight: 700;
          cursor: pointer;
          white-space: nowrap;
          transition: 0.3s;
        }
        .btn-deny {
          background: transparent;
          color: #999;
          border: none;
          padding: 12px 10px;
          font-weight: 600;
          cursor: pointer;
          white-space: nowrap;
        }
        .btn-agree:hover { transform: scale(1.05); background: #000; }
        
        @media (max-width: 768px) {
          .consent-content { flex-direction: column; text-align: center; gap: 15px; }
          .consent-buttons { margin: 0; width: 100%; justify-content: center; }
          .btn-agree { width: 100%; }
        }
      `}</style>
    </div>
  );
}
