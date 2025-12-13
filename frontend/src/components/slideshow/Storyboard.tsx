'use client';

import { useState, useEffect } from 'react';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { StoryboardSlide } from './StoryboardSlide';
import { SlideDetailEditor } from './SlideDetailEditor';
import { PlanReview } from './PlanReview';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Sparkles,
  FileArchive,
  Loader2,
  Wand2,
} from 'lucide-react';
import JSZip from 'jszip';

export function Storyboard() {
  const { session, reset } = useSlideshowContext();
  const { isLoading, createPlan } = useSlideshowGenerator();
  const [selectedSlideId, setSelectedSlideId] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState('5');
  const [aspectRatio, setAspectRatio] = useState<'9:16' | '1:1' | '16:9'>('9:16');
  const [downloading, setDownloading] = useState(false);

  const selectedSlide = session?.slides.find((s) => s.id === selectedSlideId);
  const hasSlides = session?.slides && session.slides.length > 0;
  const hasPlans = session?.plans && session.plans.length > 0;
  const completedSlides = session?.slides.filter((s) => s.status === 'complete') || [];
  const isReviewStage = session?.stage === 'review';
  const isGeneratingOrEditing = session?.stage === 'generating' || session?.stage === 'editing' || session?.stage === 'complete';

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

  const handleGenerate = () => {
    if (!prompt.trim()) return;
    createPlan(prompt, {
      slideCount: parseInt(slideCount),
      aspectRatio,
      model: 'imagen-4.0-generate-001',
    });
  };

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

  // Get header title based on stage
  const getHeaderTitle = () => {
    if (!session) return 'Create Slideshow';
    if (isReviewStage) return 'Review Your Plan';
    if (session.stage === 'generating') return 'Generating Images...';
    return 'Your Slideshow';
  };

  return (
    <div className="flex flex-col h-full">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-white">
        <div className="flex items-center gap-4">
          <h1 className="text-lg font-semibold text-gray-900">
            {getHeaderTitle()}
          </h1>
          {hasSlides && (
            <span className="text-sm text-gray-500">
              {completedSlides.length} of {session?.slides.length} slides ready
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          {(hasPlans || hasSlides) && (
            <Button
              variant="outline"
              size="sm"
              onClick={reset}
              className="text-gray-600"
            >
              Start Over
            </Button>
          )}
          {hasSlides && completedSlides.length > 0 && (
            <Button
              size="sm"
              onClick={downloadAllAsZip}
              disabled={downloading}
              className="bg-[#E86D55] hover:bg-[#D55D45]"
            >
              {downloading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <FileArchive className="h-4 w-4 mr-2" />
              )}
              Export All
            </Button>
          )}
        </div>
      </div>

      {/* Main Content */}
      {!session || session.stage === 'prompt' || session.stage === 'planning' ? (
        /* Empty State - Prompt Input */
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="w-full max-w-2xl">
            <div className="text-center mb-8">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-[#E86D55]/10 mb-4">
                <Wand2 className="h-8 w-8 text-[#E86D55]" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 mb-2">
                Create Your Slideshow
              </h2>
              <p className="text-gray-500">
                Describe your content idea and we&apos;ll generate stunning visuals
              </p>
            </div>

            <div className="space-y-4">
              <Textarea
                placeholder="Create a viral slideshow about morning routines that boost productivity, featuring aesthetic lifestyle imagery with warm, golden hour lighting..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isLoading}
                className="min-h-[120px] resize-none text-base border-gray-200 focus:border-[#E86D55] focus:ring-[#E86D55]"
              />

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Slides:</span>
                  <Select value={slideCount} onValueChange={setSlideCount} disabled={isLoading}>
                    <SelectTrigger className="w-24 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="3">3</SelectItem>
                      <SelectItem value="4">4</SelectItem>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="6">6</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-500">Format:</span>
                  <Select
                    value={aspectRatio}
                    onValueChange={(v) => setAspectRatio(v as '9:16' | '1:1' | '16:9')}
                    disabled={isLoading}
                  >
                    <SelectTrigger className="w-32 border-gray-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="9:16">9:16 TikTok</SelectItem>
                      <SelectItem value="1:1">1:1 Square</SelectItem>
                      <SelectItem value="16:9">16:9 Wide</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="flex-1" />

                <Button
                  onClick={handleGenerate}
                  disabled={!prompt.trim() || isLoading}
                  size="lg"
                  className="bg-[#E86D55] hover:bg-[#D55D45] px-8"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate Plan
                    </>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
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
              <div className="flex items-center justify-center h-full text-gray-500">
                Select a slide to edit
              </div>
            )}
          </div>

          {/* Slide Strip - Bottom */}
          <div className="border-t border-gray-200 bg-white">
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
