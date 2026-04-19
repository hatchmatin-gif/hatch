import React, { useState } from 'react';
import { supabase } from '../supabase.js';

export default function Login() {
  const [loadingProvider, setLoadingProvider] = useState(null);

  const handleOAuthLogin = async (provider) => {
    setLoadingProvider(provider);
    const { error } = await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      }
    });
    
    if (error) {
      alert(error.message);
      setLoadingProvider(null);
    }
  };

  return (
    <div style={containerStyle}>
      <div style={contentWrapper}>
        <div style={logoArea}>
          <div style={logoCircle}>W</div>
          <h1 style={titleStyle}>WURI</h1>
          <p style={subTitleStyle}>커피, 그 이상의 연결</p>
        </div>

        <div style={buttonContainer}>
          <button 
            onClick={() => handleOAuthLogin('kakao')} 
            disabled={loadingProvider !== null} 
            style={{...socialBtn, backgroundColor: '#FEE500', color: '#000000'}}
          >
            {loadingProvider === 'kakao' ? (
              <div className="refresh-spinner" style={{borderColor: '#000', borderTopColor: 'transparent', width:'20px', height:'20px', margin: '0 auto'}}></div>
            ) : (
              <>
                <svg viewBox="0 0 24 24" style={iconStyle} aria-hidden="true"><path d="M12 4C7.58172 4 4 6.96 4 10.608c0 2.378 1.637 4.453 4.108 5.568-.135.5-.47 1.745-.536 2.012-.083.332.115.326.242.24.095-.064 1.547-1.045 2.185-1.488.647.094 1.315.143 2.001.143 4.418 0 8-2.96 8-6.608C20 6.96 16.418 4 12 4z" fill="currentColor"/></svg>
                카카오로 시작하기
              </>
            )}
          </button>

          <button 
            onClick={() => handleOAuthLogin('google')} 
            disabled={loadingProvider !== null} 
            style={{...socialBtn, backgroundColor: '#FFFFFF', color: '#000000', border: '1px solid #E5E5E5'}}
          >
            {loadingProvider === 'google' ? (
              <div className="refresh-spinner" style={{borderColor: '#000', borderTopColor: 'transparent', width:'20px', height:'20px', margin: '0 auto'}}></div>
            ) : (
              <>
                <svg viewBox="0 0 24 24" style={iconStyle} aria-hidden="true"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                구글로 시작하기
              </>
            )}
          </button>
        </div>

        <div style={{ marginTop: '40px', fontSize: '0.85rem', color: '#888', textAlign: 'center', lineHeight: '1.5' }}>
          계속 진행하면 WURI의<br/>
          <a href="#" style={{color: '#666', textDecoration: 'underline'}}>이용약관</a> 및 <a href="#" style={{color: '#666', textDecoration: 'underline'}}>개인정보처리방침</a>에 동의하는 것으로 간주됩니다.
        </div>
      </div>
    </div>
  );
}

const containerStyle = {
  width: '100%', 
  height: '100dvh', 
  display: 'flex', 
  flexDirection: 'column', 
  justifyContent: 'center', 
  alignItems: 'center',
  padding: '40px', 
  backgroundColor: '#f9f9f9',
  backgroundImage: 'linear-gradient(135deg, #f9f9f9 0%, #e0e0e0 100%)', // Subtle premium gradient
};

const contentWrapper = {
  width: '100%',
  maxWidth: '400px',
  backgroundColor: 'rgba(255, 255, 255, 0.7)',
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)', // For iOS
  padding: '50px 30px',
  borderRadius: '32px',
  boxShadow: '0 20px 40px rgba(0,0,0,0.08), 0 1px 3px rgba(0,0,0,0.05)',
  border: '1px solid rgba(255, 255, 255, 0.4)',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
}

const logoArea = { textAlign: 'center', marginBottom: '50px', width: '100%' };
const logoCircle = {
  width: '80px', height: '80px', backgroundColor: 'var(--accent-black)', color: '#fff',
  borderRadius: '50%', margin: '0 auto 20px', display: 'flex', justifyContent: 'center', 
  alignItems: 'center', fontSize: '2.5rem', fontWeight: '900',
  boxShadow: '0 10px 20px rgba(0,0,0,0.15)'
};
const titleStyle = { fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px', color: 'var(--text-main)', margin: '0' };
const subTitleStyle = { color: 'var(--text-sub)', fontSize: '1.05rem', marginTop: '10px' };

const buttonContainer = { display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' };

const socialBtn = {
  position: 'relative',
  padding: '18px 24px', 
  border: 'none',
  borderRadius: '18px', 
  fontWeight: '800', 
  fontSize: '1.05rem', 
  cursor: 'pointer',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  width: '100%',
  boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
  transition: 'transform 0.1s ease, box-shadow 0.1s ease',
  WebkitTapHighlightColor: 'transparent'
};

const iconStyle = {
  position: 'absolute',
  left: '24px',
  width: '24px', 
  height: '24px'
};
