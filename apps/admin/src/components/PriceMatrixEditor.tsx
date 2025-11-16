import { useState } from 'react';
import { Edit2, Save, X } from 'lucide-react';
import { Button } from '@ui/components/button';
import { Card, CardContent } from '@ui/components/card';

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
    <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/30">
      <CardContent className="p-4">
        <div className="mb-4">
          <h3 className="text-lg font-semibold text-white mb-2">Табличный редактор цен</h3>
          <p className="text-sm text-white/70">
            Кликните на ячейку для редактирования. Используйте Tab для перехода к следующей ячейке.
          </p>
        </div>

        <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
          <div className="inline-block min-w-full">
            {/* Таблица цен */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-white/80 mb-2">Цены (₽)</h4>
              <div className="overflow-x-auto">
                <table className="w-full text-sm border-collapse min-w-[400px]">
                  <thead>
                    <tr>
                      <th className="text-left py-2 px-2 sm:px-3 text-white/80 font-medium border-b border-white/10 sticky left-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 z-10 min-w-[120px] sm:min-w-[150px]">
                        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1">
                          <span>{firstAttr.name}</span>
                          <span className="text-white/50 text-xs">\</span>
                          <span>{secondAttr.name}</span>
                        </div>
                      </th>
                      {secondAttrValues.map((val) => (
                        <th
                          key={val.value}
                          className="text-center py-2 px-2 sm:px-3 text-white/80 font-medium border-b border-white/10 min-w-[90px] sm:min-w-[100px] whitespace-nowrap"
                        >
                          <div className="text-xs sm:text-sm">{val.displayName}</div>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {firstAttrValues.map((firstVal) => (
                      <tr key={firstVal.value} className="border-b border-white/5">
                        <td className="py-2 px-2 sm:px-3 text-white/70 font-medium sticky left-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 z-10 border-r border-white/10 min-w-[120px] sm:min-w-[150px]">
                          <div className="text-xs sm:text-sm whitespace-nowrap">{firstVal.displayName}</div>
                        </td>
                        {secondAttrValues.map((secondVal) => {
                          const variant = getVariant(firstVal.value, secondVal.value);
                          const variantIndex = variant ? variants.indexOf(variant) : -1;
                          const isEditing = editingCell?.variantIndex === variantIndex && editingCell?.field === 'price';

                          return (
                            <td
                              key={secondVal.value}
                              className={`py-2 px-1 sm:px-2 sm:px-3 text-center border-r border-white/5 min-w-[90px] sm:min-w-[100px] ${
                                isEditing ? 'bg-blue-500/20' : 'hover:bg-white/5 cursor-pointer'
                              }`}
                              onClick={() => variant && handleCellClick(variantIndex, 'price', variant.price || 0)}
                            >
                              {isEditing ? (
                                <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1 justify-center">
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
                                    className="w-full sm:w-20 px-2 py-1 text-xs sm:text-sm border border-blue-400/50 rounded bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                                      className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                    >
                                      <Save className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    </Button>
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCancel();
                                      }}
                                      className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                    >
                                      <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <span className="text-white font-semibold text-xs sm:text-sm whitespace-nowrap">
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

            {/* Таблица остатков (если нужно) */}
            {onStockChange && (
              <div className="mb-6">
                <h4 className="text-sm font-medium text-white/80 mb-2">Остатки</h4>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm border-collapse min-w-[400px]">
                    <thead>
                      <tr>
                        <th className="text-left py-2 px-2 sm:px-3 text-white/80 font-medium border-b border-white/10 sticky left-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 z-10 min-w-[120px] sm:min-w-[150px]">
                          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-1">
                            <span>{firstAttr.name}</span>
                            <span className="text-white/50 text-xs">\</span>
                            <span>{secondAttr.name}</span>
                          </div>
                        </th>
                        {secondAttrValues.map((val) => (
                          <th
                            key={val.value}
                            className="text-center py-2 px-2 sm:px-3 text-white/80 font-medium border-b border-white/10 min-w-[90px] sm:min-w-[100px] whitespace-nowrap"
                          >
                            <div className="text-xs sm:text-sm">{val.displayName}</div>
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {firstAttrValues.map((firstVal) => (
                        <tr key={firstVal.value} className="border-b border-white/5">
                          <td className="py-2 px-2 sm:px-3 text-white/70 font-medium sticky left-0 bg-gradient-to-r from-purple-500/10 to-blue-500/10 z-10 border-r border-white/10 min-w-[120px] sm:min-w-[150px]">
                            <div className="text-xs sm:text-sm whitespace-nowrap">{firstVal.displayName}</div>
                          </td>
                          {secondAttrValues.map((secondVal) => {
                            const variant = getVariant(firstVal.value, secondVal.value);
                            const variantIndex = variant ? variants.indexOf(variant) : -1;
                            const isEditing = editingCell?.variantIndex === variantIndex && editingCell?.field === 'stock';

                            return (
                              <td
                                key={secondVal.value}
                                className={`py-2 px-1 sm:px-2 sm:px-3 text-center border-r border-white/5 min-w-[90px] sm:min-w-[100px] ${
                                  isEditing ? 'bg-blue-500/20' : 'hover:bg-white/5 cursor-pointer'
                                }`}
                                onClick={() => variant && handleCellClick(variantIndex, 'stock', variant.stock || 0)}
                              >
                                {isEditing ? (
                                  <div className="flex flex-col sm:flex-row items-center gap-1 sm:gap-1 justify-center">
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
                                      className="w-full sm:w-20 px-2 py-1 text-xs sm:text-sm border border-blue-400/50 rounded bg-white/10 text-white focus:outline-none focus:ring-1 focus:ring-blue-400"
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
                                        className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                      >
                                        <Save className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="ghost"
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleCancel();
                                        }}
                                        className="h-5 w-5 sm:h-6 sm:w-6 p-0"
                                      >
                                        <X className="h-2.5 w-2.5 sm:h-3 sm:w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                ) : (
                                  <span className="text-white/70 text-xs sm:text-sm whitespace-nowrap">{variant ? variant.stock || 0 : '-'}</span>
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
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

