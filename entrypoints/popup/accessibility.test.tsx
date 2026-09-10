import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { StatusMessage, parseStatus } from './StatusMessage';
import { App } from './App';
import { SaveView } from './SaveView';
import { ViewList } from './ViewList';
import type { SavedView } from '@/domain/view';
import * as pageAgent from '@/platform/page-agent';

describe('Accessibility & Status System', () => {
  describe('StatusMessage component', () => {
    it('renders role="alert" and aria-live="assertive" for errors with action hint', () => {
      render(
        <StatusMessage
          status={{
            type: 'error',
            message: 'Permission denied.',
            actionHint: 'Grant site access when prompted.',
          }}
        />
      );

      const alertEl = screen.getByRole('alert');
      expect(alertEl).toHaveAttribute('aria-live', 'assertive');
      expect(screen.getByText(/\[Error\]/i)).toBeInTheDocument();
      expect(screen.getByText('Permission denied.')).toBeInTheDocument();
      expect(screen.getByText(/Grant site access when prompted/i)).toBeInTheDocument();
    });

    it('renders role="status" and aria-live="polite" for success with non-color indicator', () => {
      render(
        <StatusMessage
          status={{
            type: 'success',
            message: 'Saved "Default Search"',
          }}
        />
      );

      const statusEl = screen.getByRole('status');
      expect(statusEl).toHaveAttribute('aria-live', 'polite');
      expect(screen.getByText(/\[Success\]/i)).toBeInTheDocument();
      expect(screen.getByText('Saved "Default Search"')).toBeInTheDocument();
    });

    it('automatically parses error strings into actionable error states', () => {
      const parsedQuota = parseStatus('Storage quota exceeded');
      expect(parsedQuota?.type).toBe('error');
      expect(parsedQuota?.actionHint).toMatch(/delete unused views/i);

      const parsedDenied = parseStatus('Permission denied.');
      expect(parsedDenied?.type).toBe('error');
      expect(parsedDenied?.actionHint).toMatch(/permission/i);

      expect(parseStatus('2 of 3 settings restored (1 skipped).')?.type).toBe('warning');
      expect(parseStatus('Page changed while applying this view.')?.type).toBe('error');
    });

    it('renders nothing when status is null or empty', () => {
      const { container } = render(<StatusMessage status={null} />);
      expect(container.firstChild).toBeNull();
    });
  });

  describe('Compact Extension Target Size', () => {
    it('verifies primary buttons in App shell meet compact min height requirement', () => {
      render(<App />);
      const saveBtn = screen.getByRole('button', { name: /Save Current View/i });
      expect(saveBtn).toHaveClass('min-h-[36px]');
    });

    it('verifies Apply button in ViewList meets compact min height requirement', () => {
      const sampleView: SavedView = {
        schemaVersion: 1,
        id: 'view-1',
        name: 'Test View',
        origin: 'https://example.com',
        pathname: '/search',
        queryParams: {},
        controls: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      render(
        <ViewList
          currentOrigin="https://example.com"
          currentPathname="/search"
          views={[sampleView]}
          onApply={vi.fn()}
        />
      );

      const applyBtn = screen.getByRole('button', { name: /Apply Test View/i });
      expect(applyBtn).toHaveClass('min-h-[32px]');
    });

    it('verifies SaveView primary action buttons have accessible names and compact targets', () => {
      render(
        <SaveView
          origin="https://example.com"
          pathname="/search"
          queryParams={{}}
          controls={[]}
          onCancel={vi.fn()}
          onSaved={vi.fn()}
        />
      );

      const saveBtn = screen.getByRole('button', { name: /^Save View$/i });
      const backBtn = screen.getByRole('button', { name: /Back/i });
      const input = screen.getByRole('textbox', { name: /View Name/i });

      expect(saveBtn).toHaveClass('min-h-[36px]');
      expect(backBtn).toHaveClass('min-h-[36px]');
      expect(input).toBeInTheDocument();
    });
  });

  describe('Keyboard navigation & destructive confirmation', () => {
    it('supports tab navigation to all interactive controls', async () => {
      vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
        tabId: 101,
        url: new URL('https://example.com/search'),
      });

      const user = userEvent.setup();
      render(<App />);

      const settingsBtn = screen.getByRole('button', { name: /Settings and Privacy/i });
      const saveBtn = screen.getByRole('button', { name: /Save Current View/i });

      await user.tab();
      expect(settingsBtn).toHaveFocus();

      await user.tab();
      expect(saveBtn).toHaveFocus();
    });
  });
});
