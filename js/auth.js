/* ==========================================================
   AYZ Software Agency — Customer accounts (signup/login)
   Browsing never requires login — this only gates the moment
   someone starts a purchase (see requireAuth(), called from
   openCheckout()/openBundleCheckout()).
   ========================================================== */

let currentUser = null;
let currentProfile = null;
let _authResolvers = [];

/* Holds { email, password, fullName, phone } between "Sign Up" and
   entering the emailed 6-digit code — cleared once verified. */
let pendingSignup = null;

document.addEventListener("DOMContentLoaded", () => {
  initAuthMenu();
  initAuthModal();
  initMyAccountModal();
  initPasswordToggles();

  sb.auth.onAuthStateChange((event, session) => {
    currentUser = session ? session.user : null;
    updateAuthMenu();
    if (currentUser) loadCurrentProfile();
    else currentProfile = null;

    /* Supabase redirects here with #...type=recovery after the visitor
       clicks the link in a "forgot password" email — this is the one
       moment we show the "set new password" view unprompted. */
    if (event === "PASSWORD_RECOVERY") {
      openAuthModal("reset");
    }
  });
});

async function loadCurrentProfile() {
  if (!currentUser) return;
  const { data } = await sb.from("profiles").select("*").eq("id", currentUser.id).single();
  currentProfile = data || null;
}

/* Saves name/phone right after signup (both the immediate-session path
   and the OTP-verify path use this). Sets currentProfile from the values
   we already have in hand FIRST — the DB write is real and awaited, but
   the in-memory profile no longer depends on a round-trip re-fetch
   succeeding to reflect what the visitor just typed, and a failed write
   is now logged instead of silently vanishing. */
async function saveProfileDetails(userId, fullName, phone) {
  currentProfile = { ...(currentProfile || {}), id: userId, full_name: fullName, phone };
  const { error } = await sb.from("profiles").update({ full_name: fullName, phone }).eq("id", userId);
  if (error) console.error("Failed to save profile after signup:", error);
}

/* ---------- Header account menu (Login link / Logout) ----------
   Each of these exists twice per page — once in the desktop header's
   account-menu dropdown, once in the mobile hamburger menu (the mobile
   nav previously had no login/account entry point at all) — so every
   selector here covers both. */
function initAuthMenu() {
  document.querySelectorAll("#authLoginLink, #navMobileLoginLink").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openAuthModal("login");
    });
  });
  document.querySelectorAll("#authLogoutLink, #navMobileLogoutLink").forEach((link) => {
    link.addEventListener("click", async (e) => {
      e.preventDefault();
      await sb.auth.signOut();
    });
  });
}

function updateAuthMenu() {
  const heading = document.getElementById("authMenuHeading");
  if (heading) heading.textContent = currentUser ? currentUser.email : "My Account";

  document.querySelectorAll("#authLoginLink, #navMobileLoginLink").forEach((el) => { el.hidden = !!currentUser; });
  document.querySelectorAll("#myAccountLink, #navMobileMyAccountLink").forEach((el) => { el.hidden = !currentUser; });
  document.querySelectorAll("#authLogoutLink, #navMobileLogoutLink").forEach((el) => { el.hidden = !currentUser; });
}

/* ---------- My Account: profile edit, password change, order history ----------
   Opened only for a logged-in customer via the "👤 My Account" link that
   updateAuthMenu() reveals in place of "Login / Sign Up". */
