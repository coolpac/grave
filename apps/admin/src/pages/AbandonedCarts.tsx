import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Mail, ShoppingCart, TrendingUp, DollarSign, Clock, CheckCircle2, Settings, Power } from 'lucide-react';
import { format } from 'date-fns';
import { useState } from 'react';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

export default function AbandonedCarts() {
  const queryClient = useQueryClient();
  const [showSettings, setShowSettings] = useState(false);

  const { data: abandonedCarts, isLoading, error } = useQuery({
    queryKey: ['abandoned-carts'],
    queryFn: async () => {
      const { data } = await api.get('/admin/abandoned-carts');
      return data;
    },
    retry: 1,
  });

  const { data: settings, isLoading: isLoadingSettings } = useQuery({
    queryKey: ['abandoned-carts-settings'],
    queryFn: async () => {
      const { data } = await api.get('/admin/abandoned-carts/settings');
      return data;
    },
    retry: 1,
  });

  const sendReminderMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.post(`/admin/abandoned-carts/${id}/send-reminder`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abandoned-carts'] });
    },
  });

  const updateSettingsMutation = useMutation({
    mutationFn: async (updateData: {
      autoRemindersEnabled?: boolean;
      reminderIntervalHours?: number;
      maxReminders?: number;
    }) => {
      const { data } = await api.post('/admin/abandoned-carts/settings', updateData);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['abandoned-carts-settings'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mb-4" />
          <div className="text-white/80 text-lg font-medium">Загрузка корзин...</div>
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
              <ShoppingCart className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ошибка загрузки</h3>
            <p className="text-white/70">Не удалось загрузить брошенные корзины</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const carts = abandonedCarts?.carts || [];
  const stats = abandonedCarts?.stats || abandonedCarts?.summary || {};

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Premium Header */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Брошенные корзины</h1>
          <Button
            onClick={() => setShowSettings(!showSettings)}
            className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg shadow-purple-500/25 border-0"
          >
            <Settings className="mr-2 h-4 w-4" />
            Настройки
          </Button>
        </div>
        <p className="text-sm sm:text-base text-white/70 font-medium">
          Управление неоформленными заказами
        </p>
      </div>

      {/* Settings Card */}
      {showSettings && (
        <Card className="glass-strong border-white/20 shadow-xl animate-fade-in">
          <CardHeader>
            <CardTitle className="text-xl font-bold text-white flex items-center gap-2">
              <Settings className="h-5 w-5" />
              Настройки автоматических напоминаний
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {isLoadingSettings ? (
              <div className="text-white/70">Загрузка настроек...</div>
            ) : (
              <>
                <div className="flex items-center justify-between p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <div className="text-white font-semibold mb-1">Автоматические напоминания</div>
                    <div className="text-white/60 text-sm">
                      Автоматически отправлять напоминания клиентам о брошенных корзинах
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      updateSettingsMutation.mutate({
                        autoRemindersEnabled: !settings?.autoRemindersEnabled,
                      });
                    }}
                    className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                      settings?.autoRemindersEnabled ? 'bg-green-500' : 'bg-gray-600'
                    }`}
                  >
                    <span
                      className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                        settings?.autoRemindersEnabled ? 'translate-x-6' : 'translate-x-1'
                      }`}
                    />
                  </button>
                </div>

                {settings?.autoRemindersEnabled && (
                  <div className="space-y-4 p-4 rounded-xl bg-white/5 border border-white/10">
                    <div>
                      <label className="block text-white font-semibold mb-2">
                        Интервал между напоминаниями (часы)
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="168"
                        value={settings?.reminderIntervalHours || 24}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            reminderIntervalHours: parseInt(e.target.value) || 24,
                          });
                        }}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div>
                      <label className="block text-white font-semibold mb-2">
                        Максимальное количество напоминаний
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="10"
                        value={settings?.maxReminders || 3}
                        onChange={(e) => {
                          updateSettingsMutation.mutate({
                            maxReminders: parseInt(e.target.value) || 3,
                          });
                        }}
                        className="w-full px-4 py-2 rounded-lg bg-white/10 border border-white/20 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-purple-500"
                      />
                    </div>
                    <div className="text-sm text-white/60">
                      💡 Автоматические напоминания работают через Python бот <code className="bg-white/10 px-2 py-1 rounded">abandoned_cart_bot.py</code>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}

      {/* Premium Stats Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: '0ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Всего брошенных</CardTitle>
            <div className="p-2 rounded-lg bg-red-500/20 border border-red-500/30">
              <ShoppingCart className="h-5 w-5 text-red-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.totalCount || 0}</div>
            <p className="text-xs text-white/60 mt-1">корзин</p>
          </CardContent>
        </Card>
        
        <Card className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: '50ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Общая стоимость</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <DollarSign className="h-5 w-5 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(stats.totalValue || 0)}
            </div>
            <p className="text-xs text-white/60 mt-1">потенциальная выручка</p>
          </CardContent>
        </Card>
        
        <Card className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Восстановлено</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
              <TrendingUp className="h-5 w-5 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">{stats.recoveredCount || 0}</div>
            <p className="text-xs text-white/60 mt-1">корзин восстановлено</p>
          </CardContent>
        </Card>

        {/* Auto Reminders Status */}
        <Card className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Авто-напоминания</CardTitle>
            <div className={`p-2 rounded-lg border ${settings?.autoRemindersEnabled ? 'bg-green-500/20 border-green-500/30' : 'bg-gray-500/20 border-gray-500/30'}`}>
              <Power className={`h-5 w-5 ${settings?.autoRemindersEnabled ? 'text-green-400' : 'text-gray-400'}`} />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white">
              {settings?.autoRemindersEnabled ? 'Вкл' : 'Выкл'}
            </div>
            <p className="text-xs text-white/60 mt-1">
              {settings?.autoRemindersEnabled 
                ? `каждые ${settings.reminderIntervalHours}ч, макс ${settings.maxReminders}`
                : 'отключены'}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Carts List */}
      {carts.length > 0 ? (
        <div className="grid gap-4">
          {carts.map((cart: any, index: number) => (
            <Card 
              key={cart.id} 
              className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="pb-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="p-2.5 rounded-lg bg-blue-500/20 border border-blue-500/30">
                      <ShoppingCart className="h-5 w-5 text-blue-400" />
                    </div>
                    <div>
                      <CardTitle className="text-lg font-bold text-white">Корзина #{cart.id}</CardTitle>
                      <p className="text-xs text-white/60 mt-0.5">
                        {format(new Date(cart.createdAt), 'dd.MM.yyyy HH:mm')}
                      </p>
                    </div>
                  </div>
                  {cart.recovered && (
                    <span className="badge-premium bg-green-500/20 border-green-500/30 text-green-300 inline-flex items-center gap-1.5">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Восстановлена
                    </span>
                  )}
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-xl bg-white/5 border border-white/10">
                  <div>
                    <div className="text-xs text-white/60 mb-1">Товаров</div>
                    <div className="text-lg font-bold text-white">{cart.itemsCount}</div>
                  </div>
                  <div>
                    <div className="text-xs text-white/60 mb-1">Сумма</div>
                    <div className="text-lg font-bold text-white">
                      {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      }).format(cart.totalAmount)}
                    </div>
                  </div>
                  <div>
                    <div className="text-xs text-white/60 mb-1">Напоминаний</div>
                    <div className="text-lg font-bold text-white">{cart.reminderSent || 0}</div>
                  </div>
                  {cart.lastReminderAt && (
                    <div>
                      <div className="text-xs text-white/60 mb-1">Последнее</div>
                      <div className="text-sm font-semibold text-white/90">
                        {format(new Date(cart.lastReminderAt), 'dd.MM HH:mm')}
                      </div>
                    </div>
                  )}
                </div>
                
                {cart.customerName && (
                  <div className="text-sm text-white/80">
                    <span className="text-white/60">Клиент:</span> {cart.customerName}
                  </div>
                )}
                
                {!cart.recovered && (
                  <Button
                    onClick={() => sendReminderMutation.mutate(cart.id)}
                    disabled={sendReminderMutation.isPending}
                    className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 border-0 font-semibold"
                  >
                    {sendReminderMutation.isPending ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                        Отправка...
                      </>
                    ) : (
                      <>
                        <Mail className="mr-2 h-4 w-4" />
                        Отправить напоминание
                      </>
                    )}
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <Card className="glass-strong border-white/20 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <ShoppingCart className="h-10 w-10 text-white/40" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Брошенных корзин нет</h3>
            <p className="text-white/60">Все корзины успешно оформлены</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
