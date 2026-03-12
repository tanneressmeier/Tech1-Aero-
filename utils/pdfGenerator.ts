import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Tool } from '../types.ts';

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