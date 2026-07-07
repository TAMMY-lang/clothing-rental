import type {
  AuthResult,
  AuthUser,
  CartItem,
  ChatConversation,
  Coupon,
  FavoriteItem,
  MemberLevel,
  MerchantTenantReview,
  MerchantWallet,
  Order,
  Product,
  ProductCategory,
  ProductOverview,
  ProductReview,
  ReturnAddress,
  ShopSetting,
  ShopAnnouncement,
  TryOnSetting,
  TryOnFeeRule,
  Withdrawal,
  WithdrawalMethod,
  WalletTransaction,
  UserSession
} from "./types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 10000);
  const token = window.localStorage.getItem("authToken");

  const response = await fetch(`${API_BASE_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      "Cache-Control": "no-cache",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options?.headers
    },
    cache: "no-store",
    signal: controller.signal,
    ...options
  }).catch((error) => {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("网络请求超时，请稍后重试");
    }
    throw new Error("网络异常，请检查后端服务是否正常");
  }).finally(() => {
    window.clearTimeout(timeout);
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    const fieldErrors = payload.details?.fieldErrors as Record<string, string[]> | undefined;
    const detailText = fieldErrors
      ? Object.entries(fieldErrors)
        .flatMap(([field, messages]) => messages.map((message) => `${field}: ${message}`))
        .join("；")
      : "";
    throw new Error([payload.message ?? payload.error ?? `请求失败（${response.status}）`, detailText].filter(Boolean).join("："));
  }
  return payload.data as T;
}

export async function uploadProductImage(file: File, productId = "draft-product") {
  const controller = new AbortController();
  const timeout = window.setTimeout(() => controller.abort(), 20000);
  const token = window.localStorage.getItem("authToken");
  const formData = new FormData();
  formData.append("productId", productId);
  formData.append("image", file);

  const response = await fetch(`${API_BASE_URL}/api/uploads/images`, {
    method: "POST",
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {})
    },
    body: formData,
    signal: controller.signal
  }).catch((error) => {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new Error("图片上传超时，请稍后重试");
    }
    throw new Error("图片上传失败，请检查后端服务是否正常");
  }).finally(() => {
    window.clearTimeout(timeout);
  });

  const payload = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(payload.message ?? payload.error ?? `图片上传失败（${response.status}）`);
  }
  return payload.data as { url: string; path: string; filename: string; size: number; mimeType: string };
}

export function saveAuth(result: AuthResult) {
  window.localStorage.setItem("authToken", result.token);
  window.localStorage.setItem("authUser", JSON.stringify(result.user));
}

export function clearAuth() {
  window.localStorage.removeItem("authToken");
  window.localStorage.removeItem("authUser");
}

export function getSavedUser(): AuthUser | null {
  const raw = window.localStorage.getItem("authUser");
  if (!raw) return null;
  try {
    return JSON.parse(raw) as AuthUser;
  } catch {
    return null;
  }
}

export async function register(input: {
  name: string;
  phone: string;
  password: string;
  role?: "USER" | "MERCHANT";
}) {
  return request<AuthResult>("/api/auth/register", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function login(input: {
  phone: string;
  password: string;
  captcha?: string;
  smsCode?: string;
  totpCode?: string;
  deviceId?: string;
  deviceName?: string;
  forceLogin?: boolean;
}) {
  return request<AuthResult>("/api/auth/login", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function getMe() {
  return request<AuthUser>("/api/auth/me");
}

export async function setPaymentPassword(input: {
  paymentPassword: string;
  oldPaymentPassword?: string;
  smsCode?: string;
}) {
  return request<{ message: string }>("/api/auth/set-payment-password", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function changePassword(input: {
  oldPassword: string;
  newPassword: string;
  smsCode: string;
}) {
  return request<{ message: string }>("/api/auth/change-password", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function resetPassword(input: {
  phone: string;
  newPassword: string;
  smsCode: string;
}) {
  return request<{ message: string }>("/api/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listLoginLogs() {
  return request<Array<{ id: string; ip?: string; device?: string; success: boolean; reason?: string; createdAt: string }>>("/api/auth/login-logs");
}

export async function setupTotp() {
  return request<{ secret: string; otpauthUrl: string; qrCode: string }>("/api/auth/totp/setup", {
    method: "POST"
  });
}

export async function verifyTotpSetup(token: string) {
  return request<{ enabled: boolean }>("/api/auth/totp/verify", {
    method: "POST",
    body: JSON.stringify({ token })
  });
}

export async function disableTotp(input: { token: string; smsCode: string }) {
  return request<{ enabled: boolean }>("/api/auth/totp/disable", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listSessions() {
  return request<UserSession[]>("/api/auth/sessions", { method: "POST" });
}

export async function logoutSession(id: string) {
  return request<{ success: boolean }>(`/api/auth/sessions/${id}`, { method: "DELETE" });
}

export async function logoutCurrentSession() {
  return request<{ success: boolean }>("/api/auth/logout", { method: "POST" });
}

export async function getDeviceStatus() {
  return request<{ active: boolean; activeSessionId?: string; session?: UserSession | null }>("/api/auth/device-status");
}

export async function listAdminUsers() {
  return request<Array<{
    id: string;
    name: string;
    phone: string;
    role: string;
    disabled: boolean;
    totpEnabled: boolean;
    lastLoginAt?: string | null;
  }>>("/api/admin/users");
}

export async function updateAdminUserStatus(id: string, disabled: boolean) {
  return request(`/api/admin/users/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ disabled })
  });
}

