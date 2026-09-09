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

  it('displays "Page access ready." when button clicked and ping succeeds', async () => {
    const user = userEvent.setup();
    vi.spyOn(pageAgent, 'getActivePage').mockResolvedValue({
      tabId: 101,
      url: new URL('https://example.com/test'),
    });
    vi.spyOn(pageAgent, 'requestOriginAccess').mockResolvedValue(true);
    vi.spyOn(pageAgent, 'ensurePageAgent').mockResolvedValue();
    vi.spyOn(pageAgent, 'sendPageCommand').mockResolvedValue({ status: 'ok', pong: true });

    render(<App />);
    const saveButton = screen.getByRole('button', { name: /Save Current View/i });
    await user.click(saveButton);

    const statusMsg = await screen.findByText('Page access ready.');
    expect(statusMsg).toBeInTheDocument();
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
});
