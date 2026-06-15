import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import StatusChip from './StatusChip';

describe('StatusChip', () => {
  it('renders the default label for a status', () => {
    render(<StatusChip status="cleared" />);
    expect(screen.getByText('Cleared')).toBeInTheDocument();
  });

  it('renders a custom label when provided', () => {
    render(<StatusChip status="pending" label="Awaiting review" />);
    expect(screen.getByText('Awaiting review')).toBeInTheDocument();
  });
});
