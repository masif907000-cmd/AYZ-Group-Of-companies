/* ==========================================================
   AYZ Software Agency — Tool category page
   Reads ?cat=<slug> (slugified category name, e.g. "seo-keyword-research")
   and lists every tool in that category. One template, every category —
   new categories added via the admin panel get a working page for free.
   ========================================================== */

document.addEventListener("DOMContentLoaded", async () => {
  initPreloader();
  initAOS();
  initCursorGlow();

  await loadSiteData();

  const catSlug = new URLSearchParams(window.location.search).get("cat");
  const category = TOOL_CATEGORIES.find((c) => slugify(c.category) === catSlug);

  if (!category) {
    window.location.href = "index.html#tools";
    return;
  }

  renderCategoryMeta(category);
  renderCategoryHero(category);
  renderCategoryTools(category);

  AOS && AOS.refreshHard && AOS.refreshHard();
});

/* ---------- Small shared page-chrome helpers (normally from script.js,
   duplicated here so this page doesn't have to load the whole homepage
   script and run its unrelated init — bundles, counters, marquee, etc.) ---------- */
function initPreloader() {
  const pre = document.getElementById("preloader");
  if (!pre) return;
  window.addEventListener("load", () => {
    setTimeout(() => pre.classList.add("hidden"), 400);
  });
}

function initAOS() {
  if (typeof AOS !== "undefined") {
    AOS.init({ duration: 800, once: true, offset: 60, easing: "ease-out-cubic" });
  }
}

function initCursorGlow() {
  const glow = document.getElementById("cursorGlow");
  if (!glow || window.matchMedia("(pointer: coarse)").matches) {
    if (glow) glow.style.display = "none";
    return;
  }
  window.addEventListener("mousemove", (e) => {
    glow.style.left = `${e.clientX}px`;
    glow.style.top = `${e.clientY}px`;
  });
}

/* ---------- Meta / SEO ---------- */
function renderCategoryMeta(category) {
  const title = `Buy ${category.category} Tools Online — Best Prices | AYZ Software Agency`;
  const desc = `Browse ${category.items.length}+ premium ${category.category} tools at unbeatable prices — 100% genuine, instant delivery, 24/7 WhatsApp support.`;
  const url = `https://YOUR-DOMAIN.com/category.html?cat=${slugify(category.category)}`;

  document.title = title;
  document.getElementById("pageTitle").textContent = title;

  const metaDesc = document.getElementById("metaDescription");
  if (metaDesc) metaDesc.setAttribute("content", desc);

  setMeta("canonicalLink", "href", url);
  setMeta("ogTitle", "content", title);
  setMeta("ogDescription", "content", desc);
  setMeta("ogUrl", "content", url);
  setMeta("twitterTitle", "content", title);
  setMeta("twitterDescription", "content", desc);

  injectCategorySchema(category, url, desc);
}

