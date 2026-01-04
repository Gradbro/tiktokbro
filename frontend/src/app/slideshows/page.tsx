'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Copy,
  Clock,
  Layers,
  Sparkles,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useSlideshowPersistence } from '@/hooks/useSlideshowPersistence';
import { SlideshowListItem } from '@/types';
import { duplicateSlideshow } from '@/lib/api-client';
import { toast } from 'sonner';

const stageLabels: Record<string, { label: string; color: string }> = {
  prompt: { label: 'Draft', color: 'bg-zinc-500' },
  planning: { label: 'Planning', color: 'bg-amber-500' },
  review: { label: 'Review', color: 'bg-blue-500' },
  generating: { label: 'Generating', color: 'bg-purple-500' },
  editing: { label: 'Editing', color: 'bg-emerald-500' },
  complete: { label: 'Complete', color: 'bg-green-500' },
  importing: { label: 'Importing', color: 'bg-orange-500' },
  analyzing: { label: 'Analyzing', color: 'bg-cyan-500' },
  'remix-review': { label: 'Remix', color: 'bg-pink-500' },
};

function formatRelativeTime(dateString: string): string {
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

export default function MySlideshowsPage() {
  const router = useRouter();
  const { isLoading, slideshows, total, pages, currentPage, loadList, remove } =
    useSlideshowPersistence();

  const [searchQuery, setSearchQuery] = useState('');
  const [deleteTarget, setDeleteTarget] = useState<SlideshowListItem | null>(null);
  const [isDuplicating, setIsDuplicating] = useState<string | null>(null);

  useEffect(() => {
    loadList(1, 20);
  }, [loadList]);

  const handleCreateNew = () => {
    const newId = uuidv4();
    router.push(`/slideshows/${newId}?new=true`);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    await remove(deleteTarget.sessionId);
    setDeleteTarget(null);
  };

  const handleDuplicate = async (slideshow: SlideshowListItem) => {
    setIsDuplicating(slideshow.sessionId);
    try {
      const newId = uuidv4();
      const result = await duplicateSlideshow(slideshow.sessionId, newId);
      if (result.success) {
        toast.success('Slideshow duplicated');
        loadList(currentPage);
      } else {
        toast.error(result.error || 'Failed to duplicate');
      }
    } catch {
      toast.error('Failed to duplicate slideshow');
    } finally {
      setIsDuplicating(null);
    }
  };

  const filteredSlideshows = searchQuery
    ? slideshows.filter(
        (s) =>
          s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          s.prompt.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : slideshows;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-background/80 backdrop-blur-xl sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-semibold text-foreground tracking-tight">
                My Slideshows
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {total} {total === 1 ? 'project' : 'projects'}
              </p>
            </div>
            <Button onClick={handleCreateNew} className="font-medium gap-2">
              <Plus className="size-4" />
              New Slideshow
            </Button>
          </div>

          {/* Search */}
          <div className="mt-4 relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              type="text"
              placeholder="Search slideshows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-6xl mx-auto px-6 py-8">
        {isLoading && slideshows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-8 animate-spin mb-4" />
            <p>Loading slideshows...</p>
          </div>
        ) : filteredSlideshows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-16 rounded-2xl bg-muted flex items-center justify-center mb-4">
              <Sparkles className="size-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-medium text-foreground mb-1">
              {searchQuery ? 'No results found' : 'No slideshows yet'}
            </h3>
            <p className="text-sm text-muted-foreground mb-6">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first slideshow to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={handleCreateNew} variant="outline">
                <Plus className="size-4 mr-2" />
                Create Slideshow
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-3">
            {filteredSlideshows.map((slideshow) => {
              const stage = stageLabels[slideshow.stage] || stageLabels.prompt;

              return (
                <Link
                  key={slideshow.sessionId}
                  href={`/slideshows/${slideshow.sessionId}`}
                  className="group block"
                >
                  <div className="relative bg-card hover:bg-accent border rounded-xl p-4 transition-all duration-200">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <h3 className="font-medium text-foreground truncate">{slideshow.name}</h3>
                          <span
                            className={`inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium text-white ${stage.color}`}
                          >
                            {stage.label}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Layers className="size-3" />
                            {slideshow.slideCount} slides
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="size-3" />
                            {formatRelativeTime(slideshow.updatedAt)}
                          </span>
                        </div>
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger
                          onClick={(e) => e.preventDefault()}
                          className="size-8 opacity-0 group-hover:opacity-100 transition-opacity inline-flex items-center justify-center rounded-md hover:bg-accent hover:text-accent-foreground"
                        >
                          <MoreHorizontal className="size-4" />
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              handleDuplicate(slideshow);
                            }}
                            disabled={isDuplicating === slideshow.sessionId}
                          >
                            {isDuplicating === slideshow.sessionId ? (
                              <Loader2 className="size-4 mr-2 animate-spin" />
                            ) : (
                              <Copy className="size-4 mr-2" />
                            )}
                            Duplicate
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.preventDefault();
                              setDeleteTarget(slideshow);
                            }}
                            className="text-destructive focus:text-destructive"
                          >
                            <Trash2 className="size-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </Link>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-2 mt-8">
            {Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'outline'}
                size="sm"
                onClick={() => loadList(page)}
              >
                {page}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete slideshow?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete &quot;{deleteTarget?.name}&quot;. This action cannot be
              undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
