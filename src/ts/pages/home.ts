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
        if (file) {
          console.log("File selected:", file.name);
          appStore.setFile(file);
          router.navigate("/editor");
        }
      };
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
