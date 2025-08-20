// NOTE: Avoid static import of 'xlsx-js-style' to prevent Vite optimize errors.
// We'll dynamically import it inside the export function when needed.

// Professional color palette for the reports
const COLORS = {
  // Brand colors (matching your app theme)
  primaryDark: '1E293B',      // Slate 800
  primaryMedium: '3B82F6',    // Blue 500
  primaryLight: 'EFF6FF',     // Blue 50
  accent: '10B981',           // Emerald 500
  accentLight: 'D1FAE5',      // Emerald 100
  
  // Status colors
  success: '22C55E',          // Green 500
  successLight: 'DCFCE7',     // Green 100
  warning: 'F59E0B',          // Amber 500
  warningLight: 'FEF3C7',     // Amber 100
  danger: 'EF4444',           // Red 500
  dangerLight: 'FEE2E2',      // Red 100
  info: '3B82F6',            // Blue 500
  infoLight: 'DBEAFE',       // Blue 200
  
  // Neutral colors
  headerBg: '1F2937',         // Gray 800
  headerText: 'FFFFFF',       // White
  subHeaderBg: '4B5563',      // Gray 600
  alternateRow: 'F9FAFB',     // Gray 50
  lightBg: 'F3F4F6',         // Gray 100
  borderColor: 'D1D5DB',      // Gray 300
  textPrimary: '111827',      // Gray 900
  textSecondary: '6B7280',    // Gray 500
  
  // Financial colors
  profit: '059669',           // Emerald 600
  loss: 'DC2626',            // Red 600
  neutral: '6B7280',          // Gray 500
  
  // Chart colors (for visual indicators)
  chart1: '8B5CF6',          // Violet 500
  chart2: 'EC4899',          // Pink 500
  chart3: '14B8A6',          // Teal 500
  chart4: 'F97316',          // Orange 500
};

// Professional typography
const FONTS = {
  brandTitle: { 
    name: 'Segoe UI', 
    sz: 24, 
    bold: true, 
    color: { rgb: COLORS.primaryDark }
  },
  reportTitle: { 
    name: 'Segoe UI', 
    sz: 20, 
    bold: true, 
    color: { rgb: COLORS.headerText }
  },
  sectionTitle: { 
    name: 'Segoe UI', 
    sz: 16, 
    bold: true, 
    color: { rgb: COLORS.primaryMedium }
  },
  header: { 
    name: 'Segoe UI Semibold', 
    sz: 11, 
    bold: true, 
    color: { rgb: COLORS.headerText }
  },
  subHeader: { 
    name: 'Segoe UI', 
    sz: 10, 
    bold: true, 
    color: { rgb: COLORS.textPrimary }
  },
  normal: { 
    name: 'Segoe UI', 
    sz: 10, 
    color: { rgb: COLORS.textPrimary }
  },
  small: { 
    name: 'Segoe UI', 
    sz: 9, 
    color: { rgb: COLORS.textSecondary }
  },
  emphasis: { 
    name: 'Segoe UI Semibold', 
    sz: 10, 
    bold: true, 
    color: { rgb: COLORS.textPrimary }
  },
  metric: {
    name: 'Segoe UI',
    sz: 12,
    bold: true,
    color: { rgb: COLORS.primaryDark }
  }
};

// Professional number formats
const FORMATS = {
  currency: '₹#,##0.00;[Red](₹#,##0.00)',
  currencyNoDecimal: '₹#,##0;[Red](₹#,##0)',
  currencyPositive: '[Green]₹#,##0.00;[Red](₹#,##0.00)',
  percentage: '0.0%;[Red]-0.0%',
  percentageNoDecimal: '0%;[Red]-0%',
  percentageWithColor: '[Green]0.0%▲;[Red]-0.0%▼',
  number: '#,##0;[Red]-#,##0',
  decimal: '#,##0.00;[Red]-#,##0.00',
  date: 'dd-mmm-yyyy',
  dateTime: 'dd-mmm-yyyy hh:mm AM/PM',
  month: 'mmm yyyy',
};

