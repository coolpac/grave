import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, ShoppingCart, DollarSign, Package, TrendingUp, Sparkles, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { format, isValid, parseISO } from 'date-fns';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];

// Валидация и нормализация данных для графиков
const normalizeSalesData = (data: any[]): any[] => {
  if (!Array.isArray(data)) return [];
  return data
    .filter(item => item && item.date)
    .map(item => {
      let date;
      if (typeof item.date === 'string') {
        date = parseISO(item.date);
        if (!isValid(date)) {
          date = new Date(item.date);
        }
      } else {
        date = new Date(item.date);
      }
      
      return {
        date: isValid(date) ? date.toISOString() : new Date().toISOString(),
        revenue: Number(item.revenue) || 0,
        orders: Number(item.orders) || 0,
      };
    })
    .filter(item => isValid(parseISO(item.date)));
};

const normalizeOrdersByStatus = (data: any[]): any[] => {
  if (!Array.isArray(data)) return [];
  return data
    .filter(item => item && item.status)
    .map(item => ({
      status: String(item.status),
      count: Number(item.count) || 0,
    }));
};

const normalizeRevenueByCategory = (data: any[]): any[] => {
  if (!Array.isArray(data)) return [];
  return data
    .filter(item => item && item.name)
    .map(item => ({
      name: String(item.name),
      revenue: Number(item.revenue) || 0,
    }));
};

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading, error: metricsError } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/metrics');
      return data;
    },
    retry: 1,
  });

  const { data: analytics, isLoading: analyticsLoading, error: analyticsError } = useQuery({
    queryKey: ['admin-analytics', 'week'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics', {
        params: { period: 'week' },
      });
      return data;
    },
    retry: 1,
  });

  if (metricsLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mb-4" />
          <div className="text-white/80 text-lg font-medium">Загрузка аналитики...</div>
        </div>
      </div>
    );
  }

  if (metricsError || analyticsError) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <Card className="glass-strong border-red-500/30 max-w-md">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ошибка загрузки</h3>
            <p className="text-white/70 mb-4">
              {metricsError || analyticsError ? 'Не удалось загрузить данные дашборда' : 'Ошибка загрузки аналитики'}
            </p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
            >
              Обновить страницу
            </button>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Нормализация данных с fallback значениями
  const metricsData = metrics?.overview || metrics || {};
  const salesData = normalizeSalesData(analytics?.salesTrend || []);
  const ordersByStatus = normalizeOrdersByStatus(analytics?.ordersByStatus || []);
  const revenueByCategory = normalizeRevenueByCategory(analytics?.revenueByCategory || []);

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Premium Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-2">
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
            <Sparkles className="h-6 w-6 text-blue-400" />
          </div>
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Дашборд</h1>
            <p className="text-sm sm:text-base text-white/70 font-medium mt-1">
              Обзор продаж и аналитика
            </p>
          </div>
        </div>
      </div>

      {/* Premium Metrics Cards */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: '0ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Всего пользователей</CardTitle>
            <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
              <Users className="h-5 w-5 text-blue-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {metricsData?.users?.total || metricsData?.totalUsers || 0}
            </div>
            <p className="text-xs text-white/70 font-medium">
              <span className="text-green-400">+{metricsData?.dailyUsers || 0}</span> за сегодня
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: '50ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Всего заказов</CardTitle>
            <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
              <ShoppingCart className="h-5 w-5 text-green-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {metricsData?.orders?.total || metricsData?.totalOrders || 0}
            </div>
            <p className="text-xs text-white/70 font-medium">
              <span className="text-yellow-400">
                {metricsData?.orders?.pending || metricsData?.pendingOrders || 0}
              </span> ожидают обработки
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: '100ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Выручка</CardTitle>
            <div className="p-2 rounded-lg bg-yellow-500/20 border border-yellow-500/30">
              <DollarSign className="h-5 w-5 text-yellow-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(metricsData?.revenue?.total || metricsData?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-white/70 font-medium">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(metricsData?.revenue?.today || metricsData?.dailyRevenue || 0)} за сегодня
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: '150ms' }}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
            <CardTitle className="text-sm font-semibold text-white/90">Товаров</CardTitle>
            <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
              <Package className="h-5 w-5 text-purple-400" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {metricsData?.products?.active || metricsData?.activeProducts || 0}
            </div>
            <p className="text-xs text-white/70 font-medium">
              <span className="text-red-400">
                {metricsData?.abandonedCarts?.count || metricsData?.abandonedCartsCount || 0}
              </span> брошенных корзин
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Premium Charts */}
      <div className="grid gap-6 grid-cols-1 lg:grid-cols-2">
        {/* Sales Trend Chart */}
        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white text-lg font-semibold">Динамика продаж</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {salesData.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <LineChart data={salesData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="date"
                    tickFormatter={(value) => {
                      try {
                        const date = parseISO(value);
                        return isValid(date) ? format(date, 'dd.MM') : '';
                      } catch {
                        return '';
                      }
                    }}
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '12px',
                    }}
                    labelFormatter={(value) => {
                      try {
                        const date = parseISO(value);
                        return isValid(date) ? format(date, 'dd.MM.yyyy') : value;
                      } catch {
                        return value;
                      }
                    }}
                    formatter={(value: any) => [
                      new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      }).format(Number(value) || 0),
                      'Выручка',
                    ]}
                  />
                  <Line
                    type="monotone"
                    dataKey="revenue"
                    stroke="#3b82f6"
                    strokeWidth={3}
                    name="Выручка"
                    dot={{ fill: '#3b82f6', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                  <Line
                    type="monotone"
                    dataKey="orders"
                    stroke="#10b981"
                    strokeWidth={3}
                    name="Заказы"
                    dot={{ fill: '#10b981', r: 5 }}
                    activeDot={{ r: 7 }}
                  />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-white/60">
                Нет данных для отображения
              </div>
            )}
          </CardContent>
        </Card>

        {/* Orders by Status Chart */}
        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5 text-green-400" />
              <CardTitle className="text-white text-lg font-semibold">Заказы по статусам</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            {ordersByStatus.length > 0 ? (
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={ordersByStatus}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                  <XAxis
                    dataKey="status"
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <YAxis
                    stroke="rgba(255,255,255,0.5)"
                    tick={{ fill: 'rgba(255,255,255,0.7)', fontSize: 12 }}
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: 'rgba(0, 0, 0, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '12px',
                      color: '#fff',
                      padding: '12px',
                    }}
                  />
                  <Bar dataKey="count" fill="#3b82f6" radius={[12, 12, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-[280px] flex items-center justify-center text-white/60">
                Нет данных для отображения
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Revenue by Category */}
      {revenueByCategory.length > 0 && (
        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-yellow-400" />
              <CardTitle className="text-white text-lg font-semibold">Выручка по категориям</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={revenueByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${((percent ?? 0) * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {revenueByCategory.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.95)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '12px',
                    color: '#fff',
                    padding: '12px',
                  }}
                  formatter={(value: any) => [
                    new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(Number(value) || 0),
                    'Выручка',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Top Products */}
      {metrics?.topProducts && Array.isArray(metrics.topProducts) && metrics.topProducts.length > 0 && (
        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader className="pb-4">
            <div className="flex items-center gap-2">
              <Package className="h-5 w-5 text-purple-400" />
              <CardTitle className="text-white text-lg font-semibold">Топ товары</CardTitle>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {metrics.topProducts.slice(0, 5).map((product: any, index: number) => (
                <div
                  key={product.id || index}
                  className="flex items-center justify-between p-4 border border-white/15 rounded-xl glass hover:bg-white/10 transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10 flex items-center justify-center font-bold text-white/90">
                      #{index + 1}
                    </div>
                    <div>
                      <span className="font-semibold text-white block">{product.name || 'Без названия'}</span>
                      <span className="text-xs text-white/60">{product.quantity || 0} шт. продано</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-lg font-bold text-white">
                      {new Intl.NumberFormat('ru-RU', {
                        style: 'currency',
                        currency: 'RUB',
                        minimumFractionDigits: 0,
                      }).format(product.revenue || 0)}
                    </div>
                    <div className="text-xs text-white/60">выручка</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
