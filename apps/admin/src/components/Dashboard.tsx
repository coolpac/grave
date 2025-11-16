import { useQuery } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import { Users, ShoppingCart, DollarSign, Package, TrendingUp, AlertCircle } from 'lucide-react';
import api from '../lib/api';
import { format } from 'date-fns';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

export default function Dashboard() {
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['admin-metrics'],
    queryFn: async () => {
      const { data } = await api.get('/admin/metrics');
      return data;
    },
  });

  const { data: analytics, isLoading: analyticsLoading } = useQuery({
    queryKey: ['admin-analytics', 'week'],
    queryFn: async () => {
      const { data } = await api.get('/admin/analytics', {
        params: { period: 'week' },
      });
      return data;
    },
  });

  if (metricsLoading || analyticsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/80 text-lg">Загрузка...</div>
      </div>
    );
  }

  const salesData = analytics?.salesTrend || [];
  const ordersByStatus = analytics?.ordersByStatus || [];
  const revenueByCategory = analytics?.revenueByCategory || [];

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 relative">
      <div className="mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">Дашборд</h1>
        <p className="text-sm sm:text-base text-white/70">Обзор продаж и аналитика</p>
      </div>

      {/* Метрики */}
      <div className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Всего пользователей</CardTitle>
            <Users className="h-5 w-5 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-white/70">
              +{metrics?.dailyUsers || 0} за сегодня
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Всего заказов</CardTitle>
            <ShoppingCart className="h-5 w-5 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{metrics?.totalOrders || 0}</div>
            <p className="text-xs text-white/70">
              {metrics?.pendingOrders || 0} ожидают обработки
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Выручка</CardTitle>
            <DollarSign className="h-5 w-5 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(metrics?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-white/70">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(metrics?.dailyRevenue || 0)} за сегодня
            </p>
          </CardContent>
        </Card>

        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-white">Товаров</CardTitle>
            <Package className="h-5 w-5 text-purple-400" />
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-white mb-1">{metrics?.activeProducts || 0}</div>
            <p className="text-xs text-white/70">
              {metrics?.abandonedCartsCount || 0} брошенных корзин
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Графики */}
      <div className="grid gap-4 grid-cols-1 lg:grid-cols-2">
        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white text-lg font-semibold">Динамика продаж</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  labelFormatter={(value) => format(new Date(value), 'dd.MM.yyyy')}
                  formatter={(value: number) => [
                    new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(value),
                    'Выручка',
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="revenue"
                  stroke="#3b82f6"
                  strokeWidth={3}
                  name="Выручка"
                  dot={{ fill: '#3b82f6', r: 4 }}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#10b981"
                  strokeWidth={3}
                  name="Заказы"
                  dot={{ fill: '#10b981', r: 4 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white text-lg font-semibold">Заказы по статусам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={ordersByStatus}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
                <XAxis
                  dataKey="status"
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                />
                <YAxis
                  stroke="rgba(255,255,255,0.5)"
                  tick={{ fill: 'rgba(255,255,255,0.7)' }}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                />
                <Bar dataKey="count" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Выручка по категориям */}
      {revenueByCategory.length > 0 && (
        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white text-lg font-semibold">Выручка по категориям</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={revenueByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="revenue"
                >
                  {revenueByCategory.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'rgba(0, 0, 0, 0.9)',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '8px',
                    color: '#fff'
                  }}
                  formatter={(value: number) => [
                    new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(value),
                    'Выручка',
                  ]}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}

      {/* Топ товары */}
      {metrics?.topProducts && metrics.topProducts.length > 0 && (
        <Card className="glass-strong card-hover border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white text-lg font-semibold">Топ товары</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.topProducts.slice(0, 5).map((product: any, index: number) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-3 border border-white/20 rounded-lg glass hover:bg-white/10 transition-colors"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-white/70 font-semibold">#{index + 1}</span>
                    <span className="font-medium text-white">{product.name}</span>
                  </div>
                  <div className="text-sm text-white/80">
                    {product.quantity} шт. ·{' '}
                    {new Intl.NumberFormat('ru-RU', {
                      style: 'currency',
                      currency: 'RUB',
                      minimumFractionDigits: 0,
                    }).format(product.revenue)}
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

