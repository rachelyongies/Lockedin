'use client'

import React, { useState, useRef, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowUpDown, RotateCcw, ChevronDown, Check } from 'lucide-react'
import { Card } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import type { TransactionStatus, TransactionType, SortBy } from './TransactionList'

interface SelectOption {
  value: string
  label: string
}

interface CustomSelectProps {
  label: string
  value: string
  options: SelectOption[]
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
}

const CustomSelect: React.FC<CustomSelectProps> = ({
  label,
  value,
  options,
  onChange,
  placeholder = "Select...",
  disabled = false
}) => {
  const [isOpen, setIsOpen] = useState(false)
  const selectRef = useRef<HTMLDivElement>(null)

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Close on escape key
  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('keydown', handleEscape)
      return () => document.removeEventListener('keydown', handleEscape)
    }
  }, [isOpen])

  const selectedOption = options.find(option => option.value === value)

  const dropdownVariants = {
    hidden: { 
      opacity: 0, 
      scale: 0.95, 
      y: -10,
      transition: { duration: 0.1 }
    },
    visible: { 
      opacity: 1, 
      scale: 1, 
      y: 0,
      transition: { 
        type: 'spring', 
        damping: 25, 
        stiffness: 300,
        duration: 0.2 
      }
    }
  }

  const optionVariants = {
    hidden: { opacity: 0, x: -10 },
    visible: { opacity: 1, x: 0 }
  }

  return (
    <div ref={selectRef} className="relative">
      <label className="block text-sm font-medium text-white mb-2">
        {label}
      </label>
      
      {/* Select Button */}
      <motion.button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className="w-full relative"
        whileTap={{ scale: 0.99 }}
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          borderRadius: '8px',
          padding: '8px 32px 8px 12px',
          color: '#ffffff',
          fontSize: '14px',
          textAlign: 'left',
          transition: 'all 0.2s ease-out',
          cursor: disabled ? 'not-allowed' : 'pointer',
          opacity: disabled ? 0.5 : 1
        }}
        onMouseEnter={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.08)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)'
          }
        }}
        onMouseLeave={(e) => {
          if (!disabled) {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.05)'
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.1)'
          }
        }}
      >
        <span className={selectedOption ? 'text-white' : 'text-gray-400'}>
          {selectedOption?.label || placeholder}
        </span>
        
        <motion.div
          className="absolute right-2 top-1/2 transform -translate-y-1/2"
          animate={{ rotate: isOpen ? 180 : 0 }}
          transition={{ duration: 0.2 }}
        >
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </motion.div>
      </motion.button>

      {/* Dropdown */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            variants={dropdownVariants}
            initial="hidden"
            animate="visible"
            exit="hidden"
            className="absolute z-50 w-full mt-1 overflow-hidden"
            style={{
              background: 'rgba(16, 18, 22, 0.95)',
              backdropFilter: 'blur(12px)',
              WebkitBackdropFilter: 'blur(12px)',
              border: '1px solid rgba(255, 255, 255, 0.1)',
              borderRadius: '8px',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
            }}
          >
            <div className="py-1 max-h-60 overflow-y-auto">
              {options.map((option, index) => (
                <motion.button
                  key={option.value}
                  type="button"
                  variants={optionVariants}
                  initial="hidden"
                  animate="visible"
                  transition={{ delay: index * 0.02 }}
                  onClick={() => {
                    onChange(option.value)
                    setIsOpen(false)
                  }}
                  className="w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors duration-150"
                  style={{
                    color: option.value === value ? '#06b6d4' : '#ffffff',
                    backgroundColor: 'transparent'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.05)'
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.backgroundColor = 'transparent'
                  }}
                >
                  <span>{option.label}</span>
                  {option.value === value && (
                    <Check className="w-4 h-4 text-cyan-500" />
                  )}
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

interface TransactionFiltersProps {
  statusFilter: TransactionStatus | 'all'
  typeFilter: TransactionType | 'all'
  sortBy: SortBy
  sortOrder: 'asc' | 'desc'
  onStatusFilter: (status: TransactionStatus | 'all') => void
  onTypeFilter: (type: TransactionType | 'all') => void
  onSortBy: (sort: SortBy) => void
  onToggleSort: () => void
  onClearFilters?: () => void
  className?: string
}

export const TransactionFilters: React.FC<TransactionFiltersProps> = ({
  statusFilter,
  typeFilter,
  sortBy,
  sortOrder,
  onStatusFilter,
  onTypeFilter,
  onSortBy,
  onToggleSort,
  onClearFilters,
  className = ''
}) => {
  
  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'pending', label: 'Pending' },
    { value: 'confirming', label: 'Confirming' },
    { value: 'completed', label: 'Completed' },
    { value: 'failed', label: 'Failed' },
    { value: 'cancelled', label: 'Cancelled' }
  ]

  const typeOptions = [
    { value: 'all', label: 'All Types' },
    { value: 'bridge', label: 'Bridge' },
    { value: 'approval', label: 'Approval' },
    { value: 'deposit', label: 'Deposit' },
    { value: 'withdrawal', label: 'Withdrawal' }
  ]

  const sortOptions = [
    { value: 'timestamp', label: 'Date' },
    { value: 'usdValue', label: 'USD Value' },
    { value: 'fromAmount', label: 'From Amount' },
    { value: 'toAmount', label: 'To Amount' },
    { value: 'fee', label: 'Fee' }
  ]



  // Check if any filters are active (not default values)
  const hasActiveFilters = statusFilter !== 'all' || typeFilter !== 'all' || sortBy !== 'timestamp' || sortOrder !== 'desc'

  const handleClearFilters = () => {
    if (onClearFilters) {
      onClearFilters()
    } else {
      // Fallback: reset to defaults
      onStatusFilter('all')
      onTypeFilter('all')
      onSortBy('timestamp')
      if (sortOrder !== 'desc') {
        onToggleSort()
      }
    }
  }

  // Animation variants for staggered filter appearance
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.1
      }
    }
  }

  const itemVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: { 
      opacity: 1, 
      y: 0,
      transition: {
        type: 'spring',
        stiffness: 300,
        damping: 30
      }
    }
  }

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      exit="hidden"
      variants={containerVariants}
      className={className}
    >
      <Card variant="glass" className="p-4">
        <motion.div 
          className="grid grid-cols-1 md:grid-cols-5 gap-4"
          variants={containerVariants}
        >
          {/* Status Filter */}
          <motion.div variants={itemVariants}>
            <CustomSelect
              label="Status"
              value={statusFilter}
              options={statusOptions}
              onChange={(value) => onStatusFilter(value as TransactionStatus | 'all')}
            />
          </motion.div>

          {/* Type Filter */}
          <motion.div variants={itemVariants}>
            <CustomSelect
              label="Type"
              value={typeFilter}
              options={typeOptions}
              onChange={(value) => onTypeFilter(value as TransactionType | 'all')}
            />
          </motion.div>

          {/* Sort By Filter */}
          <motion.div variants={itemVariants}>
            <CustomSelect
              label="Sort By"
              value={sortBy}
              options={sortOptions}
              onChange={(value) => onSortBy(value as SortBy)}
            />
          </motion.div>

          {/* Sort Order Toggle */}
          <motion.div className="flex flex-col justify-end" variants={itemVariants}>
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleSort}
              className="gap-2 justify-start"
              aria-label={`Sort ${sortOrder === 'asc' ? 'ascending' : 'descending'}, click to toggle`}
              aria-pressed={sortOrder === 'desc'}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              <motion.div
                animate={{ rotate: sortOrder === 'desc' ? 180 : 0 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <ArrowUpDown className="w-4 h-4" />
              </motion.div>
              {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
            </Button>
          </motion.div>

          {/* Clear Filters Button */}
          <motion.div className="flex flex-col justify-end" variants={itemVariants}>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleClearFilters}
              disabled={!hasActiveFilters}
              className="gap-2 justify-start"
              aria-label="Clear all filters and reset to defaults"
              whileHover={{ scale: hasActiveFilters ? 1.05 : 1 }}
              whileTap={{ scale: hasActiveFilters ? 0.95 : 1 }}
            >
              <motion.div
                animate={{ 
                  rotate: hasActiveFilters ? 0 : 0,
                  opacity: hasActiveFilters ? 1 : 0.5 
                }}
                whileHover={hasActiveFilters ? { rotate: 180 } : {}}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              >
                <RotateCcw className="w-4 h-4" />
              </motion.div>
              Clear Filters
            </Button>
          </motion.div>
        </motion.div>

        {/* Active Filters Indicator */}
        {hasActiveFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-3 pt-3 border-t border-border-color"
          >
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Active filters:</span>
              {statusFilter !== 'all' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded border border-primary-500/20"
                >
                  Status: {statusOptions.find(opt => opt.value === statusFilter)?.label}
                </motion.span>
              )}
              {typeFilter !== 'all' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded border border-primary-500/20"
                >
                  Type: {typeOptions.find(opt => opt.value === typeFilter)?.label}
                </motion.span>
              )}
              {sortBy !== 'timestamp' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded border border-primary-500/20"
                >
                  Sort: {sortOptions.find(opt => opt.value === sortBy)?.label}
                </motion.span>
              )}
              {sortOrder !== 'desc' && (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  className="px-2 py-1 bg-primary-500/10 text-primary-400 rounded border border-primary-500/20"
                >
                  Order: {sortOrder === 'asc' ? 'Ascending' : 'Descending'}
                </motion.span>
              )}
            </div>
          </motion.div>
        )}
      </Card>
    </motion.div>
  )
}

export default TransactionFilters