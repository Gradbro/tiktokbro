'use client';

import { useState, useEffect, useRef } from 'react';
import { Settings, ChevronDown, ChevronUp, Save, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { getSettings, updateSettings } from '@/lib/api-client';
import { toast } from 'sonner';

export function ProductSettings() {
  const { session, setProductContext } = useSlideshowContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [globalContext, setGlobalContext] = useState('');
  const [localEdit, setLocalEdit] = useState<string | null>(null);
  const [_isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const hasFetched = useRef(false);

  // Fetch from DB on mount
  useEffect(() => {
    if (hasFetched.current) return;
    hasFetched.current = true;

    getSettings()
      .then((res) => {
        if (res.success && res.data) {
          setGlobalContext(res.data.productContext || '');
        }
      })
      .catch(console.error)
      .finally(() => setIsLoading(false));
  }, []);

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
    <div className="border-t border-sidebar-border">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
      >
        <div className="flex items-center gap-2">
          <Settings className="size-4" />
          <span>Product Context</span>
        </div>
        {isExpanded ? (
          <ChevronUp className="size-4 text-muted-foreground" />
        ) : (
          <ChevronDown className="size-4 text-muted-foreground" />
        )}
      </button>

      {isExpanded && (
        <div className="px-4 pb-4 space-y-3">
          <div className="space-y-2">
            <Label htmlFor="product-context" className="text-xs text-muted-foreground">
              Describe your product/brand. AI will adapt slide text to promote it.
            </Label>
            <Textarea
              id="product-context"
              placeholder="e.g., AcmeFit - A fitness app that helps users build healthy habits with personalized workout plans and nutrition tracking. Tone: Motivational, energetic, friendly."
              value={displayValue}
              onChange={(e) => handleChange(e.target.value)}
              className="min-h-[120px] text-sm resize-none"
            />
          </div>

          <Button
            size="sm"
            onClick={handleSave}
            disabled={!hasChanges || isSaving}
            className="w-full"
          >
            {isSaving ? (
              <Loader2 className="size-3.5 mr-1.5 animate-spin" />
            ) : (
              <Save className="size-3.5 mr-1.5" />
            )}
            {isSaving ? 'Saving...' : hasChanges ? 'Save Context' : 'Saved'}
          </Button>
        </div>
      )}
    </div>
  );
}
