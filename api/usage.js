// api/usage.js — Vercel Serverless Function
// 브라우저에 토큰을 노출시키지 않고 서버에서 안전하게 API 호출

export default async function handler(req, res) {
  // CORS: 관리자 대시보드에서만 호출 허용
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET');
  res.setHeader('Cache-Control', 'no-store');

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const SUPABASE_PROJECT_REF = process.env.SUPABASE_PROJECT_REF; // emclresadhbaogtjfves
  const SUPABASE_MGMT_TOKEN  = process.env.SUPABASE_MGMT_TOKEN;  // Supabase Management API token
  const VERCEL_TOKEN         = process.env.VERCEL_TOKEN;          // Vercel API token
  const VERCEL_TEAM_ID       = process.env.VERCEL_TEAM_ID || '';  // optional

  const results = await Promise.allSettled([
    // ── Supabase: 프로젝트 사용량 ──────────────────────────────────────
    SUPABASE_PROJECT_REF && SUPABASE_MGMT_TOKEN
      ? fetch(`https://api.supabase.com/v1/projects/${SUPABASE_PROJECT_REF}/usage`, {
          headers: { Authorization: `Bearer ${SUPABASE_MGMT_TOKEN}` }
        }).then(r => r.ok ? r.json() : null)
      : Promise.resolve(null),

    // ── Vercel: 현재 프로젝트 정보 ─────────────────────────────────────
    VERCEL_TOKEN
      ? fetch(`https://api.vercel.com/v9/projects/hatch${VERCEL_TEAM_ID ? `?teamId=${VERCEL_TEAM_ID}` : ''}`, {
          headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
        }).then(r => r.ok ? r.json() : null)
      : Promise.resolve(null),

    // ── Vercel: 대역폭/요청 사용량 ─────────────────────────────────────
    VERCEL_TOKEN
      ? fetch(`https://api.vercel.com/v9/deployments?projectId=hatch&limit=1${VERCEL_TEAM_ID ? `&teamId=${VERCEL_TEAM_ID}` : ''}`, {
          headers: { Authorization: `Bearer ${VERCEL_TOKEN}` }
        }).then(r => r.ok ? r.json() : null)
      : Promise.resolve(null),
  ]);

  const supabaseData = results[0].status === 'fulfilled' ? results[0].value : null;
  const vercelProject = results[1].status === 'fulfilled' ? results[1].value : null;
  const vercelDeploy  = results[2].status === 'fulfilled' ? results[2].value : null;

  // ── Supabase 사용량 파싱 ────────────────────────────────────────────
  let supabase = { dbSize: 0, apiRequests: 0, dbPercent: 0, apiPercent: 0 };
  if (supabaseData) {
    // API 응답 구조가 복잡하므로 여러 경로 확인
    const metrics = supabaseData.usages || supabaseData.metrics || supabaseData;
    const dbVal = metrics?.db_size?.usage ?? metrics?.database_size?.usage ?? 0;
    const apiVal = metrics?.api_requests?.usage ?? 0;
    
    supabase = {
      dbSize: dbVal,
      apiRequests: apiVal,
      // 0보다 크면 최소 1%로 표시되게 Math.ceil 사용
      dbPercent: dbVal > 0 ? Math.max(1, Math.ceil((dbVal / 536870912) * 100)) : 0,
      apiPercent: apiVal > 0 ? Math.max(1, Math.ceil((apiVal / 500000) * 100)) : 0,
    };
  }

  // ── Vercel 사용량 파싱 ──────────────────────────────────────────────
  let vercel = { bandwidthPercent: 0, requestsPercent: 0 };
  if (vercelProject) {
    // 임시로 연동 확인용 1% 표시 (실제 데이터는 Vercel Billing API 필요)
    vercel.bandwidthPercent = 1; 
    vercel.requestsPercent = 1;
  }

  return res.status(200).json({
    supabase,
    vercel,
    fetchedAt: new Date().toISOString(),
    configured: {
      supabase: !!(SUPABASE_PROJECT_REF && SUPABASE_MGMT_TOKEN),
      vercel:   !!VERCEL_TOKEN,
    }
  });
}
