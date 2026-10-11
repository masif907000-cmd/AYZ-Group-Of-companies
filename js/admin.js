/* ==========================================================
   AYZ Software Agency — Admin Panel logic
   ========================================================== */

/* Console-only debug trail (no on-page banner) — kept in place since it's
   handy if a login/auth issue like this one ever needs tracing again. */
function dbg(msg) {
  console.log("[" + new Date().toLocaleTimeString() + "] " + msg);
}

let adminTools = [];
let adminBundles = [];
let adminSettings = {};
let adminGuides = [];
let adminPaymentMethods = [];
let adminTrustBadges = [];
let adminOrders = [];

document.addEventListener("DOMContentLoaded", () => {
  dbg("DOMContentLoaded fired");
  try {
    initLogin();
    dbg("initLogin() attached OK");
    initPasswordToggles();
    initForgotPassword();
    initLogout();
    initSidebar();
    initTabs();
    initModals();
    initToolForm();
    initBundleForm();
    initGuideForm();
    initPaymentMethodForm();
    initTrustBadgeForm();
    initOrderForm();
    initSettingsForm();
    initAdminProfileForm();
    dbg("all init*() functions ran OK");
    checkAuth();
    dbg("checkAuth() called");
  } catch (err) {
    dbg("!!! CRASH during init: " + err.message);
    console.error(err);
  }
});

/* ---------- Auth ----------
   A single source of truth: onAuthStateChange fires once immediately
   with the current session (from persisted storage, if any) and then
   again on every future sign-in/sign-out. Previously this also raced
   a separate getSession() call made at the same time — whichever one
   resolved last "won", so a slow getSession() reply could arrive
   after a successful login and flip the UI back to the login screen. */
function checkAuth() {
  dbg("checkAuth: subscribing to onAuthStateChange");
  sb.auth.onAuthStateChange((event, session) => {
    dbg("onAuthStateChange fired -> event=" + event + " session=" + (session ? "YES (user: " + session.user.email + ")" : "null"));

    /* Supabase redirects here with #...type=recovery after clicking the
       link in a "forgot password" email — show the "set new password"
       view unprompted, same pattern as the public site's auth modal. */
    if (event === "PASSWORD_RECOVERY") {
      showResetPasswordView();
      return;
    }

    if (session) {
      populateAdminProfile(session.user);
      showDashboard();
    } else {
      showLogin();
    }
  });
}

/* Fills the mobile sidebar's profile block (avatar initial + email) and
   the Admin Profile tab's form — the desktop topbar doesn't need this,
   it just shows "View Site"/"Logout". */
async function populateAdminProfile(user) {
  const email = user && user.email ? user.email : "";
  const avatarEl = document.getElementById("adminProfileAvatar");
  const emailEl = document.getElementById("adminProfileEmail");
  if (avatarEl) avatarEl.textContent = email ? email[0].toUpperCase() : "A";
  if (emailEl) emailEl.textContent = email || "—";

  const emailInput = document.getElementById("adminProfileEmailInput");
  const nameInput = document.getElementById("adminProfileName");
  if (emailInput) emailInput.value = email;
  if (nameInput && user) {
    const { data } = await sb.from("profiles").select("full_name").eq("id", user.id).single();
    nameInput.value = (data && data.full_name) || "";
  }
}

function showLogin() {
  dbg("showLogin() called");
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("dashboard").hidden = true;
  showLoginView();
}

function showDashboard() {
  dbg("showDashboard() called");
  document.getElementById("loginScreen").hidden = true;
  document.getElementById("dashboard").hidden = false;
  loadDashboardData();
}

/* ---------- Login screen views (login / forgot / reset) ---------- */
function showLoginView() {
  document.getElementById("loginForm").hidden = false;
  document.getElementById("adminForgotForm").hidden = true;
  document.getElementById("adminResetForm").hidden = true;
}

function showForgotView() {
  document.getElementById("loginForm").hidden = true;
  document.getElementById("adminForgotForm").hidden = false;
  document.getElementById("adminResetForm").hidden = true;
}

function showResetPasswordView() {
  document.getElementById("loginScreen").hidden = false;
  document.getElementById("dashboard").hidden = true;
  document.getElementById("loginForm").hidden = true;
  document.getElementById("adminForgotForm").hidden = true;
  document.getElementById("adminResetForm").hidden = false;
}

function initForgotPassword() {
  document.getElementById("adminForgotLink").addEventListener("click", (e) => {
    e.preventDefault();
    document.getElementById("adminForgotError").hidden = true;
    document.getElementById("adminForgotSuccess").hidden = true;
    showForgotView();
  });

  document.getElementById("adminBackToLoginLink").addEventListener("click", (e) => {
    e.preventDefault();
    showLoginView();
  });

  document.getElementById("adminForgotForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("adminForgotError");
    const successEl = document.getElementById("adminForgotSuccess");
    errorEl.hidden = true;
    successEl.hidden = true;

    const email = document.getElementById("adminForgotEmail").value.trim();
    const { error } = await sb.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + window.location.pathname
    });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    successEl.hidden = false;
  });

  document.getElementById("adminResetForm").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("adminResetError");
    errorEl.hidden = true;

    const password = document.getElementById("adminResetPassword").value;
    const { error } = await sb.auth.updateUser({ password });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    showDashboard();
  });
}

/* ---------- Show/hide password toggle ---------- */
function initPasswordToggles() {
  document.querySelectorAll("[data-toggle-target]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const input = document.getElementById(btn.dataset.toggleTarget);
      if (!input) return;
      const willShow = input.type === "password";
      input.type = willShow ? "text" : "password";
      btn.classList.toggle("showing", willShow);
      btn.setAttribute("aria-label", willShow ? "Hide password" : "Show password");
    });
  });
}

function initLogin() {
  const form = document.getElementById("loginForm");
  const errorEl = document.getElementById("loginError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    dbg("LOGIN FORM SUBMITTED (preventDefault called OK)");
    errorEl.hidden = true;

    const email = document.getElementById("loginEmail").value.trim();
    const password = document.getElementById("loginPassword").value;
    const btn = document.getElementById("loginBtn");

    dbg("email=" + email + " password_length=" + password.length);

    btn.disabled = true;
    btn.textContent = "Logging in...";

    const timeout = (ms) => new Promise((_, reject) =>
      setTimeout(() => reject(new Error("Request timed out after " + (ms / 1000) + "s — the request to Supabase never came back. This usually means the network request is being blocked (firewall/antivirus/browser extension) rather than a wrong password.")), ms)
    );

    try {
      dbg("calling sb.auth.signInWithPassword ...");
      const { data, error } = await Promise.race([
        sb.auth.signInWithPassword({ email, password }),
        timeout(10000)
      ]);
      dbg("signInWithPassword RETURNED -> error=" + (error ? error.message : "none") + " data.session=" + (data && data.session ? "YES" : "no"));
      if (error) {
        errorEl.textContent = error.message;
        errorEl.hidden = false;
      } else {
        storeCredential(email, password);
      }
    } catch (err) {
      dbg("!!! signInWithPassword THREW: " + err.message);
      console.error("Login request failed:", err);
      errorEl.textContent = err.message || "Connection failed. Check the browser console (F12) for details.";
      errorEl.hidden = false;
    } finally {
      btn.disabled = false;
      btn.textContent = "Login";
    }
  });
}

function initLogout() {
  document.getElementById("logoutBtn").addEventListener("click", () => sb.auth.signOut());
}

