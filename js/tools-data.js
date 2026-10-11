/*
  TOOLS DATA — now loaded live from Supabase instead of being hardcoded.
  Use the admin panel (admin.html) to add/edit/delete tools, bundles,
  and site settings — changes appear on the live site immediately for
  every visitor (no code edits needed).

  Everything downstream (script.js, tool-detail.js, bundle-detail.js,
  header.js) still reads the same global shapes as before:
    TOOL_CATEGORIES -> [{ category, items: [...] }]
    TOOLS            -> flat array of tool objects
    BUNDLES           -> array of bundle objects
    SETTINGS          -> { key: value } map (whatsapp number, payment info, plan prices)
  loadSiteData() is an async function that populates all four; every
  page's DOMContentLoaded handler awaits it before rendering anything.
*/

const SUPABASE_URL = "https://fneprvqnavhisjhierpd.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZuZXBydnFuYXZoaXNqaGllcnBkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTE3MDE4MzMsImV4cCI6MjEwNzI3NzgzM30.4OKDZsmDK4jW7bMTWKEO_epyNMno5yp5FuTTNsMpiEk";

let sb = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

const PLACEHOLDER_IMG = "assets/images/placeholder-tool.svg";

/* ---------- Site colour theme (admin-controlled accent colour) ----------
   The whole site is styled through CSS variables (css/style.css). Picking an
   accent colour in Admin -> Settings generates a matching set of variables
   (accent shades + tinted backgrounds) and injects them as an override. The
   last applied colour is cached so pages don't flash gold before it loads. */
const DEFAULT_ACCENT = "#d4af37";
const SITE_ACCENT = { r: 212, g: 175, b: 55, lr: 242, lg: 201, lb: 76 };

function _hexToHsl(hex) {
  const n = parseInt(hex.slice(1), 16);
  const r = (n >> 16) / 255, g = ((n >> 8) & 255) / 255, b = (n & 255) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0;
  const l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    if (max === r) h = (g - b) / d + (g < b ? 6 : 0);
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
  }
  return { h, s: s * 100, l: l * 100 };
}

function _hslToRgb(h, s, l) {
  h = ((h % 360) + 360) % 360; s = Math.max(0, Math.min(100, s)) / 100; l = Math.max(0, Math.min(100, l)) / 100;
  const k = (n) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)];
}

function _hslHex(h, s, l) {
  return "#" + _hslToRgb(h, s, l).map((v) => v.toString(16).padStart(2, "0")).join("");
}

