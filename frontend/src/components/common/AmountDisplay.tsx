import type { ReactNode } from 'react';
import { Typography } from 'antd';
import { formatCurrency } from '@/utils/format';

const { Text } = Typography;

export interface AmountDisplayProps {
  value: number | string | null | undefined;
  prefix?: string;
  suffix?: string;
  showSign?: boolean;
  colorize?: boolean;
  decimals?: number;
}

export function AmountDisplay({
  value,
  prefix,
  suffix,
  showSign = false,
  colorize = false,
  decimals = 2,
}: AmountDisplayProps): ReactNode {
  if (value === null || value === undefined || value === '') {
    return <Text type="secondary">-</Text>;
  }

  const numValue = typeof value === 'string' ? parseFloat(value) : value;

  if (isNaN(numValue)) {
    return <Text type="secondary">-</Text>;
  }

  const formatted = formatCurrency(numValue, {
    symbol: prefix ?? '¥',
    decimals,
    showPlusSign: showSign,
  });

  function getTextType(): 'success' | 'danger' | undefined {
    if (!colorize) return undefined;
    if (numValue > 0) return 'success';
    if (numValue < 0) return 'danger';
    return undefined;
  }

  const displayText = suffix ? `${formatted} ${suffix}` : formatted;

  return <Text type={getTextType()}>{displayText}</Text>;
}
