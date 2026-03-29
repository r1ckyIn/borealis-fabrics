/**
 * Exportable field definitions per entity type.
 * Each entity has a list of fields with labels (Chinese) and data types.
 */

export interface EntityFieldConfig {
  field: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'json';
}

/**
 * Maps entity type keys to their exportable field definitions.
 * Field names must match the Prisma model property names exactly.
 */
export const ENTITY_FIELD_CONFIG: Record<string, EntityFieldConfig[]> = {
  supplier: [
    { field: 'companyName', label: '供应商名称', type: 'string' },
    { field: 'contactName', label: '联系人', type: 'string' },
    { field: 'phone', label: '电话', type: 'string' },
    { field: 'email', label: '邮箱', type: 'string' },
    { field: 'address', label: '地址', type: 'string' },
    { field: 'status', label: '状态', type: 'string' },
    { field: 'settleType', label: '结算方式', type: 'string' },
    { field: 'notes', label: '备注', type: 'string' },
    { field: 'createdAt', label: '创建时间', type: 'date' },
  ],
  customer: [
    { field: 'companyName', label: '客户名称', type: 'string' },
    { field: 'contactName', label: '联系人', type: 'string' },
    { field: 'phone', label: '电话', type: 'string' },
    { field: 'email', label: '邮箱', type: 'string' },
    { field: 'creditType', label: '信用类型', type: 'string' },
    { field: 'notes', label: '备注', type: 'string' },
    { field: 'createdAt', label: '创建时间', type: 'date' },
  ],
  fabric: [
    { field: 'fabricCode', label: '面料编号', type: 'string' },
    { field: 'name', label: '面料名称', type: 'string' },
    { field: 'composition', label: '成分', type: 'string' },
    { field: 'width', label: '幅宽', type: 'number' },
    { field: 'weight', label: '克重', type: 'number' },
    { field: 'defaultPrice', label: '价格', type: 'number' },
    { field: 'color', label: '颜色', type: 'string' },
    { field: 'notes', label: '备注', type: 'string' },
    { field: 'createdAt', label: '创建时间', type: 'date' },
  ],
  product: [
    { field: 'productCode', label: '产品编号', type: 'string' },
    { field: 'name', label: '产品名称', type: 'string' },
    { field: 'category', label: '类别', type: 'string' },
    { field: 'subCategory', label: '子类别', type: 'string' },
    { field: 'specification', label: '规格', type: 'string' },
    { field: 'defaultPrice', label: '价格', type: 'number' },
    { field: 'notes', label: '备注', type: 'string' },
    { field: 'createdAt', label: '创建时间', type: 'date' },
  ],
  order: [
    { field: 'orderCode', label: '订单编号', type: 'string' },
    { field: 'totalAmount', label: '总金额', type: 'number' },
    { field: 'status', label: '状态', type: 'string' },
    { field: 'customerPayStatus', label: '付款状态', type: 'string' },
    { field: 'notes', label: '备注', type: 'string' },
    { field: 'createdAt', label: '创建时间', type: 'date' },
    { field: 'updatedAt', label: '更新时间', type: 'date' },
  ],
  quote: [
    { field: 'quoteCode', label: '报价编号', type: 'string' },
    { field: 'totalPrice', label: '总金额', type: 'number' },
    { field: 'status', label: '状态', type: 'string' },
    { field: 'validUntil', label: '有效期', type: 'date' },
    { field: 'notes', label: '备注', type: 'string' },
    { field: 'createdAt', label: '创建时间', type: 'date' },
  ],
};

/**
 * Maps entity type keys to their Prisma model delegate names.
 */
export const ENTITY_MODEL_MAP: Record<string, string> = {
  supplier: 'supplier',
  customer: 'customer',
  fabric: 'fabric',
  product: 'product',
  order: 'order',
  quote: 'quote',
};
