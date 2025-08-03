'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Settings2, 
  Zap, 
  DollarSign, 
  Shield, 
  RotateCcw,
  Info,
  X,
  Brain
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Tooltip } from '@/components/ui/Tooltip';
import { cn } from '@/lib/utils/helpers';

interface UserPreferencesProps {
  userPreference: 'speed' | 'cost' | 'security' | 'balanced';
  onUserPreferenceChange: (preference: 'speed' | 'cost' | 'security' | 'balanced') => void;
  maxSlippage: number;
  onMaxSlippageChange: (slippage: number) => void;
  gasPreference: 'slow' | 'standard' | 'fast';
  onGasPreferenceChange: (preference: 'slow' | 'standard' | 'fast') => void;
  isVisible?: boolean;
  onToggleVisibility?: () => void;
  className?: string;
  disabled?: boolean;
}

const PREFERENCE_OPTIONS = [
  {
    value: 'speed' as const,
    label: 'Speed First',
    description: 'Fastest execution, higher fees',
    agentFocus: 'Route Discovery & Execution Strategy agents get 2x weight',
    icon: Zap,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20'
  },
  {
    value: 'cost' as const,
    label: 'Cost Optimal',
    description: 'Lowest fees, may take longer',
    agentFocus: 'Market Intelligence & Route Discovery agents get 2x weight',
    icon: DollarSign,
    color: 'text-green-500',
    bgColor: 'bg-green-500/10 border-green-500/20'
  },
  {
    value: 'security' as const,
    label: 'Security First',
    description: 'MEV protection, private pools',
    agentFocus: 'Security & Risk Assessment agents get 2x weight',
    icon: Shield,
    color: 'text-purple-500',
    bgColor: 'bg-purple-500/10 border-purple-500/20'
  },
  {
    value: 'balanced' as const,
    label: 'Balanced',
    description: 'Good balance of speed, cost & security',
    agentFocus: 'All AI agents weighted equally',
    icon: Settings2,
    color: 'text-blue-500',
    bgColor: 'bg-blue-500/10 border-blue-500/20'
  }
] as const;

const SLIPPAGE_PRESETS = [0.1, 0.5, 1.0, 2.0] as const;

const GAS_OPTIONS = [
  { value: 'slow' as const, label: 'Slow', description: 'Lower fees, slower confirmation' },
  { value: 'standard' as const, label: 'Standard', description: 'Balanced speed and cost' },
  { value: 'fast' as const, label: 'Fast', description: 'Higher fees, faster confirmation' }
] as const;

