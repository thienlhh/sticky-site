import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { SaveView } from './SaveView';
import { ViewList } from './ViewList';
import * as storage from '@/storage/views';
import type { SavedView } from '@/domain/view';

describe('Popup Save and List Flow', () => {
  let mockViews: SavedView[] = [];

  beforeEach(() => {
    mockViews = [
      {
        schemaVersion: 1,
        id: 'view-1',
        name: 'Shoes Under $100',
        origin: 'https://example.com',
        pathname: '/search',
        queryParams: { sort: ['price_asc'] },
        controls: [
          {
            id: 'c1',
            label: 'In Stock Only',
            value: true,
            fingerprint: { kind: 'checkbox', tag: 'input', label: 'In Stock Only', ordinal: 0 },
          },
        ],
        createdAt: '2026-09-09T10:00:00.000Z',
        updatedAt: '2026-09-09T10:00:00.000Z',
      },
      {
        schemaVersion: 1,
        id: 'view-2',
        name: 'Different Page View',
        origin: 'https://example.com',
        pathname: '/categories',
        queryParams: {},
        controls: [],
        createdAt: '2026-09-09T10:00:00.000Z',
        updatedAt: '2026-09-09T10:00:00.000Z',
      },
    ];

    vi.spyOn(storage, 'listViews').mockImplementation(async () => [...mockViews]);
    vi.spyOn(storage, 'createView').mockImplementation(async (v) => {
      mockViews.push(v);
    });
  });

  describe('SaveView', () => {
    it('validates trimmed 1–60 character name and rejects duplicates case-insensitively', async () => {
      const user = userEvent.setup();
      const handleSaved = vi.fn();

      render(
        <SaveView
          origin="https://example.com"
          pathname="/search"
          queryParams={{ q: ['boots'] }}
          controls={[]}
          onSaved={handleSaved}
          onCancel={vi.fn()}
        />
      );

      const nameInput = screen.getByLabelText(/View Name/i);
      const saveBtn = screen.getByRole('button', { name: /^Save View$/i });

      // Initially empty name disables save or shows error
      expect(saveBtn).toBeDisabled();

      // Enter duplicate name "shoes under $100" (case-insensitive)
      await user.type(nameInput, 'shoes under $100');
      expect(saveBtn).toBeDisabled();
      expect(screen.getByText(/already exists/i)).toBeInTheDocument();

      // Clear and type valid unique name
      await user.clear(nameInput);
      await user.type(nameInput, 'Boots Filter');
      expect(saveBtn).toBeEnabled();

      await user.click(saveBtn);
      await waitFor(() => {
        expect(handleSaved).toHaveBeenCalled();
      });

      expect(mockViews).toHaveLength(3);
      const saved = mockViews[2];
      expect(saved.name).toBe('Boots Filter');
      expect(saved.origin).toBe('https://example.com');
      expect(saved.pathname).toBe('/search');
      expect(saved.id).toBeDefined();
      expect(saved.createdAt).toBeDefined();
    });

    it('rejects names longer than 60 characters', async () => {
      const user = userEvent.setup();

      render(
        <SaveView
          origin="https://example.com"
          pathname="/search"
          queryParams={{}}
          controls={[]}
          onSaved={vi.fn()}
          onCancel={vi.fn()}
        />
      );

      const nameInput = screen.getByLabelText(/View Name/i);
      const longName = 'A'.repeat(61);
      await user.type(nameInput, longName);

      const saveBtn = screen.getByRole('button', { name: /^Save View$/i });
      expect(saveBtn).toBeDisabled();
      expect(screen.getByText(/60 characters or fewer/i)).toBeInTheDocument();
    });
  });

  describe('ViewList', () => {
    it('groups and displays only views matching exact page (origin + pathname)', async () => {
      render(
        <ViewList
          currentOrigin="https://example.com"
          currentPathname="/search"
          views={mockViews}
          onApply={vi.fn()}
          onRename={vi.fn()}
          onUpdate={vi.fn()}
          onDelete={vi.fn()}
        />
      );

      // Shoes Under $100 should be visible
      expect(screen.getByText('Shoes Under $100')).toBeInTheDocument();
      // Different Page View should NOT be in the current page views list
      expect(screen.queryByText('Different Page View')).not.toBeInTheDocument();
    });
  });
});
