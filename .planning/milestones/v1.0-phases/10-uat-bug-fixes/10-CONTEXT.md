# Phase 10 Context: UAT Bug Fixes

## Origin

Phase 09 real-data testing revealed 8 UI/UX issues during manual verification.
Core business chain works end-to-end, but these issues affect usability and data correctness.

## Issues (from 09-05-SUMMARY.md)

### P0 — Must Fix

1. **选择产品后未自动填入默认价格** — 报价/订单添加明细时，选择面料/产品后单价字段为空，应自动填入 defaultPrice
2. **订单创建默认状态为"询价中"** — 直接创建订单应默认"已下单"(CONFIRMED)，不是"询价中"(INQUIRY)
3. **数量显示单位重复** — 订单明细表格显示 "500.00 米 米"，单位出现两次
4. **铁架采购单价显示 ¥NaN** — 产品无 defaultPrice 时采购单价显示 NaN，应显示 "-" 或 "¥0.00"

### P1 — Should Fix

5. **供应商未按面料关联过滤** — 订单明细选供应商时显示所有供应商，应只显示能供应该面料的供应商（通过 FabricSupplier 关联）
6. **客户重复记录** — Miraggo HomeLiving 出现3次（导入脚本多次运行创建重复），需数据清理

### P2 — Nice to Have

7. **报价转订单对话框应居中** — 当前从按钮滑出到画面偏上方，应使用 Modal 居中弹出
8. **收货地址布局优化** — 客户详情页收货地址区域太空旷，需重新设计布局
