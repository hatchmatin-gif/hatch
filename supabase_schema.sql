-- 1. profiles (유저 및 포인트 정보)
CREATE TABLE public.profiles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sub_text TEXT,
    points INTEGER DEFAULT 0
);
-- 테스트용 데이터 주입
INSERT INTO public.profiles (name, sub_text, points) 
VALUES ('Kim yum', 'normal meeter. v7', 16200);

-- 2. meetings (달력 모임 일정)
CREATE TABLE public.meetings (
    id SERIAL PRIMARY KEY,
    date_offset INTEGER NOT NULL, -- 오늘 기준 며칠 뒤인지 (0=오늘, 1=내일, 2=모레...)
    who TEXT,
    where_location TEXT,
    what TEXT,
    payer TEXT
);
-- 테스트용 데이터 주입 (오늘 일정 1개, 내일 일정 1개)
INSERT INTO public.meetings (date_offset, who, where_location, what, payer) 
VALUES 
(0, '정프로, 김대리', '인하대점', '아이스 아메리카노 3잔', '내가 쏜다! (주선자)'),
(1, '최과장, 이대리', '종각점', '라떼 3잔', '각자 결제');

-- 3. stores (근처 매장 정보)
CREATE TABLE public.stores (
    id SERIAL PRIMARY KEY,
    store_name TEXT NOT NULL,
    item TEXT NOT NULL,
    badge_text TEXT
);
-- 테스트용 데이터 주입
INSERT INTO public.stores (store_name, item, badge_text)
VALUES ('인하대점', '아이스 아메리카노 T', '산미가 뛰어나네요! ✨');
