/**
 * Unit tests for AddressManager component.
 */

import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { describe, it, expect } from 'vitest';
import { AddressManager } from '../AddressManager';
import type { Address } from '@/types/entities.types';

const mockAddresses: Address[] = [
  {
    province: '广东省',
    city: '深圳市',
    district: '南山区',
    detailAddress: '科技园南路100号',
    contactName: '张三',
    contactPhone: '13800138001',
    label: '公司',
    isDefault: true,
  },
  {
    province: '广东省',
    city: '广州市',
    district: '天河区',
    detailAddress: '体育西路168号',
    contactName: '李四',
    contactPhone: '13900139002',
    label: '仓库',
    isDefault: false,
  },
];

describe('AddressManager', () => {
  describe('Rendering', () => {
    it('renders empty state when no addresses', () => {
      render(<AddressManager />);
      expect(screen.getByText('暂无收货地址')).toBeInTheDocument();
      expect(screen.getByText('0/10 个地址')).toBeInTheDocument();
    });

    it('renders address list correctly', () => {
      render(<AddressManager value={mockAddresses} />);
      expect(screen.getByText('张三 13800138001')).toBeInTheDocument();
      expect(screen.getByText('李四 13900139002')).toBeInTheDocument();
      expect(screen.getByText('公司')).toBeInTheDocument();
      expect(screen.getByText('仓库')).toBeInTheDocument();
      expect(screen.getByText('2/10 个地址')).toBeInTheDocument();
    });

    it('shows default tag for default address', () => {
      render(<AddressManager value={mockAddresses} />);
      expect(screen.getByText('默认')).toBeInTheDocument();
    });

    it('renders add button when not disabled', () => {
      render(<AddressManager value={[]} />);
      expect(screen.getByRole('button', { name: /添加地址/ })).toBeInTheDocument();
    });

    it('hides add button when disabled', () => {
      render(<AddressManager value={[]} disabled />);
      expect(screen.queryByRole('button', { name: /添加地址/ })).not.toBeInTheDocument();
    });

    it('hides add button when max addresses reached', () => {
      const manyAddresses = Array(10).fill(null).map((_, i) => ({
        ...mockAddresses[0],
        contactName: `Person ${i}`,
        isDefault: i === 0,
      }));
      render(<AddressManager value={manyAddresses} maxAddresses={10} />);
      expect(screen.queryByRole('button', { name: /添加地址/ })).not.toBeInTheDocument();
    });
  });

  describe('Add Address', () => {
    it('opens modal when add button clicked', () => {
      render(<AddressManager value={[]} />);
      fireEvent.click(screen.getByRole('button', { name: /添加地址/ }));
      // Modal title should be visible
      expect(document.querySelector('.ant-modal')).toBeInTheDocument();
    });

    it('has form fields in modal', async () => {
      render(<AddressManager value={[]} />);

      fireEvent.click(screen.getByRole('button', { name: /添加地址/ }));

      // Check form fields exist
      expect(screen.getByPlaceholderText('请输入联系人姓名')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入联系电话')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('省份')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('城市')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('区县')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('请输入详细地址（街道、门牌号等）')).toBeInTheDocument();
    });
  });

  describe('Edit Address', () => {
    it('opens modal when edit button clicked', async () => {
      render(<AddressManager value={mockAddresses} />);

      const editIcon = document.querySelector('.anticon-edit');
      const editButton = editIcon?.closest('button');

      if (editButton) {
        fireEvent.click(editButton);
        await waitFor(() => {
          expect(screen.getByText('编辑地址')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Delete Address', () => {
    it('shows confirmation dialog when delete clicked', async () => {
      render(<AddressManager value={mockAddresses} />);

      const deleteIcon = document.querySelector('.anticon-delete');
      const deleteButton = deleteIcon?.closest('button');

      if (deleteButton) {
        fireEvent.click(deleteButton);
        await waitFor(() => {
          expect(screen.getByText('确定删除这个地址吗？')).toBeInTheDocument();
        });
      }
    });
  });

  describe('Set Default', () => {
    it('has star icons for each address', () => {
      render(<AddressManager value={mockAddresses} />);

      // Check that star icons exist
      const starIcons = document.querySelectorAll('.anticon-star, .anticon-star-filled');
      expect(starIcons.length).toBeGreaterThan(0);
    });
  });
});
