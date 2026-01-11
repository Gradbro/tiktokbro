'use client';

import { useEffect, useRef, useCallback } from 'react';
import * as fabric from 'fabric';
import { TikTokText } from '@/lib/fabric/TikTokText';
import {
  loadImageWithProxy,
  fitImageToCover,
  percentToPixels,
  pixelsToPercent,
} from '@/lib/fabric/utils';
import {
  PREVIEW_WIDTH,
  PREVIEW_HEIGHT,
  EXPORT_WIDTH,
  DEFAULT_TEXT_PROPS,
  DEFAULT_BACKGROUND_COLOR,
  SELECTION_STYLE,
} from './constants';
import type { FabricCanvasProps, SelectedObjectInfo } from './types';

// Extended Fabric object type with data property
type FabricObjectWithData = fabric.FabricObject & {
  data?: Record<string, unknown>;
};

interface UseFabricCanvasOptions {
  onSelectionChange?: (selection: SelectedObjectInfo) => void;
  onCanvasChange?: (slideData: FabricCanvasProps['slide']) => void;
}

export function useFabricCanvas(options: UseFabricCanvasOptions = {}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const fabricRef = useRef<fabric.Canvas | null>(null);
  const backgroundImageRef = useRef<fabric.FabricImage | null>(null);
  const currentSlideRef = useRef<FabricCanvasProps['slide'] | null>(null);

  /**
   * Initialize the Fabric.js canvas
   */
  const initCanvas = useCallback((canvasElement: HTMLCanvasElement) => {
    if (fabricRef.current) {
      fabricRef.current.dispose();
    }

    const canvas = new fabric.Canvas(canvasElement, {
      width: PREVIEW_WIDTH,
      height: PREVIEW_HEIGHT,
      backgroundColor: DEFAULT_BACKGROUND_COLOR,
      selection: true,
      preserveObjectStacking: true,
    });

    // Set default selection style for all objects
    fabric.FabricObject.prototype.set({
      ...SELECTION_STYLE,
    });

    // Listen for selection changes
    canvas.on('selection:created', handleSelectionChange);
    canvas.on('selection:updated', handleSelectionChange);
    canvas.on('selection:cleared', handleSelectionCleared);

    // Listen for object modifications
    canvas.on('object:modified', handleObjectModified);
    canvas.on('object:moving', handleObjectMoving);

    fabricRef.current = canvas;
    return canvas;
  }, []);

  /**
   * Handle selection change events
   */
  const handleSelectionChange = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject() as FabricObjectWithData | undefined;
    if (!activeObject) {
      options.onSelectionChange?.({
        type: 'none',
        object: null,
        id: null,
      });
      return;
    }

    const objectData = activeObject.data;
    const id = (objectData?.id as string) || null;

    let type: SelectedObjectInfo['type'] = 'none';
    if (activeObject instanceof TikTokText || activeObject instanceof fabric.IText) {
      type = 'text';
    } else if (activeObject instanceof fabric.FabricImage) {
      type = objectData?.isBackground ? 'background' : 'image';
    }

    options.onSelectionChange?.({
      type,
      object: activeObject,
      id,
    });
  }, [options]);

  /**
   * Handle selection cleared
   */
  const handleSelectionCleared = useCallback(() => {
    options.onSelectionChange?.({
      type: 'none',
      object: null,
      id: null,
    });
  }, [options]);

  /**
   * Handle object modified (after drag/resize/rotate)
   */
  const handleObjectModified = useCallback(() => {
    notifyCanvasChange();
  }, []);

  /**
   * Handle object moving (during drag)
   */
  const handleObjectMoving = useCallback(() => {
    // Could add snapping logic here in the future
  }, []);

  /**
   * Notify parent of canvas changes
   */
  const notifyCanvasChange = useCallback(() => {
    if (!currentSlideRef.current) return;

    const slideData = toSlideData();
    if (slideData) {
      options.onCanvasChange?.(slideData);
    }
  }, [options]);

  /**
   * Load a slide's data into the canvas
   */
  const loadFromSlide = useCallback(async (slide: FabricCanvasProps['slide']) => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    currentSlideRef.current = slide;

    // Clear existing objects except background
    canvas.getObjects().forEach((obj) => {
      const objWithData = obj as FabricObjectWithData;
      if (!objWithData.data?.isBackground) {
        canvas.remove(obj);
      }
    });

    // Load background image
    if (slide.backgroundImageUrl) {
      try {
        const bgImage = await loadImageWithProxy(slide.backgroundImageUrl);
        const bgImageWithData = bgImage as FabricObjectWithData;
        bgImage.set({
          selectable: false,
          evented: false,
        });
        bgImageWithData.data = { isBackground: true, originalSrc: slide.backgroundImageUrl };
        fitImageToCover(bgImage, PREVIEW_WIDTH, PREVIEW_HEIGHT);

        // Remove old background if exists
        if (backgroundImageRef.current) {
          canvas.remove(backgroundImageRef.current);
        }

        canvas.add(bgImage);
        canvas.sendObjectToBack(bgImage);
        backgroundImageRef.current = bgImage;
      } catch (error) {
        console.error('Failed to load background image:', error);
      }
    }

    // Add text boxes
    for (const textBox of slide.textBoxes) {
      const text = new TikTokText(textBox.defaultText, {
        left: percentToPixels(textBox.x, PREVIEW_WIDTH),
        top: percentToPixels(textBox.y, PREVIEW_HEIGHT),
        fontSize: textBox.fontSize,
        fontFamily: textBox.fontFamily,
        fill: textBox.color,
        customBackgroundColor: textBox.backgroundColor,
        textAlign: textBox.textAlign,
        fontWeight: DEFAULT_TEXT_PROPS.fontWeight,
        lineHeight: DEFAULT_TEXT_PROPS.lineHeight,
        originX: textBox.textAlign === 'center' ? 'center' : 'left',
        originY: 'top',
        data: {
          id: textBox.id,
          variableName: textBox.variableName,
        },
        ...SELECTION_STYLE,
      });

      canvas.add(text);
    }

    canvas.renderAll();
  }, []);

  /**
   * Convert current canvas state to slide data format
   */
  const toSlideData = useCallback((): FabricCanvasProps['slide'] | null => {
    const canvas = fabricRef.current;
    const currentSlide = currentSlideRef.current;
    if (!canvas || !currentSlide) return null;

    const textBoxes: FabricCanvasProps['slide']['textBoxes'] = [];

    canvas.getObjects().forEach((obj) => {
      const objWithData = obj as FabricObjectWithData;
      const objData = objWithData.data;

      // Skip background
      if (objData?.isBackground) return;

      // Handle text objects
      if (obj instanceof TikTokText || obj instanceof fabric.IText) {
        const textObj = obj as TikTokText;
        const left = obj.left || 0;
        const top = obj.top || 0;

        textBoxes.push({
          id: (objData?.id as string) || `text-${Date.now()}`,
          defaultText: textObj.text || '',
          variableName: (objData?.variableName as string) || '',
          x: pixelsToPercent(left, PREVIEW_WIDTH),
          y: pixelsToPercent(top, PREVIEW_HEIGHT),
          fontSize: textObj.fontSize || DEFAULT_TEXT_PROPS.fontSize,
          fontFamily: textObj.fontFamily || DEFAULT_TEXT_PROPS.fontFamily,
          color: (textObj.fill as string) || DEFAULT_TEXT_PROPS.fill,
          backgroundColor: textObj.customBackgroundColor || null,
          textAlign:
            (textObj.textAlign as 'left' | 'center' | 'right') || DEFAULT_TEXT_PROPS.textAlign,
        });
      }
    });

    return {
      ...currentSlide,
      textBoxes,
    };
  }, []);

  /**
   * Add a new text object to the canvas
   */
  const addText = useCallback(
    (text: string = 'New Text', customProps: Partial<fabric.ITextProps> = {}) => {
      const canvas = fabricRef.current;
      if (!canvas) return null;

      const id = `text-${Date.now()}`;
      const textObj = new TikTokText(text, {
        left: PREVIEW_WIDTH / 2,
        top: PREVIEW_HEIGHT / 2,
        originX: 'center',
        originY: 'center',
        ...DEFAULT_TEXT_PROPS,
        ...customProps,
        data: {
          id,
          variableName: '',
        },
        ...SELECTION_STYLE,
      });

      canvas.add(textObj);
      canvas.setActiveObject(textObj);
      canvas.renderAll();
      notifyCanvasChange();

      return textObj;
    },
    [notifyCanvasChange]
  );

  /**
   * Add an image to the canvas
   */
  const addImage = useCallback(
    async (url: string, fitToCanvas: boolean = false) => {
      const canvas = fabricRef.current;
      if (!canvas) return null;

      try {
        const image = await loadImageWithProxy(url);
        const imageWithData = image as FabricObjectWithData;
        const id = `image-${Date.now()}`;

        imageWithData.data = {
          id,
          originalSrc: url,
        };
        image.set({
          ...SELECTION_STYLE,
        });

        if (fitToCanvas) {
          fitImageToCover(image, PREVIEW_WIDTH, PREVIEW_HEIGHT);
        } else {
          // Center the image
          image.set({
            left: PREVIEW_WIDTH / 2,
            top: PREVIEW_HEIGHT / 2,
            originX: 'center',
            originY: 'center',
          });

          // Scale down if too large
          const maxDimension = Math.max(image.width || 0, image.height || 0);
          if (maxDimension > PREVIEW_WIDTH * 0.8) {
            const scale = (PREVIEW_WIDTH * 0.8) / maxDimension;
            image.scale(scale);
          }
        }

        canvas.add(image);
        canvas.setActiveObject(image);
        canvas.renderAll();
        notifyCanvasChange();

        return image;
      } catch (error) {
        console.error('Failed to add image:', error);
        return null;
      }
    },
    [notifyCanvasChange]
  );

  /**
   * Update a specific object's properties
   */
  const updateObject = useCallback(
    (objectId: string, props: Record<string, unknown>) => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const obj = canvas.getObjects().find((o) => {
        const objWithData = o as FabricObjectWithData;
        return objWithData.data?.id === objectId;
      });

      if (obj) {
        // Handle special properties for TikTokText
        if (obj instanceof TikTokText) {
          if ('customBackgroundColor' in props) {
            obj.customBackgroundColor = props.customBackgroundColor as string | null;
            delete props.customBackgroundColor;
          }
        }

        obj.set(props as Partial<fabric.FabricObject>);
        canvas.renderAll();
        notifyCanvasChange();
      }
    },
    [notifyCanvasChange]
  );

  /**
   * Delete the currently selected object
   */
  const deleteSelected = useCallback(() => {
    const canvas = fabricRef.current;
    if (!canvas) return;

    const activeObject = canvas.getActiveObject() as FabricObjectWithData | undefined;
    if (!activeObject) return;

    // Don't allow deleting background
    if (activeObject.data?.isBackground) return;

    canvas.remove(activeObject);
    canvas.discardActiveObject();
    canvas.renderAll();
    notifyCanvasChange();
  }, [notifyCanvasChange]);

  /**
   * Export canvas to blob at full resolution
   */
  const exportToBlob = useCallback(async (): Promise<Blob | null> => {
    const canvas = fabricRef.current;
    if (!canvas) return null;

    const multiplier = EXPORT_WIDTH / PREVIEW_WIDTH;

    return new Promise((resolve) => {
      const dataUrl = canvas.toDataURL({
        format: 'png',
        quality: 1,
        multiplier,
      });

      // Convert data URL to blob
      fetch(dataUrl)
        .then((res) => res.blob())
        .then(resolve)
        .catch(() => resolve(null));
    });
  }, []);

  /**
   * Get the active/selected object
   */
  const getActiveObject = useCallback(() => {
    return fabricRef.current?.getActiveObject() || null;
  }, []);

  /**
   * Deselect all objects
   */
  const deselectAll = useCallback(() => {
    fabricRef.current?.discardActiveObject();
    fabricRef.current?.renderAll();
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      if (fabricRef.current) {
        fabricRef.current.dispose();
        fabricRef.current = null;
      }
    };
  }, []);

  return {
    canvasRef,
    fabricRef,
    initCanvas,
    loadFromSlide,
    toSlideData,
    addText,
    addImage,
    updateObject,
    deleteSelected,
    exportToBlob,
    getActiveObject,
    deselectAll,
  };
}
