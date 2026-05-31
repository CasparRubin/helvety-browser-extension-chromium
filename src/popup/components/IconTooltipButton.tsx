import { Button } from "@helvety/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@helvety/ui/tooltip";

import type { ComponentProps, ReactNode } from "react";

/** Icon-only button with shadcn tooltip (action label on hover). */
export function IconTooltipButton({
  label,
  tooltip,
  children,
  ...buttonProps
}: {
  label: string;
  tooltip?: ReactNode;
  children: ReactNode;
} & ComponentProps<typeof Button>): React.JSX.Element {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button aria-label={label} {...buttonProps}>
          {children}
          <span className="sr-only">{label}</span>
        </Button>
      </TooltipTrigger>
      <TooltipContent side="bottom">{tooltip ?? label}</TooltipContent>
    </Tooltip>
  );
}
