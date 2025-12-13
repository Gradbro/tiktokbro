'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { GeneratedSlide, TextOverlay } from '@/types';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { Type, Plus, Trash2, Save } from 'lucide-react';
import * as fabric from 'fabric';

interface SlideEditorProps {
  slide: GeneratedSlide;
}

const FONTS = [
  'Arial',
  'Helvetica',
  'Georgia',
  'Times New Roman',
  'Courier New',
  'Impact',
];

const COLORS = [
  '#ffffff',
  '#000000',
  '#ff0000',
  '#00ff00',
  '#0000ff',
  '#ffff00',
  '#ff00ff',
  '#00ffff',
];

export function SlideEditor({ slide }: SlideEditorProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const { updateTextOverlay, updateSlide } = useSlideshowContext();
  const slideIdRef = useRef<string>(slide.id);

  const [textConfig, setTextConfig] = useState<TextOverlay>({
    text: slide.textOverlay?.text || slide.plan.suggestedOverlay || '',
    fontSize: slide.textOverlay?.fontSize || 32,
    fontFamily: slide.textOverlay?.fontFamily || 'Arial',
    color: slide.textOverlay?.color || '#ffffff',
    position: slide.textOverlay?.position || { x: 180, y: 320 },
  });

  const [hasText, setHasText] = useState(false);
  const [isDirty, setIsDirty] = useState(false);

  // Initialize canvas when slide changes
  useEffect(() => {
    if (!canvasRef.current || !slide.imageData) return;

    // Dispose previous canvas if slide changed
    if (fabricRef.current && slideIdRef.current !== slide.id) {
      fabricRef.current.dispose();
      fabricRef.current = null;
    }
    slideIdRef.current = slide.id;

    // Initialize Fabric canvas
    const canvas = new fabric.Canvas(canvasRef.current, {
      width: 360,
      height: 640,
      selection: true,
    });
    fabricRef.current = canvas;

    // Load background image
    const imgUrl = `data:image/png;base64,${slide.imageData}`;
    fabric.FabricImage.fromURL(imgUrl).then((img: fabric.FabricImage) => {
      img.scaleToWidth(360);
      img.scaleToHeight(640);
      canvas.backgroundImage = img;
      canvas.renderAll();
    });

    // Add existing text overlay if present
    if (slide.textOverlay) {
      addTextToCanvas(slide.textOverlay);
      setHasText(true);
      setTextConfig(slide.textOverlay);
    }

    // Listen to canvas events
    canvas.on('object:modified', handleCanvasChange);
    canvas.on('text:changed', handleCanvasChange);
    canvas.on('selection:created', handleSelection);
    canvas.on('selection:updated', handleSelection);

    return () => {
      canvas.off('object:modified', handleCanvasChange);
      canvas.off('text:changed', handleCanvasChange);
      canvas.off('selection:created', handleSelection);
      canvas.off('selection:updated', handleSelection);
      canvas.dispose();
    };
  }, [slide.id, slide.imageData]);

  // Update text config when slide's textOverlay changes
  useEffect(() => {
    if (slide.textOverlay) {
      setTextConfig(slide.textOverlay);
    }
  }, [slide.textOverlay]);

  const handleCanvasChange = useCallback(() => {
    setIsDirty(true);
  }, []);

  const handleSelection = useCallback(() => {
    if (!fabricRef.current) return;
    const activeObject = fabricRef.current.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
      const textObj = activeObject as fabric.IText;
      setTextConfig({
        text: textObj.text || '',
        fontSize: textObj.fontSize || 32,
        fontFamily: textObj.fontFamily || 'Arial',
        color: (textObj.fill as string) || '#ffffff',
        position: {
          x: textObj.left || 0,
          y: textObj.top || 0,
        },
      });
    }
  }, []);

  const addTextToCanvas = (config: TextOverlay) => {
    if (!fabricRef.current) return;

    const text = new fabric.IText(config.text || 'Your Text', {
      left: config.position.x,
      top: config.position.y,
      fontSize: config.fontSize,
      fontFamily: config.fontFamily,
      fill: config.color,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      shadow: new fabric.Shadow({
        color: 'rgba(0,0,0,0.5)',
        blur: 5,
        offsetX: 2,
        offsetY: 2,
      }),
    });

    fabricRef.current.add(text);
    fabricRef.current.setActiveObject(text);
    fabricRef.current.renderAll();
  };

  const handleAddText = () => {
    if (!fabricRef.current) return;

    // Clear existing text objects
    const objects = fabricRef.current.getObjects('i-text');
    objects.forEach((obj) => fabricRef.current?.remove(obj));

    addTextToCanvas({
      ...textConfig,
      position: { x: 180, y: 320 }, // Center of canvas
    });
    setHasText(true);
    setIsDirty(true);
  };

  const handleDeleteText = () => {
    if (!fabricRef.current) return;

    const activeObject = fabricRef.current.getActiveObject();
    if (activeObject) {
      fabricRef.current.remove(activeObject);
      fabricRef.current.renderAll();
      setHasText(fabricRef.current.getObjects('i-text').length > 0);
      setIsDirty(true);

      // Clear the overlay from context
      updateTextOverlay(slide.id, {
        text: '',
        fontSize: 32,
        fontFamily: 'Arial',
        color: '#ffffff',
        position: { x: 180, y: 320 },
      });
    }
  };

  // Apply text config changes to selected object immediately
  const applyConfigToSelected = useCallback((config: Partial<TextOverlay>) => {
    if (!fabricRef.current) return;

    const activeObject = fabricRef.current.getActiveObject();
    if (activeObject && activeObject.type === 'i-text') {
      const textObj = activeObject as fabric.IText;

      if (config.text !== undefined) {
        textObj.set('text', config.text);
      }
      if (config.fontSize !== undefined) {
        textObj.set('fontSize', config.fontSize);
      }
      if (config.fontFamily !== undefined) {
        textObj.set('fontFamily', config.fontFamily);
      }
      if (config.color !== undefined) {
        textObj.set('fill', config.color);
      }

      fabricRef.current.renderAll();
      setIsDirty(true);
    }
  }, []);

  const handleTextChange = (text: string) => {
    setTextConfig((prev) => ({ ...prev, text }));
    applyConfigToSelected({ text });
  };

  const handleFontSizeChange = (fontSize: number) => {
    setTextConfig((prev) => ({ ...prev, fontSize }));
    applyConfigToSelected({ fontSize });
  };

  const handleFontFamilyChange = (fontFamily: string) => {
    setTextConfig((prev) => ({ ...prev, fontFamily }));
    applyConfigToSelected({ fontFamily });
  };

  const handleColorChange = (color: string) => {
    setTextConfig((prev) => ({ ...prev, color }));
    applyConfigToSelected({ color });
  };

  const handleSaveOverlay = () => {
    if (!fabricRef.current) return;

    const textObjects = fabricRef.current.getObjects('i-text');
    if (textObjects.length > 0) {
      const textObj = textObjects[0] as fabric.IText;
      const overlay: TextOverlay = {
        text: textObj.text || '',
        fontSize: textObj.fontSize || 32,
        fontFamily: textObj.fontFamily || 'Arial',
        color: (textObj.fill as string) || '#ffffff',
        position: {
          x: textObj.left || 0,
          y: textObj.top || 0,
        },
      };
      updateTextOverlay(slide.id, overlay);

      // Also save the canvas data URL to the slide for export
      const dataUrl = fabricRef.current.toDataURL({
        multiplier: 2,
        format: 'png',
        quality: 1,
      });
      updateSlide(slide.id, { editedImageData: dataUrl });
    } else {
      // No text, clear overlay
      updateTextOverlay(slide.id, {
        text: '',
        fontSize: 32,
        fontFamily: 'Arial',
        color: '#ffffff',
        position: { x: 180, y: 320 },
      });
    }

    setIsDirty(false);
  };

  if (!slide.imageData) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground">
        No image to edit
      </div>
    );
  }

  return (
    <div className="flex gap-4 h-full p-4">
      {/* Canvas */}
      <div className="flex-1 flex items-center justify-center bg-muted/30 rounded-lg">
        <div className="shadow-xl rounded-lg overflow-hidden">
          <canvas ref={canvasRef} />
        </div>
      </div>

      {/* Controls */}
      <Card className="w-64 shrink-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-sm flex items-center gap-2">
            <Type className="h-4 w-4" />
            Text Overlay
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label className="text-xs">Text</Label>
            <Input
              value={textConfig.text}
              onChange={(e) => handleTextChange(e.target.value)}
              placeholder="Enter text"
            />
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Font Size</Label>
            <Select
              value={textConfig.fontSize.toString()}
              onValueChange={(v) => handleFontSizeChange(parseInt(v))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {[16, 20, 24, 28, 32, 40, 48, 56, 64].map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Font</Label>
            <Select
              value={textConfig.fontFamily}
              onValueChange={handleFontFamilyChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {FONTS.map((font) => (
                  <SelectItem key={font} value={font}>
                    {font}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label className="text-xs">Color</Label>
            <div className="grid grid-cols-4 gap-2">
              {COLORS.map((color) => (
                <button
                  key={color}
                  className={`w-8 h-8 rounded-md border-2 transition-all ${
                    textConfig.color === color
                      ? 'border-primary scale-110'
                      : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  onClick={() => handleColorChange(color)}
                />
              ))}
            </div>
          </div>

          <div className="space-y-2 pt-2">
            {!hasText ? (
              <Button onClick={handleAddText} variant="outline" className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Add Text
              </Button>
            ) : (
              <Button onClick={handleDeleteText} variant="outline" className="w-full text-destructive">
                <Trash2 className="h-4 w-4 mr-2" />
                Remove Text
              </Button>
            )}
            <Button
              onClick={handleSaveOverlay}
              className="w-full"
              disabled={!isDirty}
            >
              <Save className="h-4 w-4 mr-2" />
              {isDirty ? 'Save Changes' : 'Saved'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export function useSlideExport() {
  const exportSlide = (canvas: fabric.Canvas): string => {
    return canvas.toDataURL({
      multiplier: 2,
      format: 'png',
      quality: 1,
    });
  };

  return { exportSlide };
}