function applySiteTheme(hex, opts) {
  const cache = !!(opts && opts.cache);
  const valid = /^#[0-9a-f]{6}$/i.test(hex || "") && hex.toLowerCase() !== DEFAULT_ACCENT;
  let el = document.getElementById("siteThemeOverride");
  const meta = document.querySelector('meta[name="theme-color"]');

  try {
    if (cache) {
      if (valid) localStorage.setItem("siteAccent", hex.toLowerCase());
      else localStorage.removeItem("siteAccent");
    }
  } catch (e) { /* storage unavailable */ }

  if (!valid) {
    if (el) el.remove();
    Object.assign(SITE_ACCENT, { r: 212, g: 175, b: 55, lr: 242, lg: 201, lb: 76 });
    if (meta) meta.setAttribute("content", "#0a0908");
    return;
  }

  const { h, s: s0, l: l0 } = _hexToHsl(hex);
  const s = Math.max(s0, 45);
  const mid = _hslToRgb(h, s, l0);
  const dark = _hslToRgb(h, s, l0 - 12);
  const light = _hslToRgb(h, s, l0 + 10);
  const acc2 = _hslToRgb(h + 12, s, l0);
  const pink = _hslToRgb(h + 22, s * 0.8, l0 + 6);
  const hexOf = (rgb) => "#" + rgb.map((v) => v.toString(16).padStart(2, "0")).join("");

  const lin = (v) => { v /= 255; return v <= 0.03928 ? v / 12.92 : Math.pow((v + 0.055) / 1.055, 2.4); };
  const lum = 0.2126 * lin(mid[0]) + 0.7152 * lin(mid[1]) + 0.0722 * lin(mid[2]);
  const onAccent = lum > 0.35 ? "#1a1206" : "#ffffff";

  const bs = Math.max(10, Math.min(28, s * 0.3));
  const css = `
:root {
  --accent-rgb: ${mid.join(",")};
  --accent-dark-rgb: ${dark.join(",")};
  --accent-light-rgb: ${light.join(",")};
  --accent-2-rgb: ${acc2.join(",")};
  --accent-2: ${hexOf(acc2)};
  --on-accent: ${onAccent};
  --neon-purple: ${hexOf(dark)};
  --neon-blue: ${hexOf(light)};
  --neon-cyan: ${hexOf(mid)};
  --neon-pink: ${hexOf(pink)};
  --gradient-1: linear-gradient(135deg, ${hexOf(dark)}, ${hexOf(mid)} 55%, ${hexOf(light)});
  --gradient-2: linear-gradient(135deg, ${hexOf(acc2)}, ${hexOf(dark)});
  --bg: ${_hslHex(h, bs, 4)};
  --bg-alt: ${_hslHex(h, bs, 6)};
  --surface: ${_hslHex(h, bs, 9)};
  --surface-2: ${_hslHex(h, bs, 12)};
  --text: ${_hslHex(h, 30, 94)};
  --text-dim: ${_hslHex(h, 12, 70)};
  --text-dimmer: ${_hslHex(h, 9, 52)};
  --header-bg: hsla(${Math.round(h)}, ${Math.round(bs)}%, 8%, 0.62);
}
:root[data-theme="light"] {
  --bg: ${_hslHex(h, 45, 97)};
  --bg-alt: ${_hslHex(h, 40, 94)};
  --surface: #ffffff;
  --surface-2: ${_hslHex(h, 40, 95)};
  --text: ${_hslHex(h, 30, 10)};
  --text-dim: ${_hslHex(h, 15, 36)};
  --text-dimmer: ${_hslHex(h, 10, 50)};
  --header-bg: rgba(255, 255, 255, 0.68);
}`;

  if (!el) {
    el = document.createElement("style");
    el.id = "siteThemeOverride";
    document.head.appendChild(el);
  }
  el.textContent = css;

  Object.assign(SITE_ACCENT, { r: mid[0], g: mid[1], b: mid[2], lr: light[0], lg: light[1], lb: light[2] });
  if (meta) meta.setAttribute("content", _hslHex(h, bs, 4));
}

try { applySiteTheme(localStorage.getItem("siteAccent")); } catch (e) { /* storage unavailable */ }

function logoUrl(domain, name) {
  if (domain) return `https://logo.clearbit.com/${domain}?size=300`;
  return `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=300&bold=true&background=random&color=fff&font-size=0.36`;
}

function slugify(name) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/* Uploads a customer's payment-proof screenshot to the public
   "payment-screenshots" storage bucket and returns its public URL.
   Returns null (never throws) if no file was chosen or the upload
   fails — a missing screenshot shouldn't block checkout, since the
   customer can still send it on WhatsApp and admin can chase it up. */
async function uploadPaymentScreenshot(file) {
  if (!file) return null;
  try {
    const ext = (file.name.split(".").pop() || "jpg").toLowerCase();
    const path = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { error } = await sb.storage.from("payment-screenshots").upload(path, file);
    if (error) {
      console.error("Screenshot upload failed:", error);
      return null;
    }
    const { data } = sb.storage.from("payment-screenshots").getPublicUrl(path);
    return data ? data.publicUrl : null;
  } catch (err) {
    console.error("Screenshot upload failed:", err);
    return null;
  }
}

let TOOL_CATEGORIES = [];
let TOOLS = [];
let BUNDLES = [];
let SETTINGS = {};
let GUIDES = [];
let PAYMENT_METHODS = [];
let TRUST_BADGES = [];

/* CURRENCY is "PKR" for Pakistani visitors, "USD" for everyone else,
   detected once via IP geolocation and cached in localStorage.
   CURRENCY_SYMBOL is for standalone badges ("PKR" / "$"), CURRENCY_PREFIX
   is for inline concatenation with correct spacing ("PKR " / "$"). */
let CURRENCY = "PKR";
let CURRENCY_SYMBOL = "PKR";
let CURRENCY_PREFIX = "PKR ";

