/**
 * Fabric detail page showing all fabric information.
 * Contains 4 tabs: Basic Info, Images, Suppliers, Customer Pricing.
 */

import { useState, useCallback, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Card,
  Tabs,
  Descriptions,
  Button,
  Space,
  Spin,
  Result,
  Table,
  Modal,
  Form,
  InputNumber,
  message,
  Typography,
  Tag,
  Image,
  Upload,
  Progress,
  Popconfirm,
  Empty,
} from 'antd';
import {
  EditOutlined,
  PlusOutlined,
  DeleteOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { RcFile } from 'antd/es/upload/interface';

import { PageContainer } from '@/components/layout/PageContainer';
import { AmountDisplay } from '@/components/common/AmountDisplay';
import { SupplierSelector } from '@/components/business/SupplierSelector';
import { CustomerSelector } from '@/components/business/CustomerSelector';
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
} from '@/hooks/queries/useFabrics';
import { getSuppliers } from '@/api/supplier.api';
import { getCustomers } from '@/api/customer.api';
import { formatDate, formatCurrency } from '@/utils/format';
import { parseEntityId } from '@/utils';
import type {
  FabricSupplier,
  CustomerPricing,
  Supplier,
  Customer,
  FabricImage,
  CreateFabricSupplierData,
  UpdateFabricSupplierData,
  CreateFabricPricingData,
  UpdateFabricPricingData,
} from '@/types';

const { Text } = Typography;

// =============================================================================
// Type Definitions & Constants
// =============================================================================

interface ModalState<T> {
  open: boolean;
  mode: 'add' | 'edit';
  data?: T;
}

const LOADING_STYLE = { textAlign: 'center', padding: '50px 0' } as const;

// =============================================================================
// Main Component
// =============================================================================

/**
 * Fabric detail page component.
 * Route: /fabrics/:id
 */
