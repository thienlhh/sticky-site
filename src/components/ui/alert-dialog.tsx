import * as React from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface AlertDialogProps {
  open: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'default' | 'destructive';
  onConfirm: () => void;
  onCancel: () => void;
}

export function AlertDialog({
  open,
  title,
  description,
  confirmLabel = 'Confirm',
  cancelLabel = 'Cancel',
  variant = 'default',
  onConfirm,
  onCancel,
}: AlertDialogProps) {
  if (!open) return null;

  return (
    <div
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="alert-dialog-title"
      aria-describedby="alert-dialog-description"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-3"
    >
      <div className="w-full max-w-[300px] rounded-lg bg-white p-3.5 shadow-lg space-y-2.5">
        <h3 id="alert-dialog-title" className="text-sm font-semibold text-slate-900">
          {title}
        </h3>
        <p id="alert-dialog-description" className="text-xs text-slate-600">
          {description}
        </p>
        <div className="flex items-center justify-end gap-1.5 pt-1.5">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onCancel}
            className="px-2.5"
          >
            {cancelLabel}
          </Button>
          <Button
            type="button"
            variant={variant === 'destructive' ? 'destructive' : 'default'}
            size="sm"
            onClick={onConfirm}
            className="px-2.5"
          >
            {confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
