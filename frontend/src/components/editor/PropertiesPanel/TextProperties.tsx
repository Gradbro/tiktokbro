'use client';

import React from 'react';
import { Label } from '@/components/ui/label';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  TextAlignLeftIcon,
  TextAlignCenterIcon,
  TextAlignRightIcon,
  DistributeVerticalTopIcon,
  DistributeVerticalCenterIcon,
  DistributeVerticalBottomIcon,
} from '@hugeicons/core-free-icons';
import { cn } from '@/lib/utils';
import type { TextObjectProps } from '../FabricCanvas/types';

// Style presets - text with BORDER (stroke outline on letters)
const STYLE_PRESETS = [
  {
    id: 'white-black-border',
    fill: '#FFFFFF',
    stroke: '#000000',
  },
  {
    id: 'black-white-border',
    fill: '#000000',
    stroke: '#FFFFFF',
  },
] as const;

// Color palette for cycling (plain -> with black bg -> with white bg)
const TEXT_COLORS = ['#FFFFFF', '#FF3B5C', '#7C3AED', '#10B981', '#F59E0B'] as const;

interface ColorStyleVariant {
  fill: string;
  backgroundColor: string | null;
}

function getColorCycleVariants(baseColor: string): ColorStyleVariant[] {
  const isWhite = baseColor.toUpperCase() === '#FFFFFF';
  if (isWhite) {
    return [
      { fill: '#FFFFFF', backgroundColor: null },
      { fill: '#000000', backgroundColor: '#FFFFFF' },
      { fill: '#FFFFFF', backgroundColor: '#000000' },
    ];
  }
  return [
    { fill: baseColor, backgroundColor: null },
    { fill: '#FFFFFF', backgroundColor: baseColor },
    { fill: baseColor, backgroundColor: '#FFFFFF' },
  ];
}

function getCurrentVariantIndex(
  baseColor: string,
  currentFill: string,
  currentBg: string | null
): number {
  const variants = getColorCycleVariants(baseColor);
  return variants.findIndex(
    (v) =>
      v.fill.toUpperCase() === currentFill.toUpperCase() &&
      (v.backgroundColor?.toUpperCase() || null) === (currentBg?.toUpperCase() || null)
  );
}

interface TextPropertiesProps {
  props: TextObjectProps;
  onChange: (props: Partial<TextObjectProps>) => void;
}

