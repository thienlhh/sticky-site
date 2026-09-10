import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-1.5 whitespace-nowrap rounded-md text-xs sm:text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 disabled:pointer-events-none disabled:opacity-50 cursor-pointer disabled:cursor-not-allowed select-none',
  {
    variants: {
      variant: {
        default: 'bg-blue-600 text-white hover:bg-blue-700 shadow-sm',
        destructive: 'bg-red-600 text-white hover:bg-red-700',
        outline: 'border border-slate-300 bg-white hover:bg-slate-100 text-slate-900',
        secondary: 'bg-slate-100 text-slate-900 hover:bg-slate-200',
        ghost: 'hover:bg-slate-100 text-slate-900',
        link: 'text-blue-600 underline-offset-4 hover:underline',
      },
      size: {
        default: 'h-9 min-h-[36px] px-3 py-1',
        sm: 'h-7 min-h-[28px] rounded-md px-2 py-0.5 text-xs',
        lg: 'h-10 min-h-[40px] rounded-md px-4 py-2 text-sm',
        icon: 'h-7 w-7 min-h-[28px] p-0',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size, className }))}
        {...props}
      />
    );
  }
);
Button.displayName = 'Button';
