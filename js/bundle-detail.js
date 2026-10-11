/* ==========================================================
   AYZ Software Agency — Bundle plan detail page
   Reads ?bundle=<id> and renders that bundle's hero, full
   included-tools grid, and links to the other bundle plans.
   ========================================================== */

document.addEventListener("DOMContentLoaded", initBundleDetail);

async function initBundleDetail() {
  await loadSiteData();

  const id = new URLSearchParams(window.location.search).get("bundle");
  const bundle = BUNDLES.find((b) => b.id === id);

  if (!bundle) {
    window.location.href = "index.html#plans";
    return;
  }

  renderBundleMeta(bundle);
  renderBundleBreadcrumb(bundle);
  renderBundleHero(bundle);
  renderIncludedTools(bundle);
  renderBundleFAQ(bundle);
  renderOtherPlans(bundle);
  renderTrustBadges();

  AOS && AOS.refreshHard && AOS.refreshHard();
}

function renderBundleMeta(bundle) {
  const title = `${bundle.name} Bundle — PKR ${bundle.price.toLocaleString()}/month | AYZ Software Agency`;
  const desc = `${bundle.desc} PKR ${bundle.price}/month — 100% genuine, instant delivery, 24/7 WhatsApp support.`;
  const url = `https://YOUR-DOMAIN.com/bundle-detail.html?bundle=${bundle.id}`;
  const image = "https://YOUR-DOMAIN.com/assets/images/logo.jpg";

  document.title = title;
  document.getElementById("pageTitle").textContent = title;

  const metaDesc = document.getElementById("metaDescription");
  if (metaDesc) metaDesc.setAttribute("content", desc);

  setBundleMeta("canonicalLink", "href", url);
  setBundleMeta("ogTitle", "content", title);
  setBundleMeta("ogDescription", "content", desc);
  setBundleMeta("ogImage", "content", image);
  setBundleMeta("ogUrl", "content", url);
  setBundleMeta("twitterTitle", "content", title);
  setBundleMeta("twitterDescription", "content", desc);
  setBundleMeta("twitterImage", "content", image);

  injectBundleSchema(bundle, url, desc);
}

