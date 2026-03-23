/**
 * Custom hook encapsulating all state and handlers for FabricDetailPage.
 * Extracts useState, Form.useForm, query hooks, and handlers
 * so the page component remains a pure orchestrator.
 */

import { useState, useCallback, useMemo } from 'react';
import { Form, message } from 'antd';
import type { FormInstance } from 'antd';
import type { RcFile } from 'antd/es/upload/interface';

import {
  useFabric,
  useFabricSuppliers,
  useFabricPricing,
  useUploadFabricImage,
  useDeleteFabricImage,
  useAddFabricSupplier,
  useUpdateFabricSupplier,
  useRemoveFabricSupplier,
  useCreateFabricPricing,
  useUpdateFabricPricing,
  useDeleteFabricPricing,
  useDeleteFabric,
} from '@/hooks/queries/useFabrics';
import { getSuppliers } from '@/api/supplier.api';
import { getCustomers } from '@/api/customer.api';
import { getErrorMessage, getDeleteErrorMessage } from '@/utils/errorMessages';
import type { ApiError } from '@/types/api.types';
import type {
  Fabric,
  FabricSupplier,
  CustomerPricing,
  FabricImage,
  Supplier,
  Customer,
  CreateFabricSupplierData,
  UpdateFabricSupplierData,
  CreateFabricPricingData,
  UpdateFabricPricingData,
  PaginatedResult,
} from '@/types';
import type { BreadcrumbItem } from '@/components/layout/PageContainer';

// =============================================================================
// Types
// =============================================================================

interface ModalState<T> {
  open: boolean;
  mode: 'add' | 'edit';
  data?: T;
}

export interface SupplierModalControl {
  open: boolean;
  mode: 'add' | 'edit';
  form: FormInstance;
  onOpen: () => void;
  onEdit: (record: FabricSupplier) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  searchSuppliers: (keyword: string) => Promise<Supplier[]>;
}

export interface PricingModalControl {
  open: boolean;
  mode: 'add' | 'edit';
  form: FormInstance;
  onOpen: () => void;
  onEdit: (record: CustomerPricing) => void;
  onClose: () => void;
  onSubmit: () => Promise<void>;
  isSubmitting: boolean;
  searchCustomers: (keyword: string) => Promise<Customer[]>;
  defaultPrice: number | null | undefined;
}

export interface UseFabricDetailReturn {
  data: {
    fabric: Fabric | undefined;
    isLoading: boolean;
    fetchError: Error | null;
  };
  tabs: {
    activeTab: string;
    setActiveTab: (key: string) => void;
  };
  deleteFabric: {
    modalOpen: boolean;
    setModalOpen: (open: boolean) => void;
    handle: () => Promise<void>;
    isDeleting: boolean;
  };
  supplier: {
    data: PaginatedResult<FabricSupplier> | undefined;
    isLoading: boolean;
    modal: SupplierModalControl;
    onRemove: (supplierId: number) => Promise<void>;
  };
  pricing: {
    data: PaginatedResult<CustomerPricing> | undefined;
    isLoading: boolean;
    modal: PricingModalControl;
    onDelete: (pricingId: number) => Promise<void>;
  };
  images: {
    items: FabricImage[] | undefined;
    onUpload: (file: RcFile) => Promise<boolean>;
    onDelete: (imageId: number) => Promise<void>;
    isUploading: boolean;
    uploadProgress: number;
  };
  breadcrumbs: BreadcrumbItem[];
}

// =============================================================================
// Hook
// =============================================================================

