import { Package, Tag, Sparkles, Settings } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

export interface AttributeTemplate {
  id: string;
  name: string;
  description: string;
  icon: any;
  category: string;
  attributes: Array<{
    name: string;
    slug: string;
    type: string;
    values: Array<{ value: string; displayName: string }>;
  }>;
}

export const ATTRIBUTE_TEMPLATES: AttributeTemplate[] = [
  {
    id: 'plita-mramornaya',
    name: 'Плита мраморная',
    description: 'Размер × Сорт (2×2 = 4 варианта)',
    icon: Package,
    category: 'Плита из мрамора',
    attributes: [
      {
        name: 'Размер',
        slug: 'size',
        type: 'select',
        values: [
          { value: '300*300*15', displayName: '300×300×15 мм' },
          { value: '300*600*15', displayName: '300×600×15 мм' },
        ],
      },
      {
        name: 'Сорт',
        slug: 'grade',
        type: 'select',
        values: [
          { value: '1', displayName: 'Сорт 1' },
          { value: '2', displayName: 'Сорт 2' },
        ],
      },
    ],
  },
  {
    id: 'tumba-ritualnaya',
    name: 'Тумба ритуальная',
    description: 'Размер основания × Высота (7×4 = 28 вариантов)',
    icon: Tag,
    category: 'Ритуальные изделия',
    attributes: [
      {
        name: 'Размер основания',
        slug: 'base_size',
        type: 'select',
        values: [
          { value: '500*150', displayName: '500×150 мм' },
          { value: '550*150', displayName: '550×150 мм' },
          { value: '600*150', displayName: '600×150 мм' },
          { value: '500*200', displayName: '500×200 мм' },
          { value: '550*200', displayName: '550×200 мм' },
          { value: '600*200', displayName: '600×200 мм' },
          { value: '700*200', displayName: '700×200 мм' },
        ],
      },
      {
        name: 'Высота',
        slug: 'height',
        type: 'select',
        values: [
          { value: '70', displayName: '70 мм' },
          { value: '120', displayName: '120 мм' },
          { value: '130', displayName: '130 мм' },
          { value: '150', displayName: '150 мм' },
        ],
      },
    ],
  },
  {
    id: 'vazy',
    name: 'Вазы',
    description: 'Размер (6 вариантов)',
    icon: Package,
    category: 'Ритуальные изделия',
    attributes: [
      {
        name: 'Размер',
        slug: 'size',
        type: 'select',
        values: [
          { value: '200*110', displayName: '200×110 мм' },
          { value: '250*120', displayName: '250×120 мм' },
          { value: '300*120', displayName: '300×120 мм' },
          { value: '350*130', displayName: '350×130 мм' },
          { value: '400*130', displayName: '400×130 мм' },
          { value: '500*130', displayName: '500×130 мм' },
        ],
      },
    ],
  },
  {
    id: 'stela-ritualnaya',
    name: 'Стела ритуальная',
    description: 'Размер (16 вариантов с весом)',
    icon: Sparkles,
    category: 'Ритуальные изделия',
    attributes: [
      {
        name: 'Размер',
        slug: 'size',
        type: 'select',
        values: [
          { value: '600*400*60', displayName: '600×400×60 мм' },
          { value: '700*400*60', displayName: '700×400×60 мм' },
          { value: '800*400*60', displayName: '800×400×60 мм' },
          { value: '900*400*60', displayName: '900×400×60 мм' },
          { value: '1000*400*60', displayName: '1000×400×60 мм' },
          { value: '800*450*70', displayName: '800×450×70 мм' },
          { value: '900*450*70', displayName: '900×450×70 мм' },
          { value: '1000*450*70', displayName: '1000×450×70 мм' },
          { value: '1100*450*70', displayName: '1100×450×70 мм' },
          { value: '1200*450*70', displayName: '1200×450×70 мм' },
          { value: '1000*500*70', displayName: '1000×500×70 мм' },
          { value: '1100*500*70', displayName: '1100×500×70 мм' },
          { value: '1200*500*70', displayName: '1200×500×70 мм' },
          { value: '1000*600*70', displayName: '1000×600×70 мм' },
          { value: '1100*600*70', displayName: '1100×600×70 мм' },
          { value: '1200*600*70', displayName: '1200×600×70 мм' },
        ],
      },
    ],
  },
  {
    id: 'tsvetnik-ritualnyi',
    name: 'Цветник ритуальный',
    description: 'Размер × Обработка (4×2 = 8 вариантов)',
    icon: Settings,
    category: 'Ритуальные изделия',
    attributes: [
      {
        name: 'Размер',
        slug: 'size',
        type: 'select',
        values: [
          { value: '1000*70*40', displayName: '1000×70×40 мм (2 шт), 500/600×70×40 (1 шт)' },
          { value: '1000*70*50', displayName: '1000×70×50 мм (2 шт), 500/600×70×50 (1 шт)' },
          { value: '1100*70*50', displayName: '1100×70×50 мм (2 шт), 500/600×70×50 (1 шт)' },
          { value: '1200*70*50', displayName: '1200×70×50 мм (2 шт), 500/600×70×50 (1 шт)' },
        ],
      },
      {
        name: 'Обработка',
        slug: 'finish',
        type: 'select',
        values: [
          { value: 'sawed', displayName: 'Пилен' },
          { value: 'polished', displayName: 'Полир' },
        ],
      },
    ],
  },
  {
    id: 'zakaznaya-plita',
    name: 'Заказная плита',
    description: 'Толщина × Диапазон размеров',
    icon: Package,
    category: 'Плита из мрамора',
    attributes: [
      {
        name: 'Толщина',
        slug: 'thickness',
        type: 'select',
        values: [
          { value: '10', displayName: '10 мм (L до 400мм, W 300мм)' },
          { value: '15', displayName: '15 мм (L до 600мм, W 400мм)' },
          { value: '20-1', displayName: '20 мм (L до 600мм, W до 400мм)' },
          { value: '20-2', displayName: '20 мм (L 600-1200мм, W до 600мм)' },
          { value: '30', displayName: '30 мм (L до 1200мм, W до 600мм)' },
          { value: '40', displayName: '40 мм (L до 1200мм, W до 600мм)' },
        ],
      },
    ],
  },
];

