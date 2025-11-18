import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../config/queryClient'
import axios from 'axios'

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

/**
 * Хук для prefetching данных
 * Используется для предзагрузки данных при наведении на ссылки
 */
export function usePrefetch() {
  const queryClient = useQueryClient()

  /**
   * Prefetch товара по slug
   */
  const prefetchProduct = async (slug: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.products.detail(slug),
      queryFn: async () => {
        const response = await axios.get(`${API_URL}/products/${slug}`)
        return response.data
      },
      staleTime: 5 * 60 * 1000, // 5 минут
    })
  }

  /**
   * Prefetch категории по slug
   */
  const prefetchCategory = async (slug: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.categories.detail(slug),
      queryFn: async () => {
        const response = await axios.get(`${API_URL}/categories/${slug}`)
        return response.data
      },
      staleTime: 5 * 60 * 1000, // 5 минут
    })

    // Также prefetch товары категории
    await queryClient.prefetchQuery({
      queryKey: queryKeys.products.byCategory(slug),
      queryFn: async () => {
        const response = await axios.get(`${API_URL}/categories/${slug}/products`)
        return response.data
      },
      staleTime: 5 * 60 * 1000, // 5 минут
    })
  }

  /**
   * Prefetch следующей страницы пагинации
   */
  const prefetchPage = async (
    categorySlug: string,
    page: number,
    filters?: Record<string, any>,
  ) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.products.byCategory(categorySlug, { ...filters, page }),
      queryFn: async () => {
        const response = await axios.get(`${API_URL}/categories/${categorySlug}/products`, {
          params: { ...filters, page },
        })
        return response.data
      },
      staleTime: 5 * 60 * 1000, // 5 минут
    })
  }

  return {
    prefetchProduct,
    prefetchCategory,
    prefetchPage,
  }
}



