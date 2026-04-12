-- 기존 구조 파기 (가짜 데이터 삭제)
DROP TABLE IF EXISTS public.profiles CASCADE;

-- 1. 인증 시스템(auth.users)과 동기화되는 새로운 profiles 테이블 생성
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  sub_text TEXT DEFAULT 'normal meeter. v7',
  points INTEGER DEFAULT 0
);

-- 2. 새 회원이 소셜 로그인(가입)을 완료하면 자동으로 profiles 테이블에 빈 데이터를 만들어주는 마법(트리거 로직)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, name, sub_text, points)
  -- 구글이나 카카오에서 넘겨주는 이름 정보를 가져오거나 fallback 텍스트 사용
  VALUES (new.id, coalesce(new.raw_user_meta_data->>'full_name', coalesce(new.raw_user_meta_data->>'name', '새로운 유저')), '신규 가입자', 0);
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- (만약 있다면 삭제)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- 3. 트리거 연결
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();