interface AttributeTemplatesProps {
  onSelectTemplate: (template: AttributeTemplate) => void;
  productType: string;
}

export default function AttributeTemplates({ onSelectTemplate, productType }: AttributeTemplatesProps) {
  const filteredTemplates = ATTRIBUTE_TEMPLATES.filter((template) => {
    if (productType === 'SINGLE_VARIANT') {
      return template.attributes.length === 1;
    }
    if (productType === 'MATRIX') {
      return template.attributes.length >= 2;
    }
    return true;
  });

  if (filteredTemplates.length === 0) {
    return null;
  }

  return (
    <Card className="glass-strong border-blue-500/30 shadow-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10">
      <CardHeader>
        <CardTitle className="text-white font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-blue-400" />
          Шаблоны атрибутов
        </CardTitle>
        <p className="text-sm text-white/70 mt-1">
          Выберите готовый шаблон для быстрого создания атрибутов на основе ваших прайс-листов
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTemplates.map((template) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="text-left p-4 rounded-lg border border-white/10 bg-white/5 hover:bg-white/10 hover:border-blue-500/30 transition-all group"
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30 group-hover:bg-blue-500/30 transition-colors">
                    <Icon className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-semibold text-white mb-1 text-sm">{template.name}</h4>
                    <p className="text-xs text-white/60 mb-2">{template.description}</p>
                    <div className="flex flex-wrap gap-1">
                      {template.attributes.map((attr) => (
                        <span
                          key={attr.slug}
                          className="text-xs px-2 py-0.5 rounded bg-white/10 text-white/70 border border-white/10"
                        >
                          {attr.name}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}

