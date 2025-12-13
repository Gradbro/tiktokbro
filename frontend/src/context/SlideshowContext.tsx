'use client';

import React, { createContext, useContext, useReducer, ReactNode } from 'react';
import { v4 as uuidv4 } from 'uuid';
import {
  WorkflowStage,
  SlidePlan,
  GeneratedSlide,
  ImageConfig,
  SlideshowSession,
  TextOverlay,
} from '@/types';

interface SlideshowState {
  session: SlideshowSession | null;
}

type SlideshowAction =
  | { type: 'INIT_SESSION'; payload: { prompt: string; config: ImageConfig } }
  | { type: 'SET_STAGE'; payload: WorkflowStage }
  | { type: 'SET_PLANS'; payload: SlidePlan[] }
  | { type: 'UPDATE_PLAN'; payload: { slideNumber: number; updates: Partial<SlidePlan> } }
  | { type: 'INIT_SLIDES'; payload: SlidePlan[] }
  | { type: 'SET_SLIDES'; payload: GeneratedSlide[] }
  | { type: 'UPDATE_SLIDE'; payload: { id: string; updates: Partial<GeneratedSlide> } }
  | { type: 'UPDATE_TEXT_OVERLAY'; payload: { id: string; overlay: TextOverlay } }
  | { type: 'RESET' };

const initialState: SlideshowState = {
  session: null,
};

function slideshowReducer(state: SlideshowState, action: SlideshowAction): SlideshowState {
  switch (action.type) {
    case 'INIT_SESSION':
      return {
        session: {
          id: uuidv4(),
          prompt: action.payload.prompt,
          stage: 'planning',
          plans: [],
          slides: [],
          config: action.payload.config,
        },
      };

    case 'SET_STAGE':
      if (!state.session) return state;
      return {
        session: { ...state.session, stage: action.payload },
      };

    case 'SET_PLANS':
      if (!state.session) return state;
      return {
        session: { ...state.session, plans: action.payload, stage: 'review' },
      };

    case 'UPDATE_PLAN':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          plans: state.session.plans.map((plan) =>
            plan.slideNumber === action.payload.slideNumber
              ? { ...plan, ...action.payload.updates }
              : plan
          ),
        },
      };

    case 'INIT_SLIDES':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          stage: 'generating',
          slides: action.payload.map((plan) => ({
            id: uuidv4(),
            slideNumber: plan.slideNumber,
            plan,
            status: 'pending',
          })),
        },
      };

    case 'SET_SLIDES':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          slides: action.payload,
        },
      };

    case 'UPDATE_SLIDE':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          slides: state.session.slides.map((slide) =>
            slide.id === action.payload.id
              ? { ...slide, ...action.payload.updates }
              : slide
          ),
        },
      };

    case 'UPDATE_TEXT_OVERLAY':
      if (!state.session) return state;
      return {
        session: {
          ...state.session,
          slides: state.session.slides.map((slide) =>
            slide.id === action.payload.id
              ? { ...slide, textOverlay: action.payload.overlay }
              : slide
          ),
        },
      };

    case 'RESET':
      return initialState;

    default:
      return state;
  }
}

interface SlideshowContextValue {
  session: SlideshowSession | null;
  initSession: (prompt: string, config: ImageConfig) => void;
  setStage: (stage: WorkflowStage) => void;
  setPlans: (plans: SlidePlan[]) => void;
  updatePlan: (slideNumber: number, updates: Partial<SlidePlan>) => void;
  initSlides: (plans: SlidePlan[]) => void;
  setSlides: (slides: GeneratedSlide[]) => void;
  updateSlide: (id: string, updates: Partial<GeneratedSlide>) => void;
  updateTextOverlay: (id: string, overlay: TextOverlay) => void;
  reset: () => void;
}

const SlideshowContext = createContext<SlideshowContextValue | null>(null);

export function SlideshowProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(slideshowReducer, initialState);

  const value: SlideshowContextValue = {
    session: state.session,
    initSession: (prompt, config) =>
      dispatch({ type: 'INIT_SESSION', payload: { prompt, config } }),
    setStage: (stage) => dispatch({ type: 'SET_STAGE', payload: stage }),
    setPlans: (plans) => dispatch({ type: 'SET_PLANS', payload: plans }),
    updatePlan: (slideNumber, updates) =>
      dispatch({ type: 'UPDATE_PLAN', payload: { slideNumber, updates } }),
    initSlides: (plans) => dispatch({ type: 'INIT_SLIDES', payload: plans }),
    setSlides: (slides) => dispatch({ type: 'SET_SLIDES', payload: slides }),
    updateSlide: (id, updates) =>
      dispatch({ type: 'UPDATE_SLIDE', payload: { id, updates } }),
    updateTextOverlay: (id, overlay) =>
      dispatch({ type: 'UPDATE_TEXT_OVERLAY', payload: { id, overlay } }),
    reset: () => dispatch({ type: 'RESET' }),
  };

  return (
    <SlideshowContext.Provider value={value}>
      {children}
    </SlideshowContext.Provider>
  );
}

export function useSlideshowContext() {
  const context = useContext(SlideshowContext);
  if (!context) {
    throw new Error('useSlideshowContext must be used within a SlideshowProvider');
  }
  return context;
}
