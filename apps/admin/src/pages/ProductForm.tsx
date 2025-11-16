import { useState, useEffect, useCallback } from 'react';
import { useForm, useFieldArray } from 'react-hook-form';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, Save, ArrowLeft, X, Upload, GripVertical, Info, HelpCircle, Sparkles, Package, Tag, Image as ImageIcon, Settings } from 'lucide-react';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';
import AttributeTemplates, { AttributeTemplate } from '../components/AttributeTemplates';
import PriceMatrixEditor from '../components/PriceMatrixEditor';

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

// Описания типов товаров
const PRODUCT_TYPE_INFO = {
  [ProductType.SIMPLE]: {
    title: 'Простой товар',
    description: 'Товар с фиксированной ценой без вариантов. Пример: готовые памятники, стандартные изделия.',
    icon: Package,
    example: 'Готовый памятник за 5000₽',
  },
  [ProductType.SINGLE_VARIANT]: {
    title: 'Товар с одним вариантом',
    description: 'Товар с одним атрибутом (например, размер). Цена зависит от выбранного значения.',
    icon: Tag,
    example: 'Вазы: 200*110 → 1000₽, 250*120 → 1200₽',
  },
  [ProductType.MATRIX]: {
    title: 'Матрица цен',
    description: 'Товар с несколькими атрибутами. Цена формируется из комбинации значений. Пример: размер × сорт. Система автоматически создаст все комбинации и табличный редактор для быстрого заполнения цен.',
    icon: Sparkles,
    example: 'Плита мраморная: Размер (2) × Сорт (2) = 4 варианта. Используйте шаблоны и табличный редактор для удобного управления.',
  },
  [ProductType.RANGE]: {
    title: 'Диапазоны размеров',
    description: 'Товар с диапазонами размеров. Цена зависит от попадания в диапазон.',
    icon: Settings,
    example: 'Заказная плита: 10мм (L до 400мм, W 300мм) = 3200₽/м²',
  },
  [ProductType.CONFIGURABLE]: {
    title: 'Настраиваемый товар',
    description: 'Сложный товар с множеством параметров и дополнительными опциями.',
    icon: Settings,
    example: 'Цветник: размер × обработка (пилен/полир) → цена',
  },
};

