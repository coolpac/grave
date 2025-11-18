import { type TouchEvent, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { LucideIcon, Sparkles } from 'lucide-react'
import { AnimatePresence, motion } from 'framer-motion'

type BannerItemBase = {
  id: string
  title: string
  description: string
  href?: string
  icon?: LucideIcon
  cta?: string
  isExternal?: boolean
  imageUrl?: string
  bannerId?: number
}

export type BannerCarouselItem = BannerItemBase

type BannerCarouselProps = {
  items: BannerCarouselItem[]
  autoPlayInterval?: number
  onSlideClick?: (item: BannerCarouselItem) => void
}

export function BannerCarousel({ items, autoPlayInterval = 8000, onSlideClick }: BannerCarouselProps) {
  const slideCount = items.length
  const [activeIndex, setActiveIndex] = useState(0)
  const touchStartX = useRef(0)
  const touchCurrentX = useRef(0)
  const autoPlayTimer = useRef<ReturnType<typeof setInterval> | null>(null)

  const pauseAutoPlay = useCallback(() => {
    if (autoPlayTimer.current) {
      clearInterval(autoPlayTimer.current)
      autoPlayTimer.current = null
    }
  }, [])

  const restartAutoPlay = useCallback(() => {
    pauseAutoPlay()
    if (slideCount <= 1) return
    autoPlayTimer.current = setInterval(() => {
      setActiveIndex((prev) => (prev + 1) % slideCount)
    }, autoPlayInterval)
  }, [autoPlayInterval, pauseAutoPlay, slideCount])

  useEffect(() => {
    if (slideCount === 0) return
    restartAutoPlay()
    return pauseAutoPlay
  }, [pauseAutoPlay, restartAutoPlay, slideCount])

  useEffect(() => {
    if (activeIndex >= slideCount && slideCount > 0) {
      setActiveIndex(0)
    }
  }, [activeIndex, slideCount])

  const handleNext = useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % slideCount)
  }, [slideCount])

  const handlePrev = useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + slideCount) % slideCount)
  }, [slideCount])

  const handleDotClick = useCallback(
    (index: number) => {
      setActiveIndex(index)
      restartAutoPlay()
    },
    [restartAutoPlay],
  )

  const handleTouchStart = (event: TouchEvent<HTMLDivElement>) => {
    touchStartX.current = event.touches[0].clientX
    touchCurrentX.current = event.touches[0].clientX
    pauseAutoPlay()
  }

  const handleTouchMove = (event: TouchEvent<HTMLDivElement>) => {
    touchCurrentX.current = event.touches[0].clientX
  }

  const handleTouchEnd = () => {
    const deltaX = touchStartX.current - touchCurrentX.current
    const threshold = 40
    if (Math.abs(deltaX) > threshold) {
      if (deltaX > 0) {
        handleNext()
      } else {
        handlePrev()
      }
    }
    restartAutoPlay()
  }

  const currentItem = useMemo(() => items[activeIndex], [activeIndex, items])

  if (slideCount === 0 || !currentItem) {
    return null
  }

  const BannerContent = () => {
    const Icon = currentItem.icon || Sparkles

    return (
      <div className="granite-banner relative rounded-xl overflow-hidden focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-gray-900/50 focus-visible:ring-bronze-400 transition-shadow">
        {currentItem.imageUrl ? (
          <>
            <img
              src={currentItem.imageUrl}
              alt={currentItem.title}
              className="absolute inset-0 h-full w-full object-cover opacity-70"
              aria-hidden="true"
              loading="lazy"
            />
            <div className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/40 to-transparent" aria-hidden="true" />
          </>
        ) : null}
        <div className="relative z-10 p-6 flex flex-col items-center justify-center text-center min-h-[160px]">
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
            className="mb-3"
          >
            <Icon className="w-8 h-8 text-bronze-400" />
          </motion.div>
          <h2 className="text-2xl font-inscription text-gray-100 mb-2">{currentItem.title}</h2>
          <p className="text-base font-body text-gray-300">{currentItem.description}</p>
          {currentItem.cta ? (
            <span className="mt-3 inline-flex items-center gap-1 text-sm font-body text-bronze-200">
              {currentItem.cta}
              <motion.span
                animate={{ x: [0, 3, 0] }}
                transition={{ duration: 1.6, repeat: Infinity, ease: 'easeInOut' }}
              >
                →
              </motion.span>
            </span>
          ) : null}
        </div>
        <div
          className="absolute inset-0 pointer-events-none z-0"
          style={{
            background:
              'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 20%, rgba(255, 255, 255, 0.03) 45%, transparent 70%)',
          }}
        />
      </div>
    )
  }

  const renderSlide = () => {
    const content = <BannerContent />
    const handleSlideClick = () => {
      onSlideClick?.(currentItem)
    }

    if (currentItem.href) {
      if (currentItem.isExternal) {
        return (
          <motion.a
            href={currentItem.href}
            target="_blank"
            rel="noreferrer"
            className="block focus:outline-none"
            whileTap={{ scale: 0.99 }}
            onClick={handleSlideClick}
          >
            {content}
          </motion.a>
        )
      }

      return (
        <Link to={currentItem.href} className="block focus:outline-none" onClick={handleSlideClick}>
          <motion.div whileTap={{ scale: 0.99 }}>{content}</motion.div>
        </Link>
      )
    }

    return (
      <motion.button
        type="button"
        className="block w-full text-left focus:outline-none"
        whileTap={{ scale: 0.99 }}
        onClick={handleSlideClick}
      >
        {content}
      </motion.button>
    )
  }

  return (
    <div
      className="relative"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      <AnimatePresence mode="wait">
        <motion.div
          key={currentItem.id}
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -15 }}
          transition={{ duration: 0.4 }}
        >
          {renderSlide()}
        </motion.div>
      </AnimatePresence>

      {slideCount > 1 ? (
        <div className="flex items-center justify-center gap-2 mt-4">
          {items.map((item, index) => (
            <button
              key={item.id}
              aria-label={`Показать баннер ${index + 1}`}
              type="button"
              onClick={() => handleDotClick(index)}
              className={`h-2 rounded-full transition-all duration-200 ${
                index === activeIndex ? 'w-6 bg-bronze-400' : 'w-2.5 bg-gray-400/40 hover:bg-gray-400/60'
              }`}
            />
          ))}
        </div>
      ) : null}
    </div>
  )
}

