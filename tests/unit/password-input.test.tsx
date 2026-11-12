import React from 'react';
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PasswordInput } from '@/features/auth/components/PasswordInput';

describe('PasswordInput Component', () => {
  it('renders with type="password" by default', () => {
    render(<PasswordInput id="pwd" label="Password" placeholder="Enter password" />);
    const input = screen.getByPlaceholderText('Enter password');
    expect(input).toHaveAttribute('type', 'password');

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    expect(toggleButton).toBeInTheDocument();
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
  });

  it('toggles to type="text" on first click and back to type="password" on second click', () => {
    render(<PasswordInput id="pwd" label="Password" placeholder="Enter password" />);
    const input = screen.getByPlaceholderText('Enter password');
    const toggleButton = screen.getByRole('button', { name: /show password/i });

    // Click 1: show password
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'text');
    expect(toggleButton).toHaveAttribute('aria-pressed', 'true');
    expect(toggleButton).toHaveAttribute('aria-label', 'Hide password');

    // Click 2: hide password
    fireEvent.click(toggleButton);
    expect(input).toHaveAttribute('type', 'password');
    expect(toggleButton).toHaveAttribute('aria-pressed', 'false');
    expect(toggleButton).toHaveAttribute('aria-label', 'Show password');
  });

  it('does not trigger form submit when clicking toggle button', () => {
    let formSubmitted = false;
    render(
      <form onSubmit={(e) => { e.preventDefault(); formSubmitted = true; }}>
        <PasswordInput id="pwd" label="Password" placeholder="Enter password" />
        <button type="submit">Submit</button>
      </form>
    );

    const toggleButton = screen.getByRole('button', { name: /show password/i });
    fireEvent.click(toggleButton);

    expect(formSubmitted).toBe(false);
  });
});