function initMyAccountModal() {
  const modal = document.getElementById("myAccountModal");
  if (!modal) return;

  modal.querySelectorAll("[data-my-account-close]").forEach((el) => {
    el.addEventListener("click", closeMyAccountModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeMyAccountModal();
  });

  document.querySelectorAll("#myAccountLink, #navMobileMyAccountLink").forEach((link) => {
    link.addEventListener("click", (e) => {
      e.preventDefault();
      openMyAccountModal();
    });
  });

  const form = document.getElementById("myAccountProfileForm");
  const errorEl = document.getElementById("myAccountFormError");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (!currentUser) return;
    errorEl.hidden = true;

    const name = document.getElementById("myAccountName").value.trim();
    const email = document.getElementById("myAccountEmailInput").value.trim();
    const phone = document.getElementById("myAccountPhone").value.trim();

    const showError = (msg) => { errorEl.style.color = "#ef4444"; errorEl.textContent = msg; errorEl.hidden = false; };
    const showSuccess = (msg) => { errorEl.style.color = "#22c55e"; errorEl.textContent = msg; errorEl.hidden = false; };

    /* Password changes only happen via the "forgot password" email link
       below, never a plain form field here — anyone who gets hold of a
       logged-in session (a shared device, a support handoff) shouldn't
       be able to silently lock the real owner out by setting a new one. */
    const authUpdates = { data: { full_name: name, phone } };
    if (email && email !== currentUser.email) authUpdates.email = email;

    const { error: authError } = await sb.auth.updateUser(authUpdates);
    if (authError) return showError(authError.message);

    const { error: profileError } = await sb.from("profiles").update({ full_name: name, phone }).eq("id", currentUser.id);
    if (profileError) return showError(profileError.message);

    currentProfile = { ...(currentProfile || {}), full_name: name, phone };

    showSuccess(authUpdates.email ? "✓ Saved — check your new email to confirm the change" : "✓ Saved");
  });

  document.getElementById("myAccountForgotBtn").addEventListener("click", async () => {
    if (!currentUser) return;
    const { error } = await sb.auth.resetPasswordForEmail(currentUser.email, {
      redirectTo: window.location.origin + window.location.pathname
    });
    if (error) { errorEl.style.color = "#ef4444"; errorEl.textContent = error.message; errorEl.hidden = false; return; }
    errorEl.style.color = "#22c55e";
    errorEl.textContent = "✓ Password reset link sent to your email";
    errorEl.hidden = false;
  });

  document.getElementById("myAccountLogoutBtn").addEventListener("click", async () => {
    await sb.auth.signOut();
    closeMyAccountModal();
  });
}

