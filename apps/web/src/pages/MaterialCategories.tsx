import { useParams, Link, useNavigate } from 'react-router-dom'
import { StoneCard, Skeleton } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { Package, Sparkles, Star, TrendingUp, ArrowLeft, LucideIcon } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect, useCallback, useMemo, memo } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getAnimationVariants, getTransition, hoverLift, staggerContainer, staggerItem } from '../utils/animation-variants'
import { usePrefetch } from '../hooks/usePrefetch'

import { API_URL } from '../config/api'

// Категории для мраморных изделий (структура, без count)
const marbleCategoriesConfig = [
  { slug: 'marble-monuments', name: 'Памятники из мрамора', icon: Package, material: 'marble' },
  { slug: 'marble-popular', name: 'Популярные модели', icon: Sparkles, material: 'marble' },
  { slug: 'marble-slabs', name: 'Плита из мрамора', icon: Package, material: 'marble' },
  { slug: 'marble-vases', name: 'Вазы', icon: Star, material: 'marble' },
  { slug: 'marble-chips', name: 'Крошка', icon: TrendingUp, material: 'marble' },
]

// Категории для гранитных изделий (структура, без count)
const graniteCategoriesConfig = [
  { slug: 'granite-monuments', name: 'Памятники из гранита', icon: Package, material: 'granite' },
  { slug: 'granite-popular', name: 'Популярные модели', icon: Sparkles, material: 'granite' },
  { slug: 'granite-slabs', name: 'Плита из гранита', icon: Package, material: 'granite' },
  { slug: 'granite-vases', name: 'Вазы', icon: Star, material: 'granite' },
  { slug: 'granite-chips', name: 'Крошка', icon: TrendingUp, material: 'granite' },
]

const materialInfo = {
  marble: {
    name: 'Мраморные изделия',
    description: 'Элегантные изделия из натурального мрамора',
    color: 'from-blue-50 to-blue-100',
    textColor: 'text-blue-900',
  },
  granite: {
    name: 'Гранитные изделия',
    description: 'Прочные и долговечные изделия из гранита',
    color: 'from-gray-50 to-gray-100',
    textColor: 'text-gray-900',
  },
}

// Мемоизированный компонент карточки категории для предотвращения перерендеров
interface CategoryCardProps {
  category: {
    slug: string
    name: string
    icon: LucideIcon
    count: number
  }
  index: number
  shouldReduceMotion: boolean
  onHover: (slug: string) => void
}

const CategoryCard = memo(({ category, index, shouldReduceMotion, onHover }: CategoryCardProps) => {
  const Icon = category.icon
  
  // Мемоизированный текст для количества товаров
  const countText = useMemo(() => {
    return category.count === 1 ? 'товар' : category.count < 5 ? 'товара' : 'товаров'
  }, [category.count])

  // Мемоизированный обработчик hover
  const handleHover = useCallback(() => {
    onHover(category.slug)
  }, [onHover, category.slug])

  return (
    <motion.div
      key={category.slug}
      variants={shouldReduceMotion ? getAnimationVariants(shouldReduceMotion, 'slideIn') : staggerItem}
      initial="hidden"
      animate="visible"
      custom={index}
      className="h-full"
    >
      <Link 
        to={`/c/${category.slug}`} 
        className="h-full block"
        aria-label={`Перейти к категории ${category.name}`}
        onMouseEnter={handleHover}
        onTouchStart={handleHover}
      >
        {shouldReduceMotion ? (
          <div className="h-full">
            <StoneCard className="h-full cursor-pointer flex flex-col touch-manipulation min-h-[200px]">
              <div className="flex flex-col items-center text-center p-4 h-full min-h-[200px]">
                <div className="granite-button w-20 h-20 rounded-xl flex items-center justify-center relative shrink-0 mb-4">
                  <Icon className="w-8 h-8 text-gray-200" />
                </div>
                <div className="flex-1 flex flex-col justify-center w-full">
                  <h3 className="font-inscription text-base text-gray-900 leading-tight min-h-[2.5rem] flex items-center justify-center">
                    {category.name}
                  </h3>
                  <p className="text-xs font-body text-gray-600 mt-2">
                    {category.count} {countText}
                  </p>
                </div>
              </div>
            </StoneCard>
          </div>
        ) : (
          <motion.div
            variants={hoverLift}
            initial="rest"
            whileHover="hover"
            whileTap="tap"
            className="h-full"
          >
            <StoneCard className="h-full cursor-pointer flex flex-col touch-manipulation min-h-[200px]">
              <div className="flex flex-col items-center text-center p-4 h-full min-h-[200px]">
                {/* Icon Container */}
                <motion.div
                  className="granite-button w-20 h-20 rounded-xl flex items-center justify-center relative shrink-0 mb-4"
                  whileHover={{ rotate: 5, scale: 1.05 }}
                  transition={getTransition(shouldReduceMotion, 'fast')}
                >
                  <Icon className="w-8 h-8 text-gray-200" />
                </motion.div>
                <div className="flex-1 flex flex-col justify-center w-full">
                  <h3 className="font-inscription text-base text-gray-900 leading-tight min-h-[2.5rem] flex items-center justify-center">
                    {category.name}
                  </h3>
                  <p className="text-xs font-body text-gray-600 mt-2">
                    {category.count} {countText}
                  </p>
                </div>
              </div>
            </StoneCard>
          </motion.div>
        )}
      </Link>
    </motion.div>
  )
})

