/* ==========================================================
   AYZ Software Agency — Guide detail page
   Reads ?guide=<slug> and renders the matching guide's meta tags,
   hero, body content and a CTA back to the linked tool.
   ========================================================== */

let currentGuide = null;

document.addEventListener("DOMContentLoaded", initGuideDetail);

async function initGuideDetail() {
  await loadSiteData();

  const slug = new URLSearchParams(window.location.search).get("guide");
  const guide = GUIDES.find((g) => g.slug === slug);

  if (!guide) {
    window.location.href = "blog.html";
    return;
  }

  currentGuide = guide;

  renderMeta(guide);
  renderBreadcrumb(guide);
  renderHero(guide);
  renderCta(guide);
  renderRelated(guide);

  AOS && AOS.refreshHard && AOS.refreshHard();
}

function renderMeta(guide) {
  const title = `${guide.title} | AYZ Software Agency`;
  const desc = guide.metaDescription || guide.excerpt;
  const url = `https://YOUR-DOMAIN.com/guide-detail.html?guide=${guide.slug}`;
  const image = guide.tool ? guide.tool.image : "https://YOUR-DOMAIN.com/assets/images/logo.jpg";

  document.title = title;
  document.getElementById("pageTitle").textContent = title;

  const metaDesc = document.getElementById("metaDescription");
  if (metaDesc) metaDesc.setAttribute("content", desc);

  setMeta("canonicalLink", "href", url);
  setMeta("ogTitle", "content", title);
  setMeta("ogDescription", "content", desc);
  setMeta("ogImage", "content", image);
  setMeta("ogUrl", "content", url);
  setMeta("twitterTitle", "content", title);
  setMeta("twitterDescription", "content", desc);
  setMeta("twitterImage", "content", image);

  injectArticleSchema(guide, url, desc, image);
}

function setMeta(id, attr, value) {
  const el = document.getElementById(id);
  if (el) el.setAttribute(attr, value);
}

function injectArticleSchema(guide, url, desc, image) {
  const existing = document.getElementById("articleSchema");
  if (existing) existing.remove();

  const schema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "headline": guide.title,
    "description": desc,
    "image": image,
    "author": { "@type": "Organization", "name": "AYZ Software Agency" },
    "publisher": {
      "@type": "Organization",
      "name": "AYZ Software Agency",
      "logo": { "@type": "ImageObject", "url": "https://YOUR-DOMAIN.com/assets/images/logo.jpg" }
    },
    "mainEntityOfPage": { "@type": "WebPage", "@id": url }
  };

  const script = document.createElement("script");
  script.type = "application/ld+json";
  script.id = "articleSchema";
  script.textContent = JSON.stringify(schema);
  document.head.appendChild(script);
}

/* Visible breadcrumb (Home / Guides / Article) + matching BreadcrumbList
   schema — mirrors js/tool-detail.js's renderBreadcrumb(). */
function renderBreadcrumb(guide) {
  const nav = document.getElementById("breadcrumbNav");
  if (!nav) return;

  const base = "https://YOUR-DOMAIN.com/";
  const crumbs = [
    { name: "Home", href: "index.html#home", url: base },
    { name: "Guides", href: "blog.html", url: `${base}blog.html` },
    { name: guide.title, href: null, url: `${base}guide-detail.html?guide=${guide.slug}` }
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
  const script2 = document.createElement("script");
  script2.type = "application/ld+json";
  script2.id = "breadcrumbSchema";
  script2.textContent = JSON.stringify(schema);
  document.head.appendChild(script2);
}

function renderHero(guide) {
  document.getElementById("guideIcon").textContent = guide.icon;
  document.getElementById("guideTitle").textContent = guide.title;
  document.getElementById("guideExcerpt").textContent = guide.excerpt;
  document.getElementById("guideBody").innerHTML = renderGuideContent(guide.content);
}

function renderCta(guide) {
  const card = document.getElementById("guideCtaCard");
  if (!guide.tool) {
    card.hidden = true;
    return;
  }

  const img = document.getElementById("guideCtaImg");
  img.src = guide.tool.image;
  img.alt = guide.tool.name;
  img.dataset.domain = guide.tool.domain || "";
  img.dataset.name = encodeURIComponent(guide.tool.name);
  img.dataset.step = "0";
  img.onerror = () => handleImgError(img);

  document.getElementById("guideCtaName").textContent = guide.tool.name;
  document.getElementById("guideCtaBtn").href = `tool-detail.html?tool=${guide.tool.slug}`;

  card.hidden = false;
}

function renderRelated(guide) {
  const grid = document.getElementById("relatedGuidesGrid");
  const section = document.getElementById("relatedGuidesSection");

  const related = GUIDES.filter((g) => g.slug !== guide.slug).slice(0, 3);

  if (!related.length) {
    section.hidden = true;
    return;
  }

  grid.innerHTML = related.map((g, i) => guideCardHTML(g, i)).join("");
}
