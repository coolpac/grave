import { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Bug, X, Trash2, ChevronDown, ChevronUp, ShoppingCart, Monitor, Smartphone, RefreshCw } from 'lucide-react'
import axios from 'axios'
import { API_URL } from '../config/api'
import { useTgViewport } from '../hooks/useTgViewport'
import { useTelegram } from '../hooks/useTelegram'

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
    // Добавляем новый лог в начало, чтобы последние события были сверху
    this.logs.unshift(entry)
    // Ограничиваем количество логов, сохраняя самые свежие
    if (this.logs.length > 100) {
      this.logs = this.logs.slice(0, 100)
    }
    // Всегда логируем в консоль для отладки - ЯВНО и ВСЕГДА
    try {
      const consoleMethod = type === 'error' ? console.error : type === 'warn' ? console.warn : console.log
      const prefix = `🐛 [DebugPanel ${type.toUpperCase()}]`
      if (data) {
        consoleMethod(prefix, message, data)
      } else {
        consoleMethod(prefix, message)
      }
    } catch (e) {
      // Fallback если console недоступен
      console.log('[DebugPanel] Log error:', e)
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

// Начальное тестовое логирование при загрузке модуля - ЯВНО И НЕМЕДЛЕННО
if (typeof window !== 'undefined') {
  // Сразу логируем в консоль напрямую
  console.log('🐛 [DebugPanel] Module loading...', new Date().toISOString())
  
  // НЕМЕДЛЕННО добавляем лог в debugLogger (до монтирования компонентов)
  debugLogger.log('info', '📦 DebugPanel module loaded', {
    timestamp: new Date().toISOString(),
    userAgent: navigator.userAgent,
    location: window.location.href,
  })
  
  console.log('🐛 [DebugPanel] Module loaded, initial log added')
}

// Компонент дебаг панели
export default function DebugPanel() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [viewportInfo, setViewportInfo] = useState<any>(null)
  const [headerInfo, setHeaderInfo] = useState<any>(null)
  const [scrollInfo, setScrollInfo] = useState<any>(null)
  const [forceUpdate, setForceUpdate] = useState(0)
  const logsEndRef = useRef<HTMLDivElement>(null)
  const updateInfoRef = useRef<(() => void) | null>(null)
  const { safeAreaInsetTop, viewportHeight, viewport } = useTgViewport()
  const { isReady, themeParams } = useTelegram()
  const viewportStableHeight = viewport?.stableHeight

  // Собираем информацию о viewport и header (всегда, даже когда панель закрыта)
  useEffect(() => {
    const updateInfo = () => {
      const header = document.querySelector('.granite-header') as HTMLElement
      const headerSpacer = document.querySelector('.granite-header-spacer') as HTMLElement
      
      const viewportData = {
        width: window.innerWidth,
        height: window.innerHeight,
        tgHeight: viewportHeight,
        tgStableHeight: viewportStableHeight,
        safeAreaTop: safeAreaInsetTop,
        safeAreaTopEnv: getComputedStyle(document.documentElement).getPropertyValue('--tg-top-safe'),
      }
      
      const headerData = header ? {
        exists: true,
        top: header.getBoundingClientRect().top,
        height: header.offsetHeight,
        paddingTop: getComputedStyle(header).paddingTop,
        position: getComputedStyle(header).position,
        zIndex: getComputedStyle(header).zIndex,
        backgroundColor: getComputedStyle(header).backgroundColor,
      } : { exists: false }
      
      const scrollData = {
        windowScrollY: window.scrollY,
        documentElementScrollTop: document.documentElement.scrollTop,
        bodyScrollTop: document.body.scrollTop,
      }
      
      setViewportInfo(viewportData)
      setHeaderInfo(headerData)
      setScrollInfo(scrollData)
      
      // Логируем только при значительных изменениях
      if (header && headerData.exists && isOpen) {
        debugLog.info('📊 Viewport/Header update', {
          viewport: viewportData,
          header: headerData,
          scroll: scrollData,
        })
      }
    }

    // Сохраняем ссылку на функцию обновления
    updateInfoRef.current = updateInfo

    // Немедленное обновление
    updateInfo()
    
    // Обновление каждую секунду
    const interval = setInterval(updateInfo, 1000)
    
    // Обновление при скролле
    const handleScroll = () => {
      updateInfo()
    }
    
    // Обновление при изменении размера
    const handleResize = () => {
      updateInfo()
    }
    
    // Обновление при изменении viewport (Telegram)
    const handleViewportChange = () => {
      updateInfo()
    }
    
    window.addEventListener('scroll', handleScroll, { passive: true })
    window.addEventListener('resize', handleResize)
    
    // Слушаем изменения viewport от Telegram
    if ((window as any).Telegram?.WebApp) {
      (window as any).Telegram.WebApp.onEvent('viewportChanged', handleViewportChange)
    }
    
    return () => {
      clearInterval(interval)
      window.removeEventListener('scroll', handleScroll)
      window.removeEventListener('resize', handleResize)
      if ((window as any).Telegram?.WebApp) {
        (window as any).Telegram.WebApp.offEvent('viewportChanged', handleViewportChange)
      }
    }
  }, [safeAreaInsetTop, viewportHeight, viewport, isReady, isOpen, forceUpdate])

  useEffect(() => {
    const unsubscribe = debugLogger.subscribe(setLogs)
    const currentLogs = debugLogger.getLogs()
    setLogs(currentLogs)
    
    // Логируем при открытии панели
    if (isOpen) {
      debugLog.info('🔍 Debug Panel opened', {
        logsCount: currentLogs.length,
        timestamp: new Date().toISOString(),
        viewport: viewportInfo,
        header: headerInfo,
        scroll: scrollInfo,
      })
      
      // Принудительно обновляем информацию при открытии
      if (updateInfoRef.current) {
        setTimeout(() => {
          updateInfoRef.current?.()
        }, 100)
      }
    }
    
    return () => { unsubscribe() }
  }, [isOpen, viewportInfo, headerInfo, scrollInfo])

  // Начальное логирование при монтировании DebugPanel - ЯВНО
  useEffect(() => {
    console.log('🐛 [DebugPanel] Component mounting...', new Date().toISOString())
    
    const initialLogs = debugLogger.getLogs()
    console.log('🐛 [DebugPanel] Initial logs count:', initialLogs.length)
    if (initialLogs.length > 0) {
      console.log('🐛 [DebugPanel] Last 5 logs:', initialLogs.slice(-5).map(l => l.message))
    }
    
    debugLog.info('🐛 DebugPanel component mounted', {
      timestamp: new Date().toISOString(),
      initialLogsCount: initialLogs.length,
      initialLogs: initialLogs.slice(-5).map(l => l.message), // Последние 5 логов
    })
    
    // Принудительно обновляем состояние
    setLogs([...initialLogs])
    
    console.log('🐛 [DebugPanel] Component mounted, total logs:', initialLogs.length)
  }, [])

  useEffect(() => {
    if (isOpen && !isMinimized) {
      // Скроллим к началу (новые логи сверху)
      const logsContainer = logsEndRef.current?.parentElement
      if (logsContainer) {
        logsContainer.scrollTop = 0
      }
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
        onClick={() => {
          setIsOpen(true)
          // Тестовое логирование при открытии
          debugLog.info('🔍 Debug Panel opened by button click', {
            timestamp: new Date().toISOString(),
            totalLogs: debugLogger.getLogs().length,
          })
        }}
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
        {logs.length > 0 && (
          <span className="absolute -top-1 -left-1 w-5 h-5 bg-blue-500 rounded-full text-xs flex items-center justify-center">
            {logs.length}
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
                {viewportInfo && (
                  <span className="text-xs text-gray-500">
                    {viewportInfo.width}x{viewportInfo.height}
                  </span>
                )}
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
                  onClick={() => {
                    if (updateInfoRef.current) {
                      updateInfoRef.current()
                      setForceUpdate(prev => prev + 1)
                      debugLog.info('🔄 Info refreshed manually')
                    }
                  }}
                  className="p-1 hover:bg-gray-700 rounded"
                  title="Refresh info"
                >
                  <RefreshCw className="w-4 h-4 text-gray-400" />
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
                {/* Viewport & Header Info */}
                <div className="mb-4 p-3 bg-gray-800 rounded border border-gray-700">
                  <div className="flex items-center gap-2 mb-2">
                    <Monitor className="w-4 h-4 text-blue-400" />
                    <span className="font-semibold text-white">System Info</span>
                    {(!viewportInfo && !headerInfo && !scrollInfo) && (
                      <span className="text-xs text-yellow-400 ml-2">(Click refresh to load)</span>
                    )}
                  </div>
                  
                  {viewportInfo ? (
                    <div className="mb-2">
                      <div className="text-yellow-400 font-semibold mb-1">Viewport:</div>
                      <div className="text-gray-300 pl-2 text-xs">
                        <div>Size: {viewportInfo.width} × {viewportInfo.height}px</div>
                        {viewportInfo.tgHeight && <div>TG Height: {viewportInfo.tgHeight}px</div>}
                        {viewportInfo.tgStableHeight && <div>TG Stable: {viewportInfo.tgStableHeight}px</div>}
                        <div>Safe Area Top: {viewportInfo.safeAreaTop}px</div>
                        {viewportInfo.safeAreaTopEnv && <div>Safe Area (env): {viewportInfo.safeAreaTopEnv}</div>}
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 text-gray-500 text-xs">Viewport: Not loaded</div>
                  )}
                  
                  {headerInfo ? (
                    <div className="mb-2">
                      <div className="text-green-400 font-semibold mb-1">Header:</div>
                      {headerInfo.exists ? (
                        <div className="text-gray-300 pl-2 text-xs">
                          <div>Position: top={Math.round(headerInfo.top)}px, height={Math.round(headerInfo.height)}px</div>
                          <div>CSS Position: {headerInfo.position}</div>
                          <div>Padding Top: {headerInfo.paddingTop}</div>
                          <div>Z-Index: {headerInfo.zIndex}</div>
                          <div className="truncate">BG: {headerInfo.backgroundColor}</div>
                        </div>
                      ) : (
                        <div className="text-red-400 pl-2 text-xs">❌ Header not found!</div>
                      )}
                    </div>
                  ) : (
                    <div className="mb-2 text-gray-500 text-xs">Header: Not loaded</div>
                  )}
                  
                  {scrollInfo ? (
                    <div className="mb-2">
                      <div className="text-purple-400 font-semibold mb-1">Scroll:</div>
                      <div className="text-gray-300 pl-2 text-xs">
                        <div>window.scrollY: {Math.round(scrollInfo.windowScrollY)}px</div>
                        <div>documentElement.scrollTop: {Math.round(scrollInfo.documentElementScrollTop)}px</div>
                        <div>body.scrollTop: {Math.round(scrollInfo.bodyScrollTop)}px</div>
                      </div>
                    </div>
                  ) : (
                    <div className="mb-2 text-gray-500 text-xs">Scroll: Not loaded</div>
                  )}
                </div>
                
                {logs.length === 0 ? (
                  <div className="text-gray-500 text-center py-8">
                    No logs yet. Perform actions to see debug info.
                  </div>
                ) : (
                  // Показываем логи в обратном порядке (новые сверху)
                  [...logs].reverse().map((log) => (
                    <div 
                      key={log.id} 
                      className="py-1 border-b border-gray-800 last:border-b-0"
                    >
                      <div className="flex items-start gap-2">
                        <span className="text-gray-500 shrink-0 text-xs">
                          {formatTime(log.timestamp)}
                        </span>
                        <span className="shrink-0">{getTypeIcon(log.type)}</span>
                        <span className={`${getTypeColor(log.type)} break-all flex-1`}>
                          {log.message}
                        </span>
                      </div>
                      {log.data !== undefined && (
                        <pre className="mt-1 ml-20 text-gray-400 overflow-x-auto whitespace-pre-wrap break-all bg-gray-800 p-1 rounded text-xs">
                          {typeof log.data === 'object' 
                            ? JSON.stringify(log.data, null, 2)
                            : String(log.data)
                          }
                        </pre>
                      )}
                    </div>
                  ))
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
}
