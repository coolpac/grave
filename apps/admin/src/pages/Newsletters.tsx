import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Mail, Send } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

export default function Newsletters() {
  const queryClient = useQueryClient();

  const { data: newsletters, isLoading } = useQuery({
    queryKey: ['newsletters'],
    queryFn: async () => {
      const { data } = await api.get('/newsletters');
      return data;
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/newsletters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    },
  });

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
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">Рассылки</h1>
          <p className="text-sm sm:text-base text-white/70">Управление email рассылками</p>
        </div>
        <Button className="w-full sm:w-auto">
          <Plus className="mr-2 h-4 w-4" />
          Создать рассылку
        </Button>
      </div>

      <div className="grid gap-4">
        {newsletters?.map((newsletter: any) => (
          <Card key={newsletter.id} className="glass-strong card-hover border-white/20 shadow-xl">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle className="text-white">{newsletter.subject}</CardTitle>
                <span className={`text-xs px-2 py-1 rounded border ${
                  newsletter.status === 'sent' ? 'bg-green-500/20 text-green-400 border-green-500/30' :
                  newsletter.status === 'scheduled' ? 'bg-blue-500/20 text-blue-400 border-blue-500/30' :
                  'bg-white/10 text-white/80 border-white/20'
                }`}>
                  {newsletter.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-white/80 mb-4 line-clamp-2">
                {newsletter.content}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
                <div className="space-y-1">
                  {newsletter.scheduledAt && (
                    <div className="text-white/70">
                      Запланировано: <span className="text-white">{format(new Date(newsletter.scheduledAt), 'dd.MM.yyyy HH:mm')}</span>
                    </div>
                  )}
                  {newsletter.sentAt && (
                    <div className="text-white/70">
                      Отправлено: <span className="text-white">{format(new Date(newsletter.sentAt), 'dd.MM.yyyy HH:mm')}</span>
                    </div>
                  )}
                  <div className="text-white/70 text-xs sm:text-sm">
                    Получателей: <span className="text-white">{newsletter.recipientCount}</span> · 
                    Открытий: <span className="text-white">{newsletter.openedCount}</span> · 
                    Кликов: <span className="text-white">{newsletter.clickedCount}</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {newsletter.status === 'draft' && (
                    <Button variant="ghost" size="sm">
                      <Send className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      if (confirm('Удалить рассылку?')) {
                        deleteMutation.mutate(newsletter.id);
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

      {(!newsletters || newsletters.length === 0) && (
        <Card className="glass-strong border-white/20">
          <CardContent className="p-8 text-center">
            <p className="text-white/70">Рассылки не найдены</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

