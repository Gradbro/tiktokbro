'use client';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { Loader2, Play, RotateCcw } from 'lucide-react';

export function SlidePlanReview() {
  const { session, updatePlan, reset } = useSlideshowContext();
  const { isLoading, generateImages } = useSlideshowGenerator();

  if (!session?.plans?.length) return null;

  return (
    <div className="flex flex-col h-full p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Review Your Plan</h2>
          <p className="text-sm text-muted-foreground">
            Edit the content and image prompts before generating
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={reset}>
          <RotateCcw className="mr-2 h-4 w-4" />
          Start Over
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4">
        {session.plans.map((plan) => (
          <Card key={plan.slideNumber}>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">Slide {plan.slideNumber}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <div className="space-y-1">
                <Label className="text-xs">Image Prompt</Label>
                <Textarea
                  value={plan.imagePrompt}
                  onChange={(e) => updatePlan(plan.slideNumber, { imagePrompt: e.target.value })}
                  placeholder="Describe the image you want"
                  className="min-h-[80px] resize-none text-sm"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Text Overlay</Label>
                <Input
                  value={plan.suggestedOverlay || ''}
                  onChange={(e) =>
                    updatePlan(plan.slideNumber, { suggestedOverlay: e.target.value })
                  }
                  placeholder="Short overlay text"
                />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Button onClick={generateImages} disabled={isLoading} className="w-full" size="lg">
        {isLoading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Generating Images...
          </>
        ) : (
          <>
            <Play className="mr-2 h-4 w-4" />
            Generate Images
          </>
        )}
      </Button>
    </div>
  );
}
