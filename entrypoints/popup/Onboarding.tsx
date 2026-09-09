import React from 'react';
import { Button } from '@/components/ui/button';
import { ShieldCheck, HardDrive, BarChart2 } from 'lucide-react';

const STORAGE_KEY_ONBOARDING = 'stickysite_onboarding_completed';

export async function isOnboardingCompleted(): Promise<boolean> {
  if (typeof chrome === 'undefined' || !chrome.storage?.local) {
    return false;
  }
  const res = await chrome.storage.local.get(STORAGE_KEY_ONBOARDING);
  return res[STORAGE_KEY_ONBOARDING] === true;
}

export async function completeOnboarding(): Promise<void> {
  if (typeof chrome !== 'undefined' && chrome.storage?.local) {
    await chrome.storage.local.set({ [STORAGE_KEY_ONBOARDING]: true });
  }
}

export interface OnboardingProps {
  onComplete: () => void;
}

export function Onboarding({ onComplete }: OnboardingProps) {
  const handleGetStarted = async () => {
    await completeOnboarding();
    onComplete();
  };

  return (
    <div className="flex flex-col h-full justify-between">
      <header className="border-b border-slate-200 pb-3 mb-3">
        <h2 className="text-base font-bold text-slate-900 tracking-tight">Welcome to StickySite</h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Save and restore your favorite web filters effortlessly.
        </p>
      </header>

      <div className="flex-1 space-y-3.5 overflow-y-auto pr-1">
        <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/80">
          <ShieldCheck className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Per-Site Access</h3>
            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
              Permissions are requested on-demand only for the site you choose. No blanket website access.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/80">
          <HardDrive className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Local Storage</h3>
            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
              Your saved views stay in your browser. No cloud sync, no tracking across accounts, no passwords saved.
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3 rounded-lg border border-slate-100 bg-slate-50/80">
          <BarChart2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <h3 className="text-xs font-semibold text-slate-900">Anonymous Technical Metrics</h3>
            <p className="text-[11px] text-slate-600 leading-snug mt-0.5">
              Privacy-first counters measure reliability. Never includes URLs, labels, or values. Opt out anytime in Settings.
            </p>
          </div>
        </div>
      </div>

      <footer className="pt-3 border-t border-slate-200 mt-3">
        <Button
          onClick={handleGetStarted}
          className="w-full min-h-[44px] bg-blue-600 hover:bg-blue-700 text-white"
        >
          Get Started
        </Button>
      </footer>
    </div>
  );
}
