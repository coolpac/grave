import { useState, useEffect, Suspense, lazy } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClientProvider } from '@tanstack/react-query'
import { ReactQueryDevtools } from '@tanstack/react-query-devtools'
import { Toaster } from 'react-hot-toast'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'
import { useTelegram } from './hooks/useTelegram'
import { queryClient } from './config/queryClient'

// Lazy load all pages for code splitting
const Home = lazy(() => import('./pages/Home'))
const Category = lazy(() => import('./pages/Category'))
const MaterialCategories = lazy(() => import('./pages/MaterialCategories'))
const Product = lazy(() => import('./pages/Product'))
const Cart = lazy(() => import('./pages/Cart'))
const Checkout = lazy(() => import('./pages/Checkout'))
const OrderSuccess = lazy(() => import('./pages/OrderSuccess'))
const Orders = lazy(() => import('./pages/Orders'))

// Page loading fallback component
const PageLoadingFallback = () => (
  <div className="flex items-center justify-center min-h-[60vh]">
    <div className="flex flex-col items-center gap-4">
      <div className="w-8 h-8 border-2 border-white/20 border-t-white/60 rounded-full animate-spin" />
      <p className="text-sm text-white/60">Загрузка...</p>
    </div>
  </div>
)

function AppContent() {
  const [isLoading, setIsLoading] = useState(true)
  const { isReady, sendDataToServer } = useTelegram()

  useEffect(() => {
    // Минимальное время показа экрана загрузки - 1.5 секунды для красоты (уменьшено для мобильных)
    const minLoadingTime = 1500
    const startTime = Date.now()
    let timeoutTimer: ReturnType<typeof setTimeout>
    let browserTimer: ReturnType<typeof setTimeout>

    // Таймаут для гарантированного завершения загрузки (особенно для браузера без Telegram)
    timeoutTimer = setTimeout(() => {
      const elapsed = Date.now() - startTime
      const remaining = Math.max(0, minLoadingTime - elapsed)
      setTimeout(() => {
        console.log('Loading timeout reached, showing app')
        setIsLoading(false)
      }, remaining)
    }, 3000) // 3 секунды максимум

    if (isReady) {
      // Валидация initData на сервере (только в Telegram)
      sendDataToServer()
        .then((success) => {
          // Даже если валидация не прошла, продолжаем работу (для разработки)
          if (!success) {
            console.warn('InitData validation failed, but continuing...')
          }
        })
        .catch((error) => {
          console.error('Error during initData validation:', error)
        })
        .finally(() => {
          // Завершаем загрузку после валидации, но не раньше минимального времени
          const elapsed = Date.now() - startTime
          const remaining = Math.max(0, minLoadingTime - elapsed)
          clearTimeout(timeoutTimer)
          setTimeout(() => {
            setIsLoading(false)
          }, remaining)
        })
    } else {
      // Если Telegram не готов (браузер без Telegram), показываем экран минимум 1.5 секунды
      browserTimer = setTimeout(() => {
        const elapsed = Date.now() - startTime
        const remaining = Math.max(0, minLoadingTime - elapsed)
        clearTimeout(timeoutTimer)
        setTimeout(() => {
          console.log('Running in browser mode (no Telegram), showing app')
          setIsLoading(false)
        }, remaining)
      }, 100)
    }

    return () => {
      clearTimeout(timeoutTimer)
      if (browserTimer) clearTimeout(browserTimer)
    }
  }, [isReady, sendDataToServer])

  const handleLoadingComplete = () => {
    setIsLoading(false)
  }

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />
  }

  return (
    <BrowserRouter
      future={{
        v7_startTransition: true,
        v7_relativeSplatPath: true,
      }}
    >
      <Layout>
        <Suspense fallback={<PageLoadingFallback />}>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/materials/:material" element={<MaterialCategories />} />
            <Route path="/c/:slug" element={<Category />} />
            <Route path="/p/:slug" element={<Product />} />
            <Route path="/cart" element={<Cart />} />
            <Route path="/checkout" element={<Checkout />} />
            <Route path="/order-success/:id" element={<OrderSuccess />} />
            <Route path="/orders" element={<Orders />} />
          </Routes>
        </Suspense>
      </Layout>
    </BrowserRouter>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
      {/* React Query Devtools - только в development */}
      {import.meta.env.DEV && <ReactQueryDevtools initialIsOpen={false} />}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3000,
          style: {
            background: 'linear-gradient(135deg, hsl(220 15% 18%) 0%, hsl(220 15% 16%) 25%, hsl(220 15% 14%) 50%, hsl(220 15% 16%) 75%, hsl(220 15% 18%) 100%)',
            color: '#fff',
            border: '1px solid rgba(139, 107, 63, 0.3)',
            borderRadius: '12px',
            padding: '12px 16px',
            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          },
          success: {
            iconTheme: {
              primary: '#10b981',
              secondary: '#fff',
            },
          },
          error: {
            iconTheme: {
              primary: '#ef4444',
              secondary: '#fff',
            },
          },
        }}
      />
    </QueryClientProvider>
  )
}

export default App

