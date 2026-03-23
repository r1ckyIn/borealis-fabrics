/**
 * Unit tests for CustomerBasicInfo sub-component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { CustomerBasicInfo } from '../components/CustomerBasicInfo';
import type { Customer } from '@/types';
import { CreditType } from '@/types';

const mockCustomer: Customer = {
  id: 1,
  companyName: '上海服饰有限公司',
  contactName: '王五',
  phone: '13700137000',
  wechat: 'wang_wu',
  email: 'wangwu@example.com',
  addresses: [],
  creditType: CreditType.CREDIT,
  creditDays: 45,
  notes: '重要客户',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('CustomerBasicInfo', () => {
  it('should render all field labels', () => {
    render(<CustomerBasicInfo customer={mockCustomer} />);

    expect(screen.getByText('公司名称')).toBeInTheDocument();
    expect(screen.getByText('联系人')).toBeInTheDocument();
    expect(screen.getByText('电话')).toBeInTheDocument();
    expect(screen.getByText('微信')).toBeInTheDocument();
    expect(screen.getByText('邮箱')).toBeInTheDocument();
    expect(screen.getByText('结算方式')).toBeInTheDocument();
    expect(screen.getByText('账期天数')).toBeInTheDocument();
    expect(screen.getByText('备注')).toBeInTheDocument();
    expect(screen.getByText('创建时间')).toBeInTheDocument();
    expect(screen.getByText('更新时间')).toBeInTheDocument();
  });

  it('should render customer values correctly', () => {
    render(<CustomerBasicInfo customer={mockCustomer} />);

    expect(screen.getAllByText('上海服饰有限公司').length).toBeGreaterThan(0);
    expect(screen.getByText('王五')).toBeInTheDocument();
    expect(screen.getByText('13700137000')).toBeInTheDocument();
    expect(screen.getByText('wang_wu')).toBeInTheDocument();
    expect(screen.getByText('wangwu@example.com')).toBeInTheDocument();
    expect(screen.getByText('账期')).toBeInTheDocument();
    expect(screen.getByText('45 天')).toBeInTheDocument();
    expect(screen.getByText('重要客户')).toBeInTheDocument();
  });

  it('should show dash for null/undefined optional fields', () => {
    const customerWithNulls: Customer = {
      ...mockCustomer,
      contactName: null,
      phone: null,
      wechat: null,
      email: null,
      notes: null,
    };

    render(<CustomerBasicInfo customer={customerWithNulls} />);

    // All optional fields with null should render '-'
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(5);
  });

  it('should show dash for credit days when customer is prepay', () => {
    const prepayCustomer: Customer = {
      ...mockCustomer,
      creditType: CreditType.PREPAY,
      creditDays: null,
    };

    render(<CustomerBasicInfo customer={prepayCustomer} />);

    expect(screen.getByText('预付款')).toBeInTheDocument();
    // Credit days label exists but shows '-'
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});
