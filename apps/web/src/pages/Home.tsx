import { Link } from 'react-router-dom'
import { StoneCard } from '@monorepo/ui'
import { Skeleton } from '@monorepo/ui'
import { useTelegram } from '../hooks/useTelegram'
import { MapPin, Phone, Mail, Info, Sparkles, ShieldCheck, Ruler } from 'lucide-react'
import { motion } from 'framer-motion'
import { useCallback, useMemo, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import axios from 'axios'
import { BannerCarousel, type BannerCarouselItem } from '../components/BannerCarousel'
import { usePrefetch } from '../hooks/usePrefetch'
import { useReducedMotion } from '../hooks/useReducedMotion'
import { getAnimationVariants, getTransition, hoverLift } from '../utils/animation-variants'

import { API_URL } from '../config/api'

type BannerResponse = {
  id: number
  title: string
  description?: string | null
  imageUrl: string
  linkUrl?: string | null
  position?: string | null
  order?: number | null
  isActive: boolean
  startDate?: string | null
  endDate?: string | null
}

export default function Home() {
  const { user } = useTelegram()
  const contactRef = useRef<HTMLDivElement>(null)
  const { prefetchCategory } = usePrefetch()
  const { shouldReduceMotion } = useReducedMotion()
  
  const { data: bannersData } = useQuery<BannerResponse[]>({
    queryKey: ['banners-public'],
    queryFn: async () => {
      const { data } = await axios.get(`${API_URL}/banners`)
      return data
    },
    staleTime: 60 * 1000,
  })

  const heroBannerSlides: BannerCarouselItem[] = [
    {
      id: 'materials',
      title: 'Качественные материалы',
      description: 'Гранит, мрамор и натуральные породы напрямую от карьеров',
      href: '/materials/granite',
      icon: Sparkles,
      cta: 'Перейти в каталог',
    },
    {
      id: 'custom',
      title: 'Индивидуальные проекты',
      description: 'Подберём форму, цвет и отделку под ваш запрос',
      href: 'tel:+79991234567',
      icon: Ruler,
      cta: 'Обсудить детали',
      isExternal: true,
    },
    {
      id: 'quality',
      title: 'Контроль качества',
      description: 'Сертифицированное производство и гарантия на каждый заказ',
      href: '/orders',
      icon: ShieldCheck,
      cta: 'Проверить статус заказа',
    },
  ]
  const remoteBannerSlides = useMemo<BannerCarouselItem[]>(() => {
    if (!bannersData || bannersData.length === 0) return []
    const now = new Date()
    return bannersData
      .filter((banner) => {
        if (!banner.isActive) return false
        if (banner.position && banner.position !== 'home') return false
        if (banner.startDate && new Date(banner.startDate) > now) return false
        if (banner.endDate && new Date(banner.endDate) < now) return false
        return Boolean(banner.imageUrl)
      })
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((banner) => {
        const link = banner.linkUrl?.trim() || ''
        const hasLink = Boolean(link)
        const isExternalLink = hasLink ? /^(https?:\/\/|mailto:|tel:)/i.test(link) : false
        return {
          id: `banner-${banner.id}`,
          bannerId: banner.id,
          title: banner.title,
          description: banner.description || '',
          href: hasLink ? link : undefined,
          isExternal: isExternalLink,
          icon: Sparkles,
          imageUrl: banner.imageUrl,
          cta: hasLink ? (link.startsWith('tel:') ? 'Позвонить' : 'Подробнее') : undefined,
        }
      })
  }, [bannersData])

  const slidesToShow = remoteBannerSlides.length > 0 ? remoteBannerSlides : heroBannerSlides

  const handleBannerClick = useCallback((item: BannerCarouselItem) => {
    if (!item.bannerId) return
    const clickEndpoint = `${API_URL}/banners/${item.bannerId}/click`
    try {
      if (navigator.sendBeacon) {
        const beaconPayload = new Blob([], { type: 'text/plain' })
        navigator.sendBeacon(clickEndpoint, beaconPayload)
        return
      }
      axios.post(clickEndpoint).catch(() => {})
    } catch {
      axios.post(clickEndpoint).catch(() => {})
    }
  }, [])

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
      {/* Hero Section - без анимации на критическом пути */}
      <div className="px-4 pt-6 pb-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-3xl font-inscription text-gray-900 mb-1 flex-1">
              Ритуальные товары
            </h1>
            <motion.button
              onClick={scrollToContacts}
              className="granite-button px-3 py-2 rounded-lg font-body font-medium flex items-center justify-center gap-1.5 shrink-0"
              whileHover={shouldReduceMotion ? undefined : { scale: 1.05 }}
              whileTap={shouldReduceMotion ? undefined : { scale: 0.95 }}
              initial={false}
              transition={getTransition(shouldReduceMotion, 'fast')}
            >
              <Info className="w-4 h-4" />
              <span className="text-sm">О нас</span>
            </motion.button>
          </div>
          <p className="text-base font-body text-gray-600">
            Оптовые продажи изделий из мрамора и гранита
          </p>
        </div>
      </div>

      {/* Highlight Banner Carousel */}
      <div className="px-4 mb-6">
        <BannerCarousel 
          items={slidesToShow} 
          autoPlayInterval={8000} 
          onSlideClick={handleBannerClick}
        />
      </div>

      {/* Material Selection - Мрамор и Гранит */}
      <div className="px-4 pb-8">
        {isLoading ? (
          <div className="grid grid-cols-2 gap-3">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="stone-card p-4 min-h-[200px]">
                <Skeleton variant="text" width="60%" height={20} />
                <Skeleton variant="text" width="80%" height={14} className="mt-2" />
                <Skeleton variant="text" width="70%" height={14} className="mt-4" />
                <Skeleton variant="text" width="50%" height={14} className="mt-2" />
              </div>
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3">
            {/* Мраморные изделия */}
            <motion.div
              variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
              initial="hidden"
              animate="visible"
              custom={0}
              onMouseEnter={() => prefetchCategory('marble')}
              onTouchStart={() => prefetchCategory('marble')}
            >
              <Link 
                to="/materials/marble" 
                className="block h-full"
                aria-label="Перейти к мраморным изделиям"
              >
                <motion.div
                  variants={shouldReduceMotion ? undefined : hoverLift}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  className="h-full"
                >
                  <StoneCard className="cursor-pointer overflow-hidden relative min-h-[200px] h-full touch-manipulation">
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
              variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
              initial="hidden"
              animate="visible"
              custom={1}
              onMouseEnter={() => prefetchCategory('granite')}
              onTouchStart={() => prefetchCategory('granite')}
            >
              <Link 
                to="/materials/granite" 
                className="block h-full"
                aria-label="Перейти к гранитным изделиям"
              >
                <motion.div
                  variants={shouldReduceMotion ? undefined : hoverLift}
                  initial="rest"
                  whileHover="hover"
                  whileTap="tap"
                  className="h-full"
                >
                  <StoneCard className="cursor-pointer overflow-hidden relative min-h-[200px] h-full touch-manipulation">
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
          variants={getAnimationVariants(shouldReduceMotion, 'slideIn')}
          initial="hidden"
          animate="visible"
        >
          <StoneCard>
            <div className="space-y-3">
              {/* Адрес */}
              <motion.a
                href="https://maps.google.com/?q=Москва,+ул.+Примерная,+д.+123"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 text-gray-900 hover:text-bronze-600 transition-colors cursor-pointer group"
                whileHover={shouldReduceMotion ? undefined : { x: 2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                transition={getTransition(shouldReduceMotion, 'fast')}
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
                whileHover={shouldReduceMotion ? undefined : { x: 2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                transition={getTransition(shouldReduceMotion, 'fast')}
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
                whileHover={shouldReduceMotion ? undefined : { x: 2 }}
                whileTap={shouldReduceMotion ? undefined : { scale: 0.98 }}
                transition={getTransition(shouldReduceMotion, 'fast')}
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
