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
let activeTool: "select" | "text" | "checkbox" = "select";

let activeSignatureTab: "draw" | "type" | "image" = "draw";
let activeSignatureColor: string = "#000000";
let activeSignatureFont: string = "'Caveat', cursive";

export const EditorPage: Page = {
  async mount() {
    document.body.classList.add("editor-mode");
    setupThemeButton("theme-toggle-sidebar");
    console.log("Mounting Editor (Click-to-Place Mode)...");

    activeTool = "select";
    updateToolbarVisuals();

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
            width: parseInt(dims.styleWidth, 10),
            height: parseInt(dims.styleHeight, 10),
            selection: true,
            enableRetinaScaling: true,
          });

          (fCanvas as any).pdfInfo = {
            precisionScale: dims.precisionScale,
            viewportWidth: dims.viewportWidth,
            pageNumber: pageNum,
          };

          fCanvas.on("mouse:down", (opt) => {
            handleCanvasClick(fCanvas, opt);
          });

          fCanvas.on("mouse:over", () => {
            updateCanvasCursor(fCanvas);
          });

          fCanvas.on("mouse:dblclick", (opt) => {
            const target = opt.target;
            if (
              target &&
              (target as any).isCheckbox &&
              target instanceof fabric.Path
            ) {
              const t = target as any;
              const centerX = target.left || 0;
              const centerY = target.top || 0;
              const currentScaleX = target.scaleX || 1.5;
              const currentScaleY = target.scaleY || 1.5;
              const currentAngle = target.angle || 0;
              const currentType = t.checkboxType;

              let newPathString = "";
              let newFill = "";
              let newType = "";

              if (currentType === "check") {
                newPathString =
                  "M13.08 5.44a0.94 0.75 0 0 0 -1.33 0L8 8.44 4.26 5.44a0.94 0.75 0 1 0 -1.33 1.06L6.68 9.5l-3.75 3.01a0.94 0.75 0 0 0 1.33 1.06L8 10.56l3.74 3.01a0.94 0.75 0 0 0 1.33 -1.06L9.33 9.5l3.74 -3a0.94 0.75 0 0 0 0 -1.06z";
                newFill = "#ef4444";
                newType = "cross";
              } else {
                newPathString =
                  "M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z";
                newFill = "black";
                newType = "check";
              }

              fCanvas.remove(target);
              const newCheckbox = new fabric.Path(newPathString, {
                left: centerX,
                top: centerY,
                originX: "center",
                originY: "center",
                fill: newFill,
                stroke: null,
                scaleX: currentScaleX,
                scaleY: currentScaleY,
                angle: currentAngle,
                objectCaching: false,
                ...({ isCheckbox: true, checkboxType: newType } as any),
              });
              fCanvas.add(newCheckbox);
              fCanvas.setActiveObject(newCheckbox);
              fCanvas.requestRenderAll();
            }
          });

          const upperCanvasEl = fCanvas.getElement();
          const canvasWrapper = upperCanvasEl.parentElement;
          const pageWrapperEl = document.getElementById(`page-${pageNum}`);

          if (canvasWrapper && pageWrapperEl) {
            canvasWrapper.addEventListener("dragenter", (e) => {
              e.preventDefault();
              pageWrapperEl.classList.add("drop-active");
            });
            canvasWrapper.addEventListener("dragleave", (e) => {
              e.preventDefault();
              pageWrapperEl.classList.remove("drop-active");
            });
            canvasWrapper.addEventListener("dragover", (e) => {
              e.preventDefault();
              e.dataTransfer!.dropEffect = "copy";
              pageWrapperEl.classList.add("drop-active");
            });
            canvasWrapper.addEventListener("drop", (e) => {
              e.preventDefault();
              pageWrapperEl.classList.remove("drop-active");
              handleDrop(e, fCanvas);
            });
          }
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

