// Utility to export a DOM element to multi-page PDF with minimal header and page numbers
// Uses html2pdf.js (html2canvas + jsPDF)

export async function exportInvoiceById(
  elementId: string,
  filename: string,
  options?: {
    headerText?: string;
    margin?: [number, number, number, number]; // [top, right, bottom, left] in mm
    scale?: number; // html2canvas scale
  }
) {
  const el = document.getElementById(elementId);
  if (!el) throw new Error(`Element with id "${elementId}" not found`);

  // Add an 'exporting' class to enable export-specific CSS
  el.classList.add('exporting');
  const containerEl = el.closest('.invoice-container') as HTMLElement | null;
  if (containerEl) containerEl.classList.add('exporting');
  
  // Calculate dynamic spacer height for single-page invoices
  const margins: [number, number, number, number] = options?.margin || [10, 10, 10, 10];
  const spacer = el.querySelector('.invoice-spacer') as HTMLElement | null;
  const originalSpacerHeight = spacer?.style.height;
  
  if (spacer) {
    try {
      // Reset spacer to measure actual content
      spacer.style.height = '0px';
      spacer.style.minHeight = '0px';
      spacer.style.flex = 'none';
      
      // Force layout recalculation
      el.offsetHeight;
      
      // Get the footer section
      const footerSection = el.querySelector('.invoice-footer-section') as HTMLElement | null;
      const mainContent = el.querySelector('.invoice-main') as HTMLElement | null;
      const header = el.querySelector('.invoice-header-main') as HTMLElement | null;
      
      if (footerSection && mainContent && header) {
        // Calculate heights
        const headerHeight = header.offsetHeight;
        const mainHeight = mainContent.offsetHeight;
        const footerHeight = footerSection.offsetHeight;
        const totalContentHeight = headerHeight + mainHeight + footerHeight;
        
        // A4 page height in pixels (approximately)
        const pxPerMm = 3.7795275591;
        const pageHeightMm = 297;
        const availableHeightMm = pageHeightMm - margins[0] - margins[2];
        const availableHeightPx = availableHeightMm * pxPerMm;
        
        // Calculate if content fits on one page
        if (totalContentHeight < availableHeightPx * 0.85) { // 85% to leave some buffer
          // Content fits on one page, calculate spacer
          const spacerHeight = availableHeightPx - totalContentHeight - 50; // 50px buffer
          if (spacerHeight > 20) {
            spacer.style.height = `${spacerHeight}px`;
            spacer.style.minHeight = `${spacerHeight}px`;
          } else {
            spacer.style.display = 'none';
          }
        } else {
          // Content needs multiple pages, remove spacer
          spacer.style.display = 'none';
        }
      } else {
        // If we can't find elements, don't use spacer
        spacer.style.display = 'none';
      }
    } catch (err) {
      console.error('Spacer calculation error:', err);
      if (spacer) spacer.style.display = 'none';
    }
  }
  
  // Wait for layout update
  await new Promise<void>((resolve) => setTimeout(resolve, 100));

  try {
    // Dynamic import
    const html2pdfMod: any = (await import('html2pdf.js')).default || (await import('html2pdf.js'));

    const margin: [number, number, number, number] = margins;
    const scale = options?.scale ?? 2;
    const headerText = options?.headerText || '';

    const opt = {
      margin,
      filename,
      image: { 
        type: 'jpeg',
        quality: 0.98
      },
      html2canvas: { 
        scale, 
        useCORS: true, 
        backgroundColor: '#ffffff',
        letterRendering: true, 
        logging: false,
        scrollX: 0,
        scrollY: 0,
        windowWidth: el.scrollWidth,
        windowHeight: el.scrollHeight,
        removeContainer: false
      },
      jsPDF: { 
        unit: 'mm', 
        format: 'a4', 
        orientation: 'portrait',
        compress: true
      },
      pagebreak: { 
        mode: ['avoid-all', 'css', 'legacy'],
        before: '.page-break-before',
        after: '.page-break-after',
        avoid: [
          '.invoice-footer-section',
          '.summary-section',
          '.amount-words',
          '.terms-section',
          '.invoice-footer',
          '.signature-section',
          '.avoid-break',
          'tr'
        ]
      },
      enableLinks: false
    };

    // Build worker
    const worker = html2pdfMod()
      .set(opt)
      .from(el)
      .toPdf();

    // Get PDF and add page numbers
    const pdf = await worker.get('pdf');
    const totalPages = pdf.internal.getNumberOfPages();
    
    if (totalPages > 1 || headerText) {
      pdf.setFont('helvetica', 'normal');
      pdf.setFontSize(8);
      pdf.setTextColor(100, 100, 100);

      for (let i = 1; i <= totalPages; i++) {
        pdf.setPage(i);
        
        // Header (only if provided)
        if (headerText) {
          pdf.text(headerText, margin[3], margin[0] - 2);
        }
        
        // Page number (only if multiple pages)
        if (totalPages > 1) {
          const label = `Page ${i} of ${totalPages}`;
          const pageWidth = pdf.internal.pageSize.getWidth();
          const pageHeight = pdf.internal.pageSize.getHeight();
          const textWidth = pdf.getTextWidth(label);
          pdf.text(label, pageWidth - margin[1] - textWidth, pageHeight - margin[2] + 3);
        }
      }
    }

    // Save PDF
    await worker.save();
  } finally {
    // Clean up
    el.classList.remove('exporting');
    if (containerEl) containerEl.classList.remove('exporting');
    if (spacer) {
      spacer.style.height = originalSpacerHeight || '';
      spacer.style.minHeight = '';
      spacer.style.flex = '';
      spacer.style.display = '';
    }
  }
}
