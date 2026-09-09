import '@testing-library/jest-dom/vitest';

// Safe default mock for chrome APIs in tests
if (typeof (globalThis as any).chrome === 'undefined') {
  const store: Record<string, unknown> = {
    stickysite_onboarding_completed: true,
  };
    const sessionStore: Record<string, unknown> = {};
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
          Object.assign(store, items);
        },
        remove: async (key: string | string[]) => {
          if (typeof key === 'string') delete store[key];
          if (Array.isArray(key)) {
            for (const k of key) delete store[k];
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
    },
    tabs: {
      query: async () => [],
      sendMessage: async () => {},
    },
    permissions: {
      contains: async () => false,
      request: async () => false,
    },
    scripting: {
      executeScript: async () => [],
    },
    runtime: {
      onMessage: {
        addListener: () => {},
        removeListener: () => {},
      },
    },
  };
}
