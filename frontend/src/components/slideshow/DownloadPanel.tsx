'use client';

import { useState } from 'react';
import Image from 'next/image';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Download, FileArchive, RotateCcw, ArrowLeft, Check } from 'lucide-react';
import JSZip from 'jszip';
import { GeneratedSlide } from '@/types';

// Helper to get the best image data for a slide (edited with overlay or original)
function getSlideImageData(slide: GeneratedSlide): string | null {
  // If there's an edited version with text overlay, use that
  if (slide.editedImageData) {
    // editedImageData is a data URL, extract the base64 part
    const base64Match = slide.editedImageData.match(/^data:image\/\w+;base64,(.+)$/);
    if (base64Match) {
      return base64Match[1];
    }
  }
  // Fall back to original image
  return slide.imageData || null;
}

// Helper to get the image source for display
function getSlideImageSrc(slide: GeneratedSlide): string | null {
  if (slide.editedImageData) {
    return slide.editedImageData; // Already a data URL
  }
  if (slide.imageData) {
    return `data:image/png;base64,${slide.imageData}`;
  }
  return null;
}

export function DownloadPanel() {
  const { session, reset, setStage } = useSlideshowContext();
  const [downloading, setDownloading] = useState(false);
  const [downloadedSlides, setDownloadedSlides] = useState<Set<string>>(new Set());

  if (!session) return null;

  const completedSlides = session.slides.filter(
    (s) => s.status === 'complete' && s.imageData
  );

  const downloadSingleSlide = (slideId: string, slideNumber: number) => {
    const slide = session.slides.find((s) => s.id === slideId);
    if (!slide) return;

    const imageData = getSlideImageData(slide);
    if (!imageData) return;

    const link = document.createElement('a');
    link.href = `data:image/png;base64,${imageData}`;
    link.download = `slide-${slideNumber}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadedSlides((prev) => new Set([...prev, slideId]));
  };

  const downloadAllAsZip = async () => {
    setDownloading(true);

    try {
      const zip = new JSZip();

      completedSlides.forEach((slide) => {
        const imageData = getSlideImageData(slide);
        if (imageData) {
          // Convert base64 to blob
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
    } catch (error) {
      console.error('Error creating zip:', error);
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="flex flex-col h-full p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold">Download Your Slideshow</h2>
          <p className="text-sm text-muted-foreground">
            {completedSlides.length} slides ready to download
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => setStage('editing')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Edit
          </Button>
          <Button variant="outline" size="sm" onClick={reset}>
            <RotateCcw className="h-4 w-4 mr-2" />
            Start Over
          </Button>
        </div>
      </div>

      {/* Download all button */}
      <Button
        onClick={downloadAllAsZip}
        disabled={downloading || completedSlides.length === 0}
        className="mb-6"
        size="lg"
      >
        <FileArchive className="h-4 w-4 mr-2" />
        {downloading ? 'Creating ZIP...' : 'Download All as ZIP'}
      </Button>

      {/* Slides grid */}
      <div className="flex-1 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 overflow-y-auto">
        {completedSlides.map((slide) => {
          const imageSrc = getSlideImageSrc(slide);
          return (
            <Card key={slide.id} className="overflow-hidden">
              <CardContent className="p-0">
                <div className="relative aspect-[9/16] bg-muted">
                  {imageSrc && (
                    <Image
                      src={imageSrc}
                      alt={`Slide ${slide.slideNumber}`}
                      fill
                      className="object-cover"
                    />
                  )}
                  {slide.editedImageData && (
                    <div className="absolute top-2 right-2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded">
                      Edited
                    </div>
                  )}
                </div>
                <div className="p-3 flex items-center justify-between">
                  <span className="text-sm font-medium">
                    Slide {slide.slideNumber}
                  </span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => downloadSingleSlide(slide.id, slide.slideNumber)}
                  >
                    {downloadedSlides.has(slide.id) ? (
                      <Check className="h-4 w-4 text-green-500" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
