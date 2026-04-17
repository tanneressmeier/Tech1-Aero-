import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tool, Quote, WorkOrder, RepairOrder, Aircraft } from '../types.ts';

// Simple SVG logo for the report header
const AERO_LOGO_SVG = `
<svg width="100" height="24" viewBox="0 0 100 24" fill="none" xmlns="http://www.w3.org/2000/svg">
  <path d="M12.333 0L0 20.833H6.667L12.333 10.417L18 20.833H24.667L12.333 0Z" fill="#00BFFF"/>
  <text x="30" y="18" font-family="sans-serif" font-size="16" font-weight="bold" fill="#334155">Tech1 Aero</text>
</svg>`;

/**
 * Converts an SVG string to a PNG Data URL using a canvas.
 * @param svgXml The SVG string to convert.
 * @returns A promise that resolves with the PNG data URL.
 */
const svgToPngDataUrl = (svgXml: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const canvas = document.createElement('canvas');
    // Use a higher resolution canvas for better quality in the PDF
    const canvasWidth = 200;
    const canvasHeight = 48; // Maintain 100x24 aspect ratio

    img.onload = () => {
      canvas.width = canvasWidth;
      canvas.height = canvasHeight;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0, canvasWidth, canvasHeight);
        const dataUrl = canvas.toDataURL('image/png');
        URL.revokeObjectURL(img.src); // Clean up blob URL
        resolve(dataUrl);
      } else {
        reject(new Error("Canvas context could not be created."));
      }
    };
    img.onerror = (e) => {
      URL.revokeObjectURL(img.src);
      reject(e);
    };
    
    const svgBlob = new Blob([svgXml], { type: 'image/svg+xml;charset=utf-8' });
    img.src = URL.createObjectURL(svgBlob);
  });
};


