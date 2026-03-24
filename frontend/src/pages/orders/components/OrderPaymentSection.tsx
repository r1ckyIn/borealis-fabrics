/**
 * Order payment management: customer payment tab and supplier payments tab.
 * Includes edit modals with mandatory voucher upload for both payment types.
 */

import { useState, useCallback } from 'react';
import {
  Modal,
  Form,
  InputNumber,
  Select,
  DatePicker,
  Space,
  Spin,
  Empty,
  message,
} from 'antd';
import dayjs from 'dayjs';

import { PaymentStatusCard } from '@/components/business/PaymentStatusCard';
import { VoucherUploader } from '@/components/business/VoucherUploader';
import { VoucherList } from '@/components/business/VoucherList';
import {
  useUpdateCustomerPayment,
  useUpdateSupplierPayment,
  usePaymentVouchers,
} from '@/hooks/queries/useOrders';
import { getErrorMessage } from '@/utils/errorMessages';
import {
  CustomerPayStatus,
  CUSTOMER_PAY_STATUS_LABELS,
  PaymentMethod,
  PAYMENT_METHOD_LABELS,
} from '@/types';
import type {
  Order,
  SupplierPayment,
  PaymentRecord,
  UpdateCustomerPaymentData,
  UpdateSupplierPaymentData,
  ApiError,
} from '@/types';

const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

const PAY_STATUS_OPTIONS = Object.values(CustomerPayStatus).map((value) => ({
  label: CUSTOMER_PAY_STATUS_LABELS[value],
  value,
}));

const PAY_METHOD_OPTIONS = Object.values(PaymentMethod).map((value) => ({
  label: PAYMENT_METHOD_LABELS[value],
  value,
}));

// Payment form fields shared between customer and supplier modals
function PaymentFormFields() {
  return (
    <>
      <Form.Item
        name="paid"
        label="已付金额"
        rules={[{ required: true, message: '请输入已付金额' }]}
      >
        <InputNumber
          placeholder="请输入已付金额"
          style={{ width: '100%' }}
          min={0}
          precision={2}
          prefix="¥"
        />
      </Form.Item>
      <Form.Item
        name="payStatus"
        label="付款状态"
        rules={[{ required: true, message: '请选择付款状态' }]}
      >
        <Select options={PAY_STATUS_OPTIONS} placeholder="请选择付款状态" />
      </Form.Item>
      <Form.Item name="payMethod" label="付款方式">
        <Select
          options={PAY_METHOD_OPTIONS}
          placeholder="请选择付款方式"
          allowClear
        />
      </Form.Item>
      <Form.Item name="paidAt" label="付款时间">
        <DatePicker
          showTime
          style={{ width: '100%' }}
          placeholder="请选择付款时间"
        />
      </Form.Item>
    </>
  );
}

// =============================================================================
// Customer Payment Tab
// =============================================================================

export interface CustomerPaymentTabProps {
  orderId: number;
  order: Order;
}

