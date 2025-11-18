import { useState, useEffect, useRef, useCallback } from 'react'
import { PLACEHOLDER_IMAGE } from '../utils/constants'

/**
 * Generate blur placeholder (10x10 base64)
 */
const generateBlurPlaceholder = (): string => {
  // Tiny 1x1 transparent PNG as base64
  return 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg=='
}

/**
 * Check WebP support
 */
const checkWebPSupport = (): Promise<boolean> => {
  return new Promise((resolve) => {
    const webP = new Image()
    webP.onload = webP.onerror = () => {
      resolve(webP.height === 2)
    }
    webP.src =
      'data:image/webp;base64,UklGRjoAAABXRUJQVlA4IC4AAACyAgCdASoCAAIALmk0mk0iIiIiIgBoSygABc6WWgAA/veff/0PP8bA//LwYAAA'
  })
}

/**
 * Generate image URL with size parameter
 */
const getImageUrl = (
  src: string,
  size?: 'thumbnail' | 'medium' | 'large',
  format?: 'webp' | 'jpeg',
): string => {
  if (!src || src === PLACEHOLDER_IMAGE) return PLACEHOLDER_IMAGE

  // If it's a data URL, return as is
  if (src.startsWith('data:')) {
    return src
  }

  // For relative URLs (starting with /), try to add size parameter
  if (src.startsWith('/')) {
    try {
      const url = new URL(src, window.location.origin)
      if (size) {
        url.searchParams.set('size', size)
      }
      if (format) {
        url.searchParams.set('format', format)
      }
      return url.toString()
    } catch {
      return src
    }
  }

  // For full URLs (http/https), check if it's our API
  if (src.startsWith('http')) {
    try {
      const url = new URL(src)
      // If it's our API or uploads endpoint, add size parameter
      if (
        url.origin === window.location.origin ||
        url.pathname.startsWith('/api/') ||
        url.pathname.includes('/uploads/')
      ) {
        if (size) {
          url.searchParams.set('size', size)
        }
        if (format) {
          url.searchParams.set('format', format)
        }
        return url.toString()
      }
      // For external URLs, return as is (or use image proxy/CDN)
      return src
    } catch {
      return src
    }
  }

  // Fallback
  return src
}

/**
 * Generate srcset for responsive images
 */
const generateSrcSet = (
  src: string,
  sizes: Array<{ width: number; size: 'thumbnail' | 'medium' | 'large' }>,
  format?: 'webp' | 'jpeg',
): string => {
  return sizes
    .map(({ width, size }) => {
      const url = getImageUrl(src, size, format)
      return `${url} ${width}w`
    })
    .join(', ')
}

export interface OptimizedImageProps {
  src: string
  alt: string
  width?: number
  height?: number
  aspectRatio?: number // width/height ratio
  size?: 'thumbnail' | 'medium' | 'large'
  sizes?: string // CSS sizes attribute for responsive images
  className?: string
  loading?: 'lazy' | 'eager'
  priority?: boolean // If true, loads immediately without lazy loading
  onLoad?: () => void
  onError?: () => void
  objectFit?: 'cover' | 'contain' | 'fill' | 'none' | 'scale-down'
  placeholder?: 'blur' | 'empty'
  blurDataURL?: string // Custom blur placeholder
}

