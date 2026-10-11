-- ============================================================
-- AYZ Software Agency — Supabase Database Schema
-- Run this once in Supabase Dashboard → SQL Editor → New Query
-- ============================================================

-- ---------- Tables ----------
create table if not exists tools (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  style text,
  price text,
  price_monthly numeric,
  price_half_yearly numeric,
  price_yearly numeric,
  price_monthly_usd numeric,
  price_half_yearly_usd numeric,
  price_yearly_usd numeric,
  category text not null,
  domain text,
  image text,
  badge text,
  is_live boolean not null default true,
  slug text unique not null,
  sort_order int default 0,
  extra_info text,                     -- optional free-text note shown on that tool's page (e.g. "Includes 45 credits/month")
  badge_ids uuid[],                    -- which trust_badges show on this tool's page; NULL = show all
  created_at timestamptz default now()
);

create table if not exists bundles (
  id uuid primary key default gen_random_uuid(),
  bundle_id text unique not null,
  icon text,
  name text not null,
  tag text,
  description text,
  price numeric not null,
  price_usd numeric,
  include_all boolean default false,
  category_match text,
  included_tools text[],
  sort_order int default 0,
  created_at timestamptz default now()
);

create table if not exists settings (
  key text primary key,
  value text
);

-- ============================================================
-- Profiles (one row per signed-up user) + is_admin() helper.
-- Defined here, before any policy below, because those policies
-- call is_admin() and Postgres requires it to already exist. Every
-- "Authenticated ..." policy uses is_admin() instead of "is anyone
-- logged in", so only the real admin passes them — see
-- supabase/add-customer-accounts.sql for the full explanation.
-- ============================================================
create table if not exists profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  full_name text,
  phone text,
  role text not null default 'customer',   -- 'customer' | 'admin'
  created_at timestamptz default now()
);

alter table profiles enable row level security;

drop policy if exists "Users read own profile" on profiles;
drop policy if exists "Users update own profile" on profiles;
drop policy if exists "Users insert own profile" on profiles;
create policy "Users read own profile" on profiles for select using (auth.uid() = id);
create policy "Users update own profile" on profiles for update using (auth.uid() = id);
create policy "Users insert own profile" on profiles for insert with check (auth.uid() = id);

create or replace function is_admin() returns boolean
language sql security definer stable as $$
  select exists (select 1 from profiles where id = auth.uid() and role = 'admin');
$$;

-- Lets the admin panel's Customers tab list every signed-up user —
-- the "own profile" policy above only ever grants a customer their
-- own single row, so this is a separate, additive policy for admins.
drop policy if exists "Admin read all profiles" on profiles;
create policy "Admin read all profiles" on profiles for select using (is_admin());

create or replace function handle_new_user() returns trigger
language plpgsql security definer as $$
begin
  insert into public.profiles (id, email, role) values (new.id, new.email, 'customer')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function handle_new_user();

-- Keeps profiles.email in sync when a customer changes their email via
-- "My Account" — auth.users.email only actually changes once the change
-- is confirmed via the link sent to the new address, so this fires then.
create or replace function sync_profile_email() returns trigger
language plpgsql security definer as $$
begin
  if new.email is distinct from old.email then
    update public.profiles set email = new.email where id = new.id;
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_email_changed on auth.users;
create trigger on_auth_user_email_changed after update of email on auth.users
  for each row execute function sync_profile_email();

-- ---------- Row Level Security ----------
alter table tools enable row level security;
alter table bundles enable row level security;
alter table settings enable row level security;

-- Anyone (including logged-out visitors) can READ — needed so the
-- public website can display tools/bundles/settings without login.
-- (drop-if-exists first so this script is safe to run more than once)
drop policy if exists "Public read tools" on tools;
drop policy if exists "Public read bundles" on bundles;
drop policy if exists "Public read settings" on settings;
create policy "Public read tools" on tools for select using (true);
create policy "Public read bundles" on bundles for select using (true);
create policy "Public read settings" on settings for select using (true);

-- Only a logged-in (authenticated) admin can add/edit/delete.
drop policy if exists "Authenticated write tools" on tools;
drop policy if exists "Authenticated update tools" on tools;
drop policy if exists "Authenticated delete tools" on tools;
create policy "Authenticated write tools" on tools for insert with check (is_admin());
create policy "Authenticated update tools" on tools for update using (is_admin());
create policy "Authenticated delete tools" on tools for delete using (is_admin());

drop policy if exists "Authenticated write bundles" on bundles;
drop policy if exists "Authenticated update bundles" on bundles;
drop policy if exists "Authenticated delete bundles" on bundles;
create policy "Authenticated write bundles" on bundles for insert with check (is_admin());
create policy "Authenticated update bundles" on bundles for update using (is_admin());
create policy "Authenticated delete bundles" on bundles for delete using (is_admin());

drop policy if exists "Authenticated write settings" on settings;
drop policy if exists "Authenticated update settings" on settings;
drop policy if exists "Authenticated delete settings" on settings;
create policy "Authenticated write settings" on settings for insert with check (is_admin());
create policy "Authenticated update settings" on settings for update using (is_admin());
create policy "Authenticated delete settings" on settings for delete using (is_admin());

