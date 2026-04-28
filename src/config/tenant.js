export const TENANT_CONFIG = {
  // ----------------------------------------
  // 1. BRANDING & IDENTITY (브랜드 설정)
  // ----------------------------------------
  brand: {
    mainName: "WURI.",             // 메인 로고 텍스트 (예: WURI.)
    subName: "HATCH",              // 서브 로고 텍스트 (예: HATCH)
    primaryColor: "#FF6A00",       // 브랜드 메인 컬러 (오렌지)
    darkColor: "#111111",          // 텍스트/어두운 영역 컬러
    websiteUrl: "https://www.wuricafe.com/", // 로고 클릭 시 이동할 공식 홈페이지
    appTitle: "WURI Admin",        // 브라우저 탭 타이틀 등에 사용될 이름
  },

  // ----------------------------------------
  // 2. DASHBOARD KPI LABELS (대시보드 지표명)
  // ----------------------------------------
  dashboard: {
    overviewTitle: "Business Overview",
    overviewSubtitle: "실시간 비즈니스 현황",
    
    // 주요 4가지 매출 지표 이름 설정 (업종에 맞게 변경)
    kpiLabels: {
      budget1: "카페1매출",
      budget2: "카페2매출",
      sales1: "원두 매출",
      sales2: "디저트 매출"
    }
  },

  // ----------------------------------------
  // 3. SYSTEM META (시스템 메타 정보)
  // ----------------------------------------
  meta: {
    version: "v1.0.9",
    copyright: "© 2026 WURI. All rights reserved."
  }
};