async function detectCurrency() {
  /* Manual override — lets support/admin preview either currency
     via a link, e.g. ?currency=USD, without needing a VPN. Applies
     to this page load only — never cached, so it can't get "stuck"
     for a visitor's next normal visit. */
  const override = new URLSearchParams(window.location.search).get("currency");
  if (override === "PKR" || override === "USD") {
    setCurrency(override);
    return;
  }

  /* Always detect fresh from the visitor's current IP — no caching,
     so someone who travels (or tested via VPN) always sees the
     currency that matches where they actually are right now. */
  try {
    const res = await fetch("https://get.geojs.io/v1/ip/country.json");
    const data = await res.json();
    setCurrency(data.country === "PK" ? "PKR" : "USD");
  } catch (err) {
    setCurrency("PKR");
  }
}

function setCurrency(value) {
  CURRENCY = value;
  CURRENCY_SYMBOL = value === "USD" ? "$" : "PKR";
  CURRENCY_PREFIX = value === "USD" ? "$" : "PKR ";
}

/* Returns the right numeric bundle price for the detected currency. */
function bundlePrice(bundle) {
  return CURRENCY === "USD" ? bundle.priceUsd : bundle.price;
}

/* Payment methods the current visitor should be offered, in order. */
/* Pakistan visitors normally only see PKR methods, but an admin can flag
   an individual USD (international) method to also show there — e.g. a
   Payoneer/Binance option some Pakistani customers may prefer. Nothing
   changes for international visitors: they only ever see USD methods. */
function paymentMethodsForCurrency() {
  if (CURRENCY === "PKR") {
    return PAYMENT_METHODS.filter((m) => m.currency === "PKR" || (m.currency === "USD" && m.showInPakistan));
  }
  return PAYMENT_METHODS.filter((m) => m.currency === CURRENCY);
}

let _dataLoadPromise = null;

/* Fetches tools/bundles/settings/guides from Supabase and populates the
   globals above. Safe to call multiple times — the fetch only
   actually happens once. */
function loadSiteData() {
  if (_dataLoadPromise) return _dataLoadPromise;

  _dataLoadPromise = (async () => {
    const [toolsRes, bundlesRes, settingsRes, guidesRes, paymentMethodsRes, trustBadgesRes] = await Promise.all([
      sb.from("tools").select("*").order("sort_order", { ascending: true }),
      sb.from("bundles").select("*").order("sort_order", { ascending: true }),
      sb.from("settings").select("*"),
      sb.from("guides").select("*").eq("published", true).order("sort_order", { ascending: true }),
      sb.from("payment_methods").select("*").order("sort_order", { ascending: true }),
      sb.from("trust_badges").select("*").order("sort_order", { ascending: true }),
      detectCurrency()
    ]);

    if (toolsRes.error) console.error("Failed to load tools:", toolsRes.error);
    if (bundlesRes.error) console.error("Failed to load bundles:", bundlesRes.error);
    if (settingsRes.error) console.error("Failed to load settings:", settingsRes.error);
    if (guidesRes.error) console.error("Failed to load guides:", guidesRes.error);
    if (paymentMethodsRes.error) console.error("Failed to load payment methods:", paymentMethodsRes.error);
    if (trustBadgesRes.error) console.error("Failed to load trust badges:", trustBadgesRes.error);

    const rawTools = toolsRes.data || [];
    const rawBundles = bundlesRes.data || [];
    const rawSettings = settingsRes.data || [];
    const rawGuides = guidesRes.data || [];
    const rawPaymentMethods = paymentMethodsRes.data || [];
    const rawTrustBadges = trustBadgesRes.data || [];

    TOOLS = rawTools.map((t) => ({
      ...t,
      style: t.style || "",
      price: t.price || "",
      slug: t.slug || slugify(t.name),
      image: t.image || logoUrl(t.domain, t.name),
      extra_info: t.extra_info || ""
    }));

    const catMap = new Map();
    TOOLS.forEach((tool) => {
      if (!catMap.has(tool.category)) catMap.set(tool.category, []);
      catMap.get(tool.category).push(tool);
    });
    TOOL_CATEGORIES = Array.from(catMap.entries()).map(([category, items]) => ({ category, items }));

    BUNDLES = rawBundles.map((b) => ({
      id: b.bundle_id,
      dbId: b.id,
      icon: b.icon,
      name: b.name,
      tag: b.tag,
      desc: b.description,
      price: Number(b.price),
      priceUsd: Number(b.price_usd) || 0,
      includeAll: b.include_all,
      categoryMatch: b.category_match,
      includedTools: b.included_tools || []
    }));

    SETTINGS = {};
    rawSettings.forEach((row) => { SETTINGS[row.key] = row.value; });
    applySiteTheme(SETTINGS.site_accent_color, { cache: true });

    GUIDES = rawGuides.map((g) => ({
      id: g.id,
      slug: g.slug,
      toolSlug: g.tool_slug,
      title: g.title,
      metaDescription: g.meta_description || "",
      focusKeyword: g.focus_keyword || "",
      icon: g.icon || "📄",
      excerpt: g.excerpt || "",
      content: g.content,
      tool: TOOLS.find((t) => t.slug === g.tool_slug) || null
    }));

    PAYMENT_METHODS = rawPaymentMethods.map((m) => ({
      id: m.id,
      currency: m.currency,
      type: m.payment_type,
      name: m.method_name,
      accountId: m.account_id,
      accountHolder: m.account_holder || "",
      iban: m.iban || "",
      sortOrder: m.sort_order,
      showInPakistan: m.show_in_pakistan || false
    }));

    TRUST_BADGES = rawTrustBadges.map((b) => ({
      id: b.id,
      icon: b.icon || "✅",
      label: b.label
    }));

    maybeShowCommunityPopup();
  })();

  return _dataLoadPromise;
}