/* ---------- Tabs ---------- */
/* Mobile off-canvas sidebar — same open/close pattern as the public
   site's hamburger nav (js/header.js initMobileNav()). */
function initSidebar() {
  const toggle = document.getElementById("sidebarToggle");
  const sidebar = document.getElementById("adminSidebar");
  const backdrop = document.getElementById("sidebarBackdrop");
  if (!toggle || !sidebar || !backdrop) return;

  const close = () => {
    sidebar.classList.remove("open");
    backdrop.classList.remove("open");
    toggle.setAttribute("aria-expanded", "false");
  };

  toggle.addEventListener("click", () => {
    const willOpen = !sidebar.classList.contains("open");
    sidebar.classList.toggle("open", willOpen);
    backdrop.classList.toggle("open", willOpen);
    toggle.setAttribute("aria-expanded", String(willOpen));
  });

  backdrop.addEventListener("click", close);
  sidebar.querySelectorAll(".admin-tab").forEach((tab) => tab.addEventListener("click", close));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") close(); });

  /* Mobile-only profile button at the bottom of the drawer — jumps to
     the Admin Profile tab (forgot password + logout live there). */
  const profileBtn = document.getElementById("sidebarProfileBtn");
  if (profileBtn) {
    profileBtn.addEventListener("click", () => {
      switchAdminTab("admin-profile");
      close();
    });
  }

  /* Collapse button inside the sidebar itself — on mobile (off-canvas
     drawer) it just closes the drawer, same as the backdrop; on
     desktop it toggles an icon-only rail, remembered across visits. */
  const collapseBtn = document.getElementById("sidebarCollapseToggle");
  if (collapseBtn) {
    if (localStorage.getItem("adminSidebarCollapsed") === "true") {
      sidebar.classList.add("collapsed");
    }
    collapseBtn.addEventListener("click", () => {
      if (window.matchMedia("(max-width: 860px)").matches) {
        close();
        return;
      }
      const collapsed = sidebar.classList.toggle("collapsed");
      localStorage.setItem("adminSidebarCollapsed", String(collapsed));
      collapseBtn.setAttribute("aria-label", collapsed ? "Expand sidebar" : "Collapse sidebar");
      collapseBtn.title = collapsed ? "Expand sidebar" : "Collapse sidebar";
    });
  }
}

/* Remembers which tab was open across a refresh — previously every
   refresh silently dropped back to the first tab (Tools) since nothing
   persisted which one was active. */
function switchAdminTab(tabName) {
  const tabBtn = document.querySelector(`.admin-tab[data-tab="${tabName}"]`);
  const panel = document.querySelector(`.admin-panel[data-panel="${tabName}"]`);
  if (!tabBtn || !panel) return;

  document.querySelectorAll(".admin-tab").forEach((t) => t.classList.remove("active"));
  document.querySelectorAll(".admin-panel").forEach((p) => p.classList.remove("active"));
  tabBtn.classList.add("active");
  panel.classList.add("active");
  localStorage.setItem("adminActiveTab", tabName);
}

function initTabs() {
  const savedTab = localStorage.getItem("adminActiveTab");
  if (savedTab) switchAdminTab(savedTab);

  document.querySelectorAll(".admin-tab").forEach((tab) => {
    tab.addEventListener("click", () => switchAdminTab(tab.dataset.tab));
  });
}

/* ---------- Load all dashboard data ---------- */
let adminCustomers = [];

async function loadDashboardData() {
  const [toolsRes, bundlesRes, settingsRes, guidesRes, paymentMethodsRes, trustBadgesRes, ordersRes, customersRes] = await Promise.all([
    sb.from("tools").select("*").order("sort_order", { ascending: true }),
    sb.from("bundles").select("*").order("sort_order", { ascending: true }),
    sb.from("settings").select("*"),
    sb.from("guides").select("*").order("sort_order", { ascending: true }),
    sb.from("payment_methods").select("*").order("sort_order", { ascending: true }),
    sb.from("trust_badges").select("*").order("sort_order", { ascending: true }),
    sb.from("orders").select("*").order("created_at", { ascending: false }),
    sb.from("profiles").select("*").order("created_at", { ascending: false })
  ]);

  adminTools = toolsRes.data || [];
  adminBundles = bundlesRes.data || [];
  adminGuides = guidesRes.data || [];
  adminPaymentMethods = paymentMethodsRes.data || [];
  adminTrustBadges = trustBadgesRes.data || [];
  adminOrders = ordersRes.data || [];
  adminCustomers = customersRes.data || [];
  adminSettings = {};
  (settingsRes.data || []).forEach((row) => { adminSettings[row.key] = row.value; });

  renderToolsTable(adminTools);
  renderBundlesList(adminBundles);
  renderGuidesTable(adminGuides);
  renderPaymentMethodsTable(adminPaymentMethods);
  renderTrustBadgesTable(adminTrustBadges);
  renderOrdersTable(adminOrders);
  renderCustomersTable(adminCustomers);
  populateCategoryOptions();
  populateGuideToolOptions();
  populateSettingsForm();
}

/* ---------- Small inline "copy to clipboard" icon, used next to emails/
   phone numbers in admin tables so there's no separate action button
   to hunt for. Returns "—" (no button) when there's nothing to copy. */
function copyableCellHTML(value, label) {
  if (!value) return "—";
  return `
    <span class="admin-copy-cell">
      ${escapeHtml(value)}
      <button type="button" class="admin-copy-icon-btn" data-copy-value="${escapeHtml(value)}" title="${label}" aria-label="${label}">
        <svg viewBox="0 0 24 24" width="13" height="13" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="12" height="12" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
      </button>
    </span>
  `;
}

/* Wires every .admin-copy-icon-btn inside a container (call again after
   any re-render, since innerHTML replacement drops old listeners). */
function initCopyButtons(container) {
  container.querySelectorAll(".admin-copy-icon-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const value = btn.dataset.copyValue;
      if (!value) return;
      const done = () => {
        btn.classList.add("copied");
        setTimeout(() => btn.classList.remove("copied"), 1400);
      };
      if (navigator.clipboard) navigator.clipboard.writeText(value).then(done).catch(done);
      else done();
    });
  });
}

/* ==========================================================
   CUSTOMERS
   ========================================================== */
function renderCustomersTable(customers) {
  const tbody = document.getElementById("customersTableBody");
  if (!tbody) return;
  document.getElementById("customersCount").textContent = customers.length;

  tbody.innerHTML = customers.map((c) => `
    <tr data-id="${c.id}">
      <td data-label="Name">${escapeHtml(c.full_name || "—")}</td>
      <td data-label="Email">${copyableCellHTML(c.email, "Copy email")}</td>
      <td data-label="Phone">${copyableCellHTML(c.phone, "Copy phone number")}</td>
      <td data-label="Role">${c.role === "admin" ? `<span class="admin-table-badge admin-badge-green">Admin</span>` : "Customer"}</td>
      <td data-label="Joined">${c.created_at ? new Date(c.created_at).toLocaleDateString() : "—"}</td>
    </tr>
  `).join("");

  initCopyButtons(tbody);
}

document.addEventListener("DOMContentLoaded", () => {
  const search = document.getElementById("customersSearch");
  if (search) {
    search.addEventListener("input", () => {
      const q = search.value.trim().toLowerCase();
      const filtered = adminCustomers.filter((c) =>
        (c.full_name || "").toLowerCase().includes(q) || (c.email || "").toLowerCase().includes(q)
      );
      renderCustomersTable(filtered);
    });
  }
});

