import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { StickySiteLogo } from '@/components/StickySiteLogo';
import { listViews, createView } from '@/storage/views';
import { normalizePathname, type CapturedSetting, type SavedView } from '@/domain/view';

export interface SaveViewProps {
  origin: string;
  pathname: string;
  queryParams: Record<string, string[]>;
  controls: CapturedSetting[];
  onSaved: (view: SavedView) => void;
  onCancel: () => void;
}

export function SaveView({
  origin,
  pathname,
  queryParams,
  controls,
  onSaved,
  onCancel,
}: SaveViewProps) {
  const [name, setName] = useState<string>('');
  const [existingViews, setExistingViews] = useState<SavedView[]>([]);
  const [error, setError] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  const normalizedPath = normalizePathname(pathname);

  useEffect(() => {
    listViews().then(setExistingViews).catch(() => { });
  }, []);

  const handleNameChange = (val: string) => {
    setName(val);
    const trimmed = val.trim();

    if (val.length > 60) {
      setError('View name must be 60 characters or fewer.');
      return;
    }

    if (!trimmed) {
      setError('');
      return;
    }

    const collision = existingViews.some(
      (v) =>
        v.origin === origin &&
        normalizePathname(v.pathname) === normalizedPath &&
        v.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (collision) {
      setError(`A view named "${trimmed}" already exists for this page.`);
    } else {
      setError('');
    }
  };

  const isFormValid =
    name.trim().length >= 1 && name.length <= 60 && !error && !isSaving;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isFormValid) return;

    setIsSaving(true);
    try {
      const now = new Date().toISOString();
      const newView: SavedView = {
        schemaVersion: 1,
        id: crypto.randomUUID(),
        name: name.trim(),
        origin,
        pathname: normalizedPath,
        queryParams,
        controls,
        createdAt: now,
        updatedAt: now,
      };

      await createView(newView);
      onSaved(newView);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save view');
    } finally {
      setIsSaving(false);
    }
  };

  const totalSettingsCount = controls.length + Object.keys(queryParams).length;

  return (
    <form onSubmit={handleSave} className="flex flex-col h-full justify-between">
      <header className="border-b border-slate-200 pb-2 mb-3 flex items-center gap-2">
        <StickySiteLogo className="h-7 w-7 shrink-0" />
        <div>
          <h2 className="text-base font-bold text-slate-900">Name Your View</h2>
          <p className="text-xs text-slate-500">
            Saving {totalSettingsCount} setting{totalSettingsCount === 1 ? '' : 's'} for {normalizedPath}
          </p>
        </div>
      </header>

      <div className="flex-1 space-y-3">
        <div>
          <Label htmlFor="view-name-input" className="block mb-2.5">
            View Name
          </Label>
          <Input
            id="view-name-input"
            type="text"
            placeholder="e.g. In Stock Under $100"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={65}
            autoFocus
          />
          <div className="flex justify-between items-center text-xs mt-1.5">
            {error ? (
              <p role="alert" className="text-red-600 font-medium">
                {error}
              </p>
            ) : (
              <span className="text-slate-600">1–60 characters</span>
            )}
            <span
              className={
                name.length > 60 ? 'text-red-600 font-bold' : 'text-slate-600'
              }
            >
              {name.length}/60
            </span>
          </div>
        </div>
      </div>

      <footer className="pt-2.5 border-t border-slate-200 mt-2.5 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isSaving}
          className="flex-1"
        >
          Back
        </Button>
        <Button
          type="submit"
          disabled={!isFormValid}
          className="flex-1"
        >
          {isSaving ? 'Saving...' : 'Save View'}
        </Button>
      </footer>
    </form>
  );
}
