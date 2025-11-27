import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Search, Package, CheckCircle, XCircle, Wrench, PackageCheck, Gift, FileText, RefreshCw, ChevronDown, Phone, Mail, MapPin, MessageSquare } from 'lucide-react';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

// Конфигурация статусов для ритуальных товаров (без доставки)
const ORDER_STATUSES: Record<string, { label: string; icon: any; color: string; bg: string }> = {
  PENDING: { label: 'Новый', icon: FileText, color: 'text-amber-700', bg: 'bg-amber-100' },
  CONFIRMED: { label: 'Подтверждён', icon: CheckCircle, color: 'text-blue-700', bg: 'bg-blue-100' },
  PROCESSING: { label: 'В работе', icon: Wrench, color: 'text-purple-700', bg: 'bg-purple-100' },
  SHIPPED: { label: 'Готов к выдаче', icon: PackageCheck, color: 'text-teal-700', bg: 'bg-teal-100' },
  DELIVERED: { label: 'Выдан', icon: Gift, color: 'text-green-700', bg: 'bg-green-100' },
  CANCELLED: { label: 'Отменён', icon: XCircle, color: 'text-red-700', bg: 'bg-red-100' },
};

// Переходы статусов
const STATUS_TRANSITIONS: Record<string, string[]> = {
  PENDING: ['CONFIRMED', 'CANCELLED'],
  CONFIRMED: ['PROCESSING', 'CANCELLED'],
  PROCESSING: ['SHIPPED', 'CANCELLED'],
  SHIPPED: ['DELIVERED'],
  DELIVERED: [],
  CANCELLED: [],
};

interface OrderItem {
  id: number;
  name: string;
  price: number;
  quantity: number;
  product?: { name: string };
  variant?: { name: string };
}

interface Order {
  id: number;
  orderNumber: string;
  status: string;
  paymentStatus: string;
  total: number;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  customerAddress?: string;
  comment?: string;
  createdAt: string;
  updatedAt: string;
  items: OrderItem[];
}

