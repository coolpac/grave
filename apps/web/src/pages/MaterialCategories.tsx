import { useParams, Link, useNavigate } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { Package, Sparkles, Star, TrendingUp, ArrowLeft } from 'lucide-react'
import { motion } from 'framer-motion'
import { useEffect } from 'react'

// Категории для мраморных изделий
const marbleCategories = [
  { slug: 'marble-monuments', name: 'Памятники из мрамора', icon: Package, count: 32, material: 'marble' },
  { slug: 'marble-popular', name: 'Популярные модели', icon: Sparkles, count: 28, material: 'marble' },
  { slug: 'marble-slabs', name: 'Плита из мрамора', icon: Package, count: 24, material: 'marble' },
  { slug: 'marble-vases', name: 'Вазы', icon: Star, count: 15, material: 'marble' },
  { slug: 'marble-chips', name: 'Крошка', icon: TrendingUp, count: 12, material: 'marble' },
]

// Категории для гранитных изделий
const graniteCategories = [
  { slug: 'granite-monuments', name: 'Памятники из гранита', icon: Package, count: 45, material: 'granite' },
  { slug: 'granite-popular', name: 'Популярные модели', icon: Sparkles, count: 35, material: 'granite' },
  { slug: 'granite-slabs', name: 'Плита из гранита', icon: Package, count: 38, material: 'granite' },
  { slug: 'granite-vases', name: 'Вазы', icon: Star, count: 22, material: 'granite' },
  { slug: 'granite-chips', name: 'Крошка', icon: TrendingUp, count: 23, material: 'granite' },
]

const materialInfo = {
  marble: {
    name: 'Мраморные изделия',
    description: 'Элегантные изделия из натурального мрамора',
    categories: marbleCategories,
    color: 'from-blue-50 to-blue-100',
    textColor: 'text-blue-900',
  },
  granite: {
    name: 'Гранитные изделия',
    description: 'Прочные и долговечные изделия из гранита',
    categories: graniteCategories,
    color: 'from-gray-50 to-gray-100',
    textColor: 'text-gray-900',
  },
}

export default function MaterialCategories() {
  const { material } = useParams<{ material: 'marble' | 'granite' }>()
  const navigate = useNavigate()
  const { BackButton } = useTelegram()

  useEffect(() => {
    BackButton.show()
    BackButton.onClick(() => {
      navigate(-1)
    })

    return () => {
      BackButton.hide()
      BackButton.offClick(() => {})
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
  const categories = info.categories

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Header */}
      <div className="px-4 pt-4 pb-6">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
        >
          <div className="flex items-center gap-3 mb-4">
            <motion.button
              onClick={() => navigate(-1)}
              className="granite-button w-10 h-10 rounded-lg flex items-center justify-center"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
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
        <div className="grid grid-cols-2 gap-4">
          {categories.map((category, index) => {
            const Icon = category.icon
            return (
              <motion.div
                key={category.slug}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.4 }}
                className="h-full"
              >
                <Link to={`/c/${category.slug}`} className="h-full block">
                  <motion.div
                    whileHover={{ scale: 1.02, y: -2 }}
                    whileTap={{ scale: 0.98 }}
                    transition={{ duration: 0.2 }}
                    className="h-full"
                  >
                    <StoneCard className="h-full cursor-pointer flex flex-col" style={{ minHeight: '200px' }}>
                      <div className="flex flex-col items-center text-center p-4 h-full" style={{ minHeight: '200px' }}>
                        {/* Icon Container */}
                        <motion.div
                          className="granite-button w-20 h-20 rounded-xl flex items-center justify-center relative shrink-0 mb-4"
                          whileHover={{ rotate: 5, scale: 1.05 }}
                          transition={{ duration: 0.2 }}
                        >
                          <Icon className="w-8 h-8 text-gray-200" />
                        </motion.div>
                        <div className="flex-1 flex flex-col justify-center w-full">
                          <h3 className="font-inscription text-base text-gray-900 leading-tight min-h-[2.5rem] flex items-center justify-center">
                            {category.name}
                          </h3>
                          <p className="text-xs font-body text-gray-600 mt-2">
                            {category.count} товаров
                          </p>
                        </div>
                      </div>
                    </StoneCard>
                  </motion.div>
                </Link>
              </motion.div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

