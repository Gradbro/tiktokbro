'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Search, Maximize } from 'lucide-react';
import { cn } from '@/lib/utils';
import { listCollections, getCollection } from '@/lib/api-client';
import { createProxiedImageUrl } from '@/lib/fabric/utils';
import type { Collection } from '@/types';
import type { SceneProps } from '../FabricCanvas/types';

// Dimension presets matching the reference design
const DIMENSION_PRESETS = [
  { name: '9:16 Portrait', width: 1080, height: 1920 },
  { name: '3:4 Portrait', width: 1080, height: 2050 },
  { name: '16:9 Landscape', width: 1920, height: 1080 },
  { name: '1:1 Square', width: 1080, height: 1080 },
];

type BackgroundType = 'color' | 'image';

interface ScenePropertiesProps {
  props: SceneProps;
  onChange: (props: Partial<SceneProps>) => void;
  backgroundImageUrl?: string;
  onBackgroundImageSelect?: (imageUrl: string, collectionId: string) => void;
  onRemoveBackgroundImage?: () => void;
  onFitBackgroundImage?: () => void;
}

export function SceneProperties({
  props,
  onChange,
  backgroundImageUrl,
  onBackgroundImageSelect,
  onRemoveBackgroundImage,
  onFitBackgroundImage,
}: ScenePropertiesProps) {
  const currentAspectRatio = (props.width / props.height).toFixed(2);
  const [backgroundType, setBackgroundType] = useState<BackgroundType>(
    backgroundImageUrl ? 'image' : 'color'
  );

  // Sync backgroundType with backgroundImageUrl prop
  useEffect(() => {
    setBackgroundType(backgroundImageUrl ? 'image' : 'color');
  }, [backgroundImageUrl]);

  // Collection state for image picker
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>('');
  const [collectionImages, setCollectionImages] = useState<
    Array<{ id: string; url: string; source: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);

  // Load collections on mount
  useEffect(() => {
    async function loadCollections() {
      setIsLoadingCollections(true);
      try {
        const response = await listCollections(1, 100);
        if (response.success) {
          setCollections(response.collections);
        }
      } catch (error) {
        console.error('Failed to load collections:', error);
      } finally {
        setIsLoadingCollections(false);
      }
    }
    loadCollections();
  }, []);

  // Load collection images when selection changes
  useEffect(() => {
    async function loadCollectionImages() {
      if (!selectedCollectionId) {
        setCollectionImages([]);
        return;
      }
      setIsLoadingImages(true);
      try {
        const response = await getCollection(selectedCollectionId);
        if (response.success && response.data) {
          setCollectionImages(response.data.images || []);
        }
      } catch (error) {
        console.error('Failed to load collection images:', error);
      } finally {
        setIsLoadingImages(false);
      }
    }
    loadCollectionImages();
  }, [selectedCollectionId]);

  // Filter collections by search
  const filteredCollections = useMemo(() => {
    if (!searchQuery) return collections;
    const query = searchQuery.toLowerCase();
    return collections.filter(
      (c) => c.name.toLowerCase().includes(query) || c.description?.toLowerCase().includes(query)
    );
  }, [collections, searchQuery]);

  const handlePresetClick = (preset: (typeof DIMENSION_PRESETS)[number]) => {
    onChange({ width: preset.width, height: preset.height });
  };

  const handleImageClick = (imageUrl: string) => {
    if (onBackgroundImageSelect && selectedCollectionId) {
      onBackgroundImageSelect(imageUrl, selectedCollectionId);
    }
  };

  const selectedCollectionName = useMemo(() => {
    const collection = collections.find((c) => c.id === selectedCollectionId);
    return collection?.name || 'Select collection...';
  }, [collections, selectedCollectionId]);

  return (
    <div className="flex flex-col h-full overflow-hidden">
      <div className="flex-1 overflow-y-auto">
        {/* Scene Dimensions */}
        <div className="p-4 space-y-4">
          <div className="space-y-3">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Scene Dimensions
            </Label>

            {/* Presets Grid */}
            <div className="grid grid-cols-2 gap-2">
              {DIMENSION_PRESETS.map((preset) => {
                const isActive = props.width === preset.width && props.height === preset.height;
                return (
                  <button
                    key={preset.name}
                    onClick={() => handlePresetClick(preset)}
                    className={cn(
                      'flex flex-col items-start p-2 rounded-md border text-left transition-colors',
                      isActive
                        ? 'bg-primary/10 border-primary text-primary'
                        : 'bg-muted/30 border-border hover:bg-muted/50'
                    )}
                  >
                    <span className="text-xs font-medium">{preset.name}</span>
                    <span className="text-[10px] text-muted-foreground">
                      {preset.width} × {preset.height}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Width / Height Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Width</Label>
                <Input
                  type="number"
                  value={props.width}
                  onChange={(e) => onChange({ width: parseInt(e.target.value) || 1080 })}
                  className="h-8 bg-muted/30"
                />
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Height</Label>
                <Input
                  type="number"
                  value={props.height}
                  onChange={(e) => onChange({ height: parseInt(e.target.value) || 1920 })}
                  className="h-8 bg-muted/30"
                />
              </div>
            </div>

            <p className="text-[10px] text-muted-foreground">
              Current aspect ratio: {currentAspectRatio}
            </p>
          </div>

          {/* Background Type Toggle */}
          <div className="space-y-3 pt-2 border-t">
            <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
              Background Type
            </Label>
            <div className="flex rounded-md overflow-hidden border border-border">
              <button
                onClick={() => {
                  setBackgroundType('color');
                  // Remove background image when switching to color mode
                  onRemoveBackgroundImage?.();
                }}
                className={cn(
                  'flex-1 h-8 text-xs font-medium transition-colors',
                  backgroundType === 'color'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 hover:bg-muted/50'
                )}
              >
                Color
              </button>
              <button
                onClick={() => {
                  setBackgroundType('image');
                  // Set background color to black (fallback for export) when switching to image mode
                  onChange({ backgroundColor: '#000000' });
                }}
                className={cn(
                  'flex-1 h-8 text-xs font-medium transition-colors',
                  backgroundType === 'image'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted/30 hover:bg-muted/50'
                )}
              >
                Image
              </button>
            </div>
          </div>

          {/* Background Color Section */}
          {backgroundType === 'color' && (
            <div className="space-y-2">
              <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                Background Color
              </Label>
              <div className="flex items-center gap-2">
                <div
                  className="w-10 h-10 rounded border border-border cursor-pointer relative overflow-hidden"
                  style={{ backgroundColor: props.backgroundColor }}
                >
                  <input
                    type="color"
                    value={props.backgroundColor}
                    onChange={(e) => onChange({ backgroundColor: e.target.value })}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  />
                </div>
                <Input
                  type="text"
                  value={props.backgroundColor}
                  onChange={(e) => onChange({ backgroundColor: e.target.value })}
                  className="h-8 flex-1 bg-muted/30 font-mono text-xs"
                  placeholder="#ffffff"
                />
              </div>
            </div>
          )}

          {/* Background Image Section */}
          {backgroundType === 'image' && (
            <div className="space-y-3">
              {/* Current Background Preview */}
              {backgroundImageUrl && (
                <div className="space-y-2">
                  <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Current Background
                  </Label>
                  <div className="aspect-[9/16] max-h-32 rounded-md overflow-hidden border border-border">
                    <img
                      src={backgroundImageUrl}
                      alt="Background"
                      className="w-full h-full object-cover"
                    />
                  </div>
                  {onFitBackgroundImage && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="w-full"
                      onClick={onFitBackgroundImage}
                    >
                      <Maximize className="mr-2 h-4 w-4" />
                      Fit to Canvas
                    </Button>
                  )}
                </div>
              )}

              {/* Collection Picker */}
              <div className="space-y-2">
                <Label className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Select from Collection
                </Label>
                <Select
                  value={selectedCollectionId || undefined}
                  onValueChange={(value) => setSelectedCollectionId(value ?? '')}
                >
                  <SelectTrigger className="h-8 w-full">
                    <SelectValue>{selectedCollectionName}</SelectValue>
                  </SelectTrigger>
                  <SelectContent>
                    <div className="p-2 border-b">
                      <div className="relative">
                        <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3 w-3 text-muted-foreground" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search collections..."
                          className="h-7 pl-7 text-xs"
                        />
                      </div>
                    </div>
                    <div className="max-h-48 overflow-auto">
                      {isLoadingCollections ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          Loading...
                        </div>
                      ) : filteredCollections.length === 0 ? (
                        <div className="p-2 text-xs text-muted-foreground text-center">
                          No collections found
                        </div>
                      ) : (
                        filteredCollections.map((collection) => (
                          <SelectItem key={collection.id} value={collection.id}>
                            <div className="flex items-center gap-2">
                              <span>{collection.name}</span>
                              <span className="text-xs text-muted-foreground">
                                ({collection.imageCount})
                              </span>
                            </div>
                          </SelectItem>
                        ))
                      )}
                    </div>
                  </SelectContent>
                </Select>
              </div>

              {/* Collection Images Grid */}
              {selectedCollectionId && (
                <div className="grid grid-cols-3 gap-1.5 max-h-40 overflow-auto">
                  {isLoadingImages ? (
                    <div className="col-span-3 text-xs text-muted-foreground text-center py-4">
                      Loading images...
                    </div>
                  ) : collectionImages.length === 0 ? (
                    <div className="col-span-3 text-xs text-muted-foreground text-center py-4">
                      No images in collection
                    </div>
                  ) : (
                    collectionImages.map((image) => (
                      <button
                        key={image.id}
                        type="button"
                        className="aspect-square rounded-md overflow-hidden border border-border hover:border-primary focus:border-primary focus:outline-none transition-colors"
                        onClick={() => handleImageClick(image.url)}
                      >
                        <img
                          src={createProxiedImageUrl(image.url)}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
