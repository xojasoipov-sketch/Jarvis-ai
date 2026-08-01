-- Migration 006: Trending / in-demand services catalog expansion
-- Hozirda bozorda eng talabgir AI xizmatlari

INSERT INTO pari_services (category, name, description, price, currency, billing_cycle, delivery_days, features, active)
VALUES

-- AI CONTENT & SMM (eng yuqori talab)
('smm', 'Instagram AI Boshqaruvi (30 kun)',
 'Har kuni 1 ta post + stories, AI yordamida kontent yaratish, hashtag strategiyasi, analytics hisobot',
 1500000, 'UZS', 'monthly', 30,
 ARRAY['30 ta original post', '30 ta stories', 'AI-generated captions', 'Hashtag research', 'Oylik analytics hisobot', 'Audience targeting'], true),

('smm', 'TikTok Kontent Strategiyasi',
 'Oylik 20 ta TikTok video skripti + montaj ko''rsatmalari, trend tahlili, viral formula',
 1200000, 'UZS', 'monthly', 30,
 ARRAY['20 ta video skript', 'Trend tahlili', 'Viral formula', 'Caption + hashtag', 'Montaj ko''rsatmalari', 'Reach strategiyasi'], true),

('smm', 'LinkedIn B2B Kontent (Oylik)',
 'Professional LinkedIn profil optimallashtirish + oylik 12 ta post, lead generation strategiyasi',
 2000000, 'UZS', 'monthly', 30,
 ARRAY['Profil optimallashtirish', '12 ta professional post', 'B2B lead strategy', 'Connection script', 'Engagement taktikalari', 'Analytics'], true),

('content', 'Faceless YouTube Kanal Ochish To''plami',
 'Niche research, 10 ta video skript, voiceover script, thumbnail brief, kanal SEO — hammasi AI bilan',
 3500000, 'UZS', 'one_time', 14,
 ARRAY['Niche & keyword research', '10 ta video skript', 'Voiceover guidance', 'Thumbnail brief x10', 'Kanal SEO setup', 'Monetizatsiya yo''l xaritasi'], true),

('content', 'Blog + SEO Maqolalar Paketi (10 ta)',
 'Google top-10 ga chiqish uchun optimallashtirilgan 10 ta maqola, keyword research bilan',
 2500000, 'UZS', 'one_time', 21,
 ARRAY['10 ta SEO maqola', 'Keyword research', 'Meta + title optimallashtirish', 'Internal linking', 'Google Search Console setup', 'Monthly rank tracking'], true),

('content', 'AI Email Marketing Kampaniyasi',
 '30 kunlik email ketma-ketlik, lead nurturing, segmentatsiya strategiyasi va A/B test',
 1800000, 'UZS', 'one_time', 10,
 ARRAY['Welcome sequence (5 email)', 'Nurturing sequence (10 email)', 'Sales sequence (7 email)', 'Subject line A/B test', 'Segmentation strategy', 'Analytics setup'], true),

-- AI AUTOMATION & BOTS (eng tez o''suvchi segment)
('automation', 'Telegram Bot (Biznes uchun)',
 'Sizning biznesingiz uchun maxsus Telegram bot — buyurtma qabul qilish, FAQ, to''lov, xabar yuborish',
 4500000, 'UZS', 'one_time', 14,
 ARRAY['Buyurtma qabul qilish', 'FAQ autoresponder', 'Paylov integratsiya', 'Admin panel', 'Statistika', '1 oylik texnik support'], true),

('automation', 'Instagram DM Avtomatlashtirish',
 'Instagram Direct orqali avtomatik javob, lead qualification, buyurtma olish chatboti',
 3000000, 'UZS', 'one_time', 10,
 ARRAY['Auto-reply DM', 'Lead qualification bot', 'Comment reply automation', 'Story reply triggers', 'CRM integratsiya', 'Analytics dashboard'], true),

('automation', 'Biznes Jarayonlari Avtomatlashtirish (AI Agent)',
 'Repetitiv vazifalarni AI agent bilan avtomatlashtirish: hisobotlar, email, ma''lumot yig''ish, scheduling',
 5000000, 'UZS', 'one_time', 21,
 ARRAY['Jarayon tahlili', 'n8n / Make.com setup', 'AI agent konfiguratsiya', '3 ta workflow avtomatlashtirish', 'Training va documentation', '2 oylik support'], true),

('automation', 'WhatsApp Business Chatbot',
 'WhatsApp Business API orqali mijozlar bilan avtomatik muloqot, buyurtma qabul qilish va tracking',
 3500000, 'UZS', 'one_time', 14,
 ARRAY['WhatsApp API setup', 'Chatbot flows', 'Order management', 'Payment link yuborish', 'Broadcast messaging', 'Analytics'], true),