// Icon symbols for visual indicators
const ICONS = {
  up: '▲',
  down: '▼',
  star: '★',
  check: '✓',
  cross: '✗',
  warning: '⚠',
  info: 'ⓘ',
  bullet: '●',
  arrow: '→',
};

// Cell style presets
const STYLES = {
  // Cover page styles
  coverTitle: {
    font: { 
      name: 'Segoe UI Light', 
      sz: 32, 
      color: { rgb: COLORS.primaryDark }
    },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  coverSubtitle: {
    font: { 
      name: 'Segoe UI', 
      sz: 18, 
      color: { rgb: COLORS.primaryMedium }
    },
    alignment: { horizontal: 'center', vertical: 'center' }
  },
  coverSection: {
    font: FONTS.sectionTitle,
    fill: { fgColor: { rgb: COLORS.primaryLight } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      bottom: { style: 'medium', color: { rgb: COLORS.primaryMedium } }
    }
  },
  
  // Headers
  mainHeader: {
    font: FONTS.header,
    fill: { fgColor: { rgb: COLORS.headerBg } },
    alignment: { horizontal: 'center', vertical: 'center', wrapText: true },
    border: {
      top: { style: 'medium', color: { rgb: COLORS.headerBg } },
      bottom: { style: 'medium', color: { rgb: COLORS.headerBg } },
      left: { style: 'thin', color: { rgb: COLORS.headerBg } },
      right: { style: 'thin', color: { rgb: COLORS.headerBg } }
    }
  },
  categoryHeader: {
    font: { ...FONTS.subHeader, color: { rgb: COLORS.headerText } },
    fill: { fgColor: { rgb: COLORS.subHeaderBg } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  
  // Data cells
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
  alternateRow: {
    font: FONTS.normal,
    fill: { fgColor: { rgb: COLORS.alternateRow } },
    alignment: { horizontal: 'left', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  
  // Financial cells
  currency: {
    font: FONTS.normal,
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
    font: FONTS.normal,
    numFmt: FORMATS.percentage,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  
  // Status cells
  successCell: {
    font: { ...FONTS.emphasis, color: { rgb: COLORS.success } },
    fill: { fgColor: { rgb: COLORS.successLight } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.success } },
      bottom: { style: 'thin', color: { rgb: COLORS.success } },
      left: { style: 'thin', color: { rgb: COLORS.success } },
      right: { style: 'thin', color: { rgb: COLORS.success } }
    }
  },
  warningCell: {
    font: { ...FONTS.emphasis, color: { rgb: COLORS.warning } },
    fill: { fgColor: { rgb: COLORS.warningLight } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.warning } },
      bottom: { style: 'thin', color: { rgb: COLORS.warning } },
      left: { style: 'thin', color: { rgb: COLORS.warning } },
      right: { style: 'thin', color: { rgb: COLORS.warning } }
    }
  },
  dangerCell: {
    font: { ...FONTS.emphasis, color: { rgb: COLORS.danger } },
    fill: { fgColor: { rgb: COLORS.dangerLight } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.danger } },
      bottom: { style: 'thin', color: { rgb: COLORS.danger } },
      left: { style: 'thin', color: { rgb: COLORS.danger } },
      right: { style: 'thin', color: { rgb: COLORS.danger } }
    }
  },
  
  // Summary rows
  totalRow: {
    font: { ...FONTS.emphasis, sz: 11 },
    fill: { fgColor: { rgb: COLORS.lightBg } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'double', color: { rgb: COLORS.primaryDark } },
      bottom: { style: 'double', color: { rgb: COLORS.primaryDark } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  },
  grandTotalRow: {
    font: { ...FONTS.emphasis, sz: 12, color: { rgb: COLORS.headerText } },
    fill: { fgColor: { rgb: COLORS.primaryDark } },
    alignment: { horizontal: 'right', vertical: 'center' },
    border: {
      top: { style: 'double', color: { rgb: COLORS.primaryDark } },
      bottom: { style: 'double', color: { rgb: COLORS.primaryDark } },
      left: { style: 'medium', color: { rgb: COLORS.primaryDark } },
      right: { style: 'medium', color: { rgb: COLORS.primaryDark } }
    }
  },
  
  // KPI cells
  kpiValue: {
    font: FONTS.metric,
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'medium', color: { rgb: COLORS.primaryMedium } },
      bottom: { style: 'medium', color: { rgb: COLORS.primaryMedium } },
      left: { style: 'medium', color: { rgb: COLORS.primaryMedium } },
      right: { style: 'medium', color: { rgb: COLORS.primaryMedium } }
    }
  },
  kpiLabel: {
    font: { ...FONTS.small, bold: true },
    fill: { fgColor: { rgb: COLORS.primaryLight } },
    alignment: { horizontal: 'center', vertical: 'center' },
    border: {
      top: { style: 'thin', color: { rgb: COLORS.borderColor } },
      bottom: { style: 'thin', color: { rgb: COLORS.borderColor } },
      left: { style: 'thin', color: { rgb: COLORS.borderColor } },
      right: { style: 'thin', color: { rgb: COLORS.borderColor } }
    }
  }
};

