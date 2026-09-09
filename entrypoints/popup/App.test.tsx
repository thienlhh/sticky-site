import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { App } from './App';
import * as pageAgent from '@/platform/page-agent';

describe('Popup App Shell', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
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
});
