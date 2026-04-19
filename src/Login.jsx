import React, { useState } from 'react';
import { supabase } from '../supabase.js';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) alert(error.message);
    setLoading(false);
  };

  const handleSignup = async () => {
    setLoading(true);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) alert("인증 메일이 발송되었습니다. 확인 후 로그인해주세요.");
    setLoading(false);
  };

  return (
    <div style={containerStyle}>
      <div style={logoArea}>
        <div style={logoCircle}>W</div>
        <h1 style={titleStyle}>WURI</h1>
        <p style={subTitleStyle}>Welcome back to your store</p>
      </div>

      <form onSubmit={handleLogin} style={formStyle}>
        <input 
          type="email" placeholder="Email" value={email}
          onChange={(e) => setEmail(e.target.value)} style={inputStyle} required 
        />
        <input 
          type="password" placeholder="Password" value={password}
          onChange={(e) => setPassword(e.target.value)} style={inputStyle} required 
        />
        <button type="submit" disabled={loading} style={mainBtn}>
          {loading ? 'Logging in...' : 'Login'}
        </button>
      </form>
      
      <div style={footerStyle}>
        <span>Don't have an account?</span>
        <button onClick={handleSignup} style={textBtn}>Sign up</button>
      </div>

      <div style={{ marginTop: '40px', fontSize: '0.8rem', color: '#888', textAlign: 'center' }}>
        가입 시 <a href="#" style={{color: '#888', textDecoration: 'underline'}}>이용약관</a> 및 <a href="#" style={{color: '#888', textDecoration: 'underline'}}>개인정보처리방침</a>에 동의하게 됩니다.
      </div>
    </div>
  );
}

const containerStyle = {
  width: '100%', height: '100dvh', display: 'flex', flexDirection: 'column', 
  justifyContent: 'center', padding: '40px', backgroundColor: 'var(--bg-light)'
};

const logoArea = { textAlign: 'center', marginBottom: '50px' };
const logoCircle = {
  width: '72px', height: '72px', backgroundColor: 'var(--accent-black)', color: '#fff',
  borderRadius: '50%', margin: '0 auto 20px', display: 'flex', justifyContent: 'center', 
  alignItems: 'center', fontSize: '2rem', fontWeight: '900'
};
const titleStyle = { fontSize: '2.5rem', fontWeight: '900', letterSpacing: '-1px', color: 'var(--text-main)' };
const subTitleStyle = { color: 'var(--text-sub)', fontSize: '1rem', marginTop: '5px' };

const formStyle = { display: 'flex', flexDirection: 'column', gap: '15px' };
const inputStyle = {
  padding: '18px 24px', borderRadius: '18px', border: '1px solid #eee', 
  fontSize: '1rem', outline: 'none', backgroundColor: '#fff', boxShadow: '0 4px 10px rgba(0,0,0,0.02)'
};
const mainBtn = {
  padding: '18px', backgroundColor: 'var(--accent-black)', color: '#fff', border: 'none',
  borderRadius: '18px', fontWeight: 'bold', fontSize: '1rem', marginTop: '10px', cursor: 'pointer'
};

const footerStyle = { marginTop: '30px', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-sub)' };
const textBtn = { 
  background: 'none', border: 'none', color: 'var(--text-main)', fontWeight: 'bold', 
  marginLeft: '8px', cursor: 'pointer', textDecoration: 'underline' 
};
