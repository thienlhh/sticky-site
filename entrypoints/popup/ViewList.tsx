import React from 'react';
import { Button } from '@/components/ui/button';
import { normalizePathname, type SavedView } from '@/domain/view';
import { Play, Trash2, Edit2, RefreshCw } from 'lucide-react';

export interface ViewListProps {
  currentOrigin: string;
  currentPathname: string;
  views: SavedView[];
  onApply: (view: SavedView) => void;
  onRename?: (view: SavedView) => void;
  onUpdate?: (view: SavedView) => void;
  onDelete?: (view: SavedView) => void;
}

export function ViewList({
  currentOrigin,
  currentPathname,
  views,
  onApply,
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

  const renderView = (view: SavedView, compatible: boolean) => {
    const controlCount = view.controls.length;
    const queryCount = Object.keys(view.queryParams).length;

    return (
      <div key={view.id} className="p-3 rounded-lg border border-slate-200 bg-white flex flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-semibold text-slate-900 truncate">{view.name}</h4>
            <p className="text-xs text-slate-500 mt-0.5">
              {controlCount} control{controlCount === 1 ? '' : 's'}
              {queryCount > 0 && `, ${queryCount} query param${queryCount === 1 ? '' : 's'}`}
            </p>
          </div>
          <Button
            onClick={() => onApply(view)}
            disabled={!compatible}
            className="shrink-0 gap-1.5 min-h-[44px] px-3.5 text-xs font-semibold"
            aria-label={`Apply ${view.name}`}
          >
            <Play className="h-3.5 w-3.5 fill-current" />
            Apply
          </Button>
        </div>

        {(onRename || onUpdate || onDelete) && (
          <div className="flex items-center justify-end gap-1 pt-1 border-t border-slate-100 text-xs">
                  {onRename && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onRename(view)}
                      className="h-7 px-2 text-slate-600 hover:text-slate-900 min-h-[28px]"
                      aria-label={`Rename ${view.name}`}
                    >
                      <Edit2 className="h-3 w-3 mr-1" />
                      Rename
                    </Button>
                  )}
                  {onUpdate && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onUpdate(view)}
                      disabled={!compatible}
                      className="h-7 px-2 text-slate-600 hover:text-slate-900 min-h-[28px]"
                      aria-label={`Update ${view.name}`}
                    >
                      <RefreshCw className="h-3 w-3 mr-1" />
                      Update
                    </Button>
                  )}
                  {onDelete && (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onDelete(view)}
                      className="h-7 px-2 text-red-600 hover:text-red-700 hover:bg-red-50 min-h-[28px]"
                      aria-label={`Delete ${view.name}`}
                    >
                      <Trash2 className="h-3 w-3 mr-1" />
                      Delete
                    </Button>
                  )}
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
      {pageViews.length > 0 ? (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Views for this page ({pageViews.length})
          </h3>
          <div className="space-y-2">{pageViews.map((view) => renderView(view, true))}</div>
        </>
      ) : (
        <div className="text-center py-8">
          <p className="text-sm text-slate-500">No saved views for this page yet.</p>
          <p className="text-xs text-slate-600 mt-1">Adjust page settings and click Save Current View below.</p>
        </div>
      )}
      {otherViews.length > 0 && (
        <>
          <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-600">
            Other views on this site ({otherViews.length})
          </h3>
          <div className="space-y-2">{otherViews.map((view) => renderView(view, false))}</div>
        </>
      )}
    </div>
  );
}
