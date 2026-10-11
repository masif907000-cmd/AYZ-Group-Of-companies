/* ==========================================================
   AYZ Software Agency — Interactions & Animations
   ========================================================== */

let WHATSAPP_NUMBER = "923096766688";

document.addEventListener("DOMContentLoaded", async () => {
  initPreloader();
  initAOS();
  initCursorGlow();
  initHeroParticles();

  await loadSiteData();
  if (SETTINGS.whatsapp_number) WHATSAPP_NUMBER = SETTINGS.whatsapp_number;

  renderTools();
  renderBundles();
  initBundleCheckout();
  initTiltCards();
  initCounters();
  initMarquee();
  injectToolsSchema();
});

/* ---------- Render category filter pills + tools grouped by category ---------- */
let activeToolCategory = "All";
let toolSearchQuery = "";

function renderTools() {
  const container = document.getElementById("toolsGrid");
  const filters = document.getElementById("toolFilters");
  if (!container || typeof TOOLS === "undefined" || typeof TOOL_CATEGORIES === "undefined") return;

  if (filters) {
    const pills = ["All", ...TOOL_CATEGORIES.map((c) => c.category)];
    filters.innerHTML = pills.map((cat, i) => `
      <button class="filter-pill ${i === 0 ? "active" : ""}" data-filter="${cat}">${cat}</button>
    `).join("");

    filters.addEventListener("click", (e) => {
      const btn = e.target.closest(".filter-pill");
      if (!btn) return;
      filters.querySelectorAll(".filter-pill").forEach((b) => b.classList.remove("active"));
      btn.classList.add("active");
      activeToolCategory = btn.dataset.filter;
      applyFilter();
    });
  }

  const searchInput = document.getElementById("toolsSearchInput");
  if (searchInput) {
    searchInput.addEventListener("input", () => {
      toolSearchQuery = searchInput.value.trim().toLowerCase();
      applyFilter();
    });
  }

  container.innerHTML = TOOL_CATEGORIES.map((cat) => `
    <div class="category-block" data-category="${cat.category}">
      <h3 class="category-heading"><span class="category-heading-bar"></span>${cat.category}</h3>
      <div class="tools-grid">
        ${cat.items.map((item, i) => toolCardHTML({ ...item, category: cat.category }, i)).join("")}
      </div>
    </div>
  `).join("");

  AOS.refreshHard && AOS.refreshHard();
}

