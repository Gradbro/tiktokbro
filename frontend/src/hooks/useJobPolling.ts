'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import * as api from '@/lib/api-client';

export type JobStatus = 'queued' | 'in_progress' | 'complete' | 'error' | 'no_job' | 'idle';

export interface UseJobPollingOptions {
  /** Polling interval in milliseconds (default: 3000) */
  interval?: number;
  /** Whether to start polling automatically (default: true) */
  autoStart?: boolean;
  /** Callback when job completes */
  onComplete?: (sessionId: string) => void;
  /** Callback when job errors */
  onError?: (sessionId: string, error: string) => void;
}

export interface UseJobPollingResult {
  /** Current job status */
  status: JobStatus;
  /** Queue position if waiting in queue */
  queuePosition?: number;
  /** Whether currently polling */
  isPolling: boolean;
  /** Error message if any */
  error: string | null;
  /** Start polling for a session */
  startPolling: (sessionId: string) => void;
  /** Stop polling */
  stopPolling: () => void;
  /** Manually check status once */
  checkStatus: (sessionId: string) => Promise<JobStatus>;
  /** Fetch the result when job is complete */
  fetchResult: (sessionId: string) => Promise<void>;
}

export function useJobPolling(options: UseJobPollingOptions = {}): UseJobPollingResult {
  const { interval = 3000, autoStart: _autoStart = true, onComplete, onError } = options;

  const [status, setStatus] = useState<JobStatus>('idle');
  const [queuePosition, setQueuePosition] = useState<number | undefined>();
  const [isPolling, setIsPolling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sessionIdRef = useRef<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const stopPolling = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    setIsPolling(false);
  }, []);

  const checkStatus = useCallback(async (sessionId: string): Promise<JobStatus> => {
    try {
      const response = await api.getJobStatus(sessionId);

      if (response.success && response.data) {
        const newStatus = response.data.status;
        setStatus(newStatus);
        setQueuePosition(response.data.queuePosition);

        if (response.data.error) {
          setError(response.data.error);
        }

        return newStatus;
      } else {
        setError(response.error || 'Failed to check status');
        return 'error';
      }
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to check status';
      setError(errorMsg);
      return 'error';
    }
  }, []);

  const startPolling = useCallback(
    (sessionId: string) => {
      // Stop any existing polling
      stopPolling();

      sessionIdRef.current = sessionId;
      setIsPolling(true);
      setError(null);
      setStatus('queued');

      // Immediate first check
      checkStatus(sessionId).then((newStatus) => {
        if (newStatus === 'complete') {
          stopPolling();
          onComplete?.(sessionId);
        } else if (newStatus === 'error') {
          stopPolling();
          onError?.(sessionId, error || 'Job failed');
        }
      });

      // Set up interval
      intervalRef.current = setInterval(async () => {
        if (!sessionIdRef.current) return;

        const newStatus = await checkStatus(sessionIdRef.current);

        if (newStatus === 'complete') {
          stopPolling();
          onComplete?.(sessionIdRef.current);
        } else if (newStatus === 'error') {
          stopPolling();
          onError?.(sessionIdRef.current, error || 'Job failed');
        }
      }, interval);
    },
    [checkStatus, stopPolling, onComplete, onError, interval, error]
  );

  const fetchResult = useCallback(async (sessionId: string) => {
    try {
      await api.fetchJobResult(sessionId);
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch result';
      setError(errorMsg);
      throw err;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopPolling();
    };
  }, [stopPolling]);

  return {
    status,
    queuePosition,
    isPolling,
    error,
    startPolling,
    stopPolling,
    checkStatus,
    fetchResult,
  };
}

// ==================== Multi-Job Polling Hook ====================

export interface ActiveJob {
  id: string;
  sessionId: string;
  type: 'images' | 'video';
  status: JobStatus;
  queuePosition?: number;
  reactionName?: string;
  avatarPreview?: string;
  submittedAt: number;
  error?: string;
}

export interface UseMultiJobPollingResult {
  /** List of active jobs */
  jobs: ActiveJob[];
  /** Add a new job to track */
  addJob: (job: Omit<ActiveJob, 'status' | 'submittedAt'> & { status?: JobStatus }) => void;
  /** Remove a job from tracking */
  removeJob: (jobId: string) => void;
  /** Get completed jobs */
  completedJobs: ActiveJob[];
  /** Clear completed jobs */
  clearCompleted: () => void;
}

const STORAGE_KEY = 'ugc-reaction-jobs';

// Load jobs from localStorage (lazy initializer)
function loadJobsFromStorage(): ActiveJob[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored) as ActiveJob[];
      // Filter out jobs older than 24 hours
      const cutoff = Date.now() - 24 * 60 * 60 * 1000;
      return parsed.filter((j) => j.submittedAt > cutoff);
    }
  } catch (e) {
    console.error('Failed to load jobs from localStorage:', e);
  }
  return [];
}

export function useMultiJobPolling(options: UseJobPollingOptions = {}): UseMultiJobPollingResult {
  const { interval = 3000, onComplete, onError } = options;

  const [jobs, setJobs] = useState<ActiveJob[]>(loadJobsFromStorage);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Save jobs to localStorage when they change
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(jobs));
    } catch (e) {
      console.error('Failed to save jobs to localStorage:', e);
    }
  }, [jobs]);

  // Poll active jobs
  useEffect(() => {
    const activeJobs = jobs.filter((j) => j.status === 'queued' || j.status === 'in_progress');

    if (activeJobs.length === 0) {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
      return;
    }

    const pollJobs = async () => {
      for (const job of activeJobs) {
        try {
          const response = await api.getJobStatus(job.sessionId);

          if (response.success && response.data) {
            const newStatus = response.data.status;

            setJobs((prev) =>
              prev.map((j) =>
                j.id === job.id
                  ? {
                      ...j,
                      status: newStatus,
                      queuePosition: response.data?.queuePosition,
                      error: response.data?.error,
                    }
                  : j
              )
            );

            if (newStatus === 'complete') {
              onComplete?.(job.sessionId);
            } else if (newStatus === 'error') {
              onError?.(job.sessionId, response.data.error || 'Job failed');
            }
          }
        } catch (e) {
          console.error(`Failed to poll job ${job.id}:`, e);
        }
      }
    };

    // Immediate poll
    pollJobs();

    // Set up interval
    intervalRef.current = setInterval(pollJobs, interval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [jobs, interval, onComplete, onError]);

  const addJob = useCallback(
    (job: Omit<ActiveJob, 'status' | 'submittedAt'> & { status?: JobStatus }) => {
      const newJob: ActiveJob = {
        ...job,
        status: job.status || 'queued',
        submittedAt: Date.now(),
      };
      setJobs((prev) => [newJob, ...prev]);
    },
    []
  );

  const removeJob = useCallback((jobId: string) => {
    setJobs((prev) => prev.filter((j) => j.id !== jobId));
  }, []);

  const completedJobs = jobs.filter((j) => j.status === 'complete');

  const clearCompleted = useCallback(() => {
    setJobs((prev) => prev.filter((j) => j.status !== 'complete'));
  }, []);

  return {
    jobs,
    addJob,
    removeJob,
    completedJobs,
    clearCompleted,
  };
}
