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
        <div className="text-muted-foreground">Загрузка...</div>
      </div>
    );
  }

  const salesData = analytics?.salesTrend || [];
  const ordersByStatus = analytics?.ordersByStatus || [];
  const revenueByCategory = analytics?.revenueByCategory || [];

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-3xl font-bold mb-2">Дашборд</h1>
        <p className="text-muted-foreground">Обзор продаж и аналитика</p>
      </div>

      {/* Метрики */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего пользователей</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalUsers || 0}</div>
            <p className="text-xs text-muted-foreground">
              +{metrics?.dailyUsers || 0} за сегодня
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Всего заказов</CardTitle>
            <ShoppingCart className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.totalOrders || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.pendingOrders || 0} ожидают обработки
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Выручка</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(metrics?.totalRevenue || 0)}
            </div>
            <p className="text-xs text-muted-foreground">
              {new Intl.NumberFormat('ru-RU', {
                style: 'currency',
                currency: 'RUB',
                minimumFractionDigits: 0,
              }).format(metrics?.dailyRevenue || 0)} за сегодня
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Товаров</CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{metrics?.activeProducts || 0}</div>
            <p className="text-xs text-muted-foreground">
              {metrics?.abandonedCartsCount || 0} брошенных корзин
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Графики */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Динамика продаж</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={salesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tickFormatter={(value) => format(new Date(value), 'dd.MM')}
                />
                <YAxis />
                <Tooltip
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
                  stroke="#0088FE"
                  strokeWidth={2}
                  name="Выручка"
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  stroke="#00C49F"
                  strokeWidth={2}
                  name="Заказы"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Заказы по статусам</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={ordersByStatus}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="status" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="count" fill="#0088FE" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Выручка по категориям */}
      {revenueByCategory.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Выручка по категориям</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
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
        <Card>
          <CardHeader>
            <CardTitle>Топ товары</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {metrics.topProducts.slice(0, 5).map((product: any, index: number) => (
                <div
                  key={product.id}
                  className="flex items-center justify-between p-2 border rounded"
                >
                  <div className="flex items-center gap-2">
                    <span className="text-muted-foreground">#{index + 1}</span>
                    <span className="font-medium">{product.name}</span>
                  </div>
                  <div className="text-sm text-muted-foreground">
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

