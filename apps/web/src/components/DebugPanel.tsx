import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bug, X, Trash2, ChevronDown, ChevronUp, ShoppingCart } from 'lucide-react'
import axios from 'axios'
import { API_URL } from '../config/api'

interface LogEntry {
  id: number
  timestamp: Date
  type: 'info' | 'warn' | 'error' | 'action'
  message: string
  data?: any
}

// Глобальный логгер для дебага
class DebugLogger {
  private static instance: DebugLogger
  private logs: LogEntry[] = []
  private listeners: Set<(logs: LogEntry[]) => void> = new Set()
  private idCounter = 0

  static getInstance(): DebugLogger {
    if (!DebugLogger.instance) {
      DebugLogger.instance = new DebugLogger()
    }
    return DebugLogger.instance
  }

  log(type: LogEntry['type'], message: string, data?: any) {
    const entry: LogEntry = {
      id: this.idCounter++,
      timestamp: new Date(),
      type,
      message,
      data,
    }
    this.logs.push(entry)
    // Ограничиваем количество логов
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(-100)
    }
    this.notifyListeners()
  }

  clear() {
    this.logs = []
    this.notifyListeners()
  }

  getLogs() {
    return [...this.logs]
  }

  subscribe(listener: (logs: LogEntry[]) => void) {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.getLogs()))
  }
}

export const debugLogger = DebugLogger.getInstance()

// Хелперы для удобного логирования
export const debugLog = {
  info: (message: string, data?: any) => debugLogger.log('info', message, data),
  warn: (message: string, data?: any) => debugLogger.log('warn', message, data),
  error: (message: string, data?: any) => debugLogger.log('error', message, data),
  action: (message: string, data?: any) => debugLogger.log('action', message, data),
}

// Компонент дебаг панели
export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const logsEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const unsubscribe = debugLogger.subscribe(setLogs)
    setLogs(debugLogger.getLogs())
    return () => { unsubscribe() }
  }, [])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      logsEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }
  }, [logs, isOpen, isMinimized])

  const getTypeColor = (type: LogEntry['type']) => {
    switch (type) {
      case 'info': return 'text-blue-400'
      case 'warn': return 'text-yellow-400'
      case 'error': return 'text-red-400'
      case 'action': return 'text-green-400'
      default: return 'text-gray-400'
    }
  }

  const getTypeIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'info': return 'ℹ️'
      case 'warn': return '⚠️'
      case 'error': return '❌'
      case 'action': return '🔵'
      default: return '📝'
    }
  }

  const formatTime = (date: Date) => {
    const time = date.toLocaleTimeString('ru-RU', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit'
    })
    const ms = date.getMilliseconds().toString().padStart(3, '0')
    return `${time}.${ms}`
  }

  return (
    <>
      {/* Кнопка открытия дебаг панели */}
      <motion.button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-20 right-4 z-[9999] w-12 h-12 rounded-full bg-purple-600 text-white shadow-lg flex items-center justify-center"
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        style={{ display: isOpen ? 'none' : 'flex' }}
      >
        <Bug className="w-6 h-6" />
        {logs.filter(l => l.type === 'error').length > 0 && (
          <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 rounded-full text-xs flex items-center justify-center">
            {logs.filter(l => l.type === 'error').length}
          </span>
        )}
      </motion.button>

      {/* Дебаг панель */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 100 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 100 }}
            className="fixed inset-x-0 bottom-0 z-[9999] bg-gray-900 text-white shadow-2xl"
            style={{ 
              height: isMinimized ? '48px' : '60vh',
              maxHeight: isMinimized ? '48px' : '400px'
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-2 bg-gray-800 border-b border-gray-700">
              <div className="flex items-center gap-2">
                <Bug className="w-5 h-5 text-purple-400" />
                <span className="font-semibold text-sm">Debug Panel</span>
                <span className="text-xs text-gray-400">({logs.length} logs)</span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={async () => {
                    try {
                      debugLog.action('🗑️ Clearing ALL cart data...')
                      // Всегда очищаем localStorage
                      localStorage.removeItem('cart_items')
                      localStorage.removeItem('cart_sync_timestamp')
                      debugLog.info('Local cart cleared')
                      
                      const token = localStorage.getItem('token')
                      if (token) {
                        debugLog.info('Clearing server cart...')
                        await axios.delete(`${API_URL}/cart/clear`, {
                          headers: { Authorization: `Bearer ${token}` }
                        })
                        debugLog.info('Server cart cleared')
                      }
                      // Reload page to refresh cart state
                      window.location.reload()
                    } catch (err: any) {
                      debugLog.error('Failed to clear cart', err.message)
                      // Все равно перезагружаем страницу
                      window.location.reload()
                    }
                  }}
                  className="p-1 hover:bg-red-700 rounded bg-red-600"
                  title="Clear cart (all)"
                >
                  <ShoppingCart className="w-4 h-4 text-white" />
                </button>
                <button
                  onClick={() => debugLogger.clear()}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Clear logs"
                >
                  <Trash2 className="w-4 h-4 text-gray-400" />
                </button>
                <button
                  onClick={() => setIsMinimized(!isMinimized)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  {isMinimized ? (
                    <ChevronUp className="w-4 h-4 text-gray-400" />
                  ) : (
                    <ChevronDown className="w-4 h-4 text-gray-400" />
                  )}
                </button>
                <button
                  onClick={() => setIsOpen(false)}
                  className="p-1 hover:bg-gray-700 rounded"
                >
                  <X className="w-4 h-4 text-gray-400" />
                </button>
              </div>
            </div>

            {/* Logs */}
            {!isMinimized && (
              <div className="overflow-auto h-[calc(100%-48px)] p-2 font-mono text-xs">
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No logs yet. Perform actions to see debug info.
                  </div>
                ) : (
                  logs.map((log) => (
                    <div 
                      key={log.id} 
                      className="py-1 border-b border-gray-800 last:border-b-0"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0">
                          {formatTime(log.timestamp)}
                        </span>
                        <span className="shrink-0">{getTypeIcon(log.type)}</span>
                        <span className={`${getTypeColor(log.type)} break-all`}>
                          {log.message}
                        </span>
                      </div>
                      {log.data !== undefined && (
                        <pre className="mt-1 ml-20 text-gray-400 overflow-x-auto whitespace-pre-wrap break-all bg-gray-800 p-1 rounded">
                          {typeof log.data === 'object' 
                            ? JSON.stringify(log.data, null, 2)
                            : String(log.data)
                          }
                        </pre>
                      )}
                    </div>
                  ))
                )}
                <div ref={logsEndRef} />
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
