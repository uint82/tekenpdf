import { fabric } from "fabric";
import { router } from "../utils/router";
import { appStore } from "../utils/store";
import { loadPdfDocument, renderPageToCanvas } from "../utils/pdf-render";
import { savePdf } from "../utils/pdf-save";
import { SignaturePad } from "../utils/drawing";
import { setupThemeButton } from "../utils/theme";
import type { Page } from "../utils/router";

const fabricPages = new Map<number, fabric.Canvas>();
let pdfDoc: any = null;
let modalPad: SignaturePad | null = null;

export const EditorPage: Page = {
  async mount() {
    document.body.classList.add("editor-mode");
    setupThemeButton("theme-toggle-sidebar");
    console.log("Mounting Editor (Multi-Page Mode)...");

    const file = appStore.getFile();
    if (!file) {
      alert("Pilih file dulu!");
      router.navigate("/");
      return;
    }

    const filenameEl = document.getElementById("filename-display");
    if (filenameEl) {
      filenameEl.textContent = file.name;
      filenameEl.title = file.name;
    }

    const view = document.getElementById("editor-view");
    view?.classList.remove("hidden");

    const pagesContainer = document.getElementById("pages-container");
    if (!pagesContainer) {
      console.error("Element #pages-container not found in HTML");
      return;
    }

    pagesContainer.innerHTML = "";
    fabricPages.clear();

    try {
      pdfDoc = await loadPdfDocument(file);
      console.log(`PDF Loaded: ${pdfDoc.numPages} pages.`);

      for (let pageNum = 1; pageNum <= pdfDoc.numPages; pageNum++) {
        const pageWrapper = document.createElement("div");
        pageWrapper.className = "page-wrapper";
        pageWrapper.id = `page-${pageNum}`;
        pageWrapper.style.position = "relative";
        pageWrapper.style.boxShadow = "0 4px 6px -1px rgba(0, 0, 0, 0.1)";

        const pdfCanvas = document.createElement("canvas");
        pdfCanvas.className = "pdf-layer";

        const fabricCanvasEl = document.createElement("canvas");
        fabricCanvasEl.id = `fabric-page-${pageNum}`;

        pageWrapper.appendChild(pdfCanvas);
        pageWrapper.appendChild(fabricCanvasEl);
        pagesContainer.appendChild(pageWrapper);

        const dims = await renderPageToCanvas(pdfDoc, pageNum, pdfCanvas);

        if (dims) {
          const fCanvas = new fabric.Canvas(fabricCanvasEl.id, {
            width: dims.width,
            height: dims.height,
            selection: true,
          });

          const lowerCanvasEl = fCanvas.getElement();
          lowerCanvasEl.style.width = dims.styleWidth;
          lowerCanvasEl.style.height = dims.styleHeight;

          fabricPages.set(pageNum, fCanvas);
        }
      }
    } catch (err) {
      console.error("Error mounting pages:", err);
    }

    setupModalLogic();
    setupToolbarLogic();
    setupKeyboardShortcuts();

    const btnBack = document.getElementById("back-btn");
    if (btnBack) btnBack.onclick = () => router.navigate("/");

    const btnSave = document.getElementById("btn-save-pdf");
    if (btnSave) {
      btnSave.onclick = async () => {
        if (!file || fabricPages.size === 0) return;

        const originalText = btnSave.innerText;
        btnSave.innerText = "Processing...";
        (btnSave as HTMLButtonElement).disabled = true;

        await savePdf(file, fabricPages);

        btnSave.innerText = originalText;
        (btnSave as HTMLButtonElement).disabled = false;
      };
    }
  },

  unmount() {
    const view = document.getElementById("editor-view");
    document.body.classList.remove("editor-mode");
    view?.classList.add("hidden");

    fabricPages.forEach((canvas) => canvas.dispose());
    fabricPages.clear();

    if (modalPad) {
      modalPad.clear();
      modalPad = null;
    }
    window.removeEventListener("keydown", handleKeydown);
  },
};

function getActiveFabricCanvas(): fabric.Canvas | null {
  if (fabricPages.size === 1) return fabricPages.get(1) || null;

  const container = document.getElementById("canvas-scroll-area");
  if (!container) return fabricPages.get(1) || null;

  const containerCenter = container.scrollTop + container.clientHeight / 2;

  let activePage = 1;
  let minDiff = Infinity;

  fabricPages.forEach((_, pageNum) => {
    const el = document.getElementById(`page-${pageNum}`);
    if (el) {
      const elCenter = el.offsetTop + el.offsetHeight / 2;
      const diff = Math.abs(containerCenter - elCenter);

      if (diff < minDiff) {
        minDiff = diff;
        activePage = pageNum;
      }
    }
  });

  return fabricPages.get(activePage) || null;
}

