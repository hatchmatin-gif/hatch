-- 1. 매장용 주문(orders) 테이블 생성
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    store_id INTEGER REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    items JSONB NOT NULL,                 -- [ {"name": "아메리카노", "qty": 2, "price": 4500} ]
    total_price INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '대기중', -- 대기중, 수락됨, 완료됨, 취소됨
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 새 주문 알림을 위해 Supabase의 강력한 Realtime(실시간 웹소켓) 기능을 이 테이블에 켭니다!
-- (이 코드가 핵심입니다. 이게 있어야 화면 새로고침 없이 POS기에 띠링! 알림이 옵니다.)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
