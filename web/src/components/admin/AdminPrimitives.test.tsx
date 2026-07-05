import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { EmptyState, formatMoney, formatNumber, StatusBadge } from './AdminPrimitives';

describe('AdminPrimitives', () => {
  it('formats numbers and money consistently', () => {
    expect(formatNumber(12345)).toBe('12,345');
    expect(formatNumber(undefined)).toBe('0');
    expect(formatMoney(123456)).toBe('$1,235');
  });

  it('renders empty states for DB-backed pages without fake rows', () => {
    render(<EmptyState title="No reports" body="Rows appear when they exist in Supabase." />);
    expect(screen.getByText('No reports')).toBeInTheDocument();
    expect(screen.getByText('Rows appear when they exist in Supabase.')).toBeInTheDocument();
  });

  it('renders status badges', () => {
    render(<StatusBadge tone="green">verified</StatusBadge>);
    expect(screen.getByText('verified')).toBeInTheDocument();
  });
});
