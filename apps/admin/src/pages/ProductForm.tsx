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
import SpecificationsEditor from '../components/SpecificationsEditor';

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
  material?: 'MARBLE' | 'GRANITE';
  isActive: boolean;
  attributes?: ProductAttribute[];
  variants?: ProductVariant[];
  specifications?: Record<string, string>;
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
  const [activeTab, setActiveTab] = useState<'basic' | 'attributes' | 'variants' | 'specifications' | 'media'>('basic');
  const [showTemplates, setShowTemplates] = useState(false);

  // Получение категорий (только активные, без ритуальных)
  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/categories?activeOnly=true');
      // Фильтруем только основные категории (marble-* и granite-*), исключаем ritual-*
      return data.filter((cat: any) => 
        cat.isActive && 
        (cat.slug.startsWith('marble-') || cat.slug.startsWith('granite-'))
      );
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
      material: undefined,
      attributes: [],
      variants: [],
      specifications: {},
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
      setValue('material', product.material || undefined);
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
    if (!item) return;
    
    // Подтверждение удаления
    const confirmed = window.confirm('Вы уверены, что хотите удалить это изображение?');
    if (!confirmed) return;
    
    if (item.id) {
      try {
        await api.delete(`/upload/media/${item.id}`);
      } catch (error) {
        console.error('Delete error:', error);
        alert('Не удалось удалить изображение. Попробуйте ещё раз.');
        return;
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
      try {
        // Убеждаемся, что categoryId - число
        // Формируем payload только с нужными полями
        let categoryId: number | undefined;
        if (data.categoryId !== undefined && data.categoryId !== null) {
          const parsed = typeof data.categoryId === 'string' ? parseInt(data.categoryId, 10) : Number(data.categoryId);
          if (!isNaN(parsed) && parsed > 0) {
            categoryId = parsed;
          }
        }
        
        const payload: any = {
          slug: data.slug,
          name: data.name,
          description: data.description || undefined,
          categoryId: categoryId,
          productType: data.productType,
          basePrice: data.basePrice !== undefined && data.basePrice !== null ? Number(data.basePrice) : undefined,
          unit: data.unit,
          material: data.material && data.material.trim() !== '' ? data.material : undefined,
          isActive: data.isActive !== undefined ? Boolean(data.isActive) : true,
        };
        
        // Очищаем атрибуты от служебных полей (id, productId, attributeId)
        if (data.attributes && data.attributes.length > 0) {
          payload.attributes = data.attributes.map((attr: any) => {
            const { id, productId, attributeId, createdAt, updatedAt, ...cleanAttr } = attr;
            return {
              name: cleanAttr.name,
              slug: cleanAttr.slug,
              type: cleanAttr.type || 'select',
              order: cleanAttr.order ?? 0,
              isRequired: cleanAttr.isRequired !== undefined ? Boolean(cleanAttr.isRequired) : true,
              unit: cleanAttr.unit || undefined,
              values: (attr.values || []).map((val: any) => {
                const { id: valId, attributeId: valAttrId, createdAt: valCreatedAt, updatedAt: valUpdatedAt, ...cleanVal } = val;
                return {
                  value: cleanVal.value,
                  displayName: cleanVal.displayName,
                  order: cleanVal.order ?? 0,
                  metadata: cleanVal.metadata || undefined,
                };
              }),
            };
          });
        }
        
        // Очищаем варианты от служебных полей (id, productId, createdAt, updatedAt)
        if (data.variants && data.variants.length > 0) {
          payload.variants = data.variants.map((variant: any) => {
            const { id, productId, createdAt, updatedAt, ...cleanVariant } = variant;
            return {
              name: cleanVariant.name || undefined,
              sku: cleanVariant.sku || undefined,
              price: Number(cleanVariant.price) || 0,
              stock: cleanVariant.stock !== undefined ? Number(cleanVariant.stock) : 0,
              weight: cleanVariant.weight !== undefined && cleanVariant.weight !== null ? Number(cleanVariant.weight) : undefined,
              unit: cleanVariant.unit || undefined,
              attributes: cleanVariant.attributes || {},
              metadata: cleanVariant.metadata || undefined,
              isActive: cleanVariant.isActive !== undefined ? Boolean(cleanVariant.isActive) : true,
            };
          });
        }
        
        if (data.specifications && Object.keys(data.specifications).length > 0) {
          payload.specifications = data.specifications;
        }
        
        // Удаляем undefined значения из payload, но сохраняем обязательные поля
        const cleanPayload: any = {};
        Object.entries(payload).forEach(([key, value]) => {
          // Сохраняем обязательные поля даже если они undefined (валидация сама проверит)
          if (key === 'categoryId' || key === 'slug' || key === 'name' || key === 'productType') {
            cleanPayload[key] = value;
          } else if (value !== undefined) {
            cleanPayload[key] = value;
          }
        });
        
        // Для вложенных объектов также удаляем undefined
        if (cleanPayload.attributes) {
          cleanPayload.attributes = cleanPayload.attributes.map((attr: any) => {
            const cleaned = Object.fromEntries(
              Object.entries(attr).filter(([_, value]) => {
                if (Array.isArray(value)) {
                  return value.length > 0;
                }
                return value !== undefined;
              })
            );
            if (cleaned.values && Array.isArray(cleaned.values)) {
              cleaned.values = (cleaned.values as any[]).map((val: any) => 
                Object.fromEntries(
                  Object.entries(val).filter(([_, v]) => v !== undefined)
                )
              );
            }
            return cleaned;
          });
        }
        
        if (cleanPayload.variants) {
          cleanPayload.variants = cleanPayload.variants.map((variant: any) =>
            Object.fromEntries(
              Object.entries(variant).filter(([_, value]) => value !== undefined)
            )
          );
        }
        
        console.log('Sending update payload:', JSON.stringify(cleanPayload, null, 2));
        const { data: result } = await api.put(`/products/${id}`, cleanPayload);
        return result;
      } catch (error: any) {
        console.error('Error updating product:', error);
        console.error('Error response:', error.response?.data);
        console.error('Error status:', error.response?.status);
        console.error('Full payload:', data);
        // Пробрасываем ошибку дальше для обработки в onSubmit
        throw error;
      }
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
    } catch (error: any) {
      console.error('Save error:', error);
      
      // Формируем понятное сообщение об ошибке
      let errorMessage = 'Ошибка сохранения товара';
      
      if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.response?.status === 400) {
        errorMessage = 'Некорректные данные. Проверьте все поля формы.';
      } else if (error.response?.status === 404) {
        errorMessage = 'Товар или категория не найдены.';
      } else if (error.response?.status === 500) {
        errorMessage = 'Внутренняя ошибка сервера. Проверьте логи сервера.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      alert(errorMessage);
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
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mb-4" />
          <div className="text-white/80 text-lg font-medium">Загрузка товара...</div>
        </div>
      </div>
    );
  }

  const typeInfo = PRODUCT_TYPE_INFO[productType];
  const TypeIcon = typeInfo.icon;

  return (
    <div className="space-y-6 p-6 relative max-w-7xl mx-auto overflow-x-hidden animate-fade-in">
      {/* Premium Header */}
      <div className="flex items-center gap-4 mb-8">
        <Button
          variant="ghost"
          size="sm"
          onClick={() => navigate('/products')}
          className="flex-shrink-0 text-white/80 hover:text-white hover:bg-white/10 border border-white/10 rounded-lg"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Назад
        </Button>
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
              <Package className="h-6 w-6 text-blue-400" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold gradient-text">
              {isEditMode ? 'Редактирование товара' : 'Создание товара'}
            </h1>
          </div>
          <p className="text-sm sm:text-base text-white/70 font-medium ml-14">
            Управление товарами и их вариантами
          </p>
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
                <h3 className="text-base sm:text-lg font-bold text-white mb-2 flex items-center gap-2 flex-wrap">
                  {typeInfo.title}
                  <HelpCircle className="h-4 w-4 text-white/70 flex-shrink-0" />
                </h3>
                <p className="text-xs sm:text-sm text-white/95 mb-3 break-words font-medium leading-relaxed">{typeInfo.description}</p>
                <div className="flex items-start gap-2 text-xs sm:text-sm text-blue-200 bg-blue-500/20 px-4 py-2 rounded-lg border-2 border-blue-400/40 font-semibold shadow-md">
                  <Info className="h-4 w-4 flex-shrink-0 mt-0.5 text-blue-300" />
                  <span className="break-words">Пример: {typeInfo.example}</span>
                </div>
                {productType === ProductType.MATRIX && (
                  <div className="mt-4 pt-4 border-t-2 border-blue-400/30">
                    <p className="text-xs sm:text-sm text-blue-200 mb-3 font-bold">💡 Как работать с матрицей:</p>
                    <ol className="text-xs sm:text-sm text-white/90 space-y-1.5 list-decimal list-inside font-medium leading-relaxed">
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

      {/* Premium Tabs */}
      <div className="flex gap-2 border-b border-white/10 pb-2 overflow-x-auto">
        {[
          { id: 'basic', label: 'Основное', icon: Package },
          { id: 'attributes', label: 'Атрибуты', icon: Tag, count: attributes.length, required: [ProductType.SINGLE_VARIANT, ProductType.MATRIX, ProductType.CONFIGURABLE].includes(productType) },
          { id: 'variants', label: 'Варианты', icon: Sparkles, count: variants.length, required: [ProductType.SINGLE_VARIANT, ProductType.MATRIX].includes(productType) },
          { id: 'specifications', label: 'Характеристики', icon: Settings, count: Object.keys(watch('specifications') || {}).length },
          { id: 'media', label: 'Изображения', icon: ImageIcon, count: mediaItems.length },
        ].map((tab) => {
          const TabIcon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`
                flex items-center gap-2 px-4 py-3 rounded-t-xl transition-all whitespace-nowrap flex-shrink-0 relative
                ${isActive 
                  ? 'bg-gradient-to-b from-white/15 to-white/5 text-white border-b-2 border-blue-400 shadow-lg' 
                  : 'text-white/70 hover:text-white hover:bg-white/5 border-b-2 border-transparent'
                }
              `}
            >
              <TabIcon className={`h-4 w-4 flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`} />
              <span className="text-sm font-semibold">{tab.label}</span>
              {tab.count !== undefined && (
                <span className={`text-xs px-2 py-0.5 rounded-full flex-shrink-0 font-bold ${isActive ? 'bg-blue-500/30 text-blue-300' : 'bg-white/15 text-white/70'}`}>
                  {tab.count}
                </span>
              )}
              {tab.required && (
                <span className="text-xs text-red-400 flex-shrink-0 font-bold">*</span>
              )}
            </button>
          );
        })}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {/* Основная информация */}
        {activeTab === 'basic' && (
          <Card className="glass-strong border-white/20 shadow-xl animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
                  <Package className="h-5 w-5 text-blue-400" />
                </div>
                <CardTitle className="text-white font-semibold text-lg">Основная информация</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-6">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Slug *
                  <span className="text-xs text-white/70 ml-2 hidden sm:inline font-medium">(URL-адрес товара)</span>
                </label>
                <input
                  {...register('slug', { required: 'Slug обязателен' })}
                  className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                  placeholder="product-slug"
                />
                {errors.slug && <p className="text-red-400 text-xs mt-1">{errors.slug.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">Название *</label>
                <input
                  {...register('name', { required: 'Название обязательно' })}
                  className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
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
                  className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm resize-none font-medium [color-scheme:dark]"
                  placeholder="Подробное описание товара..."
                />
              </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Категория *
                  <span title="Выберите категорию товара"><HelpCircle className="h-3 w-3 inline-block ml-1 text-white/70" /></span>
                </label>
                <select
                  {...register('categoryId', { required: 'Категория обязательна', valueAsNumber: true })}
                  className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                >
                  <option value="" className="bg-[#0a0a0a] text-white">Выберите категорию</option>
                  {categories?.map((cat: any) => (
                    <option key={cat.id} value={cat.id} className="bg-[#0a0a0a] text-white">
                      {cat.name}
                    </option>
                  ))}
                </select>
                {errors.categoryId && <p className="text-red-400 text-xs mt-1">{errors.categoryId.message}</p>}
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Тип товара *
                  <span title="Выберите тип товара в зависимости от сложности ценообразования"><HelpCircle className="h-3 w-3 inline-block ml-1 text-white/70" /></span>
                </label>
                <select
                  {...register('productType', { required: true })}
                  className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                >
                  <option value={ProductType.SIMPLE} className="bg-[#0a0a0a] text-white">Простой</option>
                  <option value={ProductType.SINGLE_VARIANT} className="bg-[#0a0a0a] text-white">С одним вариантом</option>
                  <option value={ProductType.MATRIX} className="bg-[#0a0a0a] text-white">Матрица</option>
                  <option value={ProductType.RANGE} className="bg-[#0a0a0a] text-white">Диапазон</option>
                  <option value={ProductType.CONFIGURABLE} className="bg-[#0a0a0a] text-white">Настраиваемый</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Единица измерения
                  <span title="Единица измерения для цены и остатков"><HelpCircle className="h-3 w-3 inline-block ml-1 text-white/70" /></span>
                </label>
                <select
                  {...register('unit')}
                  className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                >
                  <option value={UnitType.PIECE} className="bg-[#0a0a0a] text-white">Штука (шт)</option>
                  <option value={UnitType.SQUARE_METER} className="bg-[#0a0a0a] text-white">Квадратный метр (м²)</option>
                  <option value={UnitType.TON} className="bg-[#0a0a0a] text-white">Тонна (Т)</option>
                  <option value={UnitType.SET} className="bg-[#0a0a0a] text-white">Комплект (компл)</option>
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Материал
                  <span title="Тип материала: мрамор или гранит"><HelpCircle className="h-3 w-3 inline-block ml-1 text-white/70" /></span>
                </label>
                <select
                  {...register('material')}
                  className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                >
                  <option value="" className="bg-[#0a0a0a] text-white">Не указан</option>
                  <option value="MARBLE" className="bg-[#0a0a0a] text-white">Мрамор</option>
                  <option value="GRANITE" className="bg-[#0a0a0a] text-white">Гранит</option>
                </select>
              </div>
            </div>

              {productType === ProductType.SIMPLE && (
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Базовая цена
                    <span className="text-xs text-white/75 ml-2 font-medium">(для простых товаров)</span>
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('basePrice', { valueAsNumber: true })}
                    className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                    placeholder="0.00"
                  />
                </div>
              )}

              <div className="flex items-center gap-3 p-4 bg-white/10 rounded-xl border border-white/20 shadow-lg hover:bg-white/15 transition-all">
                <input
                  type="checkbox"
                  {...register('isActive')}
                  className="w-5 h-5 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                  id="isActive"
                />
                <label htmlFor="isActive" className="text-sm font-semibold text-white cursor-pointer">
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
                    className="w-full border-2 border-blue-400/70 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 hover:border-blue-400 font-semibold shadow-lg hover:shadow-xl transition-all"
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
                      className="w-full text-white/90 hover:text-white hover:bg-white/10 font-semibold border border-white/20"
                    >
                      Скрыть шаблоны
                    </Button>
                  </>
                )}
              </div>
            )}

            <Card className="glass-strong border-white/20 shadow-xl animate-fade-in">
              <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
                      <Tag className="h-5 w-5 text-purple-400" />
                    </div>
                    <CardTitle className="text-white font-semibold text-lg">Атрибуты товара</CardTitle>
                  </div>
                  <p className="text-sm text-white/70 font-medium ml-10">
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
                      className="border-blue-400/50 text-blue-300 hover:bg-blue-500/20 hover:border-blue-400 font-semibold"
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Сгенерировать варианты
                    </Button>
                  )}
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => appendAttribute({ name: '', slug: '', type: 'select', order: attributeFields.length, values: [] })}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 font-semibold shadow-lg shadow-blue-500/25"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить атрибут
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
              {attributeFields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/20 rounded-xl bg-white/5">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Tag className="h-8 w-8 text-white/40" />
                  </div>
                  <p className="text-white/90 mb-2 font-bold text-lg">Атрибуты не добавлены</p>
                  <p className="text-sm text-white/70 mb-6 font-medium">
                    {productType === ProductType.MATRIX 
                      ? 'Добавьте атрибуты (например, Размер и Сорт) для создания матрицы цен'
                      : 'Добавьте атрибут для создания вариантов товара'
                    }
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => appendAttribute({ name: '', slug: '', type: 'select', order: 0, values: [] })}
                    className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white border-0 font-semibold"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Добавить первый атрибут
                  </Button>
                </div>
              ) : (
                attributeFields.map((field, attrIndex) => (
                  <Card key={field.id} className="glass-strong border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: `${attrIndex * 50}ms` }}>
                    <CardContent className="p-4 space-y-4">
                      <div className="flex flex-col sm:flex-row items-start justify-between gap-4">
                        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">
                              Название атрибута *
                              <span className="text-xs text-white/75 ml-2 font-medium">(например: Размер, Сорт, Высота)</span>
                            </label>
                            <input
                              {...register(`attributes.${attrIndex}.name` as const, { required: true })}
                              className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
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
                              className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium font-mono [color-scheme:dark]"
                              placeholder="size"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-white mb-2">Тип атрибута</label>
                            <select
                              {...register(`attributes.${attrIndex}.type` as const)}
                              className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm [color-scheme:dark]"
                            >
                              <option value="select" className="bg-[#0a0a0a] text-white">Выбор из списка</option>
                              <option value="text" className="bg-[#0a0a0a] text-white">Текст</option>
                              <option value="number" className="bg-[#0a0a0a] text-white">Число</option>
                            </select>
                          </div>
                        <div className="flex items-center gap-3 sm:pt-6 p-3 rounded-lg bg-white/5 border border-white/10">
                          <input
                            type="checkbox"
                            {...register(`attributes.${attrIndex}.isRequired` as const)}
                            className="w-5 h-5 rounded border-white/30 bg-white/10 text-blue-500 focus:ring-2 focus:ring-blue-500/50 cursor-pointer"
                            id={`required-${attrIndex}`}
                          />
                          <label htmlFor={`required-${attrIndex}`} className="text-sm font-semibold text-white cursor-pointer">
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
                        <div className="flex items-center justify-between mb-3">
                          <label className="text-sm font-semibold text-white/90">
                            Значения атрибута *
                            <span className="text-xs text-white/60 ml-2 font-medium">(варианты для выбора)</span>
                          </label>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => addAttributeValue(attrIndex)}
                            className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold"
                          >
                            <Plus className="h-3 w-3 mr-1" />
                            Добавить значение
                          </Button>
                        </div>
                        {watch(`attributes.${attrIndex}.values`)?.length === 0 ? (
                          <div className="text-center py-6 border-2 border-dashed border-white/25 rounded-xl bg-white/5">
                            <div className="w-12 h-12 mx-auto mb-3 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                              <Tag className="h-6 w-6 text-white/40" />
                            </div>
                            <p className="text-sm text-white/90 mb-3 font-bold">Нет значений</p>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => addAttributeValue(attrIndex)}
                              className="bg-white/10 hover:bg-white/15 border border-white/20 text-white font-semibold"
                            >
                              <Plus className="h-3 w-3 mr-1" />
                              Добавить первое значение
                            </Button>
                          </div>
                        ) : (
                          <div className="space-y-3">
                            {watch(`attributes.${attrIndex}.values`)?.map((value: ProductAttributeValue, valueIndex: number) => (
                              <div 
                                key={valueIndex} 
                                className="flex flex-col sm:flex-row gap-2 p-3 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all animate-fade-in"
                                style={{ animationDelay: `${valueIndex * 30}ms` }}
                              >
                                <input
                                  {...register(`attributes.${attrIndex}.values.${valueIndex}.value` as const, { required: true })}
                                  placeholder="Значение (для системы)"
                                  className="flex-1 px-4 py-2.5 border border-white/25 rounded-lg bg-white/12 text-white placeholder:text-white/50 text-sm min-w-0 font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm [color-scheme:dark]"
                                />
                                <input
                                  {...register(`attributes.${attrIndex}.values.${valueIndex}.displayName` as const, { required: true })}
                                  placeholder="Отображаемое название"
                                  className="flex-1 px-4 py-2.5 border border-white/25 rounded-lg bg-white/12 text-white placeholder:text-white/50 text-sm min-w-0 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm [color-scheme:dark]"
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeAttributeValue(attrIndex, valueIndex)}
                                  className="text-red-400/80 hover:text-red-400 hover:bg-red-500/20 border border-white/10 rounded-lg flex-shrink-0"
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
          </>
        )}

        {/* Варианты товара */}
        {activeTab === 'variants' && (
          <Card className="glass-strong border-white/20 shadow-xl animate-fade-in">
            <CardHeader className="flex flex-row items-center justify-between pb-4">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-green-500/20 border border-green-500/30">
                    <Sparkles className="h-5 w-5 text-green-400" />
                  </div>
                  <CardTitle className="text-white font-semibold text-lg">Варианты товара</CardTitle>
                </div>
                <p className="text-sm text-white/70 font-medium ml-10">
                  Варианты определяют конкретные комбинации атрибутов и их цены
                </p>
              </div>
              <Button
                type="button"
                size="sm"
                onClick={() => appendVariant({ price: 0, stock: 0 })}
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0 font-semibold shadow-lg shadow-green-500/25"
              >
                <Plus className="h-4 w-4 mr-2" />
                Добавить вариант
              </Button>
            </CardHeader>
            <CardContent className="space-y-4">
              {variantFields.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-white/20 rounded-xl bg-white/5">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
                    <Sparkles className="h-8 w-8 text-white/40" />
                  </div>
                  <p className="text-white/90 mb-2 font-bold text-lg">Варианты не добавлены</p>
                  <p className="text-sm text-white/70 mb-6 font-medium">
                    {productType === ProductType.MATRIX
                      ? 'Нажмите "Сгенерировать варианты" на вкладке Атрибуты для автоматического создания всех комбинаций'
                      : 'Добавьте варианты товара с разными характеристиками и ценами'
                    }
                  </p>
                  <Button
                    type="button"
                    size="sm"
                    onClick={() => appendVariant({ price: 0, stock: 0 })}
                    className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white border-0 font-semibold"
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
                                    <td key={attr.slug} className="py-2 px-2 sm:px-3 text-white/90 whitespace-nowrap font-medium">
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
                                  <td colSpan={attributes.length + 1} className="py-2 px-3 text-center text-white/75 text-xs font-medium">
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
                      <Card key={field.id} className="glass-strong border-white/20 shadow-xl animate-fade-in" style={{ animationDelay: `${variantIndex * 50}ms` }}>
                        <CardContent className="p-5">
                          <div className="flex flex-col sm:flex-row items-start justify-between gap-4 mb-4">
                            <div className="flex-1 w-full space-y-4">
                              {attrDisplay && (
                                <div className="flex items-center gap-2 flex-wrap">
                                  <span className="badge-premium bg-blue-500/20 border-blue-500/30 text-blue-300">
                                    {attrDisplay}
                                  </span>
                                </div>
                              )}
                              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-semibold text-white/90 mb-2">Название</label>
                                  <input
                                    {...register(`variants.${variantIndex}.name` as const)}
                                    className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                                    placeholder="Название варианта"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-white/90 mb-2">SKU</label>
                                  <input
                                    {...register(`variants.${variantIndex}.sku` as const)}
                                    className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium font-mono [color-scheme:dark]"
                                    placeholder="SKU"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-white/90 mb-2">
                                    Цена *
                                    <span className="text-xs text-white/60 ml-1 font-medium">(₽)</span>
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    {...register(`variants.${variantIndex}.price` as const, { valueAsNumber: true, required: true })}
                                    className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-white/90 mb-2">Остаток</label>
                                  <input
                                    type="number"
                                    {...register(`variants.${variantIndex}.stock` as const, { valueAsNumber: true })}
                                    className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                                    placeholder="0"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-white/90 mb-2">Вес (кг)</label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    {...register(`variants.${variantIndex}.weight` as const, { valueAsNumber: true })}
                                    className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm font-medium [color-scheme:dark]"
                                    placeholder="0.00"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-semibold text-white/90 mb-2">Единица</label>
                                  <select
                                    {...register(`variants.${variantIndex}.unit` as const)}
                                    className="w-full px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all shadow-inner backdrop-blur-sm [color-scheme:dark]"
                                  >
                                    <option value={UnitType.PIECE} className="bg-[#0a0a0a] text-white">Штука</option>
                                    <option value={UnitType.SQUARE_METER} className="bg-[#0a0a0a] text-white">м²</option>
                                    <option value={UnitType.TON} className="bg-[#0a0a0a] text-white">Тонна</option>
                                    <option value={UnitType.SET} className="bg-[#0a0a0a] text-white">Комплект</option>
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

        {/* Характеристики товара */}
        {activeTab === 'specifications' && (
          <SpecificationsEditor
            specifications={watch('specifications') || {}}
            onChange={(specs) => setValue('specifications', specs)}
          />
        )}

        {/* Изображения товара */}
        {activeTab === 'media' && (
          <Card className="glass-strong border-white/20 shadow-xl animate-fade-in">
            <CardHeader className="pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-lg bg-pink-500/20 border border-pink-500/30">
                  <ImageIcon className="h-5 w-5 text-pink-400" />
                </div>
                <CardTitle className="text-white font-semibold text-lg">Изображения товара</CardTitle>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div
                className="border-2 border-dashed border-white/20 rounded-xl p-8 text-center cursor-pointer transition-all hover:border-white/40 hover:bg-white/10 hover:shadow-lg"
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
                <div className="text-center py-4">
                  <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-white/20 border-t-blue-400 mb-2" />
                  <p className="text-sm text-white/70 font-medium">Загрузка изображений...</p>
                </div>
              )}

              {mediaItems.length > 0 && (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                  {mediaItems.map((item, index) => (
                    <div
                      key={item.id || `new-${index}`}
                      className="relative group aspect-square rounded-xl overflow-hidden bg-white/5 border border-white/20 cursor-move hover:border-white/40 hover:shadow-xl transition-all animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
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

        {/* Premium Action Buttons */}
        <div className="flex flex-col sm:flex-row gap-4 pt-6 border-t border-white/10 sticky bottom-0 bg-background/95 backdrop-blur-xl pb-6 -mx-6 px-6 sm:mx-0 sm:px-0">
          <Button
            type="submit"
            disabled={createMutation.isPending || updateMutation.isPending}
            className="flex-1 w-full sm:w-auto bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25 border-0 h-12 font-semibold disabled:opacity-50"
          >
            {createMutation.isPending || updateMutation.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-2 border-white/30 border-t-white mr-2" />
                Сохранение...
              </>
            ) : (
              <>
                <Save className="h-4 w-4 mr-2" />
                Сохранить товар
              </>
            )}
          </Button>
          <Button
            type="button"
            variant="ghost"
            onClick={() => navigate('/products')}
            className="w-full sm:w-auto text-white/80 hover:text-white hover:bg-white/10 border border-white/10 rounded-lg h-12 font-semibold"
          >
            Отмена
          </Button>
        </div>
      </form>
    </div>
  );
}
