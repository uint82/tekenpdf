import * as pdfjsLib from "pdfjs-dist";

import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

export async function renderPdfToCanvas(file: File, canvas: HTMLCanvasElement) {
  try {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument(arrayBuffer);
    const pdf = await loadingTask.promise;
    const page = await pdf.getPage(1);

    const container = canvas.parentElement;

    const containerWidth = container?.clientWidth || window.innerWidth;

    const targetWidth = Math.min(containerWidth - 40, 800);

    const unscaledViewport = page.getViewport({ scale: 1 });

    const scale = targetWidth / unscaledViewport.width;

    const viewport = page.getViewport({ scale });

    const outputScale = window.devicePixelRatio || 1;

    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);

    canvas.style.width = `${Math.floor(viewport.width)}px`;
    canvas.style.height = `${Math.floor(viewport.height)}px`;

    const context = canvas.getContext("2d");
    if (!context) throw new Error("Canvas context not found");

    context.scale(outputScale, outputScale);

    const renderContext = {
      canvasContext: context,
      viewport: viewport,
    } as any;

    await page.render(renderContext).promise;
    console.log(`Rendered scale: ${scale}, Target Width: ${targetWidth}`);
  } catch (error) {
    console.error("Error rendering PDF:", error);
    alert("Gagal memuat PDF.");
  }
}
