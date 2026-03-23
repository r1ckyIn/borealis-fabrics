/**
 * Status change, cancel, and restore modals for order items.
 */

import { Modal, Form, Input, Typography } from 'antd';

import { ConfirmModal } from '@/components/common/ConfirmModal';
import { getStatusLabel } from '@/utils';
import { OrderItemStatus } from '@/types';
import type { StatusActionControl } from '@/hooks/useOrderItemsSection';

const { Text } = Typography;

export interface OrderItemStatusActionsProps {
  control: StatusActionControl;
}

export function OrderItemStatusActions({
  control,
}: OrderItemStatusActionsProps): React.ReactElement {
  return (
    <>
      {/* Status Change Modal */}
      <Modal
        open={control.statusModal.open}
        title="确认状态变更"
        onOk={control.onConfirmStatus}
        onCancel={control.onCloseStatus}
        confirmLoading={control.isStatusChanging}
        okButtonProps={{ disabled: control.isStatusChanging }}
      >
        <p>
          确定要将明细状态推进到
          <Text strong>
            「{control.statusModal.targetStatus
              ? getStatusLabel(control.statusModal.targetStatus)
              : ''}」
          </Text>
          吗？
        </p>
        <Form form={control.statusForm} layout="vertical">
          <Form.Item name="remark" label="备注（可选）">
            <Input.TextArea rows={2} placeholder="请输入备注" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Cancel Item Modal */}
      <Modal
        open={control.cancelModal.open}
        title="确认取消"
        onOk={control.onConfirmCancel}
        onCancel={control.onCloseCancel}
        confirmLoading={control.isCancelling}
        okButtonProps={{ danger: true, disabled: control.isCancelling }}
        okText="确认取消"
      >
        <p>确定要取消此订单明细吗？取消后可恢复到之前的状态。</p>
        <Form form={control.cancelForm} layout="vertical">
          <Form.Item name="reason" label="取消原因（可选）">
            <Input.TextArea rows={2} placeholder="请输入取消原因" />
          </Form.Item>
        </Form>
      </Modal>

      {/* Restore Item Modal */}
      <ConfirmModal
        open={control.restoreModal.open}
        title="确认恢复"
        content={
          <>
            确定要恢复此订单明细吗？
            {control.restoreModal.item?.prevStatus && (
              <>
                <br />
                <Text type="secondary">
                  将恢复到「{getStatusLabel(
                    control.restoreModal.item.prevStatus as OrderItemStatus
                  )}」状态
                </Text>
              </>
            )}
          </>
        }
        onConfirm={control.onConfirmRestore}
        onCancel={control.onCloseRestore}
        confirmText="确认恢复"
        loading={control.isRestoring}
      />
    </>
  );
}
