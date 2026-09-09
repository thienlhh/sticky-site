import type { CapturedSetting } from '@/domain/view';

export type PageCommand =
  | { type: 'PING' }
  | { type: 'CAPTURE' }
  | { type: 'RESTORE'; controls: CapturedSetting[] };

export interface PingResponse {
  status: 'ok';
  pong: true;
}
