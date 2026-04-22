import React, { useState } from 'react';
import { supabase } from '../../../supabase.js';

export default function AdminLogin() {
  const [loadingProvider, setLoadingProvider] = useState(null);

  const handleAdminOAuthLogin = async (provider) => {
    setLoadingProvider(provider);
    try {
      const { error } = await supabase.auth.signInWithOAuth({ 
        provider,
        options: {
          // OAuth 로그인 후 대시보드로 돌아오도록 설정
          redirectTo: `${window.location.origin}/#/admin/dashboard`
        }
      });
      if (error) throw error;
    } catch (err) {
      alert("관리자 로그인 실패: " + err.message);
      setLoadingProvider(null);
    }
  };

  return (
    <div style={{ height: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', backgroundColor: '#000', color: '#fff' }}>
      <div style={{ backgroundColor: '#111', padding: '40px', borderRadius: '12px', width: '100%', maxWidth: '360px', textAlign: 'center' }}>
        <h2 style={{ marginBottom: '30px', color: '#e74c3c' }}>WURI 시스템 제어실</h2>
        <p style={{ color: '#aaa', fontSize: '0.9rem', marginBottom: '30px' }}>
          권한을 부여받은 소셜 계정으로 로그인하세요.
        </p>

        <button 
          onClick={() => handleAdminOAuthLogin('kakao')} 
          disabled={loadingProvider !== null} 
          style={{ width: '100%', padding: '14px', marginBottom: '15px', borderRadius: '6px', backgroundColor: '#FEE500', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          {loadingProvider === 'kakao' ? '인증 중...' : '카카오 계정으로 보안 접속'}
        </button>

        <button 
          onClick={() => handleAdminOAuthLogin('google')} 
          disabled={loadingProvider !== null} 
          style={{ width: '100%', padding: '14px', borderRadius: '6px', backgroundColor: '#fff', color: '#000', fontWeight: 'bold', border: 'none', cursor: 'pointer' }}>
          {loadingProvider === 'google' ? '인증 중...' : '구글 계정으로 보안 접속'}
        </button>
      </div>
    </div>
  );
}
