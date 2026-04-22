-- =========================================================================
-- WURI 보안 규칙 및 권한 체계 적용 SQL (Phase 1)
-- =========================================================================

-- 1. profiles 테이블에 권한(role) 컬럼 추가 (존재하지 않을 경우에만)
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name='profiles' AND column_name='role') THEN
        ALTER TABLE public.profiles ADD COLUMN role TEXT DEFAULT 'beginner';
    END IF;
END $$;

-- 2. profiles 테이블에 대한 기본 Read 권한 (본인 정보만 조회, 관리자는 전체 조회)
-- 기존 프로필 보안 정책이 비활성화 되어있다면 켭니다.
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 기존 정책 날리기 (안전한 초기화를 위함)
DROP POLICY IF EXISTS "사용자는 본인의 프로필만 볼 수 있다" ON public.profiles;
DROP POLICY IF EXISTS "최고관리자는 모든 프로필을 볼 수 있다" ON public.profiles;
DROP POLICY IF EXISTS "사용자는 본인의 프로필만 수정할 수 있다" ON public.profiles;

-- 새로운 정책 추가
CREATE POLICY "사용자는 본인의 프로필만 볼 수 있다" 
ON public.profiles FOR SELECT 
USING (auth.uid() = id);

CREATE POLICY "최고관리자는 모든 프로필을 볼 수 있다" 
ON public.profiles FOR SELECT 
USING (
  -- 현재 로그인한 유저의 Auth ID를 통해 profiles 테이블에서 role이 super_admin인지 검사
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

CREATE POLICY "사용자는 본인의 프로필만 수정할 수 있다" 
ON public.profiles FOR UPDATE 
USING (auth.uid() = id);

-- 3. orders 테이블(주문 내역) 관리자 전용 보안
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "사용자는 본인의 주문만 볼 수 있다" ON public.orders;
DROP POLICY IF EXISTS "최고관리자는 모든 주문을 볼 수 있다" ON public.orders;

CREATE POLICY "사용자는 본인의 주문만 볼 수 있다" 
ON public.orders FOR SELECT 
USING (auth.uid() = user_id);

CREATE POLICY "최고관리자는 모든 주문을 볼 수 있다" 
ON public.orders FOR SELECT 
USING (
  (SELECT role FROM public.profiles WHERE id = auth.uid()) = 'super_admin'
);

-- =========================================================================
-- !주의! 
-- 최고 관리자로 지정할 계정(본인 아이디)의 role을 'super_admin'으로 수동 업데이트 해주세요.
-- 예: UPDATE public.profiles SET role = 'super_admin' WHERE name = '김유민';
-- =========================================================================
