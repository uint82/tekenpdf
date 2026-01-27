export function initTheme() {
  setupThemeButton("theme-toggle");
}

export function setupThemeButton(btnId: string) {
  const btn = document.getElementById(btnId);
  if (!btn) return;

  updateIcon(btn);

  btn.onclick = () => {
    toggleTheme();
    updateIcon(btn);

    const otherBtnId =
      btnId === "theme-toggle" ? "theme-toggle-sidebar" : "theme-toggle";
    const otherBtn = document.getElementById(otherBtnId);
    if (otherBtn) updateIcon(otherBtn);
  };
}

function toggleTheme() {
  const root = document.documentElement;
  const current = root.getAttribute("data-theme");
  const next = current === "dark" ? "light" : "dark";

  root.setAttribute("data-theme", next);
  localStorage.setItem("theme", next);
}

function updateIcon(btn: HTMLElement) {
  const isDark = document.documentElement.getAttribute("data-theme") === "dark";

  if (isDark) {
    btn.innerHTML = '<i class="fa-solid fa-sun"></i>';
  } else {
    btn.innerHTML = '<i class="fa-solid fa-moon"></i>';
  }
}
