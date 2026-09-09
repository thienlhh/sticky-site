import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from './App';
import * as pageAgent from '@/platform/page-agent';

describe('Popup App Shell', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await chrome.storage.session.clear();
    await chrome.storage.local.clear();
    await chrome.storage.local.set({ stickysite_onboarding_completed: true });
  });

  it('renders StickySite heading and enabled Save Current View button', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { level: 1, name: /StickySite/i });
    expect(heading).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Save Current View/i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).not.toBeDisabled();
  });

  it('navigates to capture review screen when capture succeeds', async () => {
    const user = userEvent.setup();
    vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
      tabId: 101,
      url: new URL('https://example.com/test'),
    });
    vi.spyOn(pageAgent, 'requestOriginAccess').mockResolvedValue(true);
    vi.spyOn(pageAgent, 'ensurePageAgent').mockResolvedValue();
    vi.spyOn(pageAgent, 'sendPageCommand').mockImplementation(async (_tabId, cmd) => {
      if (cmd.type === 'PING') {
        return { status: 'ok', pong: true };
      }
      if (cmd.type === 'CAPTURE') {
        return {
          status: 'ok',
          data: {
            origin: 'https://example.com',
            pathname: '/test',
            queryParams: { q: ['shoes'] },
            controls: [
              {
                id: 'c1',
                kind: 'text',
                label: 'Search Query',
                value: 'shoes',
                fingerprint: {
                  kind: 'text',
                  tag: 'input',
                  label: 'Search Query',
                  ordinal: 0,
                },
              },
            ],
            unsupportedCount: 0,
          },
        };
      }
      return null;
    });

    render(<App />);
    const saveButton = screen.getByRole('button', { name: /Save Current View/i });
    await user.click(saveButton);

    const reviewHeader = await screen.findByText(/Review Captured Settings/i);
    expect(reviewHeader).toBeInTheDocument();
    expect(screen.getByText('Search Query')).toBeInTheDocument();
  });

  it('displays "Permission denied." when user denies origin access', async () => {
    const user = userEvent.setup();
    vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
      tabId: 101,
      url: new URL('https://example.com/test'),
    });
    vi.spyOn(pageAgent, 'requestOriginAccess').mockResolvedValue(false);

    render(<App />);
    const saveButton = screen.getByRole('button', { name: /Save Current View/i });
    await user.click(saveButton);

    const statusMsg = await screen.findByText('Permission denied.');
    expect(statusMsg).toBeInTheDocument();
  });

  it('renders unavailable page state and disables Save button when active page is unsupported', async () => {
    vi.spyOn(pageAgent, 'getActivePage').mockRejectedValue(
      new Error('Unsupported page URL: chrome://. StickySite only supports web pages (HTTP and HTTPS).')
    );

    render(<App />);

    const unavailableTitle = await screen.findByText('Page Not Supported');
    expect(unavailableTitle).toBeInTheDocument();
    expect(
      screen.getByText(/StickySite only works on standard web pages/i)
    ).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Save Current View/i });
    expect(saveButton).toBeDisabled();
  });

  it('recovers completed apply result from transient storage on popup reopen', async () => {
    vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
      tabId: 101,
      url: new URL('https://example.com/search'),
    });

    await chrome.storage.session.set({
      stickysite_last_apply_result: {
        tabId: 101,
        viewId: 'view-1',
        result: {
          status: 'Fully applied view',
          restoredCount: 3,
          totalAttempted: 3,
          skippedCount: 0,
          failedCount: 0,
          message: 'All 3 settings restored successfully.',
        },
        completedAt: Date.now(),
      },
    });

    render(<App />);

    const statusMsg = await screen.findByText('All 3 settings restored successfully.');
    expect(statusMsg).toBeInTheDocument();
  });

  it('displays "Applying view..." on popup reopen when apply operation is actively in progress', async () => {
    vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
      tabId: 101,
      url: new URL('https://example.com/search'),
    });

    await chrome.storage.session.set({
      stickysite_apply_op: {
        tabId: 101,
        viewId: 'view-1',
        startedAt: Date.now(),
        deadline: Date.now() + 10000,
        expectedUrl: 'https://example.com/search?q=shoes',
        status: 'navigating',
      },
    });

    render(<App />);

    const statusMsg = await screen.findByText('Applying view...');
    expect(statusMsg).toBeInTheDocument();
  });

  describe('R7: Review Update before replacing settings', () => {
    const existingView = {
      schemaVersion: 1 as const,
      id: 'view-update-1',
      name: 'Original Name',
      origin: 'https://example.com',
      pathname: '/search',
      queryParams: { q: ['shoes'] },
      controls: [
        {
          id: 'c1',
          label: 'In Stock',
          value: true,
          fingerprint: { kind: 'checkbox' as const, tag: 'input', label: 'In Stock', ordinal: 0 },
        },
      ],
      createdAt: '2026-09-09T08:00:00.000Z',
      updatedAt: '2026-09-09T08:00:00.000Z',
    };

    it('blocks Update when current active page does not match saved view page', async () => {
      const user = userEvent.setup();
      const { createView } = await import('@/storage/views');
      vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
        tabId: 101,
        url: new URL('https://example.com/search'),
      });
      await createView(existingView);

      render(<App />);

      // Wait for view to be displayed in list
      const updateBtn = await screen.findByRole('button', { name: `Update ${existingView.name}` });
      await user.click(updateBtn);

      // Dialog opens
      const confirmUpdateBtn = await screen.findByRole('button', { name: /Confirm Update/i });

      // Before confirming, simulate page navigated to another page
      vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
        tabId: 101,
        url: new URL('https://example.com/different-page'),
      });

      await user.click(confirmUpdateBtn);

      const errorMsg = await screen.findByText(/Cannot update view: current page does not match view page/i);
      expect(errorMsg).toBeInTheDocument();
    });

    it('reuses CaptureReview, preserves id/name/createdAt, and applies individual exclusions', async () => {
      const user = userEvent.setup();
      const storageModule = await import('@/storage/views');
      const replaceSpy = vi.spyOn(storageModule, 'replaceView');

      vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
        tabId: 101,
        url: new URL('https://example.com/search'),
      });
      vi.spyOn(pageAgent, 'requestOriginAccess').mockResolvedValue(true);
      vi.spyOn(pageAgent, 'ensurePageAgent').mockResolvedValue();
      vi.spyOn(pageAgent, 'sendPageCommand').mockResolvedValue({
        status: 'ok',
        data: {
          origin: 'https://example.com',
          pathname: '/search',
          queryParams: { q: ['boots'], sort: ['asc'] },
          controls: [
            {
              id: 'c1',
              label: 'In Stock',
              value: false,
              fingerprint: { kind: 'checkbox', tag: 'input', label: 'In Stock', ordinal: 0 },
            },
            {
              id: 'c2',
              label: 'On Sale',
              value: true,
              fingerprint: { kind: 'checkbox', tag: 'input', label: 'On Sale', ordinal: 0 },
            },
          ],
          unsupportedCount: 0,
        },
      });

      await storageModule.createView(existingView);

      render(<App />);

      const updateBtn = await screen.findByRole('button', { name: `Update ${existingView.name}` });
      await user.click(updateBtn);

      const confirmUpdateBtn = await screen.findByRole('button', { name: /Confirm Update/i });
      await user.click(confirmUpdateBtn);

      // Now CaptureReview screen should be visible
      const reviewHeader = await screen.findByText(/Review Captured Settings/i);
      expect(reviewHeader).toBeInTheDocument();

      // Deselect 'On Sale' control
      const onSaleCheckbox = screen.getByRole('checkbox', { name: /On Sale/i });
      await user.click(onSaleCheckbox);

      // Click Continue to finish Update
      const continueBtn = screen.getByRole('button', { name: /Continue/i });
      await user.click(continueBtn);

      // Verify replaceView was called with preserved id, name, createdAt
      expect(replaceSpy).toHaveBeenCalledTimes(1);
      const updatedPayload = replaceSpy.mock.calls[0][0];
      expect(updatedPayload.id).toBe(existingView.id);
      expect(updatedPayload.name).toBe(existingView.name);
      expect(updatedPayload.createdAt).toBe(existingView.createdAt);
      // c2 was excluded
      expect(updatedPayload.controls).toHaveLength(1);
      expect(updatedPayload.controls[0].id).toBe('c1');

      const successStatus = await screen.findByText('Updated "Original Name"');
      expect(successStatus).toBeInTheDocument();
    });

    it('cancels Update in CaptureReview leaving storage untouched', async () => {
      const user = userEvent.setup();
      const storageModule = await import('@/storage/views');
      const replaceSpy = vi.spyOn(storageModule, 'replaceView');

      vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
        tabId: 101,
        url: new URL('https://example.com/search'),
      });
      vi.spyOn(pageAgent, 'requestOriginAccess').mockResolvedValue(true);
      vi.spyOn(pageAgent, 'ensurePageAgent').mockResolvedValue();
      vi.spyOn(pageAgent, 'sendPageCommand').mockResolvedValue({
        status: 'ok',
        data: {
          origin: 'https://example.com',
          pathname: '/search',
          queryParams: { q: ['boots'] },
          controls: [],
          unsupportedCount: 0,
        },
      });

      await storageModule.createView(existingView);

      render(<App />);

      const updateBtn = await screen.findByRole('button', { name: `Update ${existingView.name}` });
      await user.click(updateBtn);

      const confirmUpdateBtn = await screen.findByRole('button', { name: /Confirm Update/i });
      await user.click(confirmUpdateBtn);

      const cancelBtn = await screen.findByRole('button', { name: /Cancel/i });
      await user.click(cancelBtn);

      // Storage untouched
      expect(replaceSpy).not.toHaveBeenCalled();
      // Returns to idle list
      expect(screen.getByText('Original Name')).toBeInTheDocument();
    });
  });

  describe('R8: Surface storage-load failures', () => {
    it('displays visible announced error with next action rather than empty-view success state', async () => {
      const storageModule = await import('@/storage/views');
      vi.spyOn(storageModule, 'listViews').mockRejectedValue(
        new Error('Unsupported storage schema version: 99. Expected version 1.')
      );
      vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
        tabId: 101,
        url: new URL('https://example.com/search'),
      });

      render(<App />);

      const errorHeading = await screen.findByText('Storage Load Error');
      expect(errorHeading).toBeInTheDocument();
      expect(
        screen.getAllByText(/Unsupported storage schema version: 99/i).length
      ).toBeGreaterThanOrEqual(1);

      // Ensure empty-view success state is NOT shown
      expect(screen.queryByText(/No saved views for this page yet/i)).not.toBeInTheDocument();

      // Ensure announced status message includes action hint
      const statusMsg = await screen.findByText(/Retry loading saved views or update the extension/i);
      expect(statusMsg).toBeInTheDocument();

      // Retry action button is available
      const retryBtn = screen.getByRole('button', { name: /Retry loading saved views/i });
      expect(retryBtn).toBeInTheDocument();
    });

    it('recovers view list when clicking Retry after storage becomes readable', async () => {
      const user = userEvent.setup();
      const storageModule = await import('@/storage/views');
      const listSpy = vi.spyOn(storageModule, 'listViews');
      listSpy.mockRejectedValueOnce(new Error('Transient storage failure'));

      vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
        tabId: 101,
        url: new URL('https://example.com/search'),
      });

      render(<App />);

      const retryBtn = await screen.findByRole('button', { name: /Retry loading saved views/i });
      expect(retryBtn).toBeInTheDocument();

      // Now storage recovers
      const recoveredView = {
        schemaVersion: 1 as const,
        id: 'view-rec-1',
        name: 'Recovered View',
        origin: 'https://example.com',
        pathname: '/search',
        queryParams: {},
        controls: [],
        createdAt: '2026-09-09T08:00:00.000Z',
        updatedAt: '2026-09-09T08:00:00.000Z',
      };
      listSpy.mockResolvedValueOnce([recoveredView]);

      await user.click(retryBtn);

      const recoveredItem = await screen.findByText('Recovered View');
      expect(recoveredItem).toBeInTheDocument();
      expect(screen.queryByText('Storage Load Error')).not.toBeInTheDocument();
    });
  });
});




