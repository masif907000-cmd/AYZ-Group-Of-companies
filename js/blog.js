/* ==========================================================
   AYZ Software Agency — Blog hub (guide listing)
   ========================================================== */

document.addEventListener("DOMContentLoaded", initBlog);

async function initBlog() {
  await loadSiteData();
  renderGuidesGrid();
  AOS && AOS.refreshHard && AOS.refreshHard();
}

function renderGuidesGrid() {
  const grid = document.getElementById("guidesGrid");
  const empty = document.getElementById("guidesEmpty");
  if (!grid) return;

  if (!GUIDES.length) {
    empty.hidden = false;
    return;
  }

  grid.innerHTML = GUIDES.map((g, i) => guideCardHTML(g, i)).join("");
}

function guideCardHTML(guide, i) {
  return `
    <a href="guide-detail.html?guide=${guide.slug}" class="guide-card" data-aos="fade-up" data-aos-delay="${(i % 6) * 60}">
      <span class="guide-card-icon">${guide.icon}</span>
      <h3 class="guide-card-title">${guide.title}</h3>
      <p class="guide-card-excerpt">${guide.excerpt}</p>
      <span class="guide-card-link">Read Guide
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>
      </span>
    </a>
  `;
}