export default function ProductForm() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  const queryClient = useQueryClient();
  const isEditMode = !!id;
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([]);
  const [uploading, setUploading] = useState(false);
  const [activeTab, setActiveTab] = useState<'basic' | 'attributes' | 'variants' | 'media'>('basic');
  const [showTemplates, setShowTemplates] = useState(false);

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
  const attributes = watch('attributes') || [];
  const variants = watch('variants') || [];

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

    // Проверяем, что у всех атрибутов есть значения
    const attrsWithValues = attributes.filter((attr) => attr.values && attr.values.length > 0);
    if (attrsWithValues.length === 0) {
      alert('Добавьте значения для атрибутов');
      return;
    }

    // Генерируем все комбинации значений атрибутов
    const combinations: Record<string, string>[] = [];
    
    const generateCombinations = (current: Record<string, string>, attrIndex: number) => {
      if (attrIndex >= attrsWithValues.length) {
        combinations.push({ ...current });
        return;
      }

      const attr = attrsWithValues[attrIndex];
      const values = attr.values || [];
      
      values.forEach((value: ProductAttributeValue) => {
        generateCombinations(
          { ...current, [attr.slug]: value.value },
          attrIndex + 1
        );
      });
    };

    generateCombinations({}, 0);

    // Создаем варианты для каждой комбинации
    const newVariants = combinations.map((attrs, index) => {
      const nameParts = attrsWithValues.map((attr) => {
        const value = attrs[attr.slug];
        const attrValue = attr.values?.find((v) => v.value === value);
        return attrValue?.displayName || value;
      });
      
      return {
        name: nameParts.join(' × '),
        price: 0,
        stock: 0,
        attributes: attrs,
      };
    });

    setValue('variants', newVariants);
    alert(`Создано ${newVariants.length} вариантов`);
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
            const order = mediaItems.findIndex((m) => m === item);
            formData.append('order', order.toString());

            await api.post(`/upload/product/${productId}/media`, formData, {
              headers: {
                'Content-Type': 'multipart/form-data',
              },
            });
          }
        }
      }

      // Обновление порядка медиа (только для существующих медиа)
      const existingMediaIds = mediaItems
        .map((item) => item.id)
        .filter((id): id is number => id !== undefined);

      if (existingMediaIds.length > 0) {
        await api.post('/upload/media/reorder', { mediaIds: existingMediaIds });
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

  // Применение шаблона атрибутов
  const applyTemplate = (template: AttributeTemplate) => {
    const templateAttrs = template.attributes.map((attr, index) => ({
      name: attr.name,
      slug: attr.slug,
      type: attr.type,
      order: index,
      isRequired: true,
      values: attr.values.map((val, valIndex) => ({
        value: val.value,
        displayName: val.displayName,
        order: valIndex,
      })),
    }));
    
    setValue('attributes', templateAttrs);
    setShowTemplates(false);
    
    // Автоматически генерируем варианты для MATRIX типа
    if (productType === ProductType.MATRIX && templateAttrs.length >= 2) {
      setTimeout(() => {
        generateMatrixVariants();
      }, 100);
    }
  };

  // Обработчики для табличного редактора
  const handlePriceChange = (variantIndex: number, price: number) => {
    setValue(`variants.${variantIndex}.price`, price);
  };

  const handleStockChange = (variantIndex: number, stock: number) => {
    setValue(`variants.${variantIndex}.stock`, stock);
  };

  const handleWeightChange = (variantIndex: number, weight: number) => {
    setValue(`variants.${variantIndex}.weight`, weight);
  };

  if (productLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white/80 text-lg">Загрузка...</div>
      </div>
    );
  }

  const typeInfo = PRODUCT_TYPE_INFO[productType];
  const TypeIcon = typeInfo.icon;

  return (
    <div className="space-y-4 sm:space-y-6 p-4 sm:p-6 relative max-w-7xl mx-auto overflow-x-hidden">
      {/* Заголовок */}
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
        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold mb-2 gradient-text">
            {isEditMode ? 'Редактирование товара' : 'Создание товара'}
          </h1>
          <p className="text-sm sm:text-base text-white/70">Управление товарами и их вариантами</p>
        </div>
      </div>

      {/* Информационная карточка о типе товара */}
      {productType && (
        <Card className="glass-strong border-blue-500/30 shadow-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row items-start gap-4">
              <div className="p-3 rounded-lg bg-blue-500/20 border border-blue-500/30 flex-shrink-0">
                <TypeIcon className="h-6 w-6 text-blue-400" />
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-base sm:text-lg font-semibold text-white mb-1 flex items-center gap-2 flex-wrap">
                  {typeInfo.title}
                  <HelpCircle className="h-4 w-4 text-white/50 flex-shrink-0" />
                </h3>
                <p className="text-xs sm:text-sm text-white/80 mb-2 break-words">{typeInfo.description}</p>
                <div className="flex items-start gap-2 text-xs text-blue-300/80 bg-blue-500/10 px-3 py-1.5 rounded-lg border border-blue-500/20">
                  <Info className="h-3 w-3 flex-shrink-0 mt-0.5" />
                  <span className="break-words">Пример: {typeInfo.example}</span>
                </div>
                {productType === ProductType.MATRIX && (
                  <div className="mt-3 pt-3 border-t border-blue-500/20">
                    <p className="text-xs text-blue-200/90 mb-2 font-medium">💡 Как работать с матрицей:</p>
                    <ol className="text-xs text-blue-200/70 space-y-1 list-decimal list-inside">
                      <li>Выберите шаблон или создайте атрибуты вручную</li>
                      <li>Нажмите "Сгенерировать варианты"</li>
                      <li>Используйте табличный редактор для заполнения цен</li>
                      <li>Кликните на ячейку для редактирования</li>
                    </ol>
                  </div>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Вкладки */}
      <div className="flex gap-1 sm:gap-2 border-b border-white/10 pb-2 overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
        {[
          { id: 'basic', label: 'Основное', icon: Package },
          { id: 'attributes', label: 'Атрибуты', icon: Tag, count: attributes.length, required: [ProductType.SINGLE_VARIANT, ProductType.MATRIX, ProductType.CONFIGURABLE].includes(productType) },
          { id: 'variants', label: 'Варианты', icon: Sparkles, count: variants.length, required: [ProductType.SINGLE_VARIANT, ProductType.MATRIX].includes(productType) },
          { id: 'media', label: 'Изображения', icon: ImageIcon, count: mediaItems.length },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-1 sm:gap-2 px-2 sm:px-4 py-2 rounded-t-lg transition-all whitespace-nowrap flex-shrink-0
                ${isActive 
                  ? 'bg-white/10 text-white border-b-2 border-blue-400' 
                  : 'text-white/60 hover:text-white hover:bg-white/5'
                }
              `}
            >
              <TabIcon className="h-4 w-4 flex-shrink-0" />
              <span className="text-xs sm:text-sm font-medium hidden sm:inline">{tab.label}</span>
              <span className="text-xs sm:text-sm font-medium sm:hidden">{tab.label.split(' ')[0]}</span>
              {tab.count !== undefined && (
                <span className={`text-xs px-1.5 sm:px-2 py-0.5 rounded-full flex-shrink-0 ${isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-white/10 text-white/60'}`}>
                  {tab.count}
                </span>
              )}
              {tab.required && (
                <span className="text-xs text-red-400 flex-shrink-0">*</span>
              )}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Основная информация */}
        {activeTab === 'basic' && (
          <Card className="glass-strong border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white font-semibold flex items-center gap-2">
                <Package className="h-5 w-5" />
                Основная информация
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Slug *
                  <span className="text-xs text-white/50 ml-2 hidden sm:inline">(URL-адрес товара)</span>
                </label>
                <input
                  {...register('slug', { required: 'Slug обязателен' })}
                  className="w-full px-3 sm:px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm sm:text-base"
                  placeholder="product-slug"
                />
                {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Название *</label>
                <input
                  {...register('name', { required: 'Название обязательно' })}
                  className="w-full px-3 sm:px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30 text-sm sm:text-base"
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
                  placeholder="Подробное описание товара..."
                />
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Категория *
                  <HelpCircle className="h-3 w-3 inline-block ml-1 text-white/50" title="Выберите категорию товара" />
                </label>
                <select
                  {...register('categoryId', { required: 'Категория обязательна', valueAsNumber: true })}
                  className="w-full px-3 sm:px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 text-sm sm:text-base"
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
                <label className="block text-sm font-medium text-white mb-2">
                  Тип товара *
                  <HelpCircle className="h-3 w-3 inline-block ml-1 text-white/50" title="Выберите тип товара в зависимости от сложности ценообразования" />
                </label>
                <select
                  {...register('productType', { required: true })}
                  className="w-full px-3 sm:px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 text-sm sm:text-base"
                >
                  <option value={ProductType.SIMPLE} className="bg-[#0a0a0a]">Простой</option>
                  <option value={ProductType.SINGLE_VARIANT} className="bg-[#0a0a0a]">С одним вариантом</option>
                  <option value={ProductType.MATRIX} className="bg-[#0a0a0a]">Матрица</option>
                  <option value={ProductType.RANGE} className="bg-[#0a0a0a]">Диапазон</option>
                  <option value={ProductType.CONFIGURABLE} className="bg-[#0a0a0a]">Настраиваемый</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Единица измерения
                  <HelpCircle className="h-3 w-3 inline-block ml-1 text-white/50" title="Единица измерения для цены и остатков" />
                </label>
                <select
                  {...register('unit')}
                  className="w-full px-3 sm:px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white focus:outline-none focus:ring-2 focus:ring-white/30 text-sm sm:text-base"
                >
                  <option value={UnitType.PIECE} className="bg-[#0a0a0a]">Штука (шт)</option>
                  <option value={UnitType.SQUARE_METER} className="bg-[#0a0a0a]">Квадратный метр (м²)</option>
                  <option value={UnitType.TON} className="bg-[#0a0a0a]">Тонна (Т)</option>
                  <option value={UnitType.SET} className="bg-[#0a0a0a]">Комплект (компл)</option>
                </select>
              </div>
            </div>

              {productType === ProductType.SIMPLE && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Базовая цена
                    <span className="text-xs text-white/50 ml-2">(для простых товаров)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('basePrice', { valueAsNumber: true })}
                    className="w-full px-4 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-white/30"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="flex items-center gap-2 p-4 bg-white/5 rounded-lg border border-white/10">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="w-4 h-4 rounded"
                  id="isActive"
                />
                <label htmlFor="isActive" className="text-sm text-white cursor-pointer">
                  Товар активен и отображается в каталоге
                </label>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Атрибуты товара */}
        {activeTab === 'attributes' && (
          <>
            {/* Шаблоны атрибутов */}
            {(productType === ProductType.SINGLE_VARIANT || productType === ProductType.MATRIX) && (
              <div className="space-y-4">
                {!showTemplates && attributeFields.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => setShowTemplates(true)}
                    className="w-full border-blue-400/50 text-blue-300 hover:bg-blue-500/20"
                  >
                    <Sparkles className="h-4 w-4 mr-2" />
                    Выбрать шаблон атрибутов из прайс-листов
                  </Button>
                )}
                {showTemplates && (
                  <>
                    <AttributeTemplates
                      productType={productType}
                      onSelectTemplate={applyTemplate}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      onClick={() => setShowTemplates(false)}
                      className="w-full"
                    >
                      Скрыть шаблоны
                    </Button>
                  </>
                )}
              </div>
            )}

            <Card className="glass-strong border-white/20 shadow-xl">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div>
                  <CardTitle className="text-white font-semibold flex items-center gap-2">
                    <Tag className="h-5 w-5" />
                    Атрибуты товара
                  </CardTitle>
                  <p className="text-sm text-white/60 mt-1">
                    Атрибуты определяют варианты товара. Например: Размер, Сорт, Высота, Диаметр
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  {productType === ProductType.MATRIX && attributeFields.length >= 2 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      onClick={generateMatrixVariants}
                      className="border-blue-400/50 text-blue-300 hover:bg-blue-500/20"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
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
              {attributeFields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/20 rounded-lg">
                  <Tag className="h-12 w-12 mx-auto mb-4 text-white/30" />
                  <p className="text-white/70 mb-2">Атрибуты не добавлены</p>
                  <p className="text-sm text-white/50 mb-4">
                    {productType === ProductType.MATRIX 
                      ? 'Добавьте атрибуты (например, Размер и Сорт) для создания матрицы цен'
                      : 'Добавьте атрибут для создания вариантов товара'
                    }
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => appendAttribute({ name: '', slug: '', type: 'select', order: 0, values: [] })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить первый атрибут
                  </Button>
                </div>
              ) : (
                attributeFields.map((field, attrIndex) => (
                  <Card key={field.id} className="bg-white/5 border-white/10">
                    <CardContent className="p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Название атрибута *
                              <span className="text-xs text-white/50 ml-2">(например: Размер, Сорт, Высота)</span>
                            </label>
                            <input
                              {...register(`attributes.${attrIndex}.name` as const, { required: true })}
                              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                              placeholder="Размер"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Slug *
                              <span className="text-xs text-white/50 ml-2">(латиница, без пробелов)</span>
                            </label>
                            <input
                              {...register(`attributes.${attrIndex}.slug` as const, { required: true })}
                              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm"
                              placeholder="size"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">Тип атрибута</label>
                            <select
                              {...register(`attributes.${attrIndex}.type` as const)}
                              className="w-full px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white text-sm"
                            >
                              <option value="select" className="bg-[#0a0a0a]">Выбор из списка</option>
                              <option value="text" className="bg-[#0a0a0a]">Текст</option>
                              <option value="number" className="bg-[#0a0a0a]">Число</option>
                            </select>
                          </div>
                        <div className="flex items-center gap-2 sm:pt-6">
                          <input
                            type="checkbox"
                            {...register(`attributes.${attrIndex}.isRequired` as const)}
                            className="w-4 h-4 rounded flex-shrink-0"
                            id={`required-${attrIndex}`}
                          />
                          <label htmlFor={`required-${attrIndex}`} className="text-sm text-white cursor-pointer">
                            Обязательный для выбора
                          </label>
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
                      <div className="space-y-2 pt-2 border-t border-white/10">
                        <div className="flex items-center justify-between">
                          <label className="text-sm font-medium text-white">
                            Значения атрибута *
                            <span className="text-xs text-white/50 ml-2">(варианты для выбора)</span>
                          </label>
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
                        {watch(`attributes.${attrIndex}.values`)?.length === 0 ? (
                          <div className="text-center py-4 border border-dashed border-white/10 rounded-lg bg-white/5">
                            <p className="text-sm text-white/50 mb-2">Нет значений</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => addAttributeValue(attrIndex)}
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Добавить первое значение
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-2">
                            {watch(`attributes.${attrIndex}.values`)?.map((value: ProductAttributeValue, valueIndex: number) => (
                              <div key={valueIndex} className="flex flex-col sm:flex-row gap-2">
                                <input
                                  {...register(`attributes.${attrIndex}.values.${valueIndex}.value` as const, { required: true })}
                                  placeholder="Значение (для системы)"
                                  className="flex-1 px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm min-w-0"
                                />
                                <input
                                  {...register(`attributes.${attrIndex}.values.${valueIndex}.displayName` as const, { required: true })}
                                  placeholder="Отображаемое название"
                                  className="flex-1 px-3 py-2 border border-white/20 rounded-lg bg-white/10 text-white placeholder:text-white/50 text-sm min-w-0"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttributeValue(attrIndex, valueIndex)}
                                  className="text-red-400 flex-shrink-0"
                                >
                                  <X className="h-4 w-4" />
                                </Button>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                ))
              )}
            </CardContent>
          </Card>
        )}

        {/* Варианты товара */}
        {activeTab === 'variants' && (
          <Card className="glass-strong border-white/20 shadow-xl">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-white font-semibold flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  Варианты товара
                </CardTitle>
                <p className="text-sm text-white/60 mt-1">
                  Варианты определяют конкретные комбинации атрибутов и их цены
                </p>
              </div>
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
              {variantFields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/20 rounded-lg">
                  <Sparkles className="h-12 w-12 mx-auto mb-4 text-white/30" />
                  <p className="text-white/70 mb-2">Варианты не добавлены</p>
                  <p className="text-sm text-white/50 mb-4">
                    {productType === ProductType.MATRIX
                      ? 'Нажмите "Сгенерировать варианты" на вкладке Атрибуты для автоматического создания всех комбинаций'
                      : 'Добавьте варианты товара с разными характеристиками и ценами'
                    }
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => appendVariant({ price: 0, stock: 0 })}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить первый вариант
                  </Button>
                </div>
              ) : (
                <>
                  {/* Табличный редактор цен для MATRIX типа */}
                  {productType === ProductType.MATRIX && attributes.length === 2 && variants.length > 0 && (
                    <PriceMatrixEditor
                      attributes={attributes}
                      variants={variants}
                      onPriceChange={handlePriceChange}
                      onStockChange={handleStockChange}
                      onWeightChange={handleWeightChange}
                    />
                  )}

                  {/* Визуализация матрицы для MATRIX типа (если больше 2 атрибутов) */}
                  {productType === ProductType.MATRIX && attributes.length > 2 && variants.length > 0 && (
                    <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30 mb-4">
                      <CardContent className="p-4">
                        <div className="flex items-center gap-2 mb-3">
                          <Sparkles className="h-4 w-4 text-purple-400" />
                          <span className="text-sm font-medium text-white">Матрица цен</span>
                        </div>
                        <div className="overflow-x-auto -mx-4 px-4">
                          <table className="w-full text-sm min-w-full">
                            <thead>
                              <tr className="border-b border-white/10">
                                {attributes.map((attr) => (
                                  <th key={attr.slug} className="text-left py-2 px-2 sm:px-3 text-white/80 font-medium whitespace-nowrap min-w-[100px]">
                                    {attr.name}
                                  </th>
                                ))}
                                <th className="text-right py-2 px-2 sm:px-3 text-white/80 font-medium whitespace-nowrap">Цена</th>
                              </tr>
                            </thead>
                            <tbody>
                              {variants.slice(0, 10).map((variant: ProductVariant, idx: number) => (
                                <tr key={idx} className="border-b border-white/5 hover:bg-white/5">
                                  {attributes.map((attr) => (
                                    <td key={attr.slug} className="py-2 px-2 sm:px-3 text-white/70 whitespace-nowrap">
                                      {variant.attributes?.[attr.slug] || '-'}
                                    </td>
                                  ))}
                                  <td className="py-2 px-2 sm:px-3 text-right text-white font-semibold whitespace-nowrap">
                                    {variant.price} ₽
                                  </td>
                                </tr>
                              ))}
                              {variants.length > 10 && (
                                <tr>
                                  <td colSpan={attributes.length + 1} className="py-2 px-3 text-center text-white/50 text-xs">
                                    ... и еще {variants.length - 10} вариантов
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  {/* Список вариантов */}
                  {variantFields.map((field, variantIndex) => {
                    const variant = variants[variantIndex];
                    const attrDisplay = variant?.attributes 
                      ? Object.entries(variant.attributes).map(([key, value]) => {
                          const attr = attributes.find((a) => a.slug === key);
                          const attrValue = attr?.values?.find((v) => v.value === value);
                          return attrValue?.displayName || value;
                        }).join(' × ')
                      : '';

                    return (
                      <Card key={field.id} className="bg-white/5 border-white/10">
                        <CardContent className="p-4">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                            <div className="flex-1 w-full">
                              {attrDisplay && (
                                <div className="mb-3 flex items-center gap-2 flex-wrap">
                                  <span className="text-xs font-medium text-blue-300 bg-blue-500/20 px-2 py-1 rounded border border-blue-500/30 break-words">
                                    {attrDisplay}
                                  </span>
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
                                  <label className="block text-sm font-medium text-white mb-2">
                                    Цена *
                                    <span className="text-xs text-white/50 ml-1">(₽)</span>
                                  </label>
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
                                  <label className="block text-sm font-medium text-white mb-2">Вес (кг)</label>
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
                            </div>
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => removeVariant(variantIndex)}
                              className="text-red-400 hover:text-red-300 flex-shrink-0 self-start sm:self-auto"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </>
              )}
            </CardContent>
          </Card>
        )}

        {/* Изображения товара */}
        {activeTab === 'media' && (
          <Card className="glass-strong border-white/20 shadow-xl">
            <CardHeader>
              <CardTitle className="text-white font-semibold flex items-center gap-2">
                <ImageIcon className="h-5 w-5" />
                Изображения товара
              </CardTitle>
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
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
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
                      <div className="absolute top-1.5 left-1.5 sm:top-2 sm:left-2 bg-black/70 text-white text-xs px-1.5 sm:px-2 py-0.5 sm:py-1 rounded flex items-center gap-1">
                        <GripVertical className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="text-xs">{index + 1}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Кнопки действий */}
        <div className="flex flex-col sm:flex-row gap-3 sm:gap-4 pt-4 border-t border-white/10 sticky bottom-0 bg-background/95 backdrop-blur-sm pb-4 -mx-4 sm:mx-0 px-4 sm:px-0">
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex-1 w-full sm:w-auto"
          >
            <Save className="h-4 w-4 mr-2" />
            {createMutation.isPending || updateMutation.isPending ? 'Сохранение...' : 'Сохранить товар'}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/products')}
            className="w-full sm:w-auto"
          >
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
}
