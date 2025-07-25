'use client';

import React, { useId } from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils/helpers';
import { motion, HTMLMotionProps } from 'framer-motion';

const inputVariants = cva(
  [
    // Base styles
    'w-full',
    'bg-card-background',
    'text-text-primary placeholder:text-text-tertiary',
    'transition-all duration-200 ease-out',
    'outline-none',
    'disabled:opacity-50 disabled:cursor-not-allowed',
    'read-only:bg-background-tertiary read-only:cursor-default',
  ],
  {
    variants: {
      variant: {
        default: [
          'border border-border-color',
          'hover:border-border-color-hover',
          'focus:border-primary-500',
          'focus:ring-2 focus:ring-primary-500/20',
          'read-only:hover:border-border-color',
        ],
        glass: [
          'bg-glass-bg backdrop-blur-md',
          'border border-glass-border',
          'hover:bg-glass-hover-bg',
          'focus:border-primary-500/50',
          'focus:ring-2 focus:ring-primary-500/20',
        ],
        filled: [
          'bg-background-tertiary',
          'border border-transparent',
          'hover:bg-background-secondary',
          'focus:bg-background-secondary',
          'focus:border-primary-500',
          'focus:ring-2 focus:ring-primary-500/20',
        ],
        underline: [
          'bg-transparent',
          'border-0 border-b-2 border-border-color',
          'rounded-none',
          'hover:border-text-secondary',
          'focus:border-primary-500',
          'px-0',
        ],
      },
      size: {
        sm: 'h-8 text-sm rounded-md',
        md: 'h-10 text-sm rounded-lg',
        lg: 'h-12 text-base rounded-lg',
        xl: 'h-14 text-lg rounded-xl',
      },
      hasError: {
        true: 'border-error hover:border-error focus:border-error focus:ring-error/20',
        false: '',
      },
      isReadOnly: {
        true: 'bg-background-tertiary/50 text-text-secondary',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'md',
      hasError: false,
      isReadOnly: false,
    },
  }
);

// Tokenized spacing for left/right elements
const elementSpacing = {
  sm: { padding: 'px-2.5', offset: 'px-8' },
  md: { padding: 'px-3', offset: 'px-10' },
  lg: { padding: 'px-3.5', offset: 'px-11' },
  xl: { padding: 'px-4', offset: 'px-12' },
} as const;

// Label and helper text sizes based on input size
const textSizes = {
  sm: { label: 'text-xs', helper: 'text-xs' },
  md: { label: 'text-sm', helper: 'text-xs' },
  lg: { label: 'text-sm', helper: 'text-sm' },
  xl: { label: 'text-base', helper: 'text-sm' },
} as const;

export interface InputProps
  extends Omit<HTMLMotionProps<'input'>, 'size'>,
    VariantProps<typeof inputVariants> {
  label?: string;
  errorMessage?: string;
  helperText?: string;
  leftElement?: React.ReactNode;
  rightElement?: React.ReactNode;
  containerClassName?: string;
  multiline?: boolean;
  rows?: number;
}

const Input = React.forwardRef<HTMLInputElement | HTMLTextAreaElement, InputProps>(
  (
    {
      className,
      variant,
      size = 'md',
      label,
      errorMessage,
      helperText,
      leftElement,
      rightElement,
      containerClassName,
      disabled,
      readOnly,
      multiline = false,
      rows = 3,
      id,
      ...props
    },
    ref
  ) => {
    // Use React 18's useId for SSR-safe IDs
    const generatedId = useId();
    const inputId = id || generatedId;
    const hasError = !!errorMessage;
    const currentSize = size || 'md';
    const spacing = elementSpacing[currentSize];
    const textSize = textSizes[currentSize];

    // Base padding calculation
    const paddingClass = cn(
      spacing.padding,
      leftElement && spacing.offset,
      rightElement && spacing.offset,
      variant === 'underline' && 'px-0'
    );

    const inputClass = cn(
      inputVariants({ variant, size: currentSize, hasError, isReadOnly: !!readOnly }),
      paddingClass,
      className
    );

    // Common props for both input and textarea
    const commonProps = {
      id: inputId,
      disabled,
      readOnly,
      'aria-invalid': hasError,
      'aria-describedby': errorMessage ? `${inputId}-error` : helperText ? `${inputId}-helper` : undefined,
    };

    const motionProps = {
      whileFocus: { scale: 1.002 },
      transition: { duration: 0.1 },
    };

    return (
      <div className={cn('w-full', containerClassName)}>
        {label && (
          <motion.label
            htmlFor={inputId}
            className={cn(
              'block font-medium text-text-secondary mb-2',
              textSize.label
            )}
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
          >
            {label}
          </motion.label>
        )}

        <div className="relative">
          {leftElement && (
            <div className={cn(
              'absolute top-1/2 -translate-y-1/2 pointer-events-none text-text-secondary',
              'left-3'
            )}>
              {leftElement}
            </div>
          )}

          {multiline ? (
            <motion.textarea
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...(props as any)}
              ref={ref as React.Ref<HTMLTextAreaElement>}
              className={cn(
                inputClass,
                'resize-y min-h-[80px] py-2'
              )}
              rows={rows}
              {...commonProps}
              {...motionProps}
            />
          ) : (
            <motion.input
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...(props as any)}
              ref={ref as React.Ref<HTMLInputElement>}
              className={inputClass}
              {...commonProps}
              {...motionProps}
            />
          )}

          {rightElement && (
            <div className={cn(
              'absolute top-1/2 -translate-y-1/2',
              'right-3',
              multiline && 'top-4 translate-y-0'
            )}>
              {rightElement}
            </div>
          )}
        </div>

        {(errorMessage || helperText) && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.2 }}
            className="mt-2"
          >
            {errorMessage && (
              <p
                id={`${inputId}-error`}
                className={cn('text-error', textSize.helper)}
                role="alert"
              >
                {errorMessage}
              </p>
            )}
            {helperText && !errorMessage && (
              <p
                id={`${inputId}-helper`}
                className={cn('text-text-tertiary', textSize.helper)}
              >
                {helperText}
              </p>
            )}
          </motion.div>
        )}
      </div>
    );
  }
);

Input.displayName = 'Input';

// Textarea component that shares the same styling system
export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  Omit<InputProps, 'multiline'>
>((props, ref) => {
  return <Input {...props} multiline ref={ref} />;
});

Textarea.displayName = 'Textarea';

export { Input, inputVariants };