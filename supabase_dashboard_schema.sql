-- ==========================================
-- WURI 대시보드 무한 확장형 통합 스키마 (각 시트별 독립형)
-- ==========================================

-- 기존 단일 통합 테이블 삭제
DROP TABLE IF EXISTS public.wuri_unified_data CASCADE;

-- 1. [운영] 통합 테이블
CREATE TABLE public.wuri_unified_ops (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,         -- 대분류 (예: '매출', '지출', '자금')
    label_name TEXT NOT NULL,       -- 항목명 (예: '해치1 본점', '임대료')
    target_date DATE NOT NULL,      -- 대상 날짜
    target_value NUMERIC,           -- 목표/예산액
    current_value NUMERIC,          -- 현재/누적액
    status_text TEXT,               -- 상태/비고
    extra_data JSONB DEFAULT '{}'::jsonb, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category, label_name, target_date)
);

-- 2. [인사] 통합 테이블
CREATE TABLE public.wuri_unified_hr (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,         -- 대분류 (예: '스케줄', '근무시간', '연차')
    label_name TEXT NOT NULL,       -- 직원이름 또는 직책 (예: '김우리', '성대리')
    target_date DATE NOT NULL,      -- 대상 날짜
    target_value NUMERIC,           -- 목표/예정시간
    current_value NUMERIC,          -- 실제/누적시간
    status_text TEXT,               -- 스케줄 구간 (예: '08:00~18:00', '주간')
    extra_data JSONB DEFAULT '{}'::jsonb, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category, label_name, target_date)
);

-- 3. [생산] 통합 테이블
CREATE TABLE public.wuri_unified_prod (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,         -- 대분류 (예: '원두재고', '생산일정')
    label_name TEXT NOT NULL,       -- 품목명 (예: '해치블렌드A', '우리스마일')
    target_date DATE NOT NULL,      -- 대상 날짜
    target_value NUMERIC,           -- 목표생산량/적정재고
    current_value NUMERIC,          -- 현재재고/생산량
    status_text TEXT,               -- 창고위치/상태
    extra_data JSONB DEFAULT '{}'::jsonb, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category, label_name, target_date)
);

-- 4. [과제] 통합 테이블
CREATE TABLE public.wuri_unified_task (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,         -- 대분류 (예: '시스템개발', '영업기획')
    label_name TEXT NOT NULL,       -- 과제명 (예: '보안대시보드 구축')
    target_date DATE NOT NULL,      -- 마감일자 또는 기준일
    target_value NUMERIC,           -- 목표 진행률 (예: 100)
    current_value NUMERIC,          -- 현재 진행률 (예: 85)
    status_text TEXT,               -- 담당자/상태 (예: '이해치/진행중')
    extra_data JSONB DEFAULT '{}'::jsonb, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category, label_name, target_date)
);

-- RLS 활성화
ALTER TABLE public.wuri_unified_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wuri_unified_hr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wuri_unified_prod ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wuri_unified_task ENABLE ROW LEVEL SECURITY;

-- 대시보드와 Apps Script용 권한 개방
CREATE POLICY "Enable all ops" ON public.wuri_unified_ops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all hr" ON public.wuri_unified_hr FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all prod" ON public.wuri_unified_prod FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all task" ON public.wuri_unified_task FOR ALL USING (true) WITH CHECK (true);