-- ---------- Seed data: 130 tools ----------
-- Total rows: 130
insert into tools (name, style, price, category, domain, badge, slug, sort_order) values
  ('Ahrefs', 'SEO & Backlink Analysis', NULL, 'SEO & Keyword Research', 'ahrefs.com', 'Best Seller', 'ahrefs', 1),
  ('Semrush', 'SEO & Keyword Research', NULL, 'SEO & Keyword Research', 'semrush.com', 'Best Seller', 'semrush', 2),
  ('Ubersuggest', 'Keyword & SEO Research', NULL, 'SEO & Keyword Research', 'neilpatel.com', NULL, 'ubersuggest', 3),
  ('Moz Pro', 'SEO Toolkit', NULL, 'SEO & Keyword Research', 'moz.com', NULL, 'moz-pro', 4),
  ('Spamzilla', 'Domain & Niche Research', NULL, 'SEO & Keyword Research', 'spamzilla.io', NULL, 'spamzilla', 5),
  ('KWFinder', 'Keyword Research', NULL, 'SEO & Keyword Research', 'mangools.com', NULL, 'kwfinder', 6),
  ('Keyword.io', 'Keyword Research', NULL, 'SEO & Keyword Research', 'keywordtool.io', NULL, 'keyword-io', 7),
  ('Spyfu', 'Competitor Research', NULL, 'SEO & Keyword Research', 'spyfu.com', NULL, 'spyfu', 8),
  ('StoryBase', 'Keyword & Content Research', NULL, 'SEO & Keyword Research', 'storybase.com', NULL, 'storybase', 9),
  ('Majestic', 'Backlink Analysis', NULL, 'SEO & Keyword Research', 'majestic.com', NULL, 'majestic', 10),
  ('Longtail Pro', 'Keyword Research', NULL, 'SEO & Keyword Research', 'longtailpro.com', NULL, 'longtail-pro', 11),
  ('Indexification', 'Link Indexing', NULL, 'SEO & Keyword Research', 'indexification.com', NULL, 'indexification', 12),
  ('Seoptimer', 'SEO Audit', NULL, 'SEO & Keyword Research', 'seoptimer.com', NULL, 'seoptimer', 13),
  ('SEO Site Checkup', 'SEO Audit', NULL, 'SEO & Keyword Research', 'seositecheckup.com', NULL, 'seo-site-checkup', 14),
  ('Sell The Trend', 'Dropshipping Research', NULL, 'SEO & Keyword Research', 'sellthetrend.com', NULL, 'sell-the-trend', 15),
  ('Seobility', 'SEO Audit & Tracking', NULL, 'SEO & Keyword Research', 'seobility.net', NULL, 'seobility', 16),
  ('AnswerThePublic', 'Content Idea Research', NULL, 'SEO & Keyword Research', 'answerthepublic.com', NULL, 'answerthepublic', 17),
  ('VidIQ Boost', 'YouTube SEO', NULL, 'SEO & Keyword Research', 'vidiq.com', NULL, 'vidiq-boost', 18),
  ('Woorank', 'Website SEO Review', NULL, 'SEO & Keyword Research', 'woorank.com', NULL, 'woorank', 19),
  ('Buzzstream', 'Outreach & Link Building', NULL, 'SEO & Keyword Research', 'buzzstream.com', NULL, 'buzzstream', 20),
  ('Keyword Revealer', 'Keyword Research', NULL, 'SEO & Keyword Research', 'keywordrevealer.com', NULL, 'keyword-revealer', 21),
  ('Growthbar', 'SEO & Content Writing', NULL, 'SEO & Keyword Research', 'growthbarseo.com', NULL, 'growthbar', 22),
  ('iSpionage', 'Competitor PPC Research', NULL, 'SEO & Keyword Research', 'ispionage.com', NULL, 'ispionage', 23),
  ('Link Indexer', 'Backlink Indexing', NULL, 'SEO & Keyword Research', NULL, NULL, 'link-indexer', 24),
  ('Instant Link Indexer', 'Backlink Indexing', NULL, 'SEO & Keyword Research', NULL, NULL, 'instant-link-indexer', 25),
  ('Niche Scraper', 'Product & Niche Research', NULL, 'SEO & Keyword Research', 'nichescraper.com', NULL, 'niche-scraper', 26),
  ('SEO Scout', 'SEO Audit', NULL, 'SEO & Keyword Research', 'seoscout.co', NULL, 'seo-scout', 27),
  ('Smart Scout', 'Amazon Research', NULL, 'SEO & Keyword Research', 'smartscout.com', NULL, 'smart-scout', 28),
  ('SEOzoom', 'All-in-One SEO Suite', NULL, 'SEO & Keyword Research', 'seozoom.com', NULL, 'seozoom', 29),
  ('WordTracker', 'Keyword Research', NULL, 'SEO & Keyword Research', 'wordtracker.com', NULL, 'wordtracker', 30),
  ('Dinorank', 'SEO Suite', NULL, 'SEO & Keyword Research', 'dinorank.com', NULL, 'dinorank', 31),
  ('SearchAtlas', 'SEO Platform', NULL, 'SEO & Keyword Research', 'searchatlas.com', NULL, 'searchatlas', 32),
  ('ChatGPT Plus (GPT-4)', 'AI Chat & Writing Assistant', NULL, 'AI Writing & Content Tools', 'openai.com', 'Hot', 'chatgpt-plus-gpt-4', 33),
  ('Claude.ai', 'AI Assistant', NULL, 'AI Writing & Content Tools', 'claude.ai', 'New', 'claude-ai', 34),
  ('Jasper.ai', 'AI Content Writer', NULL, 'AI Writing & Content Tools', 'jasper.ai', NULL, 'jasper-ai', 35),
  ('Copy.ai', 'AI Copywriting', NULL, 'AI Writing & Content Tools', 'copy.ai', NULL, 'copy-ai', 36),
  ('Copymatic', 'AI Content Writer', NULL, 'AI Writing & Content Tools', 'copymatic.ai', NULL, 'copymatic', 37),
  ('Writesonic', 'AI Content Writer', NULL, 'AI Writing & Content Tools', 'writesonic.com', NULL, 'writesonic', 38),
  ('Writeseed', 'AI Content Writer', NULL, 'AI Writing & Content Tools', 'writeseed.com', NULL, 'writeseed', 39),
  ('Quillbot', 'Paraphrasing & Grammar', NULL, 'AI Writing & Content Tools', 'quillbot.com', NULL, 'quillbot', 40),
  ('Grammarly', 'Grammar & Writing Assistant', NULL, 'AI Writing & Content Tools', 'grammarly.com', 'Best Seller', 'grammarly', 41),
  ('Jenni.ai', 'AI Writing Assistant', NULL, 'AI Writing & Content Tools', 'jenni.ai', NULL, 'jenni-ai', 42),
  ('Texta.ai', 'AI Content Writer', NULL, 'AI Writing & Content Tools', 'texta.ai', NULL, 'texta-ai', 43),
  ('Word.ai', 'AI Content Spinner', NULL, 'AI Writing & Content Tools', 'wordai.com', NULL, 'word-ai', 44),
  ('Design.ai', 'AI Design Assistant', NULL, 'AI Writing & Content Tools', 'design.ai', NULL, 'design-ai', 45),
  ('Bramework', 'AI Blog Writer & SEO', NULL, 'AI Writing & Content Tools', 'bramework.com', NULL, 'bramework', 46),
  ('Writecream', 'AI Content Writer', NULL, 'AI Writing & Content Tools', 'writecream.com', NULL, 'writecream', 47),
  ('Beautiful.ai', 'AI Presentation Designer', NULL, 'AI Writing & Content Tools', 'beautiful.ai', NULL, 'beautiful-ai', 48),
  ('Rezi.ai', 'AI Resume & CV Builder', NULL, 'AI Writing & Content Tools', 'rezi.ai', NULL, 'rezi-ai', 49),
  ('Prezi', 'Presentation Designer', NULL, 'AI Writing & Content Tools', 'prezi.com', NULL, 'prezi', 50),
  ('Nando.ai', 'AI Writing Tool', NULL, 'AI Writing & Content Tools', 'nando.ai', NULL, 'nando-ai', 51),
  ('Hix.ai', 'AI Writing Assistant', NULL, 'AI Writing & Content Tools', 'hix.ai', NULL, 'hix-ai', 52),
  ('BypassGPT', 'AI Detection Bypass', NULL, 'AI Writing & Content Tools', 'bypassgpt.ai', NULL, 'bypassgpt', 53),
  ('WriteHuman', 'AI Humanizer', NULL, 'AI Writing & Content Tools', 'writehuman.ai', NULL, 'writehuman', 54),
  ('AI Detector', 'AI Content Detector', NULL, 'AI Writing & Content Tools', NULL, NULL, 'ai-detector', 55),
  ('Dream.ai', 'AI Image Generator', NULL, 'AI Writing & Content Tools', 'dream.ai', NULL, 'dream-ai', 56),
  ('Sider.ai', 'AI Browser Assistant', NULL, 'AI Writing & Content Tools', 'sider.ai', NULL, 'sider-ai', 57),
  ('Turnitin Instructor', 'Plagiarism Checker', NULL, 'AI Writing & Content Tools', 'turnitin.com', NULL, 'turnitin-instructor', 58),
  ('Turnitin Student', 'Plagiarism Checker', NULL, 'AI Writing & Content Tools', 'turnitin.com', NULL, 'turnitin-student', 59),
  ('Picsart', 'AI Photo & Design Editor', NULL, 'AI Writing & Content Tools', 'picsart.com', NULL, 'picsart', 60),
  ('ProWritingAid', 'Grammar & Style Editor', NULL, 'AI Writing & Content Tools', 'prowritingaid.com', NULL, 'prowritingaid', 61),
  ('WordHero', 'AI Content Writer', NULL, 'AI Writing & Content Tools', 'wordhero.co', NULL, 'wordhero', 62),
  ('CloserCopy', 'AI Sales Copywriting', NULL, 'AI Writing & Content Tools', 'closercopy.com', NULL, 'closercopy', 63),
  ('Papertyper.ai', 'AI Essay Writer', NULL, 'AI Writing & Content Tools', 'papertyper.net', NULL, 'papertyper-ai', 64),
  ('Smodin', 'AI Writing & Rewriting', NULL, 'AI Writing & Content Tools', 'smodin.io', NULL, 'smodin', 65),
  ('Wordtune', 'AI Writing Companion', NULL, 'AI Writing & Content Tools', 'wordtune.com', NULL, 'wordtune', 66),
  ('Quetext', 'Plagiarism Checker', NULL, 'AI Writing & Content Tools', 'quetext.com', NULL, 'quetext', 67),
  ('Jobscan', 'Resume Optimization', NULL, 'AI Writing & Content Tools', 'jobscan.co', NULL, 'jobscan', 68),
  ('Writefull', 'Academic Writing Assistant', NULL, 'AI Writing & Content Tools', 'writefull.com', NULL, 'writefull', 69),
  ('Monica AI (GPT-4)', 'AI Chat Assistant', NULL, 'AI Writing & Content Tools', 'monica.im', NULL, 'monica-ai-gpt-4', 70),
  ('Cramly.ai', 'AI Study Assistant', NULL, 'AI Writing & Content Tools', 'cramly.ai', NULL, 'cramly-ai', 71),
  ('StealthWriter', 'AI Humanizer', NULL, 'AI Writing & Content Tools', 'stealthwriter.ai', NULL, 'stealthwriter', 72),
  ('GPTZero', 'AI Content Detector', NULL, 'AI Writing & Content Tools', 'gptzero.me', NULL, 'gptzero', 73),
  ('Phrasly.ai', 'AI Humanizer & Detector', NULL, 'AI Writing & Content Tools', 'phrasly.ai', NULL, 'phrasly-ai', 74),
  ('You.ai', 'AI Assistant', NULL, 'AI Writing & Content Tools', 'you.ai', NULL, 'you-ai', 75),
  ('Scite.ai', 'AI Research Assistant', NULL, 'AI Writing & Content Tools', 'scite.ai', NULL, 'scite-ai', 76),
  ('Creator.ai', 'AI Content Creator', NULL, 'AI Writing & Content Tools', 'creator.ai', NULL, 'creator-ai', 77),
  ('Canva Pro', 'Graphic Design Suite', NULL, 'Design, Stock Media & Video', 'canva.com', 'Best Seller', 'canva-pro', 78),
  ('Envato Elements', 'Stock Assets & Templates', NULL, 'Design, Stock Media & Video', 'envato.com', NULL, 'envato-elements', 79),
  ('Storyblocks', 'Stock Video & Audio', NULL, 'Design, Stock Media & Video', 'storyblocks.com', NULL, 'storyblocks', 80),
  ('Freepik', 'Stock Graphics & Vectors', NULL, 'Design, Stock Media & Video', 'freepik.com', NULL, 'freepik', 81),
  ('Vecteezy', 'Stock Vectors', NULL, 'Design, Stock Media & Video', 'vecteezy.com', NULL, 'vecteezy', 82),
  ('Motionary', 'Motion Graphics Assets', NULL, 'Design, Stock Media & Video', 'motionarray.com', NULL, 'motionary', 83),
  ('Renderforest', 'Video & Logo Maker', NULL, 'Design, Stock Media & Video', 'renderforest.com', NULL, 'renderforest', 84),
  ('Leonardo.ai', 'AI Image Generator', NULL, 'Design, Stock Media & Video', 'leonardo.ai', 'New', 'leonardo-ai', 85),
  ('iStock Downloader', 'Stock Photo Downloader', NULL, 'Design, Stock Media & Video', 'istockphoto.com', NULL, 'istock-downloader', 86),
  ('Epidemic Sound', 'Royalty-Free Music', NULL, 'Design, Stock Media & Video', 'epidemicsound.com', NULL, 'epidemic-sound', 87),
  ('Merch Informer', 'Merch Research Tool', NULL, 'Design, Stock Media & Video', 'merchinformer.com', NULL, 'merch-informer', 88),
  ('Hootsuite', 'Social Media Management', NULL, 'Design, Stock Media & Video', 'hootsuite.com', NULL, 'hootsuite', 89),
  ('Scribd', 'Documents & eBooks', NULL, 'Design, Stock Media & Video', 'scribd.com', NULL, 'scribd', 90),
  ('SimilarWeb', 'Website Traffic Analytics', NULL, 'Design, Stock Media & Video', 'similarweb.com', NULL, 'similarweb', 91),
  ('Placeit', 'Mockups & Templates', NULL, 'Design, Stock Media & Video', 'placeit.net', NULL, 'placeit', 92),
  ('Crello (VistaCreate)', 'Graphic Design Tool', NULL, 'Design, Stock Media & Video', 'vistacreate.com', NULL, 'crello-vistacreate', 93),
  ('PicMonkey', 'Photo Editing Tool', NULL, 'Design, Stock Media & Video', 'picmonkey.com', NULL, 'picmonkey', 94),
  ('Pixlr', 'Online Photo Editor', NULL, 'Design, Stock Media & Video', 'pixlr.com', NULL, 'pixlr', 95),
  ('Shutterstock Downloader', 'Stock Photo Downloader', NULL, 'Design, Stock Media & Video', 'shutterstock.com', NULL, 'shutterstock-downloader', 96),
  ('Fotojet', 'Photo Editor & Collage', NULL, 'Design, Stock Media & Video', 'fotojet.com', NULL, 'fotojet', 97),
  ('Unbounce', 'Landing Page Builder', NULL, 'Design, Stock Media & Video', 'unbounce.com', NULL, 'unbounce', 98),
  ('Slidebean', 'Pitch Deck Designer', NULL, 'Design, Stock Media & Video', 'slidebean.com', NULL, 'slidebean', 99),
  ('Snappa', 'Graphic Design Tool', NULL, 'Design, Stock Media & Video', 'snappa.com', NULL, 'snappa', 100),
  ('Adobe Stock', 'Stock Photos & Assets', NULL, 'Design, Stock Media & Video', 'adobe.com', NULL, 'adobe-stock', 101),
  ('Figma', 'UI/UX Design Tool', NULL, 'Design, Stock Media & Video', 'figma.com', NULL, 'figma', 102),
  ('Icons8', 'Icons & Design Assets', NULL, 'Design, Stock Media & Video', 'icons8.com', NULL, 'icons8', 103),
  ('Iconscout', 'Icons & Illustrations', NULL, 'Design, Stock Media & Video', 'iconscout.com', NULL, 'iconscout', 104),
  ('Toons.ai', 'AI Cartoon Generator', NULL, 'Design, Stock Media & Video', 'toons.ai', NULL, 'toons-ai', 105),
  ('Design Beast', 'Graphic Design Suite', NULL, 'Design, Stock Media & Video', 'designbeast.io', NULL, 'design-beast', 106),
  ('Everand', 'Books, Audiobooks & Docs', NULL, 'Design, Stock Media & Video', 'everand.com', NULL, 'everand', 107),
  ('HumanPal.ai', 'AI Text to Video', NULL, 'Design, Stock Media & Video', 'humanpal.ai', NULL, 'humanpal-ai', 108),
  ('Lovo.ai', 'AI Voiceover Generator', NULL, 'Design, Stock Media & Video', 'lovo.ai', NULL, 'lovo-ai', 109),
  ('InVideo Studio', 'Online Video Editor', NULL, 'Design, Stock Media & Video', 'invideo.io', NULL, 'invideo-studio', 110),
  ('Filmora', 'Video Editing Software', NULL, 'Design, Stock Media & Video', 'wondershare.com', NULL, 'filmora', 111),
  ('Veed.io', 'Online Video Editor', NULL, 'Design, Stock Media & Video', 'veed.io', NULL, 'veed-io', 112),
  ('CapCut Pro', 'Video Editing App', NULL, 'Design, Stock Media & Video', 'capcut.com', 'Hot', 'capcut-pro', 113),
  ('Buzzsumo', 'Content Research & Trends', NULL, 'Design, Stock Media & Video', 'buzzsumo.com', NULL, 'buzzsumo', 114),
  ('Article Builder', 'Automated Article Writer', NULL, 'Design, Stock Media & Video', 'articlebuilder.net', NULL, 'article-builder', 115),
  ('Text Writer', 'Content Writing Tool', NULL, 'Design, Stock Media & Video', NULL, NULL, 'text-writer', 116),
  ('Paperpal', 'Academic Writing Assistant', NULL, 'Design, Stock Media & Video', 'paperpal.com', NULL, 'paperpal', 117),
  ('Theme & Plugin Bundle', 'Premium WordPress Assets', NULL, 'Design, Stock Media & Video', NULL, NULL, 'theme-plugin-bundle', 118),
  ('Netflix', 'Streaming Subscription', NULL, 'Streaming & VPN', 'netflix.com', NULL, 'netflix', 119),
  ('Netflix HD', 'Streaming Subscription (HD)', NULL, 'Streaming & VPN', 'netflix.com', NULL, 'netflix-hd', 120),
  ('Prime Video', 'Streaming Subscription', NULL, 'Streaming & VPN', 'primevideo.com', NULL, 'prime-video', 121),
  ('Spotify', 'Music Streaming', NULL, 'Streaming & VPN', 'spotify.com', NULL, 'spotify', 122),
  ('NetMirror', 'Streaming Subscription', NULL, 'Streaming & VPN', 'netmirror.app', NULL, 'netmirror', 123),
  ('NordVPN', 'VPN & Security', NULL, 'Streaming & VPN', 'nordvpn.com', 'Best Seller', 'nordvpn', 124),
  ('Helium10', 'Amazon Product Research', NULL, 'E-commerce & Amazon Research', 'helium10.com', NULL, 'helium10', 125),
  ('JungleScout', 'Amazon Product Research', NULL, 'E-commerce & Amazon Research', 'junglescout.com', NULL, 'junglescout', 126),
  ('Udemy Business', 'Online Courses', NULL, 'Online Courses & Learning', 'udemy.com', NULL, 'udemy-business', 127),
  ('Coursera Plus', 'Online Courses & Certificates', NULL, 'Online Courses & Learning', 'coursera.org', NULL, 'coursera-plus', 128),
  ('Skillshare', 'Creative Online Classes', NULL, 'Online Courses & Learning', 'skillshare.com', NULL, 'skillshare', 129),
  ('LinkedIn Learning', 'Professional Courses', NULL, 'Online Courses & Learning', 'linkedin.com', NULL, 'linkedin-learning', 130)
