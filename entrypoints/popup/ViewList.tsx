import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { normalizePathname, type SavedView } from '@/domain/view';
import { MoreVertical, Trash2, Edit2, RefreshCw, Globe, ExternalLink } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ViewListProps {
  currentOrigin: string;
  currentPathname: string;
  views: SavedView[];
  onApply: (view: SavedView) => void;
  onNavigate?: (url: string) => void;
  onRename?: (view: SavedView) => void;
  onUpdate?: (view: SavedView) => void;
  onDelete?: (view: SavedView) => void;
}

function getFaviconUrl(pageUrl: string, size = 32): string {
  try {
    if (typeof chrome !== 'undefined' && chrome.runtime?.getURL) {
      const url = new URL(chrome.runtime.getURL('/_favicon/'));
      url.searchParams.set('pageUrl', pageUrl);
      url.searchParams.set('size', String(size));
      return url.toString();
    }
  } catch {
    // fallback if chrome runtime is not available
  }
  return '';
}

function SiteIcon({ origin, pathname }: { origin: string; pathname?: string }) {
  const [hasTriedOrigin, setHasTriedOrigin] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  const fullUrl = pathname && pathname !== '/' ? `${origin}${pathname}` : origin;
  const activeUrl = hasTriedOrigin ? origin : fullUrl;

  const faviconUrl16 = getFaviconUrl(activeUrl, 16);
  const faviconUrl32 = getFaviconUrl(activeUrl, 32);
  const faviconUrl64 = getFaviconUrl(activeUrl, 64);

  if (!faviconUrl32 || loadFailed) {
    return (
      <div className="h-5 w-5 rounded bg-slate-100 flex items-center justify-center shrink-0 text-slate-400">
        <Globe className="h-3.5 w-3.5" aria-hidden="true" />
      </div>
    );
  }

  return (
    <div className="h-5 w-5 rounded bg-slate-50 border border-slate-100 flex items-center justify-center shrink-0 overflow-hidden">
      <img
        key={activeUrl}
        src={faviconUrl32}
        srcSet={`${faviconUrl16} 1x, ${faviconUrl32} 2x, ${faviconUrl64} 3x`}
        alt=""
        aria-hidden="true"
        width={16}
        height={16}
        className="h-4 w-4 shrink-0 object-contain"
        onError={() => {
          if (!hasTriedOrigin && fullUrl !== origin) {
            setHasTriedOrigin(true);
          } else {
            setLoadFailed(true);
          }
        }}
      />
    </div>
  );
}

interface ViewCardProps {
  view: SavedView;
  compatible: boolean;
  onApply: (view: SavedView) => void;
  onNavigate?: (url: string) => void;
  onRename?: (view: SavedView) => void;
  onUpdate?: (view: SavedView) => void;
  onDelete?: (view: SavedView) => void;
}

