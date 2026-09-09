import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  listViews,
  createView,
  replaceView,
  renameView,
  deleteView,
  STORAGE_KEY,
} from './views';
import type { SavedView } from '@/domain/view';

describe('storage/views', () => {
  let mockStore: Record<string, unknown> = {};

  const sampleView1: SavedView = {
    schemaVersion: 1,
    id: '11111111-1111-1111-1111-111111111111',
    name: 'Search Shoes',
    origin: 'https://example.com',
    pathname: '/search',
    queryParams: { q: ['shoes'] },
    controls: [],
    createdAt: '2026-09-09T10:00:00.000Z',
    updatedAt: '2026-09-09T10:00:00.000Z',
  };

  const sampleView2: SavedView = {
    schemaVersion: 1,
    id: '22222222-2222-2222-2222-222222222222',
    name: 'Search Hats',
    origin: 'https://example.com',
    pathname: '/search',
    queryParams: { q: ['hats'] },
    controls: [],
    createdAt: '2026-09-09T10:05:00.000Z',
    updatedAt: '2026-09-09T10:05:00.000Z',
  };

  beforeEach(() => {
    mockStore = {};
    const fakeChrome = {
      storage: {
        local: {
          get: vi.fn(async (key?: string | string[] | null) => {
            if (!key) return { ...mockStore };
            if (typeof key === 'string') {
              return { [key]: mockStore[key] };
            }
            if (Array.isArray(key)) {
              const res: Record<string, unknown> = {};
              for (const k of key) res[k] = mockStore[k];
              return res;
            }
            return {};
          }),
          set: vi.fn(async (items: Record<string, unknown>) => {
            Object.assign(mockStore, items);
          }),
          remove: vi.fn(async (key: string | string[]) => {
            if (typeof key === 'string') delete mockStore[key];
            if (Array.isArray(key)) {
              for (const k of key) delete mockStore[k];
            }
          }),
          clear: vi.fn(async () => {
            mockStore = {};
          }),
        },
      },
      runtime: {},
    };
    // @ts-ignore
    globalThis.chrome = fakeChrome;
  });

  describe('listViews', () => {
    it('returns empty array when storage is empty', async () => {
      const views = await listViews();
      expect(views).toEqual([]);
    });

    it('returns saved views from storage', async () => {
      mockStore[STORAGE_KEY] = {
        version: 1,
        views: [sampleView1, sampleView2],
      };
      const views = await listViews();
      expect(views).toHaveLength(2);
      expect(views[0].name).toBe('Search Shoes');
    });

    it('throws when encountering unsupported future storage schema version', async () => {
      mockStore[STORAGE_KEY] = {
        version: 99,
        views: [sampleView1],
      };
      await expect(listViews()).rejects.toThrow(/unsupported.*schema/i);
    });
  });

  describe('createView', () => {
    it('creates and persists a valid view', async () => {
      await createView(sampleView1);
      const views = await listViews();
      expect(views).toHaveLength(1);
      expect(views[0]).toEqual(sampleView1);
    });

    it('rejects invalid view schema before writing', async () => {
      const invalidView = { ...sampleView1, schemaVersion: 2 } as any;
      await expect(createView(invalidView)).rejects.toThrow();
      expect(await listViews()).toHaveLength(0);
    });

    it('rejects duplicate ID', async () => {
      await createView(sampleView1);
      const duplicateIdView = {
        ...sampleView1,
        name: 'Different Name',
      };
      await expect(createView(duplicateIdView)).rejects.toThrow(/id.*already exists/i);
    });

    it('rejects duplicate view name on the same page', async () => {
      await createView(sampleView1);
      const duplicateNameView = {
        ...sampleView2,
        name: 'search shoes', // case-insensitive duplicate
      };
      await expect(createView(duplicateNameView)).rejects.toThrow(/already exists/i);
    });

    it('allows same view name on a different page or origin', async () => {
      await createView(sampleView1);
      const diffPageView = {
        ...sampleView2,
        name: 'Search Shoes',
        pathname: '/categories',
      };
      await expect(createView(diffPageView)).resolves.not.toThrow();
      expect(await listViews()).toHaveLength(2);
    });
  });

  describe('replaceView', () => {
    it('replaces an existing view by ID and updates controls and queryParams', async () => {
      await createView(sampleView1);
      const updated: SavedView = {
        ...sampleView1,
        queryParams: { q: ['shoes'], filter: ['sale'] },
        updatedAt: '2026-09-09T10:10:00.000Z',
      };
      await replaceView(updated);
      const views = await listViews();
      expect(views).toHaveLength(1);
      expect(views[0].queryParams.filter).toEqual(['sale']);
    });

    it('rejects replaceView if view ID does not exist', async () => {
      await expect(replaceView(sampleView1)).rejects.toThrow(/not found/i);
    });

    it('rejects if new name collides with another view on the same page', async () => {
      await createView(sampleView1);
      await createView(sampleView2);
      const colliding = {
        ...sampleView2,
        name: 'search shoes',
      };
      await expect(replaceView(colliding)).rejects.toThrow(/already exists/i);
    });

    it('preserves original view in storage when validation fails during replaceView', async () => {
      await createView(sampleView1);
      const invalidUpdate = {
        ...sampleView1,
        name: '', // invalid empty name
      } as any;
      await expect(replaceView(invalidUpdate)).rejects.toThrow();
      const views = await listViews();
      expect(views).toHaveLength(1);
      expect(views[0]).toEqual(sampleView1);
    });
  });

  describe('renameView', () => {
    it('renames an existing view and updates timestamp', async () => {
      await createView(sampleView1);
      const newTime = '2026-09-09T10:20:00.000Z';
      await renameView(sampleView1.id, 'Renamed Shoes', newTime);
      const views = await listViews();
      expect(views[0].name).toBe('Renamed Shoes');
      expect(views[0].updatedAt).toBe(newTime);
    });

    it('rejects renameView if view does not exist', async () => {
      await expect(renameView('unknown-id', 'New Name', '2026-09-09T10:00:00.000Z')).rejects.toThrow(
        /not found/i
      );
    });

    it('rejects renameView if name is duplicate on page', async () => {
      await createView(sampleView1);
      await createView(sampleView2);
      await expect(
        renameView(sampleView2.id, 'SEARCH SHOES', '2026-09-09T10:20:00.000Z')
      ).rejects.toThrow(/already exists/i);
    });
  });

  describe('deleteView', () => {
    it('deletes an existing view by ID', async () => {
      await createView(sampleView1);
      await createView(sampleView2);
      await deleteView(sampleView1.id);
      const views = await listViews();
      expect(views).toHaveLength(1);
      expect(views[0].id).toBe(sampleView2.id);
    });

    it('throws if trying to delete a non-existent view', async () => {
      await expect(deleteView('unknown-id')).rejects.toThrow(/not found/i);
    });
  });

  describe('quota and failed-write preservation', () => {
    it('preserves existing views if storage.set fails due to quota or error', async () => {
      await createView(sampleView1);

      // Simulate quota failure on next write
      const originalSet = chrome.storage.local.set;
      chrome.storage.local.set = vi.fn(async () => {
        throw new Error('QUOTA_BYTES quota exceeded');
      });

      await expect(createView(sampleView2)).rejects.toThrow(/QUOTA_BYTES/i);

      // Restore set and verify existing view was preserved untouched
      chrome.storage.local.set = originalSet;
      const views = await listViews();
      expect(views).toHaveLength(1);
      expect(views[0]).toEqual(sampleView1);
    });
  });
});
