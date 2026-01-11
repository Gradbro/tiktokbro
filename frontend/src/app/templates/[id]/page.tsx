'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { HugeiconsIcon } from '@hugeicons/react';
import {
  Add01Icon,
  Delete02Icon,
  Tick02Icon,
  Loading02Icon,
  TextIcon,
  CloudIcon,
} from '@hugeicons/core-free-icons';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { usePageContext } from '@/context/PageContext';
import {
  getTemplate,
  updateTemplate,
  addTemplateSlide,
  removeTemplateSlide,
} from '@/lib/api-client';
import { Template, TemplateTextBox } from '@/types';

// Fabric.js editor components
import { FabricCanvas, type FabricCanvasRef } from '@/components/editor/FabricCanvas';
import { PropertiesPanel } from '@/components/editor/PropertiesPanel';
import type {
  SelectedObjectInfo,
  TextObjectProps,
  ImageObjectProps,
  SceneProps,
} from '@/components/editor/FabricCanvas/types';
import { DEFAULT_BACKGROUND_COLOR } from '@/components/editor/FabricCanvas/constants';
import { cn } from '@/lib/utils';

type SaveStatus = 'saved' | 'saving' | 'unsaved';

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;
  const { setBreadcrumbs, setToolbarContent, setRightActions } = usePageContext();

  const canvasRef = useRef<FabricCanvasRef>(null);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('saved');
  const [template, setTemplate] = useState<Template | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);

  // Selection state from Fabric canvas
  const [selection, setSelection] = useState<SelectedObjectInfo>({
    type: 'none',
    object: null,
    id: null,
  });
  const [textProps, setTextProps] = useState<TextObjectProps | null>(null);
  const [imageProps, setImageProps] = useState<ImageObjectProps | null>(null);

  // Scene props computed from current slide
  const currentSlide = template?.slides[selectedSlideIndex];
  const sceneProps: SceneProps = {
    width: currentSlide?.width || 1080,
    height: currentSlide?.height || 1920,
    backgroundColor: currentSlide?.backgroundColor || DEFAULT_BACKGROUND_COLOR,
  };

  const loadTemplate = useCallback(async () => {
    setIsLoading(true);
    try {
      const result = await getTemplate(templateId);
      if (result.success && result.data) {
        // Map _id to id if needed
        const templateData = {
          ...result.data,
          id: (result.data as unknown as { _id?: string })._id || result.data.id,
        };
        setTemplate(templateData);
      } else {
        toast.error(result.error || 'Template not found');
        router.push('/templates');
      }
    } catch (error) {
      console.error('Failed to load template:', error);
      toast.error('Failed to load template');
      router.push('/templates');
    } finally {
      setIsLoading(false);
    }
  }, [templateId, router]);

  useEffect(() => {
    loadTemplate();
  }, [loadTemplate]);

  // Set breadcrumbs
  useEffect(() => {
    setBreadcrumbs([
      { label: 'Templates', href: '/templates' },
      { label: template?.name || 'Loading...' },
    ]);

    return () => {
      setBreadcrumbs([]);
    };
  }, [template?.name, setBreadcrumbs]);

  // Clear toolbar content - we'll use our own secondary bar
  useEffect(() => {
    setToolbarContent(null);
    return () => setToolbarContent(null);
  }, [setToolbarContent]);

  // Auto-save function
  const performSave = useCallback(async () => {
    if (!template) return;

    // Get current canvas state
    const slideData = canvasRef.current?.getSlideData();
    const slidesToSave = slideData
      ? template.slides.map((s, i) =>
          i === selectedSlideIndex ? { ...s, textBoxes: slideData.textBoxes } : s
        )
      : template.slides;

    setSaveStatus('saving');
    try {
      const result = await updateTemplate(template.id, {
        name: template.name,
        slides: slidesToSave,
      });

      if (result.success) {
        setSaveStatus('saved');
      } else {
        setSaveStatus('unsaved');
        toast.error(result.error || 'Failed to save');
      }
    } catch {
      setSaveStatus('unsaved');
      toast.error('Failed to save template');
    }
  }, [template, selectedSlideIndex]);

  // Trigger auto-save with debounce
  const triggerAutoSave = useCallback(() => {
    setSaveStatus('unsaved');

    // Clear existing timeout
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    // Set new timeout for auto-save (1.5 seconds after last change)
    saveTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 1500);
  }, [performSave]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Set right actions (Add Text, Save Status)
  useEffect(() => {
    const content = (
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={handleAddText}>
          <HugeiconsIcon icon={TextIcon} className="size-4 mr-2" strokeWidth={2} />
          Add Text
        </Button>
        {/* Save Status Indicator */}
        <div className="flex items-center gap-1.5 px-2 py-1 text-xs text-muted-foreground">
          {saveStatus === 'saving' && (
            <>
              <HugeiconsIcon
                icon={Loading02Icon}
                className="size-3.5 animate-spin"
                strokeWidth={2}
              />
              <span>Saving...</span>
            </>
          )}
          {saveStatus === 'saved' && (
            <>
              <HugeiconsIcon icon={CloudIcon} className="size-3.5 text-green-500" strokeWidth={2} />
              <span className="text-green-500">Saved</span>
            </>
          )}
          {saveStatus === 'unsaved' && (
            <>
              <div className="size-2 rounded-full bg-orange-400" />
              <span>Unsaved</span>
            </>
          )}
        </div>
      </div>
    );

    setRightActions(content);

    return () => {
      setRightActions(null);
    };
  }, [saveStatus, setRightActions]);

  // Legacy manual save (keeping for keyboard shortcut if needed)
  const handleSave = async () => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    await performSave();
  };

  const handleAddSlide = async () => {
    if (!template) return;

    try {
      const result = await addTemplateSlide(template.id);
      if (result.success && result.data) {
        setTemplate(result.data);
        setSelectedSlideIndex(result.data.slides.length - 1);
      }
    } catch {
      toast.error('Failed to add slide');
    }
  };

  const handleRemoveSlide = async (slideId: string) => {
    if (!template || template.slides.length <= 1) {
      return; // Silently prevent removing last slide
    }

    try {
      const result = await removeTemplateSlide(template.id, slideId);
      if (result.success && result.data) {
        setTemplate(result.data);
        setSelectedSlideIndex(Math.min(selectedSlideIndex, result.data.slides.length - 1));
      }
    } catch {
      toast.error('Failed to remove slide');
    }
  };

  const handleCanvasChange = (slideData: { id: string; textBoxes: TemplateTextBox[] }) => {
    if (!template) return;

    // Update template state with new canvas data
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s, i) =>
          i === selectedSlideIndex ? { ...s, textBoxes: slideData.textBoxes } : s
        ),
      };
    });

    // Trigger auto-save
    triggerAutoSave();
  };

  /**
   * Handle text property changes from the properties panel
   */
  const handleTextChange = (props: Partial<TextObjectProps>) => {
    if (!textProps?.id || !template) return;

    const currentSlide = template.slides[selectedSlideIndex];
    if (!currentSlide) return;

    // IMPORTANT: Update the canvas immediately for visual feedback
    canvasRef.current?.updateSelectedText(props);

    // Also update the template state for persistence
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s, i) => {
          if (i !== selectedSlideIndex) return s;
          return {
            ...s,
            textBoxes: s.textBoxes.map((tb) => {
              if (tb.id !== textProps.id) return tb;
              return {
                ...tb,
                ...(props.text !== undefined && { defaultText: props.text }),
                ...(props.left !== undefined && { x: props.left }),
                ...(props.top !== undefined && { y: props.top }),
                ...(props.fontSize !== undefined && { fontSize: props.fontSize }),
                ...(props.fontFamily !== undefined && { fontFamily: props.fontFamily }),
                ...(props.fill !== undefined && { color: props.fill }),
                ...(props.customBackgroundColor !== undefined && {
                  backgroundColor: props.customBackgroundColor,
                }),
                ...(props.textAlign !== undefined && { textAlign: props.textAlign }),
                ...(props.variableName !== undefined && { variableName: props.variableName }),
              };
            }),
          };
        }),
      };
    });

    // Trigger auto-save
    triggerAutoSave();
  };

  /**
   * Handle image property changes
   */
  const handleImageChange = (props: Partial<ImageObjectProps>) => {
    // Image changes are handled directly on the canvas
    console.log('Image change:', props);
  };

  /**
   * Handle scene property changes (dimensions and background color)
   */
  const handleSceneChange = (props: Partial<SceneProps>) => {
    if (!template) return;

    // Update slide dimensions and background color
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s, i) => {
          if (i !== selectedSlideIndex) return s;
          return {
            ...s,
            ...(props.width !== undefined && { width: props.width }),
            ...(props.height !== undefined && { height: props.height }),
            ...(props.backgroundColor !== undefined && { backgroundColor: props.backgroundColor }),
          };
        }),
      };
    });

    // Trigger auto-save
    triggerAutoSave();
  };

  /**
   * Remove background image from current slide
   */
  const handleRemoveBackgroundImage = () => {
    if (!template) return;

    // Remove from canvas
    canvasRef.current?.removeBackgroundImage();

    // Update template state to remove backgroundImageUrl
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s, i) => {
          if (i !== selectedSlideIndex) return s;
          return {
            ...s,
            backgroundImageUrl: undefined,
            backgroundCollectionId: undefined,
          };
        }),
      };
    });

    // Trigger auto-save
    triggerAutoSave();
  };

  /**
   * Handle background image selection from collection
   */
  const handleBackgroundImageSelect = async (url: string, collectionId: string) => {
    if (!template) return;

    // Update canvas
    await canvasRef.current?.setBackgroundImage(url, collectionId);

    // Update template state
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s, i) => {
          if (i !== selectedSlideIndex) return s;
          return {
            ...s,
            backgroundImageUrl: url,
            backgroundCollectionId: collectionId,
          };
        }),
      };
    });

    // Trigger auto-save
    triggerAutoSave();
  };

  /**
   * Add a new text box to the current slide
   */
  const handleAddText = () => {
    if (!template) return;

    const newTextBox: TemplateTextBox = {
      id: `text-${Date.now()}`,
      defaultText: 'New Text',
      variableName: '',
      x: 50,
      y: 50,
      fontSize: 48,
      fontFamily: 'Inter',
      color: '#FFFFFF',
      backgroundColor: null,
      textAlign: 'center',
    };

    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s, i) => {
          if (i !== selectedSlideIndex) return s;
          return {
            ...s,
            textBoxes: [...s.textBoxes, newTextBox],
          };
        }),
      };
    });

    // Also add to canvas
    canvasRef.current?.addText('New Text');
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <HugeiconsIcon
          icon={Loading02Icon}
          className="size-6 animate-spin text-muted-foreground"
          strokeWidth={2}
        />
      </div>
    );
  }

  if (!template) {
    return null;
  }

  // Prepare slide data for canvas (includes backgroundColor now)
  const slideForCanvas = currentSlide
    ? {
        id: currentSlide.id,
        backgroundImageUrl: currentSlide.backgroundImageUrl,
        backgroundColor: currentSlide.backgroundColor || DEFAULT_BACKGROUND_COLOR,
        textBoxes: currentSlide.textBoxes,
        width: currentSlide.width || 1080,
        height: currentSlide.height || 1920,
      }
    : null;

  return (
    <div className="h-full flex overflow-hidden">
      {/* Left Sidebar - Slide Thumbnails */}
      <div className="w-20 h-full border-r bg-background flex flex-col flex-shrink-0">
        <div className="flex-1 overflow-y-auto py-3 px-2 space-y-2 min-h-0">
          {template.slides.map((slide, index) => (
            <button
              key={slide.id}
              onClick={() => setSelectedSlideIndex(index)}
              className={cn(
                'group relative w-full aspect-[9/16] rounded-lg overflow-hidden transition-all flex-shrink-0',
                index === selectedSlideIndex
                  ? 'ring-2 ring-primary'
                  : 'ring-1 ring-border/40 opacity-60 hover:opacity-100'
              )}
            >
              {slide.backgroundImageUrl ? (
                <img
                  src={slide.backgroundImageUrl}
                  alt={`Slide ${index + 1}`}
                  className="w-full h-full object-cover"
                  draggable={false}
                />
              ) : (
                <div className="w-full h-full bg-muted" />
              )}
              {/* Delete button - top right corner */}
              {template.slides.length > 1 && (
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    handleRemoveSlide(slide.id);
                  }}
                  className="absolute top-1 right-1 size-5 rounded bg-black/70 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity cursor-pointer hover:bg-destructive"
                >
                  <HugeiconsIcon
                    icon={Delete02Icon}
                    className="size-3 text-white"
                    strokeWidth={2}
                  />
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Add Slide Button */}
        <div className="p-2 border-t flex-shrink-0">
          <button
            onClick={handleAddSlide}
            className="w-full aspect-[9/16] rounded-lg border-2 border-dashed border-muted-foreground/30 hover:border-primary hover:bg-primary/5 flex items-center justify-center transition-all"
          >
            <HugeiconsIcon
              icon={Add01Icon}
              className="size-4 text-muted-foreground"
              strokeWidth={2}
            />
          </button>
        </div>
      </div>

      {/* Center: Canvas Area */}
      <div className="flex-1 h-full flex items-center justify-center bg-muted/10 min-w-0 overflow-hidden">
        {slideForCanvas && (
          <FabricCanvas
            ref={canvasRef}
            slide={slideForCanvas}
            sceneProps={sceneProps}
            onSelectionChange={setSelection}
            onCanvasChange={handleCanvasChange}
            onTextPropsChange={setTextProps}
            onImagePropsChange={setImageProps}
          />
        )}
      </div>

      {/* Right Panel - Properties */}
      <div className="w-72 h-full border-l bg-background flex-shrink-0 overflow-hidden">
        <PropertiesPanel
          selectionType={selection.type}
          textProps={textProps}
          imageProps={imageProps}
          sceneProps={sceneProps}
          backgroundImageUrl={currentSlide?.backgroundImageUrl}
          onTextChange={handleTextChange}
          onImageChange={handleImageChange}
          onSceneChange={handleSceneChange}
          onFitImageToCanvas={() => canvasRef.current?.fitSelectedImage()}
          onImageSelect={(url, collectionId) =>
            canvasRef.current?.replaceSelectedImage(url, collectionId)
          }
          onBackgroundImageSelect={handleBackgroundImageSelect}
          onRemoveBackgroundImage={handleRemoveBackgroundImage}
          onFitBackgroundImage={() => canvasRef.current?.fitBackgroundImage()}
        />
      </div>
    </div>
  );
}
