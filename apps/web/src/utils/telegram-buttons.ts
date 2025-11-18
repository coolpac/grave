/**
 * Optimized Telegram Buttons Wrapper
 * 
 * Provides lifecycle management for MainButton and BackButton
 * Prevents duplicate handlers and manages visibility properly
 */

import WebApp from '@twa-dev/sdk'
import { safeBackButton, safeMainButton } from './telegramSafe'

export interface ButtonHandler {
  id: string
  callback: () => void
}

/**
 * Optimized MainButton wrapper with lifecycle management
 */
export class OptimizedMainButton {
  private handlers: Map<string, () => void> = new Map()
  private isVisible: boolean = false
  private currentText: string = ''
  private currentColor: string = ''
  private currentTextColor: string = ''
  private button = safeMainButton()

  /**
   * Set button text (memoized)
   */
  setText = (text: string) => {
    if (this.currentText === text) return
    this.currentText = text
    this.button.setText(text)
  }

  /**
   * Set button colors (memoized)
   */
  setParams = (params: { color?: string; textColor?: string }) => {
    const { color, textColor } = params
    const nextParams: Record<string, string> = {}

    if (color && this.currentColor !== color) {
      this.currentColor = color
      nextParams.color = color
    }
    if (textColor && this.currentTextColor !== textColor) {
      this.currentTextColor = textColor
      nextParams.text_color = textColor
    }

    if (Object.keys(nextParams).length > 0) {
      this.button.setParams(nextParams as any)
    }
  }

  /**
   * Add click handler (prevents duplicates)
   */
  onClick = (callback: () => void, id?: string): string => {
    const handlerId = id || `handler_${Date.now()}_${Math.random()}`
    
    // Remove existing handler with same ID if exists
    if (this.handlers.has(handlerId)) {
      this.offClick(handlerId)
    }

    // Add new handler
    this.handlers.set(handlerId, callback)
    this.button.onClick(callback)

    return handlerId
  }

  /**
   * Remove click handler by ID
   */
  offClick = (id: string) => {
    const callback = this.handlers.get(id)
    if (callback) {
      this.button.offClick(callback)
      this.handlers.delete(id)
    }
  }

  /**
   * Remove all click handlers
   */
  clearHandlers = () => {
    this.handlers.forEach((callback) => {
      this.button.offClick(callback)
    })
    this.handlers.clear()
  }

  /**
   * Show button (only if not already visible)
   */
  show = () => {
    if (!this.isVisible) {
      this.isVisible = true
      this.button.show()
    }
  }

  /**
   * Hide button (only if visible)
   */
  hide = () => {
    if (this.isVisible) {
      this.isVisible = false
      this.button.hide()
    }
  }

  /**
   * Enable button
   */
  enable = () => {
    this.button.enable()
  }

  /**
   * Disable button
   */
  disable = () => {
    this.button.disable()
  }

  /**
   * Show progress indicator
   */
  showProgress = (leaveActive?: boolean) => {
    this.button.showProgress(leaveActive)
  }

  /**
   * Hide progress indicator
   */
  hideProgress = () => {
    this.button.hideProgress()
  }

  /**
   * Get current state
   */
  getState = () => ({
    isVisible: this.isVisible,
    text: this.currentText,
    color: this.currentColor,
    textColor: this.currentTextColor,
    handlersCount: this.handlers.size,
  })
}

/**
 * Optimized BackButton wrapper with lifecycle management
 */
export class OptimizedBackButton {
  private handlers: Map<string, () => void> = new Map()
  private isVisible: boolean = false
  private button = safeBackButton()

  /**
   * Add click handler (prevents duplicates)
   */
  onClick = (callback: () => void, id?: string): string => {
    const handlerId = id || `handler_${Date.now()}_${Math.random()}`
    
    // Remove existing handler with same ID if exists
    if (this.handlers.has(handlerId)) {
      this.offClick(handlerId)
    }

    // Add new handler
    this.handlers.set(handlerId, callback)
    this.button.onClick(callback)

    return handlerId
  }

  /**
   * Remove click handler by ID
   */
  offClick = (id: string) => {
    const callback = this.handlers.get(id)
    if (callback) {
      this.button.offClick(callback)
      this.handlers.delete(id)
    }
  }

  /**
   * Remove all click handlers
   */
  clearHandlers = () => {
    this.handlers.forEach((callback) => {
      this.button.offClick(callback)
    })
    this.handlers.clear()
  }

  /**
   * Show button (only if not already visible)
   */
  show = () => {
    if (!this.isVisible) {
      this.isVisible = true
      this.button.show()
    }
  }

  /**
   * Hide button (only if visible)
   */
  hide = () => {
    if (this.isVisible) {
      this.isVisible = false
      this.button.hide()
    }
  }

  /**
   * Get current state
   */
  getState = () => ({
    isVisible: this.isVisible,
    handlersCount: this.handlers.size,
  })
}

