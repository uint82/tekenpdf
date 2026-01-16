export function initTheme() {
  const toggleBtn = document.getElementById("theme-toggle");

  if (!toggleBtn) return;

  updateIcon(toggleBtn);

  toggleBtn.onclick = () => {
    const root = document.documentElement;
    const currentTheme = root.getAttribute("data-theme");

    const newTheme = currentTheme === "dark" ? "light" : "dark";

    root.setAttribute("data-theme", newTheme);

    localStorage.setItem("theme", newTheme);

    updateIcon(toggleBtn);
  };
}

function updateIcon(btn: HTMLElement) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  btn.textContent = isDark ? "☀️ Light" : "🌙 Dark";
}
