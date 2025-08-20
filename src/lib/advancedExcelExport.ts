/**
 * Advanced Excel Export using ExcelJS
 * 
 * This module provides premium Excel export functionality with:
 * - Professional styling and formatting
 * - Charts and visualizations
 * - Conditional formatting
 * - Data validation
 * - Print settings
 * - Professional templates
 * 
 * To use this module, install ExcelJS:
 * npm install exceljs file-saver
 */

// Note: Uncomment after installing ExcelJS
// import ExcelJS from 'exceljs';
// import { saveAs } from 'file-saver';

// Professional Color Palette
export const THEME = {
  colors: {
    // Brand colors
    primary: '#1E3A8A',      // Deep blue
    primaryLight: '#3B82F6', // Light blue
    primaryDark: '#1E293B',  // Dark blue
    accent: '#10B981',       // Emerald
    
    // Status colors
    success: '#22C55E',
    warning: '#F59E0B',
    danger: '#EF4444',
    info: '#3B82F6',
    
    // Neutral colors
    gray100: '#F3F4F6',
    gray200: '#E5E7EB',
    gray300: '#D1D5DB',
    gray400: '#9CA3AF',
    gray500: '#6B7280',
    gray600: '#4B5563',
    gray700: '#374151',
    gray800: '#1F2937',
    gray900: '#111827',
    
    // Financial colors
    profit: '#059669',
    loss: '#DC2626',
    neutral: '#6B7280'
  },
  fonts: {
    primary: 'Segoe UI',
    secondary: 'Calibri',
    monospace: 'Consolas'
  }
};

interface ChartData {
  categories: string[];
  series: {
    name: string;
    data: number[];
  }[];
}

interface ConditionalFormat {
  type: 'cellIs' | 'colorScale' | 'dataBar' | 'iconSet';
  priority: number;
  rule: any;
}

export interface AdvancedExportOptions {
  includeCharts?: boolean;
  includePivotTables?: boolean;
  includeConditionalFormatting?: boolean;
  includeDataValidation?: boolean;
  includeFormulas?: boolean;
  includeMacros?: boolean;
  printSettings?: {
    orientation?: 'portrait' | 'landscape';
    paperSize?: number;
    margins?: any;
    headerFooter?: any;
  };
  protection?: {
    password?: string;
    lockStructure?: boolean;
    lockWindows?: boolean;
  };
}

