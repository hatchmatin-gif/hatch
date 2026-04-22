import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const secretBuffer = React.useRef('');
  const secretTimer = React.useRef(null);

  // 히든 어드민 접근: 특정 글자 클릭 후 5초 내에 'gocl' 타이핑
  const activateSecretListener = () => {
    secretBuffer.current = '';
    if (secretTimer.current) clearTimeout(secretTimer.current);

    const handler = (e) => {
      secretBuffer.current += e.key.toLowerCase();
      if (secretBuffer.current.includes('gocl')) {
        window.removeEventListener('keydown', handler);
        clearTimeout(secretTimer.current);
        navigate('/admin/login');
      }
    };
    window.addEventListener('keydown', handler);

    secretTimer.current = setTimeout(() => {
      window.removeEventListener('keydown', handler);
      secretBuffer.current = '';
    }, 5000);
  };

  // Handle global mouse move for subtle interactive spotlight effects
  useEffect(() => {
    const handleMouseMove = (e) => {
      setMousePos({
        x: e.clientX,
        y: e.clientY
      });
    };
    window.addEventListener('mousemove', handleMouseMove);
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, []);

  // Intersection Observer for scroll animations
  useEffect(() => {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('show-animate');
        }
      });
    }, { threshold: 0.1 });

    const hiddenElements = document.querySelectorAll('.hide-animate');
    hiddenElements.forEach((el) => observer.observe(el));

    // 모바일 앱용 CSS 제약을 모두 풀고, 랜딩 페이지용 풀스크린으로 전환
    const overrideStyle = document.createElement('style');
    overrideStyle.id = 'landing-override';
    overrideStyle.textContent = `
      html, body { overflow: auto !important; height: auto !important; overflow-y: auto !important; overscroll-behavior-y: auto !important; }
      body { display: block !important; align-items: initial !important; }
      #root { display: block !important; width: 100% !important; height: auto !important; max-width: none !important; }
      #app-container { display: none !important; }
    `;
    document.head.appendChild(overrideStyle);

    return () => {
      const el = document.getElementById('landing-override');
      if (el) el.remove();
    };
  }, []);

  return (
    <div style={{ width:'100vw', minHeight:'100vh', backgroundColor:'#FFFFFF', overflowX:'hidden' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
        
        * {
          box-sizing: border-box;
        }

        .landing-wrapper {
          font-family: 'Inter', 'Noto Sans KR', sans-serif;
          background-color: #FFFFFF;
          color: #111111;
          width: 100vw;
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
        }

        /* --- Animations --- */
        @keyframes float {
          0%, 100% { transform: translateY(0px); }
          50% { transform: translateY(-15px); }
        }

        .hide-animate {
          opacity: 0;
          transform: translateY(30px);
          transition: all 0.9s cubic-bezier(0.25, 0.46, 0.15, 1);
        }
        .show-animate {
          opacity: 1;
          transform: translateY(0);
        }

        /* Background is pure clean white - no blobs */

        /* --- Components --- */
        .glass-nav {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 70px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 5%;
          background: rgba(255, 255, 255, 0.95);
          backdrop-filter: blur(24px);
          -webkit-backdrop-filter: blur(24px);
          z-index: 100;
          border-bottom: none;
          box-shadow: none;
        }

        .gradient-text {
          background: linear-gradient(110deg, #111111 30%, #666666 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }
        .accent-text {
          background: linear-gradient(110deg, #FF6A00 0%, #FFA000 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        /* --- Buttons --- */
        .btn-primary {
          padding: 16px 36px;
          background: #111111;
          color: #fff;
          border: none;
          border-radius: 100px;
          font-weight: 600;
          font-size: 1.05rem;
          cursor: pointer;
          transition: all 0.3s ease;
          box-shadow: 0 8px 20px rgba(0,0,0,0.15);
        }
        .btn-primary:hover {
          transform: translateY(-2px);
          box-shadow: 0 12px 25px rgba(0,0,0,0.2);
          background: #000;
        }

        .btn-secondary {
          padding: 16px 36px;
          background: rgba(255,255,255,0.8);
          color: #333;
          border: 1px solid rgba(0,0,0,0.1);
          border-radius: 100px;
          font-weight: 600;
          font-size: 1.05rem;
          cursor: pointer;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
          box-shadow: 0 4px 12px rgba(0,0,0,0.03);
        }
        .btn-secondary:hover {
          background: #ffffff;
          border: 1px solid rgba(0,0,0,0.2);
          transform: translateY(-2px);
          box-shadow: 0 8px 20px rgba(0,0,0,0.06);
        }

        /* --- Bento Box Glass Cards (Light Theme) --- */
        .bento-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          max-width: 1200px;
          margin: 0 auto;
        }
        @media (max-width: 900px) {
          .bento-grid { grid-template-columns: 1fr; }
        }
        
        .glass-card {
          position: relative;
          background: rgba(255, 255, 255, 0.6);
          border: 1px solid rgba(255, 255, 255, 0.9);
          backdrop-filter: blur(40px);
          -webkit-backdrop-filter: blur(40px);
          border-radius: 32px;
          padding: 40px;
          overflow: hidden;
          transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
          box-shadow: 0 20px 40px rgba(0,0,0,0.03), inset 0 0 0 1px rgba(255,255,255,1);
        }
        .glass-card::before {
          content: '';
          position: absolute;
          top: 0; left: 0; width: 100%; height: 100%;
          background: radial-gradient(600px circle at var(--mouse-x) var(--mouse-y), rgba(255,255,255,0.8), transparent 40%);
          z-index: 0;
          opacity: 0;
          transition: opacity 0.5s ease;
          pointer-events: none;
        }
        .glass-card:hover {
          transform: translateY(-8px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.08), inset 0 0 0 1px rgba(255,255,255,1);
        }
        .glass-card:hover::before {
          opacity: 1;
        }
        .card-content {
          position: relative;
          z-index: 1;
        }
        .span-2 { grid-column: span 2; }
        @media (max-width: 900px) {
          .span-2 { grid-column: span 1; }
        }

        /* --- Floating Abstract UI (Light Theme) --- */
        .mockup-container {
          position: relative;
          width: 100%;
          height: 500px;
          perspective: 1000px;
        }
        .floating-layer {
          position: absolute;
          border-radius: 24px;
          background: rgba(255,255,255,0.85);
          border: 1px solid rgba(255,255,255,1);
          backdrop-filter: blur(20px);
          box-shadow: 0 30px 60px rgba(0,0,0,0.08);
          animation: float 6s ease-in-out infinite;
        }
        .layer-1 {
          width: 80%; height: 350px;
          top: 50px; right: 0;
          transform-origin: right center;
          transform: rotateY(-15deg) translateZ(0px);
        }
        .layer-2 {
          width: 50%; height: 200px;
          bottom: 20px; left: 0;
          background: rgba(255,106,0,0.05);
          border: 1px solid rgba(255,106,0,0.1);
          animation-delay: -3s;
        }
        .layer-3 {
          width: 250px; height: 100px;
          top: -20px; left: 10%;
          background: rgba(255,255,255,0.9);
          animation-delay: -1.5s;
        }
      `}</style>

      <div className="landing-wrapper" 
        onMouseMove={(e) => {
          const cards = document.querySelectorAll('.glass-card');
          cards.forEach(card => {
            const rect = card.getBoundingClientRect();
            const x = e.clientX - rect.left;
            const y = e.clientY - rect.top;
            card.style.setProperty('--mouse-x', `${x}px`);
            card.style.setProperty('--mouse-y', `${y}px`);
          });
        }}
      >
        {/* Navigation */}
        <header className="glass-nav">
          <div style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-1px', color:'#111' }}>WURI.</div>
        </header>

        {/* 1. Hero Section */}
        <section style={{ position:'relative', zIndex:1, minHeight: '100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding: '120px 5% 60px', textAlign: 'center' }}>
          <div className="hide-animate">
            <div style={{ display: 'inline-flex', alignItems:'center', gap:'8px', padding: '8px 16px', background: 'rgba(0,0,0,0.03)', border:'1px solid rgba(0,0,0,0.05)', borderRadius: '100px', fontWeight: '600', fontSize:'0.85rem', marginBottom:'32px', letterSpacing:'1px', textTransform:'uppercase', color:'#555' }}>
              <span style={{width:'8px', height:'8px', borderRadius:'50%', background:'#FF6A00', boxShadow:'0 0 10px rgba(255,106,0,0.5)'}}></span>
              WURI Platform 2.0
            </div>
            
            <h1 style={{ fontSize: 'clamp(3.5rem, 8vw, 6.5rem)', fontWeight: '900', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-0.04em' }}>
              <span className="gradient-text">
                {"커피의 모든 순간을".split("").map((char, idx) => (
                  <span key={idx} style={{ cursor: 'default' }}>{char}</span>
                ))}
              </span><br />
              <span className="accent-text">
                {"하나로 연결하다".split("").map((char, idx) => (
                  <span 
                    key={idx} 
                    style={{ cursor: 'default' }} 
                    onClick={char === '하' ? activateSecretListener : undefined}
                  >
                    {char}
                  </span>
                ))}
              </span>
            </h1>
            
            <p style={{ fontSize: '1.25rem', color: '#666', margin: '0 auto 48px', maxWidth: '650px', lineHeight: '1.7', fontWeight: '400' }}>
              더 이상 분산된 시스템에 얽매이지 마세요. B2B 원두 발주부터 매장 POS 연동, 그리고 B2C 스마트 오더까지. 압도적으로 깨끗하고 우아한 하나의 플랫폼.
            </p>
            
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap:'wrap' }}>
              <button className="btn-primary" onClick={() => alert('무료 시작하기')}>Get Started</button>
              <button className="btn-secondary">Request Demo</button>
            </div>
          </div>
        </section>

        {/* 2. Bento Grid Section */}
        <section style={{ position:'relative', zIndex:1, padding: '100px 5%' }}>
          <div className="hide-animate" style={{ textAlign: 'center', marginBottom: '80px' }}>
            <h2 style={{ fontSize: 'clamp(2.5rem, 5vw, 4rem)', fontWeight: '800', letterSpacing:'-1px', marginBottom:'16px', color:'#111' }}>
              6개의 완벽한 <span className="accent-text">권한 생태계</span>
            </h2>
            <p style={{ color: '#666', fontSize: '1.1rem', maxWidth:'600px', margin:'0 auto' }}>각자의 역할에 맞춰 완벽하게 재구성되는 지능형 인터페이스</p>
          </div>

          <div className="bento-grid">
            {/* Card 1: Roastery (Large) */}
            <div className="glass-card span-2 hide-animate" style={{ transitionDelay: '0.1s' }}>
              <div className="card-content">
                <div style={{ width:'56px', height:'56px', borderRadius:'18px', background:'rgba(255,106,0,0.1)', border:'1px solid rgba(255,106,0,0.1)', display:'flex', justifyContent:'center', alignItems:'center', fontSize:'1.5rem', marginBottom:'24px' }}>🔥</div>
                <h3 style={{ fontSize: '2rem', fontWeight:'800', marginBottom: '12px', color:'#111' }}>로스터리 (A등급)</h3>
                <p style={{ color: '#555', fontSize:'1.1rem', lineHeight: '1.6', maxWidth:'80%' }}>
                  산하 가맹 카페들의 원두 재고를 실시간으로 모니터링하고, AI 기반 발주 자동화 및 정밀한 커핑 프로파일을 원격으로 배포하세요.
                </p>
              </div>
            </div>

            {/* Card 2: Partners (Small) */}
            <div className="glass-card hide-animate" style={{ transitionDelay: '0.2s' }}>
              <div className="card-content">
                <div style={{ width:'56px', height:'56px', borderRadius:'18px', background:'rgba(0,0,0,0.03)', border:'1px solid rgba(0,0,0,0.05)', display:'flex', justifyContent:'center', alignItems:'center', fontSize:'1.5rem', marginBottom:'24px' }}>🤖</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight:'700', marginBottom: '12px', color:'#111' }}>협력사 파트너</h3>
                <p style={{ color: '#555', lineHeight: '1.6' }}>오토 탬퍼 및 브루잉 로봇 등 IoT 하드웨어 API 직접 연동 지원.</p>
              </div>
            </div>

            {/* Card 3: Users (Small) */}
            <div className="glass-card hide-animate" style={{ transitionDelay: '0.3s' }}>
              <div className="card-content">
                <div style={{ width:'56px', height:'56px', borderRadius:'18px', background:'rgba(124,58,237,0.08)', border:'1px solid rgba(124,58,237,0.1)', display:'flex', justifyContent:'center', alignItems:'center', fontSize:'1.5rem', marginBottom:'24px' }}>✨</div>
                <h3 style={{ fontSize: '1.5rem', fontWeight:'700', marginBottom: '12px', color:'#111' }}>마이 레시피</h3>
                <p style={{ color: '#555', lineHeight: '1.6' }}>유료 구독 회원의 커피 성향을 반영한 맞춤형 제조 데이터.</p>
              </div>
            </div>

            {/* Card 4: Cafe (Large) */}
            <div className="glass-card span-2 hide-animate" style={{ transitionDelay: '0.4s' }}>
              <div className="card-content">
                <div style={{ width:'56px', height:'56px', borderRadius:'18px', background:'rgba(59,130,246,0.08)', border:'1px solid rgba(59,130,246,0.1)', display:'flex', justifyContent:'center', alignItems:'center', fontSize:'1.5rem', marginBottom:'24px' }}>☕</div>
                <h3 style={{ fontSize: '2rem', fontWeight:'800', marginBottom: '12px', color:'#111' }}>카페 (B, C등급)</h3>
                <p style={{ color: '#555', fontSize:'1.1rem', lineHeight: '1.6', maxWidth:'80%' }}>
                  기존 Windows 포스기(OKPOS 등)와의 완벽한 융합. 브라우저 창 하나만 열어두면 모바일 원격 주문 수신부터 영수증 출력까지 자동으로 처리됩니다.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Showcase Section */}
        <section style={{ position:'relative', zIndex:1, padding: '100px 5%' }}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '60px', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="hide-animate" style={{ flex: '1 1 400px' }}>
              <div style={{ display: 'inline-block', padding: '6px 12px', background: 'rgba(255,106,0,0.1)', color: '#FF6A00', borderRadius: '8px', fontWeight: 'bold', fontSize:'0.8rem', marginBottom:'16px' }}>
                Distance API
              </div>
              <h2 style={{ fontSize: 'clamp(2.5rem, 4vw, 3.5rem)', fontWeight: '900', marginBottom: '24px', lineHeight:'1.1', letterSpacing:'-1px', color:'#111' }}>
                발걸음이 닿는 곳, <br/><span style={{color:'#888'}}>곧 당신의 매장.</span>
              </h2>
              <p style={{ color: '#555', fontSize: '1.15rem', lineHeight: '1.7', marginBottom: '32px' }}>
                반경 1km 이내의 스마트 오더 시스템을 통해 대기 시간 없는 완벽한 픽업 경험을 선사합니다. 브랜드 통합 멤버십 포인트(CUP)로 고객의 재방문을 유도하세요.
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{display:'flex', alignItems:'center', gap:'12px', color:'#333', fontWeight:'600'}}>
                  <span style={{display:'flex', justifyContent:'center', alignItems:'center', width:'24px', height:'24px', borderRadius:'50%', background:'rgba(255,106,0,0.15)', color:'#FF6A00', fontSize:'12px'}}>✓</span>
                  거리 기반 실시간 주문 제한
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'12px', color:'#333', fontWeight:'600'}}>
                  <span style={{display:'flex', justifyContent:'center', alignItems:'center', width:'24px', height:'24px', borderRadius:'50%', background:'rgba(255,106,0,0.15)', color:'#FF6A00', fontSize:'12px'}}>✓</span>
                  원클릭 포인트(CUP) 결제망
                </div>
                <div style={{display:'flex', alignItems:'center', gap:'12px', color:'#333', fontWeight:'600'}}>
                  <span style={{display:'flex', justifyContent:'center', alignItems:'center', width:'24px', height:'24px', borderRadius:'50%', background:'rgba(255,106,0,0.15)', color:'#FF6A00', fontSize:'12px'}}>✓</span>
                  고객 성향 빅데이터 분석
                </div>
              </div>
            </div>
            
            {/* Floating Abstract UI (Light Theme) */}
            <div className="hide-animate" style={{ flex: '1 1 500px', position: 'relative' }}>
              <div className="mockup-container">
                <div className="floating-layer layer-1">
                  <div style={{padding:'30px'}}>
                    <div style={{width:'40px', height:'40px', borderRadius:'50%', background:'rgba(0,0,0,0.05)', marginBottom:'20px'}}></div>
                    <div style={{width:'60%', height:'20px', borderRadius:'4px', background:'rgba(0,0,0,0.04)', marginBottom:'12px'}}></div>
                    <div style={{width:'40%', height:'14px', borderRadius:'4px', background:'rgba(0,0,0,0.02)', marginBottom:'40px'}}></div>
                    <div style={{display:'flex', gap:'15px'}}>
                      <div style={{flex:1, height:'100px', borderRadius:'12px', background:'rgba(255,255,255,0.8)', border:'1px solid rgba(0,0,0,0.05)'}}></div>
                      <div style={{flex:1, height:'100px', borderRadius:'12px', background:'rgba(255,255,255,0.8)', border:'1px solid rgba(0,0,0,0.05)'}}></div>
                    </div>
                  </div>
                </div>
                <div className="floating-layer layer-2">
                  <div style={{padding:'20px'}}>
                    <div style={{width:'100%', height:'40px', borderRadius:'8px', background:'linear-gradient(90deg, #FF6A00, transparent)', opacity:'0.3'}}></div>
                  </div>
                </div>
                <div className="floating-layer layer-3">
                  <div style={{padding:'15px', display:'flex', alignItems:'center', gap:'15px'}}>
                    <div style={{width:'30px', height:'30px', borderRadius:'8px', background:'#10b981'}}></div>
                    <div>
                      <div style={{width:'80px', height:'10px', borderRadius:'4px', background:'rgba(0,0,0,0.1)', marginBottom:'6px'}}></div>
                      <div style={{width:'50px', height:'8px', borderRadius:'4px', background:'rgba(0,0,0,0.05)'}}></div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Footer CTA */}
        <footer style={{ position:'relative', zIndex:1, padding: '120px 5% 80px', textAlign: 'center', borderTop: '1px solid rgba(0,0,0,0.05)', marginTop:'100px' }}>
          <div className="hide-animate">
            <h2 style={{ fontSize: 'clamp(2rem, 4vw, 3rem)', fontWeight: '900', marginBottom: '32px', letterSpacing:'-1px', color:'#111' }}>
              미래의 커피 비즈니스를 <br/>지금 경험하세요.
            </h2>
            <button className="btn-primary" style={{padding:'20px 48px', fontSize:'1.2rem'}}>시스템 도입 문의</button>
            <div style={{ marginTop: '100px', color: '#444', fontSize: '0.9rem', fontWeight:'500' }}>
              © 2026 WURI Platform. All rights reserved. <br/>
              Engineered for Roasteries & Cafes.
            </div>
          </div>
        </footer>
      </div>
    </div>
  );
}