export function CustomerPaymentTab({
  orderId,
  order,
}: CustomerPaymentTabProps): React.ReactElement {
  const [modalOpen, setModalOpen] = useState(false);
  const [voucherFileIds, setVoucherFileIds] = useState<number[]>([]);
  const [form] = Form.useForm();
  const mutation = useUpdateCustomerPayment();
  const { data: paymentRecords = [] } = usePaymentVouchers(orderId);
  const customerRecords = paymentRecords.filter(
    (r: PaymentRecord) => r.type === 'customer'
  );

  const openModal = useCallback(() => {
    form.setFieldsValue({
      paid: order.customerPaid,
      payStatus: order.customerPayStatus,
      payMethod: order.customerPayMethod ?? undefined,
      paidAt: order.customerPaidAt ? dayjs(order.customerPaidAt) : undefined,
    });
    setVoucherFileIds([]);
    setModalOpen(true);
  }, [order, form]);

  const handleSubmit = useCallback(async (): Promise<void> => {
    try {
      const values = await form.validateFields();
      const data: UpdateCustomerPaymentData = {
        customerPaid: values.paid,
        customerPayStatus: values.payStatus,
        customerPayMethod: values.payMethod,
        customerPaidAt: values.paidAt?.toISOString(),
        voucherFileIds,
      };
      await mutation.mutateAsync({ orderId, data });
      message.success('客户付款信息已更新');
      setModalOpen(false);
    } catch (error) {
      console.error('Update customer payment failed:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, form, mutation, voucherFileIds]);

  return (
    <>
      <PaymentStatusCard
        type="customer"
        totalAmount={order.totalAmount}
        paidAmount={order.customerPaid}
        payStatus={order.customerPayStatus}
        payMethod={order.customerPayMethod}
        paidAt={order.customerPaidAt}
        onEdit={openModal}
      />

      {customerRecords.length > 0 && (
        <div style={{ marginTop: 16 }}>
          <VoucherList paymentRecords={customerRecords} />
        </div>
      )}

      <Modal
        open={modalOpen}
        title="编辑客户付款信息"
        onOk={handleSubmit}
        onCancel={() => setModalOpen(false)}
        confirmLoading={mutation.isPending}
        okButtonProps={{
          disabled: mutation.isPending || voucherFileIds.length === 0,
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <PaymentFormFields />
          <Form.Item
            label="付款凭证"
            required
            help={
              voucherFileIds.length === 0
                ? '请上传至少一张付款凭证'
                : undefined
            }
            validateStatus={
              voucherFileIds.length === 0 ? 'error' : undefined
            }
          >
            <VoucherUploader
              value={voucherFileIds}
              onChange={setVoucherFileIds}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}

// =============================================================================
// Supplier Payments Tab
// =============================================================================

export interface SupplierPaymentsTabProps {
  orderId: number;
  supplierPayments: SupplierPayment[] | undefined;
  isLoading: boolean;
}

export function SupplierPaymentsTab({
  orderId,
  supplierPayments,
  isLoading,
}: SupplierPaymentsTabProps): React.ReactElement {
  const [modalState, setModalState] = useState<{
    open: boolean;
    payment: SupplierPayment | null;
  }>({ open: false, payment: null });
  const [voucherFileIds, setVoucherFileIds] = useState<number[]>([]);
  const [form] = Form.useForm();
  const mutation = useUpdateSupplierPayment();
  const { data: paymentRecords = [] } = usePaymentVouchers(orderId);

  const openModal = useCallback(
    (payment: SupplierPayment) => {
      form.setFieldsValue({
        paid: payment.paid,
        payStatus: payment.payStatus,
        payMethod: payment.payMethod ?? undefined,
        paidAt: payment.paidAt ? dayjs(payment.paidAt) : undefined,
      });
      setVoucherFileIds([]);
      setModalState({ open: true, payment });
    },
    [form]
  );

  const handleSubmit = useCallback(async (): Promise<void> => {
    if (!modalState.payment) return;
    try {
      const values = await form.validateFields();
      const data: UpdateSupplierPaymentData = {
        paid: values.paid,
        payStatus: values.payStatus,
        payMethod: values.payMethod,
        paidAt: values.paidAt?.toISOString(),
        voucherFileIds,
      };
      await mutation.mutateAsync({
        orderId,
        supplierId: modalState.payment.supplierId,
        data,
      });
      message.success('供应商付款信息已更新');
      setModalState({ open: false, payment: null });
    } catch (error) {
      console.error('Update supplier payment failed:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [orderId, modalState, form, mutation, voucherFileIds]);

  if (isLoading) {
    return (
      <div style={LOADING_STYLE}>
        <Spin />
      </div>
    );
  }

  if (!supplierPayments || supplierPayments.length === 0) {
    return <Empty description="暂无供应商付款信息" />;
  }

  return (
    <>
      <Space direction="vertical" style={{ width: '100%' }} size="middle">
        {supplierPayments.map((payment) => {
          const supplierRecords = paymentRecords.filter(
            (r: PaymentRecord) =>
              r.type === 'supplier' && r.supplierId === payment.supplierId
          );
          return (
            <div key={payment.supplierId}>
              <PaymentStatusCard
                type="supplier"
                totalAmount={payment.payable}
                paidAmount={payment.paid}
                payStatus={payment.payStatus}
                payMethod={payment.payMethod}
                paidAt={payment.paidAt}
                supplierName={payment.supplier?.companyName}
                onEdit={() => openModal(payment)}
              />
              {supplierRecords.length > 0 && (
                <div style={{ marginTop: 8, marginBottom: 16 }}>
                  <VoucherList paymentRecords={supplierRecords} />
                </div>
              )}
            </div>
          );
        })}
      </Space>

      <Modal
        open={modalState.open}
        title={`编辑供应商付款 - ${modalState.payment?.supplier?.companyName ?? ''}`}
        onOk={handleSubmit}
        onCancel={() => setModalState({ open: false, payment: null })}
        confirmLoading={mutation.isPending}
        okButtonProps={{
          disabled: mutation.isPending || voucherFileIds.length === 0,
        }}
        destroyOnClose
      >
        <Form form={form} layout="vertical">
          <PaymentFormFields />
          <Form.Item
            label="付款凭证"
            required
            help={
              voucherFileIds.length === 0
                ? '请上传至少一张付款凭证'
                : undefined
            }
            validateStatus={
              voucherFileIds.length === 0 ? 'error' : undefined
            }
          >
            <VoucherUploader
              value={voucherFileIds}
              onChange={setVoucherFileIds}
            />
          </Form.Item>
        </Form>
      </Modal>
    </>
  );
}