export async function resetAdminUserPassword(id: string, newPassword = "Aa123456!") {
  return request<{ temporaryPassword: string; message: string }>(`/api/admin/users/${id}/reset-password`, {
    method: "POST",
    body: JSON.stringify({ newPassword })
  });
}

export async function listAdminOrders() {
  return request<Order[]>("/api/admin/orders");
}

export async function listAdminAuditLogs() {
  return request<Array<{ id: string; phone: string; role?: string; success: boolean; reason?: string; device?: string; ip?: string; createdAt: string }>>("/api/admin/audit-logs");
}

export async function getAdminSecuritySettings() {
  return request<Record<string, unknown>>("/api/admin/security-settings");
}

export async function listChatConversations() {
  return request<ChatConversation[]>("/api/chats");
}

export async function startChat(input: { productId?: string; initialMessage?: string }) {
  return request<ChatConversation>("/api/chats", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function sendChatMessage(conversationId: string, content: string) {
  return request<ChatConversation>(`/api/chats/${conversationId}/messages`, {
    method: "POST",
    body: JSON.stringify({ content })
  });
}

export async function listProductReviews(productId: string) {
  return request<ProductReview[]>(`/api/reviews/products/${productId}`);
}

export async function getTryOnSetting() {
  return request<TryOnSetting>("/api/shop/try-on-setting");
}

export async function updateTryOnSetting(input: {
  enabled: boolean;
  feeRules: TryOnFeeRule[];
  processNote: string;
  careNotice: string;
}) {
  return request<TryOnSetting>("/api/shop/try-on-setting", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export async function listReturnAddresses(onlyEnabled = false) {
  return request<ReturnAddress[]>(`/api/shop/return-addresses${onlyEnabled ? "?enabled=true" : ""}`);
}

export async function createReturnAddress(input: {
  label: string;
  receiver: string;
  phone: string;
  address: string;
  isDefault: boolean;
  enabled: boolean;
}) {
  return request<ReturnAddress>("/api/shop/return-addresses", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateReturnAddressStatus(id: string, enabled: boolean) {
  return request<ReturnAddress>(`/api/shop/return-addresses/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ enabled })
  });
}

export async function setDefaultReturnAddress(id: string) {
  return request<ReturnAddress>(`/api/shop/return-addresses/${id}/default`, {
    method: "PATCH"
  });
}

export async function listMerchantReviews() {
  return request<ProductReview[]>("/api/reviews/merchant");
}

export async function createProductReview(orderId: string, input: {
  overallScore: number;
  cleanlinessScore: number;
  sizeAccuracyScore: number;
  matchScore: number;
  content: string;
  images: string[];
}) {
  return request<ProductReview>(`/api/reviews/orders/${orderId}`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function auditProductReview(id: string, input: { status: "APPROVED" | "REJECTED"; reason?: string }) {
  return request<ProductReview>(`/api/reviews/${id}/audit`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export async function replyProductReview(id: string, reply: string) {
  return request<ProductReview>(`/api/reviews/${id}/reply`, {
    method: "POST",
    body: JSON.stringify({ reply })
  });
}

export async function createTenantReview(orderId: string, input: { careScore: number; comment?: string }) {
  return request<MerchantTenantReview>(`/api/reviews/orders/${orderId}/tenant`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listProducts(params: Record<string, string>) {
  const query = new URLSearchParams(
    Object.entries(params).filter(([, value]) => value.trim().length > 0)
  );
  return request<Product[]>(`/api/products?${query.toString()}`);
}

export async function createProduct(input: {
  name: string;
  category: string;
  style?: string;
  scenario?: string;
  tagPrice: number;
  dailyRentalPrice: number;
  depositAmount: number;
  tags: string[];
  mainImage?: string;
  videoUrl?: string;
  explanation?: string;
  detailImages?: string[];
  images: string[];
  shippingMethods?: ("PICKUP" | "EXPRESS")[];
  specs: Array<{
    skuCode?: string;
    color?: string;
    size?: string;
    stock: number;
  }>;
}) {
  return request<Product>("/api/products", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function deleteProduct(id: string) {
  return request<Product>(`/api/products/${id}`, {
    method: "DELETE"
  });
}

export async function listCategories() {
  return request<ProductCategory[]>("/api/products/categories");
}

export async function createCategory(name: string) {
  return request<ProductCategory>("/api/products/categories", {
    method: "POST",
    body: JSON.stringify({ name })
  });
}

export async function activateAllProducts() {
  return request<Product[]>("/api/products/bulk/activate", { method: "POST" });
}

export async function listCart() {
  return request<CartItem[]>("/api/customer/cart");
}

export async function addToCart(productId: string, specId: string, quantity = 1) {
  return request<CartItem>("/api/customer/cart", {
    method: "POST",
    body: JSON.stringify({ productId, specId, quantity })
  });
}

export async function removeCartItem(id: string) {
  return request<CartItem>(`/api/customer/cart/${id}`, { method: "DELETE" });
}

export async function listFavorites() {
  return request<FavoriteItem[]>("/api/customer/favorites");
}

export async function addFavorite(productId: string) {
  return request<FavoriteItem>(`/api/customer/favorites/${productId}`, { method: "POST" });
}

export async function removeFavorite(productId: string) {
  return request<FavoriteItem>(`/api/customer/favorites/${productId}`, { method: "DELETE" });
}

export async function getProductOverview() {
  return request<ProductOverview>("/api/products/overview");
}

export async function checkAvailability(input: {
  productId: string;
  specId: string;
  rentStartDate: string;
  rentEndDate: string;
}) {
  const query = new URLSearchParams(input);
  return request<{ available: boolean; rentalDays: number }>(`/api/availability/check?${query}`);
}

export async function createDemoUser() {
  return request<{ id: string }>("/api/users", {
    method: "POST",
    body: JSON.stringify({
      name: "小程序体验用户",
      phone: "13800000000",
      customSize: { height: 168, weight: 52, bust: 82, waist: 64 }
    })
  });
}

export async function createOrder(input: {
  productId: string;
  specId: string;
  startDate: string;
  endDate: string;
  totalPrice: number;
  shippingMethod?: "PICKUP" | "EXPRESS";
  shippingAddress?: string;
  pickupLocation?: string;
  expressFee?: number;
  orderType?: "RENTAL" | "TRY_ON";
  tryOnQuantity?: number;
}) {
  return request<Order>("/api/orders", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function decideTryOnOrder(orderId: string, decision: "RENT" | "NO_RENT") {
  return request<Order>(`/api/orders/${orderId}/try-on/decision`, {
    method: "POST",
    body: JSON.stringify({ decision })
  });
}

export async function interceptShipment(orderId: string, reason: string) {
  return request<Order>(`/api/orders/${orderId}/intercept`, {
    method: "POST",
    body: JSON.stringify({ reason })
  });
}

export async function markOrderShipped(orderId: string, logisticsCompany: string, logisticsTrackingNumber: string) {
  return request<Order>(`/api/orders/${orderId}/shipments/mark-renting`, {
    method: "POST",
    body: JSON.stringify({ logisticsCompany, logisticsTrackingNumber })
  });
}

export async function refreshOrderLogistics(orderId: string) {
  return request<Order>(`/api/orders/${orderId}/logistics/refresh`, {
    method: "POST"
  });
}

export async function listOrders(userId?: string) {
  const query = userId ? `?userId=${userId}` : "";
  return request<Order[]>(`/api/orders${query}`);
}

export async function confirmPayment(orderId: string, paymentPassword: string) {
  const payment = await request<{ paymentId: string; orderId: string; amount: number; mock: boolean }>(
    `/api/payments/orders/${orderId}/wechat`,
    { method: "POST", body: JSON.stringify({ paymentPassword }) }
  );
  return request<Order>("/api/payments/wechat/callback", {
    method: "POST",
    body: JSON.stringify({
      orderId,
      transactionId: `mock_${payment.paymentId}`,
      status: "SUCCESS"
    })
  });
}

export async function cancelOrder(orderId: string) {
  return request<Order>(`/api/orders/${orderId}/cancel`, { method: "POST" });
}

export async function markRenting(orderId: string) {
  return request<Order>(`/api/orders/${orderId}/shipments/mark-renting`, { method: "POST" });
}

export async function requestReturn(orderId: string) {
  return request<Order>(`/api/orders/${orderId}/return`, { method: "POST" });
}

export async function inspectReturn(orderId: string, cleaningFee: number) {
  return request<Order>(`/api/orders/${orderId}/inspection`, {
    method: "POST",
    body: JSON.stringify({ cleaningFee })
  });
}

export async function requestExtension(orderId: string, input: {
  type: "NORMAL" | "FORCE_MAJEURE";
  extensionDays: number;
  extensionFee: number;
  proof?: string;
}) {
  return request<{ review: unknown; order: Order }>(`/api/orders/${orderId}/extend`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function reviewExtension(orderId: string, approved: boolean, rejectReason?: string) {
  return request<Order>(`/api/orders/${orderId}/extend/review`, {
    method: "POST",
    body: JSON.stringify({ approved, rejectReason })
  });
}

export async function adjustOrderPrice(orderId: string, totalPrice: number, reason: string) {
  return request<Order>(`/api/orders/${orderId}/adjust-price`, {
    method: "POST",
    body: JSON.stringify({ totalPrice, reason })
  });
}

export async function delayShipment(orderId: string, delayedUntil: string, reason: string) {
  return request<Order>(`/api/orders/${orderId}/delay-shipment`, {
    method: "POST",
    body: JSON.stringify({ delayedUntil, reason })
  });
}

export async function getAnnouncement() {
  return request<ShopAnnouncement>("/api/shop/announcement");
}

export async function updateAnnouncement(input: {
  title: string;
  content: string;
  enabled: boolean;
}) {
  return request<ShopAnnouncement>("/api/shop/announcement", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export async function listCoupons(enabledOnly = false) {
  return request<Coupon[]>(`/api/shop/coupons${enabledOnly ? "?enabled=true" : ""}`);
}

export async function createCoupon(input: {
  title: string;
  code: string;
  discountAmount: number;
  minOrderAmount: number;
  usageLimit?: number;
  enabled: boolean;
}) {
  return request<Coupon>("/api/shop/coupons", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateCouponStatus(id: string, enabled: boolean) {
  return request<Coupon>(`/api/shop/coupons/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ enabled })
  });
}

export async function getMerchantWallet() {
  return request<MerchantWallet>("/api/shop/wallet");
}

export async function listWithdrawals() {
  return request<Withdrawal[]>("/api/shop/withdrawals");
}

export async function createWithdrawal(input: {
  amount: number;
  methodId?: string;
  accountName?: string;
  accountNo?: string;
}) {
  return request<Withdrawal>("/api/shop/withdrawals", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function approveWithdrawal(id: string) {
  return request<Withdrawal>(`/api/shop/withdrawals/${id}/approve`, { method: "PATCH" });
}

export async function completeWithdrawal(id: string) {
  return request<Withdrawal>(`/api/shop/withdrawals/${id}/complete`, { method: "PATCH" });
}

export async function rejectWithdrawal(id: string) {
  return request<Withdrawal>(`/api/shop/withdrawals/${id}/reject`, { method: "PATCH" });
}

export async function listWithdrawalMethods() {
  return request<WithdrawalMethod[]>("/api/shop/withdrawal-methods");
}

export async function createWithdrawalMethod(input: {
  channel: "BANK" | "ALIPAY" | "WECHAT";
  accountName: string;
  accountNo: string;
  bankName?: string;
  qrCode?: string;
  isDefault: boolean;
  enabled: boolean;
}) {
  return request<WithdrawalMethod>("/api/shop/withdrawal-methods", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function listWalletTransactions() {
  return request<WalletTransaction[]>("/api/shop/wallet/transactions");
}

export async function getShopSetting() {
  return request<ShopSetting>("/api/shop/settings");
}

export async function updateShopSetting(input: {
  settlementDays?: number;
  minWithdrawalAmount?: number;
  withdrawalFeePercent?: number;
  withdrawalFeeFixed?: number;
}) {
  return request<ShopSetting>("/api/shop/settings", {
    method: "PUT",
    body: JSON.stringify(input)
  });
}

export async function runSettlements() {
  return request<Order[]>("/api/shop/settlements/run", { method: "POST" });
}

export async function listMemberLevels() {
  return request<MemberLevel[]>("/api/shop/member-levels");
}

export async function createMemberLevel(input: {
  name: string;
  minSpend: number;
  discountPercent: number;
  benefits: string[];
  enabled: boolean;
}) {
  return request<MemberLevel>("/api/shop/member-levels", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export async function updateMemberLevelStatus(id: string, enabled: boolean) {
  return request<MemberLevel>(`/api/shop/member-levels/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ enabled })
  });
}

export async function updateProductStatus(productId: string, status: "ACTIVE" | "INACTIVE") {
  return request<Product>(`/api/products/${productId}/status`, {
    method: "PATCH",
    body: JSON.stringify({ status })
  });
}

export async function updateSpecStock(specId: string, stock: number) {
  return request(`/api/products/specs/${specId}/stock`, {
    method: "PATCH",
    body: JSON.stringify({ stock })
  });
}

export async function updateProductSpec(specId: string, input: {
  skuCode?: string;
  color?: string;
  size?: string;
  bust?: number;
  waist?: number;
  stock: number;
}) {
  return request(`/api/products/specs/${specId}`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}
export async function getActiveShopDecoration() {
  return request<{ data: any }>("/shop/decorations/active");
}
