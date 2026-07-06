export type ProductSpec = {
  id: string;
  productId: string;
  skuCode?: string | null;
  color?: string | null;
  size?: string | null;
  bust?: number | null;
  waist?: number | null;
  stock: number;
};

export type Product = {
  id: string;
  name: string;
  category: string;
  style?: string | null;
  scenario?: string | null;
  tagPrice: number;
  dailyRentalPrice: number;
  depositAmount: number;
  tags: string[];
  images: string[];
  mainImage?: string | null;
  videoUrl?: string | null;
  explanation?: string | null;
  detailImages: string[];
  status: "ACTIVE" | "INACTIVE";
  specs: ProductSpec[];
  salesCount: number;
  favoriteCount: number;
  cartCount: number;
  conditionLevel?: string;
  cleaningStandard?: string;
  sizeAdvice?: string;
  shippingNote?: string;
  shippingMethods: ("PICKUP" | "EXPRESS")[];
};

export type ProductCategory = {
  id: string;
  name: string;
  sortOrder: number;
  enabled: boolean;
};

export type OrderStatus =
  | "PENDING"
  | "PENDING_PAYMENT"
  | "PENDING_SHIPMENT"
  | "RENTING"
  | "PENDING_RETURN"
  | "PENDING_INSPECTION"
  | "RETURNED"
  | "COMPLETED"
  | "CANCELED"
  | "PENDING_EXTENSION_REVIEW"
  | "PENDING_EXTENSION"
  | "EXTENSION_APPROVED"
  | "EXTENSION_REJECTED";

export type ExtensionReview = {
  id: string;
  orderId: string;
  type: "NORMAL" | "FORCE_MAJEURE";
  requestedEndDate: string;
  proof?: string | null;
  fee: number;
  status: "PENDING" | "APPROVED" | "REJECTED";
  rejectReason?: string | null;
};

export type Order = {
  id: string;
  userId: string;
  productId: string;
  specId: string;
  rentStartDate: string;
  rentEndDate: string;
  startDate?: string;
  endDate?: string;
  rentalDays: number;
  rentalFee: number;
  deposit: number;
  totalAmount: number;
  totalPrice?: number;
  originalTotalAmount?: number | null;
  priceAdjustmentReason?: string | null;
  status: OrderStatus;
  extensionType?: string | null;
  extensionProof?: string | null;
  extensionDays?: number | null;
  extensionFee?: number | null;
  shipmentDelayedUntil?: string | null;
  shipmentDelayReason?: string | null;
  cleaningFee?: number | null;
  depositRefund?: number | null;
  shippingMethod: "PICKUP" | "EXPRESS";
  shippingAddress?: string | null;
  pickupLocation?: string | null;
  expressFee?: number;
  logisticsCompany?: string | null;
  logisticsTrackingNumber?: string | null;
  logisticsStatus?: string | null;
  logisticsHistory?: Array<{ time: string; status: string; description: string }>;
  shippedAt?: string | null;
  orderType: "RENTAL" | "TRY_ON";
  tryOnFee?: number;
  tryOnQuantity?: number;
  tryOnDecision?: "RENT" | "NO_RENT" | null;
  returnAddressId?: string | null;
  interceptStatus?: string | null;
  interceptReason?: string | null;
  interceptRefund?: number | null;
  settlementDate?: string | null;
  settlementStatus?: "SETTLING" | "SETTLED" | null;
  product?: Product;
  spec?: ProductSpec;
  extensionReviews?: ExtensionReview[];
};

export type ProductReview = {
  id: string;
  orderId: string;
  userId: string;
  productId: string;
  specId: string;
  overallScore: number;
  cleanlinessScore: number;
  sizeAccuracyScore: number;
  matchScore: number;
  content: string;
  images: string[];
  status: "PENDING" | "APPROVED" | "REJECTED";
  merchantReply?: string | null;
  reviewedAt?: string | null;
  user?: Pick<AuthUser, "id" | "name" | "phone">;
  product?: Pick<Product, "id" | "name" | "category">;
  spec?: Pick<ProductSpec, "id" | "skuCode" | "color" | "size">;
  order?: Pick<Order, "id" | "status" | "rentStartDate" | "rentEndDate">;
  createdAt: string;
  updatedAt: string;
};

export type MerchantTenantReview = {
  id: string;
  orderId: string;
  merchantId: string;
  customerId: string;
  careScore: number;
  comment?: string | null;
  createdAt: string;
};