function setBundleMeta(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

function injectBundleSchema(bundle, url, desc) {
  const existing = document.getElementById("productSchema");
  if (existing) existing.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": `${bundle.name} Bundle`,
    "description": desc,
    "category": "SEO & Marketing Tool Bundle",
    "brand": { "@type": "Brand", "name": "AYZ Software Agency" },
    "offers": {
      "@type": "Offer",
      "url": url,
      "priceCurrency": "PKR",
      "price": String(bundle.price),
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": "AYZ Software Agency" }
    }
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "productSchema";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/* Visible breadcrumb (Home / Plans / Bundle) + matching BreadcrumbList
   schema — mirrors js/tool-detail.js's renderBreadcrumb(). */
function renderBundleBreadcrumb(bundle) {
  const nav = document.getElementById("breadcrumbNav");
  if (!nav) return;

  const base = "https://YOUR-DOMAIN.com/";
  const crumbs = [
    { name: "Home", href: "index.html#home", url: base },
    { name: "Plans", href: "index.html#plans", url: `${base}index.html#plans` },
    { name: bundle.name, href: null, url: `${base}bundle-detail.html?bundle=${bundle.id}` }
  ];

  nav.innerHTML = crumbs.map((c, i) => {
    const sep = i > 0 ? `<span class="breadcrumb-sep">/</span>` : "";
    const item = c.href
      ? `<a href="${c.href}">${c.name}</a>`
      : `<span class="breadcrumb-current">${c.name}</span>`;
    return sep + item;
  }).join("");

  const existing = document.getElementById("breadcrumbSchema");
  if (existing) existing.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    "itemListElement": crumbs.map((c, i) => ({
      "@type": "ListItem",
      "position": i + 1,
      "name": c.name,
      "item": c.url
    }))
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "breadcrumbSchema";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

function renderBundleHero(bundle) {
  document.getElementById("bundleIcon").textContent = bundle.icon;
  document.getElementById("bundleName").textContent = bundle.name;
  document.getElementById("bundleDesc").textContent = bundle.desc;
  document.getElementById("bundlePrice").innerHTML =
    `<span class="bundle-currency">${CURRENCY_SYMBOL}</span>${bundlePrice(bundle).toLocaleString()}<span class="bundle-per">/month</span>`;

  const badgeEl = document.getElementById("bundleBadge");
  if (bundle.tag) {
    badgeEl.textContent = bundle.tag;
    badgeEl.hidden = false;
  }

  document.getElementById("trustMini").innerHTML = [
    "100% Working Warranty",
    "Instant Delivery",
    "24/7 Support"
  ].map((t) => `<span>✅ ${t}</span>`).join("");

  document.getElementById("bundleBuyBtn").addEventListener("click", () => openBundleCheckout(bundle));
}

function renderIncludedTools(bundle) {
  const tools = bundleIncludedToolObjects(bundle);
  document.getElementById("includedCount").textContent = tools.length;
  document.getElementById("includedGrid").innerHTML = tools.map((t, i) => toolPreviewHTML(t, i)).join("");
}

/* Same buying/service questions every bundle shares (genuine account,
   delivery speed, warranty, payment) plus one bundle-specific question
   listing what's actually included — mirrors js/tool-detail.js's
   renderFAQ(), also injects FAQPage schema. */
function renderBundleFAQ(bundle) {
  const list = document.getElementById("bundleFaqList");
  if (!list) return;

  const tools = bundleIncludedToolObjects(bundle);
  const sampleNames = tools.slice(0, 3).map((t) => t.name);
  const namesText = sampleNames.length > 1
    ? sampleNames.slice(0, -1).join(", ") + " and " + sampleNames[sampleNames.length - 1]
    : (sampleNames[0] || "");

  const includedAnswer = tools.length
    ? `You get ${tools.length} premium tools for one monthly price${namesText ? ` — including ${namesText}, and more` : ""}. See the full list above.`
    : "Message us on WhatsApp and we'll confirm exactly what's included in this plan.";

  const faqs = [
    { q: `What's included in the ${bundle.name} bundle?`, a: includedAnswer },
    { q: "Is this a genuine bundle, not shared or cracked accounts?", a: "Yes — every tool in this bundle is 100% genuine and fully working, never a cracked or fake version. You get real, verified access." },
    { q: "How fast will I get access after payment?", a: "Access is delivered instantly after your payment is confirmed — most orders are activated within minutes over WhatsApp." },
    { q: "What if a tool in this bundle stops working?", a: "You're covered by our 100% working warranty. Just message us on WhatsApp 24/7 and we'll fix it or replace your access at no extra cost." },
    { q: "Can I pay in PKR or USD?", a: "Yes — pricing automatically shows in PKR for Pakistan or USD for international visitors, and we accept multiple payment methods at checkout." }
  ];

  list.innerHTML = faqs.map((item, i) => `
    <details class="faq-item" data-aos="fade-up" data-aos-delay="${i * 60}">
      <summary class="faq-question">
        <span>${item.q}</span>
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6"/></svg>
      </summary>
      <div class="faq-answer"><p>${item.a}</p></div>
    </details>
  `).join("");

  const existingSchema = document.getElementById("faqSchema");
  if (existingSchema) existingSchema.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    "mainEntity": faqs.map((item) => ({
      "@type": "Question",
      "name": item.q,
      "acceptedAnswer": { "@type": "Answer", "text": item.a }
    }))
  };
  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "faqSchema";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/* A stripped-down tool card for "what's included" grids — image + name +
   category only, no Buy Now / Get More Details (those tools aren't
   purchased individually here, they're part of this bundle). */
function toolPreviewHTML(tool, i) {
  const delay = (i % 4) * 100;
  return `
    <article class="tool-card tool-card-preview" data-aos="fade-up" data-aos-delay="${delay}">
      <div class="tool-media">
        ${tool.badge ? `<span class="tool-badge">${tool.badge}</span>` : ""}
        <img src="${tool.image}" alt="${tool.name} - ${tool.style}" loading="lazy"
             data-domain="${tool.domain || ""}" data-name="${encodeURIComponent(tool.name)}" data-step="0"
             onerror="handleImgError(this)" />
      </div>
      <div class="tool-body">
        <h3 class="tool-name">${tool.name}</h3>
        <p class="tool-style">${tool.style}</p>
      </div>
    </article>
  `;
}

function renderOtherPlans(current) {
  const grid = document.getElementById("otherPlansGrid");
  const others = BUNDLES.filter((b) => b.id !== current.id);

  grid.innerHTML = others.map((bundle, i) => `
    <a class="other-plan-card" href="bundle-detail.html?bundle=${bundle.id}" data-aos="fade-up" data-aos-delay="${i * 60}">
      <span class="other-plan-icon">${bundle.icon}</span>
      <span class="other-plan-name">${bundle.name}</span>
      <span class="other-plan-price">${CURRENCY_PREFIX}${bundlePrice(bundle).toLocaleString()}<em>/month</em></span>
      <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
    </a>
  `).join("");
}
