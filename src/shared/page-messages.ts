import type { CapturedSetting } from '@/domain/view';

export type PageCommand =
  | { type: 'PING' }
  | { type: 'CAPTURE' }
  | { type: 'RESTORE'; controls: CapturedSetting[] };

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
