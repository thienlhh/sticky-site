import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2, X } from 'lucide-react';

export type StatusSeverity = 'info' | 'success' | 'warning' | 'error' | 'loading';

export interface StatusState {
  type: StatusSeverity;
  message: string;
  actionHint?: string;
}

export const DEFAULT_STATUS_DISMISS_TIMEOUT_MS = 5000;

export interface StatusMessageProps {
  status: string | StatusState | null;
  className?: string;
  onDismiss?: () => void;
  timeoutMs?: number;
  position?: 'bottom' | 'top';
}

export function parseStatus(status: string | StatusState | null): StatusState | null {
  if (!status) return null;
  if (typeof status === 'object') return status;
  if (typeof status !== 'string' || status.trim().length === 0) return null;

  const lower = status.toLowerCase();

  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('denied') ||
    lower.includes('quota') ||
    lower.includes('unsupported') ||
    lower.includes('schema') ||
    lower.includes('could not') ||
    lower.includes('page changed')
  ) {
    let actionHint: string | undefined;
    if (lower.includes('denied')) {
      actionHint = 'Grant site permissions when prompted to use StickySite on this page.';
    } else if (lower.includes('quota')) {
      actionHint = 'Delete unused views to free up storage space.';
    } else if (lower.includes('schema') || lower.includes('storage')) {
      actionHint = 'Retry loading saved views or update the extension.';
    } else if (lower.includes('could not') || lower.includes('failed')) {
      actionHint = 'Ensure the page is fully loaded and supported controls are visible.';
    }
    return { type: 'error', message: status, actionHint };
  }

  if (lower.includes('partial')) {
    return {
      type: 'warning',
      message: status,
      actionHint: 'Some controls could not be safely identified or restored.',
    };
  }

  if (/\b\d+ of \d+ settings restored\b/i.test(status) && /\b(skipped|failed)\b/i.test(status)) {
    return {
      type: 'warning',
      message: status,
      actionHint: 'Some controls could not be safely identified or restored.',
    };
  }

  if (
    lower.includes('loading') ||
    lower.includes('connecting') ||
    lower.includes('capturing') ||
    lower.includes('applying')
  ) {
    return { type: 'loading', message: status };
  }

  if (
    lower.includes('saved') ||
    lower.includes('renamed') ||
    lower.includes('deleted') ||
    lower.includes('updated') ||
    lower.includes('restored') ||
    lower.includes('full')
  ) {
    return { type: 'success', message: status };
  }

  return { type: 'info', message: status };
}

function getStatusKey(status: string | StatusState | null): string {
  if (!status) return '';
  if (typeof status === 'string') return status;
  return `${status.type}:${status.message}:${status.actionHint ?? ''}`;
}

export function StatusMessage({
  status,
  className = '',
  onDismiss,
  timeoutMs = DEFAULT_STATUS_DISMISS_TIMEOUT_MS,
  position = 'bottom',
}: StatusMessageProps) {
  const parsed = parseStatus(status);
  const statusKey = getStatusKey(status);

  const [isDismissed, setIsDismissed] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const prevKeyRef = useRef(statusKey);

  // Reset dismissal state whenever a new status arrives
  if (statusKey !== prevKeyRef.current) {
    prevKeyRef.current = statusKey;
    setIsDismissed(false);
  }

  useEffect(() => {
    if (!parsed || isDismissed || parsed.type === 'loading' || timeoutMs <= 0 || isPaused) {
      return;
    }

    const timer = setTimeout(() => {
      setIsDismissed(true);
      onDismiss?.();
    }, timeoutMs);

    return () => clearTimeout(timer);
  }, [statusKey, isDismissed, parsed?.type, timeoutMs, onDismiss, isPaused]);

  if (!parsed || isDismissed) return null;

  const isAlert = parsed.type === 'error';
  const role = isAlert ? 'alert' : 'status';
  const ariaLive = isAlert ? 'assertive' : 'polite';

  const config = {
    loading: {
      tag: '[Loading]',
      icon: <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />,
      style: 'bg-blue-50/95 text-blue-900 border-blue-200 shadow-lg',
    },
    info: {
      tag: '[Info]',
      icon: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
      style: 'bg-blue-50/95 text-blue-900 border-blue-200 shadow-lg',
    },
    success: {
      tag: '[Success]',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
      style: 'bg-emerald-50/95 text-emerald-900 border-emerald-200 shadow-lg',
    },
    warning: {
      tag: '[Warning]',
      icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
      style: 'bg-amber-50/95 text-amber-900 border-amber-200 shadow-lg',
    },
    error: {
      tag: '[Error]',
      icon: <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />,
      style: 'bg-red-50/95 text-red-900 border-red-200 shadow-lg',
    },
  }[parsed.type];

  const positionClass = position === 'top' ? 'top-3' : 'bottom-16';

  const handleDismiss = () => {
    setIsDismissed(true);
    onDismiss?.();
  };

  return (
    <div
      id="status-message"
      role={role}
      aria-live={ariaLive}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onFocus={() => setIsPaused(true)}
      onBlur={() => setIsPaused(false)}
      className={`fixed ${positionClass} left-3 right-3 z-50 rounded-lg border p-2.5 flex items-start gap-2 text-xs backdrop-blur-xs transition-all duration-200 ${config.style} ${className}`}
    >
      <div className="mt-0.5">{config.icon}</div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold leading-tight">
          <span className="font-bold mr-1">{config.tag}</span>
          {parsed.message}
        </p>
        {parsed.actionHint && (
          <p className="mt-1 text-[11px] opacity-90 leading-tight">
            Next action: {parsed.actionHint}
          </p>
        )}
      </div>
      {parsed.type !== 'loading' && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss status message"
          className="shrink-0 rounded p-0.5 text-current opacity-60 hover:opacity-100 hover:bg-black/5 focus:outline-none focus:ring-1 focus:ring-current transition-opacity"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}
