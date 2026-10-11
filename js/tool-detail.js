/* ==========================================================
   AYZ Software Agency — Tool detail page
   Reads ?tool=<slug> and renders the matching tool's hero,
   pricing plans and related tools. One template, all 130 tools.
   ========================================================== */

let PRICING_PLANS = [];

let currentTool = null;
let selectedPlanIndex = null;

document.addEventListener("DOMContentLoaded", initToolDetail);

async function initToolDetail() {
  await loadSiteData();

  const slug = new URLSearchParams(window.location.search).get("tool");
  const tool = TOOLS.find((t) => t.slug === slug);

  if (!tool) {
    window.location.href = "index.html#tools";
    return;
  }

  currentTool = tool;

  const usd = CURRENCY === "USD";
  const sfx = usd ? "_usd" : "";
  const mkPlan = (label, duration, key, fallback, tag, avail) => {
    const regular = Number(tool["price_" + key + sfx] || SETTINGS["price_" + key + sfx] || fallback);
    const offer = Number(tool["offer_" + key + sfx]);
    const hasOffer = offer > 0 && offer < regular;
    return { label, duration, price: hasOffer ? offer : regular, originalPrice: hasOffer ? regular : null, tag, avail };
  };
  const plans = [
    mkPlan("Monthly", "1 Month", "monthly", usd ? 5 : 699, "", tool.available_1m !== false),
    mkPlan("Half-Yearly", "6 Months", "half_yearly", usd ? 20 : 2499, "Most Popular", tool.available_6m !== false),
    mkPlan("Yearly", "1 Year", "yearly", usd ? 30 : 3999, "Best Value", tool.available_1y !== false)
  ];
  PRICING_PLANS = plans.filter((p) => p.avail);
  if (!PRICING_PLANS.length) {
    // Safety net: if every duration was turned off, still show the monthly plan
    PRICING_PLANS = plans.filter((p) => p.label === "Monthly");
  }

  renderMeta(tool);
  renderBreadcrumb(tool);
  renderHero(tool);
  renderToolAbout(tool);
  renderPricing(tool);
  renderFAQ(tool);
  renderRelated(tool);
  renderTrustBadges(tool);
  initCheckoutModal();

  AOS && AOS.refreshHard && AOS.refreshHard();
}

function renderMeta(tool) {
  const title = `${tool.name} — Buy Premium Access | AYZ Software Agency`;
  const desc = `Buy ${tool.name} (${tool.style}) at the best price — 100% genuine, instant delivery, 24/7 WhatsApp support. Plans starting at PKR 699.`;
  const url = `https://YOUR-DOMAIN.com/tool-detail.html?tool=${tool.slug}`;

  document.title = title;
  document.getElementById("pageTitle").textContent = title;

  const metaDesc = document.getElementById("metaDescription");
  if (metaDesc) metaDesc.setAttribute("content", desc);

  setMeta("canonicalLink", "href", url);
  setMeta("ogTitle", "content", title);
  setMeta("ogDescription", "content", desc);
  setMeta("ogImage", "content", tool.image);
  setMeta("ogUrl", "content", url);
  setMeta("twitterTitle", "content", title);
  setMeta("twitterDescription", "content", desc);
  setMeta("twitterImage", "content", tool.image);

  injectProductSchema(tool, url, desc);
}

