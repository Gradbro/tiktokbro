'use client';

import { useState, useEffect, useRef } from 'react';
import { Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { getSettings, updateSettings } from '@/lib/api-client';
import { toast } from 'sonner';

interface ProductSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function ProductSettingsDialog({ open, onOpenChange }: ProductSettingsDialogProps) {
  const { session, setProductContext } = useSlideshowContext();
  const [globalContext, setGlobalContext] = useState('');
  const [localEdit, setLocalEdit] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const hasFetched = useRef(false);

  // Fetch from DB on mount
  useEffect(() => {
    if (!open || hasFetched.current) return;
    hasFetched.current = true;

    getSettings()
      .then((res) => {
        if (res.success && res.data) {
          setGlobalContext(res.data.productContext || '');
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, [open]);

  // Display priority: local edit > session > global > empty
  const displayValue = localEdit ?? session?.productContext ?? globalContext;
  const savedValue = session?.productContext ?? globalContext;
  const hasChanges = localEdit !== null && localEdit !== savedValue;

  const handleSave = async () => {
    if (localEdit === null) return;

    setIsSaving(true);
    try {
      const res = await updateSettings(localEdit);
      if (res.success) {
        setGlobalContext(localEdit);

        // Also save to current session if exists
        if (session) {
          setProductContext(localEdit);
        }

        setLocalEdit(null);
        toast.success('Product context saved');
        onOpenChange(false);
      } else {
        toast.error(res.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save product context');
    } finally {
      setIsSaving(false);
    }
  };

  const handleChange = (value: string) => {
    setLocalEdit(value);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Product Context</DialogTitle>
          <DialogDescription>
            Describe your product or brand. AI will adapt slide text to promote it naturally.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4 py-2">
          <div className="space-y-2">
            <Label htmlFor="product-context" className="sr-only">
              Product context
            </Label>
            {isLoading ? (
              <div className="flex items-center justify-center h-32">
                <Loader2 className="size-5 animate-spin text-muted-foreground" />
              </div>
            ) : (
              <Textarea
                id="product-context"
                placeholder="e.g., AcmeFit - A fitness app that helps users build healthy habits with personalized workout plans and nutrition tracking. Tone: Motivational, energetic, friendly."
                value={displayValue}
                onChange={(e) => handleChange(e.target.value)}
                className="min-h-[140px] text-sm resize-none"
              />
            )}
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
              {isSaving ? (
                <Loader2 className="size-4 mr-1.5 animate-spin" />
              ) : (
                <Save className="size-4 mr-1.5" />
              )}
              {isSaving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
