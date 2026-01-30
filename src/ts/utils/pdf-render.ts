import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const version = pdfjsLib.version || "3.11.174";
const cdnBase = `https://unpkg.com/pdfjs-dist@${version}`;
const fontUrl = `${cdnBase}/standard_fonts/`;
const cMapUrl = `${cdnBase}/cmaps/`;

(pdfjsLib as any).GlobalWorkerOptions.standardFontDataUrl = fontUrl;

const renderTasks = new Map<number, pdfjsLib.RenderTask>();

export async function loadPdfDocument(file: File) {
  const arrayBuffer = await file.arrayBuffer();
  const loadingTask = pdfjsLib.getDocument({
    data: arrayBuffer,
    cMapUrl: cMapUrl,
    cMapPacked: true,
    standardFontDataUrl: fontUrl,
  });
  return await loadingTask.promise;
}

export async function renderPageToCanvas(
  pdfDoc: pdfjsLib.PDFDocumentProxy,
  pageNumber: number,
  canvas: HTMLCanvasElement,
  currentZoomScale: number = 1,
) {
  try {
    if (renderTasks.has(pageNumber)) {
      renderTasks.get(pageNumber)?.cancel();
      renderTasks.delete(pageNumber);
    }

    const page = await pdfDoc.getPage(pageNumber);

    const container = document.getElementById("canvas-scroll-area");
    const containerWidth = container?.clientWidth || window.innerWidth;
    const targetWidth = Math.min(containerWidth - 80, 892);

    const unscaledViewport = page.getViewport({ scale: 1 });
    const cssScaleFactor = targetWidth / unscaledViewport.width;
    const cssViewport = page.getViewport({ scale: cssScaleFactor });

    const pixelRatio = window.devicePixelRatio || 1;
    let totalScale = cssScaleFactor * pixelRatio * currentZoomScale;

    const MINIMUM_QUALITY = 3.0;
    totalScale = Math.max(totalScale, MINIMUM_QUALITY);

    const MAX_SAFE_SCALE = 6.0;
    const safeScale = Math.min(totalScale, MAX_SAFE_SCALE);

    canvas.width = Math.floor(unscaledViewport.width * safeScale);
    canvas.height = Math.floor(unscaledViewport.height * safeScale);

    canvas.style.width = `${Math.floor(cssViewport.width)}px`;
    canvas.style.height = `${Math.floor(cssViewport.height)}px`;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(safeScale, safeScale);

    const renderTask = page.render({
      canvasContext: context,
      viewport: unscaledViewport,
    } as any);

    renderTasks.set(pageNumber, renderTask);
    await renderTask.promise;
    renderTasks.delete(pageNumber);

    return {
      width: canvas.width,
      height: canvas.height,
      styleWidth: canvas.style.width,
      styleHeight: canvas.style.height,
      precisionScale: cssScaleFactor,
      viewportWidth: cssViewport.width,
    };
  } catch (error: any) {
    if (error.name !== "RenderingCancelledException") {
      console.error(`Error render page ${pageNumber}:`, error);
    }
    return null;
  }
}
