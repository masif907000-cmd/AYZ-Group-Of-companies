/* ==========================================================
   AYZ Software Agency — Header (pill nav, dropdowns, mobile menu)
   ========================================================== */

const HOVER_CAPABLE = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

document.addEventListener("DOMContentLoaded", async () => {
  initHeaderScrollShadow();
  initDropdowns();
  initMobileNav();
  initToolsFilterLinks();
  await applyAdminWhatsAppNumber();
});

/* ---------- Admin WhatsApp number applies to every hardcoded wa.me link ----------
   The header, footer, hero buttons and legal pages hardcode wa.me/<number>
   straight into the static HTML, so changing "WhatsApp number" in the admin
   panel's Settings tab never reached them — only the JS-built checkout buttons
   picked up the new number. After loadSiteData() we rewrite every wa.me link
   (keeping its ?text= query) and any visible "+92 ..." phone text to the number
   the admin set. */
async function applyAdminWhatsAppNumber() {
  await loadSiteData();

  const raw = SETTINGS.whatsapp_number;
  if (!raw) return;

  const digits = raw.replace(/\D/g, "");
  if (!digits) return;

  const display = digits.startsWith("92")
    ? `+92 ${digits.slice(2, 5)} ${digits.slice(5)}`
    : digits;

  document.querySelectorAll('a[href*="wa.me/"]').forEach((link) => {
    const url = new URL(link.href);
    url.pathname = `/${digits}`;
    link.href = url.href;
  });

  document.querySelectorAll("a").forEach((link) => {
    const text = link.textContent;
    if (/\+92[\d\s-]+/.test(text)) {
      link.textContent = text.replace(/\+92[\d\s-]+/, display);
    }
  });
}

/* ---------- Header shadow intensifies slightly once page is scrolled ---------- */
function initHeaderScrollShadow() {
  const header = document.getElementById("siteHeader");
  if (!header) return;
  const onScroll = () => header.classList.toggle("scrolled", window.scrollY > 20);
  window.addEventListener("scroll", onScroll, { passive: true });
  onScroll();
}

/* ---------- Dropdowns: hover on desktop, click-to-toggle on touch ---------- */
function initDropdowns() {
  const navItems = document.querySelectorAll(".nav-item");

  navItems.forEach((item) => {
    const trigger = item.querySelector(":scope > button");
    const panel = item.querySelector(":scope > .dropdown-panel");
    if (!trigger || !panel) return;

    if (HOVER_CAPABLE) {
      // Desktop: CSS :hover / :focus-within drives visibility.
      // The panel must not carry the `hidden` attribute, otherwise
      // `display:none` from the UA stylesheet would block the hover transition.
      panel.hidden = false;
      return;
    }

    // Touch / no-hover: click-to-toggle via the `hidden` attribute.
    trigger.addEventListener("click", (e) => {
      e.stopPropagation();
      const willOpen = panel.hidden;

      closeAllDropdowns();

      panel.hidden = !willOpen;
      trigger.setAttribute("aria-expanded", String(!willOpen));
    });
  });

  document.addEventListener("click", (e) => {
    if (!e.target.closest(".nav-item")) closeAllDropdowns();
  });

  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAllDropdowns();
  });

  function closeAllDropdowns() {
    navItems.forEach((item) => {
      const trigger = item.querySelector(":scope > button");
      const panel = item.querySelector(":scope > .dropdown-panel");
      if (!panel || HOVER_CAPABLE) return;
      panel.hidden = true;
      if (trigger) trigger.setAttribute("aria-expanded", "false");
    });
  }
}

/* ---------- Mobile hamburger menu ---------- */
function initMobileNav() {
  const btn = document.getElementById("hamburger");
  const nav = document.getElementById("navMobile");
  if (!btn || !nav) return;

  btn.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("open");
    btn.classList.toggle("active", isOpen);
    btn.setAttribute("aria-expanded", String(isOpen));
  });

  nav.querySelectorAll("a").forEach((link) => {
    link.addEventListener("click", () => {
      nav.classList.remove("open");
      btn.classList.remove("active");
      btn.setAttribute("aria-expanded", "false");
    });
  });
}

/* ---------- "Tools" dropdown links jump to #tools and pre-apply the category filter ---------- */
function initToolsFilterLinks() {
  document.querySelectorAll(".dropdown-panel a[data-filter]").forEach((link) => {
    link.addEventListener("click", () => {
      const filter = link.dataset.filter;

      if (typeof applyFilter === "function") {
        if (typeof activeToolCategory !== "undefined") activeToolCategory = filter;
        applyFilter();
      }

      document.querySelectorAll(".filter-pill").forEach((pill) => {
        pill.classList.toggle("active", pill.dataset.filter === filter);
      });
    });
  });
}
