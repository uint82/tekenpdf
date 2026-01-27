import { router } from "../utils/router";
import { appStore } from "../utils/store";
import type { Page } from "../utils/router";

export const HomePage: Page = {
  mount() {
    console.log("Mounting Home...");
    const view = document.getElementById("home-view");
    view?.classList.remove("hidden");

    const input = document.getElementById("pdf-upload") as HTMLInputElement;
    if (input) {
      input.onchange = (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        handleFile(file);
      };
    }

    const dropZone = document.getElementById("drop-zone");
    if (dropZone) {
      ["dragenter", "dragover", "dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(eventName, preventDefaults, false);
      });

      ["dragenter", "dragover"].forEach((eventName) => {
        dropZone.addEventListener(
          eventName,
          () => {
            dropZone.classList.add("drag-active");
          },
          false,
        );
      });

      ["dragleave", "drop"].forEach((eventName) => {
        dropZone.addEventListener(
          eventName,
          () => {
            dropZone.classList.remove("drag-active");
          },
          false,
        );
      });

      dropZone.addEventListener(
        "drop",
        (e: DragEvent) => {
          const dt = e.dataTransfer;
          const file = dt?.files[0];
          handleFile(file);
        },
        false,
      );
    }
  },

  unmount() {
    console.log("Unmounting Home...");
    const view = document.getElementById("home-view");
    view?.classList.add("hidden");

    const input = document.getElementById("pdf-upload") as HTMLInputElement;
    if (input) input.value = "";

    // opsional: remove event listeners jika perlu memory management
  },
};

function handleFile(file: File | undefined) {
  if (!file) return;

  if (file.type !== "application/pdf") {
    alert("Mohon upload file PDF saja!");
    return;
  }

  console.log("File selected:", file.name);
  appStore.setFile(file);
  router.navigate("/editor");
}

function preventDefaults(e: Event) {
  e.preventDefault();
  e.stopPropagation();
}