function resetSignatureModal() {
  activeSignatureTab = "draw";
  activeSignatureColor = "#000000";
  activeSignatureFont = "'Caveat', cursive";

  document
    .querySelectorAll(".tab-btn")
    .forEach((b) => b.classList.remove("active"));
  document.querySelector('[data-tab="draw"]')?.classList.add("active");

  document
    .querySelectorAll(".tab-content")
    .forEach((c) => c.classList.add("hidden"));
  document.getElementById("tab-content-draw")?.classList.remove("hidden");

  document
    .querySelectorAll(".color-btn")
    .forEach((b) => b.classList.remove("active"));
  document.querySelector('[data-color="#000000"]')?.classList.add("active");
  document.getElementById("signature-color-picker")?.classList.remove("hidden");

  document
    .querySelectorAll(".font-btn")
    .forEach((b) => b.classList.remove("active"));
  document
    .querySelector(`[data-font="${activeSignatureFont}"]`)
    ?.classList.add("active");

  const typeInput = document.getElementById(
    "type-signature-input",
  ) as HTMLInputElement;
  if (typeInput) typeInput.value = "";

  const imgInput = document.getElementById(
    "image-signature-input",
  ) as HTMLInputElement;
  if (imgInput) imgInput.value = "";

  document.getElementById("image-upload-area")?.classList.remove("hidden");
  document.getElementById("image-preview-container")?.classList.add("hidden");

  const clearBtn = document.getElementById("btn-modal-clear");
  if (clearBtn) clearBtn.style.display = "block";

  if (modalPad) {
    modalPad.clear();
    modalPad.penColor = "#000000";
  }

  const typeCanvas = document.getElementById("type-pad") as HTMLCanvasElement;
  if (typeCanvas) {
    const ctx = typeCanvas.getContext("2d");
    ctx?.clearRect(0, 0, typeCanvas.width, typeCanvas.height);
  }
}

function renderTextSignature(text: string) {
  const canvas = document.getElementById("type-pad") as HTMLCanvasElement;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!text) return;

  ctx.save();

  const baseFontSize = 100;
  const padding = 40;
  const maxWidth = canvas.width - padding;

  ctx.font = `${baseFontSize}px ${activeSignatureFont}`;

  const textWidth = ctx.measureText(text).width;
  let finalFontSize = baseFontSize;

  if (textWidth > maxWidth) {
    const scale = maxWidth / textWidth;
    finalFontSize = Math.floor(baseFontSize * scale);

    if (finalFontSize < 20) finalFontSize = 20;
  }

  ctx.font = `${finalFontSize}px ${activeSignatureFont}`;
  ctx.fillStyle = activeSignatureColor;
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const yOffset = canvas.height / 2;

  ctx.fillText(text, canvas.width / 2, yOffset);
  ctx.restore();
}

