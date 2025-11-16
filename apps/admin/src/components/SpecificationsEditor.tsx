import { useState } from 'react';
import { Plus, Trash2, X } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

interface SpecificationsEditorProps {
  specifications: Record<string, string>;
  onChange: (specifications: Record<string, string>) => void;
}

export default function SpecificationsEditor({ specifications, onChange }: SpecificationsEditorProps) {
  const [localSpecs, setLocalSpecs] = useState<Array<{ key: string; value: string }>>(() => {
    return Object.entries(specifications || {}).map(([key, value]) => ({ key, value }));
  });

  const updateSpec = (index: number, field: 'key' | 'value', newValue: string) => {
    const updated = [...localSpecs];
    updated[index] = { ...updated[index], [field]: newValue };
    setLocalSpecs(updated);
    
    // Обновляем родительский компонент
    const specsObj: Record<string, string> = {};
    updated.forEach((spec) => {
      if (spec.key.trim()) {
        specsObj[spec.key.trim()] = spec.value.trim();
      }
    });
    onChange(specsObj);
  };

  const addSpec = () => {
    const updated = [...localSpecs, { key: '', value: '' }];
    setLocalSpecs(updated);
  };

  const removeSpec = (index: number) => {
    const updated = localSpecs.filter((_, i) => i !== index);
    setLocalSpecs(updated);
    
    // Обновляем родительский компонент
    const specsObj: Record<string, string> = {};
    updated.forEach((spec) => {
      if (spec.key.trim()) {
        specsObj[spec.key.trim()] = spec.value.trim();
      }
    });
    onChange(specsObj);
  };

  return (
    <Card className="glass-strong border-white/20 shadow-xl">
      <CardHeader>
        <CardTitle className="text-white font-semibold flex items-center gap-2">
          <span>Характеристики товара</span>
        </CardTitle>
        <p className="text-sm text-white/90 mt-1 font-medium">
          Добавьте характеристики товара (например: Производитель, Вес, Материал, Цвет)
        </p>
      </CardHeader>
      <CardContent className="space-y-3">
        {localSpecs.length === 0 ? (
          <div className="text-center py-8 border-2 border-dashed border-white/25 rounded-lg bg-white/5">
            <p className="text-white/85 mb-3 font-semibold">Характеристики не добавлены</p>
            <Button
              type="button"
              size="sm"
              onClick={addSpec}
              className="border-2 border-blue-400/70 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 hover:border-blue-400 font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить характеристику
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-2">
              {localSpecs.map((spec, index) => (
                <div key={index} className="flex flex-col sm:flex-row gap-2 items-start sm:items-center">
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => updateSpec(index, 'key', e.target.value)}
                    placeholder="Название характеристики"
                    className="flex-1 w-full sm:w-auto px-3 py-2 border-2 border-white/30 rounded-lg bg-white/15 text-white placeholder:text-white/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 min-w-[150px]"
                  />
                  <div className="flex items-center gap-1 text-white/70 font-medium px-2">—</div>
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => updateSpec(index, 'value', e.target.value)}
                    placeholder="Значение"
                    className="flex-1 w-full sm:w-auto px-3 py-2 border-2 border-white/30 rounded-lg bg-white/15 text-white placeholder:text-white/60 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-white/50 focus:border-white/50 min-w-[150px]"
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSpec(index)}
                    className="text-red-400 hover:text-red-300 flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={addSpec}
              className="w-full sm:w-auto border-2 border-blue-400/70 bg-blue-500/20 text-blue-200 hover:bg-blue-500/30 hover:border-blue-400 font-semibold"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить характеристику
            </Button>
          </>
        )}
      </CardContent>
    </Card>
  );
}