export interface EnhancedExcelExportData {
  sheetName: string;
  data: any[];
  columns?: string[];
  skipCoverSheet?: boolean;
  sheetConfig?: {
    headerRows?: number;
    freezePane?: { row: number; col: number };
    columnWidths?: number[];
    hideColumns?: number[];
    groupColumns?: { start: number; end: number }[];
  };
}

interface CoverSheetData {
  propertyName?: string;
  dateRange?: { start: string; end: string };
  generatedDate?: string;
  totalSheets?: number;
  reportType?: string;
}

// (removed) getColumnLetter helper was unused

// Create a professional cover sheet with branding
function createProfessionalCoverSheet(coverData: CoverSheetData): any[] {
  const now = new Date();
  const formattedDate = now.toLocaleDateString('en-IN', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
  const formattedTime = now.toLocaleTimeString('en-IN', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  });
  
  const coverRows = [];
  
  // Add spacing
  for (let i = 0; i < 4; i++) coverRows.push(['']);
  
  // Main branding section
  coverRows.push(['', '', 'VOYAGEURNEST']);
  coverRows.push(['', '', 'Property Management System']);
  coverRows.push(['']);
  coverRows.push(['', '', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━']);
  coverRows.push(['']);
  coverRows.push(['', '', 'ANALYTICS & PERFORMANCE REPORT']);
  coverRows.push(['']);
  coverRows.push(['', '', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━']);
  
  // Add spacing
  for (let i = 0; i < 3; i++) coverRows.push(['']);
  
  // Property details section
  coverRows.push(['', '', 'PROPERTY DETAILS', '']);
  coverRows.push(['', '', 'Property:', coverData.propertyName || 'All Properties']);
  coverRows.push(['', '', 'Report Type:', coverData.reportType || 'Comprehensive Analytics']);
  coverRows.push(['', '', 'Total Sections:', coverData.totalSheets || 1]);
  
  coverRows.push(['']);
  
  // Period section
  coverRows.push(['', '', 'REPORTING PERIOD', '']);
  coverRows.push(['', '', 'From:', coverData.dateRange?.start || 'N/A']);
  coverRows.push(['', '', 'To:', coverData.dateRange?.end || 'N/A']);
  
  const days = coverData.dateRange ? 
    Math.ceil((new Date(coverData.dateRange.end).getTime() - new Date(coverData.dateRange.start).getTime()) / (1000 * 60 * 60 * 24)) + 1 : 0;
  coverRows.push(['', '', 'Duration:', `${days} days`]);
  
  coverRows.push(['']);
  
  // Generation info
  coverRows.push(['', '', 'REPORT INFORMATION', '']);
  coverRows.push(['', '', 'Generated On:', formattedDate]);
  coverRows.push(['', '', 'Generated At:', formattedTime]);
  coverRows.push(['', '', 'Format:', 'Microsoft Excel (.xlsx)']);
  coverRows.push(['', '', 'Version:', '3.0 Professional']);
  
  // Add spacing
  for (let i = 0; i < 3; i++) coverRows.push(['']);
  
  // Performance highlights placeholder
  coverRows.push(['', '', 'KEY PERFORMANCE HIGHLIGHTS', '']);
  coverRows.push(['', '', '• Revenue Performance', 'Above Target']);
  coverRows.push(['', '', '• Occupancy Rate', 'Optimal']);
  coverRows.push(['', '', '• Guest Satisfaction', 'Excellent']);
  coverRows.push(['', '', '• Expense Control', 'Within Budget']);
  
  // Add spacing
  for (let i = 0; i < 3; i++) coverRows.push(['']);
  
  // Footer
  coverRows.push(['', '', '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━']);
  coverRows.push(['', '', '© 2024 VoyageurNest. All rights reserved.']);
  coverRows.push(['', '', 'This report contains confidential information.']);
  coverRows.push(['', '', 'For internal use only.']);
  
  return coverRows;
}

// Apply advanced styling to cover sheet
function styleProfessionalCoverSheet(ws: any) {
  if (!ws['!ref']) return ws;
  // Note: no need to decode range here; leaving the sheet ref untouched.
  
  // Set column widths
  ws['!cols'] = [
    { wch: 3 },   // Margin
    { wch: 3 },   // Margin
    { wch: 35 },  // Label column
    { wch: 45 },  // Value column
    { wch: 3 }    // Margin
  ];
  
  // Row heights
  ws['!rows'] = [];
  for (let i = 0; i < 50; i++) {
    ws['!rows'][i] = { hpt: i === 4 || i === 9 ? 28 : 18 };
  }
  
  // Apply specific styles
  const styleMap: { [key: string]: any } = {
    'C5': STYLES.coverTitle,          // VOYAGEURNEST
    'C6': STYLES.coverSubtitle,       // Property Management System
    'C10': { ...STYLES.coverTitle, font: { ...STYLES.coverTitle.font, sz: 24 } }, // Report title
    'C16': STYLES.coverSection,       // Property Details
    'C21': STYLES.coverSection,       // Reporting Period
    'C27': STYLES.coverSection,       // Report Information
    'C34': STYLES.coverSection,       // Key Highlights
  };
  
  // Apply styles to specific cells
  for (const [ref, style] of Object.entries(styleMap)) {
    if (ws[ref]) {
      ws[ref].s = style;
    }
  }
  
  // Style label cells (column C)
  for (let R = 16; R <= 40; R++) {
    const labelRef = `C${R}`;
    const valueRef = `D${R}`;
    
    if (ws[labelRef] && ws[labelRef].v && ws[labelRef].v.includes(':')) {
      ws[labelRef].s = {
        font: { ...FONTS.emphasis, color: { rgb: COLORS.primaryDark } },
        alignment: { horizontal: 'left', vertical: 'center' }
      };
    }
    
    if (ws[valueRef]) {
      ws[valueRef].s = {
        font: FONTS.normal,
        alignment: { horizontal: 'left', vertical: 'center' }
      };
      
      // Special styling for status values
      const value = ws[valueRef].v;
      if (value === 'Above Target' || value === 'Optimal' || value === 'Excellent') {
        ws[valueRef].s = {
          ...ws[valueRef].s,
          font: { ...FONTS.emphasis, color: { rgb: COLORS.success } }
        };
      } else if (value === 'Within Budget') {
        ws[valueRef].s = {
          ...ws[valueRef].s,
          font: { ...FONTS.emphasis, color: { rgb: COLORS.info } }
        };
      }
    }
  }
  
  // Merge cells for titles and sections
  ws['!merges'] = [
    { s: { r: 4, c: 2 }, e: { r: 4, c: 3 } },   // Main title
    { s: { r: 5, c: 2 }, e: { r: 5, c: 3 } },   // Subtitle
    { s: { r: 7, c: 2 }, e: { r: 7, c: 3 } },   // Separator
    { s: { r: 9, c: 2 }, e: { r: 9, c: 3 } },   // Report title
    { s: { r: 11, c: 2 }, e: { r: 11, c: 3 } },  // Separator
    { s: { r: 15, c: 2 }, e: { r: 15, c: 3 } },  // Property section
    { s: { r: 20, c: 2 }, e: { r: 20, c: 3 } },  // Period section
    { s: { r: 26, c: 2 }, e: { r: 26, c: 3 } },  // Report info section
    { s: { r: 33, c: 2 }, e: { r: 33, c: 3 } },  // Highlights section
    { s: { r: 41, c: 2 }, e: { r: 41, c: 3 } },  // Footer separator
  ];
  
  return ws;
}

// Enhanced data type detection with better heuristics
function detectDataType(value: any, columnName?: string): { 
  type: string; 
  format?: string; 
  style?: any;
} {
  if (value === null || value === undefined || value === '') {
    return { type: 'normal' };
  }
  
  const colLower = columnName?.toLowerCase() || '';
  
  // Currency detection
  if (colLower.match(/amount|revenue|cost|expense|price|total|adr|revpar|spent|₹|profit|loss|income|fee|charge|payment|budget/)) {
    return { 
      type: 'currency',
      format: FORMATS.currency,
      style: STYLES.currency
    };
  }
  
  // Percentage detection
  if (colLower.match(/rate|percentage|%|margin|utilization|occupancy|conversion|growth|change|variance/)) {
    return { 
      type: 'percentage',
      format: FORMATS.percentage,
      style: STYLES.percentage
    };
  }
  
  // Date detection
  if (colLower.match(/date|time|month|year|day|created|updated|generated|from|to|period/)) {
    return { 
      type: 'date',
      format: FORMATS.date,
      style: { ...STYLES.normal, alignment: { horizontal: 'center', vertical: 'center' } }
    };
  }
  
  // Number detection
  if (colLower.match(/count|number|quantity|nights|days|bookings|rooms|guests|transactions|id|index/)) {
    return { 
      type: 'number',
      format: FORMATS.number,
      style: { ...STYLES.normal, alignment: { horizontal: 'center', vertical: 'center' } }
    };
  }
  
  // Status detection
  if (colLower.match(/status|state|condition|result/)) {
    return { type: 'status' };
  }
  
  // Value-based detection
  if (typeof value === 'number') {
    if (value >= 0 && value <= 1 && colLower.includes('rate')) {
      return { 
        type: 'percentage',
        format: FORMATS.percentage,
        style: STYLES.percentage
      };
    }
    if (value > 1000 || value < -1000) {
      return { 
        type: 'currency',
        format: FORMATS.currency,
        style: STYLES.currency
      };
    }
    return { 
      type: 'number',
      format: FORMATS.number,
      style: { ...STYLES.normal, alignment: { horizontal: 'right', vertical: 'center' } }
    };
  }
  
  return { type: 'normal', style: STYLES.normal };
}

// Apply conditional formatting based on values
function applyConditionalFormatting(cell: any, value: any, columnName?: string): any {
  const style = cell.s || {};
  
  if (typeof value === 'number') {
    const colLower = columnName?.toLowerCase() || '';
    
    // Occupancy rate coloring
    if (colLower.includes('occupancy')) {
      if (value >= 80) {
        return {
          ...style,
          fill: { fgColor: { rgb: COLORS.successLight } },
          font: { ...style.font, color: { rgb: COLORS.success }, bold: true }
        };
      } else if (value >= 60) {
        return {
          ...style,
          fill: { fgColor: { rgb: COLORS.warningLight } },
          font: { ...style.font, color: { rgb: COLORS.warning } }
        };
      } else {
        return {
          ...style,
          fill: { fgColor: { rgb: COLORS.dangerLight } },
          font: { ...style.font, color: { rgb: COLORS.danger } }
        };
      }
    }
    
    // Profit/Loss coloring
    if (colLower.match(/profit|loss|variance|margin/)) {
      if (value > 0) {
        return {
          ...style,
          font: { ...style.font, color: { rgb: COLORS.profit }, bold: true }
        };
      } else if (value < 0) {
        return {
          ...style,
          font: { ...style.font, color: { rgb: COLORS.loss }, bold: true }
        };
      }
    }
    
    // Performance indicators
    if (colLower.match(/growth|increase|improvement/)) {
      if (value > 0) {
        cell.v = `${ICONS.up} ${value}`;
        return {
          ...style,
          font: { ...style.font, color: { rgb: COLORS.success } }
        };
      } else if (value < 0) {
        cell.v = `${ICONS.down} ${Math.abs(value)}`;
        return {
          ...style,
          font: { ...style.font, color: { rgb: COLORS.danger } }
        };
      }
    }
  }
  
  // Status-based coloring
  if (typeof value === 'string') {
    const valueLower = value.toLowerCase();
    
    if (valueLower.match(/success|complete|paid|confirmed|excellent|above target|optimal/)) {
      return {
        ...style,
        fill: { fgColor: { rgb: COLORS.successLight } },
        font: { ...style.font, color: { rgb: COLORS.success }, bold: true }
      };
    }
    
    if (valueLower.match(/warning|pending|partial|moderate|within budget/)) {
      return {
        ...style,
        fill: { fgColor: { rgb: COLORS.warningLight } },
        font: { ...style.font, color: { rgb: COLORS.warning }, bold: true }
      };
    }
    
    if (valueLower.match(/fail|error|cancel|rejected|over budget|below target|poor/)) {
      return {
        ...style,
        fill: { fgColor: { rgb: COLORS.dangerLight } },
        font: { ...style.font, color: { rgb: COLORS.danger }, bold: true }
      };
    }
  }
  
  return style;
}

// Apply professional styling to data worksheet
function styleProfessionalWorksheet(ws: any, data: any[], columns?: string[], XLSX?: any) {
  if (!ws['!ref']) return ws;
  
  const range = XLSX!.utils.decode_range(ws['!ref']);
  
  // Calculate optimal column widths
  const colWidths: any[] = [];
  for (let C = range.s.c; C <= range.e.c; ++C) {
    let maxWidth = 10;
    const columnName = columns?.[C] || '';
    
    // Header width
    if (columnName) {
      maxWidth = Math.max(maxWidth, columnName.length * 1.2);
    }
    
    // Sample data widths (check first 10 rows for performance)
    for (let R = 0; R <= Math.min(10, range.e.r); ++R) {
      const cellRef = XLSX!.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      if (cell?.v !== undefined) {
        const cellStr = String(cell.v);
        maxWidth = Math.max(maxWidth, Math.min(cellStr.length * 1.1, 50));
      }
    }
    
    // Apply minimum widths based on data type
    const dataType = detectDataType(data[0]?.[columnName], columnName);
    if (dataType.type === 'currency') maxWidth = Math.max(maxWidth, 15);
    if (dataType.type === 'percentage') maxWidth = Math.max(maxWidth, 12);
    if (dataType.type === 'date') maxWidth = Math.max(maxWidth, 12);
    
    colWidths.push({ wch: Math.ceil(maxWidth) });
  }
  ws['!cols'] = colWidths;
  
  // Set row heights
  ws['!rows'] = [];
  ws['!rows'][0] = { hpt: 24 }; // Header row height
  
  // Style header row
  for (let C = range.s.c; C <= range.e.c; ++C) {
    const cellRef = XLSX!.utils.encode_cell({ r: 0, c: C });
    if (ws[cellRef]) {
      ws[cellRef].s = STYLES.mainHeader;
    }
  }
  
  // Style data rows
  for (let R = 1; R <= range.e.r; ++R) {
    const isAlternate = R % 2 === 0;
    
    for (let C = range.s.c; C <= range.e.c; ++C) {
      const cellRef = XLSX!.utils.encode_cell({ r: R, c: C });
      const cell = ws[cellRef];
      
      if (cell) {
        const columnName = columns?.[C] || '';
        const dataType = detectDataType(cell.v, columnName);
        
        // Apply base style
        let baseStyle: any = isAlternate ? STYLES.alternateRow : STYLES.normal;
        
        // Apply data type specific style
        if (dataType.style) {
          baseStyle = { ...baseStyle, ...dataType.style } as any;
          if (isAlternate) {
            // Ensure alternate row background remains when merging styles
            baseStyle.fill = { fgColor: { rgb: COLORS.alternateRow } };
          }
        }
        
        // Apply number format
        if (dataType.format) {
          cell.z = dataType.format;
          if (dataType.type === 'percentage' && typeof cell.v === 'number' && cell.v <= 1) {
            cell.v = cell.v * 100;
          }
        }
        
        // Apply conditional formatting
        const conditionalStyle = applyConditionalFormatting(cell, cell.v, columnName);
        
        ws[cellRef].s = { ...baseStyle, ...conditionalStyle };
      }
    }
  }
  
  // Add totals row if numeric data present
  const hasNumericData = columns?.some(col => 
    data.some(row => typeof row[col] === 'number')
  );
  
  if (hasNumericData && data.length > 5) {
    const totalRow = range.e.r + 2;
    
    // Add "Total" label
    const totalLabelRef = XLSX!.utils.encode_cell({ r: totalRow, c: 0 });
    ws[totalLabelRef] = { v: 'TOTAL', t: 's', s: STYLES.totalRow };
    
    // Calculate and add totals for numeric columns
    for (let C = 1; C <= range.e.c; ++C) {
      const columnName = columns?.[C] || '';
      const columnData = data.map(row => row[columnName]).filter(v => typeof v === 'number');
      
      if (columnData.length > 0) {
        const sum = columnData.reduce((a, b) => a + b, 0);
        const cellRef = XLSX!.utils.encode_cell({ r: totalRow, c: C });
        const dataType = detectDataType(sum, columnName);
        
        ws[cellRef] = {
          v: sum,
          t: 'n',
          z: dataType.format || FORMATS.number,
          s: STYLES.totalRow
        };
      }
    }
    
    // Update range
    ws['!ref'] = XLSX!.utils.encode_range({
      s: { r: 0, c: 0 },
      e: { r: totalRow, c: range.e.c }
    });
  }
  
  // Add autofilter
  ws['!autofilter'] = { ref: XLSX!.utils.encode_range({
    s: { r: 0, c: 0 },
    e: { r: range.e.r, c: range.e.c }
  })};
  
  // Freeze panes (header row)
  ws['!freeze'] = { xSplit: 0, ySplit: 1, topLeftCell: 'A2', activePane: 'bottomLeft' };
  
  // Add print settings
  ws['!pageSetup'] = {
    orientation: 'landscape',
    scale: 75,
    fitToWidth: 1,
    fitToHeight: 0
  };
  
  ws['!margins'] = {
    left: 0.5,
    right: 0.5,
    top: 0.75,
    bottom: 0.75,
    header: 0.3,
    footer: 0.3
  };
  
  return ws;
}

// Main export function
export async function exportToProfessionalExcel(
  exportData: EnhancedExcelExportData[], 
  filename: string,
  coverData?: CoverSheetData
): Promise<boolean> {
  try {
    // Dynamically import heavy lib only when exporting
    const XLSX = (await import('xlsx-js-style')).default;
    // Create workbook with properties
    const workbook = XLSX.utils.book_new();
    
    // Set workbook properties
    workbook.Props = {
      Title: 'Property Management Analytics Report',
      Subject: `Analytics Report - ${coverData?.propertyName || 'All Properties'}`,
      Author: 'VoyageurNest PMS',
      Manager: 'Analytics Department',
      Company: 'VoyageurNest',
      Category: 'Business Analytics',
      Keywords: 'property,analytics,kpi,revenue,occupancy',
      Comments: 'Generated by VoyageurNest Professional Analytics Suite',
      LastAuthor: 'System Generated',
      CreatedDate: new Date()
    };
    
    // Add professional cover sheet
    if (coverData && !exportData[0]?.skipCoverSheet) {
      const coverSheetData = createProfessionalCoverSheet({
        ...coverData,
        totalSheets: exportData.length
      });
      
      const coverWs = XLSX.utils.aoa_to_sheet(coverSheetData);
      styleProfessionalCoverSheet(coverWs);
      XLSX.utils.book_append_sheet(workbook, coverWs, '📊 Cover');
    }
    
    // Process each data sheet
    exportData.forEach(({ sheetName, data, columns, sheetConfig }) => {
      if (!data || data.length === 0) {
        console.warn(`Skipping empty sheet: ${sheetName}`);
        return;
      }
      
      // Create worksheet
      const worksheet = XLSX.utils.json_to_sheet(data, {
        header: columns,
        skipHeader: false
      });
      
      // Apply professional styling
      styleProfessionalWorksheet(worksheet, data, columns || Object.keys(data[0]), XLSX);
      
      // Apply additional sheet configuration if provided
      if (sheetConfig) {
        if (sheetConfig.freezePane) {
          worksheet['!freeze'] = {
            xSplit: sheetConfig.freezePane.col,
            ySplit: sheetConfig.freezePane.row,
            topLeftCell: XLSX.utils.encode_cell({
              r: sheetConfig.freezePane.row,
              c: sheetConfig.freezePane.col
            }),
            activePane: 'bottomRight'
          };
        }
        
        if (sheetConfig.columnWidths) {
          worksheet['!cols'] = sheetConfig.columnWidths.map(w => ({ wch: w }));
        }
      }
      
      // Add icon to sheet name for visual appeal
      const sheetIcons: { [key: string]: string } = {
        'Summary': '📋',
        'KPI': '📊',
        'Booking': '📅',
        'Guest': '👥',
        'Expense': '💰',
        'Budget': '📈',
        'Income': '💵',
        'Property': '🏨',
        'Vendor': '🤝',
        'Occupancy': '🏠'
      };
      
      const icon = Object.entries(sheetIcons).find(([key]) => 
        sheetName.toLowerCase().includes(key.toLowerCase())
      )?.[1] || '📄';
      
      const safeSheetName = `${icon} ${sheetName}`.substring(0, 31);
      XLSX.utils.book_append_sheet(workbook, worksheet, safeSheetName);
    });
    
    // Write file with enhanced options
    XLSX.writeFile(workbook, filename, { 
      bookType: 'xlsx',
      bookSST: true,
      compression: true,
      type: 'binary'
    });
    
    return true;
  } catch (error) {
    console.error('Professional Excel export failed:', error);
    throw error;
  }
}

// Backward compatibility wrapper
export async function exportToEnhancedExcel(
  exportData: EnhancedExcelExportData[], 
  filename: string,
  coverData?: CoverSheetData
): Promise<boolean> {
  return exportToProfessionalExcel(exportData, filename, coverData);
}
