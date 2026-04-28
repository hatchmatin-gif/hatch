-- 1. profiles (?좎? 諛??ъ씤???뺣낫)
CREATE TABLE public.profiles (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL,
    sub_text TEXT,
    points INTEGER DEFAULT 0
);
-- ?뚯뒪?몄슜 ?곗씠??二쇱엯
INSERT INTO public.profiles (name, sub_text, points) 
VALUES ('Kim yum', 'normal meeter. v7', 16200);

-- 2. meetings (?щ젰 紐⑥엫 ?쇱젙)
CREATE TABLE public.meetings (
    id SERIAL PRIMARY KEY,
    date_offset INTEGER NOT NULL, -- ?ㅻ뒛 湲곗? 硫곗튌 ?ㅼ씤吏 (0=?ㅻ뒛, 1=?댁씪, 2=紐⑤젅...)
    who TEXT,
    where_location TEXT,
    what TEXT,
    payer TEXT
);
-- ?뚯뒪?몄슜 ?곗씠??二쇱엯 (?ㅻ뒛 ?쇱젙 1媛? ?댁씪 ?쇱젙 1媛?
INSERT INTO public.meetings (date_offset, who, where_location, what, payer) 
VALUES 
(0, '?뺥봽濡? 源?由?, '?명븯???, '?꾩씠???꾨찓由ъ뭅??3??, '?닿? ?쒕떎! (二쇱꽑??'),
(1, '理쒓낵?? ?대?由?, '醫낃컖??, '?쇰뼹 3??, '媛곸옄 寃곗젣');

-- 3. stores (洹쇱쿂 留ㅼ옣 ?뺣낫)
CREATE TABLE public.stores (
    id SERIAL PRIMARY KEY,
    store_name TEXT NOT NULL,
    item TEXT NOT NULL,
    badge_text TEXT
);
-- ?뚯뒪?몄슜 ?곗씠??二쇱엯
INSERT INTO public.stores (store_name, item, badge_text)
VALUES ('?명븯???, '?꾩씠???꾨찓由ъ뭅??T', '?곕?媛 ?곗뼱?섎꽕?? ??);
-- 1. 留ㅼ옣??二쇰Ц(orders) ?뚯씠釉??앹꽦
CREATE TABLE IF NOT EXISTS public.orders (
    id UUID DEFAULT extensions.uuid_generate_v4() PRIMARY KEY,
    store_id INTEGER REFERENCES public.stores(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    order_type TEXT NOT NULL DEFAULT '?뚮즺', -- '?뚮즺', '?먮몢', '?붿??? ??    items JSONB NOT NULL,                 -- [ {"name": "?꾨찓由ъ뭅??, "qty": 2, "price": 4500} ]
    total_price INTEGER NOT NULL DEFAULT 0,
    status TEXT NOT NULL DEFAULT '?湲곗쨷', -- ?湲곗쨷, ?섎씫?? ?꾨즺?? 痍⑥냼??    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. ??二쇰Ц ?뚮┝???꾪빐 Supabase??媛뺣젰??Realtime(?ㅼ떆媛??뱀냼耳? 湲곕뒫?????뚯씠釉붿뿉 耳?땲??
-- (??肄붾뱶媛 ?듭떖?낅땲?? ?닿쾶 ?덉뼱???붾㈃ ?덈줈怨좎묠 ?놁씠 POS湲곗뿉 ?좊쭅! ?뚮┝???듬땲??)
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
-- ==========================================
-- WURI ??쒕낫??臾댄븳 ?뺤옣???듯빀 ?ㅽ궎留?(媛??쒗듃蹂??낅┰??
-- ==========================================

-- 湲곗〈 ?⑥씪 ?듯빀 ?뚯씠釉???젣
DROP TABLE IF EXISTS public.wuri_unified_data CASCADE;

-- 1. [?댁쁺] ?듯빀 ?뚯씠釉?CREATE TABLE public.wuri_unified_ops (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,         -- ?遺꾨쪟 (?? '留ㅼ텧', '吏異?, '?먭툑')
    label_name TEXT NOT NULL,       -- ??ぉ紐?(?? '?댁튂1 蹂몄젏', '?꾨?猷?)
    target_date DATE NOT NULL,      -- ????좎쭨
    target_value NUMERIC,           -- 紐⑺몴/?덉궛??    current_value NUMERIC,          -- ?꾩옱/?꾩쟻??    status_text TEXT,               -- ?곹깭/鍮꾧퀬
    extra_data JSONB DEFAULT '{}'::jsonb, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category, label_name, target_date)
);

-- 2. [?몄궗] ?듯빀 ?뚯씠釉?CREATE TABLE public.wuri_unified_hr (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,         -- ?遺꾨쪟 (?? '?ㅼ?以?, '洹쇰Т?쒓컙', '?곗감')
    label_name TEXT NOT NULL,       -- 吏곸썝?대쫫 ?먮뒗 吏곸콉 (?? '源?곕━', '?깅?由?)
    target_date DATE NOT NULL,      -- ????좎쭨
    target_value NUMERIC,           -- 紐⑺몴/?덉젙?쒓컙
    current_value NUMERIC,          -- ?ㅼ젣/?꾩쟻?쒓컙
    status_text TEXT,               -- ?ㅼ?以?援ш컙 (?? '08:00~18:00', '二쇨컙')
    extra_data JSONB DEFAULT '{}'::jsonb, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category, label_name, target_date)
);

-- 3. [?앹궛] ?듯빀 ?뚯씠釉?CREATE TABLE public.wuri_unified_prod (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,         -- ?遺꾨쪟 (?? '?먮몢?ш퀬', '?앹궛?쇱젙')
    label_name TEXT NOT NULL,       -- ?덈ぉ紐?(?? '?댁튂釉붾젋?쏛', '?곕━?ㅻ쭏??)
    target_date DATE NOT NULL,      -- ????좎쭨
    target_value NUMERIC,           -- 紐⑺몴?앹궛???곸젙?ш퀬
    current_value NUMERIC,          -- ?꾩옱?ш퀬/?앹궛??    status_text TEXT,               -- 李쎄퀬?꾩튂/?곹깭
    extra_data JSONB DEFAULT '{}'::jsonb, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category, label_name, target_date)
);

-- 4. [怨쇱젣] ?듯빀 ?뚯씠釉?CREATE TABLE public.wuri_unified_task (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    category TEXT NOT NULL,         -- ?遺꾨쪟 (?? '?쒖뒪?쒓컻諛?, '?곸뾽湲고쉷')
    label_name TEXT NOT NULL,       -- 怨쇱젣紐?(?? '蹂댁븞??쒕낫??援ъ텞')
    target_date DATE NOT NULL,      -- 留덇컧?쇱옄 ?먮뒗 湲곗???    target_value NUMERIC,           -- 紐⑺몴 吏꾪뻾瑜?(?? 100)
    current_value NUMERIC,          -- ?꾩옱 吏꾪뻾瑜?(?? 85)
    status_text TEXT,               -- ?대떦???곹깭 (?? '?댄빐移?吏꾪뻾以?)
    extra_data JSONB DEFAULT '{}'::jsonb, 
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(category, label_name, target_date)
);

-- RLS ?쒖꽦??ALTER TABLE public.wuri_unified_ops ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wuri_unified_hr ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wuri_unified_prod ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.wuri_unified_task ENABLE ROW LEVEL SECURITY;

-- ??쒕낫?쒖? Apps Script??沅뚰븳 媛쒕갑
CREATE POLICY "Enable all ops" ON public.wuri_unified_ops FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all hr" ON public.wuri_unified_hr FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all prod" ON public.wuri_unified_prod FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Enable all task" ON public.wuri_unified_task FOR ALL USING (true) WITH CHECK (true);
