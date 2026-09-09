import React from 'react';
import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { App } from './App';

describe('Popup App Shell', () => {
  it('renders StickySite heading and disabled Save Current View button', () => {
    render(<App />);
    const heading = screen.getByRole('heading', { level: 1, name: /StickySite/i });
    expect(heading).toBeInTheDocument();

    const saveButton = screen.getByRole('button', { name: /Save Current View/i });
    expect(saveButton).toBeInTheDocument();
    expect(saveButton).toBeDisabled();
  });
});
