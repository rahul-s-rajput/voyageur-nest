import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "../../ui/Dialog";
import { Button } from "../../ui/Button";
import { Checkbox } from "../../ui/Checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import { Badge } from "../../ui/Badge";
import { Download, FileText, TrendingUp, Users, DollarSign, Calendar } from "lucide-react";
import { exportToProfessionalExcel } from "../../../lib/professionalExcelExport";
import { toast } from "../../../components/ui/sonner";

export interface ExportSection {
  id: string;
  title: string;
  description: string;
  icon: React.ReactNode;
  category: 'overview' | 'financial' | 'booking' | 'expense';
  sheets: string[];
}

export interface ExportData {
  [key: string]: {
    sheetName: string;
    data: any[];
    columns?: string[];
  };
}

interface ExportSelectionModalProps {
  currentProperty?: { name: string; id: string };
  dateRange: { start: string; end: string };
  bookingSource?: string;
  exportData: ExportData;
  isLoading: boolean;
  trigger?: React.ReactNode;
}

const EXPORT_SECTIONS: ExportSection[] = [
  {
    id: 'summary',
    title: 'Executive Summary',
    description: 'Property info, date range, and key filters applied',
    icon: <FileText className="h-4 w-4" />,
    category: 'overview',
    sheets: ['Summary']
  },
  {
    id: 'kpi_overview',
    title: 'Key Performance Indicators',
    description: 'Revenue, occupancy, ADR, RevPAR, ALOS, conversion rates',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'overview',
    sheets: ['KPI Summary']
  },
  {
    id: 'booking_sources',
    title: 'Booking Channel Analysis',
    description: 'Revenue and booking distribution by source (Direct, OTA, etc.)',
    icon: <Users className="h-4 w-4" />,
    category: 'booking',
    sheets: ['Booking Sources']
  },
  {
    id: 'occupancy_trends',
    title: 'Occupancy & Rate Trends',
    description: 'Daily/weekly occupancy patterns and rate fluctuations',
    icon: <Calendar className="h-4 w-4" />,
    category: 'booking',
    sheets: ['Occupancy Trends']
  },
  {
    id: 'guest_analytics',
    title: 'Guest Behavior Analytics',
    description: 'Demographics, repeat guests, length of stay, cancellation patterns',
    icon: <Users className="h-4 w-4" />,
    category: 'booking',
    sheets: ['Guest Demographics', 'Cancellation Analysis']
  },
  {
    id: 'property_comparison',
    title: 'Multi-Property Performance',
    description: 'Compare KPIs across all your properties',
    icon: <TrendingUp className="h-4 w-4" />,
    category: 'booking',
    sheets: ['Property Comparison']
  },
  {
    id: 'expense_overview',
    title: 'Expense Summary',
    description: 'Total expenses, categories, and monthly averages',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'expense',
    sheets: ['Expense Categories']
  },
  {
    id: 'budget_analysis',
    title: 'Budget vs Actual Analysis',
    description: 'Budget performance with variance analysis by category',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'expense',
    sheets: ['Budget vs Actual']
  },
  {
    id: 'vendor_analysis',
    title: 'Vendor & Payment Analysis',
    description: 'Top vendors, payment methods, and expense trends',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'expense',
    sheets: ['Vendor Analysis', 'Payment Methods']
  },
  {
    id: 'financial_statements',
    title: 'Financial Performance',
    description: 'Income statement, profitability analysis, and revenue trends',
    icon: <DollarSign className="h-4 w-4" />,
    category: 'financial',
    sheets: ['Income Statement', 'Profitability Analysis']
  }
];

