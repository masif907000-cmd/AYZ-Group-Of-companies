/* ==========================================================
   AYZ Software Agency — Light/Dark theme toggle
   (Initial theme is already applied by the inline script in <head>
    to avoid a flash of the wrong theme before CSS/JS loads.)
   ========================================================== */

document.addEventListener("DOMContentLoaded", () => {
  const buttons = [
    document.getElementById("themeToggle"),
    document.getElementById("themeToggleMobile")
  ].filter(Boolean);

  buttons.forEach((btn) => {
    btn.addEventListener("click", toggleTheme);
  });
});

function toggleTheme() {
  const root = document.documentElement;
  const next = root.getAttribute("data-theme") === "light" ? "dark" : "light";

  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);

  document.dispatchEvent(new CustomEvent("themechange", { detail: { theme: next } }));
}
