'use client';

import React, {
  useEffect,
  useRef,
  useImperativeHandle,
  forwardRef,
  useCallback,
  useState,
} from 'react';
import * as fabric from 'fabric';
import { cn } from '@/lib/utils';
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
import type {
  FabricCanvasProps,
  SelectedObjectInfo,
  TextObjectProps,
  ImageObjectProps,
  SceneProps,
} from './types';

// Extended Fabric object type with data property
type FabricObjectWithData = fabric.FabricObject & {
  data?: Record<string, unknown>;
};

export interface FabricCanvasRef {
  addText: (text?: string) => void;
  addImage: (url: string, fitToCanvas?: boolean) => Promise<void>;
  deleteSelected: () => void;
  exportToBlob: () => Promise<Blob | null>;
  getSlideData: () => FabricCanvasProps['slide'] | null;
  fitSelectedImage: () => void;
  fitBackgroundImage: () => void;
  setBackgroundImage: (url: string, collectionId?: string) => Promise<void>;
  removeBackgroundImage: () => void;
  replaceSelectedImage: (url: string, collectionId?: string) => Promise<void>;
  updateSelectedText: (props: Partial<TextObjectProps>) => void;
}

export interface FabricCanvasComponentProps extends FabricCanvasProps {
  sceneProps?: SceneProps;
  onSelectionChange?: (selection: SelectedObjectInfo) => void;
  onTextPropsChange?: (props: TextObjectProps | null) => void;
  onImagePropsChange?: (props: ImageObjectProps | null) => void;
}

