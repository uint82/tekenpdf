import "../styles/index.scss";
import { router } from "./utils/router";
import { HomePage } from "./pages/home";
import { EditorPage } from "./pages/editor";

router.register("/", HomePage);
router.register("/editor", EditorPage);

document.addEventListener("DOMContentLoaded", () => {
  router.navigate("/");

  requestAnimationFrame(() => {
    document.body.classList.add("loaded");
  });
});
