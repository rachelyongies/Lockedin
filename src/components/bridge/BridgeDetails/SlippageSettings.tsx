'use client'

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Settings, 
  Info, 
  AlertTriangle, 
  CheckCircle2,
  X,
  RotateCcw,
  Zap,
  Shield
} from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card } from '@/components/ui/Card' 
import { Toggle } from '@/components/ui/Toggle'
import { Tooltip } from '@/components/ui/Tooltip'
import { Input } from '@/components/ui/Input'
import { useDebounce } from '@/hooks/useDebounce'

/**
 * Props for the SlippageSettings component
 */
interface SlippageSettingsProps {
  /** Current slippage tolerance value (0-50) */
  value: number
  /** Callback when slippage value changes */
  onChange: (value: number) => void
  /** Callback when expert mode is toggled */
  onExpertModeChange?: (enabled: boolean) => void
  /** Whether expert mode is currently enabled */
  expertMode?: boolean
  /** Whether the settings panel is visible */
  isVisible?: boolean
  /** Callback to toggle settings panel visibility */
  onToggleVisibility?: () => void
  /** Additional CSS classes */
  className?: string
  /** Whether the component is disabled */
  disabled?: boolean
  /** Whether to show expert mode toggle */
  showExpertMode?: boolean
  /** Whether this is rendered in a modal context */
  isModal?: boolean
  /** Whether to use focus trap for modal context */
  enableFocusTrap?: boolean
}

// TODO: Replace with actual i18n implementation from slippage.json
const useSlippageTranslations = () => {
  return useMemo(() => {
    const translations: Record<string, string> = {
      'slippage.title': 'Slippage Tolerance',
      'slippage.description': 'Your transaction will revert if the price changes unfavorably by more than this percentage',
      'slippage.auto': 'Auto',
      'slippage.custom': 'Custom',
      'slippage.expert_mode': 'Expert Mode',
      'slippage.expert_description': 'Allow high slippage trades and disable confirmations',
      'slippage.preset': '{value}%',
      'slippage.input_placeholder': 'Enter slippage %',
      'slippage.warning_high': 'High slippage tolerance may result in unfavorable trades',  
      'slippage.warning_very_high': 'Very high slippage! Your transaction may be frontrun',
      'slippage.warning_low': 'Low slippage tolerance may cause transaction failures',
      'slippage.error_invalid': 'Enter a valid slippage between 0.01% and 50%',
      'slippage.error_zero': 'Slippage cannot be zero',
      'slippage.reset': 'Reset to default',
      'slippage.apply': 'Apply Settings',
      'slippage.close': 'Close Settings',
      'slippage.recommended': 'Recommended',
      'slippage.advanced': 'Advanced Settings',
      'slippage.toggle_settings': 'Toggle slippage settings',
      'slippage.current_value': 'Current slippage: {value}%',
      'slippage.mev_protection': 'MEV Protection Enabled',
      'slippage.mev_description': 'Protect against front-running and sandwich attacks',
      'slippage.expert_warning': 'Expert Mode Enabled',
      'slippage.expert_warning_desc': 'Confirmations are disabled. Trade carefully.',
      'slippage.settings_validated': 'Settings validated'
    }
    
    return (key: string, params?: Record<string, string | number>) => {
      let text = translations[key] || key
      if (params) {
        Object.entries(params).forEach(([k, v]) => {
          text = text.replace(`{${k}}`, String(v))
        })
      }
      return text
    }
  }, [])
}

// Preset slippage values
const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0, 2.0] as const

// Slippage thresholds for warnings
const SLIPPAGE_THRESHOLDS = {
  LOW: 0.05,
  HIGH: 3.0,
  VERY_HIGH: 10.0,
  MAX: 50.0
} as const

// Default slippage value
const DEFAULT_SLIPPAGE = 0.5

// Debounce delay for input validation
const VALIDATION_DEBOUNCE_MS = 500

/**
 * Parse numeric input with support for different locale formats
 * Supports both decimal comma (EU) and decimal point (US) formats
 */
function parseNumericInput(input: string): number | null {
  if (!input || !input.trim()) return null
  
  // Normalize decimal separators - replace comma with dot
  const normalized = input.replace(',', '.')
  
  // Remove any non-numeric characters except decimal point
  const cleaned = normalized.replace(/[^\d.]/g, '')
  
  if (!cleaned) return null
  
  const parsed = parseFloat(cleaned)
  return isNaN(parsed) ? null : parsed
}