export function ExportSelectionModal({
  currentProperty,
  dateRange,
  bookingSource,
  exportData,
  isLoading,
  trigger
}: ExportSelectionModalProps) {
  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(['summary', 'kpi_overview']) // Default selections
  );
  const [isExporting, setIsExporting] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const toggleSection = (sectionId: string) => {
    const newSelected = new Set(selectedSections);
    if (newSelected.has(sectionId)) {
      newSelected.delete(sectionId);
    } else {
      newSelected.add(sectionId);
    }
    setSelectedSections(newSelected);
  };

  const selectAllInCategory = (category: string) => {
    const newSelected = new Set(selectedSections);
    EXPORT_SECTIONS
      .filter(section => section.category === category)
      .forEach(section => newSelected.add(section.id));
    setSelectedSections(newSelected);
  };

  const deselectAllInCategory = (category: string) => {
    const newSelected = new Set(selectedSections);
    EXPORT_SECTIONS
      .filter(section => section.category === category)
      .forEach(section => newSelected.delete(section.id));
    setSelectedSections(newSelected);
  };

  const handleExport = async () => {
    if (selectedSections.size === 0) {
      toast.error("Please select at least one section to export");
      return;
    }

    setIsExporting(true);
    try {
      // Build export data based on selected sections
      const selectedSheets = EXPORT_SECTIONS
        .filter(section => selectedSections.has(section.id))
        .flatMap(section => section.sheets);

      const exportSheets = Object.values(exportData)
        .filter(sheet => selectedSheets.includes(sheet.sheetName));

      if (exportSheets.length === 0) {
        toast.error("No data available for selected sections");
        return;
      }

      const timestamp = new Date().toISOString().slice(0, 10);
      const filename = `${currentProperty?.name?.replace(/\s+/g, '-') || 'analytics'}-export-${timestamp}.xlsx`;
      
      // Create cover data for the professional report
      const coverData = {
        propertyName: currentProperty?.name,
        dateRange: dateRange,
        generatedDate: new Date().toISOString(),
        reportType: 'Comprehensive Property Analytics',
        totalSheets: exportSheets.length
      };
      
      await exportToProfessionalExcel(exportSheets, filename, coverData);
      
      toast.success(`Export completed! ${exportSheets.length} sheets exported to ${filename}`);
      setIsOpen(false);
    } catch (error) {
      console.error('Export failed:', error);
      toast.error("Export failed. Please try again.");
    } finally {
      setIsExporting(false);
    }
  };

  const categoryGroups = {
    overview: EXPORT_SECTIONS.filter(s => s.category === 'overview'),
    booking: EXPORT_SECTIONS.filter(s => s.category === 'booking'),
    expense: EXPORT_SECTIONS.filter(s => s.category === 'expense'),
    financial: EXPORT_SECTIONS.filter(s => s.category === 'financial')
  };

  const getCategorySelectedCount = (category: string) => {
    return EXPORT_SECTIONS
      .filter(section => section.category === category && selectedSections.has(section.id))
      .length;
  };

  const getCategoryTotalCount = (category: string) => {
    return EXPORT_SECTIONS.filter(section => section.category === category).length;
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button 
            variant="outline" 
            size="sm" 
            disabled={isLoading}
          >
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5" />
            Export Analytics Report
          </DialogTitle>
          <div className="text-sm text-muted-foreground">
            <div>Property: <strong>{currentProperty?.name || 'Not selected'}</strong></div>
            <div>Period: <strong>{dateRange.start} → {dateRange.end}</strong></div>
            {bookingSource && bookingSource !== 'all' && (
              <div>Source: <strong>{bookingSource}</strong></div>
            )}
          </div>
        </DialogHeader>

        <div className="space-y-6">
          {/* Overview Category */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <FileText className="h-5 w-5" />
                  Overview & Executive Summary
                  <Badge variant="outline">
                    {getCategorySelectedCount('overview')}/{getCategoryTotalCount('overview')}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => selectAllInCategory('overview')}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deselectAllInCategory('overview')}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryGroups.overview.map(section => (
                <div key={section.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={section.id}
                    checked={selectedSections.has(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {section.icon}
                      <label htmlFor={section.id} className="text-sm font-medium cursor-pointer">
                        {section.title}
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Booking Analytics Category */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Booking & Guest Analytics
                  <Badge variant="outline">
                    {getCategorySelectedCount('booking')}/{getCategoryTotalCount('booking')}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => selectAllInCategory('booking')}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deselectAllInCategory('booking')}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryGroups.booking.map(section => (
                <div key={section.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={section.id}
                    checked={selectedSections.has(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {section.icon}
                      <label htmlFor={section.id} className="text-sm font-medium cursor-pointer">
                        {section.title}
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Expense Analytics Category */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <DollarSign className="h-5 w-5" />
                  Expense & Budget Analytics
                  <Badge variant="outline">
                    {getCategorySelectedCount('expense')}/{getCategoryTotalCount('expense')}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => selectAllInCategory('expense')}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deselectAllInCategory('expense')}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryGroups.expense.map(section => (
                <div key={section.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={section.id}
                    checked={selectedSections.has(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {section.icon}
                      <label htmlFor={section.id} className="text-sm font-medium cursor-pointer">
                        {section.title}
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* Financial Reports Category */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Financial Reports
                  <Badge variant="outline">
                    {getCategorySelectedCount('financial')}/{getCategoryTotalCount('financial')}
                  </Badge>
                </CardTitle>
                <div className="flex gap-2">
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => selectAllInCategory('financial')}
                  >
                    Select All
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => deselectAllInCategory('financial')}
                  >
                    Deselect All
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {categoryGroups.financial.map(section => (
                <div key={section.id} className="flex items-start space-x-3 p-3 border rounded-lg">
                  <Checkbox
                    id={section.id}
                    checked={selectedSections.has(section.id)}
                    onCheckedChange={() => toggleSection(section.id)}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      {section.icon}
                      <label htmlFor={section.id} className="text-sm font-medium cursor-pointer">
                        {section.title}
                      </label>
                    </div>
                    <p className="text-xs text-muted-foreground">{section.description}</p>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Export Actions */}
        <div className="flex items-center justify-between pt-4 border-t">
          <div className="text-sm text-muted-foreground">
            {selectedSections.size} section{selectedSections.size !== 1 ? 's' : ''} selected
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button 
              onClick={handleExport} 
              disabled={selectedSections.size === 0 || isExporting || isLoading}
            >
              {isExporting ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Exporting...
                </>
              ) : (
                <>
                  <Download className="h-4 w-4 mr-2" />
                  Export {selectedSections.size} Section{selectedSections.size !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
