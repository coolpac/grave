import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Edit2, Trash2, Save, X, GripVertical, Eye, EyeOff, FolderTree, AlertCircle, Search } from 'lucide-react';
import api from '../lib/api';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

interface Category {
  id: number;
  slug: string;
  name: string;
  description?: string;
  image?: string;
  order: number;
  isActive: boolean;
  _count?: { products: number };
}

interface CategoryFormData {
  slug: string;
  name: string;
  description: string;
  order: number;
  isActive: boolean;
}

export default function Categories() {
  const queryClient = useQueryClient();
  const [editingId, setEditingId] = useState<number | null>(null);
  const [isCreating, setIsCreating] = useState(false);
  const [search, setSearch] = useState('');
  const [formData, setFormData] = useState<CategoryFormData>({
    slug: '',
    name: '',
    description: '',
    order: 0,
    isActive: true,
  });

  // Fetch categories
  const { data: categories = [], isLoading, error } = useQuery<Category[]>({
    queryKey: ['admin-categories'],
    queryFn: async () => {
      const { data } = await api.get('/catalog/categories');
      return data;
    },
  });

  // Create category
  const createMutation = useMutation({
    mutationFn: async (data: CategoryFormData) => {
      const res = await api.post('/catalog/categories', data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setIsCreating(false);
      resetForm();
    },
  });

  // Update category
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: Partial<CategoryFormData> }) => {
      const res = await api.patch(`/catalog/categories/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
      setEditingId(null);
      resetForm();
    },
  });

  // Delete category
  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await api.delete(`/catalog/categories/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin-categories'] });
    },
  });

  const resetForm = () => {
    setFormData({ slug: '', name: '', description: '', order: 0, isActive: true });
  };

  const startEdit = (category: Category) => {
    setEditingId(category.id);
    setFormData({
      slug: category.slug,
      name: category.name,
      description: category.description || '',
      order: category.order,
      isActive: category.isActive,
    });
  };

  const handleSave = () => {
    if (editingId) {
      updateMutation.mutate({ id: editingId, data: formData });
    } else if (isCreating) {
      createMutation.mutate(formData);
    }
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Удалить категорию "${name}"? Все товары в этой категории также будут удалены!`)) {
      deleteMutation.mutate(id);
    }
  };

  const generateSlug = (name: string) => {
    return name
      .toLowerCase()
      .replace(/[а-яё]/g, (char) => {
        const map: Record<string, string> = {
          'а': 'a', 'б': 'b', 'в': 'v', 'г': 'g', 'д': 'd', 'е': 'e', 'ё': 'yo',
          'ж': 'zh', 'з': 'z', 'и': 'i', 'й': 'y', 'к': 'k', 'л': 'l', 'м': 'm',
          'н': 'n', 'о': 'o', 'п': 'p', 'р': 'r', 'с': 's', 'т': 't', 'у': 'u',
          'ф': 'f', 'х': 'h', 'ц': 'ts', 'ч': 'ch', 'ш': 'sh', 'щ': 'sch', 'ъ': '',
          'ы': 'y', 'ь': '', 'э': 'e', 'ю': 'yu', 'я': 'ya',
        };
        return map[char] || char;
      })
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
  };

  const slugExists = (slug: string, excludeId?: number | null) =>
    categories.some((cat: any) => cat.slug === slug && cat.id !== excludeId);

  // Filter categories by search
  const filteredCategories = Array.isArray(categories)
    ? categories.filter((cat) =>
        cat.name?.toLowerCase().includes(search.toLowerCase()) ||
        cat.slug?.toLowerCase().includes(search.toLowerCase())
      )
    : [];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 animate-fade-in">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-white/20 border-t-blue-400 mb-4" />
          <div className="text-white/80 text-lg font-medium">Загрузка категорий...</div>
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
              <AlertCircle className="h-8 w-8 text-red-400" />
            </div>
            <h3 className="text-lg font-semibold text-white mb-2">Ошибка загрузки</h3>
            <p className="text-white/60 text-sm">Не удалось загрузить категории</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold gradient-text flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 border border-white/10">
              <FolderTree className="h-6 w-6 text-blue-400" />
            </div>
            Категории
          </h1>
          <p className="text-white/60 mt-1 text-sm">Управление категориями каталога</p>
        </div>
        <Button
          onClick={() => {
            setIsCreating(true);
            setEditingId(null);
            resetForm();
            setFormData(prev => ({ ...prev, order: categories.length + 1 }));
          }}
          className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600 text-white shadow-lg shadow-blue-500/25"
        >
          <Plus className="w-5 h-5 mr-2" />
          Добавить категорию
        </Button>
      </div>

      {/* Search */}
      <Card className="glass-strong border-white/10">
        <CardContent className="p-4">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-white/40" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Поиск категорий..."
              className="w-full pl-10 pr-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
            />
          </div>
        </CardContent>
      </Card>

      {/* Create Form */}
      {isCreating && (
        <Card className="glass-strong border-white/10 animate-fade-in">
          <CardHeader className="border-b border-white/10">
            <CardTitle className="text-white flex items-center gap-2">
              <Plus className="w-5 h-5 text-blue-400" />
              Новая категория
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Название</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => {
                    setFormData({
                      ...formData,
                      name: e.target.value,
                      slug: generateSlug(e.target.value),
                    });
                  }}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                  placeholder="Название категории"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Slug (URL)</label>
                <input
                  type="text"
                  value={formData.slug}
                  onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all font-mono text-sm"
                  placeholder="slug-kategorii"
                />
                {formData.slug && slugExists(formData.slug, editingId) && (
                  <p className="text-xs text-red-400 mt-1">Такой slug уже используется</p>
                )}
              </div>
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-white/70 mb-2">Описание</label>
                <textarea
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all resize-none"
                  rows={2}
                  placeholder="Описание категории"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-white/70 mb-2">Порядок</label>
                <input
                  type="number"
                  value={formData.order}
                  onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                  className="w-full px-4 py-2.5 bg-white/5 border border-white/10 rounded-xl text-white placeholder-white/40 focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50 transition-all"
                />
              </div>
              <div className="flex items-center">
                <label className="flex items-center gap-3 cursor-pointer group">
                  <div className={`w-12 h-6 rounded-full transition-all duration-300 ${formData.isActive ? 'bg-gradient-to-r from-green-500 to-emerald-500' : 'bg-white/10'} relative`}>
                    <div className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow-md transition-all duration-300 ${formData.isActive ? 'left-7' : 'left-1'}`} />
                  </div>
                  <input
                    type="checkbox"
                    checked={formData.isActive}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.checked })}
                    className="sr-only"
                  />
                  <span className="text-sm text-white/70 group-hover:text-white transition-colors">
                    {formData.isActive ? 'Активна' : 'Скрыта'}
                  </span>
                </label>
              </div>
            </div>
            <div className="flex gap-3 mt-6 pt-4 border-t border-white/10">
              <Button
                onClick={handleSave}
                disabled={
                  createMutation.isPending ||
                  !formData.name ||
                  !formData.slug ||
                  slugExists(formData.slug, editingId)
                }
                className="bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white"
              >
                <Save className="w-4 h-4 mr-2" />
                {createMutation.isPending ? 'Сохранение...' : 'Сохранить'}
              </Button>
              <Button
                onClick={() => { setIsCreating(false); resetForm(); }}
                variant="outline"
                className="border-white/20 text-white/70 hover:bg-white/10"
              >
                <X className="w-4 h-4 mr-2" />
                Отмена
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Categories List */}
      <Card className="glass-strong border-white/10 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full">
            <thead>
              <tr className="border-b border-white/10">
                <th className="px-4 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider w-16">
                  №
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Название
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider hidden md:table-cell">
                  Slug
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Товаров
                </th>
                <th className="px-4 py-4 text-left text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Статус
                </th>
                <th className="px-4 py-4 text-right text-xs font-semibold text-white/50 uppercase tracking-wider">
                  Действия
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredCategories.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center">
                    <div className="flex flex-col items-center">
                      <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                        <FolderTree className="w-8 h-8 text-white/30" />
                      </div>
                      <p className="text-white/50 text-sm">Категории не найдены</p>
                      <p className="text-white/30 text-xs mt-1">Создайте первую категорию</p>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredCategories.map((category, index) => (
                  <tr 
                    key={category.id} 
                    className="group hover:bg-white/5 transition-colors"
                    style={{ animationDelay: `${index * 30}ms` }}
                  >
                    {editingId === category.id ? (
                      <>
                        <td className="px-4 py-4">
                          <input
                            type="number"
                            value={formData.order}
                            onChange={(e) => setFormData({ ...formData, order: parseInt(e.target.value) || 0 })}
                            className="w-14 px-2 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </td>
                        <td className="px-4 py-4">
                          <input
                            type="text"
                            value={formData.name}
                            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <input
                            type="text"
                            value={formData.slug}
                            onChange={(e) => setFormData({ ...formData, slug: e.target.value })}
                            className="w-full px-3 py-1.5 bg-white/10 border border-white/20 rounded-lg text-white text-sm font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                          />
                        </td>
                        <td className="px-4 py-4 text-sm text-white/50">
                          {category._count?.products || 0}
                        </td>
                        <td className="px-4 py-4">
                          <button
                            onClick={() => setFormData({ ...formData, isActive: !formData.isActive })}
                            className={`p-2 rounded-lg transition-colors ${formData.isActive ? 'bg-green-500/20 text-green-400' : 'bg-white/10 text-white/40'}`}
                          >
                            {formData.isActive ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                          </button>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-2">
                            <button
                              onClick={handleSave}
                              disabled={updateMutation.isPending}
                              className="p-2 bg-green-500/20 text-green-400 hover:bg-green-500/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                              <Save className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => { setEditingId(null); resetForm(); }}
                              className="p-2 bg-white/10 text-white/60 hover:bg-white/20 rounded-lg transition-colors"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-4 py-4">
                          <div className="flex items-center gap-2">
                            <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/40 transition-colors cursor-grab" />
                            <span className="text-white/60 text-sm font-medium">{category.order}</span>
                          </div>
                        </td>
                        <td className="px-4 py-4">
                          <div className="font-medium text-white">{category.name}</div>
                          {category.description && (
                            <div className="text-xs text-white/40 truncate max-w-xs mt-0.5">{category.description}</div>
                          )}
                        </td>
                        <td className="px-4 py-4 hidden md:table-cell">
                          <code className="text-xs text-white/50 bg-white/5 px-2 py-1 rounded font-mono">
                            {category.slug}
                          </code>
                        </td>
                        <td className="px-4 py-4">
                          <span className="inline-flex items-center justify-center min-w-[2rem] px-2 py-1 bg-blue-500/20 text-blue-400 rounded-full text-xs font-medium">
                            {category._count?.products || 0}
                          </span>
                        </td>
                        <td className="px-4 py-4">
                          <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium ${
                            category.isActive
                              ? 'bg-green-500/20 text-green-400'
                              : 'bg-white/10 text-white/40'
                          }`}>
                            {category.isActive ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
                            {category.isActive ? 'Активна' : 'Скрыта'}
                          </span>
                        </td>
                        <td className="px-4 py-4 text-right">
                          <div className="flex justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => startEdit(category)}
                              className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                              title="Редактировать"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(category.id, category.name)}
                              disabled={deleteMutation.isPending}
                              className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors disabled:opacity-50"
                              title="Удалить"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
