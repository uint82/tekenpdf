import { router } from "../utils/router";
import { appStore } from "../utils/store";
import type { Page } from "../utils/router";

export const EditorPage: Page = {
  mount() {
    console.log("Mounting Editor...");

    const file = appStore.getFile();
    if (!file) {
      alert("Pilih file dulu!");
      router.navigate("/");
      return;
    }

    const view = document.getElementById("editor-view");
    view?.classList.remove("hidden");

    console.log("Ready to edit:", file.name);

    const btn = document.getElementById("back-btn");
    if (btn) {
      btn.onclick = () => router.navigate("/");
    }
  },

  unmount() {
    console.log("Unmounting Editor...");
    const view = document.getElementById("editor-view");
    view?.classList.add("hidden");

    // TODO: Cleanup canvas memory disini
  },
};
