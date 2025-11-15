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
        <div className="text-muted-foreground">Загрузка...</div>
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
                <CardTitle>{newsletter.subject}</CardTitle>
                <span className={`text-xs px-2 py-1 rounded ${
                  newsletter.status === 'sent' ? 'bg-green-100 text-green-800' :
                  newsletter.status === 'scheduled' ? 'bg-blue-100 text-blue-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {newsletter.status}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground mb-4 line-clamp-2">
                {newsletter.content}
              </p>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-sm">
                <div className="space-y-1">
                  {newsletter.scheduledAt && (
                    <div className="text-muted-foreground">
                      Запланировано: {format(new Date(newsletter.scheduledAt), 'dd.MM.yyyy HH:mm')}
                    </div>
                  )}
                  {newsletter.sentAt && (
                    <div className="text-muted-foreground">
                      Отправлено: {format(new Date(newsletter.sentAt), 'dd.MM.yyyy HH:mm')}
                    </div>
                  )}
                  <div className="text-muted-foreground text-xs sm:text-sm">
                    Получателей: {newsletter.recipientCount} · 
                    Открытий: {newsletter.openedCount} · 
                    Кликов: {newsletter.clickedCount}
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
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-muted-foreground">Рассылки не найдены</p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