export type ApiResult<T> = {
  data: T;
};

export type ShopAnnouncement = {
  id: string;
  title: string;
  content: string;
  enabled: boolean;
};

export type Coupon = {
  id: string;
  title: string;
  code: string;
  type: "AMOUNT" | "PERCENT";
  discountAmount?: number | null;
  discountPercent?: number | null;
  minOrderAmount: number;
  enabled: boolean;
  usageLimit?: number | null;
};

export type TryOnFeeRule = {
  style: string;
  quantity: number;
  fee: number;
};

export type TryOnSetting = {
  id: string;
  enabled: boolean;
  feeRules: TryOnFeeRule[];
  processNote: string;
  careNotice: string;
};

export type ReturnAddress = {
  id: string;
  label: string;
  receiver: string;
  phone: string;
  address: string;
  isDefault: boolean;
  enabled: boolean;
};

export type ProductOverview = {
  summary: {
    totalProducts: number;
    activeProducts: number;
    totalStock: number;
    totalOrders: number;
    rentingOrders: number;
    completedOrders: number;
    pendingReturnOrders?: number;
    pendingInspectionOrders?: number;
    turnoverAmount?: number;
    visitorCount?: number;
  };
  topProducts: Product[];
  newArrivals: Product[];
  engagementProducts: Product[];
};

export type CartItem = {
  id: string;
  userId: string;
  productId: string;
  specId: string;
  quantity: number;
  product: Product;
  spec: ProductSpec;
};

export type FavoriteItem = {
  id: string;
  userId: string;
  productId: string;
  product: Product;
};

export type MerchantWallet = {
  id: string;
  balance: number;
  frozen: number;
  totalIncome: number;
};

export type Withdrawal = {
  id: string;
  amount: number;
  accountName: string;
  accountNo: string;
  channel: "BANK" | "ALIPAY" | "WECHAT";
  channelAccount: string;
  channelName: string;
  methodId?: string | null;
  status: "PENDING" | "APPROVED" | "COMPLETED" | "REJECTED";
};

export type ShopSetting = {
  id: string;
  settlementDays: number;
  minWithdrawalAmount: number;
  withdrawalFeePercent: number;
  withdrawalFeeFixed: number;
};

export type WithdrawalMethod = {
  id: string;
  channel: "BANK" | "ALIPAY" | "WECHAT";
  accountName: string;
  accountNo: string;
  bankName?: string | null;
  qrCode?: string | null;
  isDefault: boolean;
  enabled: boolean;
};

export type WalletTransaction = {
  id: string;
  walletId: string;
  type: "ORDER_INCOME" | "DEPOSIT_REFUND" | "WITHDRAWAL_DEDUCT" | "WITHDRAWAL_REJECT_RELEASE" | string;
  amount: number;
  balanceBefore: number;
  balanceAfter: number;
  orderId?: string | null;
  withdrawalId?: string | null;
  note?: string | null;
  createdAt: string;
};

export type MemberLevel = {
  id: string;
  name: string;
  minSpend: number;
  discountPercent: number;
  benefits: string;
  enabled: boolean;
  sortOrder: number;
};

export type AuthUser = {
  id: string;
  name: string;
  phone: string;
  role: "USER" | "MERCHANT" | "ADMIN";
};

export type ChatUser = {
  id: string;
  name: string;
  phone?: string;
  role: "USER" | "MERCHANT" | "ADMIN";
};

export type ChatProduct = {
  id: string;
  name: string;
  category: string;
  images: string[];
};

export type ChatMessage = {
  id: string;
  conversationId: string;
  senderId: string;
  content: string;
  createdAt: string;
  sender: ChatUser;
};

export type ChatConversation = {
  id: string;
  customerId: string;
  merchantId: string;
  productId?: string | null;
  status: "OPEN" | "CLOSED";
  customer: ChatUser;
  merchant: ChatUser;
  product?: ChatProduct | null;
  messages: ChatMessage[];
  createdAt: string;
  updatedAt: string;
};

export type AuthResult = {
  user: AuthUser;
  token: string;
  sessionId?: string;
  sessionExpiresAt?: string;
  totpSetupRequired?: boolean;
};

export type UserSession = {
  id: string;
  userId: string;
  deviceName: string;
  deviceId: string;
  ip: string;
  userAgent?: string | null;
  loginAt: string;
  lastActiveAt: string;
  expiresAt: string;
  isActive: boolean;
  logoutAt?: string | null;
};
