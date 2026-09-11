import { useState, useEffect, useCallback, useRef } from 'react';
import {
  listViews,
  createView,
  replaceView,
  renameView,
  deleteView,
  STORAGE_KEY,
} from '@/storage/views';
import type { SavedView } from '@/domain/view';

export interface UseSavedViewsResult {
  allViews: SavedView[];
  storageError: string | null;
  refreshViews: () => Promise<void>;
  saveViewItem: (view: SavedView) => Promise<void>;
  updateViewItem: (view: SavedView) => Promise<void>;
  renameViewItem: (id: string, newName: string) => Promise<void>;
  deleteViewItem: (id: string) => Promise<void>;
}

export function useSavedViews(onStorageError?: (errorMsg: string) => void): UseSavedViewsResult {
  const [allViews, setAllViews] = useState<SavedView[]>([]);
  const [storageError, setStorageError] = useState<string | null>(null);
  const errorCallbackRef = useRef(onStorageError);

  useEffect(() => {
    errorCallbackRef.current = onStorageError;
  }, [onStorageError]);

  const refreshViews = useCallback(async () => {
    try {
      const views = await listViews();
      setAllViews(views);
      setStorageError(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Failed to load saved views.';
      setStorageError(msg);
      errorCallbackRef.current?.(msg);
    }
  }, []);

  useEffect(() => {
    refreshViews();

    const handleStorageChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      areaName: string
    ) => {
      if (areaName === 'local' && changes[STORAGE_KEY]) {
        refreshViews();
      }
    };

    chrome.storage?.onChanged?.addListener(handleStorageChange);
    return () => {
      chrome.storage?.onChanged?.removeListener(handleStorageChange);
    };
  }, [refreshViews]);

  const saveViewItem = useCallback(async (view: SavedView) => {
    await createView(view);
    await refreshViews();
  }, [refreshViews]);

  const updateViewItem = useCallback(async (view: SavedView) => {
    await replaceView(view);
    await refreshViews();
  }, [refreshViews]);

  const renameViewItem = useCallback(async (id: string, newName: string) => {
    await renameView(id, newName, new Date().toISOString());
    await refreshViews();
  }, [refreshViews]);

  const deleteViewItem = useCallback(async (id: string) => {
    await deleteView(id);
    await refreshViews();
  }, [refreshViews]);

  return {
    allViews,
    storageError,
    refreshViews,
    saveViewItem,
    updateViewItem,
    renameViewItem,
    deleteViewItem,
  };
}
