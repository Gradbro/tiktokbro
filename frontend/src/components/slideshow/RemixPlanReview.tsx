'use client';

import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { Loader2, Search, Check, ImageIcon, ArrowRight, RefreshCw } from 'lucide-react';
import { cn } from '@/lib/utils';

export function RemixPlanReview() {
  const { session, setStage, setSlides } = useSlideshowContext();
  const { isLoading, editRemixPlan, searchPinterestForSlide, searchPinterestForAll } = useSlideshowGenerator();
  const [searchingSlide, setSearchingSlide] = useState<number | null>(null);
  const [isConverting, setIsConverting] = useState(false);
  const hasAutoSearched = useRef(false);

  // Auto-search Pinterest when plans are first loaded
  useEffect(() => {
    if (session?.remixPlans && session.remixPlans.length > 0 && !hasAutoSearched.current) {
      // Check if any slide already has candidates (meaning we've searched before)
      const hasAnyCandidates = session.remixPlans.some(
        (p) => p.pinterestCandidates && p.pinterestCandidates.length > 0
      );
      
      if (!hasAnyCandidates) {
        hasAutoSearched.current = true;
        searchPinterestForAll();
      }
    }
  }, [session?.remixPlans, searchPinterestForAll]);

  if (!session?.remixPlans) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No remix plans available
      </div>
    );
  }

  const handleSearch = async (slideNumber: number, query: string) => {
    setSearchingSlide(slideNumber);
    await searchPinterestForSlide(slideNumber, query);
    setSearchingSlide(null);
  };

  const handleRefreshAll = () => {
    // Reset the ref to allow re-searching
    hasAutoSearched.current = false;
    searchPinterestForAll();
  };

  const handleSelectImage = (slideNumber: number, imageUrl: string) => {
    editRemixPlan(slideNumber, { selectedImageUrl: imageUrl });
  };

  const handleContinueToEditor = async () => {
    if (!session?.remixPlans) return;
    
    setIsConverting(true);
    
    // Convert remix plans to GeneratedSlides with Pinterest images
    const slides = session.remixPlans.map((plan) => ({
      id: `remix-${plan.slideNumber}-${Date.now()}`,
      slideNumber: plan.slideNumber,
      plan: {
        slideNumber: plan.slideNumber,
        imagePrompt: plan.pinterestQuery,
        suggestedOverlay: plan.newOverlayText,
      },
      imageData: plan.selectedImageUrl, // Pinterest image URL
      status: 'complete' as const,
      textOverlay: plan.newOverlayText ? {
        text: plan.newOverlayText,
        size: 'medium' as const,
        color: '#ffffff',
        position: { x: 50, y: 80 },
      } : undefined,
    }));

    setSlides(slides);
    setStage('editing');
    setIsConverting(false);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b flex items-center justify-between">
        <div>
          <h1 className="text-lg font-semibold text-foreground">Review Remix Plan</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {isLoading ? 'Searching Pinterest...' : 'Edit queries and select images'}
          </p>
        </div>
        <Button
          onClick={handleRefreshAll}
          disabled={isLoading}
          variant="outline"
          size="sm"
        >
          {isLoading ? (
            <Loader2 className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <RefreshCw className="h-4 w-4 mr-2" />
          )}
          Refresh All
        </Button>
      </div>

      {/* Content */}
      <ScrollArea className="flex-1">
        <div className="p-6 space-y-6">
          {session.remixPlans.map((plan) => (
            <Card key={plan.slideNumber}>
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-xs">
                    {plan.slideNumber}
                  </span>
                  Slide {plan.slideNumber}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Pinterest Query */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Pinterest Search Query
                  </Label>
                  <div className="flex gap-2">
                    <Input
                      value={plan.pinterestQuery}
                      onChange={(e) =>
                        editRemixPlan(plan.slideNumber, { pinterestQuery: e.target.value })
                      }
                      placeholder="Enter search terms..."
                      className="flex-1"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      onClick={() => handleSearch(plan.slideNumber, plan.pinterestQuery)}
                      disabled={searchingSlide === plan.slideNumber || !plan.pinterestQuery}
                    >
                      {searchingSlide === plan.slideNumber ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Search className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                </div>

                {/* Overlay Text */}
                <div className="space-y-2">
                  <Label className="text-xs text-muted-foreground">
                    Overlay Text
                  </Label>
                  <Textarea
                    value={plan.newOverlayText}
                    onChange={(e) =>
                      editRemixPlan(plan.slideNumber, { newOverlayText: e.target.value })
                    }
                    placeholder="Text to display on this slide..."
                    className="min-h-[60px] resize-none"
                  />
                </div>

                {/* Layout Notes */}
                {plan.layoutNotes && (
                  <p className="text-xs text-muted-foreground bg-muted p-2 rounded">
                    💡 {plan.layoutNotes}
                  </p>
                )}

                {/* Pinterest Candidates */}
                {plan.pinterestCandidates && plan.pinterestCandidates.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-xs text-muted-foreground">
                      Select an image ({plan.pinterestCandidates.length} found)
                    </Label>
                    <div className="grid grid-cols-5 gap-2">
                      {plan.pinterestCandidates.map((candidate, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSelectImage(plan.slideNumber, candidate.imageUrl)}
                          className={cn(
                            'relative aspect-[9/16] rounded-md overflow-hidden border-2 transition-all hover:opacity-90',
                            plan.selectedImageUrl === candidate.imageUrl
                              ? 'border-primary ring-2 ring-primary/20'
                              : 'border-transparent hover:border-muted-foreground/30'
                          )}
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={candidate.imageUrl}
                            alt={`Option ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                          {plan.selectedImageUrl === candidate.imageUrl && (
                            <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                              <Check className="h-6 w-6 text-primary" />
                            </div>
                          )}
                        </button>
                      ))}
                    </div>
                  </div>
                )}

                {/* No candidates yet */}
                {(!plan.pinterestCandidates || plan.pinterestCandidates.length === 0) && (
                  <div className="flex items-center justify-center h-20 bg-muted/50 rounded-lg">
                    <div className="text-center text-muted-foreground">
                      {isLoading ? (
                        <>
                          <Loader2 className="h-6 w-6 mx-auto mb-1 animate-spin" />
                          <p className="text-xs">Searching Pinterest...</p>
                        </>
                      ) : (
                        <>
                          <ImageIcon className="h-6 w-6 mx-auto mb-1 opacity-50" />
                          <p className="text-xs">No images found. Try editing the query.</p>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </ScrollArea>

      {/* Footer with summary */}
      <div className="p-4 border-t bg-muted/30">
        <div className="flex items-center justify-between text-sm">
          <span className="text-muted-foreground">
            {session.remixPlans.filter(p => p.selectedImageUrl).length} / {session.remixPlans.length} images selected
          </span>
          <Button
            onClick={handleContinueToEditor}
            disabled={session.remixPlans.some(p => !p.selectedImageUrl) || isConverting}
            size="sm"
          >
            {isConverting ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Preparing...
              </>
            ) : (
              <>
                Continue to Editor
                <ArrowRight className="h-4 w-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
