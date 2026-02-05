/**
 * Amount display component for formatted currency values.
 * Supports color coding for positive/negative values.
 */

import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { formatCurrency } from '@/utils/format';

const { Text } = Typography;

// =====================
// Types
// =====================

export interface AmountDisplayProps {
  value: number | string | null | undefined;
  prefix?: string;
  suffix?: string;
  showSign?: boolean;
  colorize?: boolean;
  decimals?: number;
}

// =====================
// Component
// =====================

export function AmountDisplay({
  value,
  prefix,
  suffix,
  showSign = false,
  colorize = false,
  decimals = 2,
}: AmountDisplayProps): ReactNode {
  // Handle null/undefined
  if (value === null || value === undefined || value === '') {
    return <Text type="secondary">-</Text>;
  }

  // Parse value to number
  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  // Handle NaN
  if (isNaN(numValue)) {
    return <Text type="secondary">-</Text>;
  }

  // Format the currency
  const formatted = formatCurrency(numValue, {
    symbol: prefix ?? '¥',
    decimals,
    showPlusSign: showSign,
  });

  // Determine text type based on value
  let textType: 'success' | 'danger' | undefined;
  if (colorize) {
    if (numValue > 0) {
      textType = 'success';
    } else if (numValue < 0) {
      textType = 'danger';
    }
  }

  // Build the display string
  const displayText = suffix ? `${formatted} ${suffix}` : formatted;

  return <Text type={textType}>{displayText}</Text>;
}
