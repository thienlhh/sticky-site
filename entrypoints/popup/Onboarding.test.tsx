import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Onboarding, isOnboardingCompleted, completeOnboarding } from './Onboarding';

describe('First-Run Onboarding (Task 11B)', () => {
  beforeEach(async () => {
    vi.restoreAllMocks();
    await chrome.storage.local.clear();
  });

  it('checks and updates onboarding completion state in storage', async () => {
    expect(await isOnboardingCompleted()).toBe(false);
    await completeOnboarding();
    expect(await isOnboardingCompleted()).toBe(true);
  });

  it('renders key privacy and permission principles clearly', () => {
    render(<Onboarding onComplete={vi.fn()} />);

    expect(screen.getByRole('heading', { name: /Welcome to StickySite/i })).toBeInTheDocument();
    expect(screen.getByText(/Your saved views stay in your browser/i)).toBeInTheDocument();
    expect(screen.getByText(/Per-Site Access/i)).toBeInTheDocument();
    expect(screen.getByText(/Anonymous Technical Metrics/i)).toBeInTheDocument();
  });

  it('calls onComplete when user clicks Get Started', async () => {
    const user = userEvent.setup();
    const onCompleteMock = vi.fn();

    render(<Onboarding onComplete={onCompleteMock} />);

    const getStartedBtn = screen.getByRole('button', { name: /Get Started/i });
    expect(getStartedBtn).toBeInTheDocument();
    expect(getStartedBtn).toHaveClass('min-h-[36px]');

    await user.click(getStartedBtn);
    expect(onCompleteMock).toHaveBeenCalledTimes(1);
    expect(await isOnboardingCompleted()).toBe(true);
  });
});
