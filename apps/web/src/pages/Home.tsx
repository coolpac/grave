import { Link } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { Skeleton } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { MapPin, Phone, Mail, Info, Sparkles } from 'lucide-react'
import { motion } from 'framer-motion'
import { useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

export default function Home() {
  const { user } = useTelegram()
  const contactRef = useRef<HTMLDivElement>(null)

  // Загрузка статистики по материалам
  const { data: materialStats, isLoading: isLoadingStats } = useQuery({
    queryKey: ['material-stats'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/products/stats/by-material`)
      return data
    },
    staleTime: 5 * 60 * 1000, // Кэш на 5 минут
  })

  const marbleCount = materialStats?.marble?.products || 0
  const graniteCount = materialStats?.granite?.products || 0
  const marbleCategoriesCount = materialStats?.marble?.categories || 5
  const graniteCategoriesCount = materialStats?.granite?.categories || 5
  const isLoading = isLoadingStats

  const scrollToContacts = () => {
    contactRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-50 to-white">
      {/* Hero Section */}
      <div className="px-4 pt-6 pb-4">
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="space-y-2"
        >
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-inscription text-gray-900 mb-1 flex-1">
              Ритуальные товары
            </h1>
            <motion.button
              onClick={scrollToContacts}
              className="granite-button px-3 py-2 rounded-lg font-body font-medium flex items-center justify-center gap-1.5 shrink-0"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
            >
              <Info className="w-4 h-4" />
              <span className="text-sm">О нас</span>
            </motion.button>
          </div>
          <p className="text-base font-body text-gray-600">
            Оптовые продажи изделий из мрамора и гранита
          </p>
        </motion.div>
      </div>

      {/* Special Offers Banner - гранитный стиль с мраморной текстурой */}
      <div className="px-4 mb-6">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.5, delay: 0.1 }}
          className="granite-banner relative rounded-xl"
        >
          <div className="relative z-10 p-6 flex flex-col items-center justify-center text-center min-h-[140px]">
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.3, type: 'spring', stiffness: 200 }}
              className="mb-3"
            >
              <Sparkles className="w-8 h-8 text-bronze-500" />
            </motion.div>
            <h2 className="text-2xl font-inscription text-gray-100 mb-2">
              Качественные материалы
            </h2>
            <p className="text-base font-body text-gray-300">
              Гранит, мрамор и другие материалы
            </p>
          </div>
          {/* Верхний блик */}
          <div
            className="absolute inset-0 pointer-events-none z-0"
            style={{
              background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.12) 0%, rgba(255, 255, 255, 0.06) 15%, rgba(255, 255, 255, 0.03) 30%, transparent 50%)',
            }}
          />
        </motion.div>
      </div>

      {/* Material Selection - Мрамор и Гранит */}
      <div className="px-4 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="stone-card p-4 h-48">
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="80%" height={14} className="mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Мраморные изделия */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.4 }}
            >
              <Link to="/materials/marble">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <StoneCard className="cursor-pointer overflow-hidden relative min-h-[200px]">
                    <div className="relative z-10 p-4 flex flex-col justify-between h-full">
                      <div>
                        <h2 className="text-lg font-inscription text-gray-900 mb-1.5">
                          Мраморные изделия
                        </h2>
                        <p className="text-xs font-body text-gray-600 mb-3 line-clamp-2">
                          Элегантные изделия из натурального мрамора
                        </p>
                        <div className="flex flex-col gap-1 text-xs font-body text-gray-700">
                          <span>{marbleCategoriesCount} категорий</span>
                          <span>{marbleCount} {marbleCount === 1 ? 'товар' : marbleCount < 5 ? 'товара' : 'товаров'}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-bronze-600">
                        <span className="text-xs font-body font-medium">Смотреть</span>
                        <motion.div
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-xs"
                        >
                          →
                        </motion.div>
                      </div>
                    </div>
                    {/* Декоративный фон */}
                    <div
                      className="absolute inset-0 opacity-5 pointer-events-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      }}
                    />
                  </StoneCard>
                </motion.div>
              </Link>
            </motion.div>

            {/* Гранитные изделия */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.4 }}
            >
              <Link to="/materials/granite">
                <motion.div
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  transition={{ duration: 0.2 }}
                >
                  <StoneCard className="cursor-pointer overflow-hidden relative min-h-[200px]">
                    <div className="relative z-10 p-4 flex flex-col justify-between h-full">
                      <div>
                        <h2 className="text-lg font-inscription text-gray-900 mb-1.5">
                          Гранитные изделия
                        </h2>
                        <p className="text-xs font-body text-gray-600 mb-3 line-clamp-2">
                          Прочные и долговечные изделия из гранита
                        </p>
                        <div className="flex flex-col gap-1 text-xs font-body text-gray-700">
                          <span>{graniteCategoriesCount} категорий</span>
                          <span>{graniteCount} {graniteCount === 1 ? 'товар' : graniteCount < 5 ? 'товара' : 'товаров'}</span>
                        </div>
                      </div>
                      <div className="mt-3 flex items-center gap-1 text-bronze-600">
                        <span className="text-xs font-body font-medium">Смотреть</span>
                        <motion.div
                          animate={{ x: [0, 3, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity }}
                          className="text-xs"
                        >
                          →
                        </motion.div>
                      </div>
                    </div>
                    {/* Декоративный фон */}
                    <div
                      className="absolute inset-0 opacity-5 pointer-events-none"
                      style={{
                        backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23000000' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
                      }}
                    />
                  </StoneCard>
                </motion.div>
              </Link>
            </motion.div>
          </div>
        )}
      </div>

      {/* Contact Information - кликабельные контакты */}
      <div ref={contactRef} className="px-4 pb-8 scroll-mt-4">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          <StoneCard>
            <div className="space-y-3">
              {/* Адрес */}
              <motion.a
                href="https://maps.google.com/?q=Москва,+ул.+Примерная,+д.+123"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-gray-900 hover:text-bronze-600 transition-colors cursor-pointer group"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center granite-button">
                  <MapPin className="w-5 h-5 text-gray-200 group-hover:text-bronze-300 transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-body text-gray-600 mb-0.5">Адрес</p>
                  <p className="text-sm font-body font-medium text-gray-900 group-hover:text-bronze-600">
                    г. Москва, ул. Примерная, д. 123
                  </p>
                </div>
              </motion.a>

              {/* Телефон */}
              <motion.a
                href="tel:+79991234567"
                className="flex items-center gap-3 text-gray-900 hover:text-bronze-600 transition-colors cursor-pointer group"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center granite-button">
                  <Phone className="w-5 h-5 text-gray-200 group-hover:text-bronze-300 transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-body text-gray-600 mb-0.5">Телефон</p>
                  <p className="text-sm font-body font-medium text-gray-900 group-hover:text-bronze-600">
                    +7 (999) 123-45-67
                  </p>
                </div>
              </motion.a>

              {/* Почта */}
              <motion.a
                href="mailto:info@ritual-products.ru"
                className="flex items-center gap-3 text-gray-900 hover:text-bronze-600 transition-colors cursor-pointer group"
                whileHover={{ x: 2 }}
                whileTap={{ scale: 0.98 }}
              >
                <div className="w-10 h-10 rounded-lg flex items-center justify-center granite-button">
                  <Mail className="w-5 h-5 text-gray-200 group-hover:text-bronze-300 transition-colors" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-body text-gray-600 mb-0.5">Почта</p>
                  <p className="text-sm font-body font-medium text-gray-900 group-hover:text-bronze-600">
                    info@ritual-products.ru
                  </p>
                </div>
              </motion.a>
            </div>
          </StoneCard>
        </motion.div>
      </div>
    </div>
  )
}
