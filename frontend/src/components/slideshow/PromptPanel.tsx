'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { ImageConfig } from '@/types';
import { Loader2, Download, Wand2 } from 'lucide-react';

export function PromptPanel() {
  const { session, isLoading, importFromTikTok, createRemixPlan } = useSlideshowGenerator();
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [remixPrompt, setRemixPrompt] = useState('');
  const [config] = useState<ImageConfig>({
    aspectRatio: '9:16',
    model: 'imagen-4.0-generate-001',
    slideCount: 5,
  });

  const handleImport = () => {
    if (!tiktokUrl.trim()) return;
    importFromTikTok(tiktokUrl, config);
  };

  const handleRemixGenerate = () => {
    if (!remixPrompt.trim()) return;
    createRemixPlan(remixPrompt);
  };

  const isDisabled = isLoading || (session?.stage && !['prompt', 'importing', 'analyzing'].includes(session.stage));
  const isImportMode = session?.tiktokData && session?.slideAnalyses && session.slideAnalyses.length > 0;

  // After import + analysis, show remix prompt input
  if (isImportMode && session.stage === 'prompt') {
    return (
      <div className="flex flex-col h-full">
        {/* Header */}
        <div className="px-6 py-5 border-b">
          <h1 className="text-lg font-semibold text-foreground">Remix Slideshow</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Imported {session.tiktokData?.slides.length} slides from TikTok
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 p-6 space-y-6 overflow-y-auto">
          {/* Original Caption */}
          {session.tiktokData?.caption && (
            <div className="p-3 bg-muted rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Original caption:</p>
              <p className="text-sm">{session.tiktokData.caption}</p>
            </div>
          )}

          {/* Slide Previews */}
          <div className="space-y-2">
            <Label className="text-sm font-medium">Analyzed Slides</Label>
            <div className="flex gap-2 overflow-x-auto pb-2">
              {session.slideAnalyses?.map((analysis, i) => (
                <div key={i} className="shrink-0 w-16 text-center">
                  <div className="w-16 h-24 bg-muted rounded border text-xs flex items-center justify-center p-1">
                    {analysis.backgroundType}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 truncate">
                    {analysis.extractedText || 'No text'}
                  </p>
                </div>
              ))}
            </div>
          </div>

          {/* Remix Prompt */}
          <div className="space-y-3">
            <Label htmlFor="remixPrompt" className="text-sm font-medium text-foreground">
              What&apos;s your new slideshow about?
            </Label>
            <Textarea
              id="remixPrompt"
              placeholder="e.g., hiking in Colorado, morning coffee routine, my skincare journey..."
              value={remixPrompt}
              onChange={(e) => setRemixPrompt(e.target.value)}
              disabled={isLoading}
              className="min-h-[100px] resize-none"
            />
            <p className="text-xs text-muted-foreground">
              We&apos;ll generate Pinterest search queries and find images automatically
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t">
          <Button
            onClick={handleRemixGenerate}
            disabled={!remixPrompt.trim() || isLoading}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Generating Plan...
              </>
            ) : (
              <>
                <Wand2 className="mr-2 h-4 w-4" />
                Generate Remix Plan
              </>
            )}
          </Button>
        </div>
      </div>
    );
  }

  // Initial state: TikTok URL input
  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="px-6 py-5 border-b">
        <h1 className="text-lg font-semibold text-foreground">Import TikTok</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Import a Photo Mode slideshow to remix
        </p>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {/* TikTok URL Input */}
        <div className="space-y-3">
          <Label htmlFor="tiktokUrl" className="text-sm font-medium text-foreground">
            TikTok Photo Mode URL
          </Label>
          <Input
            id="tiktokUrl"
            placeholder="https://www.tiktok.com/@user/photo/1234567890"
            value={tiktokUrl}
            onChange={(e) => setTiktokUrl(e.target.value)}
            disabled={isDisabled}
          />
          <p className="text-xs text-muted-foreground">
            Paste a TikTok Photo Mode slideshow URL
          </p>
        </div>

        {/* What happens */}
        <div className="p-4 bg-muted/50 rounded-lg space-y-2">
          <p className="text-sm font-medium">How it works:</p>
          <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
            <li>We scrape the slideshow images</li>
            <li>AI analyzes each slide&apos;s style and text</li>
            <li>You describe your new topic</li>
            <li>We auto-search Pinterest for matching images</li>
            <li>You pick images and edit text</li>
          </ol>
        </div>
      </div>

      {/* Footer */}
      <div className="p-6 border-t">
        <Button
          onClick={handleImport}
          disabled={!tiktokUrl.trim() || !tiktokUrl.includes('tiktok.com') || isDisabled}
          className="w-full"
          size="lg"
        >
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Importing & Analyzing...
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Import Slideshow
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
