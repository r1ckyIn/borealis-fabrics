import { Test, TestingModule } from '@nestjs/testing';
import { SystemService } from './system.service';
import {
  OrderItemStatus,
  CustomerPayStatus,
  PaymentMethod,
  QuoteStatus,
  SupplierStatus,
  SettleType,
} from './enums';

describe('SystemService', () => {
  let service: SystemService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [SystemService],
    }).compile();

    service = module.get<SystemService>(SystemService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getAllEnums', () => {
    it('should return all enums', () => {
      const result = service.getAllEnums();

      expect(result).toBeDefined();
      expect(result.orderItemStatus).toBeDefined();
      expect(result.customerPayStatus).toBeDefined();
      expect(result.paymentMethod).toBeDefined();
      expect(result.quoteStatus).toBeDefined();
      expect(result.supplierStatus).toBeDefined();
      expect(result.settleType).toBeDefined();
    });

    it('should return correct orderItemStatus values', () => {
      const result = service.getAllEnums();

      expect(result.orderItemStatus.values).toEqual(
        Object.values(OrderItemStatus),
      );
      expect(result.orderItemStatus.values).toContain('INQUIRY');
      expect(result.orderItemStatus.values).toContain('PENDING');
      expect(result.orderItemStatus.values).toContain('ORDERED');
      expect(result.orderItemStatus.values).toContain('PRODUCTION');
      expect(result.orderItemStatus.values).toContain('QC');
      expect(result.orderItemStatus.values).toContain('SHIPPED');
      expect(result.orderItemStatus.values).toContain('RECEIVED');
      expect(result.orderItemStatus.values).toContain('COMPLETED');
      expect(result.orderItemStatus.values).toContain('CANCELLED');
    });

    it('should return correct orderItemStatus labels', () => {
      const result = service.getAllEnums();

      expect(result.orderItemStatus.labels).toMatchObject({
        INQUIRY: '询价中',
        PENDING: '待下单',
        ORDERED: '已下单',
        PRODUCTION: '生产中',
        QC: '质检中',
        SHIPPED: '已发货',
        RECEIVED: '已签收',
        COMPLETED: '已完成',
        CANCELLED: '已取消',
      });
    });

    it('should return correct customerPayStatus values', () => {
      const result = service.getAllEnums();

      expect(result.customerPayStatus.values).toEqual(
        Object.values(CustomerPayStatus),
      );
      expect(result.customerPayStatus.values).toContain('unpaid');
      expect(result.customerPayStatus.values).toContain('partial');
      expect(result.customerPayStatus.values).toContain('paid');
    });

    it('should return correct customerPayStatus labels', () => {
      const result = service.getAllEnums();

      expect(result.customerPayStatus.labels).toMatchObject({
        unpaid: '未付款',
        partial: '部分付款',
        paid: '已付清',
      });
    });

    it('should return correct paymentMethod values', () => {
      const result = service.getAllEnums();

      expect(result.paymentMethod.values).toEqual(Object.values(PaymentMethod));
      expect(result.paymentMethod.values).toContain('wechat');
      expect(result.paymentMethod.values).toContain('alipay');
      expect(result.paymentMethod.values).toContain('bank');
      expect(result.paymentMethod.values).toContain('credit');
    });

    it('should return correct paymentMethod labels', () => {
      const result = service.getAllEnums();

      expect(result.paymentMethod.labels).toMatchObject({
        wechat: '微信支付',
        alipay: '支付宝',
        bank: '银行转账',
        credit: '赊账',
      });
    });

    it('should return correct quoteStatus values', () => {
      const result = service.getAllEnums();

      expect(result.quoteStatus.values).toEqual(Object.values(QuoteStatus));
      expect(result.quoteStatus.values).toContain('active');
      expect(result.quoteStatus.values).toContain('expired');
      expect(result.quoteStatus.values).toContain('converted');
    });

    it('should return correct quoteStatus labels', () => {
      const result = service.getAllEnums();

      expect(result.quoteStatus.labels).toMatchObject({
        active: '有效',
        expired: '已过期',
        converted: '已转订单',
      });
    });

    it('should return correct supplierStatus values', () => {
      const result = service.getAllEnums();

      expect(result.supplierStatus.values).toEqual(
        Object.values(SupplierStatus),
      );
      expect(result.supplierStatus.values).toContain('active');
      expect(result.supplierStatus.values).toContain('suspended');
      expect(result.supplierStatus.values).toContain('eliminated');
    });

    it('should return correct supplierStatus labels', () => {
      const result = service.getAllEnums();

      expect(result.supplierStatus.labels).toMatchObject({
        active: '合作中',
        suspended: '暂停合作',
        eliminated: '已淘汰',
      });
    });

    it('should return correct settleType values', () => {
      const result = service.getAllEnums();

      expect(result.settleType.values).toEqual(Object.values(SettleType));
      expect(result.settleType.values).toContain('prepay');
      expect(result.settleType.values).toContain('credit');
    });

    it('should return correct settleType labels', () => {
      const result = service.getAllEnums();

      expect(result.settleType.labels).toMatchObject({
        prepay: '预付',
        credit: '账期',
      });
    });
  });
});
