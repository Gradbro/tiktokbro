'use client';

import { useEffect } from 'react';
import { ReactionProvider, useReactionContext } from '@/context/ReactionContext';
import { ReactionWorkspace } from '@/components/reactions/ReactionWorkspace';
import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Button } from '@/components/ui/button';

function ReactionCreatorContent() {
  const { state, loadReactions, loadCategories, clearError } = useReactionContext();
  const { error, isLoading } = state;

  useEffect(() => {
    // Only load reactions and categories on mount - don't create a session yet
    // Session will be created lazily when user uploads avatar or selects reaction
    const init = async () => {
      await Promise.all([loadReactions(), loadCategories()]);
    };
    init();
  }, [loadReactions, loadCategories]);

  // Show loading state while loading reactions
  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center text-muted-foreground">
          <p>Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col overflow-hidden">
      {/* Error banner */}
      {error && (
        <Alert variant="destructive" className="m-4 mb-0">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Error</AlertTitle>
          <AlertDescription className="flex items-center justify-between">
            <span>{error}</span>
            <Button variant="ghost" size="sm" onClick={clearError}>
              Dismiss
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* Main workspace interface */}
      <div className="flex-1 min-h-0">
        <ReactionWorkspace />
      </div>
    </div>
  );
}

export default function ReactionsPage() {
  return (
    <ReactionProvider>
      <ReactionCreatorContent />
    </ReactionProvider>
  );
}
