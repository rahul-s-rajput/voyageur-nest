import { useState } from "react";
import { TabNavigation } from "./dashboard/TabNavigation";
import { FilterBar } from "./dashboard/FilterBar";
import { OverviewDashboard } from "./dashboard/OverviewDashboard";
import { FinancialReports } from "./dashboard/FinancialReports";
import { BookingAnalytics } from "./dashboard/BookingAnalytics";
import { ExpenseAnalytics } from "./dashboard/ExpenseAnalytics";
import { Button } from "../ui/Button";
import { Settings } from "lucide-react";



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
