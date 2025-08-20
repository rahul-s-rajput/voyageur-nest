// Fix imports for all Analytics components
// Run this file to update imports (for reference only - we'll update files directly)

const componentsToUpdate = [
  'FilterBar.tsx',
  'OverviewDashboard.tsx', 
  'FinancialReports.tsx',
  'BookingAnalytics.tsx',
  'KPICard.tsx'
];

const importMappings = {
  '@/components/ui/card': '../../ui',
  '@/components/ui/button': '../../ui',
  '@/components/ui/badge': '../../ui',
  '@/components/ui/tabs': '../../ui',
  '@/components/ui/progress': '../../ui',
  '@/components/ui/toaster': '../../ui',
  '@/components/ui/sonner': '../../ui',
  '@/components/ui/tooltip': '../../ui',
  '@/lib/utils': '../../../lib/utils'
};

console.log('Import mappings configured for Analytics components');