export default function OptimizedImage({
  src,
  alt,
  width,
  height,
  aspectRatio,
  size = 'medium',
  sizes = '100vw',
  className = '',
  loading = 'lazy',
  priority = false,
  onLoad,
  onError,
  objectFit = 'cover',
  placeholder = 'blur',
  blurDataURL,
}: OptimizedImageProps) {
  const [imageSrc, setImageSrc] = useState<string>(blurDataURL || generateBlurPlaceholder())
  const [isLoaded, setIsLoaded] = useState(false)
  const [hasError, setHasError] = useState(false)
  const [webpSupported, setWebpSupported] = useState<boolean | null>(null)
  const [isInView, setIsInView] = useState(priority) // If priority, start in view
  const imgRef = useRef<HTMLImageElement>(null)
  const containerRef = useRef<HTMLDivElement>(null)

  // Check WebP support on mount
  useEffect(() => {
    checkWebPSupport().then(setWebpSupported)
  }, [])

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || loading === 'eager') {
      setIsInView(true)
      return
    }

    if (!containerRef.current) return

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsInView(true)
            observer.disconnect()
          }
        })
      },
      {
        rootMargin: '50px', // Start loading 50px before entering viewport
        threshold: 0.01,
      },
    )

    observer.observe(containerRef.current)

    return () => {
      observer.disconnect()
    }
  }, [priority, loading])

  // Load image when in view
  useEffect(() => {
    if (!isInView || hasError || !src || src === PLACEHOLDER_IMAGE) return

    const format = webpSupported === null ? undefined : webpSupported ? 'webp' : 'jpeg'
    const url = getImageUrl(src, size, format)

    // Progressive loading: start with thumbnail if available
    if (size !== 'thumbnail' && webpSupported !== null) {
      // First load thumbnail
      const thumbnailUrl = getImageUrl(src, 'thumbnail', format)
      const thumbnailImg = new Image()
      thumbnailImg.onload = () => {
        setImageSrc(thumbnailUrl)
        setIsLoaded(true)
        // Then load full size
        const fullImg = new Image()
        fullImg.onload = () => {
          setImageSrc(url)
        }
        fullImg.onerror = () => {
          // Keep thumbnail if full size fails
        }
        fullImg.src = url
      }
      thumbnailImg.onerror = () => {
        // If thumbnail fails, try full size directly
        const fullImg = new Image()
        fullImg.onload = () => {
          setImageSrc(url)
          setIsLoaded(true)
        }
        fullImg.onerror = () => {
          setHasError(true)
          setImageSrc(PLACEHOLDER_IMAGE)
          onError?.()
        }
        fullImg.src = url
      }
      thumbnailImg.src = thumbnailUrl
    } else {
      // Direct load
      const img = new Image()
      img.onload = () => {
        setImageSrc(url)
        setIsLoaded(true)
        onLoad?.()
      }
      img.onerror = () => {
        setHasError(true)
        setImageSrc(PLACEHOLDER_IMAGE)
        onError?.()
      }
      img.src = url
    }
  }, [isInView, src, size, webpSupported, hasError, onLoad, onError])

  // Generate srcset for responsive images
  const srcSet = webpSupported !== null
    ? generateSrcSet(
        src,
        [
          { width: 200, size: 'thumbnail' },
          { width: 800, size: 'medium' },
          { width: 1600, size: 'large' },
        ],
        webpSupported ? 'webp' : 'jpeg',
      )
    : undefined

  // Calculate aspect ratio
  const calculatedAspectRatio = aspectRatio || (width && height ? width / height : 1)

  // Handle image load
  const handleLoad = useCallback(() => {
    setIsLoaded(true)
    onLoad?.()
  }, [onLoad])

  // Handle image error
  const handleError = useCallback(() => {
    setHasError(true)
    setImageSrc(PLACEHOLDER_IMAGE)
    onError?.()
  }, [onError])

  return (
    <div
      ref={containerRef}
      className={`relative overflow-hidden ${className}`}
      style={{
        aspectRatio: calculatedAspectRatio.toString(),
        width: width ? `${width}px` : '100%',
        height: height ? `${height}px` : 'auto',
      }}
    >
      {/* Blur placeholder */}
      {placeholder === 'blur' && !isLoaded && !hasError && (
        <div
          className="absolute inset-0 blur-sm scale-110"
          style={{
            backgroundImage: `url(${blurDataURL || generateBlurPlaceholder()})`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            filter: 'blur(20px)',
            opacity: 0.5,
          }}
          aria-hidden="true"
        />
      )}

      {/* Actual image */}
      {isInView && imageSrc && (
        <img
          ref={imgRef}
          src={imageSrc}
          srcSet={srcSet}
          sizes={sizes}
          alt={alt}
          width={width}
          height={height}
          className={`absolute inset-0 w-full h-full transition-opacity duration-300 ${
            isLoaded ? 'opacity-100' : 'opacity-0'
          }`}
          style={{
            objectFit,
          }}
          loading={priority ? 'eager' : loading}
          onLoad={handleLoad}
          onError={handleError}
          decoding="async"
        />
      )}

      {/* Loading indicator */}
      {!isLoaded && !hasError && (
        <div
          className="absolute inset-0 flex items-center justify-center bg-gray-100"
          aria-hidden="true"
        >
          <div className="w-8 h-8 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin" />
        </div>
      )}
    </div>
  )
}

