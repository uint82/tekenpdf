import { PDFDocument, rgb, StandardFonts } from "pdf-lib";
import { fabric } from "fabric";

export async function savePdf(
  originalFile: File,
  fabricPages: Map<number, fabric.Canvas>,
) {
  try {
    const arrayBuffer = await originalFile.arrayBuffer();
    const pdfDoc = await PDFDocument.load(arrayBuffer);
    const helveticaFont = await pdfDoc.embedFont(StandardFonts.Helvetica);

    const pages = pdfDoc.getPages();

    for (let i = 0; i < pages.length; i++) {
      const pageNum = i + 1;
      const fabricCanvas = fabricPages.get(pageNum);

      if (!fabricCanvas) continue;

      const pdfPage = pages[i];
      const { width: pdfWidth, height: pdfHeight } = pdfPage.getSize();

      const fabricWidth = fabricCanvas.width || 0;
      const totalScale = fabricWidth / pdfWidth;

      const objects = fabricCanvas.getObjects();

      for (const obj of objects) {
        if (obj.left === undefined || obj.top === undefined) continue;

        const x = obj.left / totalScale;
        const y = pdfHeight - obj.top / totalScale;

        const objScaleX = (obj.scaleX || 1) / totalScale;
        const objScaleY = (obj.scaleY || 1) / totalScale;

        if (obj instanceof fabric.Image) {
          const imgElement = obj.getElement() as HTMLImageElement;
          const imgBytes = await fetch(imgElement.src).then((res) =>
            res.arrayBuffer(),
          );

          const pngImage = await pdfDoc.embedPng(imgBytes);

          const finalWidth = (obj.width || 0) * objScaleX;
          const finalHeight = (obj.height || 0) * objScaleY;

          pdfPage.drawImage(pngImage, {
            x: x,
            y: y - finalHeight,
            width: finalWidth,
            height: finalHeight,
          });
        } else if (obj instanceof fabric.IText) {
          const text = obj.text || "";

          const fontSize = (obj.fontSize || 20) * objScaleY;
          const color = rgb(0, 0, 0);

          pdfPage.drawText(text, {
            x: x,
            y: y - fontSize + fontSize * 0.2,
            size: fontSize,
            font: helveticaFont,
            color: color,
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();

    const blob = new Blob([pdfBytes as any], { type: "application/pdf" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `signed_document_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Gagal menyimpan PDF:", error);
    alert("Terjadi kesalahan saat menyimpan PDF.");
  }
}
