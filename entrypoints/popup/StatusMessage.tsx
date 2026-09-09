import React from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, Loader2 } from 'lucide-react';

export type StatusSeverity = 'info' | 'success' | 'warning' | 'error' | 'loading';

export interface StatusState {
  type: StatusSeverity;
  message: string;
  actionHint?: string;
}

export interface StatusMessageProps {
  status: string | StatusState | null;
  className?: string;
}

export function parseStatus(status: string | StatusState | null): StatusState | null {
  if (!status) return null;
  if (typeof status === 'object') return status;
  if (typeof status !== 'string' || status.trim().length === 0) return null;

  const lower = status.toLowerCase();

  if (
    lower.includes('loading') ||
    lower.includes('connecting') ||
    lower.includes('capturing') ||
    lower.includes('applying')
  ) {
    return { type: 'loading', message: status };
  }

  if (
    lower.includes('error') ||
    lower.includes('failed') ||
    lower.includes('denied') ||
    lower.includes('quota') ||
    lower.includes('unsupported') ||
    lower.includes('could not')
  ) {
    let actionHint: string | undefined;
    if (lower.includes('denied')) {
      actionHint = 'Grant site permissions when prompted to use StickySite on this page.';
    } else if (lower.includes('quota')) {
      actionHint = 'Delete unused views to free up storage space.';
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

export function StatusMessage({ status, className = '' }: StatusMessageProps) {
  const parsed = parseStatus(status);
  if (!parsed) return null;

  const isAlert = parsed.type === 'error';
  const role = isAlert ? 'alert' : 'status';
  const ariaLive = isAlert ? 'assertive' : 'polite';

  const config = {
    loading: {
      tag: '[Loading]',
      icon: <Loader2 className="h-4 w-4 animate-spin text-blue-600 shrink-0" />,
      style: 'bg-blue-50 text-blue-900 border-blue-200',
    },
    info: {
      tag: '[Info]',
      icon: <Info className="h-4 w-4 text-blue-600 shrink-0" />,
      style: 'bg-blue-50 text-blue-900 border-blue-200',
    },
    success: {
      tag: '[Success]',
      icon: <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />,
      style: 'bg-emerald-50 text-emerald-900 border-emerald-200',
    },
    warning: {
      tag: '[Warning]',
      icon: <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />,
      style: 'bg-amber-50 text-amber-900 border-amber-200',
    },
    error: {
      tag: '[Error]',
      icon: <AlertCircle className="h-4 w-4 text-red-600 shrink-0" />,
      style: 'bg-red-50 text-red-900 border-red-200',
    },
  }[parsed.type];

  return (
    <div
      id="status-message"
      role={role}
      aria-live={ariaLive}
      className={`rounded-md border p-2.5 my-2 flex items-start gap-2 text-xs transition-colors ${config.style} ${className}`}
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
    </div>
  );
}