const FabricCanvas = forwardRef<FabricCanvasRef, FabricCanvasComponentProps>(
  (
    {
      slide,
      sceneProps,
      onSelectionChange,
      onCanvasChange,
      onTextPropsChange,
      onImagePropsChange,
      className,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasElementRef = useRef<HTMLCanvasElement>(null);
    const fabricRef = useRef<fabric.Canvas | null>(null);
    const backgroundImageRef = useRef<fabric.FabricImage | null>(null);
    const currentSlideRef = useRef<FabricCanvasProps['slide'] | null>(null);
    const loadedSlideIdRef = useRef<string | null>(null);
    const [isCanvasReady, setIsCanvasReady] = useState(false);

    // Calculate preview dimensions based on scene props while fitting in max preview area
    const MAX_PREVIEW_HEIGHT = 720;
    const MAX_PREVIEW_WIDTH = 500;

    const getPreviewDimensions = useCallback(() => {
      const sceneWidth = sceneProps?.width || 1080;
      const sceneHeight = sceneProps?.height || 1920;
      const aspectRatio = sceneWidth / sceneHeight;

      // Calculate dimensions that fit within max bounds while preserving aspect ratio
      let previewWidth: number;
      let previewHeight: number;

      if (aspectRatio > MAX_PREVIEW_WIDTH / MAX_PREVIEW_HEIGHT) {
        // Wide aspect ratio - constrain by width
        previewWidth = MAX_PREVIEW_WIDTH;
        previewHeight = previewWidth / aspectRatio;
      } else {
        // Tall aspect ratio - constrain by height
        previewHeight = MAX_PREVIEW_HEIGHT;
        previewWidth = previewHeight * aspectRatio;
      }

      return { previewWidth, previewHeight };
    }, [sceneProps?.width, sceneProps?.height]);

    const { previewWidth, previewHeight } = getPreviewDimensions();

    /**
     * Get text properties from a text object
     */
    const getTextProps = useCallback(
      (obj: fabric.FabricObject): TextObjectProps | null => {
        if (!(obj instanceof TikTokText) && !('text' in obj)) {
          return null;
        }

        const textObj = obj as TikTokText;
        const objWithData = obj as FabricObjectWithData;
        const data = objWithData.data;

        return {
          id: (data?.id as string) || '',
          text: textObj.text || '',
          left: pixelsToPercent(obj.left || 0, previewWidth),
          top: pixelsToPercent(obj.top || 0, previewHeight),
          width: (obj.width || 0) * (obj.scaleX || 1),
          height: (obj.height || 0) * (obj.scaleY || 1),
          fontSize: textObj.fontSize || DEFAULT_TEXT_PROPS.fontSize,
          fontFamily: textObj.fontFamily || DEFAULT_TEXT_PROPS.fontFamily,
          fontWeight: (textObj.fontWeight as string) || 'normal',
          fill: (textObj.fill as string) || DEFAULT_TEXT_PROPS.fill,
          stroke: (textObj.stroke as string) || null,
          strokeWidth: textObj.strokeWidth || 0,
          customBackgroundColor: textObj.customBackgroundColor || null,
          textAlign:
            (textObj.textAlign as 'left' | 'center' | 'right') || DEFAULT_TEXT_PROPS.textAlign,
          verticalAlign: textObj.verticalAlign || 'middle',
          letterSpacing: 0,
          variableName: (data?.variableName as string) || '',
        };
      },
      [previewWidth, previewHeight]
    );

    /**
     * Get image properties from an image object
     */
    const getImageProps = useCallback((obj: fabric.FabricObject): ImageObjectProps | null => {
      if (!('_element' in obj)) {
        return null;
      }

      const imgObj = obj as fabric.FabricImage;
      const objWithData = obj as FabricObjectWithData;
      const data = objWithData.data;

      return {
        id: (data?.id as string) || '',
        left: pixelsToPercent(obj.left || 0, PREVIEW_WIDTH),
        top: pixelsToPercent(obj.top || 0, PREVIEW_HEIGHT),
        width: (obj.width || 0) * (obj.scaleX || 1),
        height: (obj.height || 0) * (obj.scaleY || 1),
        scaleX: obj.scaleX || 1,
        scaleY: obj.scaleY || 1,
        angle: obj.angle || 0,
        src: (data?.originalSrc as string) || imgObj.getSrc() || '',
        collectionId: data?.collectionId as string | undefined,
      };
    }, []);

    /**
     * Handle selection changes and notify parent
     */
    const handleSelectionUpdate = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const activeObject = canvas.getActiveObject() as FabricObjectWithData | undefined;

      if (!activeObject) {
        onSelectionChange?.({ type: 'none', object: null, id: null });
        onTextPropsChange?.(null);
        onImagePropsChange?.(null);
        return;
      }

      const data = activeObject.data;
      const id = (data?.id as string) || null;

      // Determine type
      let type: SelectedObjectInfo['type'] = 'none';
      if (activeObject instanceof TikTokText || 'text' in activeObject) {
        type = 'text';
      } else if ('_element' in activeObject) {
        // Both background images and regular images have _element
        type = data?.isBackground ? 'background' : 'image';
      }

      onSelectionChange?.({ type, object: activeObject, id });

      // Update props based on type
      if (type === 'text') {
        onTextPropsChange?.(getTextProps(activeObject));
        onImagePropsChange?.(null);
      } else if (type === 'image' || type === 'background') {
        // Show image properties for both regular images and background
        onTextPropsChange?.(null);
        onImagePropsChange?.(getImageProps(activeObject));
      } else {
        onTextPropsChange?.(null);
        onImagePropsChange?.(null);
      }
    }, [onSelectionChange, onTextPropsChange, onImagePropsChange, getTextProps, getImageProps]);

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
            x: pixelsToPercent(left, previewWidth),
            y: pixelsToPercent(top, previewHeight),
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
    }, [previewWidth, previewHeight]);

    /**
     * Notify parent of canvas changes
     */
    const notifyCanvasChange = useCallback(() => {
      if (!currentSlideRef.current) return;
      const slideData = toSlideData();
      if (slideData) {
        onCanvasChange?.(slideData);
      }
    }, [onCanvasChange, toSlideData]);

    /**
     * Load a slide's data into the canvas
     */
    const loadFromSlide = useCallback(
      async (slideData: FabricCanvasProps['slide']) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        currentSlideRef.current = slideData;

        // Clear existing objects
        canvas.clear();
        backgroundImageRef.current = null;

        // Use slide's backgroundColor or default
        canvas.backgroundColor = slideData.backgroundColor || DEFAULT_BACKGROUND_COLOR;

        // Load background image
        if (slideData.backgroundImageUrl) {
          try {
            const bgImage = await loadImageWithProxy(slideData.backgroundImageUrl);
            const bgImageWithData = bgImage as FabricObjectWithData;
            // Make background selectable but with limited controls (no resize/rotate)
            bgImage.set({
              selectable: true,
              evented: true,
              hasControls: true,
              hasBorders: true,
              lockMovementX: false,
              lockMovementY: false,
              ...SELECTION_STYLE,
            });
            bgImageWithData.data = {
              isBackground: true,
              originalSrc: slideData.backgroundImageUrl,
            };
            fitImageToCover(bgImage, previewWidth, previewHeight);

            canvas.add(bgImage);
            canvas.sendObjectToBack(bgImage);
            backgroundImageRef.current = bgImage;
          } catch (error) {
            console.error('Failed to load background image:', error);
          }
        }

        // Add text boxes
        for (const textBox of slideData.textBoxes) {
          const text = new TikTokText(textBox.defaultText, {
            left: percentToPixels(textBox.x, previewWidth),
            top: percentToPixels(textBox.y, previewHeight),
            fontSize: textBox.fontSize,
            fontFamily: textBox.fontFamily,
            fill: textBox.color,
            customBackgroundColor: textBox.backgroundColor,
            textAlign: textBox.textAlign,
            fontWeight: DEFAULT_TEXT_PROPS.fontWeight,
            lineHeight: DEFAULT_TEXT_PROPS.lineHeight,
            originX: 'left',
            originY: 'top',
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            ...SELECTION_STYLE,
          });

          // Hide top and bottom resize controls - only keep side controls
          text.setControlsVisibility({
            mt: false, // middle top
            mb: false, // middle bottom
          });

          // Set data property after creation
          (text as FabricObjectWithData).data = {
            id: textBox.id,
            variableName: textBox.variableName,
          };

          canvas.add(text);

          // Debug: Log text object properties
          console.log('Added text object:', {
            id: textBox.id,
            text: textBox.defaultText,
            selectable: text.selectable,
            evented: text.evented,
            hasControls: text.hasControls,
            left: text.left,
            top: text.top,
          });
        }

        canvas.renderAll();

        // Debug: Log final canvas state
        console.log('Canvas loaded:', {
          objectCount: canvas.getObjects().length,
          objects: canvas.getObjects().map((obj) => ({
            type: obj.type,
            selectable: obj.selectable,
            evented: obj.evented,
          })),
        });
      },
      [previewWidth, previewHeight]
    );

    /**
     * Add a new text object to the canvas
     */
    const addText = useCallback(
      (text: string = 'New Text') => {
        const canvas = fabricRef.current;
        if (!canvas) return null;

        const id = `text-${Date.now()}`;
        const textObj = new TikTokText(text, {
          left: previewWidth / 2 - 100,
          top: previewHeight / 2 - 30,
          originX: 'left',
          originY: 'top',
          selectable: true,
          evented: true,
          hasControls: true,
          hasBorders: true,
          ...DEFAULT_TEXT_PROPS,
          ...SELECTION_STYLE,
        });

        // Hide top and bottom resize controls - only keep side controls
        textObj.setControlsVisibility({
          mt: false, // middle top
          mb: false, // middle bottom
        });

        // Set data property
        (textObj as FabricObjectWithData).data = {
          id,
          variableName: '',
        };

        canvas.add(textObj);
        canvas.setActiveObject(textObj);
        canvas.renderAll();
        notifyCanvasChange();
        handleSelectionUpdate();

        return textObj;
      },
      [previewWidth, previewHeight, notifyCanvasChange, handleSelectionUpdate]
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
            fitImageToCover(image, previewWidth, previewHeight);
          } else {
            // Center the image
            image.set({
              left: previewWidth / 2,
              top: previewHeight / 2,
              originX: 'center',
              originY: 'center',
            });

            // Scale down if too large
            const maxDimension = Math.max(image.width || 0, image.height || 0);
            if (maxDimension > previewWidth * 0.8) {
              const scale = (previewWidth * 0.8) / maxDimension;
              image.scale(scale);
            }
          }

          canvas.add(image);
          canvas.setActiveObject(image);
          canvas.renderAll();
          notifyCanvasChange();
          handleSelectionUpdate();

          return image;
        } catch (error) {
          console.error('Failed to add image:', error);
          return null;
        }
      },
      [previewWidth, previewHeight, notifyCanvasChange, handleSelectionUpdate]
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
      handleSelectionUpdate();
    }, [notifyCanvasChange, handleSelectionUpdate]);

    /**
     * Fit the currently selected image to fill the canvas
     */
    const fitSelectedImage = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas) return;

      const activeObject = canvas.getActiveObject();
      if (!activeObject || !('_element' in activeObject)) return;

      const image = activeObject as fabric.FabricImage;
      fitImageToCover(image, previewWidth, previewHeight);
      canvas.renderAll();
      notifyCanvasChange();
      handleSelectionUpdate();
    }, [previewWidth, previewHeight, notifyCanvasChange, handleSelectionUpdate]);

    /**
     * Fit the background image to fill the canvas (regardless of selection)
     */
    const fitBackgroundImage = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas || !backgroundImageRef.current) return;

      fitImageToCover(backgroundImageRef.current, previewWidth, previewHeight);
      canvas.renderAll();
      notifyCanvasChange();
    }, [previewWidth, previewHeight, notifyCanvasChange]);

    /**
     * Remove the background image from the canvas
     */
    const removeBackgroundImage = useCallback(() => {
      const canvas = fabricRef.current;
      if (!canvas || !backgroundImageRef.current) return;

      canvas.remove(backgroundImageRef.current);
      backgroundImageRef.current = null;
      canvas.discardActiveObject();
      canvas.renderAll();
      notifyCanvasChange();
      handleSelectionUpdate();
    }, [notifyCanvasChange, handleSelectionUpdate]);

    /**
     * Set or replace the background image
     */
    const setBackgroundImage = useCallback(
      async (url: string, collectionId?: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        try {
          // Load the new image
          const newImage = await loadImageWithProxy(url);
          if (!newImage) return;

          // Remove existing background image if any
          if (backgroundImageRef.current) {
            canvas.remove(backgroundImageRef.current);
          }

          // Set up the new background image
          const imageWithData = newImage as FabricObjectWithData;
          newImage.set({
            selectable: true,
            evented: true,
            hasControls: true,
            hasBorders: true,
            lockMovementX: false,
            lockMovementY: false,
            ...SELECTION_STYLE,
          });
          imageWithData.data = {
            isBackground: true,
            originalSrc: url,
            ...(collectionId && { collectionId }),
          };

          // Fit to canvas
          fitImageToCover(newImage, previewWidth, previewHeight);

          // Add to canvas and send to back
          canvas.add(newImage);
          canvas.sendObjectToBack(newImage);
          backgroundImageRef.current = newImage;

          canvas.renderAll();
          notifyCanvasChange();
          handleSelectionUpdate();
        } catch (error) {
          console.error('Failed to set background image:', error);
        }
      },
      [previewWidth, previewHeight, notifyCanvasChange, handleSelectionUpdate]
    );

    /**
     * Replace the selected image with a new one from a URL
     */
    const replaceSelectedImage = useCallback(
      async (url: string, collectionId?: string) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject() as FabricObjectWithData | undefined;
        if (!activeObject || !('_element' in activeObject)) return;

        try {
          const image = await loadImageWithProxy(url);
          if (!image) return;

          const currentObj = activeObject as fabric.FabricImage & FabricObjectWithData;

          // Update the image source
          currentObj.setElement(image.getElement());

          // Update data
          currentObj.data = {
            ...currentObj.data,
            originalSrc: url,
            ...(collectionId && { collectionId }),
          };

          canvas.renderAll();
          notifyCanvasChange();
          handleSelectionUpdate();
        } catch (error) {
          console.error('Failed to replace image:', error);
        }
      },
      [notifyCanvasChange, handleSelectionUpdate]
    );

    /**
     * Update the currently selected text object's properties
     */
    const updateSelectedText = useCallback(
      (props: Partial<TextObjectProps>) => {
        const canvas = fabricRef.current;
        if (!canvas) return;

        const activeObject = canvas.getActiveObject();
        if (!activeObject || !(activeObject instanceof TikTokText)) return;

        const textObj = activeObject as TikTokText;

        // Map TextObjectProps to fabric properties
        if (props.text !== undefined) {
          textObj.set('text', props.text);
        }
        if (props.left !== undefined) {
          textObj.set('left', percentToPixels(props.left, previewWidth));
        }
        if (props.top !== undefined) {
          textObj.set('top', percentToPixels(props.top, previewHeight));
        }
        if (props.fontSize !== undefined) {
          textObj.set('fontSize', props.fontSize);
          // Adjust stroke width proportionally - 15% of font size for thick visible outline
          if (textObj.stroke) {
            textObj.set('strokeWidth', Math.max(4, Math.round(props.fontSize * 0.15)));
          }
        }
        if (props.fontFamily !== undefined) {
          textObj.set('fontFamily', props.fontFamily);
        }
        if (props.fontWeight !== undefined) {
          textObj.set('fontWeight', props.fontWeight);
        }
        if (props.fill !== undefined) {
          textObj.set('fill', props.fill);
        }
        if (props.stroke !== undefined) {
          textObj.set('stroke', props.stroke);
          // Set thick stroke when enabling - 15% of font size
          if (props.stroke) {
            const strokeW = Math.max(4, Math.round((textObj.fontSize || 48) * 0.15));
            textObj.set('strokeWidth', strokeW);
            textObj.set('strokeLineJoin', 'round');
            textObj.set('strokeLineCap', 'round');
            textObj.set('paintFirst', 'stroke');
          } else {
            textObj.set('strokeWidth', 0);
          }
        }
        if (props.strokeWidth !== undefined) {
          textObj.set('strokeWidth', props.strokeWidth);
        }
        if (props.customBackgroundColor !== undefined) {
          textObj.customBackgroundColor = props.customBackgroundColor;
        }
        if (props.textAlign !== undefined) {
          textObj.set('textAlign', props.textAlign);
        }
        if (props.letterSpacing !== undefined) {
          textObj.set('charSpacing', props.letterSpacing * 10); // Fabric uses charSpacing in units of 1/1000 em
        }
        if (props.verticalAlign !== undefined) {
          textObj.verticalAlign = props.verticalAlign;
          // Calculate new top position based on vertical alignment
          // Use getBoundingRect for accurate height including any transformations
          const objHeight = textObj.getScaledHeight();
          const margin = previewHeight * 0.05; // 5% margin from edges
          switch (props.verticalAlign) {
            case 'top':
              textObj.set('top', margin);
              break;
            case 'middle':
              textObj.set('top', (previewHeight - objHeight) / 2);
              break;
            case 'bottom':
              textObj.set('top', previewHeight - margin - objHeight);
              break;
          }
        }

        canvas.renderAll();
        notifyCanvasChange();
        handleSelectionUpdate();
      },
      [previewWidth, previewHeight, notifyCanvasChange, handleSelectionUpdate]
    );

    /**
     * Export canvas to blob at full resolution
     */
    const exportToBlob = useCallback(async (): Promise<Blob | null> => {
      const canvas = fabricRef.current;
      if (!canvas) return null;

      // Export at scene dimensions (not preview dimensions)
      const exportWidth = sceneProps?.width || 1080;
      const multiplier = exportWidth / previewWidth;

      return new Promise((resolve) => {
        const dataUrl = canvas.toDataURL({
          format: 'png',
          quality: 1,
          multiplier,
        });

        fetch(dataUrl)
          .then((res) => res.blob())
          .then(resolve)
          .catch(() => resolve(null));
      });
    }, [previewWidth, sceneProps?.width]);

    // Initialize canvas on mount
    useEffect(() => {
      if (!canvasElementRef.current || fabricRef.current) return;

      const canvas = new fabric.Canvas(canvasElementRef.current, {
        width: previewWidth,
        height: previewHeight,
        backgroundColor: sceneProps?.backgroundColor || DEFAULT_BACKGROUND_COLOR,
        selection: true,
        preserveObjectStacking: true,
        // Ensure interactivity
        renderOnAddRemove: true,
        // Allow objects to be moved/selected even when partially outside canvas
        controlsAboveOverlay: true,
      });

      // Set default selection style for all objects
      fabric.FabricObject.prototype.set({
        ...SELECTION_STYLE,
        selectable: true,
        evented: true,
        hasControls: true,
        hasBorders: true,
      });

      // Debug: log canvas creation
      console.log('Canvas initialized:', {
        width: canvas.width,
        height: canvas.height,
        selection: canvas.selection,
        wrapperEl: canvas.wrapperEl,
        upperCanvasEl: canvas.upperCanvasEl,
      });

      fabricRef.current = canvas;
      setIsCanvasReady(true);

      return () => {
        canvas.dispose();
        fabricRef.current = null;
      };
    }, []);

    // Set up event listeners after canvas is ready
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas || !isCanvasReady) return;

      const onSelectionCreated = () => {
        console.log('selection:created', canvas.getActiveObject());
        handleSelectionUpdate();
      };
      const onSelectionUpdated = () => {
        console.log('selection:updated', canvas.getActiveObject());
        handleSelectionUpdate();
      };
      const onSelectionCleared = () => {
        console.log('selection:cleared');
        handleSelectionUpdate();
      };
      const onObjectModified = () => {
        console.log('object:modified', canvas.getActiveObject());
        handleSelectionUpdate();
        notifyCanvasChange();
      };
      const onMouseDown = (e: fabric.TPointerEventInfo<fabric.TPointerEvent>) => {
        console.log('mouse:down', {
          target: e.target,
          pointer: e.scenePoint,
        });
      };

      canvas.on('selection:created', onSelectionCreated);
      canvas.on('selection:updated', onSelectionUpdated);
      canvas.on('selection:cleared', onSelectionCleared);
      canvas.on('object:modified', onObjectModified);
      canvas.on('mouse:down', onMouseDown);

      return () => {
        canvas.off('selection:created', onSelectionCreated);
        canvas.off('selection:updated', onSelectionUpdated);
        canvas.off('selection:cleared', onSelectionCleared);
        canvas.off('object:modified', onObjectModified);
        canvas.off('mouse:down', onMouseDown);
      };
    }, [isCanvasReady, handleSelectionUpdate, notifyCanvasChange]);

    // Load slide data when slide ID changes or canvas becomes ready
    // IMPORTANT: Only reload when the slide ID changes, not on every prop reference change
    // This prevents the canvas from being cleared when user interacts with objects
    useEffect(() => {
      if (isCanvasReady && slide && slide.id !== loadedSlideIdRef.current) {
        console.log('Loading slide:', slide.id, '(previous:', loadedSlideIdRef.current, ')');
        loadedSlideIdRef.current = slide.id;
        loadFromSlide(slide);
      }
    }, [isCanvasReady, slide?.id, loadFromSlide]);

    // React to sceneProps changes (dimensions and background color)
    useEffect(() => {
      const canvas = fabricRef.current;
      if (!canvas || !isCanvasReady) return;

      // Update canvas dimensions based on new preview size
      const currentWidth = canvas.width || previewWidth;
      const currentHeight = canvas.height || previewHeight;

      if (
        Math.abs(previewWidth - currentWidth) > 1 ||
        Math.abs(previewHeight - currentHeight) > 1
      ) {
        console.log('Resizing canvas:', {
          from: { currentWidth, currentHeight },
          to: { previewWidth, previewHeight },
        });
        canvas.setDimensions({ width: previewWidth, height: previewHeight });

        // Re-fit background image if it exists
        if (backgroundImageRef.current) {
          fitImageToCover(backgroundImageRef.current, previewWidth, previewHeight);
        }

        canvas.renderAll();
      }

      // Update background color
      if (sceneProps?.backgroundColor) {
        canvas.backgroundColor = sceneProps.backgroundColor;
        canvas.renderAll();
      }
    }, [isCanvasReady, previewWidth, previewHeight, sceneProps?.backgroundColor]);

    // Handle keyboard shortcuts
    const handleKeyDown = useCallback(
      (e: KeyboardEvent) => {
        if (!containerRef.current?.contains(document.activeElement)) return;

        if (e.key === 'Delete' || e.key === 'Backspace') {
          const activeObj = fabricRef.current?.getActiveObject();
          if (activeObj && 'isEditing' in activeObj && activeObj.isEditing) return;
          e.preventDefault();
          deleteSelected();
        }

        if (e.key === 'Escape') {
          fabricRef.current?.discardActiveObject();
          fabricRef.current?.renderAll();
          handleSelectionUpdate();
        }
      },
      [deleteSelected, handleSelectionUpdate]
    );

    useEffect(() => {
      document.addEventListener('keydown', handleKeyDown);
      return () => document.removeEventListener('keydown', handleKeyDown);
    }, [handleKeyDown]);

    // Expose methods to parent via ref
    useImperativeHandle(
      ref,
      () => ({
        addText: (text?: string) => addText(text),
        addImage: async (url: string, fitToCanvas?: boolean) => {
          await addImage(url, fitToCanvas);
        },
        deleteSelected,
        exportToBlob,
        getSlideData: toSlideData,
        fitSelectedImage,
        fitBackgroundImage,
        setBackgroundImage,
        removeBackgroundImage,
        replaceSelectedImage,
        updateSelectedText,
      }),
      [
        addText,
        addImage,
        deleteSelected,
        exportToBlob,
        toSlideData,
        fitSelectedImage,
        fitBackgroundImage,
        setBackgroundImage,
        removeBackgroundImage,
        replaceSelectedImage,
        updateSelectedText,
      ]
    );

    return (
      <div
        ref={containerRef}
        className={cn('relative flex items-center justify-center', className)}
        tabIndex={0}
      >
        <div
          className="relative rounded-lg shadow-lg"
          style={{
            width: previewWidth,
            height: previewHeight,
          }}
        >
          <canvas ref={canvasElementRef} />
        </div>
      </div>
    );
  }
);

FabricCanvas.displayName = 'FabricCanvas';

export { FabricCanvas };
export type { FabricCanvasProps };