CategoryCard.displayName = 'CategoryCard'

export default function MaterialCategories() {
  const { material } = useParams<{ material: 'marble' | 'granite' }>()
  const navigate = useNavigate()
  const { BackButton } = useTelegram()
  const { shouldReduceMotion } = useReducedMotion()
  const { prefetchCategory } = usePrefetch()

  // Загрузка категорий с количеством товаров, фильтрованных по материалу
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', material],
    queryFn: async () => {
      const { data } = await axios.get(
        `${API_URL}/catalog/categories?activeOnly=true&material=${material}`
      )
      return data
    },
    staleTime: 10 * 60 * 1000, // Кэш на 10 минут (увеличено)
    gcTime: 30 * 60 * 1000, // Хранить в кэше 30 минут (увеличено)
    refetchOnWindowFocus: false, // Не перезапрашивать при фокусе окна
    refetchOnMount: false, // Не перезапрашивать при монтировании, если данные свежие
    refetchOnReconnect: false, // Не перезапрашивать при переподключении
  })

  // Prefetch категории при hover/touch
  const handleCategoryHover = useCallback((categorySlug: string) => {
    prefetchCategory(categorySlug)
  }, [prefetchCategory])

  useEffect(() => {
    if (!BackButton || typeof BackButton.show !== 'function') {
      return
    }

    let handlerId: string | null = null
    try {
      BackButton.show()
      handlerId = BackButton.onClick(() => {
        navigate(-1)
      }, 'material-categories-back')
    } catch (error) {
      console.debug('BackButton not supported:', error)
    }

    return () => {
      if (typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
          if (handlerId) {
            BackButton.offClick(handlerId)
          } else if (typeof BackButton.clearHandlers === 'function') {
            BackButton.clearHandlers()
          }
        } catch (error) {
          // Игнорируем ошибки при очистке
        }
      }
    }
  }, [BackButton, navigate])

  if (!material || !['marble', 'granite'].includes(material)) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white p-4">
        <div className="text-center py-12">
          <p className="text-gray-600">Материал не найден</p>
          <Link to="/" className="text-bronze-600 hover:underline mt-4 inline-block">
            Вернуться на главную
          </Link>
        </div>
      </div>
    )
  }

  const info = materialInfo[material]
  const categoriesConfig = material === 'marble' ? marbleCategoriesConfig : graniteCategoriesConfig
  
  // Объединяем конфигурацию категорий с реальными данными из API
  // Мемоизировано для предотвращения пересоздания массива
  const categories = useMemo(() => {
    if (!categoriesData) return categoriesConfig.map(config => ({ ...config, count: 0 }))
    
    return categoriesConfig.map(config => {
      const categoryData = categoriesData.find((cat: any) => cat.slug === config.slug)
      return {
        ...config,
        count: categoryData?._count?.products || 0,
      }
    })
  }, [categoriesConfig, categoriesData])

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-6">
        <motion.div
          variants={getAnimationVariants(shouldReduceMotion, 'slideInFromTop')}
          initial="hidden"
          animate="visible"
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.button
              onClick={() => navigate(-1)}
              className="granite-button w-10 h-10 rounded-lg flex items-center justify-center touch-manipulation"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              transition={getTransition(shouldReduceMotion, 'fast')}
              aria-label="Назад"
            >
              <ArrowLeft className="w-5 h-5" />
            </motion.button>
            <div className="flex-1">
              <h1 className="text-2xl font-inscription text-gray-900">
                {info.name}
              </h1>
              <p className="text-sm font-body text-gray-600 mt-1">
                {info.description}
              </p>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Categories Grid */}
      <div className="px-4 pb-8">
        {isLoadingCategories ? (
          <div className="grid grid-cols-2 gap-4">
            {Array.from({ length: categoriesConfig.length }).map((_, i) => (
              <div key={i} className="h-full">
                <StoneCard className="h-full flex flex-col min-h-[200px] p-4">
                  <div className="flex flex-col items-center text-center h-full">
                    <Skeleton variant="circular" width={80} height={80} className="mb-4" />
                    <Skeleton variant="text" width="80%" height={20} className="mb-2" />
                    <Skeleton variant="text" width="60%" height={14} />
                  </div>
                </StoneCard>
              </div>
            ))}
          </div>
        ) : (
          <motion.div
            variants={shouldReduceMotion ? undefined : staggerContainer}
            initial="hidden"
            animate="visible"
            className="grid grid-cols-2 gap-4"
          >
            {categories.map((category, index) => (
              <CategoryCard
                key={category.slug}
                category={category}
                index={index}
                shouldReduceMotion={shouldReduceMotion}
                onHover={handleCategoryHover}
              />
            ))}
          </motion.div>
        )}
      </div>
    </div>
  )
}

