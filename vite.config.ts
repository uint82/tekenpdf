import { defineConfig } from "vite";
import injectHTML from "vite-plugin-html-inject";

export default defineConfig(() => {
  return {
    root: "src",
    envDir: "../",
    publicDir: "../static",
    plugins: [injectHTML()],
  };
});
