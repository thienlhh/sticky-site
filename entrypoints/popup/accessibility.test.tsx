import React from 'react';
import { render, screen, act, fireEvent, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi, afterEach } from 'vitest';
import { StatusMessage, parseStatus, DEFAULT_STATUS_DISMISS_TIMEOUT_MS } from './StatusMessage';
import { App } from './App';
import { SaveView } from './SaveView';
import { ViewList } from './ViewList';
import type { SavedView } from '@/domain/view';
import * as pageAgent from '@/platform/page-agent';

describe('Accessibility & Status System', () => {
  describe('StatusMessage component', () => {
    afterEach(() => {
      vi.useRealTimers();
    });

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

    it('renders as an elevated overlay with fixed positioning', () => {
      render(<StatusMessage status="Saved view" />);
      const el = screen.getByRole('status');
      expect(el).toHaveClass('fixed');
      expect(el).toHaveClass('z-50');
      expect(el).toHaveClass('bottom-16');
      expect(el).toHaveClass('shadow-lg');
    });

    it('supports top overlay positioning', () => {
      render(<StatusMessage status="Saved view" position="top" />);
      const el = screen.getByRole('status');
      expect(el).toHaveClass('top-3');
    });

    it('automatically dismisses after the timeout and triggers onDismiss', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();

      render(<StatusMessage status="Saved view" timeoutMs={3000} onDismiss={onDismiss} />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(2999);
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(onDismiss).not.toHaveBeenCalled();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('uses DEFAULT_STATUS_DISMISS_TIMEOUT_MS by default', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();

      render(<StatusMessage status="Saved view" onDismiss={onDismiss} />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(DEFAULT_STATUS_DISMISS_TIMEOUT_MS - 1);
      });
      expect(screen.getByRole('status')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(1);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('does not auto-dismiss when type is loading', () => {
      vi.useFakeTimers();
      render(<StatusMessage status={{ type: 'loading', message: 'Connecting to page...' }} timeoutMs={3000} />);
      expect(screen.getByText('Connecting to page...')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(10000);
      });
      expect(screen.getByText('Connecting to page...')).toBeInTheDocument();
    });

    it('manually dismisses when clicking the dismiss button', async () => {
      const onDismiss = vi.fn();
      render(<StatusMessage status="Saved view" onDismiss={onDismiss} />);

      const dismissBtn = screen.getByRole('button', { name: /dismiss status message/i });
      fireEvent.click(dismissBtn);

      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('pauses auto-dismiss timer on hover and resumes on unhover', () => {
      vi.useFakeTimers();
      const onDismiss = vi.fn();
      render(<StatusMessage status="Saved view" timeoutMs={3000} onDismiss={onDismiss} />);

      const el = screen.getByRole('status');

      act(() => {
        vi.advanceTimersByTime(1000);
      });

      // Hover over message to pause
      fireEvent.mouseEnter(el);

      act(() => {
        vi.advanceTimersByTime(5000);
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(onDismiss).not.toHaveBeenCalled();

      // Mouse leaves to resume
      fireEvent.mouseLeave(el);

      act(() => {
        vi.advanceTimersByTime(3000);
      });
      expect(screen.queryByRole('status')).not.toBeInTheDocument();
      expect(onDismiss).toHaveBeenCalledTimes(1);
    });

    it('resets dismissed state when a new status is provided', () => {
      const { rerender } = render(<StatusMessage status="First status" />);
      const dismissBtn = screen.getByRole('button', { name: /dismiss status message/i });
      fireEvent.click(dismissBtn);
      expect(screen.queryByRole('status')).not.toBeInTheDocument();

      rerender(<StatusMessage status="Second status" />);
      expect(screen.getByRole('status')).toBeInTheDocument();
      expect(screen.getByText('Second status')).toBeInTheDocument();
    });

    it('disables auto-dismiss when timeoutMs is 0', () => {
      vi.useFakeTimers();
      render(<StatusMessage status="Saved view" timeoutMs={0} />);
      expect(screen.getByRole('status')).toBeInTheDocument();

      act(() => {
        vi.advanceTimersByTime(100000);
      });
      expect(screen.getByRole('status')).toBeInTheDocument();
    });
  });

  describe('Compact Extension Target Size', () => {
    it('verifies primary buttons in App shell meet compact min height requirement', async () => {
      vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
        tabId: 101,
        url: new URL('https://example.com/'),
      });
      render(<App />);
      const saveBtn = await screen.findByRole('button', { name: /Save Current View/i });
      expect(saveBtn).toHaveClass('min-h-[36px]');
      await waitFor(() => expect(screen.getByRole('main')).toHaveAttribute('data-ready', 'true'));
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

    it('verifies SaveView primary action buttons have accessible names and compact targets', async () => {
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

      const saveBtn = await screen.findByRole('button', { name: /^Save View$/i });
      const backBtn = await screen.findByRole('button', { name: /Back/i });
      const input = await screen.findByRole('textbox', { name: /View Name/i });

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

      const settingsBtn = await screen.findByRole('button', { name: /Settings and Privacy/i });
      const saveBtn = await screen.findByRole('button', { name: /Save Current View/i });

      await user.tab();
      expect(settingsBtn).toHaveFocus();

      await user.tab();
      expect(saveBtn).toHaveFocus();
    });
  });
});
