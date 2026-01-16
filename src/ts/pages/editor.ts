import { router } from "../utils/router";
import { appStore } from "../utils/store";
import { renderPdfToCanvas } from "../utils/pdf-render";
import type { Page } from "../utils/router";

export const EditorPage: Page = {
  async mount() {
    console.log("Mounting Editor...");

    const file = appStore.getFile();
    if (!file) {
      alert("Pilih file dulu!");
      router.navigate("/");
      return;
    }

    const view = document.getElementById("editor-view");
    view?.classList.remove("hidden");

    const canvas = document.getElementById("the-canvas") as HTMLCanvasElement;

    if (canvas) {
      await renderPdfToCanvas(file, canvas);
    }

    const btn = document.getElementById("back-btn");
    if (btn) {
      btn.onclick = () => router.navigate("/");
    }
  },

  unmount() {
    console.log("Unmounting Editor...");
    const view = document.getElementById("editor-view");
    view?.classList.add("hidden");

    const canvas = document.getElementById("the-canvas") as HTMLCanvasElement;
    if (canvas) {
      const ctx = canvas.getContext("2d");
      ctx?.clearRect(0, 0, canvas.width, canvas.height);
      canvas.width = 0;
      canvas.height = 0;
    }
  },
};
