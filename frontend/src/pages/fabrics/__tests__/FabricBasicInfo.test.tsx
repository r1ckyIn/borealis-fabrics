/**
 * Unit tests for FabricBasicInfo sub-component.
 */

import { render, screen } from '@testing-library/react';
import { describe, it, expect } from 'vitest';

import { FabricBasicInfo } from '../components/FabricBasicInfo';
import type { Fabric } from '@/types';

const mockFabric: Fabric = {
  id: 1,
  fabricCode: 'FB-2401-0001',
  name: '高档涤纶面料',
  material: { primary: '涤纶', secondary: '氨纶' },
  composition: '80%涤纶 20%氨纶',
  color: '黑色',
  weight: 180.5,
  width: 150,
  thickness: '中',
  handFeel: 'soft',
  glossLevel: 'matte',
  application: ['clothing', 'sports'],
  defaultPrice: 25.5,
  defaultLeadTime: 7,
  description: '高品质面料',
  tags: ['热销', '高档'],
  notes: '库存充足',
  isActive: true,
  createdAt: '2024-01-01T00:00:00.000Z',
  updatedAt: '2024-01-01T00:00:00.000Z',
};

describe('FabricBasicInfo', () => {
  it('should render fabric code and name', () => {
    render(<FabricBasicInfo fabric={mockFabric} />);

    expect(screen.getByText('FB-2401-0001')).toBeInTheDocument();
    expect(screen.getByText('高档涤纶面料')).toBeInTheDocument();
  });

  it('should render material and composition fields', () => {
    render(<FabricBasicInfo fabric={mockFabric} />);

    expect(screen.getByText('涤纶')).toBeInTheDocument();
    expect(screen.getByText('氨纶')).toBeInTheDocument();
    expect(screen.getByText('80%涤纶 20%氨纶')).toBeInTheDocument();
  });

  it('should render weight and width with units', () => {
    render(<FabricBasicInfo fabric={mockFabric} />);

    expect(screen.getByText('180.5 g/m²')).toBeInTheDocument();
    expect(screen.getByText('150 cm')).toBeInTheDocument();
  });

  it('should render tags', () => {
    render(<FabricBasicInfo fabric={mockFabric} />);

    expect(screen.getByText('热销')).toBeInTheDocument();
    expect(screen.getByText('高档')).toBeInTheDocument();
  });

  it('should render application tags', () => {
    render(<FabricBasicInfo fabric={mockFabric} />);

    expect(screen.getByText('clothing')).toBeInTheDocument();
    expect(screen.getByText('sports')).toBeInTheDocument();
  });

  it('should render dash for null optional fields', () => {
    const minimalFabric: Fabric = {
      id: 2,
      fabricCode: 'FB-2401-0002',
      name: '基础面料',
      isActive: true,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    };

    render(<FabricBasicInfo fabric={minimalFabric} />);

    expect(screen.getByText('FB-2401-0002')).toBeInTheDocument();
    expect(screen.getByText('基础面料')).toBeInTheDocument();
    // Null fields render as dashes
    const dashes = screen.getAllByText('-');
    expect(dashes.length).toBeGreaterThan(0);
  });
});
