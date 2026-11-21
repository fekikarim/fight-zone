import * as React from "react";
import { cn } from "@/lib/utils";
import { FIELD_BASE } from "@/components/ui/field-styles";

const Input = React.forwardRef<HTMLInputElement, React.InputHTMLAttributes<HTMLInputElement>>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        FIELD_BASE, "min-h-11 border-ink-border",
        className,
      )}
      {...props}
    />
  ),
);
Input.displayName = "Input";

export { Input };
