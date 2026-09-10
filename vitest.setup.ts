import '@testing-library/jest-dom/vitest';

if (typeof window !== 'undefined') {
  window.close = () => {};
}

// Safe default mock for chrome APIs in tests
if (typeof (globalThis as any).chrome === 'undefined') {
  const store: Record<string, unknown> = {
    stickysite_onboarding_completed: true,
  };
    const sessionStore: Record<string, unknown> = {};
    const storageListeners = new Set<(changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void>();
    const badgeTextMap = new Map<number | 'global', string>();
    const badgeBgColorMap = new Map<number | 'global', string>();
    const badgeTextColorMap = new Map<number | 'global', string>();

    (globalThis as any).chrome = {
    storage: {
      local: {
        get: async (key?: string | string[] | null) => {
          if (!key) return { ...store };
          if (typeof key === 'string') return { [key]: store[key] };
          if (Array.isArray(key)) {
            const res: Record<string, unknown> = {};
            for (const k of key) res[k] = store[k];
            return res;
          }
          return {};
        },
        set: async (items: Record<string, unknown>) => {
          const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
          for (const [k, v] of Object.entries(items)) {
            changes[k] = { oldValue: store[k], newValue: v };
            store[k] = v;
          }
          for (const cb of storageListeners) {
            try { cb(changes, 'local'); } catch {}
          }
        },
        remove: async (key: string | string[]) => {
          const keys = typeof key === 'string' ? [key] : Array.isArray(key) ? key : [];
          const changes: Record<string, { oldValue?: unknown; newValue?: unknown }> = {};
          for (const k of keys) {
            changes[k] = { oldValue: store[k], newValue: undefined };
            delete store[k];
          }
          for (const cb of storageListeners) {
            try { cb(changes, 'local'); } catch {}
          }
        },
        clear: async () => {
          for (const k of Object.keys(store)) delete store[k];
        },
      },
      session: {
        get: async (key?: string | string[] | null) => {
          if (!key) return { ...sessionStore };
          if (typeof key === 'string') return { [key]: sessionStore[key] };
          if (Array.isArray(key)) {
            const res: Record<string, unknown> = {};
            for (const k of key) res[k] = sessionStore[k];
            return res;
          }
          return {};
        },
        set: async (items: Record<string, unknown>) => {
          Object.assign(sessionStore, items);
        },
        remove: async (key: string | string[]) => {
          if (typeof key === 'string') delete sessionStore[key];
          if (Array.isArray(key)) {
            for (const k of key) delete sessionStore[k];
          }
        },
        clear: async () => {
          for (const k of Object.keys(sessionStore)) delete sessionStore[k];
        },
      },
      onChanged: {
        addListener: (cb: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void) => {
          storageListeners.add(cb);
        },
        removeListener: (cb: (changes: Record<string, { oldValue?: unknown; newValue?: unknown }>, area: string) => void) => {
          storageListeners.delete(cb);
        },
      },
    },
    action: {
      setBadgeText: async ({ text, tabId }: { text: string; tabId?: number }) => {
        badgeTextMap.set(tabId ?? 'global', text);
      },
      getBadgeText: async ({ tabId }: { tabId?: number } = {}) => {
        return badgeTextMap.get(tabId ?? 'global') ?? '';
      },
      setBadgeBackgroundColor: async ({ color, tabId }: { color: string | [number, number, number, number]; tabId?: number }) => {
        badgeBgColorMap.set(tabId ?? 'global', String(color));
      },
      setBadgeTextColor: async ({ color, tabId }: { color: string; tabId?: number }) => {
        badgeTextColorMap.set(tabId ?? 'global', color);
      },
    },
    tabs: {
      query: async () => [],
      get: async (tabId: number) => ({ id: tabId, url: '' }),
      update: async (tabId: number, updateProperties: Record<string, unknown>) => ({ id: tabId, ...updateProperties }),
      sendMessage: async () => {},
      onActivated: {
        addListener: () => {},
        removeListener: () => {},
      },
      onUpdated: {
        addListener: () => {},
        removeListener: () => {},
      },
      onRemoved: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
    permissions: {
      contains: async () => false,
      request: async () => false,
    },
    scripting: {
      executeScript: async () => [],
    },
    runtime: {
      getURL: (path: string) => `chrome-extension://mock-id${path.startsWith('/') ? path : '/' + path}`,
      onMessage: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
  };
}
