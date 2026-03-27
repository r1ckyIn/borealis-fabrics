/**
 * Address management component with CRUD operations.
 * Handles multiple addresses with default selection.
 */

import { useState } from 'react';
import {
  List,
  Button,
  Modal,
  Form,
  Input,
  Space,
  Tag,
  Empty,
  Popconfirm,
} from 'antd';
import {
  PlusOutlined,
  EditOutlined,
  DeleteOutlined,
  EnvironmentOutlined,
  StarOutlined,
  StarFilled,
} from '@ant-design/icons';

import type { Address } from '@/types/entities.types';

export interface AddressManagerProps {
  /** Current addresses (controlled mode) */
  value?: Address[];
  /** Callback when addresses change */
  onChange?: (addresses: Address[]) => void;
  /** Disable editing */
  disabled?: boolean;
  /** Maximum number of addresses (default: 10) */
  maxAddresses?: number;
}

interface AddressFormValues {
  province: string;
  city: string;
  district: string;
  detailAddress: string;
  contactName: string;
  contactPhone: string;
  label?: string;
}

export function AddressManager({
  value = [],
  onChange,
  disabled = false,
  maxAddresses = 10,
}: AddressManagerProps): React.ReactElement {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [form] = Form.useForm<AddressFormValues>();

  /**
   * Open modal for adding new address.
   */
  const handleAdd = (): void => {
    setEditingIndex(null);
    form.resetFields();
    setIsModalOpen(true);
  };

  /**
   * Open modal for editing existing address.
   */
  const handleEdit = (index: number): void => {
    const address = value[index];
    setEditingIndex(index);
    form.setFieldsValue({
      province: address.province,
      city: address.city,
      district: address.district,
      detailAddress: address.detailAddress,
      contactName: address.contactName,
      contactPhone: address.contactPhone,
      label: address.label,
    });
    setIsModalOpen(true);
  };

  /**
   * Delete an address.
   */
  const handleDelete = (index: number): void => {
    const newAddresses = [...value];
    const wasDefault = newAddresses[index].isDefault;
    newAddresses.splice(index, 1);

    // If deleted address was default, set first remaining as default
    if (wasDefault && newAddresses.length > 0) {
      newAddresses[0] = { ...newAddresses[0], isDefault: true };
    }

    onChange?.(newAddresses);
  };

  /**
   * Set an address as default.
   */
  const handleSetDefault = (index: number): void => {
    const newAddresses = value.map((addr, i) => ({
      ...addr,
      isDefault: i === index,
    }));
    onChange?.(newAddresses);
  };

  /**
   * Handle form submission.
   */
  const handleSubmit = async (): Promise<void> => {
    try {
      const formValues = await form.validateFields();
      const newAddress: Address = {
        ...formValues,
        isDefault: editingIndex === null && value.length === 0, // First address is default
      };

      let newAddresses: Address[];
      if (editingIndex !== null) {
        // Editing existing
        newAddresses = [...value];
        newAddresses[editingIndex] = {
          ...newAddresses[editingIndex],
          ...newAddress,
        };
      } else {
        // Adding new
        newAddresses = [...value, newAddress];
      }

      onChange?.(newAddresses);
      setIsModalOpen(false);
      form.resetFields();
    } catch {
      // Form validation failed
    }
  };

  /**
   * Format address for display.
   */
  const formatAddress = (address: Address): string => {
    return `${address.province}${address.city}${address.district}${address.detailAddress}`;
  };

  return (
    <div className="address-manager">
      <div className="mb-4 flex items-center justify-between">
        {!disabled && value.length < maxAddresses ? (
          <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
            添加地址
          </Button>
        ) : (
          <span />
        )}
        <span className="text-gray-500">
          {value.length}/{maxAddresses} 个地址
        </span>
      </div>

      {value.length === 0 ? (
        <Empty description="暂无收货地址" />
      ) : (
        <List
          dataSource={value}
          renderItem={(address, index) => (
            <List.Item
              className="rounded-lg border border-gray-200 mb-2 p-4"
              actions={
                disabled
                  ? []
                  : [
                      <Button
                        key="default"
                        type="text"
                        icon={address.isDefault ? <StarFilled className="text-yellow-500" /> : <StarOutlined />}
                        onClick={() => handleSetDefault(index)}
                        title={address.isDefault ? '默认地址' : '设为默认'}
                      />,
                      <Button
                        key="edit"
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEdit(index)}
                      />,
                      <Popconfirm
                        key="delete"
                        title="确定删除这个地址吗？"
                        onConfirm={() => handleDelete(index)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                      </Popconfirm>,
                    ]
              }
            >
              <List.Item.Meta
                avatar={<EnvironmentOutlined className="text-2xl text-blue-500" />}
                title={
                  <Space>
                    <span>
                      {address.contactName} {address.contactPhone}
                    </span>
                    {address.label && <Tag color="blue">{address.label}</Tag>}
                    {address.isDefault && <Tag color="gold">默认</Tag>}
                  </Space>
                }
                description={formatAddress(address)}
              />
            </List.Item>
          )}
        />
      )}

      <Modal
        title={editingIndex !== null ? '编辑地址' : '添加地址'}
        open={isModalOpen}
        onOk={handleSubmit}
        onCancel={() => {
          setIsModalOpen(false);
          form.resetFields();
        }}
        okText="保存"
        cancelText="取消"
        width={600}
      >
        <Form form={form} layout="vertical" className="mt-4">
          <Form.Item
            label="联系人"
            name="contactName"
            rules={[{ required: true, message: '请输入联系人姓名' }]}
          >
            <Input placeholder="请输入联系人姓名" />
          </Form.Item>

          <Form.Item
            label="联系电话"
            name="contactPhone"
            rules={[
              { required: true, message: '请输入联系电话' },
              { pattern: /^1[3-9]\d{9}$/, message: '请输入正确的手机号码' },
            ]}
          >
            <Input placeholder="请输入联系电话" />
          </Form.Item>

          <Space.Compact className="w-full">
            <Form.Item
              label="省份"
              name="province"
              rules={[{ required: true, message: '请输入省份' }]}
              className="flex-1"
            >
              <Input placeholder="省份" />
            </Form.Item>
            <Form.Item
              label="城市"
              name="city"
              rules={[{ required: true, message: '请输入城市' }]}
              className="flex-1"
            >
              <Input placeholder="城市" />
            </Form.Item>
            <Form.Item
              label="区县"
              name="district"
              rules={[{ required: true, message: '请输入区县' }]}
              className="flex-1"
            >
              <Input placeholder="区县" />
            </Form.Item>
          </Space.Compact>

          <Form.Item
            label="详细地址"
            name="detailAddress"
            rules={[{ required: true, message: '请输入详细地址' }]}
          >
            <Input.TextArea rows={2} placeholder="请输入详细地址（街道、门牌号等）" />
          </Form.Item>

          <Form.Item label="地址标签" name="label">
            <Input placeholder="如：公司、仓库、家（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

export default AddressManager;
