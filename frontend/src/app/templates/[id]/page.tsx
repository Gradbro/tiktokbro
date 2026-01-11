'use client';

import { useEffect, useState, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  ArrowLeft,
  Plus,
  Trash2,
  GripVertical,
  Save,
  Loader2,
  Image as ImageIcon,
  Type,
  Settings,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { toast } from 'sonner';
import { PageTitle } from '@/components/layout/PageTitle';
import {
  getTemplate,
  updateTemplate,
  addTemplateSlide,
  removeTemplateSlide,
  updateTemplateSlide,
} from '@/lib/api-client';
import { Template, TemplateSlide, TemplateTextBox } from '@/types';

export default function TemplateEditorPage() {
  const params = useParams();
  const router = useRouter();
  const templateId = params.id as string;

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [template, setTemplate] = useState<Template | null>(null);
  const [selectedSlideIndex, setSelectedSlideIndex] = useState(0);
  const [selectedTextBoxId, setSelectedTextBoxId] = useState<string | null>(null);

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

  const handleSave = async () => {
    if (!template) return;

    setIsSaving(true);
    try {
      const result = await updateTemplate(template.id, {
        name: template.name,
        slides: template.slides,
      });

      if (result.success) {
        toast.success('Template saved');
      } else {
        toast.error(result.error || 'Failed to save');
      }
    } catch {
      toast.error('Failed to save template');
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddSlide = async () => {
    if (!template) return;

    try {
      const result = await addTemplateSlide(template.id);
      if (result.success && result.data) {
        setTemplate(result.data);
        setSelectedSlideIndex(result.data.slides.length - 1);
        toast.success('Slide added');
      }
    } catch {
      toast.error('Failed to add slide');
    }
  };

  const handleRemoveSlide = async (slideId: string) => {
    if (!template || template.slides.length <= 1) {
      toast.error('Cannot remove the last slide');
      return;
    }

    try {
      const result = await removeTemplateSlide(template.id, slideId);
      if (result.success && result.data) {
        setTemplate(result.data);
        setSelectedSlideIndex(Math.min(selectedSlideIndex, result.data.slides.length - 1));
        toast.success('Slide removed');
      }
    } catch {
      toast.error('Failed to remove slide');
    }
  };

  const handleUpdateSlide = async (slideId: string, data: Partial<TemplateSlide>) => {
    if (!template) return;

    // Optimistic update
    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s) => (s.id === slideId ? { ...s, ...data } : s)),
      };
    });
  };

  const handleUpdateTextBox = (
    slideId: string,
    textBoxId: string,
    data: Partial<TemplateTextBox>
  ) => {
    if (!template) return;

    setTemplate((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        slides: prev.slides.map((s) => {
          if (s.id !== slideId) return s;
          return {
            ...s,
            textBoxes: s.textBoxes.map((tb) => (tb.id === textBoxId ? { ...tb, ...data } : tb)),
          };
        }),
      };
    });
  };

  if (isLoading) {
    return (
      <div className="h-full flex items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!template) {
    return null;
  }

  const currentSlide = template.slides[selectedSlideIndex];
  const selectedTextBox = selectedTextBoxId
    ? currentSlide?.textBoxes.find((tb) => tb.id === selectedTextBoxId)
    : null;

  return (
    <div className="h-full flex flex-col bg-background">
      <PageTitle title={template.name} />

      {/* Top Bar */}
      <div className="h-12 border-b flex items-center justify-between px-4 flex-shrink-0">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => router.push('/templates')}>
            <ArrowLeft className="size-4 mr-1" />
            Templates
          </Button>
          <Separator orientation="vertical" className="h-5" />
          <Input
            value={template.name}
            onChange={(e) =>
              setTemplate((prev) => (prev ? { ...prev, name: e.target.value } : prev))
            }
            className="h-8 w-48 text-sm font-medium border-transparent hover:border-input focus:border-input"
          />
        </div>
        <Button onClick={handleSave} disabled={isSaving} size="sm">
          {isSaving ? (
            <>
              <Loader2 className="size-3.5 mr-2 animate-spin" />
              Saving...
            </>
          ) : (
            <>
              <Save className="size-3.5 mr-2" />
              Save Template
            </>
          )}
        </Button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel - Slides */}
        <div className="w-48 border-r flex flex-col">
          <div className="p-3 border-b flex items-center justify-between">
            <span className="text-xs font-medium text-muted-foreground">Slides</span>
            <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={handleAddSlide}>
              <Plus className="size-3.5" />
            </Button>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-2 space-y-1">
              {template.slides.map((slide, index) => (
                <div
                  key={slide.id}
                  className={`group relative rounded-lg border p-1.5 cursor-pointer transition-colors ${
                    index === selectedSlideIndex
                      ? 'border-primary bg-primary/5'
                      : 'hover:bg-accent/50'
                  }`}
                  onClick={() => {
                    setSelectedSlideIndex(index);
                    setSelectedTextBoxId(null);
                  }}
                >
                  <div className="flex items-center gap-2">
                    <GripVertical className="size-3 text-muted-foreground opacity-0 group-hover:opacity-100 cursor-grab" />
                    <div className="flex-1 min-w-0">
                      <div className="aspect-[9/16] rounded bg-muted overflow-hidden">
                        {slide.backgroundImageUrl ? (
                          <img
                            src={slide.backgroundImageUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center">
                            <ImageIcon className="size-4 text-muted-foreground" />
                          </div>
                        )}
                      </div>
                    </div>
                    <span className="text-[10px] text-muted-foreground">{index + 1}</span>
                    {template.slides.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="size-5 p-0 opacity-0 group-hover:opacity-100"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveSlide(slide.id);
                        }}
                      >
                        <Trash2 className="size-3 text-destructive" />
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Center - Canvas Placeholder */}
        <div className="flex-1 flex items-center justify-center bg-muted/30 p-8">
          <div
            className="relative bg-background border rounded-lg shadow-lg overflow-hidden"
            style={{ width: 405, height: 720 }}
          >
            {/* Background Image */}
            {currentSlide?.backgroundImageUrl ? (
              <img
                src={currentSlide.backgroundImageUrl}
                alt=""
                className="absolute inset-0 size-full object-cover"
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center bg-muted">
                <div className="text-center text-muted-foreground">
                  <ImageIcon className="size-8 mx-auto mb-2" />
                  <p className="text-xs">No background image</p>
                </div>
              </div>
            )}

            {/* Text Boxes Preview */}
            {currentSlide?.textBoxes.map((textBox) => (
              <div
                key={textBox.id}
                className={`absolute cursor-pointer transition-all ${
                  selectedTextBoxId === textBox.id ? 'ring-2 ring-primary' : ''
                }`}
                style={{
                  left: `${textBox.x}%`,
                  top: `${textBox.y}%`,
                  transform: 'translate(-50%, -50%)',
                  fontSize: textBox.fontSize * 0.375, // Scale for 405px preview
                  fontFamily: textBox.fontFamily,
                  color: textBox.color,
                  backgroundColor: textBox.backgroundColor || 'transparent',
                  padding: textBox.backgroundColor ? '4px 8px' : 0,
                  borderRadius: textBox.backgroundColor ? '4px' : 0,
                  textAlign: textBox.textAlign,
                  maxWidth: '90%',
                }}
                onClick={() => setSelectedTextBoxId(textBox.id)}
              >
                {textBox.defaultText}
              </div>
            ))}

            {/* Canvas Placeholder Overlay */}
            <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 hover:opacity-100 transition-opacity">
              <div className="text-center text-white">
                <Settings className="size-6 mx-auto mb-2" />
                <p className="text-xs">Fabric.js Editor</p>
                <p className="text-[10px] text-white/70">Coming in Phase 2</p>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel - Properties */}
        <div className="w-64 border-l flex flex-col">
          <div className="p-3 border-b">
            <span className="text-xs font-medium text-muted-foreground">Properties</span>
          </div>
          <ScrollArea className="flex-1">
            <div className="p-3 space-y-4">
              {selectedTextBox ? (
                <>
                  {/* Text Box Properties */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <Type className="size-3.5" />
                      Text Box
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Text</Label>
                      <Input
                        value={selectedTextBox.defaultText}
                        onChange={(e) =>
                          handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                            defaultText: e.target.value,
                          })
                        }
                        className="h-8 text-sm"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Variable Name</Label>
                      <Input
                        value={selectedTextBox.variableName}
                        onChange={(e) =>
                          handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                            variableName: e.target.value,
                          })
                        }
                        className="h-8 text-sm font-mono"
                        placeholder="headline"
                      />
                      <p className="text-[10px] text-muted-foreground">
                        AI will substitute this when generating slideshows
                      </p>
                    </div>

                    <Separator />

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">X Position</Label>
                        <Input
                          type="number"
                          value={selectedTextBox.x}
                          onChange={(e) =>
                            handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                              x: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 text-sm"
                          min={0}
                          max={100}
                        />
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Y Position</Label>
                        <Input
                          type="number"
                          value={selectedTextBox.y}
                          onChange={(e) =>
                            handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                              y: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="h-8 text-sm"
                          min={0}
                          max={100}
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Font Size</Label>
                      <Input
                        type="number"
                        value={selectedTextBox.fontSize}
                        onChange={(e) =>
                          handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                            fontSize: parseInt(e.target.value) || 24,
                          })
                        }
                        className="h-8 text-sm"
                        min={8}
                        max={200}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <Label className="text-xs">Text Color</Label>
                        <div className="flex gap-1">
                          <Input
                            type="color"
                            value={selectedTextBox.color}
                            onChange={(e) =>
                              handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                                color: e.target.value,
                              })
                            }
                            className="h-8 w-10 p-1"
                          />
                          <Input
                            value={selectedTextBox.color}
                            onChange={(e) =>
                              handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                                color: e.target.value,
                              })
                            }
                            className="h-8 text-xs flex-1"
                          />
                        </div>
                      </div>
                      <div className="space-y-1">
                        <Label className="text-xs">Background</Label>
                        <div className="flex gap-1">
                          <Input
                            type="color"
                            value={selectedTextBox.backgroundColor || '#000000'}
                            onChange={(e) =>
                              handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                                backgroundColor: e.target.value,
                              })
                            }
                            className="h-8 w-10 p-1"
                          />
                          <Button
                            variant={selectedTextBox.backgroundColor ? 'outline' : 'secondary'}
                            size="sm"
                            className="h-8 text-xs flex-1"
                            onClick={() =>
                              handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                                backgroundColor: selectedTextBox.backgroundColor ? null : '#000000',
                              })
                            }
                          >
                            {selectedTextBox.backgroundColor ? 'Clear' : 'None'}
                          </Button>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Text Align</Label>
                      <div className="flex gap-1">
                        {(['left', 'center', 'right'] as const).map((align) => (
                          <Button
                            key={align}
                            variant={selectedTextBox.textAlign === align ? 'default' : 'outline'}
                            size="sm"
                            className="flex-1 h-8 text-xs capitalize"
                            onClick={() =>
                              handleUpdateTextBox(currentSlide.id, selectedTextBox.id, {
                                textAlign: align,
                              })
                            }
                          >
                            {align}
                          </Button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : currentSlide ? (
                <>
                  {/* Slide Properties */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                      <ImageIcon className="size-3.5" />
                      Slide {selectedSlideIndex + 1}
                    </div>

                    <div className="space-y-2">
                      <Label className="text-xs">Background Image</Label>
                      {currentSlide.backgroundImageUrl ? (
                        <div className="relative aspect-video rounded overflow-hidden bg-muted">
                          <img
                            src={currentSlide.backgroundImageUrl}
                            alt=""
                            className="size-full object-cover"
                          />
                        </div>
                      ) : (
                        <div className="aspect-video rounded bg-muted flex items-center justify-center">
                          <p className="text-xs text-muted-foreground">No image</p>
                        </div>
                      )}
                      <p className="text-[10px] text-muted-foreground">
                        {currentSlide.backgroundCollectionId
                          ? 'Linked to collection'
                          : 'No collection linked'}
                      </p>
                    </div>

                    <Separator />

                    <div className="space-y-2">
                      <Label className="text-xs">
                        Text Boxes ({currentSlide.textBoxes.length})
                      </Label>
                      <div className="space-y-1">
                        {currentSlide.textBoxes.map((tb) => (
                          <button
                            key={tb.id}
                            onClick={() => setSelectedTextBoxId(tb.id)}
                            className={`w-full text-left p-2 rounded text-xs transition-colors ${
                              selectedTextBoxId === tb.id
                                ? 'bg-primary/10 text-primary'
                                : 'hover:bg-accent'
                            }`}
                          >
                            <div className="font-medium truncate">{tb.defaultText}</div>
                            <div className="text-muted-foreground text-[10px]">
                              {tb.variableName}
                            </div>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                </>
              ) : (
                <div className="text-center text-muted-foreground py-8">
                  <p className="text-xs">Select a slide or text box</p>
                </div>
              )}
            </div>
          </ScrollArea>
        </div>
      </div>
    </div>
  );
}
