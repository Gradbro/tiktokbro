'use client';

import { ActiveJob } from '@/hooks/useJobPolling';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  Play,
  Trash2,
  ImageIcon,
  Video,
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface TaskQueueProps {
  jobs: ActiveJob[];
  onJobClick: (job: ActiveJob) => void;
  onRemoveJob: (jobId: string) => void;
  maxVisible?: number;
}

function getStatusIcon(status: ActiveJob['status']) {
  switch (status) {
    case 'queued':
      return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
    case 'in_progress':
      return <Loader2 className="w-3.5 h-3.5 text-primary animate-spin" />;
    case 'complete':
      return <CheckCircle2 className="w-3.5 h-3.5 text-green-500" />;
    case 'error':
      return <XCircle className="w-3.5 h-3.5 text-destructive" />;
    default:
      return <Clock className="w-3.5 h-3.5 text-muted-foreground" />;
  }
}

function getStatusBadge(status: ActiveJob['status'], queuePosition?: number) {
  switch (status) {
    case 'queued':
      return (
        <Badge variant="secondary" className="text-[10px] px-1.5 py-0">
          {queuePosition !== undefined ? `Queue #${queuePosition + 1}` : 'Queued'}
        </Badge>
      );
    case 'in_progress':
      return (
        <Badge className="bg-primary/20 text-primary text-[10px] px-1.5 py-0 border-0">
          Processing
        </Badge>
      );
    case 'complete':
      return (
        <Badge className="bg-green-500/20 text-green-600 text-[10px] px-1.5 py-0 border-0">
          Ready
        </Badge>
      );
    case 'error':
      return (
        <Badge variant="destructive" className="text-[10px] px-1.5 py-0">
          Failed
        </Badge>
      );
    default:
      return null;
  }
}

function getTypeIcon(type: ActiveJob['type']) {
  return type === 'video' ? <Video className="w-3 h-3" /> : <ImageIcon className="w-3 h-3" />;
}

export function TaskQueue({ jobs, onJobClick, onRemoveJob, maxVisible = 5 }: TaskQueueProps) {
  const visibleJobs = jobs.slice(0, maxVisible);
  const hiddenCount = jobs.length - maxVisible;

  if (jobs.length === 0) {
    return (
      <div className="text-center py-4 text-muted-foreground">
        <Clock className="w-5 h-5 mx-auto mb-1.5 opacity-40" />
        <p className="text-xs">No active jobs</p>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      {visibleJobs.map((job) => (
        <div
          key={job.id}
          className={`
            group relative flex items-center gap-2 p-2 rounded-lg border transition-all cursor-pointer
            ${
              job.status === 'complete'
                ? 'border-green-500/30 bg-green-500/5 hover:bg-green-500/10'
                : job.status === 'error'
                  ? 'border-destructive/30 bg-destructive/5'
                  : 'border-border hover:border-primary/30 hover:bg-muted/50'
            }
          `}
          onClick={() => onJobClick(job)}
        >
          {/* Status icon */}
          <div className="shrink-0">{getStatusIcon(job.status)}</div>

          {/* Content */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-1.5">
              {getTypeIcon(job.type)}
              <span className="text-xs font-medium truncate">{job.reactionName || 'Reaction'}</span>
            </div>
            <div className="flex items-center gap-1.5 mt-0.5">
              {getStatusBadge(job.status, job.queuePosition)}
              <span className="text-[10px] text-muted-foreground">
                {formatDistanceToNow(job.submittedAt, { addSuffix: true })}
              </span>
            </div>
          </div>

          {/* Actions */}
          <div className="shrink-0 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {job.status === 'complete' && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={(e) => {
                  e.stopPropagation();
                  onJobClick(job);
                }}
              >
                <Play className="w-3 h-3" />
              </Button>
            )}
            {(job.status === 'complete' || job.status === 'error') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation();
                  onRemoveJob(job.id);
                }}
              >
                <Trash2 className="w-3 h-3" />
              </Button>
            )}
          </div>
        </div>
      ))}

      {hiddenCount > 0 && (
        <p className="text-[10px] text-muted-foreground text-center pt-1">
          +{hiddenCount} more job{hiddenCount > 1 ? 's' : ''}
        </p>
      )}
    </div>
  );
}