function ViewCard({
  view,
  compatible,
  onApply,
  onNavigate,
  onRename,
  onUpdate,
  onDelete,
}: ViewCardProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMenuOpen(false);
      }
    };
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuOpen(false);
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [menuOpen]);

  const controlCount = view.controls.length;
  const queryCount = Object.keys(view.queryParams).length;
  const hasSecondaryActions = Boolean(onRename || onUpdate || onDelete);

  return (
    <div
      className={cn(
        'group relative p-2.5 rounded-md border border-slate-200 bg-white flex items-center justify-between gap-2 hover:border-slate-300 transition-colors',
        menuOpen ? 'z-20' : 'z-0'
      )}
    >
      <div className="flex items-center gap-2 flex-1 min-w-0">
        <SiteIcon origin={view.origin} pathname={view.pathname} />
        <div className="flex-1 min-w-0">
          <h4 className="text-xs sm:text-sm font-semibold text-slate-900 truncate">{view.name}</h4>
          <p className="text-[11px] text-slate-500 mt-0.5 truncate">
            {controlCount} control{controlCount === 1 ? '' : 's'}
            {queryCount > 0 && `, ${queryCount} query param${queryCount === 1 ? '' : 's'}`}
          </p>
          {!compatible && (
            <div className="mt-1 flex items-center">
              <span
                className="font-mono text-[10px] text-slate-600 bg-slate-100 border border-slate-200/70 px-1.5 py-0.5 rounded max-w-full truncate"
                title={`Saved for page: ${view.pathname}`}
              >
                Page: {view.pathname}
              </span>
            </div>
          )}
        </div>
      </div>

      <div className="flex items-center gap-1 shrink-0 relative" ref={menuRef}>
        {compatible ? (
          <Button
            variant="ghost"
            onClick={() => onApply(view)}
            className="h-8 min-h-[32px] px-2.5 min-w-[48px] text-xs font-semibold text-blue-600 hover:text-blue-700 hover:bg-blue-50 opacity-0 group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100 transition-opacity"
            aria-label={`Apply ${view.name}`}
          >
            Apply
          </Button>
        ) : onNavigate ? (
          <Button
            variant="ghost"
            onClick={() => onNavigate(`${view.origin}${view.pathname}`)}
            className="h-8 min-h-[32px] px-2 min-w-[48px] text-xs font-medium text-slate-700 hover:text-slate-900 hover:bg-slate-100 opacity-0 group-hover:opacity-100 focus:opacity-100 group-focus-within:opacity-100 transition-opacity flex items-center gap-1"
            aria-label={`Go to page ${view.pathname} for ${view.name}`}
            title={`Navigate to ${view.origin}${view.pathname} to apply`}
          >
            <ExternalLink className="h-3 w-3 text-slate-400" aria-hidden="true" />
            <span>Go to page</span>
          </Button>
        ) : (
          <Button
            variant="ghost"
            disabled
            className="h-8 min-h-[32px] px-2.5 min-w-[48px] text-xs font-semibold text-slate-400 opacity-40 cursor-not-allowed"
            aria-label={`Cannot apply ${view.name} on current page`}
            title={`Only applies to ${view.pathname}`}
          >
            Apply
          </Button>
        )}

        {hasSecondaryActions && (
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setMenuOpen((prev) => !prev)}
            className={cn(
              'h-7 w-7 min-h-[28px] p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded',
              menuOpen && 'bg-slate-100 text-slate-700'
            )}
            aria-label={`View options for ${view.name}`}
            aria-haspopup="menu"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        )}

        {menuOpen && (
          <div
            role="menu"
            aria-label={`Options for ${view.name}`}
            className="absolute right-0 top-8 z-30 w-32 rounded-md bg-white py-1 shadow-lg border border-slate-200"
          >
            {!compatible && onNavigate && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onNavigate(`${view.origin}${view.pathname}`);
                }}
                className="w-full flex items-center px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer"
                aria-label={`Go to ${view.pathname}`}
              >
                <ExternalLink className="h-3.5 w-3.5 mr-2 text-slate-400" />
                Go to page
              </button>
            )}
            {onRename && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onRename(view);
                }}
                className="w-full flex items-center px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer"
                aria-label={`Rename ${view.name}`}
              >
                <Edit2 className="h-3.5 w-3.5 mr-2 text-slate-400" />
                Rename
              </button>
            )}
            {onUpdate && (
              <button
                type="button"
                role="menuitem"
                disabled={!compatible}
                onClick={() => {
                  setMenuOpen(false);
                  onUpdate(view);
                }}
                className="w-full flex items-center px-2.5 py-1.5 text-xs text-slate-700 hover:bg-slate-100 hover:text-slate-900 transition-colors text-left cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
                aria-label={`Update ${view.name}`}
              >
                <RefreshCw className="h-3.5 w-3.5 mr-2 text-slate-400" />
                Update
              </button>
            )}
            {onDelete && (
              <button
                type="button"
                role="menuitem"
                onClick={() => {
                  setMenuOpen(false);
                  onDelete(view);
                }}
                className="w-full flex items-center px-2.5 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors text-left cursor-pointer"
                aria-label={`Delete ${view.name}`}
              >
                <Trash2 className="h-3.5 w-3.5 mr-2 text-red-500" />
                Delete
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export function ViewList({
  currentOrigin,
  currentPathname,
  views,
  onApply,
  onNavigate,
  onRename,
  onUpdate,
  onDelete,
}: ViewListProps) {
  const normCurrentPath = normalizePathname(currentPathname);

  const pageViews = views.filter(
    (v) =>
      v.origin === currentOrigin &&
      normalizePathname(v.pathname) === normCurrentPath
  );
  const otherViews = views.filter(
    (v) => v.origin === currentOrigin && normalizePathname(v.pathname) !== normCurrentPath
  );

  return (
    <div className="flex-1 min-h-0 overflow-y-auto space-y-2 pr-0.5">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
        Views for this page ({pageViews.length})
      </h3>
      {pageViews.length > 0 ? (
        <div className="space-y-1.5">
          {pageViews.map((view) => (
            <ViewCard
              key={view.id}
              view={view}
              compatible={true}
              onApply={onApply}
              onRename={onRename}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      ) : (
        <div className="text-center py-6">
          <p className="text-sm text-slate-500">No saved views for this page yet.</p>
          <p className="text-xs text-slate-600 mt-1">Adjust page settings and click Save Current View below.</p>
        </div>
      )}
      {otherViews.length > 0 && (
        <>
          <div className="pt-1">
            <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600">
              Other views on this site ({otherViews.length})
            </h3>
          </div>
          <div className="space-y-1.5">
            {otherViews.map((view) => (
              <ViewCard
                key={view.id}
                view={view}
                compatible={false}
                onApply={onApply}
                onNavigate={onNavigate}
                onRename={onRename}
                onUpdate={onUpdate}
                onDelete={onDelete}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