export function UserPreferences({
  userPreference,
  onUserPreferenceChange,
  maxSlippage,
  onMaxSlippageChange,
  gasPreference,
  onGasPreferenceChange,
  isVisible = false,
  onToggleVisibility,
  className = '',
  disabled = false
}: UserPreferencesProps) {
  const [customSlippage, setCustomSlippage] = useState('');

  const currentPreference = PREFERENCE_OPTIONS.find(p => p.value === userPreference);

  const handleSlippagePreset = (preset: number) => {
    onMaxSlippageChange(preset);
    setCustomSlippage('');
  };

  const handleCustomSlippage = (value: string) => {
    setCustomSlippage(value);
    const numValue = parseFloat(value);
    if (!isNaN(numValue) && numValue > 0 && numValue <= 50) {
      onMaxSlippageChange(numValue);
    }
  };

  const resetToDefaults = () => {
    onUserPreferenceChange('balanced');
    onMaxSlippageChange(0.5);
    onGasPreferenceChange('standard');
    setCustomSlippage('');
  };

  return (
    <div className={cn('relative', className)}>
      {/* Toggle Button */}
      {onToggleVisibility && (
        <Button
          onClick={onToggleVisibility}
          variant="ghost"
          size="sm"
          className="!flex !flex-row !items-center !justify-center gap-2 px-3 py-3 h-auto min-h-[2.5rem]"
          disabled={disabled}
          aria-label="Toggle user preferences"
          aria-expanded={isVisible}
        >
          {currentPreference && (
            <div className="flex items-center gap-2">
              <currentPreference.icon className="w-4 h-4 text-white" />
              <span className="text-sm">{currentPreference.label}</span>
            </div>
          )}
        </Button>
      )}

      {/* Preferences Panel */}
      <AnimatePresence>
        {isVisible && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute top-full right-0 mt-2 z-50 min-w-96"
          >
            <Card className="p-4 space-y-4 bg-background/95 backdrop-blur border shadow-xl">
              {/* Header */}
              <div className="flex items-start justify-between">
                <div className="space-y-1">
                  <h3 className="font-medium text-white flex items-center gap-2">
                    <Settings2 className="w-4 h-4" />
                    Trading Preferences
                  </h3>
                  <p className="text-xs text-muted-foreground max-w-72">
                    Your focus affects AI agent weighting in consensus finding
                  </p>
                </div>
                {onToggleVisibility && (
                  <Button
                    onClick={onToggleVisibility}
                    variant="ghost"
                    size="sm"
                    className="shrink-0 -mt-1 -mr-1"
                    aria-label="Close preferences"
                  >
                    <X className="w-4 h-4" />
                  </Button>
                )}
              </div>

              {/* Strategy Selection */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white flex items-center gap-2">
                    <Brain className="w-4 h-4 text-cyan-400" />
                    AI Agent Focus
                  </span>
                  <Tooltip content="Your choice doubles the weight of specific AI agents in consensus decisions">
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </Tooltip>
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  {PREFERENCE_OPTIONS.map((option) => (
                    <motion.button
                      key={option.value}
                      onClick={() => onUserPreferenceChange(option.value)}
                      disabled={disabled}
                      className={cn(
                        'p-4 rounded-lg border text-left transition-all',
                        'hover:border-primary/50 focus:outline-none focus:ring-2 focus:ring-primary/20',
                        userPreference === option.value
                          ? cn(option.bgColor, 'border-current')
                          : 'bg-background/50 border-border/50'
                      )}
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                    >
                      <div className="flex items-start gap-2">
                        <option.icon className={cn(
                          'w-4 h-4 mt-0.5',
                          userPreference === option.value ? option.color : 'text-muted-foreground'
                        )} />
                        <div className="space-y-1">
                          <div className={cn(
                            'text-sm font-medium',
                            userPreference === option.value ? 'text-white' : 'text-muted-foreground'
                          )}>
                            {option.label}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {option.description}
                          </div>
                          <div className={cn(
                            'text-xs font-mono',
                            userPreference === option.value ? 'text-cyan-300' : 'text-muted-foreground/70'
                          )}>
                            {option.agentFocus}
                          </div>
                        </div>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </div>

              {/* Slippage Tolerance */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Max Slippage</span>
                  <Tooltip content="Maximum price movement you're willing to accept">
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </Tooltip>
                </div>
                
                <div className="grid grid-cols-4 gap-2 mb-2">
                  {SLIPPAGE_PRESETS.map((preset) => (
                    <Button
                      key={preset}
                      onClick={() => handleSlippagePreset(preset)}
                      variant={maxSlippage === preset ? "primary" : "secondary"}
                      size="sm"
                      disabled={disabled}
                      className="text-xs font-mono"
                    >
                      {preset}%
                    </Button>
                  ))}
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={customSlippage}
                    onChange={(e) => handleCustomSlippage(e.target.value)}
                    placeholder="Custom %"
                    disabled={disabled}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-background/50 border border-border rounded-lg focus:outline-none focus:ring-2 focus:ring-primary/20"
                  />
                  <span className="text-xs text-muted-foreground">
                    Current: {maxSlippage.toFixed(2)}%
                  </span>
                </div>
              </div>

              {/* Gas Preference */}
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium text-white">Gas Strategy</span>
                  <Tooltip content="Choose your gas price strategy for transaction speed">
                    <Info className="w-3 h-3 text-muted-foreground" />
                  </Tooltip>
                </div>
                
                <div className="grid grid-cols-3 gap-2">
                  {GAS_OPTIONS.map((option) => (
                    <Button
                      key={option.value}
                      onClick={() => onGasPreferenceChange(option.value)}
                      variant={gasPreference === option.value ? "primary" : "secondary"}
                      size="sm"
                      disabled={disabled}
                      className="text-xs !flex !flex-col !items-center gap-2 h-auto py-3 px-2 min-h-[3rem]"
                    >
                      <div className="font-medium text-center whitespace-nowrap">{option.label}</div>
                      <div className="text-xs opacity-80 text-center leading-tight max-w-full">{option.description}</div>
                    </Button>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-between pt-2 border-t border-border/50">
                <Button
                  onClick={resetToDefaults}
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="text-xs flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reset to Defaults
                </Button>

                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>Multi-agent AI consensus with preference weighting</span>
                  <Brain className="w-3 h-3 text-cyan-400" />
                </div>
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}