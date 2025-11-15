import { motion } from 'framer-motion'
import { CreditCard, Receipt } from 'lucide-react'

export type PaymentMethod = 'invoice' | 'telegram-payments'

interface PaymentMethodProps {
  value: PaymentMethod
  onChange: (method: PaymentMethod) => void
}

const paymentMethods = [
  {
    id: 'invoice' as PaymentMethod,
    label: 'Счёт/Инвойс',
    description: 'Оплата по счёту',
    icon: Receipt,
    available: true,
  },
  {
    id: 'telegram-payments' as PaymentMethod,
    label: 'Telegram Payments',
    description: 'Оплата через Telegram',
    icon: CreditCard,
    available: false, // Заглушка
  },
]

export default function PaymentMethodSelect({ value, onChange }: PaymentMethodProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-semibold">Способ оплаты</h3>
      <div className="space-y-2">
        {paymentMethods.map((method) => {
          const Icon = method.icon
          const isSelected = value === method.id
          const isDisabled = !method.available

          return (
            <motion.button
              key={method.id}
              type="button"
              onClick={() => !isDisabled && onChange(method.id)}
              disabled={isDisabled}
              className={`w-full p-4 rounded-lg border-2 transition-all text-left ${
                isSelected
                  ? 'border-accent bg-accent/10'
                  : 'border-border hover:border-accent/50'
              } ${isDisabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}
              whileHover={!isDisabled ? { scale: 1.02 } : {}}
              whileTap={!isDisabled ? { scale: 0.98 } : {}}
            >
              <div className="flex items-center gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    isSelected ? 'bg-accent text-accent-foreground' : 'bg-panel'
                  }`}
                >
                  <Icon className="w-5 h-5" />
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">{method.label}</span>
                    {isDisabled && (
                      <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                        Скоро
                      </span>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">{method.description}</p>
                </div>
                {isSelected && (
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    className="w-5 h-5 rounded-full bg-accent flex items-center justify-center"
                  >
                    <div className="w-2 h-2 rounded-full bg-accent-foreground" />
                  </motion.div>
                )}
              </div>
            </motion.button>
          )
        })}
      </div>
    </div>
  )
}






