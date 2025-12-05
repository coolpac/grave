import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Mail, Send, Clock, CheckCircle2, Users } from 'lucide-react';
import { format } from 'date-fns';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';
import { useState } from 'react';
import { Textarea } from '@ui/components/textarea';
import { Input } from '@ui/components/input';

export default function Newsletters() {
  const queryClient = useQueryClient();
  const [subject, setSubject] = useState('');
  const [content, setContent] = useState('');
  const [targetSegment, setTargetSegment] = useState('all');
  const [recipientIds, setRecipientIds] = useState('');

  const { data: newsletters, isLoading, error } = useQuery({
    queryKey: ['newsletters'],
    queryFn: async () => {
      const { data } = await api.get('/newsletters');
      return data;
    },
    retry: 1,
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/newsletters/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const ids = recipientIds
        .split(/[\s,;\n]+/)
        .map((s) => s.trim())
        .filter(Boolean);
      await api.post('/newsletters', {
        subject,
        content,
        status: 'draft',
        targetSegment,
        recipientIds: ids.length > 0 ? ids : undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['newsletters'] });
      setSubject('');
      setContent('');
      setRecipientIds('');
      setTargetSegment('all');
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mb-4" />
          <div className="text-white/80 text-lg font-medium">Загрузка рассылок...</div>
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
              <Mail className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Ошибка загрузки</h3>
            <p className="text-white/70">Не удалось загрузить рассылки</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  const getStatusBadge = (status: string) => {
    const badges = {
      sent: { bg: 'bg-green-500/20', border: 'border-green-500/30', text: 'text-green-300', icon: CheckCircle2, label: 'Отправлено' },
      scheduled: { bg: 'bg-blue-500/20', border: 'border-blue-500/30', text: 'text-blue-300', icon: Clock, label: 'Запланировано' },
      draft: { bg: 'bg-white/10', border: 'border-white/20', text: 'text-white/80', icon: Mail, label: 'Черновик' },
    };
    return badges[status as keyof typeof badges] || badges.draft;
  };

  return (
    <div className="space-y-6 p-6 animate-fade-in">
      {/* Premium Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div className="space-y-1">
          <h1 className="text-3xl sm:text-4xl font-bold gradient-text">Рассылки</h1>
          <p className="text-sm sm:text-base text-white/70 font-medium">
            Управление email рассылками
          </p>
        </div>
      </div>

      {/* Create form */}
      <Card className="glass-strong border-white/20 shadow-xl">
        <CardContent className="p-6 space-y-4">
          <div className="flex items-center gap-2 text-white/80 text-sm font-semibold">
            <Mail className="h-4 w-4" />
            Новая рассылка
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              placeholder="Тема"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
            <div className="flex flex-col gap-2">
              <label className="text-xs text-white/60">Сегмент</label>
              <select
                value={targetSegment}
                onChange={(e) => setTargetSegment(e.target.value)}
                className="bg-white/5 border border-white/10 text-white rounded-md px-3 py-2"
              >
                <option value="all">Все пользователи</option>
                <option value="premium">Премиум</option>
                <option value="orders_recent">Покупали за 30 дней</option>
                <option value="inactive_30d">Неактивные 30 дней</option>
                <option value="custom_ids">Только указанные ID</option>
              </select>
            </div>
          </div>
          <Textarea
            placeholder="Текст сообщения"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            className="min-h-[120px] bg-white/5 border-white/10 text-white placeholder:text-white/40"
          />
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-white/70 text-sm">
              <Users className="h-4 w-4" />
              Telegram ID (через запятую/пробел/строку) — опционально
            </div>
            <Textarea
              placeholder="12345678, 23456789"
              value={recipientIds}
              onChange={(e) => setRecipientIds(e.target.value)}
              className="min-h-[80px] bg-white/5 border-white/10 text-white placeholder:text-white/40"
            />
          </div>
          <div className="flex justify-end">
            <Button
              onClick={() => createMutation.mutate()}
              disabled={!subject || !content || createMutation.isLoading}
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 border-0 h-11 px-6 font-semibold"
            >
              <Plus className="mr-2 h-5 w-5" />
              Создать
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Newsletters List */}
      {newsletters && newsletters.length > 0 ? (
        <div className="grid gap-4">
          {newsletters.map((newsletter: any, index: number) => {
            const statusBadge = getStatusBadge(newsletter.status);
            const StatusIcon = statusBadge.icon;
            
            return (
              <Card 
                key={newsletter.id} 
                className="glass-strong card-hover border-white/20 shadow-xl animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                          <Mail className="h-5 w-5 text-blue-400" />
                        </div>
                        <CardTitle className="text-lg font-bold text-white flex-1">
                          {newsletter.subject}
                        </CardTitle>
                      </div>
                      <span className={`badge-premium ${statusBadge.bg} ${statusBadge.border} ${statusBadge.text} inline-flex items-center gap-1.5`}>
                        <StatusIcon className="h-3.5 w-3.5" />
                        {statusBadge.label}
                      </span>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-4">
                  <p className="text-sm text-white/70 line-clamp-3 leading-relaxed">
                    {newsletter.content}
                  </p>
                  
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-white/10">
                    <div className="space-y-2">
                      {newsletter.scheduledAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <Clock className="h-4 w-4 text-white/50" />
                          <span className="text-white/60">Запланировано:</span>
                          <span className="text-white/90 font-semibold">
                            {format(new Date(newsletter.scheduledAt), 'dd.MM.yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                      {newsletter.sentAt && (
                        <div className="flex items-center gap-2 text-sm">
                          <CheckCircle2 className="h-4 w-4 text-white/50" />
                          <span className="text-white/60">Отправлено:</span>
                          <span className="text-white/90 font-semibold">
                            {format(new Date(newsletter.sentAt), 'dd.MM.yyyy HH:mm')}
                          </span>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-2">
                      <div className="text-sm text-white/60">
                        Получателей:{' '}
                        <span className="text-white/90 font-semibold">{newsletter.recipientCount || 0}</span>
                      </div>
                    {newsletter.targetSegment && (
                      <div className="text-sm text-white/60">
                        Сегмент:{' '}
                        <span className="text-white/90 font-semibold">{newsletter.targetSegment}</span>
                      </div>
                    )}
                    {newsletter.recipientIds && newsletter.recipientIds.length > 0 && (
                      <div className="text-sm text-white/60">
                        ID:{' '}
                        <span className="text-white/90 font-semibold">
                          {(newsletter.recipientIds as string[]).length} шт.
                        </span>
                      </div>
                    )}
                      <div className="text-sm text-white/60">
                        Открытий:{' '}
                        <span className="text-white/90 font-semibold">{newsletter.openedCount || 0}</span>
                        {' · '}
                        Кликов:{' '}
                        <span className="text-white/90 font-semibold">{newsletter.clickedCount || 0}</span>
                      </div>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2 pt-2">
                    {newsletter.status === 'draft' && (
                      <Button 
                        variant="ghost" 
                        size="sm"
                        className="text-white/80 hover:text-white hover:bg-green-500/20 border border-white/10 rounded-lg"
                      >
                        <Send className="mr-2 h-4 w-4" />
                        Отправить
                      </Button>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить эту рассылку?')) {
                          deleteMutation.mutate(newsletter.id);
                        }
                      }}
                      className="text-red-400/80 hover:text-red-400 hover:bg-red-500/20 border border-white/10 rounded-lg ml-auto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      ) : (
        <Card className="glass-strong border-white/20 shadow-xl">
          <CardContent className="p-12 text-center">
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Mail className="h-10 w-10 text-white/40" />
            </div>
            <h3 className="text-xl font-bold text-white mb-2">Рассылки не найдены</h3>
            <p className="text-white/60 mb-6">Начните с создания первой рассылки</p>
            <Button className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white">
              <Plus className="mr-2 h-4 w-4" />
              Создать рассылку
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