/* ---------- WhatsApp community popup (new visitors only) ----------
   Shown once ever per browser, a few seconds after the page settles,
   only when the admin has set a community link in Settings. Never
   shown on the admin panel itself. */
function maybeShowCommunityPopup() {
  const link = SETTINGS.whatsapp_community_link;
  if (!link) return;
  if (document.body.classList.contains("admin-body")) return;
  if (SETTINGS.community_popup_enabled === "false") return;
  if (SETTINGS.community_popup_frequency === "once" && localStorage.getItem("communityPopupSeen") === "true") return;

  const title = SETTINGS.community_popup_title || "Join Our WhatsApp Community";
  const message = SETTINGS.community_popup_message || "Get instant deal alerts, new tool drops, and priority support — straight from the team.";
  const btnText = SETTINGS.community_popup_button || "Join Now";
  const laterText = SETTINGS.community_popup_later_text || "Maybe later";
  const delaySec = parseFloat(SETTINGS.community_popup_delay);
  const delay = (isFinite(delaySec) && delaySec >= 0) ? delaySec * 1000 : 4000;

  setTimeout(() => {
    const overlay = document.createElement("div");
    overlay.className = "community-popup-overlay";
    overlay.innerHTML = `
      <div class="community-popup-card" role="dialog" aria-modal="true" aria-labelledby="communityPopupTitle">
        <button type="button" class="community-popup-close" aria-label="Close">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
        </button>
        <div class="community-popup-icon">
          <svg viewBox="0 0 24 24" width="26" height="26" fill="currentColor"><path d="M17.5 14.4c-.3-.1-1.7-.8-1.9-.9-.3-.1-.4-.1-.6.1-.2.3-.7.9-.8 1-.2.2-.3.2-.5.1-.3-.1-1.2-.4-2.3-1.4-.9-.8-1.4-1.7-1.6-2-.2-.3 0-.5.1-.6.1-.1.3-.3.4-.5.1-.1.2-.3.3-.5.1-.2 0-.4 0-.5C11 9 10.5 7.8 10.3 7.3c-.2-.5-.4-.4-.6-.4h-.5c-.2 0-.5.1-.7.3-.2.3-1 1-1 2.3 0 1.4 1 2.7 1.1 2.9.1.2 2 3.1 4.9 4.3.7.3 1.2.5 1.7.6.7.2 1.3.2 1.8.1.5-.1 1.7-.7 1.9-1.4.2-.7.2-1.2.2-1.4-.1-.1-.3-.2-.6-.3z"/><path d="M12 2C6.5 2 2 6.5 2 12c0 1.9.5 3.6 1.4 5.1L2 22l5.1-1.3c1.4.8 3.1 1.2 4.9 1.2 5.5 0 10-4.5 10-10S17.5 2 12 2zm0 18.2c-1.6 0-3.1-.4-4.4-1.2l-.3-.2-3.3.9.9-3.2-.2-.3c-.9-1.4-1.4-3-1.4-4.7 0-4.7 3.8-8.5 8.5-8.5s8.5 3.8 8.5 8.5-3.7 8.7-8.3 8.7z"/></svg>
        </div>
        <h3 id="communityPopupTitle">${title}</h3>
        <p>${message}</p>
        <a class="btn btn-whatsapp community-popup-join" href="${link}" target="_blank" rel="noopener">${btnText}</a>
        <button type="button" class="community-popup-later">${laterText}</button>
      </div>
    `;
    document.body.appendChild(overlay);
    requestAnimationFrame(() => overlay.classList.add("visible"));

    const dismiss = () => {
      if (SETTINGS.community_popup_frequency === "once") localStorage.setItem("communityPopupSeen", "true");
      overlay.classList.remove("visible");
      setTimeout(() => overlay.remove(), 300);
    };

    overlay.querySelector(".community-popup-close").addEventListener("click", dismiss);
    overlay.querySelector(".community-popup-later").addEventListener("click", dismiss);
    overlay.querySelector(".community-popup-join").addEventListener("click", dismiss);
    overlay.addEventListener("click", (e) => { if (e.target === overlay) dismiss(); });
  }, delay);
}