/* ==========================================================
   TOOLS
   ========================================================== */
function renderToolsTable(tools) {
  const tbody = document.getElementById("toolsTableBody");
  document.getElementById("toolsCount").textContent = tools.length;

  tbody.innerHTML = tools.map((t) => `
    <tr data-id="${t.id}">
      <td data-label="Image"><img class="admin-table-img" src="${t.image || logoUrl(t.domain, t.name)}" alt="" loading="lazy" onerror="this.src='${PLACEHOLDER_IMG}'" /></td>
      <td data-label="Name">${escapeHtml(t.name)}</td>
      <td data-label="Category">${escapeHtml(t.category)}</td>
      <td data-label="Badge">${t.badge ? `<span class="admin-table-badge">${escapeHtml(t.badge)}</span>` : "—"}</td>
      <td data-label="Status">${t.is_live === false ? `<span class="admin-table-badge admin-badge-red">Out of Stock</span>` : `<span class="admin-table-badge admin-badge-green">Live</span>`}${t.price_hidden ? ` <span class="admin-table-badge">Price Hidden</span>` : ""}</td>
      <td class="admin-td-actions"><button type="button" class="admin-row-edit" data-edit-tool="${t.id}">Edit</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit-tool]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const tool = adminTools.find((t) => t.id === btn.dataset.editTool);
      openToolModal(tool);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("toolsSearch").addEventListener("input", (e) => {
    const q = e.target.value.trim().toLowerCase();
    const filtered = adminTools.filter((t) =>
      t.name.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
    );
    renderToolsTable(filtered);
  });

  document.getElementById("addToolBtn").addEventListener("click", () => openToolModal(null));

  const setAllPricesHidden = async (hidden) => {
    const msg = hidden
      ? "Hide the price on ALL tools? Visitors will be asked to contact you on WhatsApp instead."
      : "Show the price on ALL tools again?";
    if (!confirm(msg)) return;
    const { error } = await sb.from("tools").update({ price_hidden: hidden }).not("id", "is", null);
    if (error) {
      alert("Failed: " + error.message);
      return;
    }
    await loadDashboardData();
  };
  document.getElementById("hideAllPricesBtn").addEventListener("click", () => setAllPricesHidden(true));
  document.getElementById("showAllPricesBtn").addEventListener("click", () => setAllPricesHidden(false));
});

function populateCategoryOptions() {
  const categories = [...new Set(adminTools.map((t) => t.category))].sort();

  const datalist = document.getElementById("categoryList");
  datalist.innerHTML = categories.map((c) => `<option value="${escapeHtml(c)}"></option>`).join("");

  const select = document.getElementById("bundleCategoryMatch");
  select.innerHTML = `<option value="">— None —</option>` +
    categories.map((c) => `<option value="${escapeHtml(c)}">${escapeHtml(c)}</option>`).join("");
}

function populateGuideToolOptions() {
  const select = document.getElementById("guideToolSlug");
  if (!select) return;
  select.innerHTML = `<option value="">— None —</option>` +
    adminTools.map((t) => `<option value="${escapeHtml(t.slug)}">${escapeHtml(t.name)}</option>`).join("");
}

let toolSelectedBadgeIds = new Set();

function renderToolBadgePicker() {
  const picker = document.getElementById("toolBadgePicker");
  if (!picker) return;

  picker.innerHTML = adminTrustBadges.filter((b) => b.active).map((b) => `
    <label>
      <input type="checkbox" value="${b.id}" ${toolSelectedBadgeIds.has(b.id) ? "checked" : ""} />
      ${escapeHtml(b.icon || "")} ${escapeHtml(b.label)}
    </label>
  `).join("");

  picker.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) toolSelectedBadgeIds.add(cb.value);
      else toolSelectedBadgeIds.delete(cb.value);
    });
  });
}

function openToolModal(tool) {
  const modal = document.getElementById("toolModal");
  const form = document.getElementById("toolForm");
  form.reset();
  document.getElementById("toolFormError").hidden = true;

  document.getElementById("toolModalTitle").textContent = tool ? "Edit Tool" : "Add New Tool";
  document.getElementById("toolId").value = tool ? tool.id : "";
  document.getElementById("toolName").value = tool ? tool.name : "";
  document.getElementById("toolCategory").value = tool ? tool.category : "";
  document.getElementById("toolStyle").value = tool ? (tool.style || "") : "";
  document.getElementById("toolDomain").value = tool ? (tool.domain || "") : "";
  document.getElementById("toolBadge").value = tool ? (tool.badge || "") : "";
  document.getElementById("toolPrice").value = tool ? (tool.price || "") : "";
  document.getElementById("toolIsLive").checked = tool ? tool.is_live !== false : true;
  document.getElementById("toolPriceMonthly").value = tool ? (tool.price_monthly ?? "") : "";
  document.getElementById("toolPriceHalfYearly").value = tool ? (tool.price_half_yearly ?? "") : "";
  document.getElementById("toolPriceYearly").value = tool ? (tool.price_yearly ?? "") : "";
  document.getElementById("toolPriceMonthlyUsd").value = tool ? (tool.price_monthly_usd ?? "") : "";
  document.getElementById("toolPriceHalfYearlyUsd").value = tool ? (tool.price_half_yearly_usd ?? "") : "";
  document.getElementById("toolPriceYearlyUsd").value = tool ? (tool.price_yearly_usd ?? "") : "";
  document.getElementById("toolOfferMonthly").value = tool ? (tool.offer_monthly ?? "") : "";
  document.getElementById("toolOfferHalfYearly").value = tool ? (tool.offer_half_yearly ?? "") : "";
  document.getElementById("toolOfferYearly").value = tool ? (tool.offer_yearly ?? "") : "";
  document.getElementById("toolOfferMonthlyUsd").value = tool ? (tool.offer_monthly_usd ?? "") : "";
  document.getElementById("toolOfferHalfYearlyUsd").value = tool ? (tool.offer_half_yearly_usd ?? "") : "";
  document.getElementById("toolOfferYearlyUsd").value = tool ? (tool.offer_yearly_usd ?? "") : "";
  document.getElementById("toolPriceHidden").checked = tool ? tool.price_hidden === true : false;
  document.getElementById("toolAvail1m").checked = tool ? tool.available_1m !== false : true;
  document.getElementById("toolAvail6m").checked = tool ? tool.available_6m !== false : true;
  document.getElementById("toolAvail1y").checked = tool ? tool.available_1y !== false : true;
  document.getElementById("toolExtraInfo").value = tool ? (tool.extra_info || "") : "";
  document.getElementById("deleteToolBtn").hidden = !tool;

  // No stored selection (new tool, or an existing one that's never been customized) -> default to all badges checked
  toolSelectedBadgeIds = (tool && Array.isArray(tool.badge_ids))
    ? new Set(tool.badge_ids)
    : new Set(adminTrustBadges.filter((b) => b.active).map((b) => b.id));
  renderToolBadgePicker();

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeToolModal() {
  document.getElementById("toolModal").hidden = true;
  document.body.style.overflow = "";
}

function initToolForm() {
  const form = document.getElementById("toolForm");
  const errorEl = document.getElementById("toolFormError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const id = document.getElementById("toolId").value;
    const name = document.getElementById("toolName").value.trim();
    const category = document.getElementById("toolCategory").value.trim();

    const payload = {
      name,
      category,
      style: document.getElementById("toolStyle").value.trim(),
      domain: document.getElementById("toolDomain").value.trim() || null,
      badge: document.getElementById("toolBadge").value || null,
      price: document.getElementById("toolPrice").value.trim(),
      is_live: document.getElementById("toolIsLive").checked,
      price_monthly: numOrNull(document.getElementById("toolPriceMonthly").value),
      price_half_yearly: numOrNull(document.getElementById("toolPriceHalfYearly").value),
      price_yearly: numOrNull(document.getElementById("toolPriceYearly").value),
      price_monthly_usd: numOrNull(document.getElementById("toolPriceMonthlyUsd").value),
      price_half_yearly_usd: numOrNull(document.getElementById("toolPriceHalfYearlyUsd").value),
      price_yearly_usd: numOrNull(document.getElementById("toolPriceYearlyUsd").value),
      offer_monthly: numOrNull(document.getElementById("toolOfferMonthly").value),
      offer_half_yearly: numOrNull(document.getElementById("toolOfferHalfYearly").value),
      offer_yearly: numOrNull(document.getElementById("toolOfferYearly").value),
      offer_monthly_usd: numOrNull(document.getElementById("toolOfferMonthlyUsd").value),
      offer_half_yearly_usd: numOrNull(document.getElementById("toolOfferHalfYearlyUsd").value),
      offer_yearly_usd: numOrNull(document.getElementById("toolOfferYearlyUsd").value),
      price_hidden: document.getElementById("toolPriceHidden").checked,
      available_1m: document.getElementById("toolAvail1m").checked,
      available_6m: document.getElementById("toolAvail6m").checked,
      available_1y: document.getElementById("toolAvail1y").checked,
      extra_info: document.getElementById("toolExtraInfo").value.trim() || null,
      // Every active badge checked == "no customization" -> store null so newly-added badges show automatically too
      badge_ids: toolSelectedBadgeIds.size === adminTrustBadges.filter((b) => b.active).length ? null : Array.from(toolSelectedBadgeIds)
    };

    let result;
    if (id) {
      result = await sb.from("tools").update(payload).eq("id", id);
    } else {
      payload.slug = slugify(name);
      payload.sort_order = adminTools.length ? Math.max(...adminTools.map((t) => t.sort_order || 0)) + 1 : 1;
      result = await sb.from("tools").insert(payload);
    }

    if (result.error) {
      errorEl.textContent = result.error.message;
      errorEl.hidden = false;
      return;
    }

    closeToolModal();
    await loadDashboardData();
  });

  document.getElementById("deleteToolBtn").addEventListener("click", async () => {
    const id = document.getElementById("toolId").value;
    if (!id) return;
    if (!confirm("Permanently delete this tool?")) return;

    const { error } = await sb.from("tools").delete().eq("id", id);
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    closeToolModal();
    await loadDashboardData();
  });
}

/* ==========================================================
   BUNDLES
   ========================================================== */
function renderBundlesList(bundles) {
  document.getElementById("bundlesCount").textContent = bundles.length;
  const list = document.getElementById("bundlesList");

  list.innerHTML = bundles.map((b) => `
    <div class="admin-bundle-row">
      <span class="icon">${b.icon || "📦"}</span>
      <div class="info">
        <strong>${escapeHtml(b.name)}</strong>
        <span>${escapeHtml(b.description || "")}</span>
      </div>
      <span class="price">PKR ${Number(b.price).toLocaleString()} · $${Number(b.price_usd || 0).toLocaleString()}</span>
      <button type="button" class="admin-row-edit" data-edit-bundle="${b.id}">Edit</button>
    </div>
  `).join("");

  list.querySelectorAll("[data-edit-bundle]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const bundle = adminBundles.find((b) => b.id === btn.dataset.editBundle);
      openBundleModal(bundle);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  document.getElementById("addBundleBtn").addEventListener("click", () => openBundleModal(null));

  document.getElementById("bundleIncludeAll").addEventListener("change", updateBundlePickerState);
  document.getElementById("bundleCategoryMatch").addEventListener("change", updateBundlePickerState);
  document.getElementById("bundleToolSearch").addEventListener("input", (e) => {
    renderToolPicker(e.target.value.trim().toLowerCase());
  });
});

function updateBundlePickerState() {
  const includeAll = document.getElementById("bundleIncludeAll").checked;
  const hasCategory = !!document.getElementById("bundleCategoryMatch").value;
  const pickerDisabled = includeAll || hasCategory;

  document.getElementById("bundleToolSearch").disabled = pickerDisabled;
  document.getElementById("bundleToolPicker").style.opacity = pickerDisabled ? "0.4" : "1";
  document.getElementById("bundleToolPicker").style.pointerEvents = pickerDisabled ? "none" : "auto";
}

let bundleSelectedTools = new Set();

function renderToolPicker(filter) {
  const picker = document.getElementById("bundleToolPicker");
  const tools = filter
    ? adminTools.filter((t) => t.name.toLowerCase().includes(filter))
    : adminTools;

  picker.innerHTML = tools.map((t) => `
    <label>
      <input type="checkbox" value="${escapeHtml(t.name)}" ${bundleSelectedTools.has(t.name) ? "checked" : ""} />
      ${escapeHtml(t.name)} <span style="color:var(--text-dimmer)">(${escapeHtml(t.category)})</span>
    </label>
  `).join("");

  picker.querySelectorAll('input[type="checkbox"]').forEach((cb) => {
    cb.addEventListener("change", () => {
      if (cb.checked) bundleSelectedTools.add(cb.value);
      else bundleSelectedTools.delete(cb.value);
    });
  });
}

function openBundleModal(bundle) {
  const modal = document.getElementById("bundleModal");
  const form = document.getElementById("bundleForm");
  form.reset();
  document.getElementById("bundleFormError").hidden = true;

  document.getElementById("bundleModalTitle").textContent = bundle ? "Edit Bundle" : "Add New Bundle";
  document.getElementById("bundleDbId").value = bundle ? bundle.id : "";
  document.getElementById("bundleName").value = bundle ? bundle.name : "";
  document.getElementById("bundleSlug").value = bundle ? bundle.bundle_id : "";
  document.getElementById("bundleSlug").disabled = !!bundle;
  document.getElementById("bundleIcon").value = bundle ? (bundle.icon || "") : "";
  document.getElementById("bundleTag").value = bundle ? (bundle.tag || "") : "";
  document.getElementById("bundleDesc").value = bundle ? (bundle.description || "") : "";
  document.getElementById("bundlePrice").value = bundle ? bundle.price : "";
  document.getElementById("bundlePriceUsd").value = bundle ? (bundle.price_usd || "") : "";
  document.getElementById("bundleIncludeAll").checked = bundle ? !!bundle.include_all : false;
  document.getElementById("bundleCategoryMatch").value = bundle ? (bundle.category_match || "") : "";
  document.getElementById("deleteBundleBtn").hidden = !bundle;

  bundleSelectedTools = new Set(bundle && bundle.included_tools ? bundle.included_tools : []);
  document.getElementById("bundleToolSearch").value = "";
  renderToolPicker("");
  updateBundlePickerState();

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeBundleModal() {
  document.getElementById("bundleModal").hidden = true;
  document.body.style.overflow = "";
}

function initBundleForm() {
  const form = document.getElementById("bundleForm");
  const errorEl = document.getElementById("bundleFormError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const dbId = document.getElementById("bundleDbId").value;
    const includeAll = document.getElementById("bundleIncludeAll").checked;
    const categoryMatch = document.getElementById("bundleCategoryMatch").value || null;

    const payload = {
      name: document.getElementById("bundleName").value.trim(),
      icon: document.getElementById("bundleIcon").value.trim(),
      tag: document.getElementById("bundleTag").value.trim() || null,
      description: document.getElementById("bundleDesc").value.trim(),
      price: Number(document.getElementById("bundlePrice").value),
      price_usd: document.getElementById("bundlePriceUsd").value.trim() ? Number(document.getElementById("bundlePriceUsd").value) : null,
      include_all: includeAll,
      category_match: includeAll ? null : categoryMatch,
      included_tools: (includeAll || categoryMatch) ? null : Array.from(bundleSelectedTools)
    };

    let result;
    if (dbId) {
      result = await sb.from("bundles").update(payload).eq("id", dbId);
    } else {
      payload.bundle_id = slugify(document.getElementById("bundleSlug").value.trim());
      payload.sort_order = adminBundles.length ? Math.max(...adminBundles.map((b) => b.sort_order || 0)) + 1 : 1;
      result = await sb.from("bundles").insert(payload);
    }

    if (result.error) {
      errorEl.textContent = result.error.message;
      errorEl.hidden = false;
      return;
    }

    closeBundleModal();
    await loadDashboardData();
  });

  document.getElementById("deleteBundleBtn").addEventListener("click", async () => {
    const dbId = document.getElementById("bundleDbId").value;
    if (!dbId) return;
    if (!confirm("Permanently delete this bundle plan?")) return;

    const { error } = await sb.from("bundles").delete().eq("id", dbId);
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    closeBundleModal();
    await loadDashboardData();
  });
}

/* ==========================================================
   GUIDES
   ========================================================== */
function renderGuidesTable(guides) {
  const tbody = document.getElementById("guidesTableBody");
  if (!tbody) return;
  document.getElementById("guidesCount").textContent = guides.length;

  tbody.innerHTML = guides.map((g) => {
    const tool = adminTools.find((t) => t.slug === g.tool_slug);
    return `
      <tr data-id="${g.id}">
        <td data-label="Icon" class="admin-td-icon">${g.icon || "📄"}</td>
        <td data-label="Title">${escapeHtml(g.title)}</td>
        <td data-label="Tool">${tool ? escapeHtml(tool.name) : "—"}</td>
        <td data-label="Published">${g.published ? "✅" : "—"}</td>
        <td class="admin-td-actions"><button type="button" class="admin-row-edit" data-edit-guide="${g.id}">Edit</button></td>
      </tr>
    `;
  }).join("");

  tbody.querySelectorAll("[data-edit-guide]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const guide = adminGuides.find((g) => g.id === btn.dataset.editGuide);
      openGuideModal(guide);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const addGuideBtn = document.getElementById("addGuideBtn");
  if (addGuideBtn) addGuideBtn.addEventListener("click", () => openGuideModal(null));
});

function openGuideModal(guide) {
  const modal = document.getElementById("guideModal");
  const form = document.getElementById("guideForm");
  form.reset();
  document.getElementById("guideFormError").hidden = true;

  document.getElementById("guideModalTitle").textContent = guide ? "Edit Guide" : "Add New Guide";
  document.getElementById("guideDbId").value = guide ? guide.id : "";
  document.getElementById("guideTitle").value = guide ? guide.title : "";
  document.getElementById("guideSlug").value = guide ? guide.slug : "";
  document.getElementById("guideSlug").disabled = !!guide;
  document.getElementById("guideToolSlug").value = guide ? (guide.tool_slug || "") : "";
  document.getElementById("guideIconInput").value = guide ? (guide.icon || "") : "";
  document.getElementById("guidePublished").checked = guide ? !!guide.published : true;
  document.getElementById("guideExcerptInput").value = guide ? (guide.excerpt || "") : "";
  document.getElementById("guideMetaDesc").value = guide ? (guide.meta_description || "") : "";
  document.getElementById("guideFocusKeyword").value = guide ? (guide.focus_keyword || "") : "";
  document.getElementById("guideContent").value = guide ? guide.content : "";
  document.getElementById("deleteGuideBtn").hidden = !guide;

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeGuideModal() {
  document.getElementById("guideModal").hidden = true;
  document.body.style.overflow = "";
}

function initGuideForm() {
  const form = document.getElementById("guideForm");
  const errorEl = document.getElementById("guideFormError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const dbId = document.getElementById("guideDbId").value;

    const payload = {
      title: document.getElementById("guideTitle").value.trim(),
      tool_slug: document.getElementById("guideToolSlug").value || null,
      icon: document.getElementById("guideIconInput").value.trim() || null,
      published: document.getElementById("guidePublished").checked,
      excerpt: document.getElementById("guideExcerptInput").value.trim(),
      meta_description: document.getElementById("guideMetaDesc").value.trim(),
      focus_keyword: document.getElementById("guideFocusKeyword").value.trim() || null,
      content: document.getElementById("guideContent").value.trim()
    };

    let result;
    if (dbId) {
      result = await sb.from("guides").update(payload).eq("id", dbId);
    } else {
      payload.slug = slugify(document.getElementById("guideSlug").value.trim());
      payload.sort_order = adminGuides.length ? Math.max(...adminGuides.map((g) => g.sort_order || 0)) + 1 : 1;
      result = await sb.from("guides").insert(payload);
    }

    if (result.error) {
      errorEl.textContent = result.error.message;
      errorEl.hidden = false;
      return;
    }

    closeGuideModal();
    await loadDashboardData();
  });

  document.getElementById("deleteGuideBtn").addEventListener("click", async () => {
    const dbId = document.getElementById("guideDbId").value;
    if (!dbId) return;
    if (!confirm("Permanently delete this guide?")) return;

    const { error } = await sb.from("guides").delete().eq("id", dbId);
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    closeGuideModal();
    await loadDashboardData();
  });
}

/* ==========================================================
   PAYMENT METHODS
   ========================================================== */
function renderPaymentMethodsTable(methods) {
  const tbody = document.getElementById("paymentMethodsTableBody");
  if (!tbody) return;
  document.getElementById("paymentMethodsCount").textContent = methods.length;

  tbody.innerHTML = methods.map((m) => `
    <tr data-id="${m.id}">
      <td data-label="Currency">${escapeHtml(m.currency)}${m.currency === "USD" && m.show_in_pakistan ? ` <span class="admin-table-badge admin-badge-green">+PK</span>` : ""}</td>
      <td data-label="Type">${escapeHtml(m.payment_type)}</td>
      <td data-label="Method">${escapeHtml(m.method_name)}</td>
      <td data-label="Account">${escapeHtml(m.account_id)}</td>
      <td data-label="Active">${m.active ? "✅" : "—"}</td>
      <td class="admin-td-actions"><button type="button" class="admin-row-edit" data-edit-payment-method="${m.id}">Edit</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit-payment-method]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const method = adminPaymentMethods.find((m) => m.id === btn.dataset.editPaymentMethod);
      openPaymentMethodModal(method);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addPaymentMethodBtn");
  if (addBtn) addBtn.addEventListener("click", () => openPaymentMethodModal(null));
});

