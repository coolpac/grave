import * as React from "react"
import { cn } from "../lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular"
  width?: string | number
  height?: string | number
  animation?: "shimmer" | "pulse" | "none"
}

const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant = "rectangular", 
    width, 
    height, 
    animation = "shimmer",
    ...props 
  }, ref) => {
    const baseClasses = "bg-muted/30"
    
    const variantClasses = {
      text: "h-4 rounded",
      circular: "rounded-full",
      rectangular: "rounded-md",
    }[variant]

    const animationClasses = {
      shimmer: "animate-shimmer",
      pulse: "animate-pulse",
      none: "",
    }[animation]

    const style: React.CSSProperties = {
      ...(width && { width: typeof width === "number" ? `${width}px` : width }),
      ...(height && { height: typeof height === "number" ? `${height}px` : height }),
    }

    return (
      <div
        ref={ref}
        className={cn(
          baseClasses,
          variantClasses,
          animationClasses,
          className
        )}
        style={style}
        {...props}
      />
    )
  }
)
Skeleton.displayName = "Skeleton"

export { Skeleton }