/* Renders TRUST_BADGES into the #trustGrid container present on
   tool-detail.html and bundle-detail.html. Call after loadSiteData().
   Pass a tool to filter to just its selected badges (tool.badge_ids);
   omit it (or pass a bundle) to always show every active badge —
   only tools get per-item badge selection, set from admin.html. */
function renderTrustBadges(tool) {
  const grid = document.getElementById("trustGrid");
  if (!grid) return;
  const badges = (tool && Array.isArray(tool.badge_ids))
    ? TRUST_BADGES.filter((b) => tool.badge_ids.includes(b.id))
    : TRUST_BADGES;
  grid.innerHTML = badges.map((b, i) => `
    <div class="trust-card" data-aos="fade-up" data-aos-delay="${i * 50}">
      <span class="trust-icon">${b.icon}</span>
      <p>${escapeHtmlGuide(b.label)}</p>
    </div>
  `).join("");
}

/* Turns a guide's lightweight markup into HTML:
   "## " lines become headings, "- " lines become grouped list items,
   blank-line-separated blocks become paragraphs. Keeps the admin
   panel's guide editor a plain textarea instead of needing a rich
   text editor. */
function renderGuideContent(raw) {
  if (!raw) return "";

  const blocks = raw.replace(/\r\n/g, "\n").split(/\n{2,}/);
  let html = "";
  let listBuffer = [];

  const flushList = () => {
    if (!listBuffer.length) return;
    html += `<ul>${listBuffer.map((li) => `<li>${li}</li>`).join("")}</ul>`;
    listBuffer = [];
  };

  blocks.forEach((block) => {
    const lines = block.split("\n").map((l) => l.trim()).filter(Boolean);

    lines.forEach((line) => {
      if (line.startsWith("## ")) {
        flushList();
        html += `<h2>${escapeHtmlGuide(line.slice(3))}</h2>`;
      } else if (line.startsWith("- ")) {
        listBuffer.push(escapeHtmlGuide(line.slice(2)));
      } else {
        flushList();
        html += `<p>${escapeHtmlGuide(line)}</p>`;
      }
    });

    flushList();
  });

  return html;
}

function escapeHtmlGuide(str) {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function bundleIncludedTools(bundle) {
  if (bundle.includeAll) return TOOLS.map((t) => t.name);
  if (bundle.categoryMatch) return TOOLS.filter((t) => t.category === bundle.categoryMatch).map((t) => t.name);
  return bundle.includedTools || [];
}

/* Same as bundleIncludedTools but returns the full TOOLS objects
   (image, slug, category, ...) so they can be rendered as real tool cards. */
function bundleIncludedToolObjects(bundle) {
  if (bundle.includeAll) return TOOLS;
  if (bundle.categoryMatch) return TOOLS.filter((t) => t.category === bundle.categoryMatch);
  const names = bundle.includedTools || [];
  return names.map((name) => TOOLS.find((t) => t.name === name)).filter(Boolean);
}
