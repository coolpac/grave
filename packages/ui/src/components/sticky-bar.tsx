import * as React from "react"
import { motion, MotionProps } from "framer-motion"
import { cn } from "../lib/utils"

export interface StickyBarProps extends Omit<React.HTMLAttributes<HTMLDivElement>, keyof MotionProps> {
  children: React.ReactNode
  variant?: "default" | "elevated" | "flat"
  hapticFeedback?: boolean
}

const StickyBar = React.forwardRef<HTMLDivElement, StickyBarProps>(
  ({ className, children, variant = "default", hapticFeedback = true, ...props }, ref) => {
    const variantClasses = {
      default: "bg-panel/95 backdrop-blur-md border-t border-border shadow-lg",
      elevated: "bg-panel backdrop-blur-lg border-t border-border shadow-2xl",
      flat: "bg-panel border-t border-border",
    }[variant]

    // Haptic feedback configuration with micro-vibration
    const hapticVariants = hapticFeedback
      ? {
          whileTap: {
            scale: 0.97,
            y: 1,
            transition: {
              type: "spring",
              stiffness: 500,
              damping: 20,
            },
          },
          whileHover: {
            scale: 1.01,
            transition: {
              type: "spring",
              stiffness: 400,
              damping: 25,
            },
          },
        }
      : {}

    return (
      <motion.div
        ref={ref}
        className={cn(
          "fixed bottom-0 left-0 right-0 z-50",
          "safe-area-bottom",
          variantClasses,
          className
        )}
        style={{
          paddingBottom: `max(1rem, env(safe-area-inset-bottom))`,
        }}
        {...hapticVariants}
        {...(props as MotionProps)}
      >
        <div className="px-4 py-3">
          {children}
        </div>
      </motion.div>
    )
  }
)
StickyBar.displayName = "StickyBar"

export { StickyBar }

