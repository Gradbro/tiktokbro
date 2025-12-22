'use client';

import { useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { useSlideshowPersistence } from '@/hooks/useSlideshowPersistence';
import { PlanReview } from './PlanReview';
import { RemixPlanReview } from './RemixPlanReview';
import { PromptPanel } from './PromptPanel';
import { Wand2, Check, Loader2 } from 'lucide-react';

interface StoryboardProps {
  sessionId?: string;
  isNew?: boolean;
}

export function Storyboard({ sessionId, isNew }: StoryboardProps) {
  const router = useRouter();
  const { session, reset } = useSlideshowContext();
  const { isLoading } = useSlideshowGenerator();
  const { save, isSaving } = useSlideshowPersistence();

  const lastSavedRef = useRef<string | null>(null);
  const hasInitialSaved = useRef(false);

  // Reset refs when sessionId changes (new slideshow)
  useEffect(() => {
    lastSavedRef.current = null;
    hasInitialSaved.current = false;
  }, [sessionId]);

  // Auto-save when session changes (debounced)
  const handleSave = useCallback(async () => {
    if (!session || !sessionId) return;

    // Create a hash of the session to detect changes
    const sessionHash = JSON.stringify({
      stage: session.stage,
      plans: session.plans,
      slides: session.slides.map((s) => ({
        id: s.id,
        status: s.status,
        textOverlay: s.textOverlay,
      })),
      remixPlans: session.remixPlans,
    });

    // Skip if nothing changed
    if (sessionHash === lastSavedRef.current) return;

    const success = await save({ ...session, id: sessionId });
    if (success) {
      lastSavedRef.current = sessionHash;
    }
  }, [session, sessionId, save]);

  // Immediate save when first reaching remix-review (new session created)
  useEffect(() => {
    if (!session || !sessionId || hasInitialSaved.current) return;

    // Save immediately when we have remix plans (analysis complete)
    if (session.stage === 'remix-review' && session.remixPlans && session.remixPlans.length > 0) {
      hasInitialSaved.current = true;
      save({ ...session, id: sessionId }).then((success) => {
        if (success) {
          lastSavedRef.current = JSON.stringify({
            stage: session.stage,
            plans: session.plans,
            slides: session.slides.map((s) => ({
              id: s.id,
              status: s.status,
              textOverlay: s.textOverlay,
            })),
            remixPlans: session.remixPlans,
          });
        }
      });
    }
  }, [session, sessionId, save]);

  // Auto-save on significant changes (stage changes, slide updates)
  useEffect(() => {
    if (!session || !sessionId) return;

    // Don't auto-save during generating/loading states
    if (
      session.stage === 'generating' ||
      session.stage === 'planning' ||
      session.stage === 'analyzing'
    ) {
      return;
    }

    // Skip if we haven't done initial save yet
    if (!hasInitialSaved.current && isNew) return;

    const timeoutId = setTimeout(() => {
      handleSave();
    }, 2000); // Debounce 2 seconds

    return () => clearTimeout(timeoutId);
  }, [
    session?.stage,
    session?.plans,
    session?.slides,
    session?.remixPlans,
    handleSave,
    sessionId,
    isNew,
    session,
  ]);

  const handleReset = () => {
    reset();
    router.push('/slideshows');
  };

  const isReviewStage = session?.stage === 'review';
  const isRemixReviewStage = session?.stage === 'remix-review';
  const isCompleteStage = session?.stage === 'complete';
  const isPromptStage =
    !session ||
    session.stage === 'prompt' ||
    session.stage === 'planning' ||
    session.stage === 'importing' ||
    session.stage === 'analyzing';

  return (
    <div className="flex flex-col h-full">
      {/* Saving indicator */}
      {isSaving && (
        <div className="absolute top-4 right-4 z-10 flex items-center gap-2 text-muted-foreground text-sm">
          <Loader2 className="size-3 animate-spin" />
          Saving...
        </div>
      )}

      {/* Main Content */}
      {isPromptStage ? (
        <div className="flex h-full">
          <div className="w-[400px] border-r">
            <PromptPanel sessionId={sessionId} />
          </div>
          <div className="flex-1 flex items-center justify-center p-8">
            <div className="text-center max-w-md">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
                <Wand2 className="h-8 w-8 text-primary" />
              </div>
              <h2 className="text-2xl font-semibold text-foreground mb-2">Import from TikTok</h2>
              <p className="text-muted-foreground">
                Import a TikTok Photo Mode slideshow and remix it with similar images from Pinterest
              </p>
            </div>
          </div>
        </div>
      ) : isRemixReviewStage ? (
        <RemixPlanReview />
      ) : isReviewStage ? (
        <PlanReview />
      ) : isCompleteStage ? (
        <div className="flex-1 flex items-center justify-center p-8">
          <div className="text-center max-w-md">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-green-500/10 mb-4">
              <Check className="h-8 w-8 text-green-500" />
            </div>
            <h2 className="text-2xl font-semibold text-foreground mb-2">Download Complete!</h2>
            <p className="text-muted-foreground mb-4">
              Your slides have been downloaded. Check your downloads folder.
            </p>
            <button
              onClick={handleReset}
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90"
            >
              Create Another
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
