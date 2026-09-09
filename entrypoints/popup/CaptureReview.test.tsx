import React from 'react';
import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, it, expect, vi } from 'vitest';
import { CaptureReview } from './CaptureReview';
import type { CaptureResult } from '@/capture/controls';

describe('CaptureReview', () => {
  const sampleCapture: CaptureResult = {
    origin: 'https://example.com',
    pathname: '/search',
    queryParams: {
      category: ['shoes'],
      sort: ['asc'],
    },
    controls: [
      {
        id: 'c1',
        kind: 'checkbox',
        label: 'In Stock Only',
        value: true,
        fingerprint: {
          kind: 'checkbox',
          tag: 'input',
          type: 'checkbox',
          label: 'In Stock Only',
          ordinal: 0,
        },
      },
      {
        id: 'c2',
        kind: 'text',
        label: 'Keyword',
        value: 'leather boots',
        fingerprint: {
          kind: 'text',
          tag: 'input',
          type: 'text',
          label: 'Keyword',
          ordinal: 0,
        },
      },
    ],
    unsupportedCount: 3,
  };

  it('renders all settings selected by default and displays unsupported count', () => {
    render(
      <CaptureReview
        captureResult={sampleCapture}
        onContinue={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    expect(screen.getByText(/Review Captured Settings/i)).toBeInTheDocument();
    expect(screen.getByText(/3 unsupported or sensitive controls excluded/i)).toBeInTheDocument();

    // Checkboxes are checked by default
    const inStockCheckbox = screen.getByLabelText(/In Stock Only/i);
    expect(inStockCheckbox).toBeChecked();

    const keywordCheckbox = screen.getByLabelText(/Keyword/i);
    expect(keywordCheckbox).toBeChecked();

    const categoryCheckbox = screen.getByLabelText(/category/i);
    expect(categoryCheckbox).toBeChecked();

    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    expect(continueBtn).toBeEnabled();
  });

  it('allows deselecting individual settings and sends only selected on continue', async () => {
    const user = userEvent.setup();
    const handleContinue = vi.fn();

    render(
      <CaptureReview
        captureResult={sampleCapture}
        onContinue={handleContinue}
        onCancel={vi.fn()}
      />
    );

    // Deselect "Keyword"
    const keywordCheckbox = screen.getByLabelText(/Keyword/i);
    await user.click(keywordCheckbox);
    expect(keywordCheckbox).not.toBeChecked();

    // Click continue
    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    await user.click(continueBtn);

    expect(handleContinue).toHaveBeenCalledTimes(1);
    const [selectedControls, selectedQueryParams] = handleContinue.mock.calls[0];

    // Only In Stock Only remains in controls
    expect(selectedControls).toHaveLength(1);
    expect(selectedControls[0].id).toBe('c1');
    // Query params remain
    expect(selectedQueryParams).toEqual({
      category: ['shoes'],
      sort: ['asc'],
    });
  });

  it('disables continue button when zero settings are selected', async () => {
    const user = userEvent.setup();

    render(
      <CaptureReview
        captureResult={sampleCapture}
        onContinue={vi.fn()}
        onCancel={vi.fn()}
      />
    );

    // Uncheck all 2 query params and 2 controls
    await user.click(screen.getByLabelText(/category/i));
    await user.click(screen.getByLabelText(/sort/i));
    await user.click(screen.getByLabelText(/In Stock Only/i));
    await user.click(screen.getByLabelText(/Keyword/i));

    const continueBtn = screen.getByRole('button', { name: /Continue/i });
    expect(continueBtn).toBeDisabled();
  });
});