on conflict (slug) do nothing;

-- ---------- Seed data: 5 bundle plans ----------
insert into bundles (bundle_id, icon, name, tag, description, price, price_usd, include_all, category_match, included_tools, sort_order) values
  ('all-in-one', '🚀', 'All In One', 'Best Value', 'All 130+ of our premium tools in a single bundle.', 2199, 15, true, NULL, NULL, 1),
  ('graphic', '🎨', 'Graphic Tools', NULL, 'Design & stock media tools like Canva, Freepik, and Envato.', 1399, 10, false, 'Design, Stock Media & Video', NULL, 2),
  ('seo', '🔍', 'SEO Tools', NULL, 'SEO & keyword research tools like Ahrefs and Semrush.', 699, 10, false, 'SEO & Keyword Research', NULL, 3),
  ('youtube', '▶️', 'YouTube Tools', NULL, 'YouTube growth & content creation tools like VidIQ.', 1599, 10, false, NULL, ARRAY['VidIQ Boost','CapCut Pro','InVideo Studio','Filmora','Veed.io','Epidemic Sound','Leonardo.ai','HumanPal.ai','Lovo.ai','Buzzsumo'], 4),
  ('amazon', '📦', 'Amazon Tools', NULL, 'Amazon research tools like Helium10 and JungleScout.', 1299, 10, false, NULL, ARRAY['Helium10','JungleScout','Sell The Trend','Niche Scraper','Smart Scout','Merch Informer'], 5)
