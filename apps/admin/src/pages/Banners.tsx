import { useRef, useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import { Plus, Edit, Trash2, Eye, EyeOff, Image as ImageIcon, MousePointer, Loader2, X } from 'lucide-react';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

type BannerEntity = {
  id: number;
  title: string;
  description?: string | null;
  imageUrl: string;
  linkUrl?: string | null;
  position?: string | null;
  order?: number | null;
  isActive: boolean;
  startDate?: string | null;
  endDate?: string | null;
  clickCount?: number | null;
};

type BannerFormValues = {
  title: string;
  description: string;
  imageUrl: string;
  linkUrl: string;
  position: string;
  order: number;
  isActive: boolean;
  startDate: string;
  endDate: string;
};

const defaultFormValues: BannerFormValues = {
  title: '',
  description: '',
  imageUrl: '',
  linkUrl: '',
  position: 'home',
  order: 0,
  isActive: true,
  startDate: '',
  endDate: '',
};

const bannerPositions = [
  { value: 'home', label: 'Главная страница' },
  { value: 'catalog', label: 'Каталог' },
  { value: 'materials', label: 'Материалы' },
  { value: 'custom', label: 'Другое' },
];

const inputClasses =
  'w-full rounded-2xl bg-white/5 border border-white/15 px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-400 transition';

const textareaClasses = `${inputClasses} min-h-[120px] resize-none`;

const formatDateTimeLocal = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  const tzOffset = date.getTimezoneOffset();
  const local = new Date(date.getTime() - tzOffset * 60 * 1000);
  return local.toISOString().slice(0, 16);
};

const normalizeDateValue = (value?: string) => {
  if (!value) return undefined;
  const parsed = new Date(value);
  return isNaN(parsed.getTime()) ? undefined : parsed.toISOString();
};

