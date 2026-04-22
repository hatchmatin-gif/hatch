import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

export default function LandingPage() {
  const navigate = useNavigate();

  // 스크롤 시 등장 애니메이션을 위한 Observer
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

    // 최상위 wrapper 크기 강제 조정을 위해 (index.css의 #root flex 제약 우회)
    document.body.style.overflow = 'auto'; // 스크롤 허용
    return () => {
      document.body.style.overflow = 'hidden'; // 모바일 앱을 위해 원상복구
    };
  }, []);

  return (
    <div style={styles.container}>
      <style>{`
        /* 전용 애니메이션 CSS */
        @import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;800&family=Noto+Sans+KR:wght@300;500;700&display=swap');
        
        .landing-wrapper {
          font-family: 'Outfit', 'Noto Sans KR', sans-serif;
          background-color: #050505;
          color: #fff;
          width: 100vw;
          min-height: 100vh;
          overflow-x: hidden;
        }

        .hide-animate {
          opacity: 0;
          transform: translateY(40px);
          transition: all 0.8s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }

        .show-animate {
          opacity: 1;
          transform: translateY(0);
        }

        .gradient-text {
          background: linear-gradient(135deg, #FF6A00 0%, #FFB020 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .hero-glow {
          position: absolute;
          width: 600px;
          height: 600px;
          background: radial-gradient(circle, rgba(255,106,0,0.15) 0%, rgba(0,0,0,0) 70%);
          top: -200px;
          right: -200px;
          border-radius: 50%;
          z-index: 0;
          pointer-events: none;
        }

        .glass-card {
          background: rgba(255, 255, 255, 0.03);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255, 255, 255, 0.05);
          border-radius: 24px;
          padding: 40px;
          transition: transform 0.3s ease, background 0.3s ease;
        }
        .glass-card:hover {
          transform: translateY(-10px);
          background: rgba(255, 255, 255, 0.06);
          border: 1px solid rgba(255, 106, 0, 0.3);
        }

        .nav-header {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 80px;
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 0 5%;
          background: rgba(5,5,5,0.8);
          backdrop-filter: blur(10px);
          z-index: 100;
          border-bottom: 1px solid rgba(255,255,255,0.05);
        }
      `}</style>

      <div className="landing-wrapper">
        <div className="hero-glow"></div>

        {/* 네비게이션 바 */}
        <header className="nav-header">
          <div style={{ fontSize: '1.8rem', fontWeight: '800', letterSpacing: '-1px' }}>WURI</div>
          <div>
            <button style={styles.loginBtn} onClick={() => alert('앱을 설치하여 로그인해주세요.')}>앱 다운로드</button>
            <button style={{...styles.loginBtn, background:'transparent', border:'1px solid #333', marginLeft:'10px'}} onClick={() => navigate('/admin/login')}>Admin</button>
          </div>
        </header>

        {/* 1. Hero Section */}
        <section style={{...styles.section, marginTop: '80px', minHeight: '85vh', justifyContent: 'center'}}>
          <div className="hide-animate" style={{ zIndex: 1, textAlign: 'center' }}>
            <div style={{ display: 'inline-block', padding: '8px 16px', background: 'rgba(255,106,0,0.1)', color: '#FF6A00', borderRadius: '100px', fontWeight: 'bold', fontSize:'0.9rem', marginBottom:'24px' }}>
              커피 산업의 새로운 표준
            </div>
            <h1 style={{ fontSize: 'clamp(3rem, 6vw, 5rem)', fontWeight: '800', lineHeight: '1.1', marginBottom: '20px', letterSpacing: '-2px' }}>
              로스터리와 카페, <br />그리고 소비자를 <span className="gradient-text">하나로 연결하다</span>
            </h1>
            <p style={{ fontSize: '1.2rem', color: '#aaa', margin: '0 auto 40px', maxWidth: '600px', lineHeight: '1.6' }}>
              단순한 오더 앱이 아닙니다. 매장 관리부터 원두 유통, 고객 데이터 융합까지 WURI 플랫폼 하나로 커피 비즈니스의 모든 것을 통제하세요.
            </p>
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center' }}>
              <button style={styles.primaryBtn} onClick={() => alert('모바일 기기에서 앱을 설치해주세요.')}>무료로 시작하기</button>
              <button style={styles.secondaryBtn}>도입 문의</button>
            </div>
          </div>
        </section>

        {/* 2. 6-Tier Architecture Section */}
        <section style={{...styles.section, background: '#0a0a0a'}}>
          <div className="hide-animate" style={{ textAlign: 'center', marginBottom: '60px' }}>
            <h2 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '15px' }}>하나의 플랫폼, 6개의 완벽한 권한</h2>
            <p style={{ color: '#888', fontSize: '1.1rem' }}>참여하는 모든 이들에게 최적화된 인터페이스와 기능을 제공합니다.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '30px', maxWidth: '1200px', margin: '0 auto' }}>
            {/* B2B / Partners */}
            <div className="glass-card hide-animate" style={{ transitionDelay: '0.1s' }}>
              <div style={styles.iconCircle}>☕</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>로스터리 (A등급)</h3>
              <p style={{ color: '#aaa', lineHeight: '1.5' }}>산하 카페들의 원두 재고를 실시간 모니터링하고 발주를 자동화합니다. 커핑 프로파일 설정 기능 제공.</p>
            </div>
            <div className="glass-card hide-animate" style={{ transitionDelay: '0.2s' }}>
              <div style={styles.iconCircle}>🏪</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>카페 (B, C등급)</h3>
              <p style={{ color: '#aaa', lineHeight: '1.5' }}>기존 POS와 완벽 연동됩니다. 원격주문 수신, 마이레시피 관리, 1 click 원두 발주 시스템을 경험하세요.</p>
            </div>
            <div className="glass-card hide-animate" style={{ transitionDelay: '0.3s' }}>
              <div style={styles.iconCircle}>🤝</div>
              <h3 style={{ fontSize: '1.5rem', marginBottom: '10px' }}>협력사 파트너</h3>
              <p style={{ color: '#aaa', lineHeight: '1.5' }}>오토 탬퍼, 브루잉 로봇 등 하드웨어 기기들과의 API 연동 및 셀프 주문 관리 통계화면을 지원합니다.</p>
            </div>
          </div>
        </section>

        {/* 3. Consumer Insight Section */}
        <section style={{...styles.section}}>
          <div style={{ display: 'flex', flexWrap: 'wrap', alignItems: 'center', gap: '60px', maxWidth: '1200px', margin: '0 auto' }}>
            <div className="hide-animate" style={{ flex: '1 1 400px' }}>
              <h2 style={{ fontSize: '3rem', fontWeight: '800', marginBottom: '20px', lineHeight:'1.2' }}>고객의 발걸음을<br/>당신의 <span className="gradient-text">매장으로</span></h2>
              <p style={{ color: '#aaa', fontSize: '1.1rem', lineHeight: '1.6', marginBottom: '30px' }}>
                <strong>유료구독 (프리미엄)</strong> 회원들은 자신만의 '마이 레시피'를 들고 가맹점을 찾습니다. <br/><br/>
                <strong>일반 입문 (Beginner)</strong> 회원들에게는 반경 1km 이내의 스마트 원격주문을 통해 대기시간 없는 완벽한 픽업 경험을 선사합니다.
              </p>
              <ul style={{ listStyle: 'none', padding: 0, display: 'flex', flexDirection: 'column', gap: '15px' }}>
                <li style={styles.listItem}>✓ 거리 기반 스마트 오더 제한</li>
                <li style={styles.listItem}>✓ 브랜드 통합 멤버십 포인트 (CUP)</li>
                <li style={styles.listItem}>✓ 고객의 커피 성향 데이터화 분석</li>
              </ul>
            </div>
            <div className="hide-animate" style={{ flex: '1 1 400px', position: 'relative' }}>
              {/* Fake UI Mockup */}
              <div style={{ width: '100%', height: '500px', background: 'linear-gradient(to bottom right, #222, #111)', borderRadius: '30px', border: '8px solid #333', boxShadow: '0 30px 60px rgba(0,0,0,0.5)', overflow: 'hidden', position: 'relative' }}>
                <div style={{ padding: '30px', display:'flex', flexDirection:'column', gap:'20px' }}>
                  <div style={{ width: '100%', height: '120px', background: '#333', borderRadius: '20px' }}></div>
                  <div style={{ width: '70%', height: '40px', background: '#333', borderRadius: '10px' }}></div>
                  <div style={{ display: 'flex', gap: '15px' }}>
                    <div style={{ width: '50%', height: '150px', background: '#FF6A00', borderRadius: '20px', opacity:'0.8' }}></div>
                    <div style={{ width: '50%', height: '150px', background: '#222', borderRadius: '20px', border:'1px solid #444' }}></div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. CTA Footer */}
        <footer style={{ padding: '100px 5%', textAlign: 'center', background: '#050505', borderTop: '1px solid rgba(255,255,255,0.05)' }}>
          <h2 className="hide-animate" style={{ fontSize: '2.5rem', fontWeight: '800', marginBottom: '30px' }}>지금 바로 커피 혁신에 동참하세요</h2>
          <button className="hide-animate" style={styles.primaryBtn}>서비스 데모 신청</button>
          <div style={{ marginTop: '80px', color: '#555', fontSize: '0.9rem' }}>
            © 2026 WURI Platform. All rights reserved. <br/>
            Designed for Roasteries & Cafes.
          </div>
        </footer>
      </div>
    </div>
  );
}