function setMeta(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

function injectCategorySchema(category, url, desc) {
  const schema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "name": `${category.category} Tools`,
    "description": desc,
    "url": url,
    "breadcrumb": {
      "@type": "BreadcrumbList",
      "itemListElement": [
        { "@type": "ListItem", "position": 1, "name": "Home", "item": "https://YOUR-DOMAIN.com/" },
        { "@type": "ListItem", "position": 2, "name": "Tools", "item": "https://YOUR-DOMAIN.com/index.html#tools" },
        { "@type": "ListItem", "position": 3, "name": category.category, "item": url }
      ]
    },
    "mainEntity": {
      "@type": "ItemList",
      "itemListElement": category.items.map((tool, i) => ({
        "@type": "ListItem",
        "position": i + 1,
        "url": `https://YOUR-DOMAIN.com/tool-detail.html?tool=${tool.slug}`
      }))
    }
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "categorySchema";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/* ---------- Breadcrumb (Home / Tools / Category) ---------- */
function renderCategoryBreadcrumb(category) {
  const nav = document.getElementById("breadcrumbNav");
  if (!nav) return;

  const crumbs = [
    { name: "Home", href: "index.html#home" },
    { name: "Tools", href: "index.html#tools" },
    { name: category.category, href: null }
  ];

  nav.innerHTML = crumbs.map((c, i) => {
    const sep = i > 0 ? `<span class="breadcrumb-sep">/</span>` : "";
    const item = c.href
      ? `<a href="${c.href}">${c.name}</a>`
      : `<span class="breadcrumb-current">${c.name}</span>`;
    return sep + item;
  }).join("");
}

/* ---------- Hero ---------- */
function renderCategoryHero(category) {
  renderCategoryBreadcrumb(category);
  document.getElementById("categoryTitle").textContent = category.category;
  document.getElementById("categoryCount").textContent = `${category.items.length}+ premium tools available`;

  const sampleNames = category.items.slice(0, 3).map((t) => t.name);
  const namesText = sampleNames.length > 1
    ? sampleNames.slice(0, -1).join(", ") + " and " + sampleNames[sampleNames.length - 1]
    : (sampleNames[0] || "");

  document.getElementById("categoryIntro").textContent =
    `Browse our full ${category.category} collection${namesText ? ` — including ${namesText}` : ""} — all at unbeatable prices. Every account is 100% genuine, delivered instantly, with 24/7 WhatsApp support and a full working warranty.`;
}

/* ---------- Tools grid (mirrors js/script.js's toolCardHTML/handleImgError,
   kept local so this page doesn't pull in the whole homepage script) ---------- */
function renderCategoryTools(category) {
  const grid = document.getElementById("categoryToolsGrid");
  const empty = document.getElementById("categoryEmpty");

  if (!category.items.length) {
    grid.innerHTML = "";
    empty.hidden = false;
    return;
  }

  empty.hidden = true;
  grid.innerHTML = category.items.map((tool, i) => categoryToolCardHTML(tool, i)).join("");
}

function categoryToolCardHTML(tool, i) {
  const image = tool.image || logoUrl(tool.domain, tool.name);
  const slug = tool.slug || slugify(tool.name);
  const delay = (i % 4) * 100;
  const outOfStock = tool.is_live === false;

  let priceLabel = tool.price;
  if (!priceLabel) {
    const usd = CURRENCY === "USD";
    const base = Number(usd ? (tool.price_monthly_usd || SETTINGS.price_monthly_usd) : (tool.price_monthly || SETTINGS.price_monthly)) || 0;
    const offer = Number(usd ? tool.offer_monthly_usd : tool.offer_monthly) || 0;
    const shown = offer > 0 && offer < base ? offer : base;
    priceLabel = shown ? `${CURRENCY_PREFIX}${shown.toLocaleString()} / month` : "";
  }

  return `
    <article class="tool-card ${outOfStock ? "tool-card-oos" : ""}" data-aos="fade-up" data-aos-delay="${delay}">
      <div class="tool-media">
        ${outOfStock ? `<span class="tool-badge tool-badge-oos">Out of Stock</span>` : (tool.badge ? `<span class="tool-badge">${tool.badge}</span>` : "")}
        <img src="${image}" alt="${tool.name} - ${tool.style}" loading="lazy"
             data-domain="${tool.domain || ""}" data-name="${encodeURIComponent(tool.name)}" data-step="0"
             onerror="categoryHandleImgError(this)" />
      </div>
      <div class="tool-body">
        <h3 class="tool-name">${tool.name}</h3>
        <p class="tool-style">${tool.style}</p>
        ${priceLabel && !tool.price_hidden ? `<p class="tool-price">${priceLabel}</p>` : ""}
        <a class="btn btn-primary tool-details-cta" href="tool-detail.html?tool=${slug}">
          ${outOfStock ? "View Details" : "Get More Details"}
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </div>
    </article>
  `;
}

/* Same fallback chain as js/script.js's handleImgError — kept as a
   separately-named function since this page doesn't load script.js. */
function categoryHandleImgError(img) {
  const domain = img.dataset.domain;
  const name = decodeURIComponent(img.dataset.name || "Tool");
  const step = parseInt(img.dataset.step || "0", 10);

  const sources = [
    ...(domain ? [
      `https://logo.clearbit.com/${domain}?size=300`,
      `https://unavatar.io/${domain}`,
      `https://www.google.com/s2/favicons?domain=${domain}&sz=256`
    ] : []),
    `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&size=300&bold=true&background=random&color=fff&font-size=0.36`
  ];

  const next = step + 1;
  if (next < sources.length) {
    img.dataset.step = String(next);
    img.src = sources[next];
    if (next === sources.length - 1) {
      img.onerror = () => {
        img.onerror = null;
        img.src = PLACEHOLDER_IMG;
        img.classList.add("img-fallback");
      };
    }
  } else {
    img.onerror = null;
    img.src = PLACEHOLDER_IMG;
    img.classList.add("img-fallback");
  }
}