function openPaymentMethodModal(method) {
  const modal = document.getElementById("paymentMethodModal");
  const form = document.getElementById("paymentMethodForm");
  form.reset();
  document.getElementById("paymentMethodFormError").hidden = true;

  document.getElementById("paymentMethodModalTitle").textContent = method ? "Edit Payment Method" : "Add New Payment Method";
  document.getElementById("paymentMethodId").value = method ? method.id : "";
  document.getElementById("paymentMethodCurrency").value = method ? method.currency : "PKR";
  document.getElementById("paymentMethodType").value = method ? method.payment_type : "";
  document.getElementById("paymentMethodName").value = method ? method.method_name : "";
  document.getElementById("paymentMethodAccountId").value = method ? method.account_id : "";
  document.getElementById("paymentMethodHolder").value = method ? (method.account_holder || "") : "";
  document.getElementById("paymentMethodIban").value = method ? (method.iban || "") : "";
  document.getElementById("paymentMethodActive").checked = method ? !!method.active : true;
  document.getElementById("paymentMethodShowPk").checked = method ? !!method.show_in_pakistan : false;
  document.getElementById("deletePaymentMethodBtn").hidden = !method;
  toggleShowPkVisibility();

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

/* The "also show to Pakistan" option only makes sense for an international
   (USD) method — a PKR method is already shown to Pakistan visitors. */
function toggleShowPkVisibility() {
  const isUsd = document.getElementById("paymentMethodCurrency").value === "USD";
  document.getElementById("paymentMethodShowPkWrap").hidden = !isUsd;
  if (!isUsd) document.getElementById("paymentMethodShowPk").checked = false;
}

function closePaymentMethodModal() {
  document.getElementById("paymentMethodModal").hidden = true;
  document.body.style.overflow = "";
}

function initPaymentMethodForm() {
  const form = document.getElementById("paymentMethodForm");
  const errorEl = document.getElementById("paymentMethodFormError");

  document.getElementById("paymentMethodCurrency").addEventListener("change", toggleShowPkVisibility);

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const id = document.getElementById("paymentMethodId").value;
    const currency = document.getElementById("paymentMethodCurrency").value;

    const payload = {
      currency,
      payment_type: document.getElementById("paymentMethodType").value.trim(),
      method_name: document.getElementById("paymentMethodName").value.trim(),
      account_id: document.getElementById("paymentMethodAccountId").value.trim(),
      account_holder: document.getElementById("paymentMethodHolder").value.trim() || null,
      iban: document.getElementById("paymentMethodIban").value.trim() || null,
      active: document.getElementById("paymentMethodActive").checked,
      show_in_pakistan: currency === "USD" && document.getElementById("paymentMethodShowPk").checked
    };

    let result;
    if (id) {
      result = await sb.from("payment_methods").update(payload).eq("id", id);
    } else {
      payload.sort_order = adminPaymentMethods.length ? Math.max(...adminPaymentMethods.map((m) => m.sort_order || 0)) + 1 : 1;
      result = await sb.from("payment_methods").insert(payload);
    }

    if (result.error) {
      errorEl.textContent = result.error.message;
      errorEl.hidden = false;
      return;
    }

    closePaymentMethodModal();
    await loadDashboardData();
  });

  document.getElementById("deletePaymentMethodBtn").addEventListener("click", async () => {
    const id = document.getElementById("paymentMethodId").value;
    if (!id) return;
    if (!confirm("Remove this payment method? Visitors will no longer see it at checkout.")) return;

    const { error } = await sb.from("payment_methods").delete().eq("id", id);
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    closePaymentMethodModal();
    await loadDashboardData();
  });
}

