import * as React from "react"
import { cn } from "../lib/utils"

export interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode
  variant?: "default" | "subtle" | "strong"
  padding?: boolean
}

const GlassCard = React.forwardRef<HTMLDivElement, GlassCardProps>(
  ({ className, children, variant = "default", padding = true, ...props }, ref) => {
    const blurClass = {
      default: "backdrop-blur-[12px]",
      subtle: "backdrop-blur-[8px]",
      strong: "backdrop-blur-[16px]",
    }[variant]

    const opacityClass = {
      default: "bg-panel/40",
      subtle: "bg-panel/20",
      strong: "bg-panel/60",
    }[variant]

    return (
      <div
        ref={ref}
        className={cn(
          "relative rounded-lg overflow-hidden",
          blurClass,
          opacityClass,
          "shadow-lg",
          className
        )}
        style={{
          border: "1px solid hsl(var(--border) / 0.3)",
        }}
        {...props}
      >
        {/* Gradient border effect using pseudo-element technique */}
        <div
          className="absolute inset-0 rounded-lg pointer-events-none"
          style={{
            padding: "1px",
            background: `linear-gradient(135deg, 
              hsl(var(--accent) / 0.5) 0%, 
              hsl(var(--accent) / 0.3) 20%,
              transparent 40%,
              transparent 60%,
              hsl(var(--accent) / 0.3) 80%,
              hsl(var(--accent) / 0.5) 100%
            )`,
            WebkitMask: "linear-gradient(#fff 0 0) content-box, linear-gradient(#fff 0 0)",
            WebkitMaskComposite: "xor",
            maskComposite: "exclude",
            zIndex: 1,
          }}
        />
        
        {/* Liquid gradient mask animation */}
        <div
          className="absolute inset-0 rounded-lg pointer-events-none animate-liquid"
          style={{
            background: `linear-gradient(
              135deg,
              hsl(var(--accent) / 0.2) 0%,
              transparent 25%,
              transparent 50%,
              transparent 75%,
              hsl(var(--accent) / 0.2) 100%
            )`,
            backgroundSize: "300% 300%",
            maskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)",
            WebkitMaskImage: "radial-gradient(ellipse at center, rgba(0,0,0,0.4) 0%, transparent 70%)",
            zIndex: 2,
          }}
        />
        
        {/* Content */}
        <div className={cn("relative z-10", padding && "p-6")}>
          {children}
        </div>
      </div>
    )
  }
)
GlassCard.displayName = "GlassCard"

export { GlassCard }

