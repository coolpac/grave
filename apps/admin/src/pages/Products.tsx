import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';
import { Link } from 'react-router-dom';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

export default function Products() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');

  const { data: products, isLoading } = useQuery({
    queryKey: ['products-admin'],
    queryFn: async () => {
      const { data } = await api.get('/products/all');
      return data;
    },
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

  const filteredProducts = products?.filter((product: any) =>
    product.name.toLowerCase().includes(search.toLowerCase()) ||
    product.slug.toLowerCase().includes(search.toLowerCase())
  ) || [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/80 text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 relative">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">Товары</h1>
          <p className="text-sm sm:text-base text-muted-foreground">Управление товарами</p>
        </div>
        <Link to="/products/new" className="w-full sm:w-auto">
          <Button className="w-full sm:w-auto">
            <Plus className="mr-2 h-4 w-4" />
            Добавить товар
          </Button>
        </Link>
      </div>

      <Card className="glass-strong border-white/20 shadow-xl">
        <CardHeader>
          <CardTitle className="text-white font-semibold">Поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            placeholder="Поиск по названию или slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-4 py-3 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 focus:border-white/30 transition-all"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredProducts.map((product: any) => (
          <Card key={product.id} className="glass-strong card-hover border-white/20 shadow-xl">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h3 className="font-semibold text-base sm:text-lg break-words text-white">{product.name}</h3>
                    {!product.isActive && (
                      <span className="text-xs text-white/60 whitespace-nowrap bg-white/10 px-2 py-1 rounded">(Неактивен)</span>
                    )}
                  </div>
                  <p className="text-xs sm:text-sm text-white/80 mt-1 break-words">
                    Slug: {product.slug}
                  </p>
                  <p className="text-xs sm:text-sm text-white/70">
                    Категория: {product.category?.name || 'Нет'} · Тип: {product.productType} · Вариантов: {product.variants?.length || 0}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: product.id,
                        isActive: !product.isActive,
                      })
                    }
                    className="flex-shrink-0"
                  >
                    {product.isActive ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Link to={`/products/${product.id}/edit`}>
                    <Button variant="ghost" size="sm" className="flex-shrink-0">
                      <Edit className="h-4 w-4" />
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Удалить товар?')) {
                        deleteMutation.mutate(product.id);
                      }
                    }}
                    className="flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4 text-destructive" />
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredProducts.length === 0 && (
        <Card className="glass-strong border-white/20">
          <CardContent className="p-8 text-center">
            <p className="text-white/70">Товары не найдены</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

