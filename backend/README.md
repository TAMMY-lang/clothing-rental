# 服装租赁小程序后端

基于 Express + TypeScript + Prisma + PostgreSQL 的后端框架，已覆盖 PRD v2.0 的核心业务规则。

## 已实现范围

- 商品上架、列表筛选、详情查询
- 多规格：颜色、尺码、定制胸围/腰围、库存数
- 价格字段：吊牌价、日租金、固定押金
- 固定押金校验：40 到 300 元
- 租赁周期校验：最短 1 天，最长连续 7 天
- 总价计算：日租金 × 租赁天数 + 固定押金
- 档期校验：按规格和日期锁定库存，库存满时禁止下单
- 订单状态：待付款、待发货、租赁中、待归还、待验收、已完成、已取消、待审核延期、延期通过、延期驳回
- 延期规则：结束前 24 小时内申请；普通延期按日租金 1 倍收费；不可抗力需凭证并由商家审核
- 归还验收：支持清洁费扣减和押金退还金额计算

## 本地启动

1. 安装依赖：

```bash
npm install
```

2. 复制环境变量：

```bash
cp .env.example .env
```

3. 修改 `.env` 中的 `DATABASE_URL`，指向本地 PostgreSQL 或 Supabase 数据库。

4. 初始化数据库：

```bash
npm run prisma:generate
npm run prisma:migrate
```

5. 启动开发服务：

```bash
npm run dev
```

## 主要接口

### 健康检查

`GET /health`

### 用户

- `POST /api/users`：创建或更新用户尺码资料
- `GET /api/users/:id`：获取用户与订单

### 商品

- `GET /api/products`：商品列表，支持 `keyword`、`category`、`scenario`、`style`、`size`
- `POST /api/products`：商家新增商品
- `GET /api/products/:id`：商品详情

### 档期

`GET /api/availability/check?productId=...&specId=...&rentStartDate=2026-07-01&rentEndDate=2026-07-03`

### 订单

- `POST /api/orders`：创建待付款订单并锁定档期
- `POST /api/orders/:id/payments/confirm`：确认支付，进入待发货
- `POST /api/orders/:id/shipments/mark-renting`：标记租赁中
- `POST /api/orders/:id/extensions`：申请延期
- `POST /api/orders/:id/extensions/pay`：普通延期支付成功后更新归还日期
- `POST /api/orders/:id/extensions/review-force-majeure`：审核不可抗力延期
- `POST /api/orders/:id/return`：用户发起归还
- `POST /api/orders/:id/inspection`：商家验收并计算押金退还
- `POST /api/orders/:id/cancel`：取消订单并释放档期

## 普通延期示例

```json
{
  "type": "NORMAL",
  "requestedEndDate": "2026-07-05"
}
```

## 不可抗力延期示例

```json
{
  "type": "FORCE_MAJEURE",
  "requestedEndDate": "2026-07-05",
  "proof": "https://example.com/proof.jpg"
}
```
