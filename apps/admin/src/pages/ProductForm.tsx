import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, ArrowLeft, X, Upload, GripVertical } from 'lucide-react';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

// Типы товаров
enum ProductType {
  SIMPLE = 'SIMPLE',
  SINGLE_VARIANT = 'SINGLE_VARIANT',
  MATRIX = 'MATRIX',
  RANGE = 'RANGE',
  CONFIGURABLE = 'CONFIGURABLE',
}

enum UnitType {
  PIECE = 'PIECE',
  SQUARE_METER = 'SQUARE_METER',
  TON = 'TON',
  SET = 'SET',
}

interface ProductAttributeValue {
  value: string;
  displayName: string;
  order?: number;
  metadata?: any;
}

interface ProductAttribute {
  name: string;
  slug: string;
  type?: string;
  order?: number;
  isRequired?: boolean;
  unit?: string;
  values?: ProductAttributeValue[];
}

interface ProductVariant {
  name?: string;
  sku?: string;
  price: number;
  stock?: number;
  weight?: number;
  unit?: UnitType;
  attributes?: Record<string, string>;
  metadata?: any;
}

interface MediaItem {
  id?: number;
  url: string;
  order: number;
  file?: File;
}

interface ProductFormData {
  slug: string;
  name: string;
  description?: string;
  categoryId: number;
  productType: ProductType;
  basePrice?: number;
  unit?: UnitType;
  isActive: boolean;
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
}

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditMode = !!id;
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);

  // Получение категорий
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/categories');
      return data;
    },
  });

  // Получение товара для редактирования
  const { data: product, isLoading: productLoading } = useQuery({
    queryKey: ['product', id],
    queryFn: async () => {
      const { data } = await api.get(`/products/${id}`);
      return data;
    },
    enabled: isEditMode,
  });

  const {
    register,
    handleSubmit,
    control,
    watch,
    setValue,
    formState: { errors },
  } = useForm<ProductFormData>({
    defaultValues: {
      productType: ProductType.SIMPLE,
      isActive: true,
      attributes: [],
      variants: [],
    },
  });

  const productType = watch('productType');

  const { fields: attributeFields, append: appendAttribute, remove: removeAttribute } = useFieldArray({
    control,
    name: 'attributes',
  });

  const { fields: variantFields, append: appendVariant, remove: removeVariant } = useFieldArray({
    control,
    name: 'variants',
  });

  // Загрузка данных товара при редактировании
  useEffect(() => {
    if (product) {
      setValue('slug', product.slug);
      setValue('name', product.name);
      setValue('description', product.description || '');
      setValue('categoryId', product.categoryId);
      setValue('productType', product.productType || ProductType.SIMPLE);
      setValue('basePrice', product.basePrice || 0);
      setValue('unit', product.unit || UnitType.PIECE);
      setValue('isActive', product.isActive ?? true);
      
      if (product.attributes) {
        const attrs = product.attributes.map((attr: any) => ({
          ...attr,
          values: attr.values || [],
        }));
        setValue('attributes', attrs);
      }
      
      if (product.variants) {
        const variants = product.variants.map((variant: any) => ({
          ...variant,
          attributes: typeof variant.attributes === 'string' 
            ? JSON.parse(variant.attributes) 
            : variant.attributes || {},
        }));
        setValue('variants', variants);
      }

      // Загрузка медиа
      if (product.media && product.media.length > 0) {
        const media = product.media.map((m: any, index: number) => ({
          id: m.id,
          url: m.url,
          order: m.order ?? index,
        }));
        setMediaItems(media);
      }
    }
  }, [product, setValue]);

  // Загрузка изображений
  const handleFileUpload = useCallback(async (files: FileList | null) => {
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const formData = new FormData();
        formData.append('file', file);

        const { data } = await api.post('/upload/image', formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        });

        return {
          url: data.url,
          order: mediaItems.length,
          file,
        };
      });

      const newMedia = await Promise.all(uploadPromises);
      setMediaItems((prev) => [...prev, ...newMedia]);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Ошибка загрузки изображений');
    } finally {
      setUploading(false);
    }
  }, [mediaItems.length]);

  const removeMedia = async (index: number) => {
    const item = mediaItems[index];
    if (item.id) {
      try {
        await api.delete(`/upload/media/${item.id}`);
      } catch (error) {
        console.error('Delete error:', error);
      }
    }
    setMediaItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i })));
  };

  const moveMedia = (oldIndex: number, newIndex: number) => {
    setMediaItems((prev) => {
      const newItems = [...prev];
      const [removed] = newItems.splice(oldIndex, 1);
      newItems.splice(newIndex, 0, removed);
      return newItems.map((item, index) => ({ ...item, order: index }));
    });
  };

  // Автоматическое создание вариантов для MATRIX типа
  const generateMatrixVariants = () => {
    const attributes = watch('attributes') || [];
    if (attributes.length === 0) {
      alert('Добавьте атрибуты для создания вариантов');
      return;
    }

    // Генерируем все комбинации значений атрибутов
    const combinations: Record<string, string>[] = [];
    
    const generateCombinations = (current: Record<string, string>, attrIndex: number) => {
      if (attrIndex >= attributes.length) {
        combinations.push({ ...current });
        return;
      }

      const attr = attributes[attrIndex];
      const values = attr.values || [];
      
      if (values.length === 0) {
        generateCombinations(current, attrIndex + 1);
      } else {
        values.forEach((value: ProductAttributeValue) => {
          generateCombinations(
            { ...current, [attr.slug]: value.value },
            attrIndex + 1
          );
        });
      }
    };

    generateCombinations({}, 0);

    // Создаем варианты для каждой комбинации
    const newVariants = combinations.map((attrs, index) => ({
      name: Object.values(attrs).join(' / '),
      price: 0,
      stock: 0,
      attributes: attrs,
    }));

    setValue('variants', newVariants);
  };

  const createMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { data: result } = await api.post('/products', data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      navigate('/products');
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data: ProductFormData) => {
      const { data: result } = await api.put(`/products/${id}`, data);
      return result;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      queryClient.invalidateQueries({ queryKey: ['product', id] });
      navigate('/products');
    },
  });

  const onSubmit = async (data: ProductFormData) => {
    try {
      let productId: number;

      // Создание или обновление товара
      if (isEditMode) {
        await updateMutation.mutateAsync(data);
        productId = parseInt(id!);
      } else {
        const result = await createMutation.mutateAsync(data);
        productId = result.id;
      }

      // Загрузка новых изображений для товара
      const newMediaFiles = mediaItems.filter((item) => !item.id && item.file);
      if (newMediaFiles.length > 0) {
        for (let i = 0; i < newMediaFiles.length; i++) {
          const item = newMediaFiles[i];
          if (item.file) {
            const formData = new FormData();
            formData.append('file', item.file);
            formData.append('order', (mediaItems.length - newMediaFiles.length + i).toString());

            await api.post(`/upload/product/${productId}/media`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
          }
        }
      }

      // Обновление порядка медиа
      if (mediaItems.length > 0) {
        const mediaIds = mediaItems
          .map((item) => item.id)
          .filter((id): id is number => id !== undefined);

        if (mediaIds.length > 0) {
          await api.post('/upload/media/reorder', { mediaIds });
        }
      }

      queryClient.invalidateQueries({ queryKey: ['products-admin'] });
      navigate('/products');
    } catch (error) {
      console.error('Save error:', error);
      alert('Ошибка сохранения товара');
    }
  };

  const addAttributeValue = (attrIndex: number) => {
    const currentAttrs = watch('attributes') || [];
    const attr = currentAttrs[attrIndex];
    const newValues = [...(attr.values || []), { value: '', displayName: '', order: attr.values?.length || 0 }];
    setValue(`attributes.${attrIndex}.values`, newValues);
  };

  const removeAttributeValue = (attrIndex: number, valueIndex: number) => {
    const currentAttrs = watch('attributes') || [];
    const attr = currentAttrs[attrIndex];
    const newValues = attr.values?.filter((_, i) => i !== valueIndex) || [];
    setValue(`attributes.${attrIndex}.values`, newValues);
  };

  if (productLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/80 text-lg">Загрузка...</div>
      </div>
    );
  }

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 relative">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/products')}
          className="flex-shrink-0"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">
            {isEditMode ? 'Редактирование товара' : 'Создание товара'}
          </h1>
          <p className="text-sm sm:text-base text-white/70">Управление товарами</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Основная информация */}
        <Card className="glass-strong border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white font-semibold">Основная информация</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Slug *</label>
                <input
                  {...register('slug', { required: 'Slug обязателен' })}
                  className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="product-slug"
                />
                {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Название *</label>
                <input
                  {...register('name', { required: 'Название обязательно' })}
                  className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="Название товара"
                />
                {errors.name && <p className="text-red-400 text-xs mt-1">{errors.name.message}</p>}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-white mb-2">Описание</label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 resize-none"
                placeholder="Описание товара"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">Категория *</label>
                <select
                  {...register('categoryId', { required: 'Категория обязательна', valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value="">Выберите категорию</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id} className="bg-[#0a0a0a]">
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-red-400 text-xs mt-1">{errors.categoryId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Тип товара *</label>
                <select
                  {...register('productType', { required: true })}
                  className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value={ProductType.SIMPLE} className="bg-[#0a0a0a]">Простой</option>
                  <option value={ProductType.SINGLE_VARIANT} className="bg-[#0a0a0a]">С одним вариантом</option>
                  <option value={ProductType.MATRIX} className="bg-[#0a0a0a]">Матрица</option>
                  <option value={ProductType.RANGE} className="bg-[#0a0a0a]">Диапазон</option>
                  <option value={ProductType.CONFIGURABLE} className="bg-[#0a0a0a]">Настраиваемый</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Единица измерения</label>
                <select
                  {...register('unit')}
                  className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30"
                >
                  <option value={UnitType.PIECE} className="bg-[#0a0a0a]">Штука</option>
                  <option value={UnitType.SQUARE_METER} className="bg-[#0a0a0a]">м²</option>
                  <option value={UnitType.TON} className="bg-[#0a0a0a]">Тонна</option>
                  <option value={UnitType.SET} className="bg-[#0a0a0a]">Комплект</option>
                </select>
              </div>
            </div>

            {productType === ProductType.SIMPLE && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">Базовая цена</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('basePrice', { valueAsNumber: true })}
                  className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                  placeholder="0.00"
                />
              </div>
            )}

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('isActive')}
                className="w-4 h-4 rounded"
              />
              <label className="text-sm text-white">Активен</label>
            </div>
          </CardContent>
        </Card>

        {/* Атрибуты товара */}
        {(productType === ProductType.SINGLE_VARIANT || productType === ProductType.MATRIX || productType === ProductType.CONFIGURABLE) && (
          <Card className="glass-strong border-white/20 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white font-semibold">Атрибуты товара</CardTitle>
              <div className="flex gap-2">
                {productType === ProductType.MATRIX && (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    onClick={generateMatrixVariants}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Сгенерировать варианты
                  </Button>
                )}
                <Button
                  type="button"
                  size="sm"
                  onClick={() => appendAttribute({ name: '', slug: '', type: 'select', order: attributeFields.length, values: [] })}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Добавить атрибут
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {attributeFields.map((field, attrIndex) => (
                <Card key={field.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4 space-y-4">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Название атрибута</label>
                          <input
                            {...register(`attributes.${attrIndex}.name` as const)}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                            placeholder="Например: Размер"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Slug</label>
                          <input
                            {...register(`attributes.${attrIndex}.slug` as const)}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                            placeholder="size"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Тип</label>
                          <select
                            {...register(`attributes.${attrIndex}.type` as const)}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white text-sm"
                          >
                            <option value="select" className="bg-[#0a0a0a]">Выбор</option>
                            <option value="text" className="bg-[#0a0a0a]">Текст</option>
                            <option value="number" className="bg-[#0a0a0a]">Число</option>
                          </select>
                        </div>
                        <div className="flex items-center gap-2">
                          <input
                            type="checkbox"
                            {...register(`attributes.${attrIndex}.isRequired` as const)}
                            className="w-4 h-4 rounded"
                          />
                          <label className="text-sm text-white">Обязательный</label>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeAttribute(attrIndex)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    {/* Значения атрибута */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-sm font-medium text-white">Значения</label>
                        <Button
                          type="button"
                          size="sm"
                          variant="ghost"
                          onClick={() => addAttributeValue(attrIndex)}
                        >
                          <Plus className="h-3 w-3 mr-1" />
                          Добавить значение
                        </Button>
                      </div>
                      {watch(`attributes.${attrIndex}.values`)?.map((value: ProductAttributeValue, valueIndex: number) => (
                        <div key={valueIndex} className="flex gap-2">
                          <input
                            {...register(`attributes.${attrIndex}.values.${valueIndex}.value` as const)}
                            placeholder="Значение"
                            className="flex-1 px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                          />
                          <input
                            {...register(`attributes.${attrIndex}.values.${valueIndex}.displayName` as const)}
                            placeholder="Отображаемое название"
                            className="flex-1 px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => removeAttributeValue(attrIndex, valueIndex)}
                            className="text-red-400"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Изображения товара */}
        <Card className="glass-strong border-white/20 shadow-xl">
          <CardHeader>
            <CardTitle className="text-white font-semibold">Изображения товара</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div
              className="border-2 border-dashed border-white/20 rounded-lg p-8 text-center cursor-pointer transition-all hover:border-white/30 hover:bg-white/5"
              onDragOver={(e) => {
                e.preventDefault();
                e.currentTarget.classList.add('border-white/40', 'bg-white/10');
              }}
              onDragLeave={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-white/40', 'bg-white/10');
              }}
              onDrop={(e) => {
                e.preventDefault();
                e.currentTarget.classList.remove('border-white/40', 'bg-white/10');
                handleFileUpload(e.dataTransfer.files);
              }}
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.multiple = true;
                input.accept = 'image/*';
                input.onchange = (e) => {
                  const files = (e.target as HTMLInputElement).files;
                  handleFileUpload(files);
                };
                input.click();
              }}
            >
              <Upload className="w-12 h-12 mx-auto mb-4 text-white/50" />
              <p className="text-white/80 mb-2">Перетащите изображения сюда или нажмите для выбора</p>
              <p className="text-sm text-white/50">PNG, JPG, WEBP до 10MB</p>
            </div>

            {uploading && (
              <p className="text-sm text-white/70 text-center">Загрузка...</p>
            )}

            {mediaItems.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {mediaItems.map((item, index) => (
                  <div
                    key={item.id || `new-${index}`}
                    className="relative group aspect-square rounded-lg overflow-hidden bg-white/5 border border-white/10 cursor-move"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', index.toString());
                    }}
                    onDragOver={(e) => {
                      e.preventDefault();
                    }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'));
                      if (draggedIndex !== index) {
                        moveMedia(draggedIndex, index);
                      }
                    }}
                  >
                    <img
                      src={item.url}
                      alt={`Media ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeMedia(index)}
                        className="text-white hover:text-red-400"
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <GripVertical className="w-3 h-3" />
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Варианты товара */}
        {(productType === ProductType.SINGLE_VARIANT || productType === ProductType.MATRIX) && (
          <Card className="glass-strong border-white/20 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-white font-semibold">Варианты товара</CardTitle>
              <Button
                type="button"
                size="sm"
                onClick={() => appendVariant({ price: 0, stock: 0 })}
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить вариант
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {variantFields.map((field, variantIndex) => (
                <Card key={field.id} className="bg-white/5 border-white/10">
                  <CardContent className="p-4">
                    <div className="flex items-start justify-between gap-4 mb-4">
                      <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Название</label>
                          <input
                            {...register(`variants.${variantIndex}.name` as const)}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                            placeholder="Название варианта"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">SKU</label>
                          <input
                            {...register(`variants.${variantIndex}.sku` as const)}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                            placeholder="SKU"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Цена *</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register(`variants.${variantIndex}.price` as const, { valueAsNumber: true, required: true })}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Остаток</label>
                          <input
                            type="number"
                            {...register(`variants.${variantIndex}.stock` as const, { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                            placeholder="0"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Вес</label>
                          <input
                            type="number"
                            step="0.01"
                            {...register(`variants.${variantIndex}.weight` as const, { valueAsNumber: true })}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-white mb-2">Единица</label>
                          <select
                            {...register(`variants.${variantIndex}.unit` as const)}
                            className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white text-sm"
                          >
                            <option value={UnitType.PIECE} className="bg-[#0a0a0a]">Штука</option>
                            <option value={UnitType.SQUARE_METER} className="bg-[#0a0a0a]">м²</option>
                            <option value={UnitType.TON} className="bg-[#0a0a0a]">Тонна</option>
                            <option value={UnitType.SET} className="bg-[#0a0a0a]">Комплект</option>
                          </select>
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => removeVariant(variantIndex)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </CardContent>
          </Card>
        )}

        {/* Кнопки действий */}
        <div className="flex gap-4">
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex-1"
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending || updateMutation.isPending ? 'Сохранение...' : 'Сохранить'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/products')}
          >
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
}
