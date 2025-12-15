'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { ImageConfig } from '@/types';
import { Loader2, Download } from 'lucide-react';

export function PromptPanel() {
  const { session, isLoading, importFromTikTok } = useSlideshowGenerator();
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [config] = useState<ImageConfig>({
    aspectRatio: '9:16',
    model: 'imagen-4.0-generate-001',
    slideCount: 5,
  });

  const handleImport = () => {
    if (!tiktokUrl.trim()) return;
    importFromTikTok(tiktokUrl, config);
  };

  const isDisabled = isLoading || (session?.stage && !['prompt', 'importing', 'analyzing'].includes(session.stage));

  // TikTok URL input
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
            <li>AI analyzes each slide&apos;s style and content</li>
            <li>We auto-search Pinterest for similar images</li>
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
