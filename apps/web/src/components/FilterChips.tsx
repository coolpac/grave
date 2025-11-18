import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getTransition } from '../utils/animation-variants'

interface FilterOption {
  id: string
  label: string
  value: string
}

interface FilterChipsProps {
  filters: {
    material?: FilterOption[]
    color?: FilterOption[]
    shape?: FilterOption[]
  }
  selectedFilters: Record<string, string[]>
  onFilterChange: (category: string, value: string) => void
  onClearAll: () => void
}

export default function FilterChips({
  filters,
  selectedFilters,
  onFilterChange,
  onClearAll,
}: FilterChipsProps) {
  const { shouldReduceMotion } = useReducedMotion()
  const hasActiveFilters = Object.values(selectedFilters).some((arr) => arr.length > 0)

  return (
    <div className="space-y-4">
      {/* Material Filter */}
      {filters.material && filters.material.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Материал</h4>
          <div className="flex flex-wrap gap-2">
            {filters.material.map((option) => {
              const isSelected = selectedFilters.material?.includes(option.value)
              return (
                <motion.button
                  key={option.id}
                  onClick={() => onFilterChange('material', option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-panel border border-border hover:border-accent'
                  }`}
                  whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
                  whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
                  transition={getTransition(shouldReduceMotion, 'fast')}
                >
                  {option.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Color Filter */}
      {filters.color && filters.color.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Цвет</h4>
          <div className="flex flex-wrap gap-2">
            {filters.color.map((option) => {
              const isSelected = selectedFilters.color?.includes(option.value)
              return (
                <motion.button
                  key={option.id}
                  onClick={() => onFilterChange('color', option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-panel border border-border hover:border-accent'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {option.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Shape Filter */}
      {filters.shape && filters.shape.length > 0 && (
        <div>
          <h4 className="text-sm font-medium mb-2">Форма</h4>
          <div className="flex flex-wrap gap-2">
            {filters.shape.map((option) => {
              const isSelected = selectedFilters.shape?.includes(option.value)
              return (
                <motion.button
                  key={option.id}
                  onClick={() => onFilterChange('shape', option.value)}
                  className={`px-3 py-1.5 rounded-full text-sm font-medium transition-colors ${
                    isSelected
                      ? 'bg-accent text-accent-foreground'
                      : 'bg-panel border border-border hover:border-accent'
                  }`}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  {option.label}
                </motion.button>
              )
            })}
          </div>
        </div>
      )}

      {/* Clear All Button */}
      {hasActiveFilters && (
        <motion.button
          onClick={onClearAll}
          className="flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium bg-panel border border-border hover:border-destructive text-destructive"
          whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
          whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
          transition={getTransition(shouldReduceMotion, 'fast')}
        >
          <X className="w-4 h-4" />
          Очистить фильтры
        </motion.button>
      )}
    </div>
  )
}






