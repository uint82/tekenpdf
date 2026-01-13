class Store {
  private pdfFile: File | null = null;

  setFile(file: File) {
    this.pdfFile = file;
  }

  getFile(): File | null {
    return this.pdfFile;
  }
}

export const appStore = new Store();