export default function Orders() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [expandedOrder, setExpandedOrder] = useState<number | null>(null);

  const { data: orders, isLoading, error, refetch } = useQuery({
    queryKey: ['orders-admin', statusFilter],
    queryFn: async () => {
      const params = statusFilter !== 'all' ? { status: statusFilter } : {};
      const { data } = await api.get('/orders', { params });
      return Array.isArray(data) ? data : [];
    },
    refetchInterval: 30000,
  });

  const updateStatusMutation = useMutation({
    mutationFn: async ({ orderId, status }: { orderId: number; status: string }) => {
      const { data } = await api.patch(`/orders/${orderId}/status`, { status });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['orders-admin'] });
    },
    onError: (error: any) => {
      alert(`Ошибка: ${error.response?.data?.message || error.message}`);
    },
  });

  const filteredOrders = (orders || []).filter((order: Order) => {
    const searchLower = search.toLowerCase();
    return (
      order.orderNumber?.toLowerCase().includes(searchLower) ||
      order.customerName?.toLowerCase().includes(searchLower) ||
      order.customerPhone?.includes(search)
    );
  });

  const sortedOrders = [...filteredOrders].sort((a, b) => 
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleString('ru-RU', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('ru-RU').format(price) + ' ₽';
  };

  const StatusBadge = ({ status }: { status: string }) => {
    const config = ORDER_STATUSES[status] || ORDER_STATUSES.PENDING;
    const Icon = config.icon;
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium ${config.bg} ${config.color}`}>
        <Icon className="w-4 h-4" />
        {config.label}
      </span>
    );
  };

  const handleStatusChange = (orderId: number, newStatus: string) => {
    if (confirm(`Изменить статус заказа на "${ORDER_STATUSES[newStatus]?.label}"?`)) {
      updateStatusMutation.mutate({ orderId, status: newStatus });
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <RefreshCw className="w-8 h-8 animate-spin text-white/50" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <Card className="border-red-500/30 bg-red-500/10">
          <CardContent className="p-6">
            <p className="text-red-400">Ошибка загрузки заказов. Проверьте авторизацию.</p>
            <Button onClick={() => refetch()} className="mt-4">Повторить</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Заказы</h1>
          <p className="text-white/60">Управление заказами и статусами</p>
        </div>
        <Button onClick={() => refetch()} variant="outline" className="flex items-center gap-2">
          <RefreshCw className="w-4 h-4" />
          Обновить
        </Button>
      </div>

      {/* Filters */}
      <Card className="glass border-white/10">
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
              <input
                type="text"
                placeholder="Поиск по номеру, имени или телефону..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-4 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:ring-2 focus:ring-blue-500"
            >
              <option value="all">Все статусы</option>
              {Object.entries(ORDER_STATUSES).map(([key, config]) => (
                <option key={key} value={key}>{config.label}</option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        {Object.entries(ORDER_STATUSES).map(([status, config]) => {
          const count = (orders || []).filter((o: Order) => o.status === status).length;
          const Icon = config.icon;
          return (
            <div 
              key={status} 
              onClick={() => setStatusFilter(statusFilter === status ? 'all' : status)}
              className={`p-4 rounded-xl cursor-pointer transition-all border ${
                statusFilter === status 
                  ? 'bg-blue-500/20 border-blue-500/50' 
                  : 'bg-white/5 border-white/10 hover:bg-white/10'
              }`}
            >
              <Icon className={`w-5 h-5 mb-2 ${config.color}`} />
              <div className="text-2xl font-bold text-white">{count}</div>
              <div className="text-xs text-white/60">{config.label}</div>
            </div>
          );
        })}
      </div>

      {/* Orders List */}
      <div className="space-y-4">
        {sortedOrders.length === 0 ? (
          <Card className="glass border-white/10">
            <CardContent className="p-12 text-center">
              <Package className="w-12 h-12 mx-auto mb-4 text-white/30" />
              <p className="text-white/50">Заказы не найдены</p>
            </CardContent>
          </Card>
        ) : (
          sortedOrders.map((order: Order) => {
            const isExpanded = expandedOrder === order.id;
            const availableStatuses = STATUS_TRANSITIONS[order.status] || [];
            
            return (
              <Card key={order.id} className="glass border-white/10 overflow-hidden">
                <CardHeader 
                  className="cursor-pointer hover:bg-white/5 transition-colors"
                  onClick={() => setExpandedOrder(isExpanded ? null : order.id)}
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4">
                      <div>
                        <CardTitle className="text-lg text-white">
                          #{order.orderNumber || order.id}
                        </CardTitle>
                        <p className="text-sm text-white/50">{formatDate(order.createdAt)}</p>
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <StatusBadge status={order.status} />
                      <span className="text-lg font-semibold text-white">{formatPrice(order.total)}</span>
                      <ChevronDown className={`w-5 h-5 text-white/40 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />
                    </div>
                  </div>
                </CardHeader>
                
                {isExpanded && (
                  <CardContent className="border-t border-white/10 bg-white/5">
                    <div className="grid md:grid-cols-2 gap-6 py-4">
                      {/* Customer Info */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-white">Клиент</h4>
                        <div className="space-y-2 text-sm">
                          <p className="text-white font-medium">{order.customerName}</p>
                          <p className="flex items-center gap-2 text-white/70">
                            <Phone className="w-4 h-4" />
                            <a href={`tel:${order.customerPhone}`} className="hover:text-blue-400">
                              {order.customerPhone}
                            </a>
                          </p>
                          {order.customerEmail && (
                            <p className="flex items-center gap-2 text-white/70">
                              <Mail className="w-4 h-4" />
                              <a href={`mailto:${order.customerEmail}`} className="hover:text-blue-400">
                                {order.customerEmail}
                              </a>
                            </p>
                          )}
                          {order.customerAddress && (
                            <p className="flex items-center gap-2 text-white/70">
                              <MapPin className="w-4 h-4" />
                              {order.customerAddress}
                            </p>
                          )}
                          {order.comment && (
                            <p className="flex items-start gap-2 text-white/70">
                              <MessageSquare className="w-4 h-4 mt-0.5" />
                              <span className="italic">{order.comment}</span>
                            </p>
                          )}
                        </div>
                      </div>
                      
                      {/* Order Items */}
                      <div className="space-y-3">
                        <h4 className="font-semibold text-white">Товары</h4>
                        <div className="space-y-2">
                          {order.items?.map((item, idx) => (
                            <div key={idx} className="flex justify-between text-sm">
                              <span className="text-white/80">
                                {item.product?.name || item.name}
                                {item.variant?.name && ` (${item.variant.name})`}
                                {' × '}{item.quantity}
                              </span>
                              <span className="font-medium text-white">{formatPrice(item.price * item.quantity)}</span>
                            </div>
                          ))}
                          <div className="border-t border-white/10 pt-2 flex justify-between font-semibold">
                            <span className="text-white">Итого:</span>
                            <span className="text-white">{formatPrice(order.total)}</span>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    {/* Status Actions */}
                    {availableStatuses.length > 0 && (
                      <div className="border-t border-white/10 pt-4 mt-4">
                        <h4 className="font-semibold text-white mb-3">Изменить статус</h4>
                        <div className="flex flex-wrap gap-2">
                          {availableStatuses.map((newStatus) => {
                            const config = ORDER_STATUSES[newStatus];
                            const Icon = config?.icon || FileText;
                            return (
                              <Button
                                key={newStatus}
                                variant="outline"
                                size="sm"
                                onClick={() => handleStatusChange(order.id, newStatus)}
                                disabled={updateStatusMutation.isPending}
                                className="flex items-center gap-2"
                              >
                                <Icon className="w-4 h-4" />
                                {config?.label || newStatus}
                              </Button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            );
          })
        )}
      </div>
    </div>
  );
}
