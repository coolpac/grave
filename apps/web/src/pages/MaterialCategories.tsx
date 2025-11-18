import { useParams, Link, useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { Package, Sparkles, Star, TrendingUp, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getAnimationVariants, getTransition, hoverLift, staggerContainer, staggerItem } from '../utils/animation-variants'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

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

export default function MaterialCategories() {
  const { material } = useParams<{ material: 'marble' | 'granite' }>()
  const navigate = useNavigate()
  const { BackButton } = useTelegram()
  const { shouldReduceMotion } = useReducedMotion()

  // Загрузка категорий с количеством товаров, фильтрованных по материалу
  const { data: categoriesData, isLoading: isLoadingCategories } = useQuery({
    queryKey: ['categories', material],
    queryFn: async () => {
      const { data } = await axios.get(
        `${API_URL}/catalog/categories?activeOnly=true&material=${material}`
      )
      return data
    },
    staleTime: 5 * 60 * 1000, // Кэш на 5 минут
  })

  useEffect(() => {
    if (BackButton && typeof BackButton.show === 'function') {
      try {
        BackButton.show()
        BackButton.onClick(() => {
          navigate(-1)
        })
      } catch (error) {
        console.debug('BackButton not supported:', error)
      }
    }

    return () => {
      if (BackButton && typeof BackButton.hide === 'function') {
        try {
          BackButton.hide()
          BackButton.offClick(() => {})
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
  const categories = categoriesConfig.map(config => {
    const categoryData = categoriesData?.find((cat: any) => cat.slug === config.slug)
    return {
      ...config,
      count: categoryData?._count?.products || 0,
    }
  })

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
              className="granite-button w-10 h-10 rounded-lg flex items-center justify-center"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              transition={getTransition(shouldReduceMotion, 'fast')}
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
        <motion.div
          variants={shouldReduceMotion ? undefined : staggerContainer}
          initial="hidden"
          animate="visible"
          className="grid grid-cols-2 gap-4"
        >
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <motion.div
                key={category.slug}
                variants={shouldReduceMotion ? getAnimationVariants(shouldReduceMotion, 'slideIn') : staggerItem}
                initial="hidden"
                animate="visible"
                className="h-full"
              >
                <Link to={`/c/${category.slug}`} className="h-full block">
                  {shouldReduceMotion ? (
                    <div className="h-full">
                      <StoneCard className="h-full cursor-pointer flex flex-col" style={{ minHeight: '200px' }}>
                        <div className="flex flex-col items-center text-center p-4 h-full" style={{ minHeight: '200px' }}>
                          <div className="granite-button w-20 h-20 rounded-xl flex items-center justify-center relative shrink-0 mb-4">
                            <Icon className="w-8 h-8 text-gray-200" />
                          </div>
                          <div className="flex-1 flex flex-col justify-center w-full">
                            <h3 className="font-inscription text-base text-gray-900 leading-tight min-h-[2.5rem] flex items-center justify-center">
                              {category.name}
                            </h3>
                            <p className="text-xs font-body text-gray-600 mt-2">
                              {category.count} {category.count === 1 ? 'товар' : category.count < 5 ? 'товара' : 'товаров'}
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
                      <StoneCard className="h-full cursor-pointer flex flex-col" style={{ minHeight: '200px' }}>
                        <div className="flex flex-col items-center text-center p-4 h-full" style={{ minHeight: '200px' }}>
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
                              {category.count} {category.count === 1 ? 'товар' : category.count < 5 ? 'товара' : 'товаров'}
                            </p>
                          </div>
                        </div>
                      </StoneCard>
                    </motion.div>
                  )}
                </Link>
              </motion.div>
            )
          })}
        </motion.div>
      </div>
    </div>
  )
}