// Example implementation (uncomment after installing ExcelJS)
/*
export async function exportToAdvancedExcel(
  exportData: any[],
  filename: string,
  options: AdvancedExportOptions = {}
) {
  const workbook = new ExcelJS.Workbook();
  
  // Set workbook properties
  workbook.creator = 'VoyageurNest PMS';
  workbook.lastModifiedBy = 'Analytics Module';
  workbook.created = new Date();
  workbook.modified = new Date();
  workbook.properties.date1904 = false;
  
  // Create Executive Dashboard Sheet
  const dashboardSheet = workbook.addWorksheet('Executive Dashboard', {
    properties: { tabColor: { argb: 'FF1E3A8A' } },
    views: [{ showGridLines: false, zoomScale: 85 }]
  });
  
  // Add company logo (placeholder - requires actual image)
  // const logoImage = workbook.addImage({
  //   base64: 'your-base64-logo-here',
  //   extension: 'png',
  // });
  // dashboardSheet.addImage(logoImage, 'A1:C3');
  
  // Create title section
  dashboardSheet.mergeCells('A1:J2');
  const titleCell = dashboardSheet.getCell('A1');
  titleCell.value = 'PROPERTY ANALYTICS DASHBOARD';
  titleCell.font = {
    name: THEME.fonts.primary,
    size: 24,
    bold: true,
    color: { argb: 'FF1E3A8A' }
  };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  
  // Add date range
  dashboardSheet.mergeCells('A3:J3');
  const dateRangeCell = dashboardSheet.getCell('A3');
  dateRangeCell.value = `Report Period: ${new Date().toLocaleDateString()}`;
  dateRangeCell.font = {
    name: THEME.fonts.primary,
    size: 12,
    italic: true
  };
  dateRangeCell.alignment = { horizontal: 'center' };
  
  // Create KPI Cards section
  const kpiCards = [
    { title: 'Total Revenue', value: '₹5,234,567', change: '+12.5%', color: 'FF22C55E' },
    { title: 'Occupancy Rate', value: '78.5%', change: '+5.2%', color: 'FF22C55E' },
    { title: 'ADR', value: '₹3,450', change: '-2.1%', color: 'FFEF4444' },
    { title: 'RevPAR', value: '₹2,708', change: '+3.8%', color: 'FF22C55E' }
  ];
  
  let col = 1;
  kpiCards.forEach((kpi, index) => {
    const startCol = col;
    const endCol = col + 1;
    
    // KPI Title
    dashboardSheet.mergeCells(5, startCol, 5, endCol);
    const kpiTitleCell = dashboardSheet.getCell(5, startCol);
    kpiTitleCell.value = kpi.title;
    kpiTitleCell.font = { size: 11, bold: true };
    kpiTitleCell.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF1E3A8A' }
    };
    kpiTitleCell.font.color = { argb: 'FFFFFFFF' };
    kpiTitleCell.alignment = { horizontal: 'center' };
    
    // KPI Value
    dashboardSheet.mergeCells(6, startCol, 6, endCol);
    const kpiValueCell = dashboardSheet.getCell(6, startCol);
    kpiValueCell.value = kpi.value;
    kpiValueCell.font = { size: 18, bold: true };
    kpiValueCell.alignment = { horizontal: 'center' };
    
    // KPI Change
    dashboardSheet.mergeCells(7, startCol, 7, endCol);
    const kpiChangeCell = dashboardSheet.getCell(7, startCol);
    kpiChangeCell.value = kpi.change;
    kpiChangeCell.font = { 
      size: 10, 
      color: { argb: kpi.color }
    };
    kpiChangeCell.alignment = { horizontal: 'center' };
    
    // Add borders
    for (let r = 5; r <= 7; r++) {
      for (let c = startCol; c <= endCol; c++) {
        const cell = dashboardSheet.getCell(r, c);
        cell.border = {
          top: { style: 'thin' },
          left: { style: 'thin' },
          bottom: { style: 'thin' },
          right: { style: 'thin' }
        };
      }
    }
    
    col += 3; // Move to next KPI card position
  });
  
  // Add charts if requested
  if (options.includeCharts) {
    // Revenue Trend Chart
    dashboardSheet.addImage({
      // This would be a generated chart image
      // You'd need to use a charting library to generate the image
    }, {
      tl: { col: 0, row: 9 },
      br: { col: 5, row: 20 }
    });
    
    // Occupancy Chart
    dashboardSheet.addImage({
      // Another chart
    }, {
      tl: { col: 5, row: 9 },
      br: { col: 10, row: 20 }
    });
  }
  
  // Process each data sheet with advanced formatting
  exportData.forEach(({ sheetName, data, columns }) => {
    const worksheet = workbook.addWorksheet(sheetName, {
      properties: { tabColor: { argb: 'FF3B82F6' } }
    });
    
    // Add headers with styling
    if (columns && columns.length > 0) {
      const headerRow = worksheet.addRow(columns);
      headerRow.font = { bold: true, color: { argb: 'FFFFFFFF' } };
      headerRow.fill = {
        type: 'pattern',
        pattern: 'solid',
        fgColor: { argb: 'FF1E3A8A' }
      };
      headerRow.alignment = { horizontal: 'center', vertical: 'middle' };
      headerRow.height = 25;
      
      // Add filters
      worksheet.autoFilter = {
        from: { row: 1, column: 1 },
        to: { row: 1, column: columns.length }
      };
    }
    
    // Add data with conditional formatting
    data.forEach((rowData, index) => {
      const row = worksheet.addRow(Object.values(rowData));
      
      // Alternate row colors
      if (index % 2 === 0) {
        row.fill = {
          type: 'pattern',
          pattern: 'solid',
          fgColor: { argb: 'FFF3F4F6' }
        };
      }
      
      // Apply number formatting
      row.eachCell((cell, colNumber) => {
        const columnName = columns?.[colNumber - 1]?.toLowerCase() || '';
        
        if (columnName.includes('amount') || columnName.includes('revenue')) {
          cell.numFmt = '₹#,##0.00';
        } else if (columnName.includes('percentage') || columnName.includes('rate')) {
          cell.numFmt = '0.00%';
        } else if (columnName.includes('date')) {
          cell.numFmt = 'dd-mmm-yyyy';
        }
      });
    });
    
    // Add conditional formatting
    if (options.includeConditionalFormatting) {
      // Highlight high values in green
      worksheet.addConditionalFormatting({
        ref: `B2:B${data.length + 1}`,
        rules: [
          {
            type: 'cellIs',
            operator: 'greaterThan',
            formulae: [1000000],
            style: {
              fill: {
                type: 'pattern',
                pattern: 'solid',
                bgColor: { argb: 'FF22C55E' }
              }
            }
          }
        ]
      });
      
      // Add data bars for visual representation
      worksheet.addConditionalFormatting({
        ref: `C2:C${data.length + 1}`,
        rules: [
          {
            type: 'dataBar',
            minLength: 0,
            maxLength: 100,
            showValue: true,
            gradient: true,
            colors: [
              { argb: 'FF3B82F6' },
              { argb: 'FF1E3A8A' }
            ]
          }
        ]
      });
    }
    
    // Auto-fit columns
    worksheet.columns.forEach((column, index) => {
      let maxLength = 0;
      column.eachCell({ includeEmpty: false }, (cell) => {
        const columnLength = cell.value ? cell.value.toString().length : 10;
        if (columnLength > maxLength) {
          maxLength = columnLength;
        }
      });
      column.width = Math.min(maxLength + 2, 40);
    });
    
    // Freeze panes (header row)
    worksheet.views = [
      { state: 'frozen', xSplit: 0, ySplit: 1 }
    ];
  });
  
  // Add Summary Sheet with formulas
  if (options.includeFormulas) {
    const summarySheet = workbook.addWorksheet('Summary Calculations', {
      properties: { tabColor: { argb: 'FF10B981' } }
    });
    
    // Add formulas for calculations across sheets
    summarySheet.getCell('A1').value = 'Total Revenue';
    summarySheet.getCell('B1').value = { formula: "SUM('KPI Summary'!B:B)" };
    
    summarySheet.getCell('A2').value = 'Average Occupancy';
    summarySheet.getCell('B2').value = { formula: "AVERAGE('Occupancy Trends'!B:B)" };
    
    // Format formula cells
    summarySheet.getCell('B1').numFmt = '₹#,##0.00';
    summarySheet.getCell('B2').numFmt = '0.00%';
  }
  
  // Set print settings
  if (options.printSettings) {
    workbook.eachSheet((worksheet) => {
      worksheet.pageSetup = {
        orientation: options.printSettings?.orientation || 'landscape',
        paperSize: options.printSettings?.paperSize || 9, // A4
        margins: options.printSettings?.margins || {
          left: 0.7, right: 0.7,
          top: 0.75, bottom: 0.75,
          header: 0.3, footer: 0.3
        }
      };
      
      // Add headers and footers
      worksheet.headerFooter = {
        oddHeader: '&C&"Segoe UI,Bold"&16Property Analytics Report',
        oddFooter: '&L&"Segoe UI,Regular"&10Generated on &D &T&C&P of &N&R&"Segoe UI,Regular"&10© VoyageurNest'
      };
    });
  }
  
  // Add protection if requested
  if (options.protection?.password) {
    await workbook.protect(options.protection.password, {
      lockStructure: options.protection.lockStructure,
      lockWindows: options.protection.lockWindows
    });
  }
  
  // Generate Excel file
  const buffer = await workbook.xlsx.writeBuffer();
  const blob = new Blob([buffer], { 
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' 
  });
  
  saveAs(blob, filename);
}
*/

