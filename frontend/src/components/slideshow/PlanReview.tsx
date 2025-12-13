'use client';

import { useState } from 'react';
import { useSlideshowContext } from '@/context/SlideshowContext';
import { useSlideshowGenerator } from '@/hooks/useSlideshowGenerator';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  Play,
  Loader2,
  Pencil,
  Image as ImageIcon,
  ChevronRight,
} from 'lucide-react';

export function PlanReview() {
  const { session, updatePlan } = useSlideshowContext();
  const { isLoading, generateImages } = useSlideshowGenerator();
  const [expandedSlide, setExpandedSlide] = useState<number | null>(1);

  if (!session?.plans?.length) return null;

  return (
    <div className="flex-1 flex overflow-hidden">
      {/* Left - Plan List */}
      <div className="w-[400px] border-r border-gray-200 bg-white overflow-y-auto">
        <div className="p-4 border-b border-gray-100">
          <p className="text-sm text-gray-500">
            Review and edit your slide plans before generating images
          </p>
        </div>

        <div className="divide-y divide-gray-100">
          {session.plans.map((plan) => (
            <div
              key={plan.slideNumber}
              className={`cursor-pointer transition-colors ${
                expandedSlide === plan.slideNumber
                  ? 'bg-[#E86D55]/5'
                  : 'hover:bg-gray-50'
              }`}
              onClick={() => setExpandedSlide(plan.slideNumber)}
            >
              <div className="p-4">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-medium ${
                      expandedSlide === plan.slideNumber
                        ? 'bg-[#E86D55] text-white'
                        : 'bg-gray-100 text-gray-600'
                    }`}
                  >
                    {plan.slideNumber}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">
                      {plan.suggestedOverlay || `Slide ${plan.slideNumber}`}
                    </p>
                    <p className="text-sm text-gray-500 truncate">
                      {plan.imagePrompt.slice(0, 60)}...
                    </p>
                  </div>
                  <ChevronRight
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      expandedSlide === plan.slideNumber ? 'rotate-90' : ''
                    }`}
                  />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Generate Button */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <Button
            onClick={generateImages}
            disabled={isLoading}
            className="w-full bg-[#E86D55] hover:bg-[#D55D45]"
            size="lg"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Generating Images...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Generate All Images
              </>
            )}
          </Button>
        </div>
      </div>

      {/* Right - Edit Panel */}
      <div className="flex-1 bg-gray-50 overflow-y-auto">
        {expandedSlide ? (
          <div className="p-6 max-w-2xl mx-auto">
            {(() => {
              const plan = session.plans.find((p) => p.slideNumber === expandedSlide);
              if (!plan) return null;

              return (
                <div className="space-y-6">
                  {/* Header */}
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#E86D55] text-white flex items-center justify-center text-lg font-semibold">
                      {plan.slideNumber}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-gray-900">
                        Slide {plan.slideNumber}
                      </h2>
                      <p className="text-sm text-gray-500">Edit the details below</p>
                    </div>
                  </div>

                  {/* Image Prompt */}
                  <div className="bg-white rounded-xl p-5 space-y-5 shadow-sm border border-gray-200">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <ImageIcon className="w-4 h-4" />
                        Image Prompt
                      </div>
                      <Textarea
                        value={plan.imagePrompt}
                        onChange={(e) =>
                          updatePlan(plan.slideNumber, { imagePrompt: e.target.value })
                        }
                        placeholder="Describe the image you want AI to generate..."
                        className="min-h-[120px] resize-none border-gray-200"
                      />
                      <p className="text-xs text-gray-400">
                        Be specific about style, lighting, composition, and mood
                      </p>
                    </div>

                    <div className="space-y-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-gray-700">
                        <Pencil className="w-4 h-4" />
                        Text Overlay (Optional)
                      </div>
                      <Input
                        value={plan.suggestedOverlay || ''}
                        onChange={(e) =>
                          updatePlan(plan.slideNumber, { suggestedOverlay: e.target.value })
                        }
                        placeholder="Short text to display on the slide"
                        className="border-gray-200"
                      />
                    </div>
                  </div>

                  {/* Preview Card */}
                  <div className="bg-white rounded-xl p-5 shadow-sm border border-gray-200">
                    <h3 className="text-sm font-medium text-gray-700 mb-3">Preview</h3>
                    <div className="aspect-[9/16] max-w-[200px] mx-auto bg-gray-100 rounded-lg flex items-center justify-center">
                      <div className="text-center p-4">
                        <ImageIcon className="w-8 h-8 text-gray-300 mx-auto mb-2" />
                        <p className="text-xs text-gray-400">
                          Image will be generated
                        </p>
                        {plan.suggestedOverlay && (
                          <p className="mt-4 text-sm font-medium text-gray-600">
                            &quot;{plan.suggestedOverlay}&quot;
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        ) : (
          <div className="flex items-center justify-center h-full text-gray-500">
            Select a slide to edit
          </div>
        )}
      </div>
    </div>
  );
}
