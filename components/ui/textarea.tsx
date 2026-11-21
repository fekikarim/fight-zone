import * as React from "react";
import { cn } from "@/lib/utils";
import { FIELD_BASE } from "@/components/ui/field-styles";

const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
        FIELD_BASE, "min-h-28 border-ink-border",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";

export { Textarea };
