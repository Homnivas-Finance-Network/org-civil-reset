import { PDFDocument, StandardFonts, rgb, type PDFFont } from 'pdf-lib';

const PAGE_SIZE: [number, number] = [595.28, 841.89]; // A4
const MARGIN = 50;
const LINE_HEIGHT = 14;

export async function generateAgreementPdf(opts: {
  leadName: string;
  termsVersion: string;
  termsText: string;
  signedName: string;
  signedAt: string;
  ipAddress: string;
}): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  const bold = await doc.embedFont(StandardFonts.HelveticaBold);

  let page = doc.addPage(PAGE_SIZE);
  let y = page.getHeight() - MARGIN;
  const maxWidth = page.getWidth() - MARGIN * 2;

  const newPage = () => {
    page = doc.addPage(PAGE_SIZE);
    y = page.getHeight() - MARGIN;
  };

  const drawParagraph = (text: string, size: number, useFont: PDFFont) => {
    const words = text.split(/\s+/);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (useFont.widthOfTextAtSize(candidate, size) > maxWidth) {
        if (y < MARGIN + LINE_HEIGHT) newPage();
        page.drawText(line, { x: MARGIN, y, size, font: useFont, color: rgb(0, 0, 0) });
        y -= LINE_HEIGHT;
        line = word;
      } else {
        line = candidate;
      }
    }
    if (line) {
      if (y < MARGIN + LINE_HEIGHT) newPage();
      page.drawText(line, { x: MARGIN, y, size, font: useFont, color: rgb(0, 0, 0) });
      y -= LINE_HEIGHT;
    }
  };

  drawParagraph('Homnivas — Digital Agreement', 16, bold);
  y -= 6;
  drawParagraph(`Applicant: ${opts.leadName}`, 10, font);
  drawParagraph(`Terms version: ${opts.termsVersion}`, 10, font);
  y -= 10;

  drawParagraph(opts.termsText, 10, font);
  y -= 16;

  drawParagraph('Digitally signed by:', 10, bold);
  drawParagraph(opts.signedName, 12, font);
  drawParagraph(`Date/time: ${opts.signedAt}`, 9, font);
  drawParagraph(`IP address: ${opts.ipAddress}`, 9, font);

  return doc.save();
}
