/**
 * Скрипт для измерения FPS при скролле списка товаров
 * 
 * Использование:
 * 1. Откройте DevTools (F12)
 * 2. Перейдите на вкладку Console
 * 3. Скопируйте и выполните этот скрипт
 * 4. Прокрутите список товаров
 * 5. FPS будет отображаться в консоли
 */

(function measureFPS() {
  let lastTime = performance.now()
  let frameCount = 0
  let fps = 0
  let isMeasuring = false

  // Создаем индикатор FPS
  const fpsIndicator = document.createElement('div')
  fpsIndicator.id = 'fps-indicator'
  fpsIndicator.style.cssText = `
    position: fixed;
    top: 10px;
    right: 10px;
    background: rgba(0, 0, 0, 0.8);
    color: #fff;
    padding: 8px 12px;
    border-radius: 4px;
    font-family: monospace;
    font-size: 14px;
    z-index: 10000;
    pointer-events: none;
  `
  document.body.appendChild(fpsIndicator)

  function updateFPS() {
    frameCount++
    const currentTime = performance.now()
    const delta = currentTime - lastTime

    if (delta >= 1000) {
      fps = Math.round((frameCount * 1000) / delta)
      frameCount = 0
      lastTime = currentTime

      // Обновляем индикатор
      fpsIndicator.textContent = `FPS: ${fps}`
      fpsIndicator.style.color = fps >= 55 ? '#4ade80' : fps >= 30 ? '#fbbf24' : '#ef4444'

      // Логируем в консоль
      if (isMeasuring) {
        console.log(`FPS: ${fps}`)
      }
    }

    requestAnimationFrame(updateFPS)
  }

  // Начинаем измерение
  function startMeasurement() {
    isMeasuring = true
    console.log('🚀 Начато измерение FPS. Прокрутите список товаров.')
    updateFPS()
  }

  // Останавливаем измерение
  function stopMeasurement() {
    isMeasuring = false
    console.log('⏹️ Измерение FPS остановлено.')
  }

  // Экспортируем функции в глобальную область
  window.startFPSMeasurement = startMeasurement
  window.stopFPSMeasurement = stopMeasurement

  // Автоматически начинаем измерение
  startMeasurement()

  console.log(`
📊 FPS Measurement Tool

Команды:
- window.startFPSMeasurement() - начать измерение
- window.stopFPSMeasurement() - остановить измерение

Индикатор FPS отображается в правом верхнем углу экрана.
  `)
})()





