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
        if (!obj.visible) continue;

        const bound = obj.getBoundingRect(true, true);
        const x = bound.left / totalScale;
        const yTop = pdfHeight - bound.top / totalScale;
        const finalWidth = bound.width / totalScale;
        const finalHeight = bound.height / totalScale;

        if (obj instanceof fabric.Image) {
          try {
            const pngDataUrl = obj.toDataURL({ format: "png", multiplier: 2 });

            const pngImageBytes = await fetch(pngDataUrl).then((res) =>
              res.arrayBuffer(),
            );
            const pdfImage = await pdfDoc.embedPng(pngImageBytes);

            pdfPage.drawImage(pdfImage, {
              x: x,
              y: yTop - finalHeight,
              width: finalWidth,
              height: finalHeight,
            });
          } catch (imgErr) {
            console.error("Gagal embed image:", imgErr);
          }
        } else if ((obj as any).isCheckbox) {
          try {
            const pngDataUrl = obj.toDataURL({ format: "png", multiplier: 4 });
            const pngImageBytes = await fetch(pngDataUrl).then((res) =>
              res.arrayBuffer(),
            );
            const pdfImage = await pdfDoc.embedPng(pngImageBytes);

            pdfPage.drawImage(pdfImage, {
              x: x,
              y: yTop - finalHeight,
              width: finalWidth,
              height: finalHeight,
            });
          } catch (err) {
            console.error("Gagal save checkbox:", err);
          }
        } else if (obj instanceof fabric.IText) {
          const text = obj.text || "";
          const fontSize =
            ((obj.fontSize || 20) * (obj.scaleY || 1)) / totalScale;

          pdfPage.drawText(text, {
            x: x,
            y: yTop - fontSize + fontSize * 0.12,
            size: fontSize,
            font: helveticaFont,
            color: rgb(0, 0, 0),
          });
        }
      }
    }

    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes as BlobPart], { type: "application/pdf" });

    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `signed_document_${Date.now()}.pdf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error("Gagal menyimpan PDF:", error);
    alert("Gagal menyimpan PDF. Cek console untuk detail error.");
  }
}
