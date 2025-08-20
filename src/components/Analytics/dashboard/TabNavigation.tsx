import { useState } from "react";
import { Tabs, TabsList, TabsTrigger } from "../../ui/tabs";
import { 
  BarChart3, 
  DollarSign, 
  Calendar, 
  Receipt, 
  Brain, 
  FileText,
  Home
} from "lucide-react";
import { cn } from "../../../lib/utils";

interface TabNavigationProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

const tabs = [
  { id: "overview", label: "Overview", icon: Home },
  { id: "financial", label: "Financial", icon: DollarSign },
  { id: "bookings", label: "Bookings", icon: Calendar },
  { id: "expenses", label: "Expenses", icon: Receipt },
  { id: "insights", label: "AI Insights", icon: Brain },
  { id: "custom", label: "Custom", icon: FileText },
];

export function TabNavigation({ activeTab, onTabChange, className }: TabNavigationProps) {
  return (
    <div className={cn("w-full", className)}>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full">
        <TabsList className="grid w-full grid-cols-3 lg:grid-cols-6 h-auto p-1 bg-secondary/50 rounded-xl">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <TabsTrigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  "flex flex-col sm:flex-row items-center gap-1 sm:gap-2 p-3 text-xs sm:text-sm font-medium transition-all duration-fast",
                  "data-[state=active]:bg-primary data-[state=active]:text-primary-foreground",
                  "data-[state=active]:shadow-md"
                )}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden text-[10px] mt-1">{tab.label}</span>
              </TabsTrigger>
            );
          })}
        </TabsList>
      </Tabs>
    </div>
  );
}