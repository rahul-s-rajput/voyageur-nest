import React from 'react';
import { Skeleton } from './Skeleton';

// Table row skeleton for expense list
export const ExpenseRowSkeleton = () => (
  <div className="p-4 space-y-3">
    <div className="flex items-start justify-between">
      <div className="flex-1 space-y-2">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-3 w-48" />
        <Skeleton className="h-3 w-24" />
      </div>
      <div className="flex items-center gap-2">
        <Skeleton className="h-6 w-16" />
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-8 w-16" />
        <Skeleton className="h-8 w-16" />
      </div>
    </div>
  </div>
);

// Card skeleton for dashboard widgets
export const CardSkeleton = ({ className = "" }: { className?: string }) => (
  <div className={`bg-white rounded-lg border p-6 ${className}`}>
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-16" />
      </div>
      <Skeleton className="h-8 w-20" />
      <Skeleton className="h-3 w-full" />
    </div>
  </div>
);

// Form skeleton for modals
export const FormSkeleton = () => (
  <div className="space-y-4">
    <div className="space-y-2">
      <Skeleton className="h-4 w-20" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-16" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="space-y-2">
      <Skeleton className="h-4 w-24" />
      <Skeleton className="h-10 w-full" />
    </div>
    <div className="flex gap-2 justify-end">
      <Skeleton className="h-9 w-20" />
      <Skeleton className="h-9 w-24" />
    </div>
  </div>
);

// Chart skeleton for reports
export const ChartSkeleton = ({ height = "300px" }: { height?: string }) => (
  <div className="space-y-4">
    <div className="flex items-center justify-between">
      <Skeleton className="h-6 w-32" />
      <Skeleton className="h-4 w-20" />
    </div>
    <Skeleton className="w-full" style={{ height }} />
  </div>
);

// Table skeleton specifically for expense table
export const ExpenseTableSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <div className="divide-y">
    {Array.from({ length: rows }).map((_, i) => (
      <ExpenseRowSkeleton key={i} />
    ))}
  </div>
);
