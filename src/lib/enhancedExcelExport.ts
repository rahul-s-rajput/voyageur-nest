// Deprecated/legacy module: forward to professionalExcelExport to avoid bundling plain 'xlsx'.
// XLSX is declared only to satisfy references in legacy helpers below (which are no longer used).
// Do not use this symbol at runtime.
// eslint-disable-next-line @typescript-eslint/no-unused-vars
declare const XLSX: any;

// Professional color scheme for the reports
const COLORS = {
  // Primary brand colors
  primaryDark: 'FF1E3A7B',    // Deep blue
  primaryMedium: 'FF2563EB',  // Bright blue
  primaryLight: 'FFDBEAFE',   // Light purple-blue
  accent: 'FF10B981',          // Emerald green
  
  // Status colors
  success: 'FF22C55E',         // Green
  warning: 'FFF59E0B',         // Amber
  danger: 'FFEF4444',          // Red
  info: 'FF3B82F6',           // Blue
  
  // Neutral colors
  headerBg: 'FF1F2937',        // Dark gray
  headerText: 'FFFFFFFF',      // White
  subHeaderBg: 'FF374151',     // Medium gray
  alternateRow: 'FFF9FAFB',    // Very light gray
  borderColor: 'FFE5E7EB',     // Light gray border
  
  // Financial colors
  profit: 'FF059669',          // Dark green
  loss: 'FFDC2626',           // Dark red
  neutral: 'FF6B7280'          // Gray
};

// Professional font styles
const FONTS = {
  title: { name: 'Calibri', sz: 18, bold: true, color: { rgb: COLORS.headerText } },
  subtitle: { name: 'Calibri', sz: 14, bold: true, color: { rgb: COLORS.primaryDark } },
  header: { name: 'Calibri', sz: 11, bold: true, color: { rgb: COLORS.headerText } },
  subHeader: { name: 'Calibri', sz: 10, bold: true, color: { rgb: COLORS.headerText } },
  normal: { name: 'Calibri', sz: 10 },
  small: { name: 'Calibri', sz: 9 },
  emphasis: { name: 'Calibri', sz: 10, bold: true },
  currency: { name: 'Calibri', sz: 10 },
  percentage: { name: 'Calibri', sz: 10 }
};

// Number formats
const FORMATS = {
  currency: '₹#,##0.00',
  currencyNoDecimal: '₹#,##0',
  percentage: '0.0%',
  percentageNoDecimal: '0%',
  number: '#,##0',
  decimal: '#,##0.00',
  date: 'dd-mmm-yyyy',
  dateTime: 'dd-mmm-yyyy hh:mm'
};

// Cell styles
const STYLES = {
  title: {
    font: FONTS.title,
    fill: { fgColor: { rgb: COLORS.primaryDark } },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  subtitle: {
    font: FONTS.subtitle,
    alignment: { horizontal: 'left', vertical: 'center' }
  },
  header: {
    font: FONTS.header,
    fill: { fgColor: { rgb: COLORS.headerBg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  subHeader: {
    font: FONTS.subHeader,
    fill: { fgColor: { rgb: COLORS.subHeaderBg } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  normal: {
    font: FONTS.normal,
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  currency: {
    font: FONTS.currency,
    numFmt: FORMATS.currency,
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  percentage: {
    font: FONTS.percentage,
    numFmt: FORMATS.percentage,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  total: {
    font: FONTS.emphasis,
    fill: { fgColor: { rgb: COLORS.primaryLight } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'double', color: { rgb: COLORS.primaryDark } },
      bottom: { style: 'double', color: { rgb: COLORS.primaryDark } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  profit: {
    font: { ...FONTS.emphasis, color: { rgb: COLORS.profit } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  loss: {
    font: { ...FONTS.emphasis, color: { rgb: COLORS.loss } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  highlight: {
    font: FONTS.emphasis,
    fill: { fgColor: { rgb: COLORS.accent } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: COLORS.primaryDark } },
      bottom: { style: 'medium', color: { rgb: COLORS.primaryDark } },
      left: { style: 'medium', color: { rgb: COLORS.primaryDark } },
      right: { style: 'medium', color: { rgb: COLORS.primaryDark } }
    }
  }
};

export interface EnhancedExcelExportData {
  sheetName: string;
  data: any[];
  columns?: string[];
  skipCoverSheet?: boolean;
}

interface CoverSheetData {
  propertyName?: string;
  dateRange?: { start: string; end: string };
  generatedDate?: string;
  totalSheets?: number;
  reportType?: string;
}

// Helper function to convert column index to Excel column letter
function getColumnLetter(col: number): string {
  let letter = '';
  while (col >= 0) {
    letter = String.fromCharCode((col % 26) + 65) + letter;
    col = Math.floor(col / 26) - 1;
  }
  return letter;
}


// Enhanced function to determine data type and format
function inferDataType(value: any, columnName?: string): { type: string; format?: string } {
  if (value === null || value === undefined) return { type: 'normal' };
  
  const colLower = columnName?.toLowerCase() || '';
  
  // Check column name for hints
  if (colLower.includes('amount') || colLower.includes('revenue') || 
      colLower.includes('cost') || colLower.includes('expense') || 
      colLower.includes('price') || colLower.includes('total') ||
      colLower.includes('adr') || colLower.includes('revpar') ||
      colLower.includes('₹')) {
    return { type: 'currency' };
  }
  
  if (colLower.includes('rate') || colLower.includes('percentage') || 
      colLower.includes('%') || colLower.includes('margin') ||
      colLower.includes('utilization')) {
    return { type: 'percentage' };
  }
  
  if (colLower.includes('date') || colLower.includes('time')) {
    return { type: 'date' };
  }
  
  if (colLower.includes('count') || colLower.includes('number') || 
      colLower.includes('quantity') || colLower.includes('nights') ||
      colLower.includes('days') || colLower.includes('bookings')) {
    return { type: 'number' };
  }
  
  // Check value type
  if (typeof value === 'number') {
    if (value >= 0 && value <= 1 && colLower.includes('rate')) {
      return { type: 'percentage' };
    }
    if (value > 100) {
      return { type: 'currency' };
    }
    return { type: 'number' };
  }
  
  return { type: 'normal' };
}

export async function exportToEnhancedExcel(
  exportData: EnhancedExcelExportData[], 
  filename: string,
  coverData?: CoverSheetData
): Promise<boolean> {
  const { exportToEnhancedExcel: forward } = await import('./professionalExcelExport');
  return forward(exportData, filename, coverData);
}

// Export a simpler version for backward compatibility
export async function exportToExcel(exportData: EnhancedExcelExportData[], filename: string): Promise<boolean> {
  return exportToEnhancedExcel(exportData, filename);
}
