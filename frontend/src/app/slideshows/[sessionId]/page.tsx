'use client';

import { useEffect, useState } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { Storyboard } from '@/components/slideshow/Storyboard';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { useSlideshowPersistence } from '@/hooks/useSlideshowPersistence';
import { Loader2 } from 'lucide-react';

export default function SlideshowSessionPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const sessionId = params.sessionId as string;
  const isNew = searchParams.get('new') === 'true';

  const { restoreSession } = useSlideshowContext();
  const { load, isLoading } = useSlideshowPersistence();

  const [initialized, setInitialized] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  useEffect(() => {
    const initializeSession = async () => {
      // If it's a new session, initialize fresh
      if (isNew) {
        // Session will be initialized when user provides prompt
        setInitialized(true);
        return;
      }

      // Try to load existing session from DB
      const loaded = await load(sessionId);

      if (loaded) {
        // Restore the full session state to context
        restoreSession(loaded);
        setInitialized(true);
      } else {
        // Session not found - could be deleted or never existed
        setLoadError('Slideshow not found');
        setInitialized(true);
      }
    };

    if (!initialized && sessionId) {
      initializeSession();
    }
  }, [sessionId, isNew, initialized, load, restoreSession]);

  if (!initialized || isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-muted-foreground">
          <Loader2 className="size-8 animate-spin" />
          <p>Loading slideshow...</p>
        </div>
      </div>
    );
  }

  if (loadError && !isNew) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="size-16 rounded-2xl bg-muted flex items-center justify-center">
            <span className="text-3xl">🔍</span>
          </div>
          <h2 className="text-xl font-medium text-foreground">Slideshow not found</h2>
          <p className="text-muted-foreground max-w-sm">
            This slideshow may have been deleted or the link is invalid.
          </p>
          <a
            href="/slideshows"
            className="mt-4 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium hover:bg-primary/90 transition-colors"
          >
            Back to My Slideshows
          </a>
        </div>
      </div>
    );
  }

  return <Storyboard sessionId={sessionId} isNew={isNew} />;
}