function toolCardHTML(tool, i) {
  const image = tool.image || logoUrl(tool.domain, tool.name);
  const slug = tool.slug || slugify(tool.name);
  const delay = (i % 4) * 100;
  const outOfStock = tool.is_live === false;

  /* Use the admin's free-text home page label when set; otherwise fall back
     to the tool's real monthly price (offer price if lower) so "Show price on
     ALL tools" actually shows a price on every card. */
  let priceLabel = tool.price;
  if (!priceLabel) {
    const usd = CURRENCY === "USD";
    const base = Number(usd ? (tool.price_monthly_usd || SETTINGS.price_monthly_usd) : (tool.price_monthly || SETTINGS.price_monthly)) || 0;
    const offer = Number(usd ? tool.offer_monthly_usd : tool.offer_monthly) || 0;
    const shown = offer > 0 && offer < base ? offer : base;
    priceLabel = shown ? `${CURRENCY_PREFIX}${shown.toLocaleString()} / month` : "";
  }

  return `
    <article class="tool-card ${outOfStock ? "tool-card-oos" : ""}" data-category="${tool.category}" data-name="${encodeURIComponent(tool.name.toLowerCase())}" data-aos="fade-up" data-aos-delay="${delay}">
      <div class="tool-media">
        ${outOfStock ? `<span class="tool-badge tool-badge-oos">Out of Stock</span>` : (tool.badge ? `<span class="tool-badge">${tool.badge}</span>` : "")}
        <img src="${image}" alt="${tool.name} - ${tool.style}" loading="lazy"
             data-domain="${tool.domain || ""}" data-name="${encodeURIComponent(tool.name)}" data-step="0"
             onerror="handleImgError(this)" />
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

/* ---------- Logo fallback chain ----------
   Tries multiple free logo sources in order until one actually loads:
   1) Clearbit  2) Unavatar (pulls from Twitter/GitHub/etc)  3) Google favicon
   4) Initials avatar (always works, looks intentional instead of "broken") */
function handleImgError(img) {
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

function applyFilter() {
  let anyVisibleAtAll = false;

  document.querySelectorAll(".category-block").forEach((block) => {
    const categoryMatch = activeToolCategory === "All" || block.dataset.category === activeToolCategory;
    let anyCardVisible = false;

    block.querySelectorAll(".tool-card").forEach((card) => {
      const name = decodeURIComponent(card.dataset.name || "");
      const searchMatch = !toolSearchQuery || name.includes(toolSearchQuery);
      const visible = categoryMatch && searchMatch;
      card.style.display = visible ? "" : "none";
      if (visible) {
        anyCardVisible = true;
        // Cards that were off-screen at page load never got their AOS
        // scroll-reveal triggered. Force them visible the moment they're
        // shown so the filter never leaves "invisible" cards.
        card.classList.add("aos-animate");
      }
    });

    block.style.display = anyCardVisible ? "" : "none";
    if (anyCardVisible) anyVisibleAtAll = true;
  });

  const emptyMsg = document.getElementById("toolsSearchEmpty");
  if (emptyMsg) emptyMsg.hidden = anyVisibleAtAll;

  if (typeof AOS !== "undefined") {
    AOS.refreshHard ? AOS.refreshHard() : AOS.refresh();
  }
}

/* ---------- Preloader ---------- */
function initPreloader() {
  const pre = document.getElementById("preloader");
  if (!pre) return;
  window.addEventListener("load", () => {
    setTimeout(() => pre.classList.add("hidden"), 400);
  });
}

/* ---------- AOS init ---------- */
function initAOS() {
  if (typeof AOS !== "undefined") {
    AOS.init({ duration: 800, once: true, offset: 60, easing: "ease-out-cubic" });
  }
}

/* ---------- Cursor glow (desktop only) ---------- */
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

/* ---------- 3D tilt on tool cards ---------- */
function initTiltCards() {
  const grid = document.getElementById("toolsGrid");
  if (!grid || window.matchMedia("(pointer: coarse)").matches) return;

  grid.addEventListener("mousemove", (e) => {
    const card = e.target.closest(".tool-card");
    if (!card) return;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const rotateX = ((y / rect.height) - 0.5) * -8;
    const rotateY = ((x / rect.width) - 0.5) * 8;
    card.style.transform = `perspective(800px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateY(-4px)`;
  });

  grid.addEventListener("mouseleave", (e) => {
    document.querySelectorAll(".tool-card").forEach((card) => {
      card.style.transform = "";
    });
  }, true);

  grid.addEventListener("mouseout", (e) => {
    const card = e.target.closest(".tool-card");
    if (card && !card.contains(e.relatedTarget)) {
      card.style.transform = "";
    }
  });
}

/* ---------- Animated counters ---------- */
function initCounters() {
  const counters = document.querySelectorAll(".stat-num");
  if (!counters.length) return;

  const animate = (el) => {
    const target = parseInt(el.dataset.count, 10);
    const duration = 1600;
    const start = performance.now();

    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      el.textContent = Math.floor(eased * target);
      if (progress < 1) requestAnimationFrame(tick);
      else el.textContent = target;
    };
    requestAnimationFrame(tick);
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        animate(entry.target);
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.6 });

  counters.forEach((c) => observer.observe(c));
}

/* ---------- Hero gold sparkle particles (canvas) ---------- */
function initHeroParticles() {
  const canvas = document.getElementById("heroCanvas");
  const hero = canvas ? canvas.closest(".hero") : null;
  if (!canvas || !hero) return;

  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  if (reduceMotion) return;

  const ctx = canvas.getContext("2d");
  const isSmall = window.matchMedia("(max-width: 760px)").matches;
  const PARTICLE_COUNT = isSmall ? 32 : 68;

  let width, height, particles, running = true;
  const mouse = { x: null, y: null };

  function resize() {
    width = canvas.width = hero.offsetWidth;
    height = canvas.height = hero.offsetHeight;
  }

  function spawnParticle(fromBottom) {
    return {
      x: Math.random() * width,
      y: fromBottom ? height + 10 : Math.random() * height,
      r: Math.random() * 1.6 + 0.6,
      speed: Math.random() * 0.32 + 0.08,
      drift: (Math.random() - 0.5) * 0.25,
      twinkleSpeed: Math.random() * 0.02 + 0.008,
      twinklePhase: Math.random() * Math.PI * 2,
      baseAlpha: Math.random() * 0.5 + 0.35
    };
  }

  function createParticles() {
    particles = Array.from({ length: PARTICLE_COUNT }, () => spawnParticle(false));
  }

  function draw() {
    if (!running) return;
    ctx.clearRect(0, 0, width, height);

    particles.forEach((p) => {
      p.y -= p.speed;
      p.x += p.drift;
      p.twinklePhase += p.twinkleSpeed;

      if (mouse.x !== null) {
        const dx = p.x - mouse.x;
        const dy = p.y - mouse.y;
        const dist = Math.sqrt(dx * dx + dy * dy) || 1;
        if (dist < 110) {
          const force = (110 - dist) / 110;
          p.x += (dx / dist) * force * 0.7;
          p.y += (dy / dist) * force * 0.7;
        }
      }

      if (p.y < -10) Object.assign(p, spawnParticle(true));
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;

      const alpha = p.baseAlpha * (0.45 + 0.55 * Math.sin(p.twinklePhase));

      const glow = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 5);
      const lightRgb = `${SITE_ACCENT.lr},${SITE_ACCENT.lg},${SITE_ACCENT.lb}`;
      glow.addColorStop(0, `rgba(${lightRgb},${alpha * 0.55})`);
      glow.addColorStop(1, `rgba(${lightRgb},0)`);
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 5, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = `rgba(255,241,199,${alpha})`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
    });

    requestAnimationFrame(draw);
  }

  hero.addEventListener("mousemove", (e) => {
    const rect = hero.getBoundingClientRect();
    mouse.x = e.clientX - rect.left;
    mouse.y = e.clientY - rect.top;
  });
  hero.addEventListener("mouseleave", () => {
    mouse.x = null;
    mouse.y = null;
  });

  const observer = new IntersectionObserver((entries) => {
    running = entries[0].isIntersecting;
    if (running) draw();
  }, { threshold: 0 });
  observer.observe(hero);

  window.addEventListener("resize", resize);

  resize();
  createParticles();
  draw();
}

/* ---------- Trusted tools logo marquee ---------- */
function initMarquee() {
  const track = document.getElementById("marqueeTrack");
  if (!track || typeof TOOLS === "undefined") return;

  const picks = TOOLS.filter((t) => t.domain).slice(0, 16);

  const itemsHTML = picks.map((tool) => `
    <div class="marquee-item">
      <img src="${tool.image}" alt="${tool.name}" loading="lazy"
           data-domain="${tool.domain || ""}" data-name="${encodeURIComponent(tool.name)}" data-step="0"
           onerror="handleImgError(this)" />
      <span>${tool.name}</span>
    </div>
  `).join("");

  track.innerHTML = itemsHTML + itemsHTML;
}

/* ---------- Footer year ---------- */
const yearEl = document.getElementById("year");
if (yearEl) yearEl.textContent = new Date().getFullYear();

/* ---------- SEO: inject Product structured data for each tool ---------- */
function injectToolsSchema() {
  if (typeof TOOLS === "undefined") return;

  const itemListSchema = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "itemListElement": TOOLS.map((tool, i) => {
      /* tool.price is a legacy free-text field that's empty for almost
         every tool now that pricing lives in price_monthly/etc — reading
         it left most Products with no "offers" at all, which is why
         Google's Rich Results Test was flagging them as invalid (a
         Product needs at least an offer, review, or rating). Use the
         same monthly price tool-detail.js actually displays instead. */
      const price = Number(tool.price_monthly || SETTINGS.price_monthly || 699);
      const item = {
        "@type": "Product",
        "name": tool.name,
        "description": `${tool.name} - ${tool.style}`,
        "category": tool.category,
        "image": new URL(tool.image, window.location.href).href,
        "brand": { "@type": "Brand", "name": "AYZ Software Agency" },
        ...(tool.price_hidden ? {} : { "offers": {
          "@type": "Offer",
          "price": String(Number(tool.offer_monthly) > 0 && Number(tool.offer_monthly) < price ? tool.offer_monthly : price),
          "priceCurrency": "PKR",
          "availability": tool.is_live === false ? "https://schema.org/OutOfStock" : "https://schema.org/InStock",
          "url": `https://YOUR-DOMAIN.com/tool-detail.html?tool=${tool.slug}`
        } })
      };
      return { "@type": "ListItem", "position": i + 1, "item": item };
    })
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.textContent = JSON.stringify(itemListSchema);
  document.head.appendChild(script);
}

