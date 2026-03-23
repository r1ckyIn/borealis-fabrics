/**
 * Unit tests for CustomerAddressTab sub-component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { CustomerAddressTab } from '../components/CustomerAddressTab';
import type { Address } from '@/types';

const mockAddresses: Address[] = [
  {
    province: '上海市',
    city: '上海市',
    district: '浦东新区',
    detailAddress: '世纪大道100号',
    contactName: '王五',
    contactPhone: '13700137000',
    label: '公司',
    isDefault: true,
  },
  {
    province: '上海市',
    city: '上海市',
    district: '徐汇区',
    detailAddress: '漕溪北路100号',
    contactName: '赵六',
    contactPhone: '13600136000',
    isDefault: false,
  },
];

describe('CustomerAddressTab', () => {
  it('should render empty state when addresses is null', () => {
    render(<CustomerAddressTab addresses={null} />);

    expect(screen.getByText('暂无收货地址')).toBeInTheDocument();
  });

  it('should render empty state when addresses is undefined', () => {
    render(<CustomerAddressTab addresses={undefined} />);

    expect(screen.getByText('暂无收货地址')).toBeInTheDocument();
  });

  it('should render empty state when addresses is empty array', () => {
    render(<CustomerAddressTab addresses={[]} />);

    expect(screen.getByText('暂无收货地址')).toBeInTheDocument();
  });

  it('should render address list with contact info', () => {
    render(<CustomerAddressTab addresses={mockAddresses} />);

    expect(screen.getByText(/王五 13700137000/)).toBeInTheDocument();
    expect(screen.getByText(/赵六 13600136000/)).toBeInTheDocument();
  });

  it('should render label tag for address with label', () => {
    render(<CustomerAddressTab addresses={mockAddresses} />);

    expect(screen.getByText('公司')).toBeInTheDocument();
  });

  it('should render default tag for default address', () => {
    render(<CustomerAddressTab addresses={mockAddresses} />);

    expect(screen.getByText('默认')).toBeInTheDocument();
  });

  it('should render full address description', () => {
    render(<CustomerAddressTab addresses={mockAddresses} />);

    expect(screen.getByText('上海市上海市浦东新区世纪大道100号')).toBeInTheDocument();
    expect(screen.getByText('上海市上海市徐汇区漕溪北路100号')).toBeInTheDocument();
  });
});
