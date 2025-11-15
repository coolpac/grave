import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, ShoppingCart } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

export default function AbandonedCarts() {
  const queryClient = useQueryClient();

  const { data: abandonedCarts, isLoading } = useQuery({
    queryKey: ['abandoned-carts'],
    queryFn: async () => {
      const { data } = await api.get('/admin/abandoned-carts');
      return data;
    },
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/abandoned-carts/${id}/send-reminder`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abandoned-carts'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  const carts = abandonedCarts?.carts || [];
  const stats = abandonedCarts?.stats || {};

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold mb-2">Брошенные корзины</h1>
        <p className="text-sm sm:text-base text-muted-foreground">Управление неоформленными заказами</p>
      </div>

      {/* Статистика */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Всего брошенных</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalCount || 0}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Общая стоимость</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(stats.totalValue || 0)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium">Восстановлено</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recoveredCount || 0}</div>
          </CardContent>
        </Card>
      </div>

      {/* Список корзин */}
      <div className="grid gap-4">
        {carts.map((cart: any) => (
          <Card key={cart.id}>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <CardTitle className="text-base sm:text-lg">Корзина #{cart.id}</CardTitle>
                {cart.recovered && (
                  <span className="text-xs px-2 py-1 rounded bg-green-100 text-green-800 self-start sm:self-auto">
                    Восстановлена
                  </span>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                <div className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">Товаров:</span> {cart.itemsCount}
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">Сумма:</span>{' '}
                  {new Intl.NumberFormat('ru-RU', {
                    style: 'currency',
                    currency: 'RUB',
                    minimumFractionDigits: 0,
                  }).format(cart.totalAmount)}
                </div>
                <div className="text-xs sm:text-sm">
                  <span className="text-muted-foreground">Создана:</span>{' '}
                  {format(new Date(cart.createdAt), 'dd.MM.yyyy HH:mm')}
                </div>
                {cart.lastReminderAt && (
                  <div className="text-xs sm:text-sm">
                    <span className="text-muted-foreground">Последнее напоминание:</span>{' '}
                    {format(new Date(cart.lastReminderAt), 'dd.MM.yyyy HH:mm')}
                  </div>
                )}
              </div>
              {!cart.recovered && (
                <Button
                  onClick={() => sendReminderMutation.mutate(cart.id)}
                  disabled={sendReminderMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  <Mail className="mr-2 h-4 w-4" />
                  Отправить напоминание
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {carts.length === 0 && (
        <Card>
          <CardContent className="p-8 text-center">
            <ShoppingCart className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground">Брошенных корзин нет</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