function setMeta(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

function injectProductSchema(tool, url, desc) {
  const existing = document.getElementById("productSchema");
  if (existing) existing.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Product",
    "name": tool.name,
    "description": desc,
    "image": tool.image,
    "category": tool.category,
    "brand": { "@type": "Brand", "name": "AYZ Software Agency" },
    ...(tool.price_hidden ? {} : { "offers": {
      "@type": "Offer",
      "url": url,
      "priceCurrency": "PKR",
      "price": String(tool.offer_monthly || tool.price_monthly || SETTINGS.price_monthly || 699),
      "availability": "https://schema.org/InStock",
      "seller": { "@type": "Organization", "name": "AYZ Software Agency" }
    } })
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "productSchema";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/* Visible breadcrumb (Home / Tools / Category / Tool) + matching
   BreadcrumbList schema — helps both internal linking and Google's
   breadcrumb rich results. */
function renderBreadcrumb(tool) {
  const nav = document.getElementById("breadcrumbNav");
  if (!nav) return;

  const base = "https://YOUR-DOMAIN.com/";
  const crumbs = [
    { name: "Home", href: "index.html#home", url: base },
    { name: "Tools", href: "index.html#tools", url: `${base}index.html#tools` },
    { name: tool.category, href: `category.html?cat=${slugify(tool.category)}`, url: `${base}category.html?cat=${slugify(tool.category)}` },
    { name: tool.name, href: null, url: `${base}tool-detail.html?tool=${tool.slug}` }
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

function renderHero(tool) {
  const img = document.getElementById("toolImage");
  img.src = tool.image;
  img.alt = `${tool.name} - ${tool.style}`;
  img.loading = "eager";
  img.dataset.domain = tool.domain || "";
  img.dataset.name = encodeURIComponent(tool.name);
  img.dataset.step = "0";
  img.onerror = () => handleImgError(img);

  const badgeEl = document.getElementById("toolBadge");
  if (tool.badge) {
    badgeEl.textContent = tool.badge;
    badgeEl.hidden = false;
  }

  const categoryLink = document.getElementById("toolCategory");
  categoryLink.textContent = tool.category;
  categoryLink.href = `category.html?cat=${slugify(tool.category)}`;
  document.getElementById("toolName").textContent = tool.name;
  document.getElementById("toolStyle").textContent = tool.style;

  document.getElementById("trustMini").innerHTML = [
    "100% Working Warranty",
    "Instant Delivery",
    "24/7 Support"
  ].map((t) => `<span>✅ ${t}</span>`).join("");

  const extraInfoEl = document.getElementById("toolExtraInfo");
  if (tool.extra_info && tool.extra_info.trim()) {
    extraInfoEl.textContent = tool.extra_info.trim();
    extraInfoEl.hidden = false;
  } else {
    extraInfoEl.hidden = true;
  }

  const buyBtn = document.getElementById("toolBuyBtn");
  if (tool.price_hidden && tool.is_live !== false) {
    buyBtn.textContent = "Contact on WhatsApp";
    buyBtn.addEventListener("click", () => window.open(toolWhatsAppLink(tool), "_blank", "noopener"));
  } else if (tool.is_live === false) {
    buyBtn.textContent = "Out of Stock";
    buyBtn.disabled = true;
    buyBtn.classList.add("btn-disabled");
  } else {
    // Hero button opens the checkout modal at Step 1 (plan not chosen yet)
    buyBtn.addEventListener("click", () => openCheckout(null));
  }
}

/* Pulls this tool's "How to Use" guide (if one exists) to give the page
   real unique text instead of the same trust-badge boilerplate every
   other tool page has — plus a link into the guide itself, so the two
   pages interlink instead of the guide being an orphan page. */
function renderToolAbout(tool) {
  const section = document.getElementById("toolAboutSection");
  const guide = GUIDES.find((g) => g.toolSlug === tool.slug);

  if (!guide || !guide.content) {
    section.hidden = true;
    return;
  }

  /* Guides use lightweight admin markup ("## " = heading, "- " = list
     item — see renderGuideContent() in tools-data.js), so skip past any
     of those to find the first genuine prose paragraph instead of
     showing raw "## Heading" text if a guide happens to open with one. */
  const blocks = guide.content.replace(/\r\n/g, "\n").split(/\n{2,}/).map((b) => b.trim());
  const introParagraph = blocks.find((b) => b && !b.startsWith("## ") && !b.startsWith("- ")) || guide.excerpt || "";
  document.getElementById("toolAboutText").textContent = introParagraph;

  if (!introParagraph) {
    section.hidden = true;
    return;
  }

  const linkEl = document.getElementById("toolGuideLink");
  linkEl.href = `guide-detail.html?guide=${guide.slug}`;
  document.getElementById("toolGuideLinkName").textContent = tool.name;
  linkEl.hidden = false;

  section.hidden = false;
}

function toolWhatsAppLink(tool) {
  const number = String(SETTINGS.whatsapp_number || WHATSAPP_NUMBER).replace(/\D/g, "");
  const message = encodeURIComponent(`Hi, I want more details about ${tool.name}.`);
  return `https://wa.me/${number}?text=${message}`;
}

function renderPricing(tool) {
  const grid = document.getElementById("pricingGrid");

  if (tool.price_hidden && tool.is_live !== false) {
    const head = document.querySelector(".pricing-section .section-head");
    if (head) head.hidden = true;
    grid.innerHTML = `
      <div class="pricing-contact-notice">
        <h3>Price &amp; Plans</h3>
        <p>For more details, contact us on WhatsApp.</p>
        <a class="btn btn-whatsapp btn-lg" href="${toolWhatsAppLink(tool)}" target="_blank" rel="noopener">Contact on WhatsApp</a>
      </div>
    `;
    return;
  }

  if (tool.is_live === false) {
    grid.innerHTML = `
      <div class="pricing-oos-notice">
        <span class="pricing-oos-icon">⛔</span>
        <h3>Currently Out of Stock</h3>
        <p>${tool.name} is temporarily unavailable. Check back soon, or explore similar tools below.</p>
      </div>
    `;
    return;
  }

  const desc = document.querySelector(".pricing-section .section-desc");
  if (desc && CURRENCY === "USD" && !desc.dataset.usdNoteAdded) {
    desc.textContent += " Prices shown in USD for international customers.";
    desc.dataset.usdNoteAdded = "true";
  }

  grid.innerHTML = PRICING_PLANS.map((plan, i) => `
    <div class="price-card ${plan.tag ? "featured" : ""}" data-aos="fade-up" data-aos-delay="${i * 100}">
      ${plan.tag ? `<span class="price-tag">${plan.tag}</span>` : ""}
      <p class="price-label">${plan.label}</p>
      <p class="price-amount">
        ${plan.originalPrice ? `<span class="price-original">${CURRENCY_SYMBOL}${plan.originalPrice.toLocaleString()}</span>` : ""}
        <span class="price-currency">${CURRENCY_SYMBOL}</span>${plan.price.toLocaleString()}
      </p>
      ${plan.originalPrice ? `<span class="price-offer-badge">Offer</span>` : ""}
      <p class="price-duration">per ${plan.duration}</p>
      <ul class="price-features">
        <li>Full ${tool.name} Access</li>
        <li>100% Working Warranty</li>
        <li>Instant Delivery</li>
        <li>24/7 WhatsApp Support</li>
      </ul>
      <button type="button" class="btn btn-primary choose-plan-btn" data-plan-index="${i}">
        Choose Plan
        <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </button>
    </div>
  `).join("");

  // A plan card's own Buy Now button skips straight to Step 2 (payment) with that plan pre-selected
  grid.querySelectorAll("[data-plan-index]").forEach((btn) => {
    btn.addEventListener("click", () => openCheckout(parseInt(btn.dataset.planIndex, 10)));
  });
}

/* FAQ: a couple of tool-specific questions (reusing the guide excerpt so
   nothing here is invented) plus the same buying/service questions every
   tool shares — genuine account, delivery speed, warranty. Also injects
   FAQPage schema so these can surface as rich results in Google. */
function renderFAQ(tool) {
  const section = document.getElementById("faqSection");
  const list = document.getElementById("faqList");
  const guide = GUIDES.find((g) => g.toolSlug === tool.slug);

  const faqs = [];
  if (guide && guide.excerpt) {
    faqs.push({ q: `What is ${tool.name} used for?`, a: guide.excerpt });
  }
  faqs.push(
    { q: `Is this a genuine ${tool.name} account?`, a: `Yes — every ${tool.name} plan we provide is 100% genuine and fully working, never a cracked or fake version. You get real, verified access.` },
    { q: "How fast will I get access after payment?", a: "Access is delivered instantly after your payment is confirmed — most orders are activated within minutes over WhatsApp." },
    { q: `What if ${tool.name} stops working or I face an issue?`, a: "You're covered by our 100% working warranty. Just message us on WhatsApp 24/7 and we'll fix it or replace your access at no extra cost." },
    { q: "Can I pay in PKR or USD?", a: "Yes — pricing automatically shows in PKR for Pakistan or USD for international visitors, and we accept multiple payment methods at checkout." }
  );

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

  section.hidden = false;
}

function renderRelated(tool) {
  const section = document.getElementById("relatedSection");
  const grid = document.getElementById("relatedGrid");
  const nameEl = document.getElementById("relatedCategoryName");

  const related = TOOLS.filter((t) => t.category === tool.category && t.slug !== tool.slug).slice(0, 4);

  if (!related.length) {
    section.hidden = true;
    return;
  }

  nameEl.textContent = tool.category;
  grid.innerHTML = related.map((t, i) => toolCardHTML(t, i)).join("");
}

/* ==========================================================
   Checkout modal: Select Plan -> Payment -> WhatsApp screenshot
   ========================================================== */
function initCheckoutModal() {
  const modal = document.getElementById("checkoutModal");
  if (!modal) return;

  renderCheckoutPlans();
  renderPaymentMethods("tool");

  modal.querySelectorAll("[data-checkout-close]").forEach((el) => {
    el.addEventListener("click", closeCheckout);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeCheckout();
  });

  document.getElementById("checkoutStep1Continue").addEventListener("click", () => {
    if (selectedPlanIndex === null) return;
    goToCheckoutStep(2);
  });

  document.querySelectorAll('[data-checkout-back="1"]').forEach((btn) => {
    btn.addEventListener("click", () => goToCheckoutStep(1));
  });

  document.getElementById("checkoutStep2Continue").addEventListener("click", async () => {
    const details = validateCustomerDetails("toolCheckoutFormError");
    if (!details) return;

    const btn = document.getElementById("checkoutStep2Continue");
    const originalText = btn.textContent;
    const fileInput = document.getElementById("toolPaymentScreenshot");
    const file = fileInput && fileInput.files[0];

    btn.disabled = true;
    if (file) btn.textContent = "Uploading screenshot...";

    const screenshotUrl = await uploadPaymentScreenshot(file);
    const transactionId = document.getElementById("toolTransactionId").value.trim();

    await createOrder({
      itemType: "tool",
      itemName: currentTool.name,
      planLabel: PRICING_PLANS[selectedPlanIndex].label,
      price: PRICING_PLANS[selectedPlanIndex].price,
      name: details.name,
      contact: details.contact,
      transactionId,
      screenshotUrl
    });

    btn.disabled = false;
    btn.textContent = originalText;

    goToCheckoutStep(3);
  });

  const copyBtn = document.getElementById("toolCopyBtn");
  copyBtn.addEventListener("click", () => {
    const number = copyBtn.dataset.copy;
    const done = () => {
      const original = copyBtn.innerHTML;
      copyBtn.classList.add("copied");
      copyBtn.textContent = "✓ Copied";
      setTimeout(() => {
        copyBtn.classList.remove("copied");
        copyBtn.innerHTML = original;
      }, 1800);
    };
    if (navigator.clipboard) {
      navigator.clipboard.writeText(number).then(done).catch(done);
    } else {
      done();
    }
  });
}

function renderCheckoutPlans() {
  const wrap = document.getElementById("checkoutPlans");
  wrap.innerHTML = PRICING_PLANS.map((plan, i) => `
    <button type="button" class="checkout-plan-option" data-select-plan="${i}">
      ${plan.tag ? `<span class="checkout-plan-tag">${plan.tag}</span>` : ""}
      <span class="checkout-plan-label">${plan.label}</span>
      <span class="checkout-plan-price">${plan.originalPrice ? `<s class="checkout-plan-original">${CURRENCY_PREFIX}${plan.originalPrice.toLocaleString()}</s> ` : ""}${CURRENCY_PREFIX}${plan.price.toLocaleString()} <em>/ ${plan.duration}</em></span>
      <span class="checkout-plan-check">✓</span>
    </button>
  `).join("");

  wrap.querySelectorAll("[data-select-plan]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPlanIndex = parseInt(btn.dataset.selectPlan, 10);
      wrap.querySelectorAll(".checkout-plan-option").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      document.getElementById("checkoutStep1Continue").disabled = false;
    });
  });
}

async function openCheckout(planIndex) {
  const modal = document.getElementById("checkoutModal");
  if (!modal || !currentTool || currentTool.is_live === false || currentTool.price_hidden) return;

  const user = await requireAuth();
  if (!user) return;

  /* Always re-fetch instead of trusting whatever's already in memory —
     currentProfile can otherwise be stale (or from a different account,
     e.g. an admin session active in another tab of the same browser). */
  await loadCurrentProfile();

  document.getElementById("checkoutStep1Tool").textContent = currentTool.name;

  modal.hidden = false;
  document.body.style.overflow = "hidden";

  if (planIndex === null) {
    selectedPlanIndex = null;
    document.getElementById("checkoutPlans").querySelectorAll(".checkout-plan-option").forEach((b) => b.classList.remove("selected"));
    document.getElementById("checkoutStep1Continue").disabled = true;
    goToCheckoutStep(1);
  } else {
    selectedPlanIndex = planIndex;
    goToCheckoutStep(2);
  }
}

function closeCheckout() {
  const modal = document.getElementById("checkoutModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

function goToCheckoutStep(step) {
  document.querySelectorAll(".checkout-step").forEach((el) => {
    el.hidden = parseInt(el.dataset.step, 10) !== step;
  });
  document.querySelectorAll(".checkout-progress-step").forEach((el) => {
    el.classList.toggle("active", parseInt(el.dataset.progress, 10) <= step);
  });

  if (step === 2) renderCheckoutSummary();
  if (step === 3) renderCheckoutWhatsAppLink();
}

function renderCheckoutSummary() {
  const plan = PRICING_PLANS[selectedPlanIndex];
  document.getElementById("checkoutSummary").innerHTML = `
    <span class="checkout-summary-tool">${currentTool.name}</span>
    <span class="checkout-summary-plan">${plan.label} — ${plan.duration}</span>
    <span class="checkout-summary-price">${CURRENCY_PREFIX}${plan.price.toLocaleString()}</span>
  `;
}

function renderCheckoutWhatsAppLink() {
  const plan = PRICING_PLANS[selectedPlanIndex];
  const method = selectedPaymentMethod ? (selectedPaymentMethod.name || selectedPaymentMethod.type) : "our team";
  const message = encodeURIComponent(
    `Hi, I've paid for ${currentTool.name} — ${plan.duration} plan (${CURRENCY_PREFIX}${plan.price}) via ${method}. Sending my payment screenshot now.`
  );
  document.getElementById("checkoutWhatsAppBtn").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
}