on conflict (bundle_id) do nothing;

-- ---------- Seed data: site settings ----------
insert into settings (key, value) values
  ('whatsapp_number', '923096766688'),
  ('payment_method', 'NayaPay'),
  ('payment_number', '03000000000'),
  ('payment_holder', 'Account Holder Name'),
  ('price_monthly', '699'),
  ('price_half_yearly', '2499'),
  ('price_yearly', '3999'),
  ('price_monthly_usd', '5'),
  ('price_half_yearly_usd', '20'),
  ('price_yearly_usd', '30'),
  ('payment_method_usd', 'Binance'),
  ('payment_number_usd', ''),
  ('payment_holder_usd', ''),
  ('community_popup_title', 'Join Our WhatsApp Community'),
  ('community_popup_message', 'Get instant deal alerts, new tool drops, and priority support — straight from the team.'),
  ('community_popup_button', 'Join Now'),
  ('community_popup_later_text', 'Maybe later'),
  ('community_popup_delay', '4'),
  ('community_popup_frequency', 'once'),
  ('community_popup_enabled', 'true')
on conflict (key) do nothing;

-- ============================================================
-- Payment methods (admin-managed list, multiple per currency)
-- ============================================================
create table if not exists payment_methods (
  id uuid primary key default gen_random_uuid(),
  currency text not null,              -- 'PKR' | 'USD'
  payment_type text not null,          -- e.g. 'Binance', 'Bank', 'NayaPay'
  method_name text not null,
  account_id text not null,            -- UID / number / wallet address
  account_holder text,
  iban text,                           -- optional, for bank transfer
  active boolean default true,
  show_in_pakistan boolean not null default false,  -- USD method also shown to PKR (Pakistan) visitors
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table payment_methods enable row level security;

drop policy if exists "Public read active payment methods" on payment_methods;
drop policy if exists "Authenticated read all payment methods" on payment_methods;
drop policy if exists "Authenticated write payment methods" on payment_methods;
drop policy if exists "Authenticated update payment methods" on payment_methods;
drop policy if exists "Authenticated delete payment methods" on payment_methods;

create policy "Public read active payment methods" on payment_methods for select using (active = true);
create policy "Authenticated read all payment methods" on payment_methods for select using (is_admin());
create policy "Authenticated write payment methods" on payment_methods for insert with check (is_admin());
create policy "Authenticated update payment methods" on payment_methods for update using (is_admin());
create policy "Authenticated delete payment methods" on payment_methods for delete using (is_admin());

insert into payment_methods (currency, payment_type, method_name, account_id, account_holder, sort_order)
select 'PKR', 'NayaPay', 'NayaPay', '03000000000', 'Account Holder Name', 1
where not exists (select 1 from payment_methods where currency = 'PKR');

insert into payment_methods (currency, payment_type, method_name, account_id, account_holder, sort_order)
select 'USD', 'Binance', 'Binance', '', '', 1
where not exists (select 1 from payment_methods where currency = 'USD');

-- ============================================================
-- Orders (auto-captured at checkout, also manually manageable)
-- ============================================================
create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  item_type text not null,             -- 'tool' | 'bundle'
  item_name text not null,
  plan_label text,                     -- Monthly/Half-Yearly/Yearly, or bundle name
  price numeric not null,
  currency text not null,
  payment_method text,                 -- method label chosen at checkout
  customer_name text,
  customer_contact text,
  transaction_id text,                 -- customer-entered transaction/reference ID
  screenshot_url text,                 -- public URL of the uploaded payment screenshot
  status text not null default 'pending',  -- 'pending' | 'confirmed' | 'cancelled'
  notes text,
  user_id uuid references auth.users(id),  -- lets a logged-in customer see their own order history
  created_at timestamptz default now()
);

