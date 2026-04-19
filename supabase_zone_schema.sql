-- ================================================
-- 동네 구역 설정 기능을 위한 profiles 테이블 컬럼 추가
-- Supabase SQL Editor에서 실행해주세요
-- ================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS home_zone_name TEXT,
  ADD COLUMN IF NOT EXISTS home_zone_lat FLOAT8,
  ADD COLUMN IF NOT EXISTS home_zone_lng FLOAT8,
  ADD COLUMN IF NOT EXISTS zone_change_count INTEGER DEFAULT 0;

-- 신규 유저 트리거 함수도 업데이트 (새 컬럼 기본값 반영)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, sub_text, points, home_zone_name, home_zone_lat, home_zone_lng, zone_change_count)
  VALUES (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'name', '새로운 유저')),
    '신규 가입자',
    0,
    NULL,
    NULL,
    NULL,
    0
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