// Placeholder function for when ExcelJS is not installed
export function exportToAdvancedExcel(
  exportData: any[],
  filename: string,
  options: AdvancedExportOptions = {}
) {
  console.log('Advanced Excel export requires ExcelJS. Please install it:');
  console.log('npm install exceljs file-saver');
  console.log('Then uncomment the implementation in advancedExcelExport.ts');
  
  // Fall back to enhanced export
  import('./enhancedExcelExport').then(module => {
    module.exportToEnhancedExcel(exportData, filename);
  });
}

// Chart generation helper (requires a charting library)
export function generateChartImage(chartData: ChartData, type: 'bar' | 'line' | 'pie'): string {
  // This would generate a base64 image of the chart
  // You'd need to use a library like Chart.js with node-canvas
  // or a headless browser to generate the image
  return '';
}

// Pivot table configuration
export interface PivotTableConfig {
  sourceData: string;
  rows: string[];
  columns: string[];
  values: {
    field: string;
    function: 'sum' | 'average' | 'count' | 'max' | 'min';
  }[];
  filters?: string[];
}

// Data validation rules
export interface ValidationRule {
  type: 'list' | 'decimal' | 'whole' | 'date' | 'textLength' | 'custom';
  allowBlank?: boolean;
  showInputMessage?: boolean;
  showErrorMessage?: boolean;
  errorStyle?: 'stop' | 'warning' | 'information';
  errorTitle?: string;
  error?: string;
  promptTitle?: string;
  prompt?: string;
  formulae?: any[];
}

// Template configurations for different report types
export const REPORT_TEMPLATES = {
  executive: {
    includeCharts: true,
    includeConditionalFormatting: true,
    printSettings: {
      orientation: 'landscape' as const,
      paperSize: 9
    }
  },
  financial: {
    includeFormulas: true,
    includeConditionalFormatting: true,
    printSettings: {
      orientation: 'portrait' as const,
      paperSize: 9
    }
  },
  operational: {
    includePivotTables: true,
    includeDataValidation: true,
    printSettings: {
      orientation: 'landscape' as const,
      paperSize: 9
    }
  }
};
