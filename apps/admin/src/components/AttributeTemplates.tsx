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
    <Card className="glass-strong border-blue-500/30 shadow-xl bg-gradient-to-r from-blue-500/10 to-purple-500/10 animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-blue-500/20 border border-blue-500/30">
            <Sparkles className="h-5 w-5 text-blue-400" />
          </div>
          <CardTitle className="text-white font-semibold text-lg">Шаблоны атрибутов</CardTitle>
        </div>
        <p className="text-sm text-white/70 font-medium mt-2 ml-10">
          Выберите готовый шаблон для быстрого создания атрибутов на основе ваших прайс-листов
        </p>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredTemplates.map((template, index) => {
            const Icon = template.icon;
            return (
              <button
                key={template.id}
                onClick={() => onSelectTemplate(template)}
                className="text-left p-5 rounded-xl border border-white/20 bg-white/10 hover:bg-white/15 hover:border-blue-400/50 transition-all group shadow-lg hover:shadow-xl animate-fade-in"
                style={{ animationDelay: `${index * 50}ms` }}
              >
                <div className="flex items-start gap-3">
                  <div className="p-3 rounded-lg bg-gradient-to-br from-blue-500/30 to-purple-500/30 border border-blue-400/50 group-hover:from-blue-500/40 group-hover:to-purple-500/40 transition-all shadow-md">
                    <Icon className="h-5 w-5 text-blue-200" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="font-bold text-white mb-1.5 text-base leading-tight">{template.name}</h4>
                    <p className="text-xs text-white/80 mb-3 font-medium leading-relaxed">{template.description}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {template.attributes.map((attr) => (
                        <span
                          key={attr.slug}
                          className="badge-premium bg-blue-500/20 border-blue-500/30 text-blue-300"
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
