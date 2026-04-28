import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { TENANT_CONFIG } from '../../config/tenant.js';

// Scramble characters for the WURI → 우리 effect
const SCRAMBLE_CHARS_L = 'ㅇㅜㅎㅏㄴㄱㅡWUwu';
const SCRAMBLE_CHARS_R = 'ㄹㅣㄷㅁㅂㅅㅈRIri';

export default function LandingPage() {
  const navigate = useNavigate();
  const [showConsent, setShowConsent] = useState(false);
  const [isScrolling, setIsScrolling] = useState(false);
  const [scaleFactor, setScaleFactor] = useState(1);
  const [videoTextScale, setVideoTextScale] = useState(1);
  const [wuriLeft, setWuriLeft] = useState('WU');
  const [wuriRight, setWuriRight] = useState('RI');
  const [isScramblingL, setIsScramblingL] = useState(false);
  const [isScramblingR, setIsScramblingR] = useState(false);
  const [getStartedHover, setGetStartedHover] = useState(false);
  const [businessHover, setBusinessHover] = useState(false);
  const animRef = useRef(null);
  const videoSectionRef = useRef(null);
  const videoRef = useRef(null);
  const scrollTimeoutRef = useRef(null);
  const triggerRef = useRef(false);
  const keyBufferRef = useRef('');
  const keyBufferTimerRef = useRef(null);
  const SECRET_CODE = 'gocl';

  // WURI → 우리 scramble animation (split WU / RI)
  useEffect(() => {
    const scrambleTimer = setTimeout(() => {
      setIsScramblingL(true);
      setIsScramblingR(true);
      
      // === Left half: WU → 우 (87ms interval) ===
      let leftStep = 0;
      const leftInterval = setInterval(() => {
        leftStep++;
        if (leftStep <= 5) {
          // Scramble phase
          const r1 = SCRAMBLE_CHARS_L[Math.floor(Math.random() * SCRAMBLE_CHARS_L.length)];
          const r2 = SCRAMBLE_CHARS_L[Math.floor(Math.random() * SCRAMBLE_CHARS_L.length)];
          setWuriLeft(r1 + r2);
        } else if (leftStep === 6) {
          setWuriLeft('ㅇㅜ');
        } else {
          setWuriLeft('우');
          setIsScramblingL(false);
          clearInterval(leftInterval);
        }
      }, 97);

      // === Right half: RI → 리 (90ms interval, with pause) ===
      let rightStep = 0;
      let paused = false;
      const rightInterval = setInterval(() => {
        rightStep++;
        if (rightStep <= 5) {
          // Scramble phase
          const r1 = SCRAMBLE_CHARS_R[Math.floor(Math.random() * SCRAMBLE_CHARS_R.length)];
          const r2 = SCRAMBLE_CHARS_R[Math.floor(Math.random() * SCRAMBLE_CHARS_R.length)];
          setWuriRight(r1 + r2);
        } else if (rightStep === 6) {
          // Show ㄹ then pause
          setWuriRight('ㄹ');
          if (!paused) {
            paused = true;
            clearInterval(rightInterval);
            setIsScramblingR(false); // Stop shaking while waiting for 'ㅣ'
            
            // Deliberate pause before final assembly
            setTimeout(() => {
              setWuriRight('ㄹㅣ');
              setTimeout(() => {
                setWuriRight('리');
              }, 120);
            }, 340);
          }
        }
      }, 120);

      return () => {
        clearInterval(leftInterval);
        clearInterval(rightInterval);
      };
    }, 1200); // 1.2 seconds after mount

    return () => clearTimeout(scrambleTimer);
  }, []);

  useEffect(() => {
    document.body.style.overflow = 'auto';
    document.documentElement.style.overflow = 'auto';

    const handleScroll = () => {
      // 1. Video Scroll Logic (Narrow strip passing by)
      if (videoSectionRef.current && videoRef.current) {
        const vRect = videoSectionRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        
        // Section enters when vRect.top === windowHeight
        // Section leaves when vRect.bottom === 0
        const totalScrollDistance = windowHeight + vRect.height;
        const scrolledPast = windowHeight - vRect.top;
        
        let vProgress = scrolledPast / totalScrollDistance;
        
        if (vProgress < 0) vProgress = 0;
        if (vProgress > 1) vProgress = 1;
        
        // Ensure video is loaded and has a duration
        if (!isNaN(videoRef.current.duration) && videoRef.current.duration > 0) {
          // Smoothly scrub the video to match the scroll progress
          videoRef.current.currentTime = videoRef.current.duration * vProgress;
        }

        // Text scale logic: max scale when vRect.top <= 0
        let tScale = 1;
        const MAX_TEXT_SCALE = 4; // Max scale of 4
        if (vRect.top > 0) {
          // As the section comes up from the bottom, grow the text
          let tProgress = (windowHeight - vRect.top) / windowHeight;
          if (tProgress < 0) tProgress = 0;
          if (tProgress > 1) tProgress = 1;
          tScale = 1 + Math.pow(tProgress, 3) * (MAX_TEXT_SCALE - 1);
        } else {
          // Once it hits the top (or scrolls past it), lock at max scale
          tScale = MAX_TEXT_SCALE;
        }
        setVideoTextScale(tScale);
      }

      // 2. Calculate scroll scale for the typography animation
      if (animRef.current) {
        const rect = animRef.current.getBoundingClientRect();
        const windowHeight = window.innerHeight;
        // The text is vertically centered in the section.
        const textY = rect.top + (rect.height / 2);
        
        // targetY is where we want the text to be normal size (slightly above center)
        const targetY = windowHeight * 0.35;
        const range = windowHeight - targetY;
        
        // ratio goes from 1 (text is at bottom of screen) to 0 (text is exactly at targetY)
        let ratio = (textY - targetY) / range;
        
        let newScale = 1;
        
        if (ratio > 1) {
          newScale = 41; // Max stretch when below screen
        } else if (ratio >= 0) {
          // Cubic curve for a snappy "chewy" elastic feeling
          newScale = 1 + Math.pow(ratio, 3) * 40; 
        } else if (ratio > -0.5) {
          // Bounce effect: squish up to 0.5 and return to 1
          // Parabola: vertex at ratio = -0.25, scale = 0.5
          newScale = 8 * Math.pow(ratio + 0.25, 2) + 0.5;
        } else {
          newScale = 1; // Past the bounce, stay normal
        }
        
        setScaleFactor(newScale);
      }

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
          --neu-bg: #e8e8e8;
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
          color: var(--wuri-black);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Pretendard", sans-serif;
          overflow-x: clip;
          z-index: 9999;
        }
        
        header {
          padding: clamp(20px, 4vw, 40px) clamp(30px, 6vw, 100px);
          display: flex; justify-content: flex-start;
          background: #fff;
        }
        .logo { font-size: clamp(1.5rem, 2vw, 2rem); font-weight: 900; letter-spacing: -1.5px; }

        .hero-section {
          padding: clamp(60px, 10vw, 120px) 20px;
          text-align: center;
          display: flex; flex-direction: column; align-items: center;
          background: #fff;
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

        /* Neumorphism Platform Badge (no hover on landing page) */
        .neu-badge {
          display: inline-flex;
          align-items: center;
          gap: 8px;
          padding: 10px 22px;
          background: #f0f0f0;
          border-radius: 100px;
          font-weight: 700;
          font-size: 0.85rem;
          margin-bottom: 32px;
          letter-spacing: 1px;
          text-transform: uppercase;
          color: #555;
          user-select: none;
          border: none;
          box-shadow: 
            6px 6px 12px rgba(0, 0, 0, 0.08),
            -6px -6px 12px rgba(255, 255, 255, 0.9);
        }

        /* Neumorphism Buttons */
        .neu-btn-primary {
          padding: clamp(13px, 1.6vw, 18px) 0;
          width: 176px;
          font-size: clamp(1rem, 1.2vw, 1.2rem);
          font-weight: 800;
          border-radius: 100px;
          border: none;
          background: #f0f0f0;
          color: #111;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          box-shadow:
            8px 8px 16px rgba(0, 0, 0, 0.1),
            -8px -8px 16px rgba(255, 255, 255, 0.95);
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .neu-btn-primary:hover {
          box-shadow:
            inset 4px 4px 8px rgba(0, 0, 0, 0.08),
            inset -4px -4px 8px rgba(255, 255, 255, 0.8);
          color: #FF6A00;
        }
        .neu-btn-primary:active {
          box-shadow:
            inset 6px 6px 12px rgba(0, 0, 0, 0.12),
            inset -6px -6px 12px rgba(255, 255, 255, 0.7);
        }

        .neu-btn-secondary {
          padding: clamp(13px, 1.6vw, 18px) 0;
          width: 176px;
          font-size: clamp(1rem, 1.2vw, 1.2rem);
          font-weight: 800;
          border-radius: 100px;
          border: none;
          background: #f0f0f0;
          color: #111;
          cursor: pointer;
          transition: all 0.35s cubic-bezier(0.25, 0.46, 0.45, 0.94);
          box-shadow:
            8px 8px 16px rgba(0, 0, 0, 0.1),
            -8px -8px 16px rgba(255, 255, 255, 0.95);
          position: relative;
          overflow: hidden;
          text-align: center;
        }
        .neu-btn-secondary:hover {
          background: linear-gradient(135deg, #FF6A00, #FF8C00);
          color: #fff;
          box-shadow:
            inset 4px 4px 8px rgba(0, 0, 0, 0.15),
            inset -4px -4px 8px rgba(255, 160, 50, 0.3);
        }
        .neu-btn-secondary:active {
          box-shadow:
            inset 6px 6px 12px rgba(0, 0, 0, 0.2),
            inset -6px -6px 12px rgba(255, 160, 50, 0.2);
        }

        /* WURI scramble animation (removed shaking glitch) */
        .wuri-scramble {
          display: inline-block;
          min-width: 1em;
          transition: opacity 0.1s;
        }

        /* Scroll Video Section Style (Narrow Strip) */
        .video-scroll-section {
          height: 32vh; /* Narrow space between sections */
          position: relative;
          background: #000;
          overflow: hidden;
          margin-top: clamp(150px, 20vw, 300px);
          margin-bottom: clamp(20px, 4vw, 50px);
        }
        .scroll-video {
          position: absolute;
          top: 0; left: 0;
          width: 100%;
          height: 100%;
          object-fit: cover;
          opacity: 0.6; /* Slightly dimmed for text */
        }
        .video-overlay-text {
          position: absolute;
          top: 50%; left: 50%;
          transform: translate(-50%, -50%);
          z-index: 10;
          color: #fff;
          font-size: clamp(1.5rem, 3vw, 2.5rem);
          font-weight: 900;
          text-align: center;
          line-height: 1.3;
          letter-spacing: -0.02em;
          text-shadow: 0 4px 15px rgba(0,0,0,0.6);
          width: 100%;
          will-change: transform;
          transition: transform 0.1s ease-out;
          white-space: nowrap; /* Keep text structure while zooming */
        }

        /* Scroll Animation Section Style */
        .animation-section {
          height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: #fff;
          border-top: 1px solid #eee;
          overflow: hidden; /* Prevent huge stretched text from creating scrollbars */
        }
        .stretch-text {
          font-size: clamp(4rem, 15vw, 12rem);
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", sans-serif;
          font-weight: 900;
          color: #111;
          white-space: nowrap;
          text-transform: uppercase;
          line-height: 1.2;
          padding-top: 0.1em;
          letter-spacing: -0.05em;
          transition: transform 0.1s ease-out;
          will-change: transform;
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
        <div className="logo" style={{ userSelect: 'none' }}>{TENANT_CONFIG.brand.mainName}</div>
      </header>

      <section className="hero-section">
        {/* Neumorphism Platform Badge */}
        <div className="neu-badge">
          <span style={{ width:'8px', height:'8px', borderRadius:'50%', background:'#FF6A00', boxShadow:'0 0 10px rgba(255,106,0,0.5)', display:'inline-block' }}></span>
          {TENANT_CONFIG.brand.mainName} Platform 2.0
        </div>

        <h1 className="hero-title">
          <span className={`wuri-scramble ${isScramblingL ? 'scrambling' : ''}`}>{wuriLeft}</span><span className={`wuri-scramble ${isScramblingR ? 'scrambling' : ''}`}>{wuriRight}</span>의 모든 순간을
          <span className="gradient-text" style={{ display: 'block' }}>
            {'커피로 연결'.split('').map((char, i) => (
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
        <p className="hero-desc">{TENANT_CONFIG.brand.mainName}와 함께하는 모든 카페를 위한 스마트한 커피 플랫폼</p>
        <div className="hero-btns">
          <button 
            className="neu-btn-primary" 
            onClick={() => navigate('/app')}
            onMouseEnter={() => setGetStartedHover(true)}
            onMouseLeave={() => setGetStartedHover(false)}
          >
            {getStartedHover ? '우리와 함께' : 'Get Started'}
          </button>
          <button 
            className="neu-btn-secondary"
            onMouseEnter={() => setBusinessHover(true)}
            onMouseLeave={() => setBusinessHover(false)}
          >
            {businessHover ? '사업자전용' : 'Business'}
          </button>
        </div>
      </section>

      {/* 2. Scroll-Linked Video Section (Narrow Strip) */}
      <section className="video-scroll-section" ref={videoSectionRef}>
        {/* Local video file for scroll scrubbing. YouTube URLs do not support frame-precise scrubbing. */}
        <video 
          ref={videoRef}
          src="/hatch6.mp4" 
          muted 
          playsInline
          preload="auto"
          className="scroll-video"
        />
        <div 
          className="video-overlay-text"
          style={{ transform: `translate(-50%, -50%) scale(${videoTextScale})` }}
        >
          한 방울에 담긴 예술<br/>최상의 커피를 경험하다
        </div>
      </section>

      {/* 3. Typography Animation Section */}
      <section className="animation-section" ref={animRef}>
        <div style={{ position: 'relative', display: 'inline-block' }}>
          {/* Top Half (Pristine) */}
          <div 
            className="stretch-text" 
            style={{ 
              position: 'absolute',
              top: 0, left: 0, width: '100%',
              clipPath: 'polygon(0 0, 100% 0, 100% 28%, 0 28%)',
              WebkitClipPath: 'polygon(0 0, 100% 0, 100% 28%, 0 28%)',
              zIndex: 2
            }}
          >
            이밤의끝을잡고
          </div>

          {/* Bottom Half (Stretches) */}
          <div 
            className="stretch-text" 
            style={{ 
              transform: `scaleY(${scaleFactor})`,
              transformOrigin: '50% 28%',
              clipPath: 'polygon(0 28%, 100% 28%, 100% 100%, 0 100%)',
              WebkitClipPath: 'polygon(0 28%, 100% 28%, 100% 100%, 0 100%)',
              zIndex: 1
            }}
          >
            이밤의끝을잡고
          </div>
        </div>
      </section>

      {showConsent && (
        <div className="consent-banner">
          <div className="consent-content">
            <div className="consent-text">
              <b>{TENANT_CONFIG.brand.mainName} 서비스 최적화 안내</b>
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
