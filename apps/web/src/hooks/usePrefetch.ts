import { useQueryClient } from '@tanstack/react-query'
import { queryKeys } from '../config/queryClient'
import axios from 'axios'

import { API_URL } from '../config/api'

/**
 * Хук для prefetching данных
 * Используется для предзагрузки данных при наведении на ссылки
 */
export function usePrefetch() {
  const queryClient = useQueryClient()
  const fetchCategory = async (slug: string) => {
    const { data } = await axios.get(`${API_URL}/catalog/categories/${slug}`)
    return data
  }

  const ensureCategory = async (slug: string) => {
    const cached = queryClient.getQueryData<any>(queryKeys.categories.detail(slug))
    if (cached?.id) {
      return cached
    }
    const data = await fetchCategory(slug)
    queryClient.setQueryData(queryKeys.categories.detail(slug), data)
    return data
  }

  /**
   * Prefetch товара по slug
   */
  const prefetchProduct = async (slug: string) => {
    await queryClient.prefetchQuery({
      queryKey: queryKeys.products.detail(slug),
      queryFn: async () => {
        const response = await axios.get(`${API_URL}/catalog/products/${slug}`)
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
      queryFn: () => fetchCategory(slug),
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
    const category = await ensureCategory(categorySlug)
    if (!category?.id) {
      return
    }

    await queryClient.prefetchQuery({
      queryKey: queryKeys.products.byCategory(categorySlug, { ...filters, page }),
      queryFn: async () => {
        const limit = filters?.limit ?? 12
        const response = await axios.get(`${API_URL}/catalog/products`, {
          params: {
            categoryId: category.id,
            activeOnly: 'true',
            page,
            limit,
            ...filters,
          },
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







