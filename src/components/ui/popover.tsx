import * as React from "react";
import { OverlayPanel } from "primereact/overlaypanel";
import type { OverlayPanel as OverlayPanelType } from "primereact/overlaypanel";
import { cn } from "@/lib/utils";

type PopoverContextValue = {
  panelRef: React.MutableRefObject<OverlayPanelType | null>;
};

const PopoverContext = React.createContext<PopoverContextValue | null>(null);

function usePopoverContext() {
  const ctx = React.useContext(PopoverContext);
  if (!ctx) throw new Error("Popover components must be used within <Popover>");
  return ctx;
}

const Popover: React.FC<React.PropsWithChildren<unknown>> = ({ children }) => {
  const panelRef = React.useRef<OverlayPanelType | null>(null);
  return (
    <PopoverContext.Provider value={{ panelRef }}>
      {children}
    </PopoverContext.Provider>
  );
};

type PopoverTriggerProps = {
  asChild?: boolean;
  children: React.ReactElement;
};

const PopoverTrigger: React.FC<PopoverTriggerProps> = ({ children }) => {
  const { panelRef } = usePopoverContext();
  const originalOnClick = children.props.onClick as
    | ((event: React.MouseEvent<Element, MouseEvent>) => void)
    | undefined;

  return React.cloneElement(children, {
    onClick: (e: React.MouseEvent) => {
      originalOnClick?.(e);
      panelRef.current?.toggle(e);
    },
  });
};

type PopoverContentProps = React.ComponentPropsWithoutRef<typeof OverlayPanel> & {
  align?: "start" | "center" | "end";
  sideOffset?: number;
};

const PopoverContent = React.forwardRef<OverlayPanelType, PopoverContentProps>(
  ({ className, align: _align = "center", sideOffset: _sideOffset = 4, ...props }, _ref) => {
    const { panelRef } = usePopoverContext();
    return <OverlayPanel ref={panelRef} className={cn("z-50", className)} {...props} />;
  }
);

PopoverContent.displayName = "PopoverContent";

export { Popover, PopoverTrigger, PopoverContent };