alter table orders enable row level security;

drop policy if exists "Public can create orders" on orders;
drop policy if exists "Authenticated read orders" on orders;
drop policy if exists "Users read own orders" on orders;
drop policy if exists "Authenticated update orders" on orders;
drop policy if exists "Authenticated delete orders" on orders;

-- Anyone (including logged-out checkout visitors) can CREATE an order —
-- but only the authenticated admin can ever read/update/delete one.
-- This is intentionally asymmetric: it's the only table in this schema
-- where "public" does not also mean "publicly readable".
create policy "Public can create orders" on orders for insert with check (true);
create policy "Authenticated read orders" on orders for select using (is_admin());
create policy "Users read own orders" on orders for select using (auth.uid() = user_id);
create policy "Authenticated update orders" on orders for update using (is_admin());
create policy "Authenticated delete orders" on orders for delete using (is_admin());

-- Storage bucket for customer-uploaded payment screenshots. Public
-- bucket (unguessable random filenames) so both the checkout upload
-- and the admin panel's "View Screenshot" link work with a plain URL.
insert into storage.buckets (id, name, public)
values ('payment-screenshots', 'payment-screenshots', true)
on conflict (id) do nothing;

drop policy if exists "Public can upload payment screenshots" on storage.objects;
drop policy if exists "Public can view payment screenshots" on storage.objects;
create policy "Public can upload payment screenshots" on storage.objects
  for insert with check (bucket_id = 'payment-screenshots');
create policy "Public can view payment screenshots" on storage.objects
  for select using (bucket_id = 'payment-screenshots');

