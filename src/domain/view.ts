export type StoredValue = string | boolean | string[];

export type ControlKind =
  | 'text'
  | 'number'
  | 'range'
  | 'date'
  | 'checkbox'
  | 'radio'
  | 'select-one'
  | 'select-multiple'
  | 'aria-state';

export const VALID_CONTROL_KINDS: ReadonlySet<ControlKind> = new Set<ControlKind>([
  'text',
  'number',
  'range',
  'date',
  'checkbox',
  'radio',
  'select-one',
  'select-multiple',
  'aria-state',
]);

export interface PageKey {
  origin: string;
  pathname: string;
}

export interface Fingerprint {
  kind: ControlKind;
  tag: string;
  type?: string;
  role?: string;
  label: string;
  name?: string;
  id?: string;
  semanticAttribute?: string;
  options?: string[];
  region?: string;
  ordinal: number;
}

export interface CapturedSetting {
  id: string;
  label: string;
  value: StoredValue;
  fingerprint: Fingerprint;
}

export interface SavedView extends PageKey {
  schemaVersion: 1;
  id: string;
  name: string;
  queryParams: Record<string, string[]>;
  controls: CapturedSetting[];
  createdAt: string;
  updatedAt: string;
}

export function normalizePathname(pathname: string): string {
  if (!pathname || pathname === '/') return '/';
  let norm = pathname.trim();
  if (!norm.startsWith('/')) norm = `/${norm}`;
  // Strip trailing slashes
  while (norm.length > 1 && norm.endsWith('/')) {
    norm = norm.slice(0, -1);
  }
  return norm;
}

function isValidIsoTimestamp(str: string): boolean {
  if (typeof str !== 'string') return false;
  // Strict check for ISO 8601 format e.g. YYYY-MM-DDTHH:mm:ss.sssZ or similar
  const isoRegex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?(Z|[+-]\d{2}:\d{2})$/;
  if (!isoRegex.test(str)) return false;
  const parsed = Date.parse(str);
  return !Number.isNaN(parsed);
}

function parseFingerprint(input: unknown): Fingerprint {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid fingerprint: must be an object');
  }
  const fp = input as Record<string, unknown>;
  if (typeof fp.kind !== 'string' || !VALID_CONTROL_KINDS.has(fp.kind as ControlKind)) {
    throw new Error(`Invalid control kind in fingerprint: ${String(fp.kind)}`);
  }
  if (typeof fp.tag !== 'string' || !fp.tag.trim()) {
    throw new Error('Invalid tag in fingerprint');
  }
  if (typeof fp.label !== 'string') {
    throw new Error('Invalid label in fingerprint');
  }
  if (typeof fp.ordinal !== 'number' || fp.ordinal < 0) {
    throw new Error('Invalid ordinal in fingerprint');
  }

  const result: Fingerprint = {
    kind: fp.kind as ControlKind,
    tag: fp.tag,
    label: fp.label,
    ordinal: fp.ordinal,
  };

  if (typeof fp.type === 'string') result.type = fp.type;
  if (typeof fp.role === 'string') result.role = fp.role;
  if (typeof fp.name === 'string') result.name = fp.name;
  if (typeof fp.id === 'string') result.id = fp.id;
  if (typeof fp.semanticAttribute === 'string') result.semanticAttribute = fp.semanticAttribute;
  if (Array.isArray(fp.options)) {
    result.options = fp.options.map((o) => String(o));
  }
  if (typeof fp.region === 'string') result.region = fp.region;

  return result;
}

function parseCapturedSetting(input: unknown): CapturedSetting {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid captured setting: must be an object');
  }
  const cs = input as Record<string, unknown>;
  if (typeof cs.id !== 'string' || !cs.id.trim()) {
    throw new Error('Invalid setting id');
  }
  if (typeof cs.label !== 'string') {
    throw new Error('Invalid setting label');
  }
  if (
    typeof cs.value !== 'string' &&
    typeof cs.value !== 'boolean' &&
    !Array.isArray(cs.value)
  ) {
    throw new Error('Invalid setting value');
  }

  const fingerprint = parseFingerprint(cs.fingerprint);

  let val: StoredValue;
  if (Array.isArray(cs.value)) {
    val = cs.value.map((v) => String(v));
  } else {
    val = cs.value;
  }

  return {
    id: cs.id,
    label: cs.label,
    value: val,
    fingerprint,
  };
}

export function parseSavedView(input: unknown): SavedView {
  if (!input || typeof input !== 'object') {
    throw new Error('Invalid view: must be an object');
  }
  const raw = input as Record<string, unknown>;

  if (raw.schemaVersion !== 1) {
    throw new Error(`Unsupported schemaVersion: ${String(raw.schemaVersion)}. Expected 1.`);
  }

  if (typeof raw.id !== 'string' || !raw.id.trim()) {
    throw new Error('Invalid view id: must be non-empty string');
  }

  if (typeof raw.name !== 'string' || !raw.name.trim()) {
    throw new Error('Invalid view name: must be non-empty string');
  }

  if (typeof raw.origin !== 'string' || !raw.origin.trim()) {
    throw new Error('Invalid view origin: must be non-empty string');
  }

  if (typeof raw.pathname !== 'string') {
    throw new Error('Invalid view pathname: must be string');
  }

  if (!isValidIsoTimestamp(String(raw.createdAt))) {
    throw new Error(`Invalid createdAt timestamp: ${String(raw.createdAt)}`);
  }

  if (!isValidIsoTimestamp(String(raw.updatedAt))) {
    throw new Error(`Invalid updatedAt timestamp: ${String(raw.updatedAt)}`);
  }

  // Parse queryParams preserving repeated values
  const queryParams: Record<string, string[]> = {};
  if (raw.queryParams && typeof raw.queryParams === 'object') {
    for (const [key, val] of Object.entries(raw.queryParams as Record<string, unknown>)) {
      if (Array.isArray(val)) {
        queryParams[key] = val.map((item) => String(item));
      } else if (typeof val === 'string') {
        queryParams[key] = [val];
      }
    }
  }

  // Parse controls
  if (!Array.isArray(raw.controls)) {
    throw new Error('Invalid view controls: must be an array');
  }
  const controls = raw.controls.map(parseCapturedSetting);

  return {
    schemaVersion: 1,
    id: raw.id.trim(),
    name: raw.name.trim(),
    origin: raw.origin.trim(),
    pathname: normalizePathname(raw.pathname),
    queryParams,
    controls,
    createdAt: String(raw.createdAt),
    updatedAt: String(raw.updatedAt),
  };
}

export function validateUniqueViewName(
  existingViews: SavedView[],
  name: string,
  origin: string,
  pathname: string,
  currentId?: string
): void {
  const trimmedName = name.trim();
  if (!trimmedName) {
    throw new Error('View name cannot be empty');
  }
  const normPath = normalizePathname(pathname);
  const targetLower = trimmedName.toLowerCase();

  const collision = existingViews.some(
    (v) =>
      v.id !== currentId &&
      v.origin === origin &&
      normalizePathname(v.pathname) === normPath &&
      v.name.trim().toLowerCase() === targetLower
  );

  if (collision) {
    throw new Error(`A view named "${trimmedName}" already exists for this page`);
  }
}
