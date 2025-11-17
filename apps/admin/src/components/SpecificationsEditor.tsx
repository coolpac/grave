import { useState } from 'react';
import { Plus, Trash2, Settings } from 'lucide-react';
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
    <Card className="glass-strong border-white/20 shadow-xl animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-orange-500/20 border border-orange-500/30">
            <Settings className="h-5 w-5 text-orange-400" />
          </div>
          <CardTitle className="text-white font-semibold text-lg">Характеристики товара</CardTitle>
        </div>
        <p className="text-sm text-white/70 font-medium mt-2 ml-10">
          Добавьте характеристики товара (например: Производитель, Вес, Материал, Цвет)
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {localSpecs.length === 0 ? (
          <div className="text-center py-12 border-2 border-dashed border-white/20 rounded-xl bg-white/5">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center border border-white/10">
              <Settings className="h-8 w-8 text-white/40" />
            </div>
            <p className="text-white/90 mb-2 font-bold text-lg">Характеристики не добавлены</p>
            <p className="text-sm text-white/70 mb-6 font-medium">
              Добавьте характеристики для детального описания товара
            </p>
            <Button
              type="button"
              size="sm"
              onClick={addSpec}
              className="bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 font-semibold shadow-lg shadow-orange-500/25"
            >
              <Plus className="h-4 w-4 mr-2" />
              Добавить характеристику
            </Button>
          </div>
        ) : (
          <>
            <div className="space-y-3">
              {localSpecs.map((spec, index) => (
                <div 
                  key={index} 
                  className="flex flex-col sm:flex-row gap-3 items-start sm:items-center p-4 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 transition-all animate-fade-in"
                  style={{ animationDelay: `${index * 50}ms` }}
                >
                  <input
                    type="text"
                    value={spec.key}
                    onChange={(e) => updateSpec(index, 'key', e.target.value)}
                    placeholder="Название характеристики"
                    className="flex-1 w-full sm:w-auto px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all shadow-inner backdrop-blur-sm min-w-[150px]"
                    style={{ color: 'rgb(250, 250, 250)', WebkitTextFillColor: 'rgb(250, 250, 250)' }}
                  />
                  <div className="flex items-center gap-2 text-white/50 font-bold px-2">—</div>
                  <input
                    type="text"
                    value={spec.value}
                    onChange={(e) => updateSpec(index, 'value', e.target.value)}
                    placeholder="Значение"
                    className="flex-1 w-full sm:w-auto px-4 py-3 border border-white/25 rounded-xl bg-white/12 text-white placeholder:text-white/50 font-medium focus:outline-none focus:ring-2 focus:ring-orange-500/50 focus:border-orange-500/50 transition-all shadow-inner backdrop-blur-sm min-w-[150px]"
                    style={{ color: 'rgb(250, 250, 250)', WebkitTextFillColor: 'rgb(250, 250, 250)' }}
                  />
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeSpec(index)}
                    className="text-red-400/80 hover:text-red-400 hover:bg-red-500/20 border border-white/10 rounded-lg flex-shrink-0"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>
            <Button
              type="button"
              size="sm"
              onClick={addSpec}
              className="w-full sm:w-auto bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white border-0 font-semibold shadow-lg shadow-orange-500/25"
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
