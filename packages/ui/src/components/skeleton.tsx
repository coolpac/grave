import * as React from "react"
import { cn } from "../lib/utils"

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "text" | "circular" | "rectangular" | "card"
  width?: string | number
  height?: string | number
  animation?: "shimmer" | "pulse" | "granite" | "none"
}

/**
 * Premium Skeleton Component
 * 
 * Компонент-заглушка для загрузки контента в гранитном стиле.
 */
const Skeleton = React.forwardRef<HTMLDivElement, SkeletonProps>(
  ({ 
    className, 
    variant = "rectangular", 
    width, 
    height, 
    animation = "shimmer",
    ...props 
  }, ref) => {
    const variantClasses = {
      text: "h-4 rounded",
      circular: "rounded-full",
      rectangular: "rounded-lg",
      card: "rounded-xl",
    }[variant]

    const animationClasses = {
      shimmer: "skeleton-shimmer",
      pulse: "animate-pulse",
      granite: "skeleton-granite",
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
          "relative overflow-hidden",
          variantClasses,
          animationClasses,
          className
        )}
        style={{
          ...style,
          background: 'linear-gradient(135deg, rgba(255,255,255,0.03) 0%, rgba(255,255,255,0.06) 50%, rgba(255,255,255,0.03) 100%)',
        }}
        {...props}
      >
        {/* Shimmer overlay */}
        {animation === 'shimmer' && (
          <div 
            className="absolute inset-0"
            style={{
              background: 'linear-gradient(90deg, transparent 0%, rgba(139, 107, 63, 0.08) 50%, transparent 100%)',
              animation: 'skeleton-shimmer 1.5s ease-in-out infinite',
            }}
          />
        )}
        
        {/* Granite texture for granite animation */}
        {animation === 'granite' && (
          <div 
            className="absolute inset-0 opacity-30"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 400 400' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='3'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
              backgroundSize: '100px 100px',
              animation: 'skeleton-granite 2s ease-in-out infinite',
            }}
          />
        )}
      </div>
    )
  }
)
Skeleton.displayName = "Skeleton"

// Add keyframes to document if not already present
if (typeof document !== 'undefined') {
  const styleId = 'skeleton-animations'
  if (!document.getElementById(styleId)) {
    const style = document.createElement('style')
    style.id = styleId
    style.textContent = `
      @keyframes skeleton-shimmer {
        0% { transform: translateX(-100%); }
        100% { transform: translateX(100%); }
      }
      
      @keyframes skeleton-granite {
        0%, 100% { opacity: 0.2; }
        50% { opacity: 0.4; }
      }
      
      .skeleton-shimmer::before {
        content: '';
        position: absolute;
        inset: 0;
        background: linear-gradient(90deg, transparent 0%, rgba(139, 107, 63, 0.1) 50%, transparent 100%);
        animation: skeleton-shimmer 1.5s ease-in-out infinite;
      }
    `
    document.head.appendChild(style)
  }
}

export { Skeleton }






