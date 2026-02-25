import * as React from "react"; // Import React for forwardRef.
import { Slot } from "@radix-ui/react-slot"; // Radix Slot for asChild pattern.
import { cva, type VariantProps } from "class-variance-authority"; // Class variance authority for variants.

import { cn } from "@/lib/utils"; // Utility for merging class names.

// Button variants definition using class-variance-authority.
const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px] aria-invalid:ring-destructive/20 dark:aria-invalid:ring-destructive/40 dark:aria-invalid:ring-destructive/40 aria-invalid:border-destructive",
  {
    variants: {
      variant: {
        default: "bg-primary text-primary-foreground hover:bg-primary/90",
        destructive:
          "bg-destructive text-white hover:bg-destructive/90 focus-visible:ring-destructive/20 dark:focus-visible:ring-destructive/40 dark:bg-destructive/60",
        outline:
          "border bg-transparent shadow-xs hover:bg-accent dark:bg-transparent dark:border-input dark:hover:bg-input/50",
        secondary:
          "bg-secondary text-secondary-foreground hover:bg-secondary/80",
        ghost:
          "hover:bg-accent dark:hover:bg-accent/50",
        link: "text-primary underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2 has-[>svg]:px-3",
        sm: "h-8 rounded-md gap-1.5 px-3 has-[>svg]:px-2.5",
        lg: "h-10 rounded-md px-6 has-[>svg]:px-4",
        icon: "size-9",
        "icon-sm": "size-8",
        "icon-lg": "size-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

// Button props interface extending standard button props.
export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean; // When true, renders as Slot to pass props to child.
}

/**
 * Button component with forwardRef support for Radix UI compatibility.
 * Supports multiple variants and sizes via class-variance-authority.
 * 
 * @param className - Additional CSS classes to apply.
 * @param variant - Button style variant (default, destructive, outline, secondary, ghost, link).
 * @param size - Button size (default, sm, lg, icon, icon-sm, icon-lg).
 * @param asChild - When true, renders as Radix Slot to merge props with child element.
 * @param ref - Forwarded ref for DOM access (required for DialogTrigger asChild pattern).
 */
const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button"; // Use Slot for asChild pattern, otherwise button.

    return (
      <Comp
        data-slot="button"
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref} // Forward ref to underlying element for Radix compatibility.
        {...props}
      />
    );
  }
);

// Set display name for debugging in React DevTools.
Button.displayName = "Button";

export { Button, buttonVariants };