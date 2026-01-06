'use client';

import { Video, Sparkles } from 'lucide-react';

export default function AvatarPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full bg-muted/20">
      <div className="text-center max-w-sm">
        <div className="inline-flex items-center justify-center size-14 rounded-xl bg-primary/10 mb-4">
          <Video className="size-6 text-primary" />
        </div>
        <h2 className="text-base font-medium text-foreground mb-1.5">Coming Soon</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Create AI-powered video avatars for your content.
        </p>
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-primary/10 text-primary text-xs font-medium">
          <Sparkles className="size-3" />
          In Development
        </div>
      </div>
    </div>
  );
}