/**
 * Custom hook for focus trap functionality
 */
function useFocusTrap(isActive: boolean, containerRef: React.RefObject<HTMLDivElement | null>) {
  useEffect(() => {
    if (!isActive || !containerRef.current) return

    const container = containerRef.current
    const focusableElements = container.querySelectorAll(
      'button, input, select, textarea, [tabindex]:not([tabindex="-1"])'
    )
    
    if (focusableElements.length === 0) return

    const firstElement = focusableElements[0] as HTMLElement
    const lastElement = focusableElements[focusableElements.length - 1] as HTMLElement

    const handleTabKey = (e: KeyboardEvent) => {
      if (e.key !== 'Tab') return

      if (e.shiftKey) {
        if (document.activeElement === firstElement) {
          lastElement.focus()
          e.preventDefault()
        }
      } else {
        if (document.activeElement === lastElement) {
          firstElement.focus()
          e.preventDefault()
        }
      }
    }

    // Focus first element when trap activates
    firstElement.focus()

    document.addEventListener('keydown', handleTabKey)
    return () => document.removeEventListener('keydown', handleTabKey)
  }, [isActive, containerRef])
}

/**
 * SlippageSettings Component
 * 
 * Provides a comprehensive interface for configuring slippage tolerance
 * with preset values, custom input, expert mode, and accessibility features.
 */