export function useFabricDetail(
  fabricId: number | undefined,
  navigate: (path: string) => void
): UseFabricDetailReturn {
  // Tab state
  const [activeTab, setActiveTab] = useState('info');
  const [deleteFabricModalOpen, setDeleteFabricModalOpen] = useState(false);

  // Modal states
  const [supplierModal, setSupplierModal] = useState<ModalState<FabricSupplier>>({
    open: false,
    mode: 'add',
  });
  const [pricingModal, setPricingModal] = useState<ModalState<CustomerPricing>>({
    open: false,
    mode: 'add',
  });

  // Forms
  const [supplierForm] = Form.useForm();
  const [pricingForm] = Form.useForm();

  // Fetch fabric data
  const {
    data: fabric,
    isLoading: isLoadingFabric,
    error: fetchError,
  } = useFabric(fabricId);

  // Fetch related data
  const { data: suppliersData, isLoading: isLoadingSuppliers } =
    useFabricSuppliers(fabricId, undefined, activeTab === 'suppliers');

  const { data: pricingData, isLoading: isLoadingPricing } =
    useFabricPricing(fabricId, undefined, activeTab === 'pricing');

  // Mutations
  const deleteFabricMutation = useDeleteFabric();
  const uploadImageMutation = useUploadFabricImage();
  const deleteImageMutation = useDeleteFabricImage();
  const addSupplierMutation = useAddFabricSupplier();
  const updateSupplierMutation = useUpdateFabricSupplier();
  const removeSupplierMutation = useRemoveFabricSupplier();
  const createPricingMutation = useCreateFabricPricing();
  const updatePricingMutation = useUpdateFabricPricing();
  const deletePricingMutation = useDeleteFabricPricing();

  // Breadcrumbs
  const breadcrumbs = useMemo<BreadcrumbItem[]>(
    () => [
      { label: '首页', path: '/' },
      { label: '面料管理', path: '/fabrics' },
      { label: fabric?.name ?? '面料详情' },
    ],
    [fabric?.name]
  );

  // ===========================================================================
  // Delete Fabric
  // ===========================================================================

  const handleDeleteFabric = useCallback(async (): Promise<void> => {
    if (!fabricId) return;
    try {
      await deleteFabricMutation.mutateAsync(fabricId);
      message.success('面料已删除');
      navigate('/fabrics');
    } catch (error) {
      console.error('Delete fabric failed:', error);
      message.error(getDeleteErrorMessage(error as ApiError, '面料'));
    }
  }, [fabricId, deleteFabricMutation, navigate]);

  // ===========================================================================
  // Supplier Handlers
  // ===========================================================================

  const openAddSupplier = useCallback(() => {
    supplierForm.resetFields();
    setSupplierModal({ open: true, mode: 'add' });
  }, [supplierForm]);

  const openEditSupplier = useCallback(
    (record: FabricSupplier) => {
      supplierForm.setFieldsValue({
        supplierId: record.supplierId,
        purchasePrice: record.purchasePrice,
        minOrderQty: record.minOrderQty,
        leadTimeDays: record.leadTimeDays,
      });
      setSupplierModal({ open: true, mode: 'edit', data: record });
    },
    [supplierForm]
  );

  const closeSupplierModal = useCallback(() => {
    setSupplierModal({ open: false, mode: 'add' });
    supplierForm.resetFields();
  }, [supplierForm]);

  const submitSupplier = useCallback(async () => {
    if (!fabricId) return;
    try {
      const values = await supplierForm.validateFields();
      const isAdd = supplierModal.mode === 'add';

      if (isAdd) {
        await addSupplierMutation.mutateAsync({
          fabricId,
          data: values as CreateFabricSupplierData,
        });
        message.success('供应商关联成功');
      } else if (supplierModal.data) {
        const { purchasePrice, minOrderQty, leadTimeDays } = values;
        await updateSupplierMutation.mutateAsync({
          fabricId,
          supplierId: supplierModal.data.supplierId,
          data: { purchasePrice, minOrderQty, leadTimeDays } as UpdateFabricSupplierData,
        });
        message.success('供应商信息更新成功');
      }
      closeSupplierModal();
    } catch (error: unknown) {
      console.error('Supplier modal error:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [fabricId, supplierForm, supplierModal, addSupplierMutation, updateSupplierMutation, closeSupplierModal]);

  const removeSupplier = useCallback(
    async (supplierId: number) => {
      if (!fabricId) return;
      try {
        await removeSupplierMutation.mutateAsync({ fabricId, supplierId });
        message.success('供应商已移除');
      } catch (error: unknown) {
        console.error('Remove supplier error:', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [fabricId, removeSupplierMutation]
  );

  // ===========================================================================
  // Pricing Handlers
  // ===========================================================================

  const openAddPricing = useCallback(() => {
    pricingForm.resetFields();
    setPricingModal({ open: true, mode: 'add' });
  }, [pricingForm]);

  const openEditPricing = useCallback(
    (record: CustomerPricing) => {
      pricingForm.setFieldsValue({
        customerId: record.customerId,
        specialPrice: record.specialPrice,
      });
      setPricingModal({ open: true, mode: 'edit', data: record });
    },
    [pricingForm]
  );

  const closePricingModal = useCallback(() => {
    setPricingModal({ open: false, mode: 'add' });
    pricingForm.resetFields();
  }, [pricingForm]);

  const submitPricing = useCallback(async () => {
    if (!fabricId) return;
    try {
      const values = await pricingForm.validateFields();
      const isAdd = pricingModal.mode === 'add';

      if (isAdd) {
        await createPricingMutation.mutateAsync({
          fabricId,
          data: values as CreateFabricPricingData,
        });
        message.success('客户定价添加成功');
      } else if (pricingModal.data) {
        await updatePricingMutation.mutateAsync({
          fabricId,
          pricingId: pricingModal.data.id,
          data: { specialPrice: values.specialPrice } as UpdateFabricPricingData,
        });
        message.success('客户定价更新成功');
      }
      closePricingModal();
    } catch (error: unknown) {
      console.error('Pricing modal error:', error);
      message.error(getErrorMessage(error as ApiError));
    }
  }, [fabricId, pricingForm, pricingModal, createPricingMutation, updatePricingMutation, closePricingModal]);

  const deletePricing = useCallback(
    async (pricingId: number) => {
      if (!fabricId) return;
      try {
        await deletePricingMutation.mutateAsync({ fabricId, pricingId });
        message.success('客户定价已删除');
      } catch (error: unknown) {
        console.error('Delete pricing error:', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [fabricId, deletePricingMutation]
  );

  // ===========================================================================
  // Image Handlers
  // ===========================================================================

  const handleUploadImage = useCallback(
    async (file: RcFile): Promise<boolean> => {
      if (!fabricId) return false;
      try {
        await uploadImageMutation.mutateAsync({ fabricId, file });
        message.success('图片上传成功');
        return false; // Prevent default upload behavior
      } catch (error: unknown) {
        console.error('Upload error:', error);
        message.error(getErrorMessage(error as ApiError));
        return false;
      }
    },
    [fabricId, uploadImageMutation]
  );

  const handleDeleteImage = useCallback(
    async (imageId: number) => {
      if (!fabricId) return;
      try {
        await deleteImageMutation.mutateAsync({ fabricId, imageId });
        message.success('图片已删除');
      } catch (error: unknown) {
        console.error('Delete image error:', error);
        message.error(getErrorMessage(error as ApiError));
      }
    },
    [fabricId, deleteImageMutation]
  );

  // ===========================================================================
  // Search Helpers
  // ===========================================================================

  const searchSuppliers = useCallback(
    async (keyword: string): Promise<Supplier[]> =>
      (await getSuppliers({ keyword, pageSize: 20 })).items,
    []
  );

  const searchCustomers = useCallback(
    async (keyword: string): Promise<Customer[]> =>
      (await getCustomers({ keyword, pageSize: 20 })).items,
    []
  );

  // ===========================================================================
  // Return
  // ===========================================================================

  return {
    data: {
      fabric,
      isLoading: isLoadingFabric,
      fetchError,
    },
    tabs: {
      activeTab,
      setActiveTab,
    },
    deleteFabric: {
      modalOpen: deleteFabricModalOpen,
      setModalOpen: setDeleteFabricModalOpen,
      handle: handleDeleteFabric,
      isDeleting: deleteFabricMutation.isPending,
    },
    supplier: {
      data: suppliersData,
      isLoading: isLoadingSuppliers,
      modal: {
        open: supplierModal.open,
        mode: supplierModal.mode,
        form: supplierForm,
        onOpen: openAddSupplier,
        onEdit: openEditSupplier,
        onClose: closeSupplierModal,
        onSubmit: submitSupplier,
        isSubmitting: addSupplierMutation.isPending || updateSupplierMutation.isPending,
        searchSuppliers,
      },
      onRemove: removeSupplier,
    },
    pricing: {
      data: pricingData,
      isLoading: isLoadingPricing,
      modal: {
        open: pricingModal.open,
        mode: pricingModal.mode,
        form: pricingForm,
        onOpen: openAddPricing,
        onEdit: openEditPricing,
        onClose: closePricingModal,
        onSubmit: submitPricing,
        isSubmitting: createPricingMutation.isPending || updatePricingMutation.isPending,
        searchCustomers,
        defaultPrice: fabric?.defaultPrice,
      },
      onDelete: deletePricing,
    },
    images: {
      items: fabric?.images,
      onUpload: handleUploadImage,
      onDelete: handleDeleteImage,
      isUploading: uploadImageMutation.isPending,
      uploadProgress: uploadImageMutation.uploadProgress,
    },
    breadcrumbs,
  };
}