/* ==========================================================
   Bundle plans (homepage "Plans" section)
   ========================================================== */
function renderBundles() {
  const grid = document.getElementById("bundleGrid");
  if (!grid || typeof BUNDLES === "undefined") return;

  grid.innerHTML = BUNDLES.map((bundle, i) => {
    const includedCount = bundleIncludedTools(bundle).length;
    return `
      <div class="bundle-card ${bundle.tag ? "featured" : ""}" data-aos="fade-up" data-aos-delay="${i * 50}">
        ${bundle.tag ? `<span class="bundle-tag">${bundle.tag}</span>` : ""}
        <span class="bundle-icon">${bundle.icon}</span>
        <h3 class="bundle-name">${bundle.name}</h3>
        <p class="bundle-desc">${bundle.desc}</p>
        <p class="bundle-price"><span class="bundle-currency">${CURRENCY_SYMBOL}</span>${bundlePrice(bundle).toLocaleString()}<span class="bundle-per">/month</span></p>

        <p class="bundle-count">${includedCount} Tools Included</p>

        <ul class="bundle-features">
          <li>Instant Delivery</li>
          <li>24/7 WhatsApp Support</li>
        </ul>

        <button type="button" class="btn btn-whatsapp" data-bundle-id="${bundle.id}">
          <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          Get Access
        </button>
        <a class="tool-details-link" href="bundle-detail.html?bundle=${bundle.id}">
          Get Plan Details
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
        </a>
      </div>
    `;
  }).join("");

  grid.querySelectorAll("[data-bundle-id]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bundle = BUNDLES.find((b) => b.id === btn.dataset.bundleId);
      if (bundle) openBundleCheckout(bundle);
    });
  });
}

