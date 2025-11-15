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
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold mb-2">Товары</h1>
          <p className="text-muted-foreground">Управление товарами</p>
        </div>
        <Link to="/products/new">
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Добавить товар
          </Button>
        </Link>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Поиск</CardTitle>
        </CardHeader>
        <CardContent>
          <input
            type="text"
            placeholder="Поиск по названию или slug..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 border rounded-md"
          />
        </CardContent>
      </Card>

      <div className="grid gap-4">
        {filteredProducts.map((product: any) => (
          <Card key={product.id}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-semibold">{product.name}</h3>
                    {!product.isActive && (
                      <span className="text-xs text-muted-foreground">(Неактивен)</span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Slug: {product.slug} · Категория: {product.category?.name || 'Нет'}
                  </p>
                  <p className="text-sm text-muted-foreground">
                    Тип: {product.productType} · Вариантов: {product.variants?.length || 0}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() =>
                      toggleActiveMutation.mutate({
                        id: product.id,
                        isActive: !product.isActive,
                      })
                    }
                  >
                    {product.isActive ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </Button>
                  <Link to={`/products/${product.id}/edit`}>
                    <Button variant="ghost" size="sm">
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
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Товары не найдены</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

