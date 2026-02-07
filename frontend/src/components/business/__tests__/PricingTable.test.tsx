/**
 * Unit tests for PricingTable component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { PricingTable, type PricingItem } from '../PricingTable';

const mockItems: PricingItem[] = [
  {
    id: 1,
    fabricCode: 'BF-2501-0001',
    fabricName: '纯棉平纹',
    salePrice: 50,
    purchasePrice: 30,
    quantity: 100,
    subtotal: 5000,
  },
  {
    id: 2,
    fabricCode: 'BF-2501-0002',
    fabricName: '涤纶提花',
    salePrice: 80,
    purchasePrice: 50,
    quantity: 200,
    subtotal: 16000,
  },
];

describe('PricingTable', () => {
  describe('Basic Rendering', () => {
    it('renders fabric codes and names', () => {
      render(<PricingTable items={mockItems} />);

      expect(screen.getByText('BF-2501-0001')).toBeInTheDocument();
      expect(screen.getByText('BF-2501-0002')).toBeInTheDocument();
      expect(screen.getByText('纯棉平纹')).toBeInTheDocument();
      expect(screen.getByText('涤纶提花')).toBeInTheDocument();
    });

    it('renders column headers', () => {
      render(<PricingTable items={mockItems} />);

      expect(screen.getByText('面料编号')).toBeInTheDocument();
      expect(screen.getByText('面料名称')).toBeInTheDocument();
      expect(screen.getByText('售价')).toBeInTheDocument();
      expect(screen.getByText('数量')).toBeInTheDocument();
      expect(screen.getByText('小计')).toBeInTheDocument();
    });

    it('renders empty table without errors', () => {
      render(<PricingTable items={[]} />);

      expect(screen.getByText('面料编号')).toBeInTheDocument();
    });
  });

  describe('Summary Row', () => {
    it('shows summary row with total amount', () => {
      render(<PricingTable items={mockItems} showSummary />);

      expect(screen.getByText('合计')).toBeInTheDocument();
    });

    it('hides summary row when showSummary is false', () => {
      render(<PricingTable items={mockItems} showSummary={false} />);

      expect(screen.queryByText('合计')).not.toBeInTheDocument();
    });
  });

  describe('Optional Columns', () => {
    it('shows purchase price column when showPurchasePrice is true', () => {
      render(<PricingTable items={mockItems} showPurchasePrice />);

      expect(screen.getByText('采购价')).toBeInTheDocument();
    });

    it('hides purchase price column by default', () => {
      render(<PricingTable items={mockItems} />);

      expect(screen.queryByText('采购价')).not.toBeInTheDocument();
    });

    it('shows profit margin column when showProfitMargin is true', () => {
      render(<PricingTable items={mockItems} showProfitMargin />);

      expect(screen.getByText('利润率')).toBeInTheDocument();
    });

    it('hides profit margin column by default', () => {
      render(<PricingTable items={mockItems} />);

      expect(screen.queryByText('利润率')).not.toBeInTheDocument();
    });
  });

  describe('Missing Data', () => {
    it('renders dash for missing fabric code', () => {
      const items: PricingItem[] = [
        {
          id: 1,
          salePrice: 50,
          quantity: 100,
          subtotal: 5000,
        },
      ];

      render(<PricingTable items={items} />);

      // Two dashes: one for fabricCode, one for fabricName
      const dashes = screen.getAllByText('-');
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });
});
