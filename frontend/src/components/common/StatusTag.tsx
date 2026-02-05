import type { ReactNode } from 'react';
import { Badge, Tag } from 'antd';
import type { PresetStatusColorType } from 'antd/es/_util/colors';
import { getStatusTagColor, getStatusTagLabel } from './statusTagHelpers';
import type { StatusType } from './statusTagHelpers';

export interface StatusTagProps {
  type: StatusType;
  value: string;
  showDot?: boolean;
}

export function StatusTag({
  type,
  value,
  showDot = false,
}: StatusTagProps): ReactNode {
  const color = getStatusTagColor(type, value);
  const label = getStatusTagLabel(type, value);

  if (showDot) {
    return <Badge status={color as PresetStatusColorType} text={label} />;
  }

  return <Tag color={color}>{label}</Tag>;
}
