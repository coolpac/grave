import { useState } from 'react'
import { TransformWrapper, TransformComponent } from 'react-zoom-pan-pinch'
import { X, ChevronLeft, ChevronRight } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'

interface ProductImageGalleryProps {
  images: string[]
  onClose?: () => void
}

export default function ProductImageGallery({ images, onClose }: ProductImageGalleryProps) {
  const [currentIndex, setCurrentIndex] = useState(0)

  if (images.length === 0) {
    return null
  }

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length)
  }

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length)
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/95 backdrop-blur-sm flex items-center justify-center">
      {onClose && (
        <motion.button
          onClick={onClose}
          className="absolute top-4 right-4 z-10 p-3 rounded-lg transition-all duration-200"
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          style={{
            background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
            boxShadow: `
              inset 0 2px 4px rgba(255, 255, 255, 0.1),
              inset 0 -2px 4px rgba(0, 0, 0, 0.5),
              0 2px 8px rgba(0, 0, 0, 0.4)
            `,
            border: '1px solid rgba(139, 107, 63, 0.3)',
          }}
        >
          <X className="w-6 h-6 text-gray-200" />
        </motion.button>
      )}

      <div className="relative w-full h-full flex items-center justify-center p-4">
        <AnimatePresence mode="wait">
          <motion.div
            key={currentIndex}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="w-full h-full max-w-4xl max-h-[90vh]"
          >
            <TransformWrapper
              initialScale={1}
              minScale={0.5}
              maxScale={4}
              wheel={{ step: 0.1 }}
              pinch={{ step: 10 }}
              doubleClick={{ disabled: false, step: 0.7 }}
            >
              <TransformComponent
                wrapperClass="w-full h-full"
                contentClass="w-full h-full flex items-center justify-center"
              >
                <img
                  src={images[currentIndex]}
                  alt={`Product image ${currentIndex + 1}`}
                  className="max-w-full max-h-full object-contain"
                  onError={(e) => {
                    // Fallback на placeholder при ошибке загрузки
                    const target = e.target as HTMLImageElement
                    target.src = `https://via.placeholder.com/800/cccccc/666666?text=Изображение+${currentIndex + 1}`
                  }}
                />
              </TransformComponent>
            </TransformWrapper>
          </motion.div>
        </AnimatePresence>

        {images.length > 1 && (
          <>
            <motion.button
              onClick={prevImage}
              className="absolute left-4 p-3 rounded-lg transition-all duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
                boxShadow: `
                  inset 0 2px 4px rgba(255, 255, 255, 0.1),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.5),
                  0 2px 8px rgba(0, 0, 0, 0.4)
                `,
                border: '1px solid rgba(139, 107, 63, 0.3)',
              }}
            >
              <ChevronLeft className="w-6 h-6 text-gray-200" />
            </motion.button>
            <motion.button
              onClick={nextImage}
              className="absolute right-4 p-3 rounded-lg transition-all duration-200"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.9 }}
              style={{
                background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
                boxShadow: `
                  inset 0 2px 4px rgba(255, 255, 255, 0.1),
                  inset 0 -2px 4px rgba(0, 0, 0, 0.5),
                  0 2px 8px rgba(0, 0, 0, 0.4)
                `,
                border: '1px solid rgba(139, 107, 63, 0.3)',
              }}
            >
              <ChevronRight className="w-6 h-6 text-gray-200" />
            </motion.button>

            <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 flex gap-2 z-10">
              {images.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentIndex(index)}
                  className={`h-2 rounded-full transition-all duration-200 ${
                    index === currentIndex 
                      ? 'bg-bronze-500 w-8 shadow-lg' 
                      : 'bg-white/60 w-2 hover:bg-white/80'
                  }`}
                  style={{
                    boxShadow: index === currentIndex 
                      ? '0 2px 4px rgba(139, 107, 63, 0.4)' 
                      : 'none'
                  }}
                />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  )
}

