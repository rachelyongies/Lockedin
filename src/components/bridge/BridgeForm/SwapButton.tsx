'use client';

import React from 'react';
import { motion } from 'framer-motion';
import { ArrowUpDownIcon } from 'lucide-react';
import { cn } from '@/lib/utils/helpers';
import { Button } from '@/components/ui/Button';
import { Tooltip } from '@/components/ui/Tooltip';

interface SwapButtonProps {
  onSwap: () => void;
  isSwapping: boolean;
  disabled?: boolean;
  className?: string;
}

const SwapButton: React.FC<SwapButtonProps> = ({
  onSwap,
  isSwapping,
  disabled = false,
  className,
}) => {
  return (
    <Tooltip 
      content="Swap token direction" 
      placement="right"
      disabled={disabled || isSwapping}
    >
      <div className={cn('absolute z-10 left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2', className)}>
        <Button
          variant="ghost"
          size="icon"
          onClick={onSwap}
          disabled={disabled || isSwapping}
          className={cn(
            'h-12 w-12 rounded-full',
            '!bg-slate-600/40 backdrop-blur-sm',
            'hover:!bg-cyan-300/50',
            'active:!bg-cyan-700/60',
            'shadow-lg',
            'transition-all duration-300',
            'focus-visible:ring-2 focus-visible:ring-primary-500/50 focus-visible:ring-offset-2',
            'focus-visible:ring-offset-background-primary',
            isSwapping && 'cursor-wait',
            '!border-0'
          )}
          style={{ 
            border: 'none',
            outline: 'none',
            borderRadius: '50%'
          }}
          aria-label="Swap token direction"
        >
          <motion.div
            animate={{ 
              rotate: isSwapping ? 360 : 0,
              scale: isSwapping ? 1.1 : 1 
            }}
            whileHover={{ rotate: 180, scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            <ArrowUpDownIcon 
              className="h-5 w-5 text-text-primary"
            />
          </motion.div>
        </Button>
      </div>
    </Tooltip>
  );
};

export { SwapButton };