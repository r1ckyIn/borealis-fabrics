/**
 * Tests for AmountDisplay component.
 */

import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AmountDisplay } from '../AmountDisplay';

describe('AmountDisplay', () => {
  describe('Null/undefined/empty handling', () => {
    it('renders "-" for null value', () => {
      render(<AmountDisplay value={null} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders "-" for undefined value', () => {
      render(<AmountDisplay value={undefined} />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders "-" for empty string value', () => {
      render(<AmountDisplay value="" />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });

    it('renders "-" for NaN string value', () => {
      render(<AmountDisplay value="not a number" />);
      expect(screen.getByText('-')).toBeInTheDocument();
    });
  });

  describe('Valid number rendering', () => {
    it('renders number with default currency symbol ¥', () => {
      render(<AmountDisplay value={100} />);
      expect(screen.getByText('¥100.00')).toBeInTheDocument();
    });

    it('renders zero correctly', () => {
      render(<AmountDisplay value={0} />);
      expect(screen.getByText('¥0.00')).toBeInTheDocument();
    });

    it('renders negative number correctly', () => {
      render(<AmountDisplay value={-50.5} />);
      expect(screen.getByText('-¥50.50')).toBeInTheDocument();
    });

    it('renders string number correctly', () => {
      render(<AmountDisplay value="123.45" />);
      expect(screen.getByText('¥123.45')).toBeInTheDocument();
    });

    it('renders large number with proper formatting', () => {
      render(<AmountDisplay value={1234567.89} />);
      expect(screen.getByText('¥1,234,567.89')).toBeInTheDocument();
    });
  });

  describe('Custom prefix option', () => {
    it('renders with custom prefix', () => {
      render(<AmountDisplay value={100} prefix="$" />);
      expect(screen.getByText('$100.00')).toBeInTheDocument();
    });

    it('renders with EUR prefix', () => {
      render(<AmountDisplay value={99.99} prefix="€" />);
      expect(screen.getByText('€99.99')).toBeInTheDocument();
    });
  });

  describe('Suffix option', () => {
    it('renders with suffix', () => {
      render(<AmountDisplay value={100} suffix="元" />);
      expect(screen.getByText('¥100.00 元')).toBeInTheDocument();
    });

    it('renders with custom prefix and suffix', () => {
      render(<AmountDisplay value={50} prefix="$" suffix="USD" />);
      expect(screen.getByText('$50.00 USD')).toBeInTheDocument();
    });
  });

  describe('showSign option', () => {
    it('shows + sign for positive numbers when showSign is true', () => {
      render(<AmountDisplay value={100} showSign />);
      expect(screen.getByText('+¥100.00')).toBeInTheDocument();
    });

    it('shows - sign for negative numbers when showSign is true', () => {
      render(<AmountDisplay value={-50} showSign />);
      expect(screen.getByText('-¥50.00')).toBeInTheDocument();
    });

    it('does not show sign for zero when showSign is true', () => {
      render(<AmountDisplay value={0} showSign />);
      expect(screen.getByText('¥0.00')).toBeInTheDocument();
    });
  });

  describe('colorize option', () => {
    it('renders positive number with success type when colorize is true', () => {
      const { container } = render(<AmountDisplay value={100} colorize />);
      const text = container.querySelector('.ant-typography-success');
      expect(text).toBeInTheDocument();
    });

    it('renders negative number with danger type when colorize is true', () => {
      const { container } = render(<AmountDisplay value={-50} colorize />);
      const text = container.querySelector('.ant-typography-danger');
      expect(text).toBeInTheDocument();
    });

    it('renders zero without color type when colorize is true', () => {
      const { container } = render(<AmountDisplay value={0} colorize />);
      const successText = container.querySelector('.ant-typography-success');
      const dangerText = container.querySelector('.ant-typography-danger');
      expect(successText).not.toBeInTheDocument();
      expect(dangerText).not.toBeInTheDocument();
    });

    it('does not apply color when colorize is false', () => {
      const { container } = render(<AmountDisplay value={100} colorize={false} />);
      const successText = container.querySelector('.ant-typography-success');
      expect(successText).not.toBeInTheDocument();
    });
  });

  describe('decimals option', () => {
    it('renders with custom decimal places', () => {
      render(<AmountDisplay value={123.456} decimals={3} />);
      expect(screen.getByText('¥123.456')).toBeInTheDocument();
    });

    it('renders with 0 decimals', () => {
      render(<AmountDisplay value={123.99} decimals={0} />);
      expect(screen.getByText('¥124')).toBeInTheDocument();
    });

    it('pads decimals when needed', () => {
      render(<AmountDisplay value={100} decimals={4} />);
      expect(screen.getByText('¥100.0000')).toBeInTheDocument();
    });
  });

  describe('Combined options', () => {
    it('renders with all options combined', () => {
      const { container } = render(
        <AmountDisplay
          value={1234.5}
          prefix="$"
          suffix="USD"
          showSign
          colorize
          decimals={2}
        />
      );
      expect(screen.getByText('+$1,234.50 USD')).toBeInTheDocument();
      expect(container.querySelector('.ant-typography-success')).toBeInTheDocument();
    });
  });
});
