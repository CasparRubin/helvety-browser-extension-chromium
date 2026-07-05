import { RowActionButton } from "@helvety/ui/row-action-button";

import type { Button } from "@helvety/ui/button";
import type { ComponentProps, ReactNode } from "react";

/** Icon-only button with shadcn tooltip (action label on hover). */
export function IconTooltipButton({
  label,
  tooltip,
  children,
  stopPropagation = true,
  ...buttonProps
}: {
  label: string;
  tooltip?: ReactNode;
  stopPropagation?: boolean;
  children: ReactNode;
} & ComponentProps<typeof Button>): React.JSX.Element {
  return (
    <RowActionButton
      showTooltip
      label={label}
      tooltip={tooltip}
      stopPropagation={stopPropagation}
      {...buttonProps}
    >
      {children}
    </RowActionButton>
  );
}
