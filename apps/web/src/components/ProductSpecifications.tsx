import { Info } from 'lucide-react';

interface ProductSpecificationsProps {
  specifications?: Record<string, string>;
  className?: string;
}

export default function ProductSpecifications({ specifications, className = '' }: ProductSpecificationsProps) {
  if (!specifications || Object.keys(specifications).length === 0) {
    return null;
  }

  const specsEntries = Object.entries(specifications).filter(([key, value]) => key.trim() && value.trim());

  if (specsEntries.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-3 ${className}`}>
      <div className="flex items-center gap-2 mb-4">
        <Info className="h-5 w-5 text-gray-700" />
        <h3 className="text-lg font-inscription text-gray-900">Характеристики</h3>
      </div>
      <div className="space-y-2.5">
        {specsEntries.map(([key, value], index) => (
          <div
            key={index}
            className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-4 py-2 border-b border-gray-200 last:border-b-0"
          >
            <div className="flex-shrink-0 sm:w-48">
              <span className="text-sm font-body font-medium text-gray-700">{key}</span>
            </div>
            <div className="flex-1">
              <span className="text-sm font-body text-gray-900">{value}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

