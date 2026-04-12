import { supabase } from '../supabase.js';

export default function Login() {
  const handleLogin = async (provider) => {
    // 실제 OAuth 제공자로 리다이렉트 (카카오, 구글 등)
    await supabase.auth.signInWithOAuth({
      provider: provider,
      options: {
        redirectTo: window.location.origin,
      }
    });
  };

  return (
    <div style={{
      width: '100%', height: '100dvh', 
      backgroundColor: '#000000', color: '#ffffff',
      display: 'flex', flexDirection: 'column', 
      justifyContent: 'center', alignItems: 'center',
      padding: '20px'
    }}>
      <h1 style={{ color: '#ff6a11', fontSize: '2.5rem', marginBottom: '10px' }}>COFFEE CHAT</h1>
      <p style={{ color: '#aaa', marginBottom: '60px' }}>상생 모임 통합 플랫폼, WURI</p>

      <button 
        onClick={() => handleLogin('kakao')}
        style={{
          width: '100%', maxWidth: '320px', padding: '16px',
          backgroundColor: '#FEE500', color: '#000000',
          border: 'none', borderRadius: '12px',
          fontSize: '1.1rem', fontWeight: 'bold', marginBottom: '16px',
          cursor: 'pointer'
        }}>
        카카오톡으로 3초 만에 시작하기
      </button>

      <button 
        onClick={() => handleLogin('google')}
        style={{
          width: '100%', maxWidth: '320px', padding: '16px',
          backgroundColor: '#ffffff', color: '#000000',
          border: '1px solid #ddd', borderRadius: '12px',
          fontSize: '1.1rem', fontWeight: 'bold',
          cursor: 'pointer'
        }}>
        구글 계정으로 계속하기
      </button>

      <div style={{ marginTop: '40px', fontSize: '0.8rem', color: '#666', textAlign: 'center' }}>
        가입 시 이용약관 및 개인정보처리방침에 동의하게 됩니다.
      </div>
    </div>
  );
}