const styles = {
  container: {
    width: '100vw',
    position: 'absolute', // To break out of App.jsx center flex if any
    top: 0, left: 0,
    backgroundColor: '#000',
    overflowY: 'auto' // 자체 스크롤
  },
  section: {
    padding: '100px 5%',
    position: 'relative',
    display: 'flex',
    flexDirection: 'column'
  },
  loginBtn: {
    padding: '10px 20px',
    backgroundColor: '#fff',
    color: '#000',
    border: 'none',
    borderRadius: '100px',
    fontWeight: 'bold',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  primaryBtn: {
    padding: '18px 36px',
    backgroundColor: '#FF6A00',
    color: '#fff',
    border: 'none',
    borderRadius: '100px',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    cursor: 'pointer',
    boxShadow: '0 10px 20px rgba(255,106,0,0.3)',
    transition: 'transform 0.2s'
  },
  secondaryBtn: {
    padding: '18px 36px',
    backgroundColor: 'rgba(255,255,255,0.1)',
    color: '#fff',
    border: '1px solid rgba(255,255,255,0.2)',
    borderRadius: '100px',
    fontWeight: 'bold',
    fontSize: '1.1rem',
    cursor: 'pointer',
    transition: 'background 0.2s'
  },
  iconCircle: {
    width: '60px',
    height: '60px',
    borderRadius: '50%',
    backgroundColor: 'rgba(255,106,0,0.1)',
    color: '#FF6A00',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    fontSize: '1.8rem',
    marginBottom: '20px'
  },
  listItem: {
    fontSize: '1.1rem',
    color: '#ccc',
    display: 'flex',
    alignItems: 'center',
    gap: '10px'
  }
};
