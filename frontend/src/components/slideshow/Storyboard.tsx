'use client';

import { useState, useEffect } from 'react';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { StoryboardSlide } from './StoryboardSlide';
import { SlideDetailEditor } from './SlideDetailEditor';
import { PlanReview } from './PlanReview';
import { RemixPlanReview } from './RemixPlanReview';
import { PromptPanel } from './PromptPanel';
import { Wand2 } from 'lucide-react';
import JSZip from 'jszip';

export function Storyboard() {
  const { session, reset } = useSlideshowContext();
  const { isLoading } = useSlideshowGenerator();
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [downloading, setDownloading] = useState(false);

  const selectedSlide = session?.slides.find((s) => s.id === selectedSlideId);
  const hasSlides = session?.slides && session.slides.length > 0;
  const completedSlides = session?.slides.filter((s) => s.status === 'complete') || [];
  const isReviewStage = session?.stage === 'review';
  const isRemixReviewStage = session?.stage === 'remix-review';
  const isGeneratingOrEditing = session?.stage === 'generating' || session?.stage === 'editing' || session?.stage === 'complete';
  const isPromptStage = !session || session.stage === 'prompt' || session.stage === 'planning' || session.stage === 'importing' || session.stage === 'analyzing';

  // Auto-select first slide when slides are generated
  useEffect(() => {
    if (session?.slides?.length && !selectedSlideId) {
      setSelectedSlideId(session.slides[0].id);
    }
  }, [session?.slides, selectedSlideId]);

  // Reset selected slide when starting over
  useEffect(() => {
    if (!session) {
      setSelectedSlideId(null);
    }
  }, [session]);

  const downloadAllAsZip = async () => {
    if (completedSlides.length === 0) return;
    setDownloading(true);

    try {
      const zip = new JSZip();

      completedSlides.forEach((slide) => {
        const imageData = slide.editedImageData
          ? slide.editedImageData.replace(/^data:image\/\w+;base64,/, '')
          : slide.imageData;

        if (imageData) {
          const byteCharacters = atob(imageData);
          const byteNumbers = new Array(byteCharacters.length);
          for (let i = 0; i < byteCharacters.length; i++) {
            byteNumbers[i] = byteCharacters.charCodeAt(i);
          }
          const byteArray = new Uint8Array(byteNumbers);
          zip.file(`slide-${slide.slideNumber}.png`, byteArray);
        }
      });

      const content = await zip.generateAsync({ type: 'blob' });
      const url = URL.createObjectURL(content);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'tiktok-slideshow.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      {/* Main Content */}
      {isPromptStage ? (
        <div className="flex h-full">
          <div className="w-[400px] border-r">
            <PromptPanel />
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">
                Import from TikTok
              </h2>
              <p className="text-muted-foreground">
                Import a TikTok Photo Mode slideshow and remix it with similar images from Pinterest
              </p>
            </div>
          </div>
        </div>
      ) : isRemixReviewStage ? (
        <RemixPlanReview />
      ) : isReviewStage ? (
        /* Review Stage */
        <PlanReview />
      ) : isGeneratingOrEditing && hasSlides ? (
        /* Storyboard View - Generating/Editing/Complete */
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Detail Editor - Top */}
          <div className="flex-1 overflow-hidden">
            {selectedSlide ? (
              <SlideDetailEditor
                slide={selectedSlide}
                onClose={() => setSelectedSlideId(null)}
              />
            ) : (
              <div className="flex items-center justify-center h-full text-muted-foreground">
                Select a slide to edit
              </div>
            )}
          </div>

          {/* Slide Strip - Bottom */}
          <div className="border-t bg-card">
            <div className="flex items-center gap-4 p-4 overflow-x-auto">
              {session?.slides.map((slide) => (
                <StoryboardSlide
                  key={slide.id}
                  slide={slide}
                  isSelected={slide.id === selectedSlideId}
                  onClick={() => setSelectedSlideId(slide.id)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