/* ==========================================================
   Payment method picker + order tracking
   Shared by every checkout modal (bundle checkout on index.html /
   bundle-detail.html, tool checkout on tool-detail.html) via an id
   "prefix" — e.g. prefix "tool" reads/writes #toolPaymentMethods,
   #toolPaymentCardWrap, #toolPaymentBadge, etc.
   ========================================================== */
let selectedPaymentMethod = null;

/* Renders the list of selectable payment-method cards for the
   detected currency (admin-managed via admin.html), and auto-selects
   the first one so the payment card is never empty. */
function renderPaymentMethods(prefix) {
  selectedPaymentMethod = null;
  const wrap = document.getElementById(`${prefix}PaymentMethods`);
  const cardWrap = document.getElementById(`${prefix}PaymentCardWrap`);
  if (!wrap) return;

  const methods = paymentMethodsForCurrency();

  if (!methods.length) {
    wrap.innerHTML = `<p class="checkout-note">Payment details will be shared with you on WhatsApp.</p>`;
    if (cardWrap) cardWrap.hidden = true;
    return;
  }

  wrap.innerHTML = methods.map((m, i) => `
    <button type="button" class="checkout-plan-option" data-method-index="${i}">
      <span class="checkout-plan-label">${m.type}${m.name && m.name !== m.type ? ` — ${m.name}` : ""}</span>
      <span class="checkout-plan-check">✓</span>
    </button>
  `).join("");

  wrap.querySelectorAll("[data-method-index]").forEach((btn) => {
    btn.addEventListener("click", () => {
      selectedPaymentMethod = methods[parseInt(btn.dataset.methodIndex, 10)];
      wrap.querySelectorAll(".checkout-plan-option").forEach((b) => b.classList.remove("selected"));
      btn.classList.add("selected");
      renderPaymentMethodDetails(prefix, selectedPaymentMethod);
    });
  });

  wrap.querySelector("[data-method-index]").click();
}