function setupModalLogic() {
  const modal = document.getElementById("signature-modal");
  const btnCreate = document.getElementById("btn-create-signature");
  const btnCancel = document.getElementById("btn-modal-cancel");
  const btnSave = document.getElementById("btn-modal-save");
  const btnClear = document.getElementById("btn-modal-clear");

  const padContainer = document.getElementById(
    "signature-pad-container",
  ) as HTMLElement;

  if (btnCreate) {
    btnCreate.onclick = () => {
      setActiveTool("select");
      modal?.classList.remove("hidden");
      resetSignatureModal();

      if (!modalPad && padContainer) {
        modalPad = new SignaturePad(padContainer);
      }
    };
  }

  const tabs = document.querySelectorAll(".tab-btn");
  tabs.forEach((tab) => {
    (tab as HTMLElement).onclick = (e) => {
      const target = e.currentTarget as HTMLElement;
      const tabName = target.getAttribute("data-tab") as
        | "draw"
        | "type"
        | "image";
      activeSignatureTab = tabName;

      tabs.forEach((t) => t.classList.remove("active"));
      target.classList.add("active");

      document
        .querySelectorAll(".tab-content")
        .forEach((content) => content.classList.add("hidden"));
      document
        .getElementById(`tab-content-${tabName}`)
        ?.classList.remove("hidden");

      const colorPicker = document.getElementById("signature-color-picker");
      const clearBtn = document.getElementById("btn-modal-clear");

      if (tabName === "image") {
        colorPicker?.classList.add("hidden");
        if (clearBtn) clearBtn.style.display = "none";
      } else {
        colorPicker?.classList.remove("hidden");
        if (clearBtn) clearBtn.style.display = "block";

        if (tabName === "type") {
          const input = document.getElementById(
            "type-signature-input",
          ) as HTMLInputElement;
          renderTextSignature(input.value);
        }
      }
    };
  });

  const colorBtns = document.querySelectorAll(".color-btn");
  colorBtns.forEach((btn) => {
    (btn as HTMLElement).onclick = (e) => {
      const target = e.currentTarget as HTMLElement;
      const color = target.getAttribute("data-color") || "#000000";
      activeSignatureColor = color;

      colorBtns.forEach((b) => b.classList.remove("active"));
      target.classList.add("active");

      if (activeSignatureTab === "draw" && modalPad) {
        modalPad.recolor(color);
      } else if (activeSignatureTab === "type") {
        const input = document.getElementById(
          "type-signature-input",
        ) as HTMLInputElement;
        renderTextSignature(input.value);
      }
    };
  });

  const fontBtns = document.querySelectorAll(".font-btn");
  fontBtns.forEach((btn) => {
    (btn as HTMLElement).onclick = (e) => {
      const target = e.currentTarget as HTMLElement;
      const font = target.getAttribute("data-font") || "'Caveat', cursive";
      activeSignatureFont = font;

      fontBtns.forEach((b) => b.classList.remove("active"));
      target.classList.add("active");

      const input = document.getElementById(
        "type-signature-input",
      ) as HTMLInputElement;
      renderTextSignature(input.value);
    };
  });

  const typeInput = document.getElementById(
    "type-signature-input",
  ) as HTMLInputElement;
  if (typeInput) {
    typeInput.oninput = (e) => {
      renderTextSignature((e.target as HTMLInputElement).value);
    };
  }

  const uploadArea = document.getElementById("image-upload-area");
  const imageInput = document.getElementById(
    "image-signature-input",
  ) as HTMLInputElement;
  const btnRemoveImg = document.getElementById("btn-remove-image");

  if (uploadArea && imageInput) {
    uploadArea.onclick = () => imageInput.click();

    imageInput.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (f) => {
          const result = f.target?.result as string;
          const imgPreview = document.getElementById(
            "image-signature-preview",
          ) as HTMLImageElement;

          if (imgPreview) {
            imgPreview.src = result;
            document
              .getElementById("image-preview-container")
              ?.classList.remove("hidden");
            uploadArea.classList.add("hidden");
          }
        };
        reader.readAsDataURL(file);
      }
    };
  }

  if (btnRemoveImg) {
    btnRemoveImg.onclick = () => {
      imageInput.value = "";
      document
        .getElementById("image-preview-container")
        ?.classList.add("hidden");
      uploadArea?.classList.remove("hidden");
    };
  }

  const closeModal = () => modal?.classList.add("hidden");
  if (btnCancel) btnCancel.onclick = closeModal;

  if (btnClear) {
    btnClear.onclick = () => {
      if (activeSignatureTab === "draw") {
        modalPad?.clear();
      } else if (activeSignatureTab === "type") {
        const input = document.getElementById(
          "type-signature-input",
        ) as HTMLInputElement;
        input.value = "";
        renderTextSignature("");
      }
    };
  }

  if (btnSave) {
    btnSave.onclick = () => {
      let finalDataUrl: string | null = null;

      if (activeSignatureTab === "draw" && modalPad) {
        if (modalPad.isEmpty()) {
          alert("Area tanda tangan kosong!");
          return;
        }
        finalDataUrl = modalPad.toDataURL();
      } else if (activeSignatureTab === "type") {
        const typeCanvas = document.getElementById(
          "type-pad",
        ) as HTMLCanvasElement;
        const input = document.getElementById(
          "type-signature-input",
        ) as HTMLInputElement;
        if (!input.value.trim()) {
          alert("Silakan ketik nama Anda.");
          return;
        }
        finalDataUrl = typeCanvas.toDataURL("image/png");
      } else if (activeSignatureTab === "image") {
        const imgPreview = document.getElementById(
          "image-signature-preview",
        ) as HTMLImageElement;
        if (!imgPreview.src || imgPreview.src === window.location.href) {
          alert("Silakan upload gambar tanda tangan.");
          return;
        }
        finalDataUrl = imgPreview.src;
      }

      if (finalDataUrl) {
        addDraggableAsset(finalDataUrl);
        closeModal();
      }
    };
  }
}

function setActiveTool(tool: "select" | "text" | "checkbox") {
  activeTool = tool;
  updateToolbarVisuals();
  fabricPages.forEach((canvas) => {
    canvas.selection = tool === "select";
    updateCanvasCursor(canvas);
    canvas.requestRenderAll();
  });
}

function updateToolbarVisuals() {
  const btnText = document.getElementById("btn-add-text");
  const btnCheck = document.getElementById("btn-add-checkbox");
  btnText?.classList.remove("active");
  btnCheck?.classList.remove("active");
  if (activeTool === "text") btnText?.classList.add("active");
  if (activeTool === "checkbox") btnCheck?.classList.add("active");
}

