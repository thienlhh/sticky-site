export type AnalyticsEvent =
  | 'extension_installed'
  | 'site_permission_granted'
  | 'save_view_started'
  | 'view_created'
  | 'view_apply_started'
  | 'view_apply_full'
  | 'view_apply_partial'
  | 'view_apply_failed'
  | 'view_updated'
  | 'view_deleted';

export const ALLOWED_EVENTS = new Set<AnalyticsEvent>([
  'extension_installed',
  'site_permission_granted',
  'save_view_started',
  'view_created',
  'view_apply_started',
  'view_apply_full',
  'view_apply_partial',
  'view_apply_failed',
  'view_updated',
  'view_deleted',
]);

export interface AnalyticsAdapter {
  send(event: AnalyticsEvent, properties: Record<string, number | string>): Promise<void>;
}

export const ALLOWED_PROPERTIES = new Set<string>([
  'installationId',
  'extensionVersion',
  'timestamp',
  'capturedCount',
  'attemptedCount',
  'restoredCount',
  'skippedCount',
  'distinctSiteBucket',
  'failureCategory',
]);

const STORAGE_KEY_ENABLED = 'analytics_enabled';
const STORAGE_KEY_INSTALL_ID = 'analytics_install_id';

let currentAdapter: AnalyticsAdapter | null = null;

export function setAnalyticsAdapter(adapter: AnalyticsAdapter | null): void {
  currentAdapter = adapter;
}

export function isAdapterConfigured(): boolean {
  return currentAdapter !== null;
}

export function createHttpAdapter(
  endpoint: string,
  fetchFn: typeof fetch = globalThis.fetch
): AnalyticsAdapter {
  return {
    async send(event: AnalyticsEvent, properties: Record<string, number | string>): Promise<void> {
      await fetchFn(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event,
          ...properties,
        }),
      });
    },
  };
}

export function validateEvent(event: unknown): asserts event is AnalyticsEvent {
  if (typeof event !== 'string' || !ALLOWED_EVENTS.has(event as AnalyticsEvent)) {
    throw new Error(`Prohibited or unknown analytics event: "${String(event)}"`);
  }
}

export function validatePayload(
  properties: Record<string, number | string>
): Record<string, number | string> {
  const validated: Record<string, number | string> = {};

  for (const [key, value] of Object.entries(properties)) {
    if (!ALLOWED_PROPERTIES.has(key)) {
      throw new Error(`Prohibited analytics property: "${key}"`);
    }

    if (typeof value === 'string') {
      const lower = value.toLowerCase();
      if (lower.startsWith('http://') || lower.startsWith('https://') || lower.includes('://')) {
        throw new Error(`Prohibited URL content in analytics property: "${key}"`);
      }
    }

    validated[key] = value;
  }

  return validated;
}

export async function isAnalyticsEnabled(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return true;
  }
  const res = await chrome.storage.local.get(STORAGE_KEY_ENABLED);
  return res[STORAGE_KEY_ENABLED] !== false;
}

export async function setAnalyticsEnabled(enabled: boolean): Promise<void> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) return;
  await chrome.storage.local.set({ [STORAGE_KEY_ENABLED]: enabled });
}

export async function getInstallationId(): Promise<string> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return '00000000-0000-0000-0000-000000000000';
  }
  const res = await chrome.storage.local.get(STORAGE_KEY_INSTALL_ID);
  if (res[STORAGE_KEY_INSTALL_ID] && typeof res[STORAGE_KEY_INSTALL_ID] === 'string') {
    return res[STORAGE_KEY_INSTALL_ID];
  }

  const newId = crypto.randomUUID();
  await chrome.storage.local.set({ [STORAGE_KEY_INSTALL_ID]: newId });
  return newId;
}

export async function clearInstallationId(): Promise<string> {
  const newId = crypto.randomUUID();
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY_INSTALL_ID]: newId });
  }
  return newId;
}

export function calculateDistinctSiteBucket(distinctCount: number): string {
  if (distinctCount <= 0) return '0';
  if (distinctCount === 1) return '1';
  if (distinctCount <= 5) return '2-5';
  if (distinctCount <= 10) return '6-10';
  return '10+';
}

export async function track(
  event: AnalyticsEvent,
  properties: Record<string, number | string> = {}
): Promise<void> {
  validateEvent(event);
  const enabled = await isAnalyticsEnabled();
  if (!enabled) {
    return;
  }

  const validatedProps = validatePayload(properties);
  const installationId = await getInstallationId();

  const fullPayload: Record<string, number | string> = {
    ...validatedProps,
    installationId,
    extensionVersion: '1.0.0',
    timestamp: new Date().toISOString(),
  };

  if (currentAdapter) {
    await currentAdapter.send(event, fullPayload);
  }
}

export type DeliveryStatus = 'delivered' | 'disabled' | 'unconfigured' | 'failed';

export interface AnalyticsDeliveryResult {
  delivery: DeliveryStatus;
}

export async function emitAnalyticsEvent(
  event: AnalyticsEvent,
  properties: Record<string, number | string> = {}
): Promise<AnalyticsDeliveryResult> {
  validateEvent(event);
  validatePayload(properties);

  if (typeof chrome !== 'undefined' && chrome.runtime?.sendMessage) {
    return new Promise<AnalyticsDeliveryResult>((resolve, reject) => {
      chrome.runtime.sendMessage(
        { type: 'TRACK_ANALYTICS', event, properties },
        (response) => {
          if (chrome.runtime.lastError) {
            resolve({ delivery: 'unconfigured' });
          } else if (response?.status === 'error') {
            reject(new Error(response.error));
          } else {
            resolve({ delivery: response?.delivery || 'delivered' });
          }
        }
      );
    });
  }

  const enabled = await isAnalyticsEnabled();
  if (!enabled) return { delivery: 'disabled' };
  if (!isAdapterConfigured()) return { delivery: 'unconfigured' };
  await track(event, properties);
  return { delivery: 'delivered' };
}

