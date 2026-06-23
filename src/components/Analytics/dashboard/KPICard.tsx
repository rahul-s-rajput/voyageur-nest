import { Card, CardContent, CardHeader, CardTitle } from "../../ui/Card";
import { cn } from "../../../lib/utils";
import { TrendingUp, TrendingDown, Minus, Info } from "lucide-react";

interface KPICardProps {
  title: string;
  value: string;
  change?: {
    value: number;
    period: string;
  };
  icon?: React.ReactNode;
  trend?: "up" | "down" | "neutral";
  className?: string;
  /** Plain-language explanation shown in a tooltip next to the title. */
  info?: string;
}

export function KPICard({ title, value, change, icon, trend, className, info }: KPICardProps) {
  const getTrendIcon = () => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-success" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-destructive" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getTrendColor = () => {
    switch (trend) {
      case "up":
        return "text-success";
      case "down":
        return "text-destructive";
      default:
        return "text-muted-foreground";
    }
  };

  return (
    <Card className={cn("bg-gradient-card border-card-border shadow-kpi transition-all duration-fast hover:shadow-lg", className)}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-1.5">
          {title}
          {info && (
            <span className="group/tip relative inline-flex" tabIndex={0} aria-label={info}>
              <Info className="h-3.5 w-3.5 text-muted-foreground/50 hover:text-muted-foreground transition-colors cursor-help" />
              <span
                role="tooltip"
                className="pointer-events-none absolute left-1/2 top-[calc(100%+8px)] z-40 w-64 -translate-x-1/2 rounded-lg border border-border bg-popover px-3.5 py-2.5 text-[12px] font-normal normal-case leading-relaxed tracking-normal text-popover-foreground opacity-0 translate-y-1 shadow-xl ring-1 ring-black/5 transition-all duration-150 group-hover/tip:opacity-100 group-hover/tip:translate-y-0 group-focus/tip:opacity-100 group-focus/tip:translate-y-0"
              >
                <span className="absolute -top-1.5 left-1/2 -translate-x-1/2 h-3 w-3 rotate-45 border-l border-t border-border bg-popover" />
                {info}
              </span>
            </span>
          )}
        </CardTitle>
        {icon && <div className="text-muted-foreground">{icon}</div>}
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold text-foreground">{value}</div>
        {change && (
          <div className="flex items-center space-x-1 mt-1">
            {getTrendIcon()}
            <span className={cn("text-xs font-medium", getTrendColor())}>
              {change.value > 0 ? "+" : ""}{change.value}% {change.period}
            </span>
          </div>
        )}
      </CardContent>
    </Card>
  );
}