import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, EyeOff, Search, Package2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: products, isLoading, error } = useQuery({
    queryKey: ['products-admin'],
    queryFn: async () => {
      try {
        const { data } = await api.get('/products/all');
        console.log('Products API response:', data);
        
        // Проверяем формат ответа - может быть массив или объект с data/meta
        let productsArray: any[] = [];
        
        if (Array.isArray(data)) {
          productsArray = data;
        } else if (data && Array.isArray(data.data)) {
          // Пагинированный ответ
          productsArray = data.data;
        } else if (data && Array.isArray(data.products)) {
          productsArray = data.products;
        } else {
          console.warn('Unexpected products data format:', data);
          productsArray = [];
        }
        
        console.log('Products count:', productsArray.length);
        return productsArray;
      } catch (err: any) {
        console.error('Error fetching products:', err);
        console.error('Error response:', err.response?.data);
        console.error('Error status:', err.response?.status);
        throw err;
      }
    },
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/products/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await api.put(`/products/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
    },
  });

  // Проверяем, что products является массивом перед использованием filter
  const filteredProducts = Array.isArray(products) 
    ? products.filter((product: any) =>
        product.name?.toLowerCase().includes(search.toLowerCase()) ||
        product.slug?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  // Логируем для отладки
  console.log('Products state:', {
    products,
    productsIsArray: Array.isArray(products),
    productsLength: Array.isArray(products) ? products.length : 'N/A',
    filteredProductsLength: filteredProducts.length,
    search,
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mb-4" />
          <div className="text-white/80 text-lg font-medium">Загрузка товаров...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <Card className="glass-strong border-red-500/30 max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <Package2 className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ошибка загрузки</h3>
            <p className="text-white/70 mb-4">
              {error instanceof Error && error.message.includes('401')
                ? 'Требуется авторизация для доступа к товарам'
                : 'Не удалось загрузить товары'}
            </p>
            <Button 
              onClick={() => window.location.reload()} 
              className="bg-primary hover:bg-primary/90"
            >
              Обновить страницу
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Premium Header Section */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Товары</h1>
          <p className="text-sm sm:text-base text-white/70 font-medium">
            Управление каталогом товаров
          </p>
        </div>
        <Link to="/products/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 border-0 h-11 px-6 font-semibold">
            <Plus className="mr-2 h-5 w-5" />
            Добавить товар
          </Button>
        </Link>
      </div>

      {/* Premium Search Card */}
      <Card className="glass-strong border-white/20 shadow-2xl">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <Search className="h-5 w-5 text-blue-400" />
            </div>
            <CardTitle className="text-white font-semibold text-lg">Поиск товаров</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              placeholder="Поиск по названию или slug..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-12 pr-4 py-3.5 border border-white/20 rounded-xl bg-white/8 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm [color-scheme:dark]"
            />
          </div>
          <div className="mt-3 text-sm text-white/60 font-medium">
            {search ? (
              <>
                Найдено: <span className="text-white/90 font-semibold">{filteredProducts.length}</span>
                {Array.isArray(products) && products.length > 0 && (
                  <span className="text-white/40 ml-2">
                    из {products.length} товаров
                  </span>
                )}
              </>
            ) : (
              Array.isArray(products) && (
                <>
                  Всего товаров: <span className="text-white/90 font-semibold">{products.length}</span>
                </>
              )
            )}
          </div>
        </CardContent>
      </Card>

      {/* Products Grid */}
      {!Array.isArray(products) || products.length === 0 ? (
        <Card className="glass-strong border-white/20 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Package2 className="h-10 w-10 text-white/40" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Товары не найдены</h3>
            <p className="text-white/60 mb-6">
              {Array.isArray(products) && products.length === 0
                ? 'В базе данных пока нет товаров. Добавьте первый товар, чтобы начать.'
                : 'Не удалось загрузить список товаров. Проверьте подключение к серверу и авторизацию.'}
            </p>
            <Link to="/products/new">
              <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 border-0">
                <Plus className="mr-2 h-4 w-4" />
                Добавить первый товар
              </Button>
            </Link>
          </CardContent>
        </Card>
      ) : filteredProducts.length > 0 ? (
        <div className="grid gap-4">
          {filteredProducts.map((product: any, index: number) => (
            <Card 
              key={product.id} 
              className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex-1 min-w-0 space-y-3">
                    <div className="flex items-start gap-3">
                      <div className="p-3 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex-shrink-0">
                        <Package2 className="h-6 w-6 text-blue-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap mb-2">
                          <h3 className="font-bold text-lg sm:text-xl break-words text-white">
                            {product.name}
                          </h3>
                          {!product.isActive && (
                            <span className="badge-premium bg-red-500/20 border-red-500/30 text-red-300">
                              Неактивен
                            </span>
                          )}
                          {product.isActive && (
                            <span className="badge-premium bg-green-500/20 border-green-500/30 text-green-300">
                              Активен
                            </span>
                          )}
                        </div>
                        <div className="space-y-1.5">
                          <p className="text-sm text-white/70 font-mono break-words">
                            <span className="text-white/50">Slug:</span>{' '}
                            <span className="text-white/90">{product.slug}</span>
                          </p>
                          <div className="flex items-center gap-4 flex-wrap text-sm">
                            <span className="text-white/60">
                              Категория:{' '}
                              <span className="text-white/90 font-semibold">
                                {product.category?.name || 'Нет'}
                              </span>
                            </span>
                            <span className="text-white/40">•</span>
                            {product.material && (
                              <>
                                <span className="text-white/60">
                                  Материал:{' '}
                                  <span className={`font-semibold ${
                                    product.material === 'MARBLE' 
                                      ? 'text-blue-300' 
                                      : product.material === 'GRANITE' 
                                      ? 'text-gray-300' 
                                      : 'text-white/90'
                                  }`}>
                                    {product.material === 'MARBLE' ? 'Мрамор' : product.material === 'GRANITE' ? 'Гранит' : product.material}
                                  </span>
                                </span>
                                <span className="text-white/40">•</span>
                              </>
                            )}
                            <span className="text-white/60">
                              Тип:{' '}
                              <span className="text-white/90 font-semibold">{product.productType}</span>
                            </span>
                            <span className="text-white/40">•</span>
                            <span className="text-white/60">
                              Вариантов:{' '}
                              <span className="text-white/90 font-semibold">
                                {product.variants?.length || 0}
                              </span>
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 flex-shrink-0 sm:flex-col">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleActiveMutation.mutate({
                          id: product.id,
                          isActive: !product.isActive,
                        })
                      }
                      className="text-white/80 hover:text-white hover:bg-white/15 border border-white/10 rounded-lg h-10 w-10 p-0"
                      title={product.isActive ? 'Деактивировать' : 'Активировать'}
                    >
                      {product.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Link to={`/products/${product.id}/edit`}>
                      <Button 
                        variant="ghost" 
                        size="sm" 
                        className="text-white/80 hover:text-white hover:bg-blue-500/20 border border-white/10 rounded-lg h-10 w-10 p-0"
                        title="Редактировать"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                    </Link>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить этот товар?')) {
                          deleteMutation.mutate(product.id);
                        }
                      }}
                      className="text-red-400/80 hover:text-red-400 hover:bg-red-500/20 border border-white/10 rounded-lg h-10 w-10 p-0"
                      title="Удалить"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-strong border-white/20 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Package2 className="h-10 w-10 text-white/40" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Товары не найдены</h3>
            <p className="text-white/60 mb-6">
              {search 
                ? 'Попробуйте изменить параметры поиска' 
                : 'Начните с добавления первого товара'}
            </p>
            {!search && (
              <Link to="/products/new">
                <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
                  <Plus className="mr-2 h-4 w-4" />
                  Добавить товар
                </Button>
              </Link>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
