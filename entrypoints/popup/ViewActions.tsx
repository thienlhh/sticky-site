import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertDialog } from '@/components/ui/alert-dialog';
import { normalizePathname, type SavedView } from '@/domain/view';

export type ViewAction =
  | { type: 'rename'; view: SavedView }
  | { type: 'delete'; view: SavedView }
  | { type: 'update'; view: SavedView };

export interface ViewActionsProps {
  action: ViewAction;
  activeOrigin: string;
  activePathname: string;
  allViews: SavedView[];
  onClose: () => void;
  onRenameSubmit: (id: string, newName: string) => void;
  onDeleteConfirm: (id: string) => void;
  onUpdateConfirm: (view: SavedView) => void;
}

export function ViewActions({
  action,
  activeOrigin,
  activePathname,
  allViews,
  onClose,
  onRenameSubmit,
  onDeleteConfirm,
  onUpdateConfirm,
}: ViewActionsProps) {
  const [name, setName] = useState<string>(action.view.name);
  const [renameError, setRenameError] = useState<string>('');

  const normPath = normalizePathname(activePathname);

  if (action.type === 'delete') {
    return (
      <AlertDialog
        open={true}
        title={`Delete view "${action.view.name}"?`}
        description="This action cannot be undone. All captured form and URL settings in this view will be permanently removed."
        confirmLabel="Delete View"
        cancelLabel="Cancel"
        variant="destructive"
        onConfirm={() => onDeleteConfirm(action.view.id)}
        onCancel={onClose}
      />
    );
  }

  if (action.type === 'update') {
    const isCompatible =
      activeOrigin === action.view.origin &&
      normPath === normalizePathname(action.view.pathname);

    if (!isCompatible) {
      return (
        <div
          role="dialog"
          aria-modal="true"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
        >
          <div className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg space-y-3">
            <h3 className="text-base font-semibold text-red-600">
              Incompatible Page
            </h3>
            <p className="text-sm text-slate-600">
              Cannot update view from a different page. Current page ({normPath}) does not match saved view page ({action.view.pathname}).
            </p>
            <div className="flex justify-end pt-2">
              <Button type="button" variant="outline" size="sm" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <AlertDialog
        open={true}
        title={`Update "${action.view.name}"`}
        description="Replace this view's saved settings and query parameters with the current page settings? Name and creation time will be preserved."
        confirmLabel="Confirm Update"
        cancelLabel="Cancel"
        variant="default"
        onConfirm={() => onUpdateConfirm(action.view)}
        onCancel={onClose}
      />
    );
  }

  // Rename action
  const handleNameChange = (val: string) => {
    setName(val);
    const trimmed = val.trim();

    if (val.length > 60) {
      setRenameError('View name must be 60 characters or fewer.');
      return;
    }

    if (!trimmed) {
      setRenameError('View name cannot be empty.');
      return;
    }

    const collision = allViews.some(
      (v) =>
        v.id !== action.view.id &&
        v.origin === action.view.origin &&
        normalizePathname(v.pathname) === normalizePathname(action.view.pathname) &&
        v.name.trim().toLowerCase() === trimmed.toLowerCase()
    );

    if (collision) {
      setRenameError(`A view named "${trimmed}" already exists for this page.`);
    } else {
      setRenameError('');
    }
  };

  const isRenameValid =
    name.trim().length >= 1 && name.length <= 60 && !renameError;

  const handleRenameSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isRenameValid) return;
    onRenameSubmit(action.view.id, name.trim());
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
    >
      <form
        onSubmit={handleRenameSave}
        className="w-full max-w-sm rounded-lg bg-white p-5 shadow-lg space-y-4"
      >
        <h3 className="text-base font-semibold text-slate-900">
          Rename View
        </h3>

        <div className="space-y-1.5">
          <Label htmlFor="rename-input">New Name</Label>
          <Input
            id="rename-input"
            type="text"
            value={name}
            onChange={(e) => handleNameChange(e.target.value)}
            maxLength={65}
            autoFocus
          />
          <div className="flex justify-between items-center text-xs">
            {renameError ? (
              <p role="alert" className="text-red-600 font-medium">
                {renameError}
              </p>
            ) : (
              <span className="text-slate-400">1–60 characters</span>
            )}
            <span className={name.length > 60 ? 'text-red-600 font-bold' : 'text-slate-400'}>
              {name.length}/60
            </span>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={!isRenameValid}>
            Save Name
          </Button>
        </div>
      </form>
    </div>
  );
}
