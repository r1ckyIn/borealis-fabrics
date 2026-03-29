/**
 * Toggle switch for showing/hiding soft-deleted records.
 * Only visible to admin users (boss/developer).
 */

import { Switch, Space } from 'antd';

import { useUser } from '@/store/authStore';

export interface SoftDeleteToggleProps {
  showDeleted: boolean;
  onChange: (checked: boolean) => void;
}

export function SoftDeleteToggle({
  showDeleted,
  onChange,
}: SoftDeleteToggleProps): React.ReactElement | null {
  const user = useUser();

  if (!user?.isAdmin) return null;

  return (
    <Space>
      <Switch
        checkedChildren="显示已删除"
        unCheckedChildren="仅显示活跃"
        checked={showDeleted}
        onChange={onChange}
      />
    </Space>
  );
}