export const generateToolingReportPDF = async (tools: Tool[], title: string) => {
    const doc = new jsPDF();

    const tableColumns = ["Tool #", "Description", "Serial #", "Calibration Due"];
    const tableRows = tools.map(tool => [
        tool.name,
        tool.description,
        tool.serial || 'N/A',
        tool.calibrationDueDate ? new Date(tool.calibrationDueDate).toLocaleDateString() : 'N/A'
    ]);
    
    const logoDataUrl = await svgToPngDataUrl(AERO_LOGO_SVG);

    autoTable(doc, {
        head: [tableColumns],
        body: tableRows,
        startY: 35,
        theme: 'grid',
        headStyles: { fillColor: '#1e293b' },
        didDrawPage: function (data) {
            // Header
            doc.addImage(logoDataUrl, 'PNG', data.settings.margin.left, 15, 30, 8);
            
            doc.setFontSize(18);
            doc.setTextColor('#1e293b');
            doc.text(title, data.settings.margin.left + 35, 22, { baseline: 'middle' });
            
            doc.setFontSize(10);
            doc.setTextColor('#334155');
            doc.text(`Report generated on: ${new Date().toLocaleDateString()}`, doc.internal.pageSize.getWidth() - data.settings.margin.right, 22, { align: 'right', baseline: 'middle' });


            // Footer
            const pageCount = (doc as any).internal.getNumberOfPages();
            doc.setFontSize(8);
            doc.setTextColor('#64748b');
            for (let i = 1; i <= pageCount; i++) {
                doc.setPage(i);
                doc.text(`Page ${i} of ${pageCount}`, doc.internal.pageSize.getWidth() / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });
            }
        },
    });

    doc.save(`${title.toLowerCase().replace(/ /g, '_')}_report.pdf`);
};
export const generateQuotePDF = async (
    quote: Quote,
    order: WorkOrder | RepairOrder,
    aircraft: Aircraft,
    orgName: string = 'Tech1 Aero Systems',
    repairStationNum: string = ''
) => {
    const doc = new jsPDF();
    const orderId = 'wo_id' in order ? order.wo_id : order.ro_id;
    const orderType = 'wo_id' in order ? 'Work Order' : 'Repair Order';
    const pageW = doc.internal.pageSize.getWidth();
    const margin = 15;

    const logoDataUrl = await svgToPngDataUrl(AERO_LOGO_SVG);

    // ── Header ────────────────────────────────────────────────────────────
    doc.addImage(logoDataUrl, 'PNG', margin, 12, 30, 8);

    doc.setFontSize(22);
    doc.setTextColor('#1e293b');
    doc.text('QUOTE', pageW - margin, 18, { align: 'right' });

    doc.setFontSize(9);
    doc.setTextColor('#64748b');
    doc.text(orgName, margin, 26);
    if (repairStationNum) doc.text(`Repair Station: ${repairStationNum}`, margin, 31);
    doc.text(`Date: ${new Date().toLocaleDateString()}`, pageW - margin, 26, { align: 'right' });
    doc.text(`${orderType}: ${orderId}`, pageW - margin, 31, { align: 'right' });
    doc.text(`Aircraft: ${aircraft.tail_number} — ${aircraft.make} ${aircraft.model}`, pageW - margin, 36, { align: 'right' });

    // ── Customer description ──────────────────────────────────────────────
    doc.setDrawColor('#e2e8f0');
    doc.setLineWidth(0.3);
    doc.line(margin, 42, pageW - margin, 42);

    doc.setFontSize(10);
    doc.setTextColor('#1e293b');
    doc.text('Description of Work Performed', margin, 49);

    doc.setFontSize(9);
    doc.setTextColor('#334155');
    const descLines = doc.splitTextToSize(quote.customerDescription, pageW - margin * 2);
    doc.text(descLines, margin, 56);
    const descHeight = descLines.length * 5;

    // ── Line items table ──────────────────────────────────────────────────
    const tableStartY = 58 + descHeight;

    autoTable(doc, {
        head: [['Description', 'Part #', 'Qty', 'Unit Price', 'Total']],
        body: quote.lineItems.map(item => [
            item.description,
            item.part_no || '—',
            item.quantity.toString(),
            `$${item.unitPrice.toFixed(2)}`,
            `$${item.total.toFixed(2)}`,
        ]),
        startY: tableStartY,
        theme: 'grid',
        headStyles: { fillColor: '#1e293b', textColor: '#ffffff', fontSize: 9 },
        bodyStyles: { fontSize: 9, textColor: '#334155' },
        columnStyles: {
            0: { cellWidth: 'auto' },
            1: { cellWidth: 28 },
            2: { cellWidth: 14, halign: 'center' },
            3: { cellWidth: 26, halign: 'right' },
            4: { cellWidth: 26, halign: 'right' },
        },
        margin: { left: margin, right: margin },
    });

    // ── Totals block ──────────────────────────────────────────────────────
    const finalY = (doc as any).lastAutoTable.finalY + 6;
    const totalsX = pageW - margin - 70;

    const totalsRows: [string, string][] = [
        ['Labor',        `$${quote.laborTotal.toFixed(2)}`],
        ['Parts',        `$${quote.partsTotal.toFixed(2)}`],
        ['Shop Supplies',`$${quote.shopSupplies.toFixed(2)}`],
        ['Subtotal',     `$${quote.subtotal.toFixed(2)}`],
        ['Tax',          `$${quote.tax.toFixed(2)}`],
    ];

    doc.setFontSize(9);
    let rowY = finalY;
    for (const [label, value] of totalsRows) {
        doc.setTextColor('#64748b');
        doc.text(label, totalsX, rowY);
        doc.setTextColor('#334155');
        doc.text(value, pageW - margin, rowY, { align: 'right' });
        rowY += 6;
    }

    doc.setDrawColor('#1e293b');
    doc.setLineWidth(0.5);
    doc.line(totalsX, rowY - 1, pageW - margin, rowY - 1);

    doc.setFontSize(11);
    doc.setTextColor('#1e293b');
    doc.text('Total Due', totalsX, rowY + 5);
    doc.setFont('helvetica', 'bold');
    doc.text(`$${quote.grandTotal.toFixed(2)}`, pageW - margin, rowY + 5, { align: 'right' });
    doc.setFont('helvetica', 'normal');

    // ── Footer ────────────────────────────────────────────────────────────
    doc.setFontSize(8);
    doc.setTextColor('#94a3b8');
    doc.text('Thank you for your business.', pageW / 2, doc.internal.pageSize.getHeight() - 10, { align: 'center' });

    doc.save(`quote-${orderId}-${new Date().toISOString().split('T')[0]}.pdf`);
};