/* ==========================================================
   TRUST BADGES
   ========================================================== */
function renderTrustBadgesTable(badges) {
  const tbody = document.getElementById("trustBadgesTableBody");
  if (!tbody) return;
  document.getElementById("trustBadgesCount").textContent = badges.length;

  tbody.innerHTML = badges.map((b) => `
    <tr data-id="${b.id}">
      <td data-label="Icon">${escapeHtml(b.icon || "")}</td>
      <td data-label="Label">${escapeHtml(b.label)}</td>
      <td data-label="Active">${b.active ? "✅" : "—"}</td>
      <td class="admin-td-actions"><button type="button" class="admin-row-edit" data-edit-trust-badge="${b.id}">Edit</button></td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit-trust-badge]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const badge = adminTrustBadges.find((b) => b.id === btn.dataset.editTrustBadge);
      openTrustBadgeModal(badge);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addTrustBadgeBtn");
  if (addBtn) addBtn.addEventListener("click", () => openTrustBadgeModal(null));
});

function openTrustBadgeModal(badge) {
  const modal = document.getElementById("trustBadgeModal");
  const form = document.getElementById("trustBadgeForm");
  form.reset();
  document.getElementById("trustBadgeFormError").hidden = true;

  document.getElementById("trustBadgeModalTitle").textContent = badge ? "Edit Badge" : "Add New Badge";
  document.getElementById("trustBadgeId").value = badge ? badge.id : "";
  document.getElementById("trustBadgeIcon").value = badge ? (badge.icon || "") : "";
  document.getElementById("trustBadgeLabel").value = badge ? badge.label : "";
  document.getElementById("trustBadgeActive").checked = badge ? !!badge.active : true;
  document.getElementById("deleteTrustBadgeBtn").hidden = !badge;

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeTrustBadgeModal() {
  document.getElementById("trustBadgeModal").hidden = true;
  document.body.style.overflow = "";
}

function initTrustBadgeForm() {
  const form = document.getElementById("trustBadgeForm");
  const errorEl = document.getElementById("trustBadgeFormError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const id = document.getElementById("trustBadgeId").value;

    const payload = {
      icon: document.getElementById("trustBadgeIcon").value.trim() || null,
      label: document.getElementById("trustBadgeLabel").value.trim(),
      active: document.getElementById("trustBadgeActive").checked
    };

    let result;
    if (id) {
      result = await sb.from("trust_badges").update(payload).eq("id", id);
    } else {
      payload.sort_order = adminTrustBadges.length ? Math.max(...adminTrustBadges.map((b) => b.sort_order || 0)) + 1 : 1;
      result = await sb.from("trust_badges").insert(payload);
    }

    if (result.error) {
      errorEl.textContent = result.error.message;
      errorEl.hidden = false;
      return;
    }

    closeTrustBadgeModal();
    await loadDashboardData();
  });

  document.getElementById("deleteTrustBadgeBtn").addEventListener("click", async () => {
    const id = document.getElementById("trustBadgeId").value;
    if (!id) return;
    if (!confirm("Remove this badge? Visitors will no longer see it.")) return;

    const { error } = await sb.from("trust_badges").delete().eq("id", id);
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    closeTrustBadgeModal();
    await loadDashboardData();
  });
}

/* ==========================================================
   ORDERS
   ========================================================== */
function renderOrdersTable(orders) {
  const tbody = document.getElementById("ordersTableBody");
  if (!tbody) return;
  document.getElementById("ordersCount").textContent = orders.length;

  const statusBadge = { pending: "🟡 Pending", confirmed: "✅ Confirmed", cancelled: "⛔ Cancelled" };

  tbody.innerHTML = orders.map((o) => `
    <tr data-id="${o.id}">
      <td data-label="Date">${o.created_at ? new Date(o.created_at).toLocaleDateString() : "—"}</td>
      <td data-label="Customer">${escapeHtml(o.customer_name || "—")}<br><span class="admin-td-sub">${escapeHtml(o.customer_contact || "")}</span></td>
      <td data-label="Item">${escapeHtml(o.item_name)}</td>
      <td data-label="Plan">${escapeHtml(o.plan_label || "—")}</td>
      <td data-label="Price">${o.currency === "USD" ? "$" : "PKR "}${Number(o.price).toLocaleString()}</td>
      <td data-label="Method">${escapeHtml(o.payment_method || "—")}</td>
      <td data-label="Proof">${o.transaction_id ? `TRX: ${escapeHtml(o.transaction_id)}` : (o.screenshot_url ? "📎 See Edit" : "—")}</td>
      <td data-label="Status">${statusBadge[o.status] || escapeHtml(o.status)}</td>
      <td class="admin-td-actions">
        ${o.status === "pending" ? `<button type="button" class="admin-row-approve" data-approve-order="${o.id}">✓ Approve</button>` : ""}
        <button type="button" class="admin-row-edit" data-edit-order="${o.id}">Edit</button>
      </td>
    </tr>
  `).join("");

  tbody.querySelectorAll("[data-edit-order]").forEach((btn) => {
    btn.addEventListener("click", () => {
      const order = adminOrders.find((o) => o.id === btn.dataset.editOrder);
      openOrderModal(order);
    });
  });

  tbody.querySelectorAll("[data-approve-order]").forEach((btn) => {
    btn.addEventListener("click", async () => {
      btn.disabled = true;
      btn.textContent = "Approving...";
      const { error } = await sb.from("orders").update({ status: "confirmed" }).eq("id", btn.dataset.approveOrder);
      if (error) {
        alert("Failed to approve order: " + error.message);
        btn.disabled = false;
        btn.textContent = "✓ Approve";
        return;
      }
      await loadDashboardData();
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  const addBtn = document.getElementById("addOrderBtn");
  if (addBtn) addBtn.addEventListener("click", () => openOrderModal(null));
});

function openOrderModal(order) {
  const modal = document.getElementById("orderModal");
  const form = document.getElementById("orderForm");
  form.reset();
  document.getElementById("orderFormError").hidden = true;

  document.getElementById("orderModalTitle").textContent = order ? "Edit Order" : "Add Order";
  document.getElementById("orderId").value = order ? order.id : "";
  document.getElementById("orderItemType").value = order ? order.item_type : "tool";
  document.getElementById("orderCurrency").value = order ? order.currency : "PKR";
  document.getElementById("orderItemName").value = order ? order.item_name : "";
  document.getElementById("orderPlanLabel").value = order ? (order.plan_label || "") : "";
  document.getElementById("orderPrice").value = order ? order.price : "";
  document.getElementById("orderStatus").value = order ? order.status : "pending";
  document.getElementById("orderPaymentMethod").value = order ? (order.payment_method || "") : "";
  document.getElementById("orderCustomerName").value = order ? (order.customer_name || "") : "";
  document.getElementById("orderCustomerContact").value = order ? (order.customer_contact || "") : "";
  document.getElementById("orderNotes").value = order ? (order.notes || "") : "";
  document.getElementById("deleteOrderBtn").hidden = !order;

  const proofBox = document.getElementById("orderPaymentProof");
  const mediaWrap = document.getElementById("orderProofMediaWrap");
  const hasProof = order && (order.transaction_id || order.screenshot_url);
  proofBox.hidden = !hasProof;
  if (hasProof) {
    document.getElementById("orderProofTransactionId").textContent = order.transaction_id
      ? `Transaction ID: ${order.transaction_id}`
      : "No transaction ID submitted.";
    if (order.screenshot_url) {
      const thumb = document.getElementById("orderProofThumb");
      thumb.src = order.screenshot_url;
      document.getElementById("orderProofDownload").href = order.screenshot_url;
      mediaWrap.hidden = false;
    } else {
      mediaWrap.hidden = true;
    }
  }

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeOrderModal() {
  document.getElementById("orderModal").hidden = true;
  document.body.style.overflow = "";
}

function initOrderForm() {
  const form = document.getElementById("orderForm");
  const errorEl = document.getElementById("orderFormError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    errorEl.hidden = true;

    const id = document.getElementById("orderId").value;

    const payload = {
      item_type: document.getElementById("orderItemType").value,
      currency: document.getElementById("orderCurrency").value,
      item_name: document.getElementById("orderItemName").value.trim(),
      plan_label: document.getElementById("orderPlanLabel").value.trim() || null,
      price: Number(document.getElementById("orderPrice").value),
      status: document.getElementById("orderStatus").value,
      payment_method: document.getElementById("orderPaymentMethod").value.trim() || null,
      customer_name: document.getElementById("orderCustomerName").value.trim() || null,
      customer_contact: document.getElementById("orderCustomerContact").value.trim() || null,
      notes: document.getElementById("orderNotes").value.trim() || null
    };

    let result;
    if (id) {
      result = await sb.from("orders").update(payload).eq("id", id);
    } else {
      result = await sb.from("orders").insert(payload);
    }

    if (result.error) {
      errorEl.textContent = result.error.message;
      errorEl.hidden = false;
      return;
    }

    closeOrderModal();
    await loadDashboardData();
  });

  document.getElementById("deleteOrderBtn").addEventListener("click", async () => {
    const id = document.getElementById("orderId").value;
    if (!id) return;
    if (!confirm("Permanently delete this order?")) return;

    const { error } = await sb.from("orders").delete().eq("id", id);
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    closeOrderModal();
    await loadDashboardData();
  });
}

/* ==========================================================
   SETTINGS
   ========================================================== */
function populateSettingsForm() {
  document.getElementById("setSiteColor").value = adminSettings.site_accent_color || DEFAULT_ACCENT;
  markActiveSwatch(adminSettings.site_accent_color || DEFAULT_ACCENT);
  applySiteTheme(adminSettings.site_accent_color, { cache: true });
  document.getElementById("setWhatsapp").value = adminSettings.whatsapp_number || "";
  document.getElementById("setWhatsappCommunity").value = adminSettings.whatsapp_community_link || "";
  document.getElementById("setCommunityPopupTitle").value = adminSettings.community_popup_title || "";
  document.getElementById("setCommunityPopupMessage").value = adminSettings.community_popup_message || "";
  document.getElementById("setCommunityPopupButton").value = adminSettings.community_popup_button || "";
  document.getElementById("setCommunityPopupLaterText").value = adminSettings.community_popup_later_text || "";
  document.getElementById("setCommunityPopupDelay").value = adminSettings.community_popup_delay || "";
  document.getElementById("setCommunityPopupFrequency").value = adminSettings.community_popup_frequency || "once";
  document.getElementById("setCommunityPopupEnabled").checked = adminSettings.community_popup_enabled !== "false";
  document.getElementById("setPriceMonthly").value = adminSettings.price_monthly || "";
  document.getElementById("setPriceHalfYearly").value = adminSettings.price_half_yearly || "";
  document.getElementById("setPriceYearly").value = adminSettings.price_yearly || "";
  document.getElementById("setPriceMonthlyUsd").value = adminSettings.price_monthly_usd || "";
  document.getElementById("setPriceHalfYearlyUsd").value = adminSettings.price_half_yearly_usd || "";
  document.getElementById("setPriceYearlyUsd").value = adminSettings.price_yearly_usd || "";
}

function markActiveSwatch(color) {
  document.querySelectorAll("#siteColorSwatches .admin-color-swatch").forEach((b) => {
    b.classList.toggle("active", b.dataset.color.toLowerCase() === String(color).toLowerCase());
  });
}

function initSiteColorPicker() {
  const input = document.getElementById("setSiteColor");
  const preview = (color) => {
    input.value = color;
    markActiveSwatch(color);
    applySiteTheme(color);
  };
  document.querySelectorAll("#siteColorSwatches .admin-color-swatch").forEach((b) => {
    b.addEventListener("click", () => preview(b.dataset.color));
  });
  input.addEventListener("input", () => preview(input.value));
}

function initSettingsForm() {
  initSiteColorPicker();
  document.getElementById("settingsForm").addEventListener("submit", async (e) => {
    e.preventDefault();

    const siteColor = document.getElementById("setSiteColor").value.toLowerCase();
    const rows = [
      { key: "site_accent_color", value: siteColor === DEFAULT_ACCENT ? "" : siteColor },
      { key: "whatsapp_number", value: document.getElementById("setWhatsapp").value.trim() },
      { key: "whatsapp_community_link", value: document.getElementById("setWhatsappCommunity").value.trim() },
      { key: "community_popup_title", value: document.getElementById("setCommunityPopupTitle").value.trim() },
      { key: "community_popup_message", value: document.getElementById("setCommunityPopupMessage").value.trim() },
      { key: "community_popup_button", value: document.getElementById("setCommunityPopupButton").value.trim() },
      { key: "community_popup_later_text", value: document.getElementById("setCommunityPopupLaterText").value.trim() },
      { key: "community_popup_delay", value: document.getElementById("setCommunityPopupDelay").value.trim() },
      { key: "community_popup_frequency", value: document.getElementById("setCommunityPopupFrequency").value },
      { key: "community_popup_enabled", value: document.getElementById("setCommunityPopupEnabled").checked ? "true" : "false" },
      { key: "price_monthly", value: document.getElementById("setPriceMonthly").value.trim() },
      { key: "price_half_yearly", value: document.getElementById("setPriceHalfYearly").value.trim() },
      { key: "price_yearly", value: document.getElementById("setPriceYearly").value.trim() },
      { key: "price_monthly_usd", value: document.getElementById("setPriceMonthlyUsd").value.trim() },
      { key: "price_half_yearly_usd", value: document.getElementById("setPriceHalfYearlyUsd").value.trim() },
      { key: "price_yearly_usd", value: document.getElementById("setPriceYearlyUsd").value.trim() }
    ];

    const { error } = await sb.from("settings").upsert(rows, { onConflict: "key" });

    const msg = document.getElementById("settingsSaveMsg");
    if (error) {
      msg.textContent = "✗ " + error.message;
      msg.style.color = "#ef4444";
    } else {
      msg.textContent = "✓ Saved";
      msg.style.color = "#22c55e";
      applySiteTheme(siteColor, { cache: true });
      adminSettings.site_accent_color = siteColor === DEFAULT_ACCENT ? "" : siteColor;
    }
    msg.hidden = false;
    setTimeout(() => { msg.hidden = true; }, 2500);
  });
}

/* ==========================================================
   ADMIN PROFILE — the logged-in admin's own name/email/password
   ========================================================== */
function initAdminProfileForm() {
  const form = document.getElementById("adminProfileForm");
  if (!form) return;
  const msg = document.getElementById("adminProfileSaveMsg");

  const showMsg = (text, ok) => {
    msg.textContent = text;
    msg.style.color = ok ? "#22c55e" : "#ef4444";
    msg.hidden = false;
    setTimeout(() => { msg.hidden = true; }, 4000);
  };

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const name = document.getElementById("adminProfileName").value.trim();
    const email = document.getElementById("adminProfileEmailInput").value.trim();
    const newPassword = document.getElementById("adminProfileNewPassword").value;
    const confirmPassword = document.getElementById("adminProfileConfirmPassword").value;

    if (newPassword || confirmPassword) {
      if (newPassword.length < 6) return showMsg("✗ New password must be at least 6 characters", false);
      if (newPassword !== confirmPassword) return showMsg("✗ Passwords don't match", false);
    }

    const { data: { user } } = await sb.auth.getUser();
    if (!user) return;

    const authUpdates = { data: { full_name: name } };
    if (email && email !== user.email) authUpdates.email = email;
    if (newPassword) authUpdates.password = newPassword;

    const { error: authError } = await sb.auth.updateUser(authUpdates);
    if (authError) return showMsg("✗ " + authError.message, false);

    const { error: profileError } = await sb.from("profiles").update({ full_name: name }).eq("id", user.id);
    if (profileError) return showMsg("✗ " + profileError.message, false);

    document.getElementById("adminProfileNewPassword").value = "";
    document.getElementById("adminProfileConfirmPassword").value = "";

    showMsg(
      authUpdates.email ? "✓ Saved — check your new email to confirm the change" : "✓ Saved",
      true
    );
  });

  const forgotBtn = document.getElementById("adminForgotPasswordBtn");
  if (forgotBtn) {
    forgotBtn.addEventListener("click", async () => {
      const { data: { user } } = await sb.auth.getUser();
      if (!user || !user.email) return;
      const { error } = await sb.auth.resetPasswordForEmail(user.email, {
        redirectTo: window.location.origin + window.location.pathname
      });
      showMsg(error ? "✗ " + error.message : "✓ Password reset link sent to your email", !error);
    });
  }

  const logoutBtn = document.getElementById("adminProfileLogoutBtn");
  if (logoutBtn) logoutBtn.addEventListener("click", () => sb.auth.signOut());
}

/* ---------- Modal close wiring ---------- */
function initModals() {
  document.querySelectorAll("[data-modal-close]").forEach((el) => {
    el.addEventListener("click", () => {
      closeToolModal();
      closeBundleModal();
      closeGuideModal();
      closePaymentMethodModal();
      closeTrustBadgeModal();
      closeOrderModal();
    });
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeToolModal();
      closeBundleModal();
      closeGuideModal();
      closePaymentMethodModal();
      closeTrustBadgeModal();
      closeOrderModal();
      closeLightbox();
    }
  });

  document.querySelectorAll("[data-lightbox-close]").forEach((el) => {
    el.addEventListener("click", closeLightbox);
  });
  const orderThumb = document.getElementById("orderProofThumb");
  if (orderThumb) orderThumb.addEventListener("click", () => openLightbox(orderThumb.src));
}

/* ---------- Screenshot lightbox (Orders table + Order modal) ---------- */
function openLightbox(src) {
  document.getElementById("lightboxImg").src = src;
  document.getElementById("lightboxDownload").href = src;
  document.getElementById("screenshotLightbox").hidden = false;
  document.body.style.overflow = "hidden";
}

function closeLightbox() {
  const modal = document.getElementById("screenshotLightbox");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

/* Offers the browser's native "Save password?" prompt so the admin
   doesn't have to retype credentials every visit. Best-effort only. */
function storeCredential(email, password, name) {
  if (!window.PasswordCredential || !navigator.credentials) return;
  try {
    const cred = new PasswordCredential({ id: email, password, name: name || email });
    navigator.credentials.store(cred);
  } catch (_) { /* best-effort */ }
}

function numOrNull(value) {
  const trimmed = String(value).trim();
  return trimmed === "" ? null : Number(trimmed);
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}
