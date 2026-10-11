# AYZ Software Agency - Live Site

Static frontend (HTML/CSS/JS) + Supabase backend. Deploy as a static site (Netlify, etc.).

## Setup
1. Create a new Supabase project (supabase.com).
2. SQL Editor: run `supabase/schema.sql`, then the `supabase/add-*.sql` files, then `guides-seed.sql` / `update-to-english.sql` if wanted.
3. Put your Project URL and anon key in `js/tools-data.js` (lines 17-18).
4. Also replace `YOUR-PROJECT-ID` in the `<link rel="preconnect">` tags of the HTML pages.
5. Authentication > Users: create your admin user, then in table `profiles` set `role = 'admin'`.
6. Admin panel: `/admin.html`.

## Replace placeholders
- `YOUR-DOMAIN.com` (canonical URLs, sitemap.xml, robots.txt, email)
- WhatsApp number `920000000000`, Facebook link `facebook.com/YOUR-PAGE`
- `assets/images/logo.jpg` and `favicon.svg`
- Payment methods: Admin > Payment Methods