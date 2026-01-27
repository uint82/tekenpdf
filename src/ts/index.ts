import "@fortawesome/fontawesome-free/css/all.css";
import "../styles/index.scss";
import { router } from "./utils/router";
import { HomePage } from "./pages/home";
import { EditorPage } from "./pages/editor";
import { initTheme } from "./utils/theme";

initTheme();

router.register("/", HomePage);
router.register("/editor", EditorPage);

document.addEventListener("DOMContentLoaded", () => {
  router.navigate("/");

  requestAnimationFrame(() => {
    document.body.classList.add("loaded");
  });
});
