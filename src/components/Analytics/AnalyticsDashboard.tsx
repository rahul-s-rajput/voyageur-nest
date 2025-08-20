import { useState } from "react";
import { TabNavigation } from "./dashboard/TabNavigation";
import { FilterBar } from "./dashboard/FilterBar";
import { OverviewDashboard } from "./dashboard/OverviewDashboard";
import { FinancialReports } from "./dashboard/FinancialReports";
import { BookingAnalytics } from "./dashboard/BookingAnalytics";
import { ExpenseAnalytics } from "./dashboard/ExpenseAnalytics";
import { AIInsights } from "./dashboard/AIInsights";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { Button } from "../ui/Button";
import { 
  FileText,
  Settings
} from "lucide-react";
 


export default function AnalyticsDashboard() {
  const [activeTab, setActiveTab] = useState("overview");
  

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return <OverviewDashboard />;
      case "financial":
        return <FinancialReports />;
      case "bookings":
        return <BookingAnalytics />;
      case "expenses":
        return <ExpenseAnalytics />;
      case "insights":
        return <AIInsights />;
      case "custom":
        return <CustomReports />;
      default:
        return <OverviewDashboard />;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="px-4 py-6">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Reports & Analytics</h1>
              <p className="text-gray-600 mt-1">
                Property insights and performance metrics
              </p>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" size="sm">
                <Settings className="h-4 w-4 mr-2" />
                Settings
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="px-4 py-6 space-y-6">
        {/* Filter Bar */}
        <FilterBar />

        {/* Tab Navigation */}
        <TabNavigation 
          activeTab={activeTab} 
          onTabChange={setActiveTab}
        />

        {/* Tab Content */}
        <div className="min-h-[500px]">
          {renderTabContent()}
        </div>
      </div>
    </div>
  );
}

function CustomReports() {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Custom Report Builder
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Exports</h4>
          <p className="text-sm text-gray-600">
            Use the Export button in the filter bar above to export the current report with applied filters.
          </p>
        </div>
        <div className="p-4 border rounded-lg">
          <h4 className="font-medium mb-2">Advanced Builder</h4>
          <p className="text-sm text-gray-600 mb-4">Custom report builder coming soon...</p>
          <Button variant="outline" disabled className="w-full">
            Coming Soon
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
