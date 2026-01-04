'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { ImageConfig } from '@/types';
import { Loader2, Download, Sparkles, Copy, Lightbulb, Wand2, Upload } from 'lucide-react';

interface PromptPanelProps {
  sessionId?: string;
}

type Mode = 'create' | 'import';

export function PromptPanel({ sessionId }: PromptPanelProps) {
  const { session, isLoading, importFromTikTok, createFromScratch } = useSlideshowGenerator();
  const [mode, setMode] = useState<Mode>('create');

  // Create from scratch state
  const [prompt, setPrompt] = useState('');
  const [slideCount, setSlideCount] = useState(5);

  // TikTok import state
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [remixMode, setRemixMode] = useState(true);
  const [userGuidance, setUserGuidance] = useState('');

  const [config] = useState<ImageConfig>({
    aspectRatio: '9:16',
    model: 'imagen-4.0-generate-001',
    slideCount: 5,
  });

  const handleCreate = () => {
    if (!prompt.trim()) return;
    createFromScratch(prompt, slideCount, { ...config, slideCount });
  };

  const handleImport = () => {
    if (!tiktokUrl.trim()) return;
    importFromTikTok(tiktokUrl, config, remixMode, userGuidance.trim() || undefined);
  };

  const isDisabled =
    isLoading || (session?.stage && !['prompt', 'importing', 'analyzing'].includes(session.stage));

  return (
    <div className="flex flex-col h-full">
      {/* Header with mode toggle */}
      <div className="px-6 py-5 border-b">
        <div className="flex gap-2 p-1 bg-muted rounded-lg">
          <button
            type="button"
            onClick={() => setMode('create')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'create'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Wand2 className="size-4" />
            Create
          </button>
          <button
            type="button"
            onClick={() => setMode('import')}
            className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${
              mode === 'import'
                ? 'bg-background text-foreground shadow-sm'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Upload className="size-4" />
            Import
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 p-6 space-y-6 overflow-y-auto">
        {mode === 'create' ? (
          <>
            {/* Create from scratch */}
            <div className="space-y-3">
              <Label htmlFor="prompt" className="text-sm font-medium text-foreground">
                What&apos;s your slideshow about?
              </Label>
              <Textarea
                id="prompt"
                placeholder="e.g., 5 morning habits that changed my life, skincare routine for beginners, study tips for college students..."
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                disabled={isDisabled}
                rows={4}
                className="resize-none"
              />
            </div>

            <div className="space-y-3">
              <Label htmlFor="slideCount" className="text-sm font-medium text-foreground">
                Number of slides
              </Label>
              <div className="flex gap-2">
                {[3, 5, 7, 10].map((count) => (
                  <button
                    key={count}
                    type="button"
                    onClick={() => setSlideCount(count)}
                    disabled={isDisabled}
                    className={`flex-1 py-2 px-3 rounded-lg border-2 text-sm font-medium transition-all ${
                      slideCount === count
                        ? 'border-primary bg-primary/5 text-foreground'
                        : 'border-border text-muted-foreground hover:border-muted-foreground/50'
                    }`}
                  >
                    {count}
                  </button>
                ))}
              </div>
            </div>

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">How it works:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>AI creates Pinterest queries + overlay text</li>
                <li>Search Pinterest for background images</li>
                <li>Edit text overlays in the canvas editor</li>
              </ol>
            </div>
          </>
        ) : (
          <>
            {/* TikTok Import */}
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

            {/* Mode Toggle */}
            <div className="space-y-3">
              <Label className="text-sm font-medium text-foreground">Import Mode</Label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setRemixMode(false)}
                  disabled={isDisabled}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    !remixMode
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Copy className="size-4" />
                    <span className="font-medium text-sm">Copy</span>
                  </div>
                  <p className="text-xs text-muted-foreground">Keep original text exactly as-is.</p>
                </button>
                <button
                  type="button"
                  onClick={() => setRemixMode(true)}
                  disabled={isDisabled}
                  className={`p-4 rounded-lg border-2 text-left transition-all ${
                    remixMode
                      ? 'border-primary bg-primary/5'
                      : 'border-border hover:border-muted-foreground/50'
                  }`}
                >
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="size-4" />
                    <span className="font-medium text-sm">Remix</span>
                  </div>
                  <p className="text-xs text-muted-foreground">AI rewrites for your product.</p>
                </button>
              </div>
            </div>

            {/* AI Guidance Box */}
            {remixMode && (
              <div className="space-y-3">
                <Label
                  htmlFor="userGuidance"
                  className="text-sm font-medium text-foreground flex items-center gap-2"
                >
                  <Lightbulb className="size-4 text-amber-500" />
                  Guide the AI (optional)
                </Label>
                <Textarea
                  id="userGuidance"
                  placeholder="e.g., Make it more casual, focus on skincare benefits..."
                  value={userGuidance}
                  onChange={(e) => setUserGuidance(e.target.value)}
                  disabled={isDisabled}
                  rows={3}
                  className="resize-none"
                />
              </div>
            )}

            <div className="p-4 bg-muted/50 rounded-lg space-y-2">
              <p className="text-sm font-medium">How it works:</p>
              <ol className="text-xs text-muted-foreground space-y-1 list-decimal list-inside">
                <li>We scrape the slideshow images</li>
                <li>AI analyzes each slide&apos;s style</li>
                {remixMode ? (
                  <li>AI rewrites text for your product</li>
                ) : (
                  <li>Original text is preserved</li>
                )}
                <li>Search Pinterest for similar images</li>
              </ol>
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t">
        {mode === 'create' ? (
          <Button
            onClick={handleCreate}
            disabled={!prompt.trim() || isDisabled}
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
                Create Slideshow
              </>
            )}
          </Button>
        ) : (
          <Button
            onClick={handleImport}
            disabled={!tiktokUrl.trim() || !tiktokUrl.includes('tiktok.com') || isDisabled}
            className="w-full"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                {remixMode ? 'Importing & Remixing...' : 'Importing...'}
              </>
            ) : (
              <>
                {remixMode ? (
                  <Sparkles className="mr-2 h-4 w-4" />
                ) : (
                  <Download className="mr-2 h-4 w-4" />
                )}
                {remixMode ? 'Import & Remix' : 'Import Slideshow'}
              </>
            )}
          </Button>
        )}
      </div>
    </div>
  );
}
