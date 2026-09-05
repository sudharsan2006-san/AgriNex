/**
 * Pure TypeScript PDF Generator for AgriNex Pre-Booking Confirmation Reports.
 * Generates a valid standard PDF 1.4 document buffer without external native binary dependencies.
 */

export interface PreBookingReportData {
  bookingId: string;
  userName: string;
  userEmail: string;
  mobileNumber: string;
  cropName: string;
  quantity: string | number;
  unit: string;
  referencePrice: string | number;
  bookingDate: string;
  bookingTime: string;
  bookingStatus: string;
  preferredLocation?: string;
  notes?: string;
}

function escapePdfText(str: string): string {
  if (!str) return "";
  return str
    .replace(/\\/g, "\\\\")
    .replace(/\(/g, "\\(")
    .replace(/\)/g, "\\)")
    .replace(/[^\x20-\x7E]/g, (ch) => {
      // Replace non-ASCII characters gracefully
      if (ch === "•") return "*";
      if (ch === "₹") return "INR ";
      if (ch === "–" || ch === "—") return "-";
      return "?";
    });
}

export function generatePreBookingPdfBuffer(data: PreBookingReportData): Buffer {
  const objects: string[] = [];

  const addObject = (content: string) => {
    objects.push(content);
    return objects.length; // 1-based object ID
  };

  // 1: Catalog
  const catalogObjId = addObject("<< /Type /Catalog /Pages 2 0 R >>");

  // 2: Pages (will update later with correct page ID)
  const pagesObjId = addObject("<< /Type /Pages /Kids [3 0 R] /Count 1 >>");

  // 5: Standard Fonts (Helvetica-Bold, Helvetica, Helvetica-Oblique)
  // Let's reserve slots:
  // 3: Page, 4: Content stream, 5: Font F1 (Helvetica-Bold), 6: Font F2 (Helvetica), 7: Font F3 (Helvetica-Oblique)

  // Construct PDF Content Stream
  const pageHeight = 841.89; // A4 height
  const pageWidth = 595.28;  // A4 width
  const ops: string[] = [];

  // Helper drawing functions
  const setFillColor = (r: number, g: number, b: number) => {
    ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} rg`);
  };

  const setStrokeColor = (r: number, g: number, b: number) => {
    ops.push(`${r.toFixed(3)} ${g.toFixed(3)} ${b.toFixed(3)} RG`);
  };

  const drawRect = (x: number, y: number, w: number, h: number, fill = true, stroke = false) => {
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} ${w.toFixed(2)} ${h.toFixed(2)} re`);
    if (fill && stroke) ops.push("B");
    else if (fill) ops.push("f");
    else if (stroke) ops.push("S");
  };

  const drawLine = (x1: number, y1: number, x2: number, y2: number, lineWidth = 1) => {
    ops.push(`${lineWidth.toFixed(2)} w`);
    ops.push(`${x1.toFixed(2)} ${y1.toFixed(2)} m`);
    ops.push(`${x2.toFixed(2)} ${y2.toFixed(2)} l`);
    ops.push("S");
  };

  const drawText = (font: "F1" | "F2" | "F3", size: number, x: number, y: number, text: string) => {
    ops.push("BT");
    ops.push(`/${font} ${size.toFixed(2)} Tf`);
    ops.push(`${x.toFixed(2)} ${y.toFixed(2)} Td`);
    ops.push(`(${escapePdfText(text)}) Tj`);
    ops.push("ET");
  };

  // Background clean canvas
  setFillColor(0.98, 0.99, 0.98);
  drawRect(0, 0, pageWidth, pageHeight, true, false);

  // Top Header Banner (Dark Forest Green #1B4332)
  setFillColor(0.106, 0.263, 0.196);
  drawRect(0, pageHeight - 120, pageWidth, 120, true, false);

  // Decorative header line (#52B788)
  setFillColor(0.322, 0.718, 0.533);
  drawRect(0, pageHeight - 124, pageWidth, 4, true, false);

  // AgriNex Logo / Brand Name
  setFillColor(1, 1, 1);
  drawText("F1", 28, 40, pageHeight - 55, "AgriNex");

  // Tagline
  setFillColor(0.85, 0.95, 0.88);
  drawText("F2", 12, 40, pageHeight - 78, "Smart Farming * Better Tomorrow");

  // Official Badge
  setFillColor(0.20, 0.45, 0.35);
  drawRect(pageWidth - 190, pageHeight - 75, 150, 28, true, false);
  setFillColor(1, 1, 1);
  drawText("F1", 10, pageWidth - 175, pageHeight - 65, "OFFICIAL RECEIPT");

  // Title Section
  let curY = pageHeight - 165;
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 18, 40, curY, "PRE-BOOKING CONFIRMATION");

  curY -= 15;
  setStrokeColor(0.20, 0.45, 0.35);
  drawLine(40, curY, pageWidth - 40, curY, 1.5);

  // Booking Summary Card Header
  curY -= 30;
  setFillColor(0.94, 0.97, 0.95);
  setStrokeColor(0.80, 0.90, 0.83);
  drawRect(40, curY - 140, pageWidth - 80, 150, true, true);

  // Section Title 1: Booking Details
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 13, 55, curY - 5, "1. Booking & Farmer Details");

  setStrokeColor(0.80, 0.90, 0.83);
  drawLine(55, curY - 15, pageWidth - 55, curY - 15, 1);

  // Details Grid
  const rowH = 22;
  let dY = curY - 35;

  // Row 1: Booking ID & Status
  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 55, dY, "Booking ID:");
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 11, 145, dY, data.bookingId);

  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 320, dY, "Status:");
  setFillColor(0.12, 0.53, 0.28);
  drawText("F1", 11, 400, dY, data.bookingStatus || "Pre-Booked");

  // Row 2: User Name & Email
  dY -= rowH;
  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 55, dY, "Customer Name:");
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 10, 145, dY, data.userName || "N/A");

  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 320, dY, "Registered Email:");
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 10, 410, dY, data.userEmail || "N/A");

  // Row 3: Mobile & Booking Date/Time
  dY -= rowH;
  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 55, dY, "Mobile Number:");
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 10, 145, dY, data.mobileNumber || "N/A");

  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 320, dY, "Date & Time:");
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 10, 400, dY, `${data.bookingDate || "Today"} ${data.bookingTime || ""}`.trim());

  // Section 2: Crop & Order Specifications Card
  curY = curY - 170;
  setFillColor(0.94, 0.97, 0.95);
  setStrokeColor(0.80, 0.90, 0.83);
  drawRect(40, curY - 160, pageWidth - 80, 170, true, true);

  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 13, 55, curY - 5, "2. Crop Reservation Information");

  setStrokeColor(0.80, 0.90, 0.83);
  drawLine(55, curY - 15, pageWidth - 55, curY - 15, 1);

  dY = curY - 38;

  // Crop Name
  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 55, dY, "Crop Name:");
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 11, 160, dY, data.cropName || "N/A");

  // Quantity & Unit
  dY -= rowH;
  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 55, dY, "Reserved Quantity:");
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 11, 160, dY, `${data.quantity} ${data.unit}`);

  // Reference Price
  dY -= rowH;
  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 55, dY, "Reference Price:");
  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 11, 160, dY, `INR ${data.referencePrice} / ${data.unit}`);

  // Preferred Location
  dY -= rowH;
  setFillColor(0.35, 0.45, 0.40);
  drawText("F2", 10, 55, dY, "Preferred Location:");
  setFillColor(0.106, 0.263, 0.196);
  drawText("F2", 10, 160, dY, data.preferredLocation || "Direct Farm Dispatch");

  // Notes
  if (data.notes) {
    dY -= rowH;
    setFillColor(0.35, 0.45, 0.40);
    drawText("F2", 10, 55, dY, "Special Notes:");
    setFillColor(0.106, 0.263, 0.196);
    drawText("F3", 9, 160, dY, data.notes.substring(0, 50));
  }

  // Section 3: Next Steps & Instructions Box
  curY = curY - 190;
  setFillColor(0.90, 0.95, 0.92);
  setStrokeColor(0.70, 0.85, 0.75);
  drawRect(40, curY - 70, pageWidth - 80, 80, true, true);

  setFillColor(0.106, 0.263, 0.196);
  drawText("F1", 11, 55, curY - 10, "Important Instructions & Next Steps");
  setFillColor(0.20, 0.35, 0.25);
  drawText("F2", 9, 55, curY - 28, "* This document serves as your verified electronic pre-booking confirmation voucher.");
  drawText("F2", 9, 55, curY - 42, "* The farmer / supplier will contact you prior to harvest dispatch to coordinate delivery.");
  drawText("F2", 9, 55, curY - 56, "* For queries, keep your Booking ID handy and track status in AgriNex 'My Bookings'.");

  // Bottom Footer
  setStrokeColor(0.75, 0.85, 0.78);
  drawLine(40, 55, pageWidth - 40, 55, 1);

  setFillColor(0.40, 0.50, 0.45);
  drawText("F2", 8, 40, 40, "AgriNex Platforms * Smart Farming * Better Tomorrow");
  drawText("F2", 8, pageWidth - 200, 40, `Generated on ${new Date().toLocaleDateString()} | System Verified`);

  const streamContent = ops.join("\n");
  const streamLength = Buffer.byteLength(streamContent, "utf8");

  // 3: Page Object
  // 4: Content Stream Object
  // 5: Font F1 (Helvetica-Bold)
  // 6: Font F2 (Helvetica)
  // 7: Font F3 (Helvetica-Oblique)

  const pageObj = `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${pageWidth.toFixed(2)} ${pageHeight.toFixed(2)}] /Contents 4 0 R /Resources << /Font << /F1 5 0 R /F2 6 0 R /F3 7 0 R >> >> >>`;
  const streamObj = `<< /Length ${streamLength} >>\nstream\n${streamContent}\nendstream`;
  const fontF1Obj = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Bold >>`;
  const fontF2Obj = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>`;
  const fontF3Obj = `<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica-Oblique >>`;

  addObject(pageObj);   // 3
  addObject(streamObj); // 4
  addObject(fontF1Obj); // 5
  addObject(fontF2Obj); // 6
  addObject(fontF3Obj); // 7

  // Assemble full PDF with XREF table
  let pdfOutput = "%PDF-1.4\n%\xE2\xE3\xCF\xD3\n";
  const offsets: number[] = [0];

  for (let i = 0; i < objects.length; i++) {
    offsets.push(Buffer.byteLength(pdfOutput, "utf8"));
    pdfOutput += `${i + 1} 0 obj\n${objects[i]}\nendobj\n`;
  }

  const xrefStart = Buffer.byteLength(pdfOutput, "utf8");
  pdfOutput += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;

  for (let i = 1; i <= objects.length; i++) {
    const offStr = offsets[i].toString().padStart(10, "0");
    pdfOutput += `${offStr} 00000 n \n`;
  }

  pdfOutput += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF\n`;

  return Buffer.from(pdfOutput, "utf8");
}