async function openMyAccountModal() {
  const modal = document.getElementById("myAccountModal");
  if (!modal || !currentUser) return;

  if (!currentProfile) await loadCurrentProfile();

  document.getElementById("myAccountEmail").textContent = currentUser.email;
  document.getElementById("myAccountName").value = (currentProfile && currentProfile.full_name) || "";
  document.getElementById("myAccountEmailInput").value = currentUser.email || "";
  document.getElementById("myAccountPhone").value = (currentProfile && currentProfile.phone) || "";
  document.getElementById("myAccountFormError").hidden = true;

  renderMyOrders();

  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

function closeMyAccountModal() {
  const modal = document.getElementById("myAccountModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

async function renderMyOrders() {
  const wrap = document.getElementById("myAccountOrders");
  if (!wrap || !currentUser) return;

  wrap.innerHTML = `<p class="checkout-note">Loading...</p>`;

  const { data, error } = await sb.from("orders")
    .select("*")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false });

  if (error) {
    wrap.innerHTML = `<p class="checkout-note">Couldn't load your orders right now.</p>`;
    return;
  }
  if (!data || !data.length) {
    wrap.innerHTML = `<p class="checkout-note">You haven't purchased anything yet.</p>`;
    return;
  }

  const statusLabel = { pending: "⏳ Pending", confirmed: "✅ Confirmed", cancelled: "✗ Cancelled" };

  wrap.innerHTML = data.map((o) => `
    <div class="my-order-card">
      <div class="my-order-main">
        <span class="my-order-name">${escapeHtmlAuth(o.item_name)}${o.plan_label ? ` — ${escapeHtmlAuth(o.plan_label)}` : ""}</span>
        <span class="my-order-price">${escapeHtmlAuth(o.currency)} ${Number(o.price).toLocaleString()}</span>
      </div>
      <div class="my-order-sub">
        <span class="my-order-status">${statusLabel[o.status] || escapeHtmlAuth(o.status)}</span>
        <span class="my-order-date">${new Date(o.created_at).toLocaleDateString()}</span>
      </div>
    </div>
  `).join("");
}

function escapeHtmlAuth(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

/* ---------- requireAuth(): the actual purchase gate ----------
   Returns the current session immediately if already logged in.
   Otherwise opens the auth modal and resolves once login/signup
   succeeds, or resolves null if the visitor closes the modal
   without completing it (caller should bail out of checkout).
   Double-checks via sb.auth.getSession() (not just the in-memory
   currentUser) so a visitor who's actually logged in never sees the
   modal just because onAuthStateChange hasn't fired yet on this page. */
async function requireAuth() {
  /* currentProfile is fetched in the background by onAuthStateChange, so on
     a fast click right after page load currentUser can be set before it
     finishes — checkout now depends on currentProfile.full_name/phone, so
     make sure it's actually in before handing control back to the caller. */
  if (currentUser) {
    if (!currentProfile) await loadCurrentProfile();
    return currentUser;
  }

  const { data } = await sb.auth.getSession();
  if (data && data.session) {
    currentUser = data.session.user;
    await loadCurrentProfile();
    return currentUser;
  }

  return new Promise((resolve) => {
    _authResolvers.push(resolve);
    openAuthModal("login", "Please sign in to continue with your purchase.");
  });
}

function resolveAuthWaiters(user) {
  _authResolvers.forEach((resolve) => resolve(user));
  _authResolvers = [];
}

/* Offers the browser's native "Save password?" prompt (Chrome/Edge/etc.)
   so the visitor never has to retype credentials on this device again.
   Best-effort only — silently does nothing on browsers without the
   Credential Management API (e.g. Safari, Firefox). */
function storeCredential(email, password, name) {
  if (!window.PasswordCredential || !navigator.credentials) return;
  try {
    const cred = new PasswordCredential({ id: email, password, name: name || email });
    navigator.credentials.store(cred);
  } catch (_) { /* best-effort */ }
}

/* ---------- Show/hide password toggle (login, signup, reset) ---------- */
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

/* ---------- Modal ---------- */
function openAuthModal(view, introText) {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  switchAuthView(view || "login");
  document.getElementById("authIntroText").textContent =
    introText || "Log in to your account.";
  modal.hidden = false;
  document.body.style.overflow = "hidden";
}

/* Hides the modal without resolving any pending requireAuth() callers
   — used after a successful login/signup, right before resolving them
   with the real user. */
function hideAuthModalUI() {
  const modal = document.getElementById("authModal");
  if (!modal) return;
  modal.hidden = true;
  document.body.style.overflow = "";
}

/* Used by the close (X) button / backdrop / Escape — the visitor is
   dismissing the modal without completing auth, so any requireAuth()
   caller waiting on it resolves null (checkout stays closed). */
function closeAuthModal() {
  hideAuthModalUI();
  resolveAuthWaiters(null);
}

function switchAuthView(view) {
  document.querySelectorAll(".auth-tab").forEach((tab) => {
    tab.classList.toggle("active", tab.dataset.authView === view);
  });
  document.querySelectorAll(".auth-view").forEach((el) => {
    el.hidden = el.dataset.authView !== view;
  });
}

function initAuthModal() {
  const modal = document.getElementById("authModal");
  if (!modal) return;

  modal.querySelectorAll("[data-auth-close]").forEach((el) => {
    el.addEventListener("click", closeAuthModal);
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && !modal.hidden) closeAuthModal();
  });

  document.querySelectorAll(".auth-tab, [data-auth-view]").forEach((el) => {
    if (el.tagName === "BUTTON" && el.dataset.authView) {
      el.addEventListener("click", () => switchAuthView(el.dataset.authView));
    }
  });

  /* ---- Login ---- */
  document.getElementById("loginFormAuth").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("authLoginError");
    errorEl.hidden = true;

    const email = document.getElementById("authLoginEmail").value.trim();
    const password = document.getElementById("authLoginPassword").value;

    const { data, error } = await sb.auth.signInWithPassword({ email, password });
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }

    currentUser = data.user;
    await loadCurrentProfile();
    storeCredential(email, password, currentProfile && currentProfile.full_name);
    hideAuthModalUI();
    resolveAuthWaiters(currentUser);
  });

  /* ---- Sign Up ---- */
  document.getElementById("signupFormAuth").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("authSignupError");
    errorEl.hidden = true;

    const fullName = document.getElementById("authSignupName").value.trim();
    const email = document.getElementById("authSignupEmail").value.trim();
    const phone = document.getElementById("authSignupPhone").value.trim();
    const password = document.getElementById("authSignupPassword").value;
    const confirmPassword = document.getElementById("authSignupConfirmPassword").value;

    if (password !== confirmPassword) {
      errorEl.textContent = "Passwords don't match";
      errorEl.hidden = false;
      return;
    }

    const { data, error } = await sb.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName, phone } }
    });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }

    storeCredential(email, password, fullName);

    if (!data.session) {
      /* Email confirmation required — show the "enter the code" view
         instead of a magic link (see verifyFormAuth below). */
      pendingSignup = { email, password, fullName, phone };
      document.getElementById("authVerifyEmailLabel").textContent = email;
      document.getElementById("authVerifyError").hidden = true;
      document.getElementById("authVerifyResendNote").hidden = true;
      document.getElementById("authVerifyCode").value = "";
      switchAuthView("verify");
      return;
    }

    currentUser = data.user;
    await saveProfileDetails(currentUser.id, fullName, phone);
    hideAuthModalUI();
    resolveAuthWaiters(currentUser);
  });

  /* ---- Verify email (OTP code) ---- */
  document.getElementById("verifyFormAuth").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("authVerifyError");
    errorEl.hidden = true;

    if (!pendingSignup) {
      errorEl.textContent = "Session expired — please sign up again.";
      errorEl.hidden = false;
      switchAuthView("signup");
      return;
    }

    const code = document.getElementById("authVerifyCode").value.trim();
    const { data, error } = await sb.auth.verifyOtp({
      email: pendingSignup.email,
      token: code,
      type: "signup"
    });

    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }

    currentUser = data.user;
    await saveProfileDetails(currentUser.id, pendingSignup.fullName, pendingSignup.phone);
    pendingSignup = null;
    hideAuthModalUI();
    resolveAuthWaiters(currentUser);
  });

  document.getElementById("authResendCode").addEventListener("click", async () => {
    if (!pendingSignup) return;
    const errorEl = document.getElementById("authVerifyError");
    const noteEl = document.getElementById("authVerifyResendNote");
    errorEl.hidden = true;
    noteEl.hidden = true;

    const { error } = await sb.auth.resend({ type: "signup", email: pendingSignup.email });
    if (error) {
      errorEl.textContent = error.message;
      errorEl.hidden = false;
      return;
    }
    noteEl.hidden = false;
  });

  /* ---- Forgot password ---- */
  document.getElementById("forgotFormAuth").addEventListener("submit", async (e) => {
    e.preventDefault();
    const errorEl = document.getElementById("authForgotError");
    const successEl = document.getElementById("authForgotSuccess");
    errorEl.hidden = true;
    successEl.hidden = true;

    const email = document.getElementById("authForgotEmail").value.trim();
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

  /* ---- Set new password (after clicking the emailed reset link) ---- */
  const resetForm = document.getElementById("resetPasswordFormAuth");
  if (resetForm) {
    resetForm.addEventListener("submit", async (e) => {
      e.preventDefault();
      const errorEl = document.getElementById("authResetError");
      errorEl.hidden = true;

      const password = document.getElementById("authResetPassword").value;
      const { error } = await sb.auth.updateUser({ password });

      if (error) {
        errorEl.textContent = error.message;
        errorEl.hidden = false;
        return;
      }

      document.getElementById("authIntroText").textContent = "Password updated! You're all set.";
      hideAuthModalUI();
      resolveAuthWaiters(currentUser);
    });
  }
}
