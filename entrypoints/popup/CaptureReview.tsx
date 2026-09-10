import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import type { CaptureResult } from '@/capture/controls';
import type { CapturedSetting, StoredValue } from '@/domain/view';

export interface CaptureReviewProps {
  captureResult: CaptureResult;
  onContinue: (
    selectedControls: CapturedSetting[],
    selectedQueryParams: Record<string, string[]>
  ) => void;
  onCancel: () => void;
}

function formatValue(val: StoredValue): string {
  if (typeof val === 'boolean') {
    return val ? 'Yes / Checked' : 'No / Unchecked';
  }
  if (Array.isArray(val)) {
    return val.length > 0 ? val.join(', ') : '(None)';
  }
  return val === '' ? '(Empty)' : String(val);
}

export function CaptureReview({
  captureResult,
  onContinue,
  onCancel,
}: CaptureReviewProps) {
  const [selectedControlIds, setSelectedControlIds] = useState<Set<string>>(
    () => new Set(captureResult.controls.map((c) => c.id))
  );

  const [selectedQueryKeys, setSelectedQueryKeys] = useState<Set<string>>(
    () => new Set(Object.keys(captureResult.queryParams))
  );

  const toggleControl = (id: string, checked: boolean) => {
    const next = new Set(selectedControlIds);
    if (checked) {
      next.add(id);
    } else {
      next.delete(id);
    }
    setSelectedControlIds(next);
  };

  const toggleQueryParam = (key: string, checked: boolean) => {
    const next = new Set(selectedQueryKeys);
    if (checked) {
      next.add(key);
    } else {
      next.delete(key);
    }
    setSelectedQueryKeys(next);
  };

  const totalSelected = selectedControlIds.size + selectedQueryKeys.size;

  const handleContinue = () => {
    if (totalSelected === 0) return;

    const chosenControls = captureResult.controls.filter((c) =>
      selectedControlIds.has(c.id)
    );

    const chosenQueryParams: Record<string, string[]> = {};
    for (const key of selectedQueryKeys) {
      if (captureResult.queryParams[key]) {
        chosenQueryParams[key] = captureResult.queryParams[key];
      }
    }

    onContinue(chosenControls, chosenQueryParams);
  };

  const queryParamEntries = Object.entries(captureResult.queryParams);

  return (
    <div className="flex flex-col h-full justify-between">
      <header className="border-b border-slate-200 pb-2 mb-2">
        <h2 className="text-base font-bold text-slate-900">Review Captured Settings</h2>
        <p className="text-xs text-slate-500">
          Choose which page values to include in this view.
        </p>
      </header>

      {captureResult.unsupportedCount > 0 && (
        <div
          role="status"
          aria-live="polite"
          className="mb-2 p-2 rounded bg-amber-50 border border-amber-200 text-amber-800 text-xs"
        >
          {captureResult.unsupportedCount} unsupported or sensitive controls excluded.
        </div>
      )}

      <div className="flex-1 overflow-y-auto space-y-3 max-h-[300px] pr-0.5">
        {queryParamEntries.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              URL Query Parameters
            </h3>
            <div className="space-y-1.5">
              {queryParamEntries.map(([key, values]) => {
                const inputId = `qp-${key}`;
                const isChecked = selectedQueryKeys.has(key);
                return (
                  <div
                    key={key}
                    className="flex items-start gap-2 p-1.5 rounded-md hover:bg-slate-50 transition-colors border border-slate-100"
                  >
                    <Checkbox
                      id={inputId}
                      checked={isChecked}
                      onCheckedChange={(c) => toggleQueryParam(key, c)}
                    />
                    <div className="flex-1 text-xs">
                      <Label htmlFor={inputId} className="font-semibold text-slate-800 cursor-pointer">
                        {key}
                      </Label>
                      <p className="text-slate-500 truncate">{values.join(', ')}</p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {captureResult.controls.length > 0 && (
          <section>
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 mb-1.5">
              Page Form Controls
            </h3>
            <div className="space-y-1.5">
              {captureResult.controls.map((control) => {
                const inputId = `ctrl-${control.id}`;
                const isChecked = selectedControlIds.has(control.id);
                return (
                  <div
                    key={control.id}
                    className="flex items-start gap-2 p-1.5 rounded-md hover:bg-slate-50 transition-colors border border-slate-100"
                  >
                    <Checkbox
                      id={inputId}
                      checked={isChecked}
                      onCheckedChange={(c) => toggleControl(control.id, c)}
                    />
                    <div className="flex-1 text-xs">
                      <Label htmlFor={inputId} className="font-semibold text-slate-800 cursor-pointer">
                        {control.label}
                      </Label>
                      <p className="text-slate-500 truncate">
                        {formatValue(control.value)}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {queryParamEntries.length === 0 && captureResult.controls.length === 0 && (
          <p className="text-sm text-slate-500 text-center py-6">
            No eligible settings found on this page.
          </p>
        )}
      </div>

      <footer className="pt-2.5 border-t border-slate-200 mt-2.5 flex items-center justify-between gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="flex-1"
        >
          Cancel
        </Button>
        <Button
          type="button"
          disabled={totalSelected === 0}
          onClick={handleContinue}
          className="flex-1"
        >
          Continue ({totalSelected})
        </Button>
      </footer>
    </div>
  );
}
