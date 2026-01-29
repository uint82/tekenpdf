import * as pdfjsLib from "pdfjs-dist";
import pdfWorker from "pdfjs-dist/build/pdf.worker?url";

pdfjsLib.GlobalWorkerOptions.workerSrc = pdfWorker;

const version = pdfjsLib.version || "3.11.174";
const cdnBase = `https://unpkg.com/pdfjs-dist@${version}`;
const fontUrl = `${cdnBase}/standard_fonts/`;
const cMapUrl = `${cdnBase}/cmaps/`;

(pdfjsLib as any).GlobalWorkerOptions.standardFontDataUrl = fontUrl;

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
) {
  try {
    const page = await pdfDoc.getPage(pageNumber);

    const container = document.getElementById("canvas-scroll-area");
    const containerWidth = container?.clientWidth || window.innerWidth;
    const targetWidth = Math.min(containerWidth - 80, 892);

    const unscaledViewport = page.getViewport({ scale: 1 });
    const targetScale = targetWidth / unscaledViewport.width;
    const viewport = page.getViewport({ scale: targetScale });

    const outputScale = window.devicePixelRatio || 1;
    canvas.width = Math.floor(viewport.width * outputScale);
    canvas.height = Math.floor(viewport.height * outputScale);

    const styleWidthInt = Math.floor(viewport.width);
    const styleHeightInt = Math.floor(viewport.height);

    canvas.style.width = `${styleWidthInt}px`;
    canvas.style.height = `${styleHeightInt}px`;

    const context = canvas.getContext("2d");
    if (!context) return null;

    context.scale(outputScale, outputScale);

    await page.render({
      canvasContext: context,
      viewport: viewport,
    } as any).promise;

    const finalPrecisionScale = styleWidthInt / unscaledViewport.width;

    return {
      width: canvas.width,
      height: canvas.height,
      styleWidth: canvas.style.width,
      styleHeight: canvas.style.height,

      precisionScale: finalPrecisionScale,
      viewportWidth: viewport.width,
      viewportHeight: viewport.height,
    };
  } catch (error) {
    console.error(`Error render page ${pageNumber}:`, error);
    return null;
  }
}