export default function Banners() {
  const queryClient = useQueryClient();
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingBanner, setEditingBanner] = useState<BannerEntity | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const {
    data: banners,
    isLoading,
    error,
  } = useQuery<BannerEntity[]>({
    queryKey: ['banners'],
    queryFn: async () => {
      const { data } = await api.get('/banners');
      return data;
    },
    retry: 1,
  });

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
  } = useForm<BannerFormValues>({
    defaultValues: defaultFormValues,
  });

  const imageUrlValue = watch('imageUrl');

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

  const openCreateForm = () => {
    setEditingBanner(null);
    reset(defaultFormValues);
    setIsFormOpen(true);
  };

  const openEditForm = (banner: BannerEntity) => {
    setEditingBanner(banner);
    reset({
      title: banner.title,
      description: banner.description || '',
      imageUrl: banner.imageUrl,
      linkUrl: banner.linkUrl || '',
      position: banner.position || 'home',
      order: banner.order ?? 0,
      isActive: banner.isActive,
      startDate: formatDateTimeLocal(banner.startDate),
      endDate: formatDateTimeLocal(banner.endDate),
    });
    setIsFormOpen(true);
  };

  const closeForm = () => {
    setIsFormOpen(false);
    setEditingBanner(null);
    reset(defaultFormValues);
  };

  const handleImageUpload = async (file?: File) => {
    if (!file) return;
    setIsUploadingImage(true);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const { data } = await api.post('/upload/image', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      setValue('imageUrl', data.url, { shouldDirty: true });
    } catch (uploadError) {
      console.error(uploadError);
      alert('Не удалось загрузить изображение');
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const onSubmit = handleSubmit(async (values) => {
    if (!values.imageUrl) {
      alert('Добавьте изображение баннера');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        title: values.title,
        description: values.description || undefined,
        imageUrl: values.imageUrl,
        linkUrl: values.linkUrl?.trim() || undefined,
        position: values.position || 'home',
        order: Number(values.order) || 0,
        isActive: values.isActive,
        startDate: normalizeDateValue(values.startDate),
        endDate: normalizeDateValue(values.endDate),
      };

      if (editingBanner) {
        await api.put(`/banners/${editingBanner.id}`, payload);
      } else {
        await api.post('/banners', payload);
      }

      queryClient.invalidateQueries({ queryKey: ['banners'] });
      closeForm();
    } catch (submitError) {
      console.error(submitError);
      alert('Не удалось сохранить баннер, попробуйте ещё раз');
    } finally {
      setIsSubmitting(false);
    }
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
        <Button
          type="button"
          className="w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 border-0 h-11 px-6 font-semibold"
          onClick={openCreateForm}
        >
          <Plus className="mr-2 h-5 w-5" />
          Добавить баннер
        </Button>
      </div>

      {/* Banners Grid */}
      {banners && banners.length > 0 ? (
        <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
          {banners.map((banner, index) => (
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
                <p className="text-sm text-white/70 line-clamp-2">{banner.description}</p>
                <div className="flex items-center justify-between text-sm pt-3 border-t border-white/10">
                  <div className="space-y-1">
                    <div className="text-white/60">
                      Позиция:{' '}
                      <span className="text-white/90 font-semibold">
                        {banner.position || 'home'}
                      </span>
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
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        toggleActiveMutation.mutate({
                          id: banner.id,
                          isActive: !banner.isActive,
                        })
                      }
                      disabled={toggleActiveMutation.isPending}
                      className="text-white/80 hover:text-white hover:bg-white/15 border border-white/10 rounded-lg h-10 w-10 p-0"
                      title={banner.isActive ? 'Деактивировать' : 'Активировать'}
                    >
                      {banner.isActive ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => openEditForm(banner)}
                      className="text-white/80 hover:text-white hover:bg-blue-500/20 border border-white/10 rounded-lg h-10 w-10 p-0"
                      title="Редактировать"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        if (confirm('Вы уверены, что хотите удалить этот баннер?')) {
                          deleteMutation.mutate(banner.id);
                        }
                      }}
                      disabled={deleteMutation.isPending}
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
            <Button
              type="button"
              className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white"
              onClick={openCreateForm}
            >
              <Plus className="mr-2 h-4 w-4" />
              Добавить баннер
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Banner Form Modal */}
      {isFormOpen && (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/70 backdrop-blur-md p-6 overflow-y-auto">
          <Card className="glass-strong w-full max-w-3xl shadow-2xl border-white/20 animate-slide-in">
            <CardHeader className="flex items-center justify-between gap-4">
              <CardTitle className="text-2xl text-white">
                {editingBanner ? 'Редактирование баннера' : 'Новый баннер'}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="text-white/70 hover:text-white hover:bg-white/10 rounded-full"
                onClick={closeForm}
              >
                <X className="h-5 w-5" />
              </Button>
            </CardHeader>
            <CardContent className="space-y-6">
              <form className="space-y-6" onSubmit={onSubmit}>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Заголовок</label>
                    <input
                      type="text"
                      placeholder="Например, Качественные материалы"
                      className={inputClasses}
                      {...register('title', { required: true })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Ссылка</label>
                    <input
                      type="text"
                      placeholder="https://..."
                      className={inputClasses}
                      {...register('linkUrl')}
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-white/80 mb-2">Описание</label>
                  <textarea
                    placeholder="Краткое описание баннера"
                    className={textareaClasses}
                    {...register('description')}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Позиция размещения</label>
                    <select className={inputClasses} {...register('position')}>
                      {bannerPositions.map((position) => (
                        <option key={position.value} value={position.value}>
                          {position.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Порядок</label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      className={inputClasses}
                      {...register('order', { valueAsNumber: true })}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Дата начала</label>
                    <input type="datetime-local" className={inputClasses} {...register('startDate')} />
                  </div>
                  <div>
                    <label className="block text-sm font-semibold text-white/80 mb-2">Дата окончания</label>
                    <input type="datetime-local" className={inputClasses} {...register('endDate')} />
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="banner-active"
                    className="h-5 w-5 accent-blue-500"
                    {...register('isActive')}
                  />
                  <label htmlFor="banner-active" className="text-sm font-semibold text-white/80">
                    Баннер активен
                  </label>
                </div>

                <div className="space-y-3">
                  <label className="block text-sm font-semibold text-white/80">Изображение</label>
                  {imageUrlValue ? (
                    <div className="relative rounded-2xl overflow-hidden border border-white/15">
                      <img src={imageUrlValue} alt="Превью баннера" className="w-full h-56 object-cover" />
                      <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent pointer-events-none" />
                    </div>
                  ) : (
                    <div className="h-56 flex items-center justify-center rounded-2xl border border-dashed border-white/20 text-white/50">
                      Изображение не выбрано
                    </div>
                  )}
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={(event) => handleImageUpload(event.target.files?.[0])}
                  />
                  <div className="flex flex-wrap gap-3">
                    <Button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage}
                      className="bg-white/10 hover:bg-white/20 text-white"
                    >
                      {isUploadingImage ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Загрузка...
                        </>
                      ) : (
                        'Загрузить изображение'
                      )}
                    </Button>
                    {imageUrlValue && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="text-white/70 hover:text-white"
                        onClick={() => setValue('imageUrl', '')}
                      >
                        Удалить изображение
                      </Button>
                    )}
                  </div>
                </div>

                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-end gap-4 pt-4 border-t border-white/10">
                  <Button
                    type="button"
                    variant="ghost"
                    className="text-white/70 hover:text-white hover:bg-white/10"
                    onClick={closeForm}
                    disabled={isSubmitting}
                  >
                    Отмена
                  </Button>
                  <Button
                    type="submit"
                    className="bg-gradient-to-r from-blue-500 to-purple-600 text-white hover:from-blue-600 hover:to-purple-700 min-w-[180px]"
                    disabled={isSubmitting}
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Сохранение...
                      </>
                    ) : editingBanner ? (
                      'Сохранить изменения'
                    ) : (
                      'Создать баннер'
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}