function setupModalLogic() {
  const modal = document.getElementById("signature-modal");
  const btnCreate = document.getElementById("btn-create-signature");
  const btnCancel = document.getElementById("btn-modal-cancel");
  const btnSave = document.getElementById("btn-modal-save");
  const btnClear = document.getElementById("btn-modal-clear");
  const padCanvas = document.getElementById("modal-pad") as HTMLCanvasElement;

  if (btnCreate) {
    btnCreate.onclick = () => {
      modal?.classList.remove("hidden");
      if (!modalPad && padCanvas) {
        modalPad = new SignaturePad(padCanvas);
      }
      modalPad?.clear();
    };
  }

  const closeModal = () => modal?.classList.add("hidden");
  if (btnCancel) btnCancel.onclick = closeModal;
  if (btnClear) btnClear.onclick = () => modalPad?.clear();

  if (btnSave) {
    btnSave.onclick = () => {
      if (!modalPad) return;

      const activeCanvas = getActiveFabricCanvas();
      if (!activeCanvas) {
        alert("Tidak ada halaman aktif!");
        closeModal();
        return;
      }

      const signatureImage = modalPad.canvas.toDataURL("image/png");

      fabric.Image.fromURL(signatureImage, (img) => {
        img.set({
          left: 100,
          top: 100,
          scaleX: 0.5,
          scaleY: 0.5,
          borderColor: "#2563eb",
          cornerColor: "#2563eb",
          transparentCorners: false,
        });

        activeCanvas.add(img);
        activeCanvas.setActiveObject(img);
        activeCanvas.requestRenderAll();
      });

      closeModal();
    };
  }
}

function setupToolbarLogic() {
  const btnText = document.getElementById("btn-add-text");
  const btnStamp = document.getElementById("btn-tool-stamp");
  const btnCheckbox = document.getElementById("btn-add-checkbox");
  const inputStamp = document.getElementById(
    "stamp-file-input",
  ) as HTMLInputElement;
  const btnDelete = document.getElementById("btn-delete-object");

  if (btnText) {
    btnText.onclick = () => {
      const activeCanvas = getActiveFabricCanvas();
      if (!activeCanvas) return;

      const text = new fabric.IText("Ketik disini...", {
        left: 50,
        top: 50,
        fontFamily: "Inter, sans-serif",
        fontSize: 20,
        fill: "#000000",
        cursorColor: "#2563eb",
      });

      activeCanvas.add(text);
      activeCanvas.setActiveObject(text);
      text.enterEditing();
      text.selectAll();

      const fabricCanvasEl = activeCanvas.getElement();
      const pageWrapper = fabricCanvasEl.closest(".page-wrapper");

      if (pageWrapper) {
        pageWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
  }

  if (btnStamp && inputStamp) {
    btnStamp.onclick = () => inputStamp.click();
    inputStamp.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      const activeCanvas = getActiveFabricCanvas();

      if (!file || !activeCanvas) return;

      const reader = new FileReader();
      reader.onload = (f) => {
        const data = f.target?.result as string;
        fabric.Image.fromURL(data, (img) => {
          const maxWidth = 150;
          const scale = maxWidth / (img.width || 1);
          img.set({
            left: 100,
            top: 100,
            scaleX: scale,
            scaleY: scale,
          });
          activeCanvas.add(img);
          activeCanvas.setActiveObject(img);
          inputStamp.value = "";
        });
      };
      reader.readAsDataURL(file);
    };
  }

  if (btnCheckbox) {
    btnCheckbox.onclick = () => {
      const activeCanvas = getActiveFabricCanvas();
      if (!activeCanvas) return;

      const checkbox = new fabric.IText("✓", {
        left: 50,
        top: 50,
        fontFamily: "Arial",
        fontSize: 30,
        fill: "#000000",
        fontWeight: "bold",
        cursorColor: "#2563eb",
      });

      activeCanvas.add(checkbox);
      activeCanvas.setActiveObject(checkbox);

      const fabricCanvasEl = activeCanvas.getElement();
      const pageWrapper = fabricCanvasEl.closest(".page-wrapper");
      if (pageWrapper) {
        pageWrapper.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    };
  }

  if (btnDelete) {
    btnDelete.onclick = () => deleteActiveObject();
  }
}

function deleteActiveObject() {
  fabricPages.forEach((canvas) => {
    const activeObjects = canvas.getActiveObjects();
    if (activeObjects.length) {
      canvas.discardActiveObject();
      activeObjects.forEach((obj) => canvas.remove(obj));
      canvas.requestRenderAll();
    }
  });
}

function setupKeyboardShortcuts() {
  window.addEventListener("keydown", handleKeydown);
}

function handleKeydown(e: KeyboardEvent) {
  if (e.key === "Delete" || e.key === "Backspace") {
    let isEditingText = false;
    fabricPages.forEach((canvas) => {
      if (canvas.getActiveObject() instanceof fabric.IText) {
        if ((canvas.getActiveObject() as fabric.IText).isEditing) {
          isEditingText = true;
        }
      }
    });

    if (!isEditingText) {
      deleteActiveObject();
    }
  }
}
