import { useState } from 'react';
import { Edit2, Save, X, Grid } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card, CardContent, CardHeader, CardTitle } from '@ui/components/card';

interface Attribute {
  name: string;
  slug: string;
  values?: Array<{ value: string; displayName: string }>;
}

interface Variant {
  attributes?: Record<string, string>;
  price: number;
  stock?: number;
  weight?: number;
  [key: string]: any;
}

interface PriceMatrixEditorProps {
  attributes: Attribute[];
  variants: Variant[];
  onPriceChange: (variantIndex: number, price: number) => void;
  onStockChange?: (variantIndex: number, stock: number) => void;
  onWeightChange?: (variantIndex: number, weight: number) => void;
}

export default function PriceMatrixEditor({
  attributes,
  variants,
  onPriceChange,
  onStockChange,
  onWeightChange,
}: PriceMatrixEditorProps) {
  const [editingCell, setEditingCell] = useState<{ variantIndex: number; field: 'price' | 'stock' | 'weight' } | null>(null);
  const [editValue, setEditValue] = useState<string>('');

  if (attributes.length < 2 || variants.length === 0) {
    return null;
  }

  // Создаем матрицу: первый атрибут - строки, второй - столбцы
  const firstAttr = attributes[0];
  const secondAttr = attributes[1];

  const firstAttrValues = firstAttr.values || [];
  const secondAttrValues = secondAttr.values || [];

  const handleCellClick = (variantIndex: number, field: 'price' | 'stock' | 'weight', currentValue: number) => {
    setEditingCell({ variantIndex, field });
    setEditValue(currentValue.toString());
  };

  const handleSave = () => {
    if (editingCell) {
      const value = parseFloat(editValue);
      if (!isNaN(value)) {
        if (editingCell.field === 'price') {
          onPriceChange(editingCell.variantIndex, value);
        } else if (editingCell.field === 'stock' && onStockChange) {
          onStockChange(editingCell.variantIndex, value);
        } else if (editingCell.field === 'weight' && onWeightChange) {
          onWeightChange(editingCell.variantIndex, value);
        }
      }
    }
    setEditingCell(null);
    setEditValue('');
  };

  const handleCancel = () => {
    setEditingCell(null);
    setEditValue('');
  };

  const getVariant = (firstValue: string, secondValue: string): Variant | null => {
    return variants.find(
      (v) => v.attributes?.[firstAttr.slug] === firstValue && v.attributes?.[secondAttr.slug] === secondValue
    ) || null;
  };

  return (
    <Card className="glass-strong border-purple-500/30 shadow-xl bg-gradient-to-r from-purple-500/10 to-blue-500/10 animate-fade-in">
      <CardHeader className="pb-4">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-lg bg-purple-500/20 border border-purple-500/30">
            <Grid className="h-5 w-5 text-purple-400" />
          </div>
          <CardTitle className="text-white font-semibold text-lg">Табличный редактор цен</CardTitle>
        </div>
        <p className="text-sm text-white/70 font-medium mt-2 ml-10">
          Кликните на ячейку для редактирования. Используйте Tab для перехода к следующей ячейке.
        </p>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Таблица цен */}
        <div>
          <h4 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400"></span>
            Цены (₽)
          </h4>
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <div className="inline-block min-w-full">
              <table className="w-full text-sm border-collapse min-w-[400px]">
                <thead>
                  <tr>
                    <th className="text-left py-3 px-3 text-white/90 font-semibold border-b border-white/20 sticky left-0 bg-gradient-to-r from-purple-500/15 to-blue-500/15 z-10 min-w-[150px] backdrop-blur-sm">
                      <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1">
                        <span>{firstAttr.name}</span>
                        <span className="text-white/50 text-xs">\</span>
                        <span>{secondAttr.name}</span>
                      </div>
                    </th>
                    {secondAttrValues.map((val) => (
                      <th
                        key={val.value}
                        className="text-center py-3 px-3 text-white/90 font-semibold border-b border-white/20 min-w-[100px] whitespace-nowrap bg-white/5"
                      >
                        <div className="text-sm">{val.displayName}</div>
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {firstAttrValues.map((firstVal) => (
                    <tr key={firstVal.value} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                      <td className="py-3 px-3 text-white/80 font-semibold sticky left-0 bg-gradient-to-r from-purple-500/15 to-blue-500/15 z-10 border-r border-white/10 min-w-[150px] backdrop-blur-sm">
                        <div className="text-sm whitespace-nowrap">{firstVal.displayName}</div>
                      </td>
                      {secondAttrValues.map((secondVal) => {
                        const variant = getVariant(firstVal.value, secondVal.value);
                        const variantIndex = variant ? variants.indexOf(variant) : -1;
                        const isEditing = editingCell?.variantIndex === variantIndex && editingCell?.field === 'price';

                        return (
                          <td
                            key={secondVal.value}
                            className={`py-3 px-3 text-center border-r border-white/5 min-w-[100px] transition-all ${
                              isEditing 
                                ? 'bg-blue-500/30 border-blue-400/50' 
                                : 'hover:bg-white/10 cursor-pointer'
                            }`}
                            onClick={() => variant && handleCellClick(variantIndex, 'price', variant.price || 0)}
                          >
                            {isEditing ? (
                              <div className="flex items-center justify-center gap-2">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editValue}
                                  onChange={(e) => setEditValue(e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') handleSave();
                                    if (e.key === 'Escape') handleCancel();
                                    if (e.key === 'Tab') {
                                      e.preventDefault();
                                      handleSave();
                                    }
                                  }}
                                  className="w-24 px-2 py-1.5 text-sm border border-blue-400/50 rounded-lg bg-white/15 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 font-medium [color-scheme:dark]"
                                  autoFocus
                                />
                                <div className="flex gap-1">
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleSave();
                                    }}
                                    className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                                  >
                                    <Save className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleCancel();
                                    }}
                                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                  >
                                    <X className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            ) : (
                              <span className="text-white font-bold text-sm whitespace-nowrap">
                                {variant ? `${variant.price || 0} ₽` : '-'}
                              </span>
                            )}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Таблица остатков (если нужно) */}
        {onStockChange && (
          <div>
            <h4 className="text-sm font-semibold text-white/90 mb-3 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-400"></span>
              Остатки
            </h4>
            <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
              <div className="inline-block min-w-full">
                <table className="w-full text-sm border-collapse min-w-[400px]">
                  <thead>
                    <tr>
                      <th className="text-left py-3 px-3 text-white/90 font-semibold border-b border-white/20 sticky left-0 bg-gradient-to-r from-purple-500/15 to-blue-500/15 z-10 min-w-[150px] backdrop-blur-sm">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1">
                          <span>{firstAttr.name}</span>
                          <span className="text-white/50 text-xs">\</span>
                          <span>{secondAttr.name}</span>
                        </div>
                      </th>
                      {secondAttrValues.map((val) => (
                        <th
                          key={val.value}
                          className="text-center py-3 px-3 text-white/90 font-semibold border-b border-white/20 min-w-[100px] whitespace-nowrap bg-white/5"
                        >
                          <div className="text-sm">{val.displayName}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {firstAttrValues.map((firstVal) => (
                      <tr key={firstVal.value} className="border-b border-white/10 hover:bg-white/5 transition-colors">
                        <td className="py-3 px-3 text-white/80 font-semibold sticky left-0 bg-gradient-to-r from-purple-500/15 to-blue-500/15 z-10 border-r border-white/10 min-w-[150px] backdrop-blur-sm">
                          <div className="text-sm whitespace-nowrap">{firstVal.displayName}</div>
                        </td>
                        {secondAttrValues.map((secondVal) => {
                          const variant = getVariant(firstVal.value, secondVal.value);
                          const variantIndex = variant ? variants.indexOf(variant) : -1;
                          const isEditing = editingCell?.variantIndex === variantIndex && editingCell?.field === 'stock';

                          return (
                            <td
                              key={secondVal.value}
                              className={`py-3 px-3 text-center border-r border-white/5 min-w-[100px] transition-all ${
                                isEditing 
                                  ? 'bg-blue-500/30 border-blue-400/50' 
                                  : 'hover:bg-white/10 cursor-pointer'
                              }`}
                              onClick={() => variant && handleCellClick(variantIndex, 'stock', variant.stock || 0)}
                            >
                              {isEditing ? (
                                <div className="flex items-center justify-center gap-2">
                                  <input
                                    type="number"
                                    value={editValue}
                                    onChange={(e) => setEditValue(e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') handleSave();
                                      if (e.key === 'Escape') handleCancel();
                                      if (e.key === 'Tab') {
                                        e.preventDefault();
                                        handleSave();
                                      }
                                    }}
                                    className="w-24 px-2 py-1.5 text-sm border border-blue-400/50 rounded-lg bg-white/15 text-white focus:outline-none focus:ring-2 focus:ring-blue-400/50 font-medium [color-scheme:dark]"
                                    autoFocus
                                  />
                                  <div className="flex gap-1">
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSave();
                                      }}
                                      className="h-6 w-6 p-0 text-green-400 hover:text-green-300 hover:bg-green-500/20"
                                    >
                                      <Save className="h-3 w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancel();
                                      }}
                                      className="h-6 w-6 p-0 text-red-400 hover:text-red-300 hover:bg-red-500/20"
                                    >
                                      <X className="h-3 w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-white/80 font-semibold text-sm whitespace-nowrap">
                                  {variant ? variant.stock || 0 : '-'}
                                </span>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
