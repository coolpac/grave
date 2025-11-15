import { useState, useEffect } from 'react'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import Layout from './components/Layout'
import LoadingScreen from './components/LoadingScreen'
import { useTelegram } from './hooks/useTelegram'
import Home from './pages/Home'
import Category from './pages/Category'
import MaterialCategories from './pages/MaterialCategories'
import Product from './pages/Product'
import Cart from './pages/Cart'
import Checkout from './pages/Checkout'
import OrderSuccess from './pages/OrderSuccess'
import Orders from './pages/Orders'

const queryClient = new QueryClient()

function AppContent() {
  const [isLoading, setIsLoading] = useState(true)
  const { isReady, sendDataToServer } = useTelegram()

  useEffect(() => {
    // Таймаут для гарантированного завершения загрузки (особенно для браузера без Telegram)
    const timeoutTimer = setTimeout(() => {
      console.log('Loading timeout reached, showing app')
      setIsLoading(false)
    }, 2000) // 2 секунды для браузера

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
          // Завершаем загрузку после валидации (или ошибки)
          clearTimeout(timeoutTimer)
          setIsLoading(false)
        })
    } else {
      // Если Telegram не готов (браузер без Telegram), завершаем загрузку быстрее
      const browserTimer = setTimeout(() => {
        console.log('Running in browser mode (no Telegram), showing app')
        clearTimeout(timeoutTimer)
        setIsLoading(false)
      }, 500)
      
      return () => {
        clearTimeout(timeoutTimer)
        clearTimeout(browserTimer)
      }
    }

    return () => {
      clearTimeout(timeoutTimer)
    }
  }, [isReady, sendDataToServer])

  const handleLoadingComplete = () => {
    setIsLoading(false)
  }

  if (isLoading) {
    return <LoadingScreen onComplete={handleLoadingComplete} />
  }

  return (
    <BrowserRouter>
      <Layout>
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
      </Layout>
    </BrowserRouter>
  )
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AppContent />
    </QueryClientProvider>
  )
}

export default App

