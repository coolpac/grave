import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getAnimationVariants, getTransition } from '../utils/animation-variants'

export type SortOption = 'price-asc' | 'price-desc' | 'name-asc' | 'name-desc' | 'newest'

interface SortSelectProps {
  value: SortOption
  onChange: (value: SortOption) => void
}

const sortOptions: { value: SortOption; label: string }[] = [
  { value: 'newest', label: 'Сначала новые' },
  { value: 'price-asc', label: 'Цена: по возрастанию' },
  { value: 'price-desc', label: 'Цена: по убыванию' },
  { value: 'name-asc', label: 'Название: А-Я' },
  { value: 'name-desc', label: 'Название: Я-А' },
]

export default function SortSelect({ value, onChange }: SortSelectProps) {
  const { shouldReduceMotion } = useReducedMotion()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const selectedOption = sortOptions.find((opt) => opt.value === value)

  return (
    <div className="relative" ref={dropdownRef}>
      <motion.button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-4 py-2 rounded-lg bg-panel border border-border hover:border-accent transition-colors"
        whileHover={shouldReduceMotion ? undefined : { scale: 1.02 }}
        whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
        transition={getTransition(shouldReduceMotion, 'fast')}
      >
        <span className="text-sm font-medium">{selectedOption?.label || 'Сортировка'}</span>
        {!shouldReduceMotion ? (
          <motion.div
            animate={{ rotate: isOpen ? 180 : 0 }}
            transition={getTransition(shouldReduceMotion, 'fast')}
          >
            <ChevronDown className="w-4 h-4" />
          </motion.div>
        ) : (
          <div style={{ transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
            <ChevronDown className="w-4 h-4" />
          </div>
        )}
      </motion.button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={getAnimationVariants(shouldReduceMotion, 'slideInFromTop')}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="absolute top-full mt-2 left-0 right-0 bg-panel border border-border rounded-lg shadow-lg z-10 overflow-hidden"
          >
          {sortOptions.map((option) => (
            <button
              key={option.value}
              onClick={() => {
                onChange(option.value)
                setIsOpen(false)
              }}
              className={`w-full text-left px-4 py-2 text-sm hover:bg-accent/10 transition-colors ${
                value === option.value ? 'bg-accent/20 font-semibold' : ''
              }`}
            >
              {option.label}
            </button>
          ))}
        </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}






