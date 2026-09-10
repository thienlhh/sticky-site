import * as React from 'react';
import { Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface CheckboxProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type' | 'onChange'> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

export const Checkbox = React.forwardRef<HTMLInputElement, CheckboxProps>(
  ({ className, checked = false, onCheckedChange, disabled, id, ...props }, ref) => {
    return (
      <span
        className={cn(
          'relative inline-flex items-center justify-center h-4 w-4 rounded border transition-colors cursor-pointer select-none focus-within:ring-2 focus-within:ring-blue-500 focus-within:ring-offset-1 shrink-0',
          checked
            ? 'bg-blue-600 border-blue-600 text-white'
            : 'border-slate-400 bg-white hover:border-slate-500',
          disabled && 'opacity-50 cursor-not-allowed pointer-events-none',
          className
        )}
      >
        <input
          ref={ref}
          id={id}
          type="checkbox"
          checked={checked}
          disabled={disabled}
          onChange={(e) => onCheckedChange?.(e.target.checked)}
          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10 m-0"
          {...props}
        />
        {checked && <Check className="h-3 w-3 stroke-[3] pointer-events-none" />}
      </span>
    );
  }
);
Checkbox.displayName = 'Checkbox';
