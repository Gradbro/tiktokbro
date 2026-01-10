'use client';

import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { GeneratedSlide } from '@/types';
import { Loader2, RefreshCw, AlertCircle } from 'lucide-react';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { cn } from '@/lib/utils';

interface SlideCardProps {
  slide: GeneratedSlide;
  onClick?: () => void;
  isSelected?: boolean;
}

export function SlideCard({ slide, onClick, isSelected }: SlideCardProps) {
  const { regenerateSlide } = useSlideshowGenerator();

  const aspectRatioClass = 'aspect-[9/16]';

  return (
    <Card
      className={cn(
        'cursor-pointer transition-all duration-200 hover:scale-[1.02]',
        'shadow-sm hover:shadow-md',
        isSelected
          ? 'ring-2 ring-primary ring-offset-2 ring-offset-background shadow-lg shadow-primary/20'
          : 'ring-1 ring-border hover:ring-2 hover:ring-primary/40'
      )}
      onClick={onClick}
    >
      <CardContent className="p-2.5">
        <div className={cn('relative rounded-lg overflow-hidden bg-muted/50', aspectRatioClass)}>
          {slide.status === 'pending' && (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="text-center text-muted-foreground">
                <div className="text-2xl font-bold">{slide.slideNumber}</div>
                <div className="text-xs">Pending</div>
              </div>
            </div>
          )}

          {slide.status === 'generating' && (
            <div className="absolute inset-0 flex items-center justify-center bg-muted">
              <div className="text-center">
                <Loader2 className="h-8 w-8 animate-spin mx-auto text-primary" />
                <div className="text-xs text-muted-foreground mt-2">Generating...</div>
              </div>
            </div>
          )}

          {slide.status === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-destructive/10">
              <AlertCircle className="h-8 w-8 text-destructive mb-2" />
              <div className="text-xs text-destructive text-center px-2">
                {slide.error || 'Error'}
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  regenerateSlide(slide.id);
                }}
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
              </Button>
            </div>
          )}

          {slide.status === 'complete' && slide.imageData && (
            <Image
              src={
                slide.imageData.startsWith('http')
                  ? slide.imageData
                  : `data:image/png;base64,${slide.imageData}`
              }
              alt={`Slide ${slide.slideNumber}`}
              fill
              className="object-cover"
            />
          )}
        </div>

        <div className="mt-2 text-center">
          <div className="text-xs font-medium">Slide {slide.slideNumber}</div>
          {slide.plan.suggestedOverlay && (
            <div className="text-xs text-muted-foreground truncate">
              {slide.plan.suggestedOverlay}
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
