import { useState, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { useDropzone } from 'react-dropzone'
import { arrayMoveImmutable } from 'array-move'
import { Button } from '@monorepo/ui'
import { GlassCard } from '@monorepo/ui'
import { X, Upload, GripVertical } from 'lucide-react'
import axios from 'axios'

const productSchema = z.object({
  slug: z.string().min(1, 'Slug обязателен'),
  name: z.string().min(1, 'Название обязательно'),
  description: z.string().optional(),
  categoryId: z.number().min(1, 'Категория обязательна'),
  price: z.number().min(0, 'Цена должна быть положительной'),
  isActive: z.boolean().default(true),
})

type ProductFormData = z.infer<typeof productSchema>

interface MediaItem {
  id?: number
  url: string
  order: number
  file?: File
}

export default function ProductForm() {
  const [mediaItems, setMediaItems] = useState<MediaItem[]>([])
  const [uploading, setUploading] = useState(false)
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api'

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      isActive: true,
    },
  })

  const onDrop = useCallback(async (acceptedFiles: File[]) => {
    setUploading(true)
    try {
      const uploadPromises = acceptedFiles.map(async (file, index) => {
        const formData = new FormData()
        formData.append('file', file)

        const response = await axios.post(`${API_URL}/upload/image`, formData, {
          headers: {
            'Content-Type': 'multipart/form-data',
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })

        return {
          url: response.data.url,
          order: mediaItems.length + index,
          file,
        }
      })

      const newMedia = await Promise.all(uploadPromises)
      setMediaItems((prev) => [...prev, ...newMedia])
    } catch (error) {
      console.error('Upload error:', error)
      alert('Ошибка загрузки изображений')
    } finally {
      setUploading(false)
    }
  }, [mediaItems.length, API_URL])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'image/*': ['.jpeg', '.jpg', '.png', '.webp', '.gif'],
    },
    maxSize: 10 * 1024 * 1024, // 10MB
  })

  const removeMedia = async (index: number) => {
    const item = mediaItems[index]
    if (item.id) {
      try {
        await axios.delete(`${API_URL}/upload/media/${item.id}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem('token')}`,
          },
        })
      } catch (error) {
        console.error('Delete error:', error)
      }
    }
    setMediaItems((prev) => prev.filter((_, i) => i !== index).map((item, i) => ({ ...item, order: i })))
  }

  const moveMedia = (oldIndex: number, newIndex: number) => {
    setMediaItems((prev) => {
      const newItems = arrayMoveImmutable(prev, oldIndex, newIndex)
      return newItems.map((item, index) => ({ ...item, order: index }))
    })
  }

  const onSubmit = async (data: ProductFormData) => {
    try {
      // Здесь будет логика сохранения товара
      console.log('Product data:', data)
      console.log('Media items:', mediaItems)
      
      // После сохранения товара, обновить порядок медиа
      if (mediaItems.length > 0) {
        const mediaIds = mediaItems.map((item) => item.id).filter(Boolean) as number[]
        if (mediaIds.length > 0) {
          await axios.post(
            `${API_URL}/upload/media/reorder`,
            { mediaIds },
            {
              headers: {
                Authorization: `Bearer ${localStorage.getItem('token')}`,
              },
            }
          )
        }
      }

      alert('Товар успешно сохранен!')
    } catch (error) {
      console.error('Save error:', error)
      alert('Ошибка сохранения товара')
    }
  }

  return (
    <div className="p-4 space-y-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Создание товара</h1>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <GlassCard>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Slug</label>
              <input
                {...register('slug')}
                className="w-full px-4 py-2 rounded-lg bg-panel border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="product-slug"
              />
              {errors.slug && (
                <p className="text-sm text-destructive mt-1">{errors.slug.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Название</label>
              <input
                {...register('name')}
                className="w-full px-4 py-2 rounded-lg bg-panel border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                placeholder="Название товара"
              />
              {errors.name && (
                <p className="text-sm text-destructive mt-1">{errors.name.message}</p>
              )}
            </div>

            <div>
              <label className="block text-sm font-medium mb-2">Описание</label>
              <textarea
                {...register('description')}
                rows={4}
                className="w-full px-4 py-2 rounded-lg bg-panel border border-border focus:outline-none focus:ring-2 focus:ring-accent resize-none"
                placeholder="Описание товара"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium mb-2">Категория ID</label>
                <input
                  type="number"
                  {...register('categoryId', { valueAsNumber: true })}
                  className="w-full px-4 py-2 rounded-lg bg-panel border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {errors.categoryId && (
                  <p className="text-sm text-destructive mt-1">{errors.categoryId.message}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium mb-2">Цена</label>
                <input
                  type="number"
                  step="0.01"
                  {...register('price', { valueAsNumber: true })}
                  className="w-full px-4 py-2 rounded-lg bg-panel border border-border focus:outline-none focus:ring-2 focus:ring-accent"
                />
                {errors.price && (
                  <p className="text-sm text-destructive mt-1">{errors.price.message}</p>
                )}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                {...register('isActive')}
                className="w-4 h-4 rounded"
              />
              <label className="text-sm">Активен</label>
            </div>
          </div>
        </GlassCard>

        {/* Drag & Drop Zone */}
        <GlassCard>
          <div className="space-y-4">
            <h2 className="text-lg font-semibold">Изображения товара</h2>

            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors ${
                isDragActive
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50'
              }`}
            >
              <input {...getInputProps()} />
              <Upload className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              {isDragActive ? (
                <p className="text-accent">Отпустите для загрузки...</p>
              ) : (
                <div>
                  <p className="mb-2">Перетащите изображения сюда или нажмите для выбора</p>
                  <p className="text-sm text-muted-foreground">
                    PNG, JPG, WEBP до 10MB
                  </p>
                </div>
              )}
            </div>

            {uploading && (
              <p className="text-sm text-muted-foreground text-center">Загрузка...</p>
            )}

            {/* Media Preview Grid with Drag & Drop */}
            {mediaItems.length > 0 && (
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                {mediaItems.map((item, index) => (
                  <div
                    key={item.id || `new-${index}`}
                    className="relative group aspect-square rounded-lg overflow-hidden bg-panel border border-border cursor-move"
                    draggable
                    onDragStart={(e) => {
                      e.dataTransfer.setData('text/plain', index.toString())
                    }}
                    onDragOver={(e) => {
                      e.preventDefault()
                    }}
                    onDrop={(e) => {
                      e.preventDefault()
                      const draggedIndex = parseInt(e.dataTransfer.getData('text/plain'))
                      if (draggedIndex !== index) {
                        moveMedia(draggedIndex, index)
                      }
                    }}
                  >
                    <img
                      src={item.url}
                      alt={`Media ${index + 1}`}
                      className="w-full h-full object-cover pointer-events-none"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                      <button
                        type="button"
                        onClick={() => removeMedia(index)}
                        className="p-2 rounded-full bg-destructive hover:bg-destructive/80 transition-colors"
                      >
                        <X className="w-4 h-4 text-white" />
                      </button>
                    </div>
                    <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-1 rounded flex items-center gap-1">
                      <GripVertical className="w-3 h-3" />
                      {index + 1}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </GlassCard>

        <div className="flex gap-4">
          <Button type="submit" className="flex-1">
            Сохранить товар
          </Button>
          <Button type="button" variant="outline" onClick={() => window.history.back()}>
            Отмена
          </Button>
        </div>
      </form>
    </div>
  )
}