/* Fills in the payment card (badge/ID/holder/optional IBAN/copy
   button) for whichever method the visitor just picked. */
function renderPaymentMethodDetails(prefix, method) {
  const cardWrap = document.getElementById(`${prefix}PaymentCardWrap`);
  if (!cardWrap || !method) return;

  const badgeEl = document.getElementById(`${prefix}PaymentBadge`);
  const numberEl = document.getElementById(`${prefix}PaymentNumber`);
  const holderWrap = document.getElementById(`${prefix}PaymentHolderWrap`);
  const holderEl = document.getElementById(`${prefix}PaymentHolder`);
  const ibanWrap = document.getElementById(`${prefix}PaymentIbanWrap`);
  const ibanEl = document.getElementById(`${prefix}PaymentIban`);
  const copyBtn = document.getElementById(`${prefix}CopyBtn`);

  if (badgeEl) badgeEl.textContent = method.type;

  if (numberEl) {
    numberEl.textContent = method.accountId || "Contact us on WhatsApp for payment details";
  }

  if (holderWrap && holderEl) {
    holderWrap.hidden = !method.accountHolder;
    holderEl.textContent = method.accountHolder || "";
  }

  if (ibanWrap && ibanEl) {
    ibanWrap.hidden = !method.iban;
    ibanEl.textContent = method.iban || "";
  }

  if (copyBtn) {
    copyBtn.hidden = !method.accountId;
    copyBtn.dataset.copy = method.accountId || "";
  }

  cardWrap.hidden = false;
}

/* Name/contact come straight from the logged-in customer's account (both
   collected as required fields at signup) — nothing to retype at
   checkout. A handful of accounts created before the WhatsApp field
   existed may have an empty phone; that's fine, the order still goes
   through with whatever's on file rather than blocking checkout. */
function validateCustomerDetails(errorElId) {
  const errorEl = document.getElementById(errorElId);
  const name = (currentProfile && currentProfile.full_name) || "";
  const contact = (currentProfile && currentProfile.phone) || "";

  if (paymentMethodsForCurrency().length && !selectedPaymentMethod) {
    if (errorEl) { errorEl.textContent = "Please choose a payment method."; errorEl.hidden = false; }
    return null;
  }
  if (errorEl) errorEl.hidden = true;
  return { name, contact };
}

/* Records the order in Supabase the moment checkout completes.
   Fire-and-forget — a failed insert must never block the WhatsApp
   handoff, since that's still how the sale actually gets confirmed. */
