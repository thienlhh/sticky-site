import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { ViewActions } from './ViewActions';
import type { SavedView } from '@/domain/view';

describe('ViewActions (Rename, Update, Delete)', () => {
  const sampleView: SavedView = {
    schemaVersion: 1,
    id: 'view-1',
    name: 'Original View',
    origin: 'https://example.com',
    pathname: '/search',
    queryParams: { q: ['shoes'] },
    controls: [
      {
        id: 'c1',
        label: 'In Stock',
        value: true,
        fingerprint: { kind: 'checkbox', tag: 'input', label: 'In Stock', ordinal: 0 },
      },
    ],
    createdAt: '2026-09-09T10:00:00.000Z',
    updatedAt: '2026-09-09T10:00:00.000Z',
  };

  const existingViews: SavedView[] = [
    sampleView,
    {
      schemaVersion: 1,
      id: 'view-2',
      name: 'Existing Other View',
      origin: 'https://example.com',
      pathname: '/search',
      queryParams: {},
      controls: [],
      createdAt: '2026-09-09T10:00:00.000Z',
      updatedAt: '2026-09-09T10:00:00.000Z',
    },
  ];

  describe('Rename', () => {
    it('validates trimmed 1–60 character name and rejects duplicate name on same page', async () => {
      const user = userEvent.setup();
      const handleRename = vi.fn();

      render(
        <ViewActions
          action={{ type: 'rename', view: sampleView }}
          activeOrigin="https://example.com"
          activePathname="/search"
          allViews={existingViews}
          onClose={vi.fn()}
          onRenameSubmit={handleRename}
          onDeleteConfirm={vi.fn()}
          onUpdateConfirm={vi.fn()}
        />
      );

      const input = screen.getByLabelText(/New Name/i);
      await user.clear(input);
      await user.type(input, 'existing other view'); // Duplicate of view-2

      expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      const saveBtn = screen.getByRole('button', { name: /Save Name/i });
      expect(saveBtn).toBeDisabled();

      // Enter unique valid name
      await user.clear(input);
      await user.type(input, 'Renamed Shoes');
      expect(saveBtn).toBeEnabled();

      await user.click(saveBtn);
      expect(handleRename).toHaveBeenCalledWith('view-1', 'Renamed Shoes');
    });
  });

  describe('Delete', () => {
    it('cancels deletion when Cancel is clicked', async () => {
      const user = userEvent.setup();
      const handleClose = vi.fn();
      const handleDelete = vi.fn();

      render(
        <ViewActions
          action={{ type: 'delete', view: sampleView }}
          activeOrigin="https://example.com"
          activePathname="/search"
          allViews={existingViews}
          onClose={handleClose}
          onRenameSubmit={vi.fn()}
          onDeleteConfirm={handleDelete}
          onUpdateConfirm={vi.fn()}
        />
      );

      expect(screen.getByText(/Delete view "Original View"\?/i)).toBeInTheDocument();
      const cancelBtn = screen.getByRole('button', { name: /Cancel/i });
      await user.click(cancelBtn);

      expect(handleClose).toHaveBeenCalled();
      expect(handleDelete).not.toHaveBeenCalled();
    });

    it('confirms deletion when Delete is clicked', async () => {
      const user = userEvent.setup();
      const handleDelete = vi.fn();

      render(
        <ViewActions
          action={{ type: 'delete', view: sampleView }}
          activeOrigin="https://example.com"
          activePathname="/search"
          allViews={existingViews}
          onClose={vi.fn()}
          onRenameSubmit={vi.fn()}
          onDeleteConfirm={handleDelete}
          onUpdateConfirm={vi.fn()}
        />
      );

      const confirmBtn = screen.getByRole('button', { name: /Delete View/i });
      await user.click(confirmBtn);

      expect(handleDelete).toHaveBeenCalledWith('view-1');
    });
  });

  describe('Update', () => {
    it('blocks update when active page is incompatible with view page', () => {
      render(
        <ViewActions
          action={{ type: 'update', view: sampleView }}
          activeOrigin="https://different.com"
          activePathname="/search"
          allViews={existingViews}
          onClose={vi.fn()}
          onRenameSubmit={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onUpdateConfirm={vi.fn()}
        />
      );

      expect(
        screen.getByText(/Cannot update view from a different page/i)
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /Update View Settings/i })
      ).not.toBeInTheDocument();
    });

    it('allows update when active page matches view page', async () => {
      const user = userEvent.setup();
      const handleUpdate = vi.fn();

      render(
        <ViewActions
          action={{ type: 'update', view: sampleView }}
          activeOrigin="https://example.com"
          activePathname="/search"
          allViews={existingViews}
          onClose={vi.fn()}
          onRenameSubmit={vi.fn()}
          onDeleteConfirm={vi.fn()}
          onUpdateConfirm={handleUpdate}
        />
      );

      expect(screen.getByText(/Update "Original View"/i)).toBeInTheDocument();
      const confirmBtn = screen.getByRole('button', { name: /Confirm Update/i });
      await user.click(confirmBtn);

      expect(handleUpdate).toHaveBeenCalledWith(sampleView);
    });
  });
});