-- AI CONSULTING & STRATEGY
('consulting', 'AI Strategiya Sessiyasi (2 soat)',
 'Biznesingizga qanday AI vositalarini qo''llash kerakligini aniqlash, yo''l xaritasi va prioritetlar',
 1000000, 'UZS', 'one_time', 3,
 ARRAY['Biznes audit', 'AI opportunity mapping', 'Tool stack tavsiyasi', 'ROI kalkulyatsiyasi', 'Yo''l xaritasi hujjati', 'Follow-up Q&A (30 daq)'], true),

('consulting', 'AI Tools & Templates To''plami (Biznes uchun)',
 'Sizning biznes sohangizdagi 20+ AI prompt + 10 ta Notion template + video qo''llanmalar',
 800000, 'UZS', 'one_time', 5,
 ARRAY['20+ maxsus prompt', '10 ta Notion template', 'Video qo''llanmalar', 'Prompt library (lifelong access)', 'Oylik yangilanish', 'Community access'], true),

('consulting', 'Online Kurs Yaratish Xizmati',
 'Sizning bilimingizni online kursga aylantirish — skript, slayd, video script, platform setup',
 6000000, 'UZS', 'one_time', 30,
 ARRAY['Kurs curriculum dizayni', '10 ta dars skripti', 'Slayd prezentatsiya', 'Platform setup (Teachable/Gumroad)', 'Sales page', 'Launch strategiyasi'], true),

-- DEV & TECH
('dev', 'AI Chatbot (Sayt uchun)',
 'Veb saytingizga AI chatbot qo''shish — mijozlar savollariga avtomatik javob, 24/7 ishlaydi',
 3500000, 'UZS', 'one_time', 10,
 ARRAY['Custom AI chatbot', 'Saytga integratsiya', 'Knowledge base setup', 'Multi-language support', 'Analytics panel', '3 oylik hosting'], true),

('dev', 'Landing Page (AI Yordamida)',
 'Konvertatsiya uchun optimallashtirilgan 1 sahifali sayt — copy, dizayn, va deploy hammasi shu yerda',
 2000000, 'UZS', 'one_time', 7,
 ARRAY['Copywriting (AI + human edit)', 'Responsive dizayn', 'Forma integratsiya', 'Analytics setup', 'Domain + hosting 1 yil', 'SEO basics'], true),

-- DESIGN
('design', 'Brand Identity (AI Asosida)',
 'Logo, rang palitasi, tipografiya, social media kit — AI bilan yaratilgan, professional tomonidan sifat tekshiruvi',
 2500000, 'UZS', 'one_time', 7,
 ARRAY['Logo (3 variant)', 'Rang palitasi', 'Tipografiya sistemi', 'Business card dizayn', 'Social media kit (10 ta template)', 'Brand guidelines hujjati'], true),

('design', 'Social Media Template To''plami (30 ta)',
 'Canva-ga import qilinadigan, brandingizga moslashtirilgan 30 ta professional template',
 900000, 'UZS', 'one_time', 5,
 ARRAY['30 ta unique template', 'Post + Stories formatlari', 'Brand colors applied', 'Canva Pro link', 'Qo''llanma video', 'Bepul 1 ta revision'], true)

ON CONFLICT DO NOTHING;

-- Trend belgisi uchun ustun qo''shish (agar yo''q bo''lsa)
ALTER TABLE pari_services ADD COLUMN IF NOT EXISTS is_trending BOOLEAN DEFAULT false;
ALTER TABLE pari_services ADD COLUMN IF NOT EXISTS demand_score INTEGER DEFAULT 0;

-- Eng talabgir xizmatlarga trending belgisi
UPDATE pari_services SET is_trending = true, demand_score = 95 WHERE name ILIKE '%Instagram AI%';
UPDATE pari_services SET is_trending = true, demand_score = 93 WHERE name ILIKE '%Telegram Bot%';
UPDATE pari_services SET is_trending = true, demand_score = 90 WHERE name ILIKE '%Faceless YouTube%';
UPDATE pari_services SET is_trending = true, demand_score = 88 WHERE name ILIKE '%TikTok%';
UPDATE pari_services SET is_trending = true, demand_score = 85 WHERE name ILIKE '%Avtomatlashtirish%' AND category = 'automation';
UPDATE pari_services SET is_trending = true, demand_score = 82 WHERE name ILIKE '%AI Chatbot%';
UPDATE pari_services SET is_trending = true, demand_score = 80 WHERE name ILIKE '%WhatsApp%';
UPDATE pari_services SET is_trending = true, demand_score = 78 WHERE name ILIKE '%LinkedIn%';
