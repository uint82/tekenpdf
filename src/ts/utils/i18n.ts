const resources = {
  en: {
    "app.subtitle": "Secure, free, and client-side PDF signing.",
    "home.upload_title": "Upload your PDF here",
    "home.or": "or",
    "home.choose_file": "Choose File",
    "home.hint": "Max 200MB and 400 pages (Client-side only)",
    "home.no_file": "Don't have a file?",
    "home.demo_btn": "Try with Demo File",
    "home.loading": "Loading...",

    "editor.loading": "Loading...",
    "editor.back": "Back to Home",
    "editor.toolbox": "Toolbox",
    "editor.actions": "Actions",
    "editor.empty_assets":
      "No assets yet. Create a signature or upload an image first.",

    "tool.sign": "Signature",
    "tool.text": "Add Text",
    "tool.check": "Add Checkbox",
    "tool.image": "Upload Image",
    "tool.delete": "Delete Selected",

    "editor.download_btn": "Download PDF",
    "editor.download_process": "Processing...",

    "modal.title": "Create Signature",
    "modal.tab_draw": "Draw",
    "modal.tab_type": "Type",
    "modal.tab_upload": "Upload",
    "modal.draw_hint": "Draw your signature in the box above.",
    "modal.type_placeholder": "Type your name here...",
    "modal.upload_hint": "Click or Drag signature image here",
    "modal.btn_remove_img": "Remove Image",
    "modal.label_color": "Color:",
    "modal.btn_clear": "Clear",
    "modal.btn_cancel": "Cancel",
    "modal.btn_save": "Save",
  },
  id: {
    "app.subtitle": "Tanda tangan PDF aman, gratis, dan tanpa upload server.",
    "home.upload_title": "Upload PDF kamu disini",
    "home.or": "atau",
    "home.choose_file": "Pilih File",
    "home.hint": "Maksimal 200MB dan 400 lembar (Client-side only)",
    "home.no_file": "Belum punya file?",
    "home.demo_btn": "Coba Pakai File Demo",
    "home.loading": "Memuat...",

    "editor.loading": "Memuat...",
    "editor.back": "Kembali ke Home",
    "editor.toolbox": "Toolbox",
    "editor.actions": "Actions",
    "editor.empty_assets":
      "Belum ada aset. Buat tanda tangan atau upload gambar dulu.",

    "tool.sign": "Tanda Tangan",
    "tool.text": "Tambah Teks",
    "tool.check": "Tambah Ceklis",
    "tool.image": "Upload Gambar",
    "tool.delete": "Hapus Seleksi",

    "editor.download_btn": "Download PDF",
    "editor.download_process": "Memproses...",

    "modal.title": "Buat Tanda Tangan",
    "modal.tab_draw": "Gambar",
    "modal.tab_type": "Ketik",
    "modal.tab_upload": "Upload",
    "modal.draw_hint": "Gambar tanda tangan Anda di area kotak di atas.",
    "modal.type_placeholder": "Ketik nama Anda disini...",
    "modal.upload_hint": "Klik atau Drag gambar tanda tangan kesini",
    "modal.btn_remove_img": "Hapus Gambar",
    "modal.label_color": "Warna:",
    "modal.btn_clear": "Hapus",
    "modal.btn_cancel": "Batal",
    "modal.btn_save": "Simpan",
  },
} as const;

export type Language = keyof typeof resources;
export type TranslationKey = keyof typeof resources.en;

let currentLang: Language = "en";

export function initLanguage() {
  const savedLang = localStorage.getItem("lang") as Language;
  const browserLang = navigator.language.startsWith("id") ? "id" : "en";

  currentLang = savedLang || browserLang || "en";

  setLanguage(currentLang);

  setupDropdownListeners();
}

export function setLanguage(lang: Language) {
  currentLang = lang;
  localStorage.setItem("lang", lang);
  document.documentElement.setAttribute("lang", lang);

  updateDomElements();

  updateDropdownUI(lang);
}

export function t(
  key: TranslationKey,
  vars?: Record<string, string | number>,
): string {
  let text: string =
    resources[currentLang][key as keyof (typeof resources)["en"]] ||
    resources["en"][key as keyof (typeof resources)["en"]];

  if (!text) return key;

  if (vars) {
    Object.entries(vars).forEach(([k, v]) => {
      text = text.replace(new RegExp(`{${k}}`, "g"), String(v));
    });
  }

  return text;
}

function updateDomElements() {
  const elements = document.querySelectorAll("[data-i18n]");

  elements.forEach((el) => {
    const key = el.getAttribute("data-i18n") as TranslationKey;
    if (!key) return;

    const rawVars = el.getAttribute("data-i18n-vars");
    const vars = rawVars ? JSON.parse(rawVars) : undefined;

    const translatedText = t(key, vars);

    if (el.tagName === "INPUT" && (el as HTMLInputElement).type === "submit") {
      (el as HTMLInputElement).value = translatedText;
    } else if (el.children.length > 0) {
      let textNodeFound = false;
      el.childNodes.forEach((node) => {
        if (
          node.nodeType === Node.TEXT_NODE &&
          node.textContent?.trim() !== ""
        ) {
          node.textContent = " " + translatedText;
          textNodeFound = true;
        }
      });

      if (!textNodeFound) {
        el.appendChild(document.createTextNode(" " + translatedText));
      }
    } else {
      el.textContent = translatedText;
    }
  });
}

function updateDropdownUI(lang: Language) {
  const label = document.getElementById("current-lang-label");
  if (label) {
    label.textContent = lang === "en" ? "EN" : "ID";
  }

  document.querySelectorAll(".lang-option").forEach((opt) => {
    if (opt.getAttribute("data-lang") === lang) {
      opt.classList.add("active");
    } else {
      opt.classList.remove("active");
    }
  });
}

function setupDropdownListeners() {
  const toggleBtn = document.getElementById("lang-toggle-btn");
  const dropdownContainer = document.getElementById("lang-dropdown-container");
  const options = document.querySelectorAll(".lang-option");

  if (toggleBtn && dropdownContainer) {
    toggleBtn.onclick = (e) => {
      e.stopPropagation();
      dropdownContainer.classList.toggle("open");
    };
  }

  options.forEach((opt) => {
    (opt as HTMLElement).onclick = (e) => {
      const selectedLang = (e.currentTarget as HTMLElement).dataset
        .lang as Language;
      setLanguage(selectedLang);
      dropdownContainer?.classList.remove("open");
    };
  });

  document.addEventListener("click", (e) => {
    if (dropdownContainer?.classList.contains("open")) {
      if (!dropdownContainer.contains(e.target as Node)) {
        dropdownContainer.classList.remove("open");
      }
    }
  });
}
