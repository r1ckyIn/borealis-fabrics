import { Test, TestingModule } from '@nestjs/testing';
import { SystemController } from './system.controller';
import { SystemService } from './system.service';
import { EnumsResponseDto } from './dto/enums-response.dto';

describe('SystemController', () => {
  let controller: SystemController;

  const mockEnumsResponse: EnumsResponseDto = {
    orderItemStatus: {
      values: ['INQUIRY', 'PENDING', 'ORDERED'],
      labels: { INQUIRY: '询价中', PENDING: '待下单', ORDERED: '已下单' },
    },
    customerPayStatus: {
      values: ['unpaid', 'partial', 'paid'],
      labels: { unpaid: '未付款', partial: '部分付款', paid: '已付清' },
    },
    paymentMethod: {
      values: ['wechat', 'alipay', 'bank', 'credit'],
      labels: {
        wechat: '微信支付',
        alipay: '支付宝',
        bank: '银行转账',
        credit: '赊账',
      },
    },
    quoteStatus: {
      values: ['active', 'expired', 'converted'],
      labels: { active: '有效', expired: '已过期', converted: '已转订单' },
    },
    supplierStatus: {
      values: ['active', 'suspended', 'eliminated'],
      labels: {
        active: '合作中',
        suspended: '暂停合作',
        eliminated: '已淘汰',
      },
    },
    settleType: {
      values: ['prepay', 'credit'],
      labels: { prepay: '预付', credit: '账期' },
    },
  };

  const mockSystemService = {
    getAllEnums: jest.fn().mockReturnValue(mockEnumsResponse),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SystemController],
      providers: [
        {
          provide: SystemService,
          useValue: mockSystemService,
        },
      ],
    }).compile();

    controller = module.get<SystemController>(SystemController);

    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });

  describe('getEnums', () => {
    it('should return all enums', () => {
      mockSystemService.getAllEnums.mockReturnValue(mockEnumsResponse);

      const result = controller.getEnums();

      expect(mockSystemService.getAllEnums).toHaveBeenCalled();
      expect(result).toEqual(mockEnumsResponse);
    });

    it('should contain orderItemStatus', () => {
      mockSystemService.getAllEnums.mockReturnValue(mockEnumsResponse);

      const result = controller.getEnums();

      expect(result.orderItemStatus).toBeDefined();
      expect(result.orderItemStatus.values).toBeDefined();
      expect(result.orderItemStatus.labels).toBeDefined();
    });

    it('should contain customerPayStatus', () => {
      mockSystemService.getAllEnums.mockReturnValue(mockEnumsResponse);

      const result = controller.getEnums();

      expect(result.customerPayStatus).toBeDefined();
      expect(result.customerPayStatus.values).toBeDefined();
      expect(result.customerPayStatus.labels).toBeDefined();
    });

    it('should contain paymentMethod', () => {
      mockSystemService.getAllEnums.mockReturnValue(mockEnumsResponse);

      const result = controller.getEnums();

      expect(result.paymentMethod).toBeDefined();
      expect(result.paymentMethod.values).toBeDefined();
      expect(result.paymentMethod.labels).toBeDefined();
    });

    it('should contain quoteStatus', () => {
      mockSystemService.getAllEnums.mockReturnValue(mockEnumsResponse);

      const result = controller.getEnums();

      expect(result.quoteStatus).toBeDefined();
      expect(result.quoteStatus.values).toBeDefined();
      expect(result.quoteStatus.labels).toBeDefined();
    });

    it('should contain supplierStatus', () => {
      mockSystemService.getAllEnums.mockReturnValue(mockEnumsResponse);

      const result = controller.getEnums();

      expect(result.supplierStatus).toBeDefined();
      expect(result.supplierStatus.values).toBeDefined();
      expect(result.supplierStatus.labels).toBeDefined();
    });

    it('should contain settleType', () => {
      mockSystemService.getAllEnums.mockReturnValue(mockEnumsResponse);

      const result = controller.getEnums();

      expect(result.settleType).toBeDefined();
      expect(result.settleType.values).toBeDefined();
      expect(result.settleType.labels).toBeDefined();
    });
  });
});
