'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Slider } from '@/components/ui/slider';
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from '@/components/ui/select';
import { Maximize, ChevronDown, Lock, Search, Image as ImageIcon } from 'lucide-react';
import { listCollections, getCollection } from '@/lib/api-client';
import { createProxiedImageUrl } from '@/lib/fabric/utils';
import type { Collection } from '@/types';
import type { ImageObjectProps } from '../FabricCanvas/types';

interface Layer {
  id: string;
  name: string;
  type: 'text' | 'image' | 'background';
  locked?: boolean;
}

interface ImagePropertiesProps {
  props: ImageObjectProps;
  onChange: (props: Partial<ImageObjectProps>) => void;
  onFitToCanvas?: () => void;
  onImageSelect?: (imageUrl: string, collectionId: string) => void;
  layers?: Layer[];
}

export function ImageProperties({
  props,
  onChange,
  onFitToCanvas,
  onImageSelect,
  layers = [],
}: ImagePropertiesProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [selectedCollectionId, setSelectedCollectionId] = useState<string>(
    props.collectionId || ''
  );
  const [collectionImages, setCollectionImages] = useState<
    Array<{ id: string; url: string; source: string }>
  >([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingCollections, setIsLoadingCollections] = useState(false);
  const [isLoadingImages, setIsLoadingImages] = useState(false);
  const [metadataOpen, setMetadataOpen] = useState(false);

  // Calculate zoom percentage from scale
  const zoomPercent = Math.round((props.scaleX - 1) * 100);

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

  const handleImageClick = (imageUrl: string) => {
    if (onImageSelect && selectedCollectionId) {
      onImageSelect(imageUrl, selectedCollectionId);
    }
  };

  // Get display text for selected collection
  const selectedCollectionName = useMemo(() => {
    const collection = collections.find((c) => c.id === selectedCollectionId);
    return collection?.name || 'Select a collection...';
  }, [collections, selectedCollectionId]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div>
        <h3 className="text-sm font-medium">Image Properties</h3>
        <p className="text-xs text-muted-foreground font-mono mt-1">{props.id}</p>
      </div>

      {/* Transform */}
      <div className="space-y-3">
        <Label className="text-xs font-medium text-muted-foreground">Transform</Label>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="img-x" className="text-xs text-muted-foreground">
              X
            </Label>
            <Input
              id="img-x"
              type="number"
              value={Math.round(props.left)}
              onChange={(e) => onChange({ left: parseFloat(e.target.value) || 0 })}
              className="h-8 text-sm"
            />
          </div>
          <div>
            <Label htmlFor="img-y" className="text-xs text-muted-foreground">
              Y
            </Label>
            <Input
              id="img-y"
              type="number"
              value={Math.round(props.top)}
              onChange={(e) => onChange({ top: parseFloat(e.target.value) || 0 })}
              className="h-8 text-sm"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div>
            <Label htmlFor="img-width" className="text-xs text-muted-foreground">
              Width
            </Label>
            <Input
              id="img-width"
              type="number"
              value={Math.round(props.width * props.scaleX)}
              className="h-8 text-sm"
              disabled
            />
          </div>
          <div>
            <Label htmlFor="img-height" className="text-xs text-muted-foreground">
              Height
            </Label>
            <Input
              id="img-height"
              type="number"
              value={Math.round(props.height * props.scaleY)}
              className="h-8 text-sm"
              disabled
            />
          </div>
        </div>
      </div>

      {/* Fit to Background */}
      <Button variant="outline" size="sm" className="w-full" onClick={onFitToCanvas}>
        <Maximize className="mr-2 h-4 w-4" />
        Fit to Background
      </Button>

      {/* Zoom */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <Label className="text-xs font-medium text-muted-foreground">Zoom</Label>
          <span className="text-xs text-muted-foreground">
            {zoomPercent > 0 ? '+' : ''}
            {zoomPercent}%
          </span>
        </div>
        <Slider
          value={zoomPercent}
          min={-50}
          max={200}
          step={5}
          onValueChange={(value) => {
            const newScale = 1 + value / 100;
            onChange({ scaleX: newScale, scaleY: newScale });
          }}
        />
      </div>

      {/* Collection Picker */}
      <div className="space-y-2">
        <Label className="text-xs font-medium text-muted-foreground">Collection</Label>
        <Select
          value={selectedCollectionId || undefined}
          onValueChange={(value) => {
            setSelectedCollectionId(value ?? '');
            onChange({ collectionId: value ?? undefined });
          }}
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
                <div className="p-2 text-xs text-muted-foreground text-center">Loading...</div>
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
        <div className="space-y-2">
          <div className="grid grid-cols-3 gap-1.5 max-h-48 overflow-auto">
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
        </div>
      )}

      {/* Image Metadata - collapsible section */}
      <div className="space-y-2">
        <button
          type="button"
          onClick={() => setMetadataOpen(!metadataOpen)}
          className="flex items-center justify-between w-full text-xs font-medium text-muted-foreground py-2 hover:text-foreground"
        >
          <span>Image Metadata</span>
          <ChevronDown
            className={`h-4 w-4 transition-transform ${metadataOpen ? 'rotate-180' : ''}`}
          />
        </button>
        {metadataOpen && (
          <div className="rounded-md bg-muted/50 p-2">
            <p className="text-xs text-muted-foreground break-all">
              <span className="font-medium">Source:</span> {props.src}
            </p>
          </div>
        )}
      </div>

      {/* Layers */}
      <div className="space-y-2 pt-2 border-t">
        <Label className="text-xs font-medium text-muted-foreground">Layers</Label>
        <div className="space-y-1">
          {layers.length === 0 ? (
            <>
              <div className="flex items-center justify-between p-2 rounded-md bg-primary/10 border border-primary/20">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-3 w-3 text-muted-foreground" />
                  <span className="text-xs">Image</span>
                </div>
              </div>
              <div className="flex items-center justify-between p-2 rounded-md bg-muted/50">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded bg-gradient-to-br from-muted-foreground/30 to-muted-foreground/10" />
                  <span className="text-xs text-muted-foreground">Background</span>
                </div>
                <Lock className="h-3 w-3 text-muted-foreground" />
              </div>
            </>
          ) : (
            layers.map((layer) => (
              <div
                key={layer.id}
                className={`flex items-center justify-between p-2 rounded-md ${
                  layer.id === props.id ? 'bg-primary/10 border border-primary/20' : 'bg-muted/50'
                }`}
              >
                <div className="flex items-center gap-2">
                  {layer.type === 'background' ? (
                    <div className="h-3 w-3 rounded bg-gradient-to-br from-muted-foreground/30 to-muted-foreground/10" />
                  ) : layer.type === 'image' ? (
                    <ImageIcon className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <span className="text-xs font-bold text-muted-foreground">T</span>
                  )}
                  <span
                    className={`text-xs ${layer.id === props.id ? '' : 'text-muted-foreground'}`}
                  >
                    {layer.name}
                  </span>
                </div>
                {layer.locked && <Lock className="h-3 w-3 text-muted-foreground" />}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