export function SlippageSettings({
  value,
  onChange,
  onExpertModeChange,
  expertMode = false,
  isVisible = false,
  onToggleVisibility,
  className = '',
  disabled = false,
  showExpertMode = true,
  isModal = false,
  enableFocusTrap = false
}: SlippageSettingsProps) {
  const [customValue, setCustomValue] = useState('')
  const [isCustomMode, setIsCustomMode] = useState(false)
  const [inputError, setInputError] = useState<string | null>(null)
  const [lastValidValue, setLastValidValue] = useState(value)

  const containerRef = useRef<HTMLDivElement>(null)
  const t = useSlippageTranslations()

  // Debounced input value for validation
  const debouncedCustomValue = useDebounce(customValue, VALIDATION_DEBOUNCE_MS)

  // Focus trap for modal context
  useFocusTrap(enableFocusTrap && isVisible, containerRef)

  // Initialize custom mode if value is not a preset
  useEffect(() => {
    const isPreset = SLIPPAGE_PRESETS.includes(value as 0.1 | 0.5 | 1 | 2)
    setIsCustomMode(!isPreset)
    if (!isPreset) {
      setCustomValue(value.toString())
    }
    setLastValidValue(value)
  }, [value])

  // Handle debounced custom input validation
  useEffect(() => {
    if (!isCustomMode || !debouncedCustomValue) return

    const numValue = parseNumericInput(debouncedCustomValue)
    
    if (numValue === null) {
      setInputError(t('slippage.error_invalid'))
      return
    }

    if (numValue <= 0) {
      setInputError(t('slippage.error_zero'))
      return
    }

    if (numValue > SLIPPAGE_THRESHOLDS.MAX) {
      setInputError(t('slippage.error_invalid'))
      return
    }

    // Valid value - apply it only if it's different
    if (numValue !== lastValidValue) {
      setInputError(null)
      setLastValidValue(numValue)
      onChange(numValue)
    }
  }, [debouncedCustomValue, isCustomMode, lastValidValue, onChange, t])

  // Determine warning level
  const warningLevel = useMemo(() => {
    if (value <= SLIPPAGE_THRESHOLDS.LOW) return 'low'
    if (value >= SLIPPAGE_THRESHOLDS.VERY_HIGH) return 'very-high'
    if (value >= SLIPPAGE_THRESHOLDS.HIGH) return 'high'
    return 'normal'
  }, [value])

  // Get warning message and color
  const warningInfo = useMemo(() => {
    switch (warningLevel) {
      case 'low':
        return {
          message: t('slippage.warning_low'),
          color: 'text-warning',
          bgColor: 'bg-warning/10 border-warning/20'
        }
      case 'high':
        return {
          message: t('slippage.warning_high'),
          color: 'text-warning',
          bgColor: 'bg-warning/10 border-warning/20'
        }
      case 'very-high':
        return {
          message: t('slippage.warning_very_high'),
          color: 'text-error',
          bgColor: 'bg-error/10 border-error/20'
        }
      default:
        return null
    }
  }, [warningLevel, t])

  // Handle preset selection
  const handlePresetSelect = useCallback((presetValue: number) => {
    if (presetValue === value) return // No change needed

    setIsCustomMode(false)
    setCustomValue('')
    setInputError(null)
    setLastValidValue(presetValue)
    onChange(presetValue)
  }, [onChange, value])

  // Handle custom input change (immediate UI feedback)
  const handleCustomInputChange = useCallback((inputValue: string) => {
    setCustomValue(inputValue)
    setInputError(null) // Clear error immediately for better UX
  }, [])

  // Handle input blur for immediate validation
  const handleCustomInputBlur = useCallback(() => {
    if (!customValue) return

    const numValue = parseNumericInput(customValue)
    
    if (numValue === null) {
      setInputError(t('slippage.error_invalid'))
      return
    }

    if (numValue <= 0) {
      setInputError(t('slippage.error_zero'))
      return
    }

    if (numValue > SLIPPAGE_THRESHOLDS.MAX) {
      setInputError(t('slippage.error_invalid'))
      return
    }

    // Valid value - apply immediately on blur
    if (numValue !== lastValidValue) {
      setInputError(null)
      setLastValidValue(numValue)
      onChange(numValue)
    }
  }, [customValue, lastValidValue, onChange, t])

  // Handle custom mode toggle
  const handleCustomModeToggle = useCallback(() => {
    if (isCustomMode) {
      // Switch back to preset
      const closestPreset = SLIPPAGE_PRESETS.reduce((prev, curr) => 
        Math.abs(curr - value) < Math.abs(prev - value) ? curr : prev
      )
      setIsCustomMode(false)
      setCustomValue('')
      setInputError(null)
      if (closestPreset !== value) {
        setLastValidValue(closestPreset)
        onChange(closestPreset)
      }
    } else {
      // Switch to custom
      setIsCustomMode(true)
      setCustomValue(value.toString())
    }
  }, [isCustomMode, value, onChange])

  // Reset to default
  const handleReset = useCallback(() => {
    setIsCustomMode(false)
    setCustomValue('')
    setInputError(null)
    if (DEFAULT_SLIPPAGE !== value) {
      setLastValidValue(DEFAULT_SLIPPAGE)
      onChange(DEFAULT_SLIPPAGE)
    }
  }, [onChange, value])

  // Handle expert mode toggle
  const handleExpertModeToggle = useCallback((enabled: boolean) => {
    onExpertModeChange?.(enabled)
  }, [onExpertModeChange])

  return (
    <div className={`relative ${className}`}>
      {/* Settings Toggle Button */}
      {onToggleVisibility && (
        <Button
          onClick={onToggleVisibility}
          variant="ghost"
          size="sm"
          className="flex items-center gap-2"
          disabled={disabled}
          aria-label={t('slippage.toggle_settings')}
          aria-expanded={isVisible}
        >
          <Settings className="w-4 h-4" />
          <span className="text-sm">{t('slippage.current_value', { value: value.toFixed(2) })}</span>
        </Button>
      )}

      {/* Settings Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            ref={containerRef}
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 z-50 min-w-80"
            role={isModal ? "dialog" : undefined}
            aria-modal={isModal ? "true" : undefined}
            aria-labelledby={isModal ? "slippage-title" : undefined}
          >
            <Card className="p-4 space-y-4 bg-background/95 backdrop-blur border shadow-xl">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 
                    id={isModal ? "slippage-title" : undefined}
                    className="font-medium text-white flex items-center gap-2"
                  >
                    <Settings className="w-4 h-4" />
                    {t('slippage.title')}
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-64">
                    {t('slippage.description')}
                  </p>
                </div>
                {onToggleVisibility && (
                  <Button
                    onClick={onToggleVisibility}
                    variant="ghost"
                    size="sm"
                    className="shrink-0 -mt-1 -mr-1"
                    aria-label={t('slippage.close')}
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Mode Toggle */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Button
                    onClick={handleCustomModeToggle}
                    variant={!isCustomMode ? "primary" : "secondary"}
                    size="sm"
                    disabled={disabled}
                    className="text-xs"
                  >
                    {t('slippage.auto')}
                  </Button>
                  <Button
                    onClick={handleCustomModeToggle}
                    variant={isCustomMode ? "primary" : "secondary"}
                    size="sm"
                    disabled={disabled}
                    className="text-xs"
                  >
                    {t('slippage.custom')}
                  </Button>
                </div>

                {/* Preset Values */}
                {!isCustomMode && (
                  <div className="grid grid-cols-4 gap-2">
                    {SLIPPAGE_PRESETS.map((preset) => (
                      <Button
                        key={preset}
                        onClick={() => handlePresetSelect(preset)}
                        variant={value === preset ? "primary" : "secondary"}
                        size="sm"
                        disabled={disabled}
                        className="text-xs font-mono"
                        aria-pressed={value === preset}
                      >
                        {t('slippage.preset', { value: preset })}
                        {preset === DEFAULT_SLIPPAGE && (
                          <span className="sr-only">{t('slippage.recommended')}</span>
                        )}
                      </Button>
                    ))}
                  </div>
                )}

                {/* Custom Input */}
                {isCustomMode && (
                  <div className="space-y-2">
                    <div className="relative">
                      <Input
                        type="text"
                        value={customValue}
                        onChange={(e) => handleCustomInputChange(e.target.value)}
                        onBlur={handleCustomInputBlur}
                        placeholder={t('slippage.input_placeholder')}
                        disabled={disabled}
                        className={`font-mono text-sm ${inputError ? 'border-error' : ''}`}
                        aria-label={t('slippage.input_placeholder')}
                        aria-invalid={!!inputError}
                        aria-describedby={inputError ? 'slippage-error' : undefined}
                      />
                      {customValue && !inputError && customValue !== lastValidValue.toString() && (
                        <div className="absolute right-2 top-1/2 -translate-y-1/2">
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          >
                            <Zap className="w-3 h-3 text-primary" />
                          </motion.div>
                        </div>
                      )}
                    </div>
                    
                    {inputError && (
                      <p id="slippage-error" className="text-xs text-error flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        {inputError}
                      </p>
                    )}
                  </div>
                )}
              </div>

              {/* Warning Message */}
              <AnimatePresence>
                {warningInfo && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className={`flex items-start gap-2 p-3 border rounded-lg ${warningInfo.bgColor}`}
                    role="alert"
                  >
                    <AlertTriangle className={`w-4 h-4 shrink-0 mt-0.5 ${warningInfo.color}`} />
                    <p className={`text-xs ${warningInfo.color}`}>
                      {warningInfo.message}
                    </p>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Expert Mode */}
              {showExpertMode && onExpertModeChange && (
                <div className="pt-3 border-t border-border/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-white">
                          {t('slippage.expert_mode')}
                        </span>
                        <Tooltip content={t('slippage.expert_description')}>
                          <Info className="w-3 h-3 text-muted-foreground" />
                        </Tooltip>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {t('slippage.expert_description')}
                      </p>
                    </div>
                    <Toggle
                      checked={expertMode}
                      onCheckedChange={handleExpertModeToggle}
                      disabled={disabled}
                      variant={expertMode ? "warning" : "default"}
                      aria-label={t('slippage.expert_mode')}
                    />
                  </div>

                  {expertMode && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: 'auto' }}
                      className="flex items-start gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg"
                    >
                      <AlertTriangle className="w-4 h-4 text-warning shrink-0 mt-0.5" />
                      <div className="space-y-1">
                        <p className="text-xs font-medium text-warning">
                          {t('slippage.expert_warning')}
                        </p>
                        <p className="text-xs text-warning/80">
                          {t('slippage.expert_warning_desc')}
                        </p>
                      </div>
                    </motion.div>
                  )}
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <Button
                  onClick={handleReset}
                  variant="ghost"
                  size="sm"
                  disabled={disabled || value === DEFAULT_SLIPPAGE}
                  className="text-xs flex items-center gap-1"
                  aria-label={t('slippage.reset')}
                >
                  <RotateCcw className="w-3 h-3" />
                  {t('slippage.reset')}
                </Button>

                <div className="flex items-center gap-2">
                  {warningLevel === 'normal' && (
                    <CheckCircle2 
                      className="w-4 h-4 text-green-500" 
                      aria-label={t('slippage.settings_validated')}
                    />
                  )}
                  <span className="text-xs text-muted-foreground font-mono">
                    {value.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* MEV Protection Notice */}
              <div className="flex items-center gap-2 p-2 bg-primary/5 border border-primary/10 rounded text-xs">
                <Shield className="w-3 h-3 text-primary" aria-hidden="true" />
                <span className="text-primary font-medium">
                  {t('slippage.mev_protection')}
                </span>
                <Tooltip content={t('slippage.mev_description')}>
                  <Info className="w-3 h-3 text-muted-foreground" />
                </Tooltip>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}