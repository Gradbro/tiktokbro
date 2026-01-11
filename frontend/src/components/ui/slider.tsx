'use client';

import * as React from 'react';
import { Slider as SliderPrimitive } from '@base-ui/react/slider';
import { cn } from '@/lib/utils';

interface SliderProps {
  value?: number;
  defaultValue?: number;
  min?: number;
  max?: number;
  step?: number;
  disabled?: boolean;
  onValueChange?: (value: number) => void;
  onValueCommit?: (value: number) => void;
  className?: string;
  'aria-label'?: string;
}

const Slider = React.forwardRef<HTMLDivElement, SliderProps>(
  (
    {
      value,
      defaultValue,
      min = 0,
      max = 100,
      step = 1,
      disabled = false,
      onValueChange,
      onValueCommit,
      className,
      'aria-label': ariaLabel,
    },
    ref
  ) => {
    return (
      <SliderPrimitive.Root
        ref={ref}
        value={value !== undefined ? [value] : undefined}
        defaultValue={defaultValue !== undefined ? [defaultValue] : [50]}
        min={min}
        max={max}
        step={step}
        disabled={disabled}
        onValueChange={(values: number[]) => onValueChange?.(values[0])}
        onValueCommitted={(values: number[]) => onValueCommit?.(values[0])}
        className={cn('relative flex w-full touch-none select-none items-center', className)}
      >
        <SliderPrimitive.Control className="relative flex h-5 w-full cursor-pointer items-center">
          <SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full bg-muted">
            <SliderPrimitive.Indicator className="absolute h-full rounded-full bg-primary" />
          </SliderPrimitive.Track>
          <SliderPrimitive.Thumb
            aria-label={ariaLabel}
            className={cn(
              'absolute block size-4 cursor-grab rounded-full border-2 border-primary bg-background shadow-md',
              'transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
              'disabled:pointer-events-none disabled:opacity-50',
              'hover:bg-primary/10 hover:scale-110',
              'active:cursor-grabbing active:scale-95',
              'data-dragging:ring-2 data-dragging:ring-ring data-dragging:cursor-grabbing'
            )}
          />
        </SliderPrimitive.Control>
      </SliderPrimitive.Root>
    );
  }
);

Slider.displayName = 'Slider';

export { Slider };
export type { SliderProps };
