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
create policy "Authenticated write guides" on guides for insert with check (auth.role() = 'authenticated');
create policy "Authenticated update guides" on guides for update using (auth.role() = 'authenticated');
create policy "Authenticated delete guides" on guides for delete using (auth.role() = 'authenticated');

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
