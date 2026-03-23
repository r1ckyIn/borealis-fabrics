/**
 * Custom hook managing all state and handlers for CustomerDetailPage.
 * Extracts state, queries, mutations, and callbacks from the orchestrator page.
 */

import { useState, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { Form, message } from 'antd';

import {
  useCustomer,
  useCustomerPricing,
  useCustomerOrders,
  useCreateCustomerPricing,
  useUpdateCustomerPricing,
  useDeleteCustomerPricing,
  useDeleteCustomer,
} from '@/hooks/queries/useCustomers';
import { fabricApi } from '@/api';
import { getDeleteErrorMessage } from '@/utils/errorMessages';
import type { ApiError, CustomerPricing, Fabric } from '@/types';

/** Pricing form values type. */
export interface PricingFormValues {
  fabricId: number;
  specialPrice: number;
}

/** Pricing modal control object passed to sub-components. */
export interface PricingModalControl {
  open: boolean;
  editing: CustomerPricing | null;
  form: ReturnType<typeof Form.useForm<PricingFormValues>>[0];
  isSubmitting: boolean;
  onOpenCreate: () => void;
  onOpenEdit: (pricing: CustomerPricing) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  searchFabrics: (keyword: string) => Promise<Fabric[]>;
}

/** Delete pricing modal control object. */
export interface DeletePricingControl {
  open: boolean;
  target: CustomerPricing | null;
  isDeleting: boolean;
  onOpen: (pricing: CustomerPricing) => void;
  onClose: () => void;
  onConfirm: () => Promise<void>;
}

/** Return type of useCustomerDetail hook. */
export type UseCustomerDetailReturn = ReturnType<typeof useCustomerDetail>;

/**
 * Hook managing all CustomerDetailPage state and handlers.
 * @param customerId - The customer entity ID (from URL params)
 */
export function useCustomerDetail(customerId: number | undefined) {
  const navigate = useNavigate();

  // Tab state
  const [activeTab, setActiveTab] = useState('info');
  const [deleteCustomerModalOpen, setDeleteCustomerModalOpen] = useState(false);

  // Pricing modal state
  const [pricingModalOpen, setPricingModalOpen] = useState(false);
  const [editingPricing, setEditingPricing] = useState<CustomerPricing | null>(null);
  const [pricingForm] = Form.useForm<PricingFormValues>();

  // Delete pricing confirmation modal
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [pricingToDelete, setPricingToDelete] = useState<CustomerPricing | null>(null);

  // Fetch customer data
  const {
    data: customer,
    isLoading: isLoadingCustomer,
    error: fetchError,
  } = useCustomer(customerId);

  // Fetch pricing when tab is active
  const { data: pricingData, isLoading: isLoadingPricing } = useCustomerPricing(
    customerId,
    activeTab === 'pricing'
  );

  // Fetch orders when tab is active
  const { data: ordersData, isLoading: isLoadingOrders } = useCustomerOrders(
    customerId,
    undefined,
    activeTab === 'orders'
  );

  // Mutations
  const deleteCustomerMutation = useDeleteCustomer();
  const createPricingMutation = useCreateCustomerPricing();
  const updatePricingMutation = useUpdateCustomerPricing();
  const deletePricingMutation = useDeleteCustomerPricing();

  // Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { label: '首页', path: '/' },
      { label: '客户管理', path: '/customers' },
      { label: customer?.companyName ?? '客户详情' },
    ],
    [customer?.companyName]
  );

  // ---------------------------------------------------------------------------
  // Navigation helpers
  // ---------------------------------------------------------------------------

  const goToList = useCallback(() => navigate('/customers'), [navigate]);

  const goToEdit = useCallback(
    () => {
      if (customerId) navigate(`/customers/${customerId}/edit`);
    },
    [customerId, navigate]
  );

  const goToOrderDetail = useCallback(
    (orderId: number) => navigate(`/orders/${orderId}`),
    [navigate]
  );

  const goToFabricDetail = useCallback(
    (fabricId: number) => navigate(`/fabrics/${fabricId}`),
    [navigate]
  );

  // ---------------------------------------------------------------------------
  // Delete Customer
  // ---------------------------------------------------------------------------

  const handleDeleteCustomer = useCallback(async (): Promise<void> => {
    if (!customerId) return;
    try {
      await deleteCustomerMutation.mutateAsync(customerId);
      message.success('客户已删除');
      navigate('/customers');
    } catch (error) {
      console.error('Delete customer failed:', error);
      message.error(getDeleteErrorMessage(error as ApiError, '客户'));
    }
  }, [customerId, deleteCustomerMutation, navigate]);

  // ---------------------------------------------------------------------------
  // Search fabrics for pricing modal
  // ---------------------------------------------------------------------------

  const searchFabrics = useCallback(
    async (keyword: string): Promise<Fabric[]> => {
      const result = await fabricApi.getFabrics({ keyword, page: 1, pageSize: 20 });
      return result.items;
    },
    []
  );

  // ---------------------------------------------------------------------------
  // Pricing Modal Handlers
  // ---------------------------------------------------------------------------

  const openCreatePricingModal = useCallback((): void => {
    setEditingPricing(null);
    pricingForm.resetFields();
    setPricingModalOpen(true);
  }, [pricingForm]);

  const openEditPricingModal = useCallback(
    (pricing: CustomerPricing): void => {
      setEditingPricing(pricing);
      pricingForm.setFieldsValue({
        fabricId: pricing.fabricId,
        specialPrice: pricing.specialPrice,
      });
      setPricingModalOpen(true);
    },
    [pricingForm]
  );

  const closePricingModal = useCallback((): void => {
    setPricingModalOpen(false);
    setEditingPricing(null);
    pricingForm.resetFields();
  }, [pricingForm]);

  const handlePricingSubmit = useCallback(async (): Promise<void> => {
    if (!customerId) return;

    try {
      const values = await pricingForm.validateFields();

      if (editingPricing) {
        await updatePricingMutation.mutateAsync({
          customerId,
          pricingId: editingPricing.id,
          data: { specialPrice: values.specialPrice },
        });
        message.success('特殊定价更新成功');
      } else {
        await createPricingMutation.mutateAsync({
          customerId,
          data: {
            fabricId: values.fabricId,
            specialPrice: values.specialPrice,
          },
        });
        message.success('特殊定价创建成功');
      }
      closePricingModal();
    } catch (error) {
      console.error('Pricing submit error:', error);
      message.error(editingPricing ? '更新失败，请重试' : '创建失败，请重试');
    }
  }, [
    customerId,
    pricingForm,
    editingPricing,
    createPricingMutation,
    updatePricingMutation,
    closePricingModal,
  ]);

  // ---------------------------------------------------------------------------
  // Delete Pricing Handlers
  // ---------------------------------------------------------------------------

  const openDeletePricingModal = useCallback((pricing: CustomerPricing): void => {
    setPricingToDelete(pricing);
    setDeleteModalOpen(true);
  }, []);

  const closeDeleteModal = useCallback((): void => {
    setDeleteModalOpen(false);
    setPricingToDelete(null);
  }, []);

  const handleDeletePricingConfirm = useCallback(async (): Promise<void> => {
    if (!customerId || !pricingToDelete) return;

    try {
      await deletePricingMutation.mutateAsync({
        customerId,
        pricingId: pricingToDelete.id,
      });
      message.success('特殊定价已删除');
      closeDeleteModal();
    } catch (error) {
      console.error('Delete pricing error:', error);
      message.error('删除失败，请重试');
    }
  }, [customerId, pricingToDelete, deletePricingMutation, closeDeleteModal]);

  // ---------------------------------------------------------------------------
  // Grouped return value
  // ---------------------------------------------------------------------------

  return {
    data: {
      customer,
      isLoading: isLoadingCustomer,
      fetchError,
    },
    tabs: {
      activeTab,
      setActiveTab,
    },
    deleteCustomer: {
      modalOpen: deleteCustomerModalOpen,
      setModalOpen: setDeleteCustomerModalOpen,
      handle: handleDeleteCustomer,
      isDeleting: deleteCustomerMutation.isPending,
    },
    pricing: {
      data: pricingData,
      isLoading: isLoadingPricing,
      modal: {
        open: pricingModalOpen,
        editing: editingPricing,
        form: pricingForm,
        isSubmitting: createPricingMutation.isPending || updatePricingMutation.isPending,
        onOpenCreate: openCreatePricingModal,
        onOpenEdit: openEditPricingModal,
        onClose: closePricingModal,
        onSubmit: handlePricingSubmit,
        searchFabrics,
      } satisfies PricingModalControl,
      deletePricing: {
        open: deleteModalOpen,
        target: pricingToDelete,
        isDeleting: deletePricingMutation.isPending,
        onOpen: openDeletePricingModal,
        onClose: closeDeleteModal,
        onConfirm: handleDeletePricingConfirm,
      } satisfies DeletePricingControl,
    },
    orders: {
      data: ordersData,
      isLoading: isLoadingOrders,
    },
    navigation: {
      goToList,
      goToEdit,
      goToOrderDetail,
      goToFabricDetail,
    },
    breadcrumbs,
  };
}
