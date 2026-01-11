'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Plus,
  Search,
  MoreHorizontal,
  Trash2,
  Clock,
  Layers,
  Sparkles,
  Loader2,
  Import,
  FileText,
  Pencil,
  Play,
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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { PageTitle } from '@/components/layout/PageTitle';
import {
  listTemplates,
  deleteTemplate,
  createTemplateFromTikTok,
  createTemplateFromPrompt,
  createTemplateFromScratch,
} from '@/lib/api-client';
import { TemplateListItem } from '@/types';

type CreateMethod = 'tiktok' | 'prompt' | 'scratch' | null;

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

export default function TemplatesPage() {
  const router = useRouter();

  // List state
  const [isLoading, setIsLoading] = useState(true);
  const [templates, setTemplates] = useState<TemplateListItem[]>([]);
  const [total, setTotal] = useState(0);
  const [pages, setPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchQuery, setSearchQuery] = useState('');

  // Modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [createMethod, setCreateMethod] = useState<CreateMethod>(null);
  const [isCreating, setIsCreating] = useState(false);

  // Create form state
  const [tiktokUrl, setTiktokUrl] = useState('');
  const [prompt, setPrompt] = useState('');
  const [scratchName, setScratchName] = useState('');
  const [slideCount, setSlideCount] = useState(5);

  // Delete state
  const [deleteTarget, setDeleteTarget] = useState<TemplateListItem | null>(null);

  const loadList = useCallback(async (page: number = 1) => {
    setIsLoading(true);
    try {
      const result = await listTemplates(page, 20);
      if (result.success) {
        setTemplates(result.templates);
        setTotal(result.total);
        setPages(result.pages);
        setCurrentPage(page);
      }
    } catch (error) {
      console.error('Failed to load templates:', error);
      toast.error('Failed to load templates');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadList(1);
  }, [loadList]);

  const handleDelete = async () => {
    if (!deleteTarget) return;
    try {
      const result = await deleteTemplate(deleteTarget.id);
      if (result.success) {
        toast.success('Template deleted');
        loadList(currentPage);
      } else {
        toast.error(result.error || 'Failed to delete');
      }
    } catch {
      toast.error('Failed to delete template');
    } finally {
      setDeleteTarget(null);
    }
  };

  const handleCreate = async () => {
    if (!createMethod) return;

    setIsCreating(true);
    try {
      let result;

      if (createMethod === 'tiktok') {
        if (!tiktokUrl.trim()) {
          toast.error('Please enter a TikTok URL');
          setIsCreating(false);
          return;
        }
        result = await createTemplateFromTikTok(tiktokUrl, true);
      } else if (createMethod === 'prompt') {
        if (!prompt.trim()) {
          toast.error('Please enter a prompt');
          setIsCreating(false);
          return;
        }
        result = await createTemplateFromPrompt(prompt, slideCount, true);
      } else if (createMethod === 'scratch') {
        if (!scratchName.trim()) {
          toast.error('Please enter a name');
          setIsCreating(false);
          return;
        }
        result = await createTemplateFromScratch(scratchName, slideCount);
      }

      if (result?.success && result.data) {
        toast.success('Template created');
        setShowCreateModal(false);
        resetCreateForm();
        router.push(`/templates/${result.data.id}`);
      } else {
        toast.error(result?.error || 'Failed to create template');
      }
    } catch (error) {
      console.error('Create error:', error);
      toast.error('Failed to create template');
    } finally {
      setIsCreating(false);
    }
  };

  const resetCreateForm = () => {
    setCreateMethod(null);
    setTiktokUrl('');
    setPrompt('');
    setScratchName('');
    setSlideCount(5);
  };

  const filteredTemplates = searchQuery
    ? templates.filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()))
    : templates;

  return (
    <div className="h-full bg-background">
      <PageTitle title="Templates" />

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-4">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3.5 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Search..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-8 h-8 w-48 text-sm"
              />
            </div>
            <span className="text-xs text-muted-foreground">
              {total} {total === 1 ? 'template' : 'templates'}
            </span>
          </div>
          <Button
            onClick={() => setShowCreateModal(true)}
            size="sm"
            className="font-medium gap-1.5 h-8"
          >
            <Plus className="size-3.5" />
            New
          </Button>
        </div>

        {isLoading && templates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
            <Loader2 className="size-5 animate-spin mb-2" />
            <p className="text-xs">Loading...</p>
          </div>
        ) : filteredTemplates.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20">
            <div className="size-12 rounded-xl bg-muted flex items-center justify-center mb-3">
              <Sparkles className="size-5 text-muted-foreground" />
            </div>
            <h3 className="text-sm font-medium text-foreground mb-1">
              {searchQuery ? 'No results found' : 'No templates yet'}
            </h3>
            <p className="text-xs text-muted-foreground mb-4">
              {searchQuery
                ? 'Try a different search term'
                : 'Create your first template to get started'}
            </p>
            {!searchQuery && (
              <Button onClick={() => setShowCreateModal(true)} variant="outline" size="sm">
                <Plus className="size-3.5 mr-1.5" />
                Create Template
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-1.5">
            {filteredTemplates.map((template) => {
              const sourceLabel =
                template.source?.type === 'tiktok'
                  ? `@${template.source.authorName || 'TikTok'}`
                  : template.source?.type === 'prompt'
                    ? 'From Prompt'
                    : 'From Scratch';

              return (
                <div key={template.id} className="group relative">
                  <Link href={`/templates/${template.id}`} className="block">
                    <div className="relative bg-card hover:bg-accent/50 border rounded-lg p-3 transition-all duration-150">
                      <div className="flex items-center justify-between gap-3">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          {/* Thumbnail */}
                          {template.thumbnailUrl ? (
                            <div className="size-10 rounded-md overflow-hidden bg-muted flex-shrink-0">
                              <img
                                src={template.thumbnailUrl}
                                alt=""
                                className="size-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="size-10 rounded-md bg-muted flex items-center justify-center flex-shrink-0">
                              <Layers className="size-4 text-muted-foreground" />
                            </div>
                          )}

                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <h3 className="text-sm font-medium text-foreground truncate">
                                {template.name}
                              </h3>
                              <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-muted text-muted-foreground">
                                {sourceLabel}
                              </span>
                            </div>
                            <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Layers className="size-3" />
                                {template.slideCount} slides
                              </span>
                              <span className="flex items-center gap-1">
                                <Clock className="size-3" />
                                {formatRelativeTime(template.updatedAt)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {/* Hover Actions */}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs"
                            onClick={(e) => {
                              e.preventDefault();
                              // TODO: Open generate slideshows modal
                              toast.info('Generate slideshows coming soon');
                            }}
                          >
                            <Play className="size-3 mr-1" />
                            Generate
                          </Button>
                          <DropdownMenu>
                            <DropdownMenuTrigger
                              onClick={(e) => e.preventDefault()}
                              className="size-7 inline-flex items-center justify-center rounded-md hover:bg-accent"
                            >
                              <MoreHorizontal className="size-3.5" />
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  router.push(`/templates/${template.id}`);
                                }}
                              >
                                <Pencil className="size-3.5 mr-2" />
                                Edit
                              </DropdownMenuItem>
                              <DropdownMenuItem
                                onClick={(e) => {
                                  e.preventDefault();
                                  setDeleteTarget(template);
                                }}
                                className="text-destructive focus:text-destructive"
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                Delete
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </div>
                    </div>
                  </Link>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination */}
        {pages > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-6">
            {Array.from({ length: pages }, (_, i) => i + 1).map((page) => (
              <Button
                key={page}
                variant={page === currentPage ? 'default' : 'ghost'}
                size="sm"
                className="h-7 w-7 p-0 text-xs"
                onClick={() => loadList(page)}
              >
                {page}
              </Button>
            ))}
          </div>
        )}
      </div>

      {/* Create Template Modal */}
      <Dialog
        open={showCreateModal}
        onOpenChange={(open) => {
          setShowCreateModal(open);
          if (!open) resetCreateForm();
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Create Template</DialogTitle>
            <DialogDescription>Choose how you want to create your template</DialogDescription>
          </DialogHeader>

          {!createMethod ? (
            <div className="grid gap-3 py-4">
              <button
                onClick={() => setCreateMethod('tiktok')}
                className="flex items-start gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors text-left"
              >
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Import className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Import from TikTok</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Clone the structure of an existing TikTok slideshow
                  </p>
                </div>
              </button>

              <button
                onClick={() => setCreateMethod('prompt')}
                className="flex items-start gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors text-left"
              >
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Sparkles className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Create from Prompt</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Describe your template and let AI generate it
                  </p>
                </div>
              </button>

              <button
                onClick={() => setCreateMethod('scratch')}
                className="flex items-start gap-3 p-4 rounded-lg border hover:bg-accent/50 transition-colors text-left"
              >
                <div className="size-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <FileText className="size-5 text-primary" />
                </div>
                <div>
                  <h3 className="font-medium text-sm">Start from Scratch</h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Create a blank template and build it yourself
                  </p>
                </div>
              </button>
            </div>
          ) : (
            <div className="py-4">
              {createMethod === 'tiktok' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="tiktok-url">TikTok URL</Label>
                    <Input
                      id="tiktok-url"
                      placeholder="https://www.tiktok.com/@username/photo/..."
                      value={tiktokUrl}
                      onChange={(e) => setTiktokUrl(e.target.value)}
                      disabled={isCreating}
                    />
                    <p className="text-xs text-muted-foreground">
                      Paste a TikTok Photo Mode slideshow URL
                    </p>
                  </div>
                </div>
              )}

              {createMethod === 'prompt' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="prompt">Describe your template</Label>
                    <Textarea
                      id="prompt"
                      placeholder="5 tips for studying effectively, motivational quotes for students..."
                      value={prompt}
                      onChange={(e) => setPrompt(e.target.value)}
                      disabled={isCreating}
                      rows={3}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of slides</Label>
                    <div className="flex gap-2">
                      {[3, 5, 7, 10].map((count) => (
                        <Button
                          key={count}
                          variant={slideCount === count ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSlideCount(count)}
                          disabled={isCreating}
                        >
                          {count}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {createMethod === 'scratch' && (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Template name</Label>
                    <Input
                      id="name"
                      placeholder="My Template"
                      value={scratchName}
                      onChange={(e) => setScratchName(e.target.value)}
                      disabled={isCreating}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Number of slides</Label>
                    <div className="flex gap-2">
                      {[3, 5, 7, 10].map((count) => (
                        <Button
                          key={count}
                          variant={slideCount === count ? 'default' : 'outline'}
                          size="sm"
                          onClick={() => setSlideCount(count)}
                          disabled={isCreating}
                        >
                          {count}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between mt-6 pt-4 border-t">
                <Button variant="ghost" onClick={() => setCreateMethod(null)} disabled={isCreating}>
                  Back
                </Button>
                <Button onClick={handleCreate} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="size-3.5 mr-2 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    'Create Template'
                  )}
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteTarget} onOpenChange={() => setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete template?</AlertDialogTitle>
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
