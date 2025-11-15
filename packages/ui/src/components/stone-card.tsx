import * as React from "react"
import { cn } from "../lib/utils"

export interface StoneCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: "default" | "elevated"
  padding?: boolean
}

const StoneCard = React.forwardRef<HTMLDivElement, StoneCardProps>(
  ({ className, children, variant = "default", padding = true, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          "stone-card",
          variant === "elevated" && "stone-card--elevated",
          padding && "p-6",
          className
        )}
        {...props}
      >
        {children}
      </div>
    )
  }
)
StoneCard.displayName = "StoneCard"

export { StoneCard }





