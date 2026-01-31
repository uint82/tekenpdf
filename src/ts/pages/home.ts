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

    const btnDemo = document.getElementById(
      "btn-try-demo",
    ) as HTMLButtonElement;
    if (btnDemo) {
      btnDemo.disabled = false;
      btnDemo.innerHTML =
        '<i class="fa-regular fa-file-pdf"></i> Coba Pakai File Demo';

      btnDemo.onclick = async () => {
        btnDemo.innerHTML =
          '<i class="fa-solid fa-spinner fa-spin"></i> Loading...';
        btnDemo.disabled = true;

        try {
          const response = await fetch("/demo/demo.pdf");
          if (!response.ok) throw new Error("Gagal memuat file demo");

          const blob = await response.blob();
          const file = new File([blob], "Demo_Document.pdf", {
            type: "application/pdf",
            lastModified: new Date().getTime(),
          });

          handleFile(file);
        } catch (error) {
          console.error(error);
          alert("Gagal memuat demo.");

          btnDemo.disabled = false;
          btnDemo.innerHTML =
            '<i class="fa-regular fa-file-pdf"></i> Coba Pakai File Demo';
        }
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
