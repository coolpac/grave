import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

const CART_STORAGE_KEY = 'cart_items';
const CART_SYNC_KEY = 'cart_sync_pending';

interface CartItem {
  id: number;
  productId: number;
  variantId?: number;
  quantity: number;
  product: {
    id: number;
    slug: string;
    name: string;
    basePrice?: number;
    media?: Array<{ url: string; order: number }>;
    category?: {
      name: string;
    };
  };
  variant?: {
    id: number;
    price: number;
    name?: string;
  };
}

interface Cart {
  id: number;
  items: CartItem[];
}

interface LocalCartItem {
  productId: number;
  variantId?: number;
  quantity: number;
  productSlug: string;
  productName: string;
  productPrice?: number;
  variantPrice?: number;
  variantName?: string;
  imageUrl?: string;
  timestamp: number;
}

/**
 * Сохранение корзины в localStorage
 */
const saveCartToStorage = (items: CartItem[]): void => {
  try {
    const localItems: LocalCartItem[] = items
      .filter((item) => item.product) // Фильтруем элементы без product
      .map((item) => ({
        productId: item.productId,
        variantId: item.variantId,
        quantity: item.quantity,
        productSlug: item.product?.slug || '',
        productName: item.product?.name || '',
        productPrice: item.product?.basePrice || 0,
        variantPrice: item.variant?.price,
        variantName: item.variant?.name,
        imageUrl: item.product?.media?.[0]?.url,
        timestamp: Date.now(),
      }));
    localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(localItems));
  } catch (error) {
    console.warn('Failed to save cart to localStorage:', error);
  }
};

/**
 * Загрузка корзины из localStorage
 */
const loadCartFromStorage = (): LocalCartItem[] => {
  try {
    const stored = localStorage.getItem(CART_STORAGE_KEY);
    if (!stored) return [];
    
    const items = JSON.parse(stored) as LocalCartItem[];
    // Фильтруем устаревшие записи (старше 30 дней)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    return items.filter((item) => item.timestamp > thirtyDaysAgo);
  } catch (error) {
    console.warn('Failed to load cart from localStorage:', error);
    return [];
  }
};

/**
 * Очистка корзины из localStorage
 */
const clearCartFromStorage = (): void => {
  try {
    localStorage.removeItem(CART_STORAGE_KEY);
    localStorage.removeItem(CART_SYNC_KEY);
  } catch (error) {
    console.warn('Failed to clear cart from localStorage:', error);
  }
};

/**
 * Создание axios instance с авторизацией
 */
const createCartAxios = () => {
  const instance = axios.create({
    baseURL: API_URL,
    timeout: 10000, // Увеличено до 10 секунд
    headers: {
      'Content-Type': 'application/json',
    },
  });

  instance.interceptors.request.use(
    (config) => {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      return config;
    },
    (error) => {
      return Promise.reject(error);
    }
  );

  // Обработка ошибок ответа
  instance.interceptors.response.use(
    (response) => response,
    (error) => {
      // Логируем ошибки для отладки
      if (error.response) {
        console.error('Cart API Error:', error.response.status, error.response.data);
      } else if (error.request) {
        console.error('Cart API Network Error:', error.request);
      } else {
        console.error('Cart API Error:', error.message);
      }
      return Promise.reject(error);
    }
  );

  return instance;
};

const cartAxios = createCartAxios();

/**
 * Хук для работы с корзиной
 */
