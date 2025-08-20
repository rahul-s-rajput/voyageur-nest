// Simple Excel export utility using dynamic import to avoid bundling issues.
// Uses 'xlsx-js-style' for compatibility with our professional exporter.

export interface ExcelExportData {
  sheetName: string;
  data: any[];
  columns?: string[];
}

export async function exportToExcel(exportData: ExcelExportData[], filename: string): Promise<boolean> {
  const XLSX = (await import('xlsx-js-style')).default;
  const workbook = XLSX.utils.book_new();

  exportData.forEach(({ sheetName, data, columns }) => {
    // Create worksheet from data
    const worksheet = XLSX.utils.json_to_sheet(data);
    
    // If columns are specified, set column widths
    if (columns) {
      const colWidths = columns.map(col => ({ wch: Math.max(col.length, 15) }));
      worksheet['!cols'] = colWidths;
    }
    
    // Add worksheet to workbook
    const safeSheetName = sheetName.substring(0, 31);
    XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
  });

  // Write file
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx', compression: true, type: 'binary' });
  return true;
}

