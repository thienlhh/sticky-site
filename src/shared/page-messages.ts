import type { CapturedSetting } from '@/domain/view';

export type PageCommand =
  | { type: 'PING' }
  | { type: 'CAPTURE' }
  | { type: 'RESTORE'; controls: CapturedSetting[]; timeoutMs?: number; deadlineAt?: number };

export interface PingResponse {
  status: 'ok';
  pong: true;
}

export interface CaptureResponse {
  status: 'ok';
  data: import('@/capture/controls').CaptureResult;
}

export interface RestoreResponse {
  status: 'ok';
  data: import('@/restoration/restore').RestoreReport;
}

export type BackgroundCommand =
  | { type: 'START_APPLY'; tabId: number; view: import('@/domain/view').SavedView }
  | { type: 'GET_LAST_APPLY_RESULT'; tabId: number }
  | { type: 'TRACK_ANALYTICS'; event: import('@/analytics').AnalyticsEvent; properties?: Record<string, number | string> };