export function useCart() {
  const queryClient = useQueryClient();
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [isOffline, setIsOffline] = useState(false);

  // Проверка онлайн/офлайн статуса
  useEffect(() => {
    const handleOnline = () => setIsOffline(false);
    const handleOffline = () => setIsOffline(true);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    setIsOffline(!navigator.onLine);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Загрузка корзины с сервера
  const {
    data: serverCart,
    isLoading,
    error,
    refetch,
  } = useQuery<Cart>({
    queryKey: ['cart'],
    queryFn: async () => {
      const token = localStorage.getItem('token');
      if (!token) {
        // Если нет токена, возвращаем пустую корзину
        return { id: 0, items: [] };
      }

      try {
        const response = await cartAxios.get<Cart>('/cart');
        return response.data || { id: 0, items: [] };
      } catch (err: any) {
        if (err.response?.status === 401 || err.response?.status === 403) {
          // Не авторизован - возвращаем пустую корзину
          return { id: 0, items: [] };
        }
        throw err;
      }
    },
    retry: 1, // Быстрый fallback
    retryDelay: 1000,
    staleTime: 30 * 1000, // 30 секунд - корзина часто меняется
    gcTime: 5 * 60 * 1000, // 5 минут в памяти
    // Background refetch для корзины - обновляем в фоне каждые 30 секунд
    refetchInterval: (query) => {
      // Обновляем только если есть токен и не офлайн
      const token = localStorage.getItem('token');
      if (token && !isOffline) {
        return 30 * 1000; // 30 секунд
      }
      return false;
    },
    refetchOnWindowFocus: true, // Обновляем при фокусе для корзины
    refetchOnReconnect: true, // Обновляем при переподключении
  });

  // Загрузка локальной корзины
  const [localCart, setLocalCart] = useState<LocalCartItem[]>(() => {
    return loadCartFromStorage();
  });

  // Объединение серверной и локальной корзины
  const mergedCart = useCallback((): Cart => {
    const serverItems = serverCart?.items || [];
    
    // Если есть локальные элементы, которые не на сервере, добавляем их
    const localItemsMap = new Map(
      localCart.map((item) => [
        `${item.productId}-${item.variantId || 'default'}`,
        item,
      ]),
    );

    const serverItemsMap = new Map(
      serverItems.map((item) => [
        `${item.productId}-${item.variantId || 'default'}`,
        item,
      ]),
    );

    // Объединяем: приоритет у серверных данных, но добавляем локальные, которых нет на сервере
    const mergedItems: CartItem[] = [...serverItems];

    localItemsMap.forEach((localItem, key) => {
      if (!serverItemsMap.has(key)) {
        // Проверяем, что есть минимально необходимая информация
        if (!localItem.productSlug || !localItem.productName) {
          console.warn('Skipping local cart item with missing product info:', localItem);
          return;
        }
        
        // Определяем цену: вариант или базовая цена продукта
        const itemPrice = localItem.variantPrice && localItem.variantPrice > 0
          ? localItem.variantPrice
          : (localItem.productPrice || 0);
        
        // Пропускаем элементы без цены
        if (!itemPrice || itemPrice === 0) {
          console.warn('Skipping local cart item with invalid price:', localItem);
          return;
        }
        
        // Преобразуем локальный элемент в формат CartItem
        // Используем отрицательный ID для локальных элементов
        const localId = -(Date.now() + Math.random())
        mergedItems.push({
          id: localId,
          productId: localItem.productId,
          variantId: localItem.variantId,
          quantity: localItem.quantity,
          product: {
            id: localItem.productId,
            slug: localItem.productSlug || '',
            name: localItem.productName || '',
            basePrice: localItem.productPrice || itemPrice, // Используем itemPrice как fallback
            media: localItem.imageUrl
              ? [{ url: localItem.imageUrl, order: 0 }]
              : undefined,
          },
          variant: localItem.variantId && localItem.variantPrice && localItem.variantPrice > 0
            ? {
                id: localItem.variantId,
                price: localItem.variantPrice,
                name: localItem.variantName,
              }
            : undefined,
        });
      }
    });

    return {
      id: serverCart?.id || 0,
      items: mergedItems,
    };
  }, [serverCart, localCart]);

  // Синхронизация локальной корзины с сервером
  const syncLocalCartToServer = useMutation({
    mutationFn: async (items: LocalCartItem[]) => {
      const token = localStorage.getItem('token');
      if (!token || items.length === 0) return;

      // Добавляем все локальные элементы на сервер
      const promises = items.map((item) =>
        cartAxios.post('/cart/add', {
          productId: item.productId,
          variantId: item.variantId,
          quantity: item.quantity,
        }),
      );

      await Promise.allSettled(promises);
      // После синхронизации очищаем локальную корзину
      setLocalCart([]);
      clearCartFromStorage();
      // Обновляем серверную корзину
      await refetch();
    },
    onError: (error) => {
      console.error('Failed to sync local cart to server:', error);
    },
  });

  // Автоматическая синхронизация при авторизации
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token && localCart.length > 0 && serverCart && !isLoading) {
      // Если пользователь авторизован и есть локальные элементы, синхронизируем
      // Используем debounce для избежания множественных синхронизаций
      const syncTimeout = setTimeout(() => {
        if (localCart.length > 0) {
          syncLocalCartToServer.mutate([...localCart]);
        }
      }, 1000);

      return () => clearTimeout(syncTimeout);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [localCart.length, serverCart?.id, isLoading]);

  // Обновление количества товара
  const updateQuantityMutation = useMutation({
    mutationFn: async ({
      itemId,
      quantity,
    }: {
      itemId: number;
      quantity: number;
    }) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      await cartAxios.patch(`/cart/items/${itemId}`, { quantity });
      return { itemId, quantity };
    },
    onMutate: async ({ itemId, quantity }) => {
      // Оптимистичное обновление
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);

      queryClient.setQueryData<Cart>(['cart'], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items
            .map((item) =>
              item.id === itemId ? { ...item, quantity } : item,
            )
            .filter((item) => item.quantity > 0),
        };
      });

      return { previousCart };
    },
    onError: (err, variables, context) => {
      // Откат при ошибке
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Удаление товара
  const removeItemMutation = useMutation({
    mutationFn: async (itemId: number) => {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Not authenticated');
      }

      await cartAxios.delete(`/cart/items/${itemId}`);
      return itemId;
    },
    onMutate: async (itemId) => {
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      const previousCart = queryClient.getQueryData<Cart>(['cart']);

      queryClient.setQueryData<Cart>(['cart'], (old) => {
        if (!old) return old;
        return {
          ...old,
          items: old.items.filter((item) => item.id !== itemId),
        };
      });

      return { previousCart };
    },
    onError: (err, variables, context) => {
      if (context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Добавление товара в корзину
  const addToCartMutation = useMutation({
    mutationFn: async ({
      productId,
      productSlug,
      productName,
      productPrice,
      variantId,
      variantPrice,
      variantName,
      imageUrl,
      quantity = 1,
    }: {
      productId: number;
      productSlug?: string;
      productName?: string;
      productPrice?: number;
      variantId?: number;
      variantPrice?: number;
      variantName?: string;
      imageUrl?: string;
      quantity?: number;
    }) => {
      const token = localStorage.getItem('token');
      
      if (!token) {
        // Если нет токена, сохраняем локально
        return { local: true, productId, variantId, quantity };
      }

      try {
        await cartAxios.post('/cart/add', {
          productId,
          variantId,
          quantity,
        });
        return { local: false };
      } catch (error: any) {
        // Если ошибка сети, сохраняем локально
        if (!error.response || error.code === 'ERR_NETWORK') {
          return { local: true, productId, variantId, quantity };
        }
        throw error;
      }
    },
    // Optimistic update для добавления в корзину
    onMutate: async (variables) => {
      // Отменяем текущие запросы корзины
      await queryClient.cancelQueries({ queryKey: ['cart'] });
      
      // Сохраняем предыдущее состояние
      const previousCart = queryClient.getQueryData<Cart>(['cart']);
      
      // Оптимистично обновляем корзину только для авторизованных пользователей
      const token = localStorage.getItem('token');
      if (token) {
        queryClient.setQueryData<Cart>(['cart'], (old) => {
          if (!old) {
            // Если корзины нет, создаем новую
            const newItem: CartItem = {
              id: -(Date.now() + Math.random()), // Временный отрицательный ID
              productId: variables.productId,
              variantId: variables.variantId,
              quantity: variables.quantity || 1,
              product: {
                id: variables.productId,
                slug: variables.productSlug || '',
                name: variables.productName || '',
                basePrice: variables.productPrice,
                media: variables.imageUrl ? [{ url: variables.imageUrl, order: 0 }] : undefined,
              },
              variant: variables.variantId && variables.variantPrice
                ? {
                    id: variables.variantId,
                    price: variables.variantPrice,
                    name: variables.variantName,
                  }
                : undefined,
            };
            return { id: 0, items: [newItem] };
          }
          
          // Проверяем, есть ли уже такой товар
          const existingItemIndex = old.items.findIndex(
            (item) =>
              item.productId === variables.productId &&
              (item.variantId || 'default') === (variables.variantId || 'default')
          );
          
          if (existingItemIndex >= 0) {
            // Увеличиваем количество существующего товара
            const updatedItems = old.items.map((item, index) =>
              index === existingItemIndex
                ? { ...item, quantity: item.quantity + (variables.quantity || 1) }
                : item
            );
            return { ...old, items: updatedItems };
          } else {
            // Добавляем новый товар
            const newItem: CartItem = {
              id: -(Date.now() + Math.random()), // Временный отрицательный ID
              productId: variables.productId,
              variantId: variables.variantId,
              quantity: variables.quantity || 1,
              product: {
                id: variables.productId,
                slug: variables.productSlug || '',
                name: variables.productName || '',
                basePrice: variables.productPrice,
                media: variables.imageUrl ? [{ url: variables.imageUrl, order: 0 }] : undefined,
              },
              variant: variables.variantId && variables.variantPrice
                ? {
                    id: variables.variantId,
                    price: variables.variantPrice,
                    name: variables.variantName,
                  }
                : undefined,
            };
            return { ...old, items: [...old.items, newItem] };
          }
        });
      }
      
      return { previousCart };
    },
    onError: (err, variables, context) => {
      // Откат при ошибке (только для авторизованных пользователей)
      const token = localStorage.getItem('token');
      if (token && context?.previousCart) {
        queryClient.setQueryData(['cart'], context.previousCart);
      }
    },
    onSuccess: async (data, variables) => {
      if (data.local) {
        // Сохраняем локально
        const newItem: LocalCartItem = {
          productId: variables.productId,
          variantId: variables.variantId,
          quantity: variables.quantity || 1,
          productSlug: variables.productSlug || '',
          productName: variables.productName || '',
          productPrice: variables.productPrice,
          variantPrice: variables.variantPrice,
          variantName: variables.variantName,
          imageUrl: variables.imageUrl,
          timestamp: Date.now(),
        };
        setLocalCart((prev) => {
          // Проверяем, нет ли уже такого товара
          const existingIndex = prev.findIndex(
            (item) =>
              item.productId === newItem.productId &&
              (item.variantId || 'default') === (newItem.variantId || 'default'),
          );
          
          let updated: LocalCartItem[];
          if (existingIndex >= 0) {
            // Увеличиваем количество существующего товара
            updated = prev.map((item, index) =>
              index === existingIndex
                ? { ...item, quantity: item.quantity + (newItem.quantity || 1) }
                : item,
            );
            // Откладываем toast, чтобы избежать обновления состояния во время рендера
            setTimeout(() => {
              toast.success(`Количество "${variables.productName}" увеличено`, {
                icon: '➕',
                duration: 2000,
              });
            }, 0);
          } else {
            // Добавляем новый товар
            updated = [...prev, newItem];
            // Откладываем toast, чтобы избежать обновления состояния во время рендера
            setTimeout(() => {
              toast.success(`${variables.productName || 'Товар'} добавлен в корзину!`, {
                icon: '🛒',
              });
            }, 0);
          }
          
          saveCartToStorage(updated as any);
          return updated;
        });
      } else {
        // Обновляем серверную корзину
        await refetch();
        // Откладываем toast, чтобы избежать обновления состояния во время рендера
        setTimeout(() => {
          toast.success(`${variables.productName || 'Товар'} добавлен в корзину!`, {
            icon: '🛒',
          });
        }, 0);
      }
    },
    onError: (error: any) => {
      console.error('Failed to add to cart:', error);
      // Откладываем toast, чтобы избежать обновления состояния во время рендера
      setTimeout(() => {
        toast.error('Не удалось добавить товар в корзину. Попробуйте позже.', {
          icon: '❌',
        });
      }, 0);
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['cart'] });
    },
  });

  // Обновление изображений для локальных элементов корзины
  useEffect(() => {
    const token = localStorage.getItem('token');
    // Обновляем только если пользователь не авторизован и есть локальные элементы
    if (token || localCart.length === 0 || isOffline) return;

    // Обновляем изображения для локальных элементов, запрашивая актуальные данные товара
    const updateLocalItemImages = async () => {
      const updatedItems = await Promise.all(
        localCart.map(async (item) => {
          try {
            // Запрашиваем актуальные данные товара
            const response = await axios.get(`${API_URL}/products/${item.productId}`, {
              timeout: 3000,
            });
            const product = response.data;
            
            // Обновляем imageUrl, если он изменился
            const newImageUrl = product.media?.[0]?.url;
            if (newImageUrl && newImageUrl !== item.imageUrl) {
              return { ...item, imageUrl: newImageUrl };
            }
          } catch (error) {
            // Игнорируем ошибки при обновлении изображений
            console.debug('Failed to update image for product:', item.productId);
          }
          return item;
        })
      );

      // Обновляем локальную корзину только если были изменения
      const hasChanges = updatedItems.some((item, index) => 
        item.imageUrl !== localCart[index]?.imageUrl
      );
      
      if (hasChanges) {
        setLocalCart(updatedItems);
        saveCartToStorage(updatedItems as any);
      }
    };

    // Обновляем изображения раз в 5 минут для локальных элементов
    const updateInterval = setInterval(updateLocalItemImages, 5 * 60 * 1000);
    
    // Первое обновление через 30 секунд после загрузки
    const initialTimeout = setTimeout(updateLocalItemImages, 30000);

    return () => {
      clearInterval(updateInterval);
      clearTimeout(initialTimeout);
    };
  }, [localCart.length, isOffline]);

  // Сохранение корзины в localStorage при изменении
  useEffect(() => {
    if (syncTimeoutRef.current) {
      clearTimeout(syncTimeoutRef.current);
    }

    syncTimeoutRef.current = setTimeout(() => {
      try {
        const cart = mergedCart();
        if (cart.items.length > 0) {
          saveCartToStorage(cart.items);
        } else {
          clearCartFromStorage();
        }
      } catch (error) {
        console.error('Error saving cart to localStorage:', error);
      }
    }, 500); // Debounce 500ms

    return () => {
      if (syncTimeoutRef.current) {
        clearTimeout(syncTimeoutRef.current);
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serverCart?.items?.length, localCart.length]); // Используем конкретные значения вместо объектов

  const cart = mergedCart();
  
  // Мемоизированное вычисление общей суммы
  const total = useMemo(() => {
    return cart.items.reduce((sum, item) => {
      // Правильно определяем цену: сначала вариант, потом базовая цена продукта
      const price = item.variant?.price ?? item.product?.basePrice ?? 0;
      // Пропускаем элементы с невалидной ценой
      if (!price || price === 0 || isNaN(price)) {
        return sum;
      }
      return sum + price * item.quantity;
    }, 0);
  }, [cart.items]);
  
  // Мемоизированное вычисление количества товаров
  const itemsCount = useMemo(() => {
    return cart.items.reduce((sum, item) => sum + item.quantity, 0);
  }, [cart.items]);

  return {
    cart,
    items: cart.items,
    total,
    itemsCount,
    isLoading,
    isOffline,
    error,
    updateQuantity: (itemId: number, delta: number) => {
      const item = cart.items.find((i) => i.id === itemId);
      if (!item) return;

      const newQuantity = Math.max(1, item.quantity + delta);
      const token = localStorage.getItem('token');

      if (!token || isOffline) {
        // Обновляем локально
        if (item.id < 0) {
          // Это локальный элемент
          setLocalCart((prev) => {
            const updated = prev.map((localItem) =>
              `${localItem.productId}-${localItem.variantId || 'default'}` ===
              `${item.productId}-${item.variantId || 'default'}`
                ? { ...localItem, quantity: newQuantity }
                : localItem,
            ).filter((localItem) => localItem.quantity > 0);
            saveCartToStorage(updated as any);
            return updated;
          });
        }
        return;
      }

      // Для уменьшения количества используем updateQuantityMutation
      if (delta < 0) {
        updateQuantityMutation.mutate({ itemId, quantity: newQuantity });
      } else {
        // Для увеличения количества используем addToCart с теми же характеристиками
        // Это гарантирует правильную работу с вариантами
        addToCartMutation.mutate({
          productId: item.productId,
          variantId: item.variantId,
          quantity: 1, // Добавляем 1 единицу
          productSlug: item.product.slug,
          productName: item.product.name,
          productPrice: item.product.basePrice,
          variantPrice: item.variant?.price,
          variantName: item.variant?.name,
          imageUrl: item.product.media?.[0]?.url,
        });
      }
    },
    removeItem: (itemId: number) => {
      const token = localStorage.getItem('token');

      if (!token || isOffline) {
        // Удаляем локально
        if (itemId < 0) {
          setLocalCart((prev) => {
            const updated = prev.filter(
              (localItem) =>
                `${localItem.productId}-${localItem.variantId || 'default'}` !==
                `${cart.items.find((i) => i.id === itemId)?.productId}-${cart.items.find((i) => i.id === itemId)?.variantId || 'default'}`,
            );
            saveCartToStorage(updated as any);
            return updated;
          });
        }
        return;
      }

      removeItemMutation.mutate(itemId);
    },
    addToCart: (
      productId: number,
      options?: {
        variantId?: number;
        quantity?: number;
        productSlug?: string;
        productName?: string;
        productPrice?: number;
        variantPrice?: number;
        variantName?: string;
        imageUrl?: string;
      },
    ) => {
      addToCartMutation.mutate({
        productId,
        variantId: options?.variantId,
        quantity: options?.quantity || 1,
        productSlug: options?.productSlug,
        productName: options?.productName,
        productPrice: options?.productPrice,
        variantPrice: options?.variantPrice,
        variantName: options?.variantName,
        imageUrl: options?.imageUrl,
      });
    },
    clearCart: async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          await cartAxios.delete('/cart/clear');
        } catch (error) {
          console.error('Failed to clear cart:', error);
        }
      }
      setLocalCart([]);
      clearCartFromStorage();
      queryClient.setQueryData(['cart'], { id: 0, items: [] });
    },
    refetch,
  };
}