-- ============================================================
-- Guides ("How to Use" SEO articles, one per tool)
-- ============================================================
create table if not exists guides (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  tool_slug text,
  title text not null,
  meta_description text,
  focus_keyword text,
  icon text,
  excerpt text,
  content text not null,
  published boolean default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table guides enable row level security;

drop policy if exists "Public read guides" on guides;
create policy "Public read guides" on guides for select using (true);

drop policy if exists "Authenticated write guides" on guides;
drop policy if exists "Authenticated update guides" on guides;
drop policy if exists "Authenticated delete guides" on guides;
create policy "Authenticated write guides" on guides for insert with check (is_admin());
create policy "Authenticated update guides" on guides for update using (is_admin());
create policy "Authenticated delete guides" on guides for delete using (is_admin());

-- ---------- Seed data: 9 pilot "How to Use" guides (current best-seller/hot/new tools) ----------
insert into guides (slug, tool_slug, title, meta_description, focus_keyword, icon, excerpt, content, sort_order) values
  (
    'how-to-use-ahrefs',
    'ahrefs',
    'How to Use Ahrefs: A Beginner''s Guide to SEO That Actually Works',
    'Just got your Ahrefs account? This step-by-step guide shows you how to get real SEO results out of Site Explorer, Keywords Explorer, and Site Audit.',
    'how to use ahrefs',
    '📊',
    'Don''t let the Ahrefs dashboard intimidate you — every feature from Site Explorer to Site Audit is explained step by step right here.',
    'Ahrefs is one of the most powerful backlink and SEO research tools in the world — but if you''re logging in for the first time, the dashboard can feel a bit overwhelming. This guide walks you through exactly the steps pro SEOs follow every day.

## What You Get
- Full access to Site Explorer, Keywords Explorer, Site Audit, Content Explorer, and Rank Tracker — the same dashboard you''d get from Ahrefs'' official website.

When you order Ahrefs from us, you get an email + password that works directly on Ahrefs'' real login page (ahrefs.com). No extension to install — just log in and use the full suite, exactly like a personal subscription.

## How To Use It
- 1. Go to the login page, enter your email/password, and open the dashboard.
- 2. In Site Explorer, enter your own domain or a competitor''s — organic traffic, top pages, and backlink profile show up instantly.
- 3. Open Keywords Explorer and type a seed keyword (like "seo tools") — you''ll get search volume, keyword difficulty, and hundreds of related keyword ideas.
- 4. Run Site Audit on your website — broken links, slow pages, and missing meta tags get flagged instantly as technical issues.
- 5. Use Content Explorer to find top-performing content in your niche, and see which articles are pulling in the most backlinks/shares.

## Pro Tips
- Check your Rank Tracker every week to see which keywords are moving up or down.
- Drop a competitor''s domain into Site Explorer and try copying their best backlinks — it''s one of the fastest SEO wins out there.
- Use the "Questions" filter in Keywords Explorer — it surfaces low-competition, high-intent keyword ideas that are perfect for ranking content.
- Always fix the "Errors" tab in Site Audit first — these have the biggest impact on your rankings.

Use Ahrefs the right way and it turns months of guesswork into weeks. Ready to get started? Hit Buy Now below and get your Ahrefs access today.',
    1
  ),
  (
    'how-to-use-semrush',
    'semrush',
    'How to Use Semrush: A Beginner''s Guide to Getting Real SEO Results',
    'Got your Semrush account? This guide walks you through Keyword Research, Site Audit, and Competitor Analysis step by step — no confusion.',
    'how to use semrush',
    '🔍',
    'Don''t let the Semrush dashboard intimidate you — learn everything here step by step, from keyword research to competitor spying.',
    'Semrush is an all-in-one digital marketing suite that brings SEO, content, and competitor research into one place. If you''re logging in for the first time, this guide shows you exactly the path top marketers follow.

## What You Get
- Full dashboard access — Keyword Overview, Site Audit, Position Tracking, Domain Overview, and Content tools, exactly like a direct Semrush subscription.

Access comes via email + password — log in directly at semrush.com, no browser extension or third-party tool needed.

## How To Use It
- 1. Right after logging in, enter your website''s URL in Domain Overview — you''ll get a quick snapshot of traffic, top keywords, and competitors.
- 2. Open Keyword Magic Tool and search a broad keyword (like "digital marketing") — you''ll get thousands of related keyword ideas with volume and difficulty.
- 3. Run Site Audit on your website so technical SEO errors — broken links, duplicate content, slow-loading pages — show up instantly.
- 4. Set up Position Tracking for your target keywords, so you know every week whether rankings are going up or down.
- 5. Drop a competitor''s domain into Domain Overview and see which keywords they''re ranking for that you''re missing — that "gap" can become your next content plan.

## Pro Tips
- Use the "Keyword Gap" tool to compare your site with 2-3 competitors — instant content opportunities show up.
- Try the SEO Content Template feature — it tells you how many words, headings, and keywords top-ranking pages are using.
- Generate a weekly "SEO Ideas" report — Semrush suggests what to improve on your site on its own.
- Running a local business? Be sure to explore Listing Management and Local SEO tools.

Use Semrush the right way and it kills the guesswork, replacing it with data-backed decisions. Click Buy Now below to get your Semrush access now.',
    2
  ),
  (
    'how-to-use-chatgpt-plus',
    'chatgpt-plus-gpt-4',
    'How to Use ChatGPT Plus (GPT-4) the Right Way: Prompts & Tips That Actually Work',
    'Got ChatGPT Plus? Learn practical prompts, tips, and features step by step to get the best results out of GPT-4.',
    'how to use chatgpt plus gpt-4',
    '🤖',
    'GPT-4 isn''t just a chatbot — use it right and it becomes your research assistant, writer, and brainstorming partner.',
    'ChatGPT Plus gives you access to advanced models like GPT-4 — but most people use it like a "search bar" and miss its real power. This guide shows you how professionals actually get work done with GPT-4.

## What You Get
- Login at ChatGPT.com with email + password — full Plus features: faster responses, image uploads, file analysis, custom instructions, and priority access during peak times.

This is a real Plus account, no limited/free-tier trick — the exact same thing you''d get subscribing yourself.

## How To Use It
- 1. Log in at chat.openai.com with the email/password you were given.
- 2. Set "Custom Instructions" in Settings — describe your work, tone, and audience so every answer is relevant from the start.
- 3. Before asking a complex question, break it into smaller parts — asking one thing at a time gets better results.
- 4. Always give context — the more detail you provide, the more accurate and useful the answer.
- 5. Upload an image or document via the paperclip icon — GPT-4 can read it and give you analysis, a summary, or feedback.

## Pro Tips
- Ask follow-up questions in the same conversation — GPT-4 remembers the context of earlier messages as long as the chat stays open.
- Writing long-form content? Ask for an outline first, then write it section by section — quality improves a lot.
- Try the "Act as a [role]" prompt style (like "act as a senior SEO consultant") — you''ll get more expert-level answers.
- Once you have a draft, refine it with a follow-up like "make this more concise/professional/friendly."

Learn to use GPT-4 the right way and it turns hours of work into minutes. Hit Buy Now below to get your ChatGPT Plus access today.',
    3
  ),
  (
    'how-to-use-claude-ai',
    'claude-ai',
    'How to Use Claude AI: A Beginner''s Guide to Getting Real Work Done',
    'Got your Claude AI account? Learn the step-by-step way to get the best results from Claude for writing, research, and analysis.',
    'how to use claude ai',
    '🧠',
    'Claude isn''t just a chatbot — with the right prompts, it becomes your writing partner and research assistant.',
    'Claude.ai is known for its writing quality, long-document analysis, and thoughtful answers. If you''re logging in for the first time, this guide shows you step by step how to get the most out of it.

## What You Get
- Direct login at claude.ai with email + password — chat interface, file/document upload, Artifacts (live document/code preview), and memory-based custom instructions.

Access just like a real subscription — no extension or third-party wrapper, straight to the official Claude interface.

## How To Use It
- 1. Sign in at claude.ai with the email/password you were given.
- 2. Set your name, work, and tone in Settings — this makes every future conversation better.
- 3. Start with a small task — like "summarize this paragraph" or "draft this email" — so you get a feel for Claude''s style.
- 4. Upload long documents or PDFs and ask questions directly about them — Claude reads the whole thing and answers.
- 5. Avoid "one-word" prompts — the more context and detail you give, the more useful the answer.

## Pro Tips
- Break complex work into steps — ask for an outline first, then work through each section.
- Use the Artifacts feature when you need a live document, code snippet, or webpage draft that you can edit.
- Keep asking follow-up questions in the same conversation — Claude remembers the context of that chat.
- Remember: Claude doesn''t browse the internet in real time by default, and it doesn''t remember past chats in a new conversation — always give it the context it needs.

Use Claude the right way and writing, research, and analysis get a lot faster. Click Buy Now below to get your Claude AI access today.',
    4
  ),
  (
    'how-to-use-grammarly',
    'grammarly',
    'How to Use Grammarly Like a Pro: Tips Beyond the Green Squiggles',
    'Grammarly isn''t just for spell-checking — use tone adjustment, snippets, and advanced features to make your writing professional. Full guide here.',
    'how to use grammarly',
    '✍️',
    'Unlock Grammarly''s full potential — fixing red underlines alone isn''t enough.',
    'Grammarly is the world''s most popular writing assistant — but most people use it as just a spelling/grammar checker, when it actually hides powerful features like tone adjustment, clarity suggestions, and snippets.

## What You Get
- Full Grammarly Premium access — advanced grammar/clarity checks, tone detector, plagiarism checker, and browser + desktop app support.

Login is via email + password — sign in directly at grammarly.com or in the Grammarly desktop/browser app, exactly like a real Premium account.

## How To Use It
- 1. Log in at grammarly.com with the email/password you were given, or open Grammarly''s desktop/browser extension.
- 2. Write your draft first without interruption — take grammar-checking out of your head and just focus on the ideas.
- 3. Review Grammarly''s suggestions after you''re done writing — don''t blindly accept every suggestion, only take the ones that match your voice.
- 4. Check the Tone Detector — if your text sounds too harsh or too casual, try the "diplomatic" or "confident" tone.
- 5. Ignore Grammarly''s suggestions on quoted text or specific phrases where the original wording needs to stay unchanged.

## Pro Tips
- If you type the same message more than twice a week (like an email reply), turn it into a "Snippet" — insert it in one click.
- Don''t focus too much on the writing score — it''s just a number; clarity and tone are what actually matter.
- When Grammarly keeps flagging the same mistake, look up that grammar rule separately and learn it — fixing it yourself gets easier over time.
- Pay extra attention to clarity suggestions when writing long-form content (blogs, emails, reports) — they improve readability the most.

Don''t think of Grammarly as just a spell-checker — used right, it makes your writing genuinely professional. Hit Buy Now below to get your Grammarly Premium access today.',
    5
  ),
  (
    'how-to-use-canva-pro',
    'canva-pro',
    'How to Use Canva Pro: Complete Beginner''s Guide to Pro-Level Designs',
    'Got Canva Pro? Learn step by step how to create professional designs using templates, Brand Kit, Background Remover, and Magic tools.',
    'how to use canva pro',
    '🎨',
    'Create social posts, logos, and presentations in minutes with Canva Pro''s premium tools — no design skill required.',
    'Canva Pro makes graphic design easy for everyone — whether you need a social media post, a logo, or a full presentation. This guide gives you a complete walkthrough, from the dashboard to advanced Pro features.

## What You Get
- Full Canva Pro access — premium templates, Brand Kit, Background Remover, Magic Insights, the entire stock photo/video library, and unlimited downloads.

Log in at Canva.com with email + password — exactly like a direct Pro subscription, no extra plugin needed.

## How To Use It
- 1. Sign in at canva.com with the email/password you were given.
- 2. Click "Create a design" and pick a category (Instagram post, presentation, logo, etc.) — thousands of templates show up instantly.
- 3. Select any template, click on the text, and change the content, font, and color.
- 4. Add icons, shapes, or graphics from the "Elements" tab, and replace images using Canva''s stock library or your own uploads.
- 5. Use the Background Remover tool to remove any photo''s background in one click.

## Pro Tips
- Set up your Brand Kit (logo, brand colors, fonts) — every new design will automatically stay on-brand.
- Try Magic Insights when you have raw data — Canva instantly turns it into a chart with an explanation.
- Save a design as a "template" once you''ve built it — future posts will be ready in minutes, just by swapping the text.
- Use the "Resize" feature for video/social content — instantly convert one design to Instagram, Facebook, and YouTube sizes.

Creating professional-level designs with Canva Pro no longer requires a design degree. Click Buy Now below to get your Canva Pro access today.',
    6
  ),
  (
    'how-to-use-leonardo-ai',
    'leonardo-ai',
    'How to Use Leonardo AI: Beginner''s Guide to Generating Stunning AI Images',
    'Learn to create professional-quality AI images with Leonardo AI — a complete step-by-step guide to prompts, models, and upscaling.',
    'how to use leonardo ai',
    '🖼️',
    'Turn text into stunning AI art — learn Leonardo AI''s models, prompts, and upscaling tricks here.',
    'Leonardo AI is perfect for anyone who wants to create professional-quality AI images without a design background — whether that''s product mockups, social media graphics, or concept art. This guide walks you through the whole process, from your first image to advanced editing.

## What You Get
- Full Leonardo AI dashboard access — Image Generator, multiple AI Models, AI Canvas (image editing), and upscaling tools.

Log in at leonardo.ai with email + password — the exact same access you''d get with a direct paid account.

## How To Use It
- 1. Log in at leonardo.ai with the email/password you were given.
- 2. Click "AI Tools > Image" on the dashboard, or the big Image icon — this opens the main image generator.
- 3. Write your prompt (the more detailed, the better the result) and hit "Generate" — four images get created at once.
- 4. Select your desired style from the Model dropdown — every model has its own unique look (realistic, anime, product photography, etc.).
- 5. Pick your best image and Upscale it so the resolution and detail are good enough for print or professional use.

## Pro Tips
- Mention subject, style, lighting, and mood in your prompt — the more detail, the more accurate the result.
- Use the negative prompt feature to remove unwanted elements (like extra fingers, blurry background) from the image.
- Try AI Canvas when you only need to change one part of an existing image — no need to regenerate the whole thing.
- Set your aspect ratio (1:1, 16:9, etc.) upfront, based on the platform you''re creating the image for.

Creating professional AI art with Leonardo AI now just comes down to one good prompt. Hit Buy Now below to get your Leonardo AI access today.',
    7
  ),
  (
    'how-to-use-capcut-pro',
    'capcut-pro',
    'How to Use CapCut Pro: Beginner''s Guide to Editing Like a Pro',
    'Learn to edit Reels and TikTok videos at a professional level with CapCut Pro — a complete guide from trimming to effects.',
    'how to use capcut pro',
    '🎬',
    'Create professional-level Reels and TikToks right from your phone — learn CapCut Pro''s complete workflow here.',
    'CapCut Pro has become the favorite editing tool for content creators and social media marketers — powerful features on both mobile and desktop. This guide teaches you everything from basic trimming to Pro-only effects.

## What You Get
- Full CapCut Pro access — premium templates, effects, fonts, transitions, and watermark-free exports.

Log in via email + password in the CapCut app or website — exactly like a direct Pro subscription.

## How To Use It
- 1. Open the CapCut app (or visit capcut.com) and log in with the email/password you were given.
- 2. Tap "New Project" and select the videos/photos you want to edit.
- 3. Tap any clip in the timeline — editing options like text, elements, animations, and filters open up.
- 4. Trim/split clips to keep the pacing tight, and add transitions for a smooth flow.
- 5. Add background music or sound effects, and generate auto-captions so the video makes sense even without sound.

## Pro Tips
- Use Pro templates when you''re short on time — just drop in your clips and the template handles the rest of the editing.
- Always manually review auto-captions afterward — AI sometimes mishears words.
- Use the same font/color preset in every video for a consistent look — it makes your brand recognizable.
- Always preview full-screen before exporting — small mistakes (like overlapping text) get caught right there.

With CapCut Pro, your phone becomes your entire editing studio. Click Buy Now below to get your CapCut Pro access today.',
    8
  ),
  (
    'how-to-use-nordvpn',
    'nordvpn',
    'How to Use NordVPN: Step-by-Step Setup Guide for Beginners',
    'Got your NordVPN account? From installing the app to connecting securely — the complete step-by-step setup guide is here.',
    'how to use nordvpn',
    '🛡️',
    'Secure your privacy in just 2 minutes — the complete way to install and connect NordVPN is here.',
    'NordVPN upgrades your online privacy and security in a matter of seconds — but if you''re using it for the first time, this guide walks you through the whole setup process step by step.

## What You Get
- A full NordVPN account — apps for Windows, macOS, iOS, Android, and Linux, plus extra security features like Threat Protection (ads/malware blocker).

Login is via email + password, right inside the NordVPN app — the same thing you''d get with a personal paid subscription.

## How To Use It
- 1. Install the NordVPN app on your device (phone/laptop) — available on Windows, Mac, iOS, and Android.
- 2. Open the app and log in with the email/password you were given.
- 3. Hit "Quick Connect" or "Secure my connection" — the app uses AI to find and connect to the best/fastest server on its own.
- 4. Need a specific country''s server (for streaming, say)? Select that country''s dot on the map or type its name in the search bar.
- 5. Activate Threat Protection via the shield icon so ads, malware, and phishing sites get blocked automatically.

## Pro Tips
- One account connects up to 10 devices — keep your phone, laptop, and TV all secured at once.
- If a website is loading slowly, try a different server location — sometimes the nearest server isn''t the fastest.
- Set up NordVPN on your router so every device at home is automatically protected, without installing the app on each one.
- Never forget to connect when using public WiFi (cafes, airports) — that''s the riskiest place of all.

With NordVPN, securing your online privacy is literally a two-click job. Hit Buy Now below to get your NordVPN access today.',
    9
  )
on conflict (slug) do nothing;

-- Guides for the other 121 tools (every tool not covered above) live in
-- supabase/add-remaining-guides.sql — kept out of this file since it's
-- over 1,500 lines on its own. Run that file too on a fresh install.

-- ============================================================
-- Trust badges — the "Why Buy From Us" boxes on tool/bundle pages.
-- Admin-managed: toggle "active" to show/hide on the live site,
-- edit label/icon, or add new ones — no code changes needed.
-- ============================================================
create table if not exists trust_badges (
  id uuid primary key default gen_random_uuid(),
  icon text,
  label text not null,
  active boolean not null default true,
  sort_order int default 0,
  created_at timestamptz default now()
);

alter table trust_badges enable row level security;

drop policy if exists "Public read active trust badges" on trust_badges;
drop policy if exists "Authenticated read all trust badges" on trust_badges;
drop policy if exists "Authenticated write trust badges" on trust_badges;
drop policy if exists "Authenticated update trust badges" on trust_badges;
drop policy if exists "Authenticated delete trust badges" on trust_badges;

create policy "Public read active trust badges" on trust_badges for select using (active = true);
create policy "Authenticated read all trust badges" on trust_badges for select using (is_admin());
create policy "Authenticated write trust badges" on trust_badges for insert with check (is_admin());
create policy "Authenticated update trust badges" on trust_badges for update using (is_admin());
create policy "Authenticated delete trust badges" on trust_badges for delete using (is_admin());

insert into trust_badges (icon, label, sort_order)
select * from (values
  ('🛡️', '100% Working Warranty', 1),
  ('♾️', 'Unlimited Working 100%', 2),
  ('🧩', 'Extension Base Account', 3),
  ('📈', 'Tools Uptime 99%', 4),
  ('🔒', '100% Fast & Secure', 5),
  ('⚡', 'Instant Delivery After Payment', 6),
  ('💬', '24/7 WhatsApp Support', 7),
  ('✅', 'Real & Verified Access — No Fake Tools', 8)
) as seed(icon, label, sort_order)
where not exists (select 1 from trust_badges);
