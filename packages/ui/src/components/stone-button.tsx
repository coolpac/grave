import * as React from "react"
import { cn } from "../lib/utils"

export interface StoneButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "solid" | "ghost" | "outline"
  size?: "default" | "sm" | "lg"
}

const StoneButton = React.forwardRef<HTMLButtonElement, StoneButtonProps>(
  ({ className, variant = "solid", size = "default", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "stone-button",
          `stone-button--${variant}`,
          `stone-button--${size}`,
          className
        )}
        {...props}
      >
        <span className="stone-button-content">{props.children}</span>
      </button>
    )
  }
)
StoneButton.displayName = "StoneButton"

export { StoneButton }





