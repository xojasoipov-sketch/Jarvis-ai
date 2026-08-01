CREATE TABLE IF NOT EXISTS pari_marketplace_items (
  id            BIGSERIAL PRIMARY KEY,
  title         TEXT NOT NULL,
  description   TEXT NOT NULL,
  category      TEXT NOT NULL,
  price         INTEGER DEFAULT 0,
  price_display TEXT,
  price_free    BOOLEAN DEFAULT FALSE,
  seller_name   TEXT DEFAULT 'Sadi',
  demo_url      TEXT,
  tags          TEXT[] DEFAULT '{}',
  downloads     INTEGER DEFAULT 0,
  rating        NUMERIC(3,1) DEFAULT 5.0,
  active        BOOLEAN DEFAULT TRUE,
  created_at    TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO pari_marketplace_items (title, description, category, price_display, price_free, tags) VALUES
('Telegram Bot Starter Kit',   'Tayyor Telegram bot template + n8n workflow. 5 daqiqada ishga tushadi.',    'automation', 'Bepul', true,  ARRAY['telegram','bot','n8n']),
('SMM Prompt Pack (50 ta)',    '50 ta tayyor SMM prompt — Instagram, Telegram, LinkedIn uchun.',             'prompts',    '$19',  false, ARRAY['smm','instagram','kontent']),
('CRM Automation Workflow',   'n8n + Supabase + Telegram: to''liq CRM avtomatizatsiya paketi.',             'automation', '$49',  false, ARRAY['crm','n8n','automation']),
('AI Sales Script Generator', 'Sotuv skript AI agent + pitch deck template + follow-up email seriyasi.',    'agents',     '$29',  false, ARRAY['sales','skript','ai']),
('Landing Page Template',     'Next.js + Tailwind landing page template. 10 ta blok, dark/light mode.',     'templates',  '$15',  false, ARRAY['landing','nextjs','template']),
('AI Chatbot Widget',         'Istalgan saytga qo''shish mumkin bo''lgan AI chatbot widget (React).',       'agents',     '$39',  false, ARRAY['chatbot','react','widget']);
