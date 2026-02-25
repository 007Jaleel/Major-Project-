/**
 * switch.tsx - Simple toggle switch component
 * This is a lightweight alternative to Radix Switch (not currently installed in this repo).
 */

import * as React from "react"; // Import React for component typing.
import { cn } from "@/lib/utils"; // Import className helper.

export type SwitchProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  checked: boolean; // Whether the switch is on.
  onCheckedChange: (checked: boolean) => void; // Callback when user toggles.
};

export const Switch = React.forwardRef<HTMLButtonElement, SwitchProps>(
  ({ checked, onCheckedChange, className, disabled, ...props }, ref) => {
    return (
      <button
        ref={ref} // Forward ref for focus management.
        type="button" // Use button semantics.
        role="switch" // Announce switch role for accessibility.
        aria-checked={checked} // Tell screen readers current state.
        disabled={disabled} // Respect disabled state.
        onClick={() => {
          if (disabled) return; // Do nothing when disabled.
          onCheckedChange(!checked); // Toggle the checked state.
        }}
        className={cn(
          "inline-flex h-6 w-11 items-center rounded-full border transition-colors",
          checked ? "bg-primary border-primary" : "bg-muted border-border",
          disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
          className
        )} // Build className based on state.
        {...props} // Spread additional button props.
      >
        <span
          className={cn(
            "inline-block h-5 w-5 transform rounded-full bg-background shadow transition-transform",
            checked ? "translate-x-5" : "translate-x-1"
          )} // Position knob based on checked state.
        />
      </button>
    );
  }
);

Switch.displayName = "Switch"; // Set display name for devtools.
