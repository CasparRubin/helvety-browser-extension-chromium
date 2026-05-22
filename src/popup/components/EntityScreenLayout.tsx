import { cn } from "@helvety/shared/utils";

/** Pinned-footer entity screen: header (optional), scrollable body, fixed footer. */
export function EntityScreenLayout({
  header,
  children,
  footer,
  className,
}: {
  header?: React.ReactNode;
  children: React.ReactNode;
  footer?: React.ReactNode;
  className?: string;
}): React.JSX.Element {
  return (
    <div className={cn("flex min-h-0 w-full flex-1 flex-col", className)}>
      {header ? <div className="shrink-0">{header}</div> : null}
      <div className="popup-tab-scroll min-h-0 flex-1 [scrollbar-gutter:stable] overflow-x-hidden overflow-y-auto pr-1">
        {children}
      </div>
      {footer ? (
        <div className="border-border bg-background shrink-0 border-t pt-2">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