async function createOrder({ itemType, itemName, planLabel, price, name, contact, transactionId, screenshotUrl }) {
  try {
    await sb.from("orders").insert({
      item_type: itemType,
      item_name: itemName,
      plan_label: planLabel,
      price,
      currency: CURRENCY,
      payment_method: selectedPaymentMethod ? (selectedPaymentMethod.name || selectedPaymentMethod.type) : null,
      customer_name: name,
      customer_contact: contact,
      transaction_id: transactionId || null,
      screenshot_url: screenshotUrl || null,
      status: "pending",
      user_id: currentUser ? currentUser.id : null
    });
  } catch (err) {
    console.error("Failed to record order (checkout continues regardless):", err);
  }
}

/* ---------- Bundle checkout modal: Payment -> WhatsApp screenshot ---------- */
let currentBundle = null;

function initBundleCheckout() {
  const modal = document.getElementById("bundleCheckoutModal");
  if (!modal) return;

  renderPaymentMethods("bundle");

  modal.querySelectorAll("[data-checkout-close]").forEach((el) => {
    el.addEventListener("click", closeBundleCheckout);
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeBundleCheckout();
  });

  document.getElementById("bundleCheckoutContinue").addEventListener("click", async () => {
    const details = validateCustomerDetails("bundleCheckoutFormError");
    if (!details) return;

    const btn = document.getElementById("bundleCheckoutContinue");
    const originalText = btn.textContent;
    const fileInput = document.getElementById("bundlePaymentScreenshot");
    const file = fileInput && fileInput.files[0];

    btn.disabled = true;
    if (file) btn.textContent = "Uploading screenshot...";

    const screenshotUrl = await uploadPaymentScreenshot(file);
    const transactionId = document.getElementById("bundleTransactionId").value.trim();

    const method = selectedPaymentMethod ? (selectedPaymentMethod.name || selectedPaymentMethod.type) : "our team";
    const message = encodeURIComponent(
      `Hi, I've paid for the ${currentBundle.name} bundle (${CURRENCY_PREFIX}${bundlePrice(currentBundle)}) via ${method}. Sending my payment screenshot now.`
    );
    document.getElementById("bundleCheckoutWhatsAppBtn").href = `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;

    await createOrder({
      itemType: "bundle",
      itemName: currentBundle.name,
      planLabel: "Monthly Bundle",
      price: bundlePrice(currentBundle),
      name: details.name,
      contact: details.contact,
      transactionId,
      screenshotUrl
    });

    btn.disabled = false;
    btn.textContent = originalText;

    goToBundleStep(2);
  });

  const copyBtn = modal.querySelector(".copy-btn");
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
    if (navigator.clipboard) navigator.clipboard.writeText(number).then(done).catch(done);
    else done();
  });
}

async function openBundleCheckout(bundle) {
  const modal = document.getElementById("bundleCheckoutModal");
  if (!modal) return;

  const user = await requireAuth();
  if (!user) return;

  /* Always re-fetch instead of trusting whatever's already in memory —
     currentProfile can otherwise be stale (or from a different account,
     e.g. an admin session active in another tab of the same browser). */
  await loadCurrentProfile();

  currentBundle = bundle;

  document.getElementById("bundleCheckoutSummary").innerHTML = `
    <span class="checkout-summary-tool">${bundle.name}</span>
    <span class="checkout-summary-plan">Monthly Bundle</span>
    <span class="checkout-summary-price">${CURRENCY_PREFIX}${bundlePrice(bundle).toLocaleString()}</span>
  `;

  modal.hidden = false;
  document.body.style.overflow = "hidden";
  goToBundleStep(1);
}

function closeBundleCheckout() {
  const modal = document.getElementById("bundleCheckoutModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

function goToBundleStep(step) {
  document.querySelectorAll("#bundleCheckoutModal .checkout-step").forEach((el) => {
    el.hidden = parseInt(el.dataset.step, 10) !== step;
  });
  document.querySelectorAll("#bundleCheckoutModal .checkout-progress-step").forEach((el) => {
    el.classList.toggle("active", parseInt(el.dataset.progress, 10) <= step);
  });
}
