export interface Page {
  mount: () => void;
  unmount: () => void;
}

export const router = {
  pages: {} as Record<string, Page>,
  currentPath: "/",

  register(path: string, page: Page) {
    this.pages[path] = page;
  },

  navigate(path: string) {
    const previousPage = this.pages[this.currentPath];
    const nextPage = this.pages[path];

    if (!nextPage) {
      console.error(`Page not found: ${path}`);
      return;
    }

    if (previousPage) {
      previousPage.unmount();
    }

    nextPage.mount();

    this.currentPath = path;
  },
};