export default function FabricDetailPage(): React.ReactElement {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const fabricId = parseEntityId(id);

  // Tab state
  const [activeTab, setActiveTab] = useState('info');

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

  // Image mutations
  const uploadImageMutation = useUploadFabricImage();
  const deleteImageMutation = useDeleteFabricImage();

  // Supplier mutations
  const addSupplierMutation = useAddFabricSupplier();
  const updateSupplierMutation = useUpdateFabricSupplier();
  const removeSupplierMutation = useRemoveFabricSupplier();

  // Pricing mutations
  const createPricingMutation = useCreateFabricPricing();
  const updatePricingMutation = useUpdateFabricPricing();
  const deletePricingMutation = useDeleteFabricPricing();

  // Breadcrumbs
  const breadcrumbs = useMemo(
    () => [
      { label: '首页', path: '/' },
      { label: '面料管理', path: '/fabrics' },
      { label: fabric?.name ?? '面料详情' },
    ],
    [fabric?.name]
  );

  // =============================================================================
  // Supplier Handlers
  // =============================================================================

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
        await addSupplierMutation.mutateAsync({ fabricId, data: values as CreateFabricSupplierData });
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
    } catch (error) {
      console.error('Supplier modal error:', error);
      message.error('操作失败，请重试');
    }
  }, [fabricId, supplierForm, supplierModal, addSupplierMutation, updateSupplierMutation, closeSupplierModal]);

  const removeSupplier = useCallback(
    async (supplierId: number) => {
      if (!fabricId) return;
      try {
        await removeSupplierMutation.mutateAsync({ fabricId, supplierId });
        message.success('供应商已移除');
      } catch (error) {
        console.error('Remove supplier error:', error);
        message.error('移除失败，请重试');
      }
    },
    [fabricId, removeSupplierMutation]
  );

  // =============================================================================
  // Pricing Handlers
  // =============================================================================

  const openAddPricing = useCallback(() => {
    pricingForm.resetFields();
    setPricingModal({ open: true, mode: 'add' });
  }, [pricingForm]);

  const openEditPricing = useCallback(
    (record: CustomerPricing) => {
      pricingForm.setFieldsValue({ customerId: record.customerId, specialPrice: record.specialPrice });
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
        await createPricingMutation.mutateAsync({ fabricId, data: values as CreateFabricPricingData });
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
    } catch (error) {
      console.error('Pricing modal error:', error);
      message.error('操作失败，请重试');
    }
  }, [fabricId, pricingForm, pricingModal, createPricingMutation, updatePricingMutation, closePricingModal]);

  const deletePricing = useCallback(
    async (pricingId: number) => {
      if (!fabricId) return;
      try {
        await deletePricingMutation.mutateAsync({ fabricId, pricingId });
        message.success('客户定价已删除');
      } catch (error) {
        console.error('Delete pricing error:', error);
        message.error('删除失败，请重试');
      }
    },
    [fabricId, deletePricingMutation]
  );

  // =============================================================================
  // Image Handlers
  // =============================================================================

  const handleUploadImage = useCallback(
    async (file: RcFile): Promise<boolean> => {
      if (!fabricId) return false;

      try {
        await uploadImageMutation.mutateAsync({
          fabricId,
          file,
        });
        message.success('图片上传成功');
        return false; // Prevent default upload behavior
      } catch (error) {
        console.error('Upload error:', error);
        message.error('上传失败，请重试');
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
      } catch (error) {
        console.error('Delete image error:', error);
        message.error('删除失败，请重试');
      }
    },
    [fabricId, deleteImageMutation]
  );

  // =============================================================================
  // Supplier/Customer Search
  // =============================================================================

  const searchSuppliers = useCallback(
    async (keyword: string): Promise<Supplier[]> => (await getSuppliers({ keyword, pageSize: 20 })).items,
    []
  );

  const searchCustomers = useCallback(
    async (keyword: string): Promise<Customer[]> => (await getCustomers({ keyword, pageSize: 20 })).items,
    []
  );

  // =============================================================================
  // Render Helpers
  // =============================================================================

  // Supplier columns
  const supplierColumns: ColumnsType<FabricSupplier> = useMemo(
    () => [
      {
        title: '供应商名称',
        key: 'supplierName',
        render: (_, record) => record.supplier?.companyName ?? '-',
      },
      {
        title: '联系人',
        key: 'contact',
        render: (_, record) => record.supplier?.contactName ?? '-',
      },
      {
        title: '采购价',
        dataIndex: 'purchasePrice',
        key: 'purchasePrice',
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '最小起订量',
        dataIndex: 'minOrderQty',
        key: 'minOrderQty',
        align: 'right',
        render: (qty: number | null) => (qty !== null ? `${qty} 米` : '-'),
      },
      {
        title: '交货周期',
        dataIndex: 'leadTimeDays',
        key: 'leadTimeDays',
        align: 'right',
        render: (days: number | null) => (days !== null ? `${days} 天` : '-'),
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_, record) => (
          <Space size="small">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditSupplier(record)}>
              编辑
            </Button>
            <Popconfirm title="确定要移除此供应商吗？" onConfirm={() => removeSupplier(record.supplierId)} okText="确定" cancelText="取消">
              <Button type="text" size="small" danger icon={<DeleteOutlined />}>移除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [openEditSupplier, removeSupplier]
  );

  // Pricing columns
  const pricingColumns: ColumnsType<CustomerPricing> = useMemo(
    () => [
      {
        title: '客户名称',
        key: 'customerName',
        render: (_, record) => record.customer?.companyName ?? '-',
      },
      {
        title: '联系人',
        key: 'contact',
        render: (_, record) => record.customer?.contactName ?? '-',
      },
      {
        title: '特殊单价',
        dataIndex: 'specialPrice',
        key: 'specialPrice',
        align: 'right',
        render: (price: number) => <AmountDisplay value={price} suffix="/米" />,
      },
      {
        title: '默认单价',
        key: 'defaultPrice',
        align: 'right',
        render: () => (
          <AmountDisplay value={fabric?.defaultPrice} suffix="/米" />
        ),
      },
      {
        title: '差价',
        key: 'difference',
        align: 'right',
        render: (_, record) => {
          const diff =
            (record.specialPrice ?? 0) - (fabric?.defaultPrice ?? 0);
          return (
            <AmountDisplay value={diff} colorize showSign suffix="/米" />
          );
        },
      },
      {
        title: '操作',
        key: 'actions',
        width: 150,
        render: (_, record) => (
          <Space size="small">
            <Button type="text" size="small" icon={<EditOutlined />} onClick={() => openEditPricing(record)}>
              编辑
            </Button>
            <Popconfirm title="确定要删除此定价吗？" onConfirm={() => deletePricing(record.id)} okText="确定" cancelText="取消">
              <Button type="text" size="small" danger icon={<DeleteOutlined />}>删除</Button>
            </Popconfirm>
          </Space>
        ),
      },
    ],
    [fabric?.defaultPrice, openEditPricing, deletePricing]
  );

  // =============================================================================
  // Loading & Error States
  // =============================================================================

  const goToList = useCallback(() => navigate('/fabrics'), [navigate]);

  if (isLoadingFabric) {
    return (
      <PageContainer title="加载中..." breadcrumbs={breadcrumbs}>
        <Card>
          <div style={LOADING_STYLE}><Spin size="large" /></div>
        </Card>
      </PageContainer>
    );
  }

  if (fetchError) {
    return (
      <PageContainer title="错误" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="error"
            title="加载失败"
            subTitle="无法加载面料信息，请稍后重试"
            extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
          />
        </Card>
      </PageContainer>
    );
  }

  if (!fabric) {
    return (
      <PageContainer title="未找到" breadcrumbs={breadcrumbs}>
        <Card>
          <Result
            status="404"
            title="面料不存在"
            subTitle="您访问的面料不存在或已被删除"
            extra={<Button type="primary" onClick={goToList}>返回列表</Button>}
          />
        </Card>
      </PageContainer>
    );
  }

  // =============================================================================
  // Tab Content
  // =============================================================================

  const tabItems = [
    {
      key: 'info',
      label: '基本信息',
      children: (
        <Descriptions bordered column={{ xs: 1, sm: 2, md: 3 }}>
          <Descriptions.Item label="面料编码">
            <Text strong>{fabric.fabricCode}</Text>
          </Descriptions.Item>
          <Descriptions.Item label="面料名称">{fabric.name}</Descriptions.Item>
          <Descriptions.Item label="颜色">
            {fabric.color ? <Tag>{fabric.color}</Tag> : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="主要材质">
            {fabric.material?.primary ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="次要材质">
            {fabric.material?.secondary ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="成分比例">
            {fabric.composition ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="克重">
            {fabric.weight !== null ? `${fabric.weight} g/m²` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="幅宽">
            {fabric.width !== null ? `${fabric.width} cm` : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="厚度">
            {fabric.thickness ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="手感">{fabric.handFeel ?? '-'}</Descriptions.Item>
          <Descriptions.Item label="光泽度">
            {fabric.glossLevel ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="应用领域">
            {fabric.application?.length ? (
              <Space wrap>
                {fabric.application.map((app) => (
                  <Tag key={app} color="blue">
                    {app}
                  </Tag>
                ))}
              </Space>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="默认单价">
            <AmountDisplay value={fabric.defaultPrice} suffix="/米" />
          </Descriptions.Item>
          <Descriptions.Item label="默认交期">
            {fabric.defaultLeadTime !== null
              ? `${fabric.defaultLeadTime} 天`
              : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="标签" span={3}>
            {fabric.tags?.length ? (
              <Space wrap>
                {fabric.tags.map((tag) => (
                  <Tag key={tag}>{tag}</Tag>
                ))}
              </Space>
            ) : (
              '-'
            )}
          </Descriptions.Item>
          <Descriptions.Item label="面料描述" span={3}>
            {fabric.description ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="备注" span={3}>
            {fabric.notes ?? '-'}
          </Descriptions.Item>
          <Descriptions.Item label="创建时间">
            {formatDate(fabric.createdAt)}
          </Descriptions.Item>
          <Descriptions.Item label="更新时间">
            {formatDate(fabric.updatedAt)}
          </Descriptions.Item>
        </Descriptions>
      ),
    },
    {
      key: 'images',
      label: '图片管理',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Upload
              accept="image/*"
              showUploadList={false}
              beforeUpload={handleUploadImage}
              disabled={uploadImageMutation.isPending}
            >
              <Button
                icon={<UploadOutlined />}
                loading={uploadImageMutation.isPending}
              >
                上传图片
              </Button>
            </Upload>
            {uploadImageMutation.isPending && (
              <Progress
                percent={uploadImageMutation.uploadProgress}
                size="small"
                style={{ marginTop: 8, maxWidth: 200 }}
              />
            )}
          </div>
          {(fabric as { images?: FabricImage[] }).images?.length ? (
            <Image.PreviewGroup>
              <Space wrap size="large">
                {((fabric as { images?: FabricImage[] }).images ?? []).map((img) => (
                  <div key={img.id} style={{ position: 'relative' }}>
                    <Image
                      src={img.url}
                      alt={`面料图片 ${img.sortOrder}`}
                      width={150}
                      height={150}
                      style={{ objectFit: 'cover' }}
                    />
                    <Popconfirm
                      title="确定要删除这张图片吗？"
                      onConfirm={() => handleDeleteImage(img.id)}
                      okText="确定"
                      cancelText="取消"
                    >
                      <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        style={{
                          position: 'absolute',
                          top: 4,
                          right: 4,
                          background: 'rgba(255,255,255,0.9)',
                        }}
                      />
                    </Popconfirm>
                  </div>
                ))}
              </Space>
            </Image.PreviewGroup>
          ) : (
            <Empty description="暂无图片" />
          )}
        </div>
      ),
    },
    {
      key: 'suppliers',
      label: '供应商关联',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddSupplier}>添加供应商</Button>
          </div>
          <Table<FabricSupplier>
            columns={supplierColumns}
            dataSource={suppliersData?.items ?? []}
            rowKey="supplierId"
            loading={isLoadingSuppliers}
            pagination={false}
            size="middle"
          />
        </div>
      ),
    },
    {
      key: 'pricing',
      label: '客户定价',
      children: (
        <div>
          <div style={{ marginBottom: 16 }}>
            <Button type="primary" icon={<PlusOutlined />} onClick={openAddPricing}>添加客户定价</Button>
          </div>
          <Table<CustomerPricing>
            columns={pricingColumns}
            dataSource={pricingData?.items ?? []}
            rowKey="id"
            loading={isLoadingPricing}
            pagination={false}
            size="middle"
          />
        </div>
      ),
    },
  ];

  // =============================================================================
  // Render
  // =============================================================================

  return (
    <PageContainer
      title={fabric.name}
      breadcrumbs={breadcrumbs}
      extra={
        <Button
          type="primary"
          icon={<EditOutlined />}
          onClick={() => navigate(`/fabrics/${fabricId}/edit`)}
        >
          编辑面料
        </Button>
      }
    >
      <Card>
        <Tabs
          activeKey={activeTab}
          onChange={setActiveTab}
          items={tabItems}
        />
      </Card>

      {/* Supplier Modal */}
      <Modal
        title={supplierModal.mode === 'add' ? '添加供应商' : '编辑供应商信息'}
        open={supplierModal.open}
        onOk={submitSupplier}
        onCancel={closeSupplierModal}
        confirmLoading={addSupplierMutation.isPending || updateSupplierMutation.isPending}
        destroyOnClose
      >
        <Form form={supplierForm} layout="vertical">
          <Form.Item name="supplierId" label="选择供应商" rules={[{ required: true, message: '请选择供应商' }]}>
            <SupplierSelector disabled={supplierModal.mode === 'edit'} onSearch={searchSuppliers} />
          </Form.Item>
          <Form.Item
            name="purchasePrice"
            label="采购价 (元/米)"
            rules={[{ required: true, message: '请输入采购价' }, { type: 'number', min: 0, message: '采购价必须大于0' }]}
          >
            <InputNumber placeholder="请输入采购价" style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
          </Form.Item>
          <Form.Item name="minOrderQty" label="最小起订量 (米)">
            <InputNumber placeholder="请输入最小起订量" style={{ width: '100%' }} min={0} precision={0} />
          </Form.Item>
          <Form.Item name="leadTimeDays" label="交货周期 (天)">
            <InputNumber placeholder="请输入交货周期" style={{ width: '100%' }} min={0} precision={0} />
          </Form.Item>
        </Form>
      </Modal>

      {/* Pricing Modal */}
      <Modal
        title={pricingModal.mode === 'add' ? '添加客户定价' : '编辑客户定价'}
        open={pricingModal.open}
        onOk={submitPricing}
        onCancel={closePricingModal}
        confirmLoading={createPricingMutation.isPending || updatePricingMutation.isPending}
        destroyOnClose
      >
        <Form form={pricingForm} layout="vertical">
          <Form.Item name="customerId" label="选择客户" rules={[{ required: true, message: '请选择客户' }]}>
            <CustomerSelector disabled={pricingModal.mode === 'edit'} onSearch={searchCustomers} />
          </Form.Item>
          <Form.Item
            name="specialPrice"
            label="特殊单价 (元/米)"
            rules={[{ required: true, message: '请输入特殊单价' }, { type: 'number', min: 0, message: '单价必须大于0' }]}
            extra={fabric.defaultPrice !== null ? `默认单价: ${formatCurrency(fabric.defaultPrice)}/米` : undefined}
          >
            <InputNumber placeholder="请输入特殊单价" style={{ width: '100%' }} min={0} precision={2} prefix="¥" />
          </Form.Item>
        </Form>
      </Modal>
    </PageContainer>
  );
}
