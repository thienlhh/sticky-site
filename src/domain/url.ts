import { normalizePathname } from './view';

export const SENSITIVE_QUERY_PARAMS = new Set<string>([
  'auth',
  'authorization',
  'token',
  'access_token',
  'accesstoken',
  'refresh_token',
  'refreshtoken',
  'session',
  'sessionid',
  'sid',
  'jwt',
  'secret',
  'signature',
  'sig',
  'password',
  'passcode',
  'otp',
  'code',
]);

export function isSensitiveQueryParam(name: string): boolean {
  return SENSITIVE_QUERY_PARAMS.has(name.toLowerCase());
}

export function captureQueryParams(url: URL): Record<string, string[]> {
  const params: Record<string, string[]> = {};

  for (const [key, value] of url.searchParams.entries()) {
    if (isSensitiveQueryParam(key)) {
      continue;
    }
    if (!params[key]) {
      params[key] = [];
    }
    params[key].push(value);
  }

  return params;
}

export function replaceEligibleQuery(
  currentUrl: URL,
  saved: Record<string, string[]>,
  targetBaseUrl?: URL
): URL {
  if (targetBaseUrl) {
    if (targetBaseUrl.origin !== currentUrl.origin) {
      throw new Error(
        `Cross-origin query replacement not allowed: ${currentUrl.origin} vs ${targetBaseUrl.origin}`
      );
    }
    if (normalizePathname(targetBaseUrl.pathname) !== normalizePathname(currentUrl.pathname)) {
      throw new Error(
        `Cross-path query replacement not allowed: ${currentUrl.pathname} vs ${targetBaseUrl.pathname}`
      );
    }
  }

  // Preserve existing sensitive params on the current URL
  const preservedSensitive: [string, string][] = [];
  for (const [k, v] of currentUrl.searchParams.entries()) {
    if (isSensitiveQueryParam(k)) {
      preservedSensitive.push([k, v]);
    }
  }

  const nextUrl = new URL(currentUrl.toString());
  nextUrl.search = '';

  // Add saved eligible params
  for (const [k, values] of Object.entries(saved)) {
    if (isSensitiveQueryParam(k)) {
      continue;
    }
    for (const val of values) {
      nextUrl.searchParams.append(k, val);
    }
  }

  // Re-append preserved sensitive params
  for (const [k, val] of preservedSensitive) {
    nextUrl.searchParams.append(k, val);
  }

  // Current fragment remains untouched (URL constructor preserved nextUrl.hash)
  return nextUrl;
}

export interface QueryVerificationResult {
  restoredCount: number;
  totalAttempted: number;
  failedCount: number;
}

export function verifyQueryParams(
  currentUrl: URL,
  savedQueryParams: Record<string, string[]>
): QueryVerificationResult {
  const eligibleEntries = Object.entries(savedQueryParams).filter(
    ([k]) => !isSensitiveQueryParam(k)
  );
  const totalAttempted = eligibleEntries.length;
  let restoredCount = 0;
  let failedCount = 0;

  for (const [key, expectedVals] of eligibleEntries) {
    const currentVals = currentUrl.searchParams.getAll(key);
    if (
      currentVals.length === expectedVals.length &&
      currentVals.every((val, idx) => val === expectedVals[idx])
    ) {
      restoredCount++;
    } else {
      failedCount++;
    }
  }

  // Check for extraneous eligible query parameters that were not removed
  let hasExtra = false;
  for (const key of currentUrl.searchParams.keys()) {
    if (!isSensitiveQueryParam(key) && !(key in savedQueryParams)) {
      hasExtra = true;
      break;
    }
  }

  if (hasExtra) {
    if (restoredCount > 0) {
      restoredCount = Math.max(0, restoredCount - 1);
    }
    failedCount++;
  }

  return {
    restoredCount,
    totalAttempted,
    failedCount,
  };
}

