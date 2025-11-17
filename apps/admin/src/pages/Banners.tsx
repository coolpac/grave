import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, MousePointer } from 'lucide-react';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

export default function Banners() {
  const queryClient = useQueryClient();

  const { data: banners, isLoading, error } = useQuery({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data } = await api.get('/banners');
      return data;
    },
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/banners/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
  });

  const toggleActiveMutation = useMutation({
    mutationFn: async ({ id, isActive }: { id: number; isActive: boolean }) => {
      await api.put(`/banners/${id}`, { isActive });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['banners'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mb-4" />
          <div className="text-white/80 text-lg font-medium">Загрузка баннеров...</div>
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
              <ImageIcon className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ошибка загрузки</h3>
            <p className="text-white/70">Не удалось загрузить баннеры</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Баннеры</h1>
          <p className="text-sm sm:text-base text-white/70 font-medium">
            Управление рекламными баннерами
          </p>
        </div>
        <Button className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 border-0 h-11 px-6 font-semibold">
          <Plus className="mr-2 h-5 w-5" />
          Добавить баннер
        </Button>
      </div>

      {/* Banners Grid */}
      {banners && banners.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner: any, index: number) => (
            <Card 
              key={banner.id} 
              className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in"
              style={{ animationDelay: `${index * 50}ms` }}
            >
              <CardHeader className="p-0">
                <div className="aspect-video bg-gradient-to-br from-white/5 to-white/10 rounded-t-xl overflow-hidden mb-4 border-b border-white/10 relative group">
                  <img
                    src={banner.imageUrl}
                    alt={banner.title}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                  {banner.isActive && (
                    <div className="absolute top-3 right-3">
                      <span className="badge-premium bg-green-500/20 border-green-500/30 text-green-300">
                        Активен
                      </span>
                    </div>
                  )}
                </div>
                <div className="px-6">
                  <CardTitle className="text-lg font-bold text-white mb-2">{banner.title}</CardTitle>
                </div>
              </CardHeader>
              <CardContent className="px-6 pb-6 space-y-4">
                <p className="text-sm text-white/70 line-clamp-2">
                  {banner.description}
                </p>
                <div className="flex items-center justify-between text-sm pt-3 border-t border-white/10">
                  <div className="space-y-1">
                    <div className="text-white/60">
                      Позиция:{' '}
                      <span className="text-white/90 font-semibold">{banner.position}</span>
                    </div>
                    <div className="flex items-center gap-1 text-white/60">
                      <MousePointer className="h-4 w-4" />
                      <span>
                        Кликов:{' '}
                        <span className="text-white/90 font-semibold">{banner.clickCount || 0}</span>
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleActiveMutation.mutate({
                          id: banner.id,
                          isActive: !banner.isActive,
                        })
                      }
                      className="text-white/80 hover:text-white hover:bg-white/15 border border-white/10 rounded-lg h-10 w-10 p-0"
                      title={banner.isActive ? 'Деактивировать' : 'Активировать'}
                    >
                      {banner.isActive ? (
                        <Eye className="h-4 w-4" />
                      ) : (
                        <EyeOff className="h-4 w-4" />
                      )}
                    </Button>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      className="text-white/80 hover:text-white hover:bg-blue-500/20 border border-white/10 rounded-lg h-10 w-10 p-0"
                      title="Редактировать"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить этот баннер?')) {
                          deleteMutation.mutate(banner.id);
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
              <ImageIcon className="h-10 w-10 text-white/40" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Баннеры не найдены</h3>
            <p className="text-white/60 mb-6">Начните с добавления первого баннера</p>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Добавить баннер
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
