import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../../../supabase.js';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loadingProvider, setLoadingProvider] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [isSocialLoading, setIsSocialLoading] = useState(false);

  // 1. Inactivity Redirect (TEST MODE: DISABLED)
  useEffect(() => {
    if (isModalOpen) return;

    let timeout;
    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      // timeout = setTimeout(() => {
      //   navigate('/');
      // }, 1620);
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      if (timeout) clearTimeout(timeout);
    };
  }, [isModalOpen, navigate]);

  // 2. Randomized Inactivity Redirect (TEST MODE: DISABLED)
  useEffect(() => {
    if (!isModalOpen) return;

    let timeout;
    const getRandomTime = () => {
      const min = isSocialLoading ? 4150 : 1770;
      const max = isSocialLoading ? 5670 : 2920;
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const resetTimer = () => {
      if (timeout) clearTimeout(timeout);
      // timeout = setTimeout(() => {
      //   navigate('/');
      // }, getRandomTime());
    };

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      if (timeout) clearTimeout(timeout);
    };
  }, [isModalOpen, isSocialLoading, navigate]);

  // Reusing the same CSS and Layout logic from LandingPage for visual consistency
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

    const overrideStyle = document.createElement('style');
    overrideStyle.id = 'landing-override';
    overrideStyle.textContent = `
      html, body { overflow: auto !important; height: auto !important; overflow-y: auto !important; overscroll-behavior-y: auto !important; background-color: #FFFFFF !important; }
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

  const handleAdminOAuthLogin = async (provider) => {
    setLoadingProvider(provider);
    setIsSocialLoading(true); // Extend security timer
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          redirectTo: `${window.location.origin}/#/admin/dashboard`
        }
      });
      if (error) throw error;
    } catch (err) {
      alert("로그인 실패: " + err.message);
      setLoadingProvider(null);
    }
  };

  const handleEmailLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      navigate('/admin/dashboard');
    } catch (err) {
      alert("로그인 실패: " + err.message);
    } finally {
      setLoginLoading(false);
    }
  };

  return (
    <div style={{ width:'100vw', minHeight:'100vh', backgroundColor:'#FFFFFF', overflowX:'hidden', position:'relative' }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Noto+Sans+KR:wght@300;400;500;700;900&display=swap');
        
        * { box-sizing: border-box; }
        .landing-wrapper {
          font-family: 'Inter', 'Noto Sans KR', sans-serif;
          background-color: #FFFFFF;
          color: #111111;
          width: 100vw;
          min-height: 100vh;
          overflow-x: hidden;
          position: relative;
          transition: filter 0.5s ease;
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
        }

        /* Modal Styles */
        .modal-overlay {
          position: fixed;
          top: 0; left: 0; width: 100%; height: 100%;
          background: rgba(255, 255, 255, 0.4);
          backdrop-filter: blur(10px);
          display: flex;
          justify-content: center;
          align-items: center;
          z-index: 1000;
          animation: fadeIn 0.3s ease;
        }
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        .login-card {
          background: rgba(255, 255, 255, 0.9);
          border: 1px solid rgba(255, 255, 255, 1);
          backdrop-filter: blur(40px);
          border-radius: 40px;
          padding: 60px;
          width: 90%;
          max-width: 480px;
          box-shadow: 0 40px 100px rgba(0,0,0,0.1);
          text-align: center;
          animation: slideUp 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275);
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .login-input {
          width: 100%;
          padding: 16px 20px;
          border-radius: 12px;
          border: 1px solid rgba(0,0,0,0.1);
          background: rgba(255,255,255,0.5);
          margin-bottom: 12px;
          font-size: 1rem;
          outline: none;
          transition: border-color 0.3s;
        }
        .login-input:focus { border-color: #FF6A00; }
        .social-btn {
          width: 100%;
          padding: 14px;
          border-radius: 12px;
          font-weight: 600;
          border: none;
          cursor: pointer;
          margin-top: 8px;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          transition: transform 0.2s;
        }
        .social-btn:active { transform: scale(0.98); }
      `}</style>

      <div className="landing-wrapper" style={{ filter: isModalOpen ? 'blur(20px)' : 'none' }}>
        <header className="glass-nav">
          <div style={{ fontSize: '1.5rem', fontWeight: '900', letterSpacing: '-1px', color:'#111' }}>WURI.</div>
        </header>

        <section style={{ position:'relative', zIndex:1, minHeight: '100vh', display:'flex', flexDirection:'column', justifyContent:'center', alignItems:'center', padding: '120px 5% 60px', textAlign: 'center' }}>
          <div className="hide-animate">
            {/* Clickable Platform Tag */}
            <div 
              onClick={() => setIsModalOpen(true)}
              style={{ 
                display: 'inline-flex', alignItems:'center', gap:'8px', padding: '8px 16px', 
                background: 'rgba(0,0,0,0.03)', border:'1px solid rgba(0,0,0,0.05)', 
                borderRadius: '100px', fontWeight: '600', fontSize:'0.85rem', 
                marginBottom:'32px', letterSpacing:'1px', textTransform:'uppercase', 
                color:'#555', cursor:'pointer', transition:'all 0.3s' 
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.06)'}
              onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
            >
              <span style={{width:'8px', height:'8px', borderRadius:'50%', background:'#FF6A00', boxShadow:'0 0 10px rgba(255,106,0,0.5)'}}></span>
              WURI Platform 2.0
            </div>
            
            <h1 style={{ fontSize: 'clamp(3.5rem, 8vw, 6.5rem)', fontWeight: '900', lineHeight: '1.1', marginBottom: '24px', letterSpacing: '-0.04em' }}>
              <span className="gradient-text">커피의 모든 순간을</span><br />
              <span className="accent-text">하나로 연결하다</span>
            </h1>
            
            <p style={{ fontSize: '1.25rem', color: '#666', margin: '0 auto 48px', maxWidth: '650px', lineHeight: '1.7', fontWeight: '400' }}>
              더 이상 분산된 시스템에 얽매이지 마세요. B2B 원두 발주부터 매장 POS 연동, 그리고 B2C 스마트 오더까지. 압도적으로 깨끗하고 우아한 하나의 플랫폼.
            </p>
            
            <div style={{ display: 'flex', gap: '20px', justifyContent: 'center', flexWrap:'wrap' }}>
              <button className="btn-primary" onClick={() => setIsModalOpen(true)}>Get Started</button>
              <button className="btn-secondary" onClick={() => setIsModalOpen(true)}>Request Demo</button>
            </div>
          </div>
        </section>
      </div>

      {/* Login Modal */}
      {isModalOpen && (
        <div className="modal-overlay" onClick={() => setIsModalOpen(false)}>
          <div className="login-card" onClick={e => e.stopPropagation()}>
            <h2 style={{ fontSize: '2rem', fontWeight: '800', marginBottom: '8px', color: '#111' }}>Admin Login</h2>
            <p style={{ color: '#666', marginBottom: '32px' }}>관리자 권한으로 시스템에 접속합니다.</p>
            
            <form onSubmit={handleEmailLogin}>
              <input 
                type="email" 
                placeholder="Admin Email" 
                className="login-input" 
                value={email}
                onChange={e => setEmail(e.target.value)}
                required
              />
              <input 
                type="password" 
                placeholder="Password" 
                className="login-input" 
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
              />
              <button 
                type="submit" 
                className="btn-primary" 
                style={{ width:'100%', marginTop: '10px', marginBottom:'20px' }}
                disabled={loginLoading}
              >
                {loginLoading ? 'Logging in...' : 'Sign In'}
              </button>
            </form>

            <div style={{ position:'relative', margin:'24px 0', borderBottom:'1px solid rgba(0,0,0,0.05)' }}>
              <span style={{ position:'absolute', top:'-10px', left:'50%', transform:'translateX(-50%)', background:'rgba(255,255,255,0.9)', padding:'0 15px', fontSize:'0.8rem', color:'#999' }}>OR</span>
            </div>

            <button 
              className="social-btn" 
              style={{ background: '#FEE500', color: '#3c1e1e' }}
              onClick={() => handleAdminOAuthLogin('kakao')}
              disabled={loadingProvider !== null}
            >
              {loadingProvider === 'kakao' ? 'Connecting...' : '카카오로 계속하기'}
            </button>
            
            <button 
              className="social-btn" 
              style={{ background: '#fff', border: '1px solid rgba(0,0,0,0.1)', color: '#333' }}
              onClick={() => handleAdminOAuthLogin('google')}
              disabled={loadingProvider !== null}
            >
              {loadingProvider === 'google' ? 'Connecting...' : 'Google로 계속하기'}
            </button>

            <button 
              onClick={() => setIsModalOpen(false)}
              style={{ marginTop: '24px', background: 'none', border: 'none', color: '#999', fontSize: '0.9rem', cursor: 'pointer', textDecoration: 'underline' }}
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