function updateCanvasCursor(canvas: fabric.Canvas) {
  if (activeTool === "text") {
    canvas.defaultCursor = "text";
    canvas.hoverCursor = "move";
  } else if (activeTool === "checkbox") {
    canvas.defaultCursor = "copy";
    canvas.hoverCursor = "move";
  } else {
    canvas.defaultCursor = "default";
    canvas.hoverCursor = "move";
  }
}

function handleCanvasClick(canvas: fabric.Canvas, opt: fabric.IEvent) {
  if (opt.target) return;
  if (activeTool === "select") return;

  const pointer = canvas.getPointer(opt.e);

  if (activeTool === "text") {
    const text = new fabric.IText("Ketik disini...", {
      left: pointer.x,
      top: pointer.y,
      fontFamily: "Inter, sans-serif",
      fontSize: 20,
      fill: "#000000",
      cursorColor: "#2563eb",
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    text.enterEditing();
    text.selectAll();
  } else if (activeTool === "checkbox") {
    const checkPath =
      "M12.736 3.97a.733.733 0 0 1 1.047 0c.286.289.29.756.01 1.05L7.88 12.01a.733.733 0 0 1-1.065.02L3.217 8.384a.757.757 0 0 1 0-1.06.733.733 0 0 1 1.047 0l3.052 3.093 5.4-6.425a.247.247 0 0 1 .02-.022z";

    const checkbox = new fabric.Path(checkPath, {
      left: pointer.x,
      top: pointer.y,
      originX: "center",
      originY: "center",
      fill: "black",
      stroke: null,
      scaleX: 1.5,
      scaleY: 1.5,
      objectCaching: false,
      ...({ isCheckbox: true, checkboxType: "check" } as any),
    });

    canvas.add(checkbox);
    canvas.requestRenderAll();
  }
}

function handleDrop(e: DragEvent, canvas: fabric.Canvas) {
  const imgSrc = e.dataTransfer?.getData("image-src");
  if (!imgSrc) return;

  const wrapper = canvas.getElement().closest(".page-wrapper");
  wrapper?.classList.remove("drop-active");

  const rect = canvas.getElement().getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  fabric.Image.fromURL(imgSrc, (img) => {
    const targetWidth = 300;
    let scale = 1;
    if (img.width && img.width > targetWidth) {
      scale = targetWidth / img.width;
    }
    img.set({
      left: x,
      top: y,
      originX: "center",
      originY: "center",
      scaleX: scale,
      scaleY: scale,
      borderColor: "#2563eb",
      cornerColor: "#2563eb",
      transparentCorners: false,
    });
    canvas.add(img);
    canvas.setActiveObject(img);
    canvas.requestRenderAll();
    setActiveTool("select");
  });
}

function addDraggableAsset(imgSrc: string) {
  const container = document.getElementById("assets-container");
  const emptyHint = container?.querySelector(".empty-hint");

  if (container) {
    if (emptyHint) emptyHint.remove();

    const wrapper = document.createElement("div");
    wrapper.className = "asset-wrapper";

    const img = document.createElement("img");
    img.src = imgSrc;
    img.className = "draggable-item";
    img.draggable = true;

    img.addEventListener("dragstart", (e) => {
      if (e.dataTransfer) {
        e.dataTransfer.setData("image-src", imgSrc);
        e.dataTransfer.effectAllowed = "copy";
      }
    });

    const btnDel = document.createElement("button");
    btnDel.className = "btn-remove-asset";
    btnDel.innerHTML = '<i class="fa-solid fa-times"></i>';
    btnDel.title = "Hapus Aset";

    btnDel.onclick = () => {
      wrapper.remove();
      if (container.children.length === 0) {
        container.innerHTML = `<p class="empty-hint">Belum ada aset. Buat tanda tangan atau upload gambar dulu.
</p>`;
      }
    };

    wrapper.appendChild(img);
    wrapper.appendChild(btnDel);
    container.appendChild(wrapper);
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
      if (activeTool === "text") setActiveTool("select");
      else setActiveTool("text");
    };
  }

  if (btnCheckbox) {
    btnCheckbox.onclick = () => {
      if (activeTool === "checkbox") setActiveTool("select");
      else setActiveTool("checkbox");
    };
  }

  if (btnStamp && inputStamp) {
    btnStamp.onclick = () => {
      inputStamp.click();
    };

    inputStamp.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (f) => {
        const data = f.target?.result as string;
        addDraggableAsset(data);
        inputStamp.value = "";
      };
      reader.readAsDataURL(file);
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
