import {
  parseSavedView,
  validateUniqueViewName,
  type SavedView,
} from '@/domain/view';

export const STORAGE_KEY = 'stickysite_saved_views';

interface ViewsStorageContainer {
  version: number;
  views: unknown[];
}

export async function listViews(): Promise<SavedView[]> {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  const container = result[STORAGE_KEY] as ViewsStorageContainer | undefined;

  if (!container) {
    return [];
  }

  if (container.version !== 1) {
    throw new Error(
      `Unsupported storage schema version: ${container.version}. Expected version 1.`
    );
  }

  if (!Array.isArray(container.views)) {
    return [];
  }

  return container.views.map(parseSavedView);
}

export async function createView(view: SavedView): Promise<void> {
  const validated = parseSavedView(view);
  const current = await listViews();

  if (current.some((v) => v.id === validated.id)) {
    throw new Error(`View with ID ${validated.id} already exists`);
  }

  validateUniqueViewName(
    current,
    validated.name,
    validated.origin,
    validated.pathname
  );

  const updatedViews = [...current, validated];
  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      version: 1,
      views: updatedViews,
    },
  });
}

export async function replaceView(view: SavedView): Promise<void> {
  const validated = parseSavedView(view);
  const current = await listViews();

  const index = current.findIndex((v) => v.id === validated.id);
  if (index === -1) {
    throw new Error(`View with ID ${validated.id} not found`);
  }

  validateUniqueViewName(
    current,
    validated.name,
    validated.origin,
    validated.pathname,
    validated.id
  );

  const updatedViews = [...current];
  updatedViews[index] = validated;

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      version: 1,
      views: updatedViews,
    },
  });
}

export async function renameView(
  id: string,
  name: string,
  now: string
): Promise<void> {
  const current = await listViews();
  const index = current.findIndex((v) => v.id === id);

  if (index === -1) {
    throw new Error(`View with ID ${id} not found`);
  }

  const existing = current[index];

  validateUniqueViewName(
    current,
    name,
    existing.origin,
    existing.pathname,
    id
  );

  const updatedView: SavedView = {
    ...existing,
    name: name.trim(),
    updatedAt: now,
  };

  const updatedViews = [...current];
  updatedViews[index] = updatedView;

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      version: 1,
      views: updatedViews,
    },
  });
}

export async function deleteView(id: string): Promise<void> {
  const current = await listViews();
  const index = current.findIndex((v) => v.id === id);

  if (index === -1) {
    throw new Error(`View with ID ${id} not found`);
  }

  const updatedViews = current.filter((v) => v.id !== id);

  await chrome.storage.local.set({
    [STORAGE_KEY]: {
      version: 1,
      views: updatedViews,
    },
  });
}