export function TextProperties({ props, onChange }: TextPropertiesProps) {
  const fontSize = typeof props.fontSize === 'number' ? props.fontSize : 48;

  // Check if current matches a style preset (border/stroke)
  const getActiveStyle = () => {
    const fill = props.fill?.toUpperCase();
    const stroke = props.stroke?.toUpperCase();
    if (fill === '#FFFFFF' && stroke === '#000000') return 'white-black-border';
    if (fill === '#000000' && stroke === '#FFFFFF') return 'black-white-border';
    return null;
  };
  const activeStyle = getActiveStyle();

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border/50">
        <span className="text-sm font-medium">Text Properties</span>
      </div>

      {/* Controls */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Style - Border/Stroke on letters */}
        <div>
          <Label className="text-xs text-muted-foreground">Style</Label>
          <div className="flex items-center gap-2 mt-2">
            {STYLE_PRESETS.map((style) => (
              <button
                key={style.id}
                onClick={() =>
                  onChange({
                    fill: style.fill,
                    stroke: style.stroke,
                    customBackgroundColor: null,
                  })
                }
                className={cn(
                  'h-9 px-3 rounded-md transition-all flex items-center justify-center text-sm font-black bg-muted',
                  activeStyle === style.id
                    ? 'ring-2 ring-offset-2 ring-primary'
                    : 'hover:opacity-80'
                )}
                style={{
                  color: style.fill,
                  WebkitTextStroke: `1px ${style.stroke}`,
                }}
              >
                Aa
              </button>
            ))}
          </div>
        </div>

        {/* Color - Cycling through plain/background variants */}
        <div>
          <Label className="text-xs text-muted-foreground">Color</Label>
          <div className="flex items-center gap-2 mt-2">
            {TEXT_COLORS.map((baseColor) => {
              const variantIdx = getCurrentVariantIndex(
                baseColor,
                props.fill || '#FFFFFF',
                props.customBackgroundColor
              );
              const isSelected = variantIdx >= 0;
              const variants = getColorCycleVariants(baseColor);
              const isWhite = baseColor === '#FFFFFF';
              const currentVariant = isSelected ? variants[variantIdx] : variants[0];
              const showInnerCircle = isSelected && currentVariant.backgroundColor !== null;

              return (
                <button
                  key={baseColor}
                  onClick={() => {
                    const nextIdx = isSelected ? (variantIdx + 1) % variants.length : 0;
                    const nextVariant = variants[nextIdx];
                    onChange({
                      fill: nextVariant.fill,
                      customBackgroundColor: nextVariant.backgroundColor,
                      stroke: null,
                      strokeWidth: 0,
                    });
                  }}
                  className={cn(
                    'w-8 h-8 rounded-full transition-all flex items-center justify-center',
                    isSelected ? 'ring-2 ring-offset-2 ring-primary scale-110' : 'hover:scale-105',
                    isWhite && !showInnerCircle && 'border border-border'
                  )}
                  style={{
                    backgroundColor: showInnerCircle
                      ? (currentVariant.backgroundColor ?? baseColor)
                      : baseColor,
                  }}
                  title={`${isWhite ? 'White' : baseColor} (tap to cycle)`}
                >
                  {showInnerCircle && (
                    <div
                      className="w-3.5 h-3.5 rounded-full"
                      style={{
                        backgroundColor: currentVariant.fill,
                        border: currentVariant.fill === '#FFFFFF' ? '1px solid #d4d4d8' : undefined,
                      }}
                    />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-[10px] text-muted-foreground mt-1.5">Tap to cycle styles</p>
        </div>

        {/* Font Size */}
        <div>
          <Label className="text-xs text-muted-foreground">Font Size</Label>
          <div className="flex items-center gap-2 mt-1">
            <input
              type="range"
              min="16"
              max="72"
              value={fontSize}
              onChange={(e) => onChange({ fontSize: Number(e.target.value) })}
              className="flex-1 h-2 bg-muted rounded-lg appearance-none cursor-pointer accent-primary"
            />
            <span className="text-xs w-8 text-right tabular-nums">{fontSize}</span>
          </div>
        </div>

        {/* Alignment */}
        <div>
          <Label className="text-xs text-muted-foreground">Alignment</Label>
          <div className="flex gap-1 mt-1.5">
            {[
              { value: 'left' as const, icon: TextAlignLeftIcon },
              { value: 'center' as const, icon: TextAlignCenterIcon },
              { value: 'right' as const, icon: TextAlignRightIcon },
            ].map(({ value, icon }) => (
              <button
                key={value}
                onClick={() => onChange({ textAlign: value })}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md transition-colors flex items-center justify-center',
                  props.textAlign === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <HugeiconsIcon icon={icon} className="w-4 h-4" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>

        {/* Vertical Alignment */}
        <div>
          <Label className="text-xs text-muted-foreground">Position</Label>
          <div className="flex gap-1 mt-1.5">
            {[
              { value: 'top' as const, icon: DistributeVerticalTopIcon, label: 'Top' },
              { value: 'middle' as const, icon: DistributeVerticalCenterIcon, label: 'Middle' },
              { value: 'bottom' as const, icon: DistributeVerticalBottomIcon, label: 'Bottom' },
            ].map(({ value, icon, label }) => (
              <button
                key={value}
                onClick={() => onChange({ verticalAlign: value })}
                title={label}
                className={cn(
                  'flex-1 px-3 py-2 rounded-md transition-colors flex items-center justify-center',
                  props.verticalAlign === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted text-muted-foreground hover:bg-muted/80'
                )}
              >
                <HugeiconsIcon icon={icon} className="w-4 h-4" strokeWidth={2} />
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
