/**
 * Order items section orchestrator.
 * Delegates all state to useOrderItemsSection hook and rendering
 * to OrderItemTable, OrderItemFormModal, and OrderItemStatusActions.
 */

import { Button } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import type { NavigateFunction } from 'react-router-dom';

import { useOrderItemsSection } from '@/hooks/useOrderItemsSection';
import type { OrderItem } from '@/types';

import { OrderItemTable } from './OrderItemTable';
import { OrderItemFormModal } from './OrderItemFormModal';
import { OrderItemStatusActions } from './OrderItemStatusActions';

export interface OrderItemsSectionProps {
  orderId: number;
  orderItems: OrderItem[] | undefined;
  isLoading: boolean;
  navigate: NavigateFunction;
}

export function OrderItemsSection({
  orderId,
  orderItems,
  isLoading,
  navigate,
}: OrderItemsSectionProps): React.ReactElement {
  const { itemForm, statusActions, deleteItem } = useOrderItemsSection(orderId);

  return (
    <>
      {/* Add item button */}
      <div style={{ marginBottom: 16 }}>
        <Button type="primary" icon={<PlusOutlined />} onClick={itemForm.onAdd}>
          添加明细
        </Button>
      </div>

      {/* Items table */}
      <OrderItemTable
        items={orderItems}
        isLoading={isLoading}
        navigate={navigate}
        onEdit={itemForm.onEdit}
        onDelete={deleteItem.handle}
        isDeleting={deleteItem.isDeleting}
        onStatusAction={statusActions.onStatusChange}
        onCancel={statusActions.onCancel}
        onRestore={statusActions.onRestore}
      />

      {/* Add item modal */}
      <OrderItemFormModal
        mode="add"
        open={itemForm.addOpen}
        form={itemForm.addForm}
        onClose={itemForm.onCloseAdd}
        onSubmit={itemForm.onSubmitAdd}
        isSubmitting={itemForm.isAdding}
      />

      {/* Edit item modal */}
      <OrderItemFormModal
        mode="edit"
        open={itemForm.editModal.open}
        form={itemForm.editForm}
        onClose={itemForm.onCloseEdit}
        onSubmit={itemForm.onSubmitEdit}
        isSubmitting={itemForm.isEditing}
      />

      {/* Status / cancel / restore modals */}
      <OrderItemStatusActions control={statusActions} />
    </>
  );
}
