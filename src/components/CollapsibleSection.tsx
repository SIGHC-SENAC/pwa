import React, { useState } from "react";
import { ChevronDown } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

interface CollapsibleSectionProps {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}

const CollapsibleSection: React.FC<CollapsibleSectionProps> = ({
  icon,
  title,
  subtitle,
  children,
  defaultOpen = true,
}) => {
  const isMobile = useIsMobile();
  const [open, setOpen] = useState(defaultOpen);

  const isCollapsible = isMobile;
  const isOpen = isCollapsible ? open : true;

  return (
    <section className="rounded-xl border bg-card shadow-sm overflow-hidden">
      <button
        type="button"
        onClick={() => isCollapsible && setOpen((v) => !v)}
        className={cn(
          "flex w-full items-center gap-3 border-b bg-muted/30 px-5 py-3.5 sm:px-6 sm:py-4 text-left",
          isCollapsible && "cursor-pointer active:bg-muted/50"
        )}
      >
        {icon}
        <div className="flex-1 min-w-0">
          <h2 className="text-sm sm:text-base font-bold text-foreground">{title}</h2>
          {subtitle && (
            <p className="text-xs text-muted-foreground">{subtitle}</p>
          )}
        </div>
        {isCollapsible && (
          <ChevronDown
            className={cn(
              "h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200",
              isOpen && "rotate-180"
            )}
          />
        )}
      </button>
      <div
        className={cn(
          "transition-all duration-200 ease-out overflow-hidden",
          isOpen ? "animate-accordion-down" : "animate-accordion-up hidden"
        )}
      >
        <div className="p-4 sm:p-6">{children}</div>
      </div>
    </section>
  );
};

export default CollapsibleSection;
