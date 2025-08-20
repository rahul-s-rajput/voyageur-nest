import * as React from "react";
import { Calendar as PrimeCalendar } from "primereact/calendar";
import { cn } from "@/lib/utils";

type Props = React.ComponentProps<typeof PrimeCalendar>;

function Calendar({ className, ...props }: Props) {
  return <PrimeCalendar className={cn(className)} {...props} />;
}

Calendar.displayName = "Calendar";

export { Calendar };
