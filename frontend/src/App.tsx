import ShopHome from "./pages/shop/ShopHome";
import ProductList from "./pages/shop/ProductList";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import "./App.css";
import ShopDecoration from "./pages/merchant/ShopDecoration";
import DecorationList from "./pages/merchant/DecorationList";
import type { ShopDecorationRecord } from "./pages/merchant/ShopDecoration";
import {
  adjustOrderPrice,
  activateAllProducts,
  addFavorite,
  addToCart,
  auditProductReview,
  approveWithdrawal,
  cancelOrder,
  clearAuth,
  confirmPayment,
  createCoupon,
  createCategory,
  createMemberLevel,
  createOrder,
  createProduct,
  createProductReview,
  createReturnAddress,
  createTenantReview,
  createWithdrawal,
  createWithdrawalMethod,
  completeWithdrawal,
  deleteProduct,
  delayShipment,
  getAnnouncement,
  getMe,
  getDeviceStatus,
  getAdminSecuritySettings,
  getMerchantWallet,
  getProductOverview,
  getSavedUser,
  getShopSetting,
  getTryOnSetting,
  inspectReturn,
  interceptShipment,
  listChatConversations,
  listCart,
  listCoupons,
  listCategories,
  listAdminAuditLogs,
  listAdminOrders,
  listAdminUsers,
  listFavorites,
  listMerchantReviews,
  listLoginLogs,
  listSessions,
  listWalletTransactions,
  listWithdrawalMethods,
  listWithdrawals,
  listMemberLevels,
  listOrders,
  listProducts,
  listProductReviews,
  listReturnAddresses,
  login,
  logoutCurrentSession,
  logoutSession,
  markOrderShipped,
  removeCartItem,
  removeFavorite,
  resetAdminUserPassword,
  refreshOrderLogistics,
  rejectWithdrawal,
  requestExtension,
  requestReturn,
  reviewExtension,
  replyProductReview,
  saveAuth,
  register,
  sendChatMessage,
  runSettlements,
  setDefaultReturnAddress,
  setupTotp,
  startChat,
  updateAnnouncement,
  updateAdminUserStatus,
  updateCouponStatus,
  updateMemberLevelStatus,
  updateProductSpec,
  updateProductStatus,
  updateReturnAddressStatus,
  updateShopSetting,
  updateTryOnSetting,
  uploadProductImage,
  verifyTotpSetup,
  disableTotp,
  decideTryOnOrder,
} from "./api";
import type {
  AuthUser,
  CartItem,
  ChatConversation,
  Coupon,
  FavoriteItem,
  MemberLevel,
  MerchantWallet,
  Order,
  Product,
  ProductOverview,
  ProductReview,
  ProductSpec,
  ReturnAddress,
  ShopSetting,
  ShopAnnouncement,
  TryOnSetting,
  Withdrawal,
  WithdrawalMethod,
  WalletTransaction,
  UserSession
} from "./types";

const orderGroups = [
  { title: "待付款", statuses: ["PENDING", "PENDING_PAYMENT"] },
  { title: "租赁中", statuses: ["RENTING", "PENDING_SHIPMENT", "PENDING_EXTENSION_REVIEW", "PENDING_EXTENSION"] },
  { title: "待归还", statuses: ["PENDING_RETURN", "PENDING_INSPECTION", "RETURNED"] },
  { title: "已完成", statuses: ["COMPLETED", "SETTLING", "SETTLED", "CANCELED"] }
];

const statusText: Record<string, string> = {
  PENDING: "待付款",
  PENDING_PAYMENT: "待付款",
  PENDING_SHIPMENT: "待发货",
  RENTING: "租赁中",
  PENDING_EXTENSION_REVIEW: "延期待审核",
  PENDING_EXTENSION: "延期待审核",
  PENDING_RETURN: "待归还",
  PENDING_INSPECTION: "待验收",
  RETURNED: "已归还",
  COMPLETED: "已完成",
  SETTLING: "结算中",
  SETTLED: "已结算",
  CANCELED: "已取消"
};

function formatMoney(value: number) {
  return `¥${Number(value).toFixed(0)}`;
}

function formatDiscount(percent: number) {
  return percent >= 100 ? "无折扣" : `${(percent / 10).toFixed(percent % 10 === 0 ? 0 : 1)}折`;
}

function parseBenefits(value?: string) {
  try {
    const parsed = JSON.parse(value || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function withdrawalStatusText(status: string) {
  return ({ PENDING: "待审核", APPROVED: "已通过", COMPLETED: "已打款", REJECTED: "已驳回" } as Record<string, string>)[status] ?? status;
}

function reviewStatusText(status: string) {
  return ({ PENDING: "待审核", APPROVED: "已展示", REJECTED: "已驳回" } as Record<string, string>)[status] ?? status;
}

const emptyPublishForm = {
  name: "",
  category: "婚纱",
  style: "",
  scenario: "婚礼",
  tagPrice: "999",
  dailyRentalPrice: "99",
  depositAmount: "100",
  mainImage: "",
  videoUrl: "",
  explanation: "",
  detailImages: [] as string[],
  skuCode: "",
  color: "默认色",
  size: "M",
  selectedColors: ["默认色"] as string[],
  selectedSizes: ["M"] as string[],
  stock: "1",
  shippingMethods: ["PICKUP", "EXPRESS"] as ("PICKUP" | "EXPRESS")[]
};

const commonSkuColors = ["红色", "白色", "蓝色", "灰色", "黑色", "粉色", "香槟色", "金色", "银色", "绿色", "紫色", "米色"];
const commonSkuSizes = ["S码", "M码", "L码", "XL码", "2XL码", "3XL码", "XXL码", "4XL码", "5XL码", "6XL码", "均码", "定制"];

function buildSkuCode(name: string, color: string, size: string) {
  return [name.trim() || "商品", color.trim() || "默认色", size.trim() || "定制"].join("-");
}

function toggleSpecValue(values: string[], value: string) {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

const remoteExpressRegions = ["新疆", "西藏", "内蒙古", "青海", "宁夏", "甘肃", "海南", "香港", "澳门", "台湾"];
const remoteExpressFee = 30;

function isRemoteExpressAddress(address = "") {
  return remoteExpressRegions.some((region) => address.includes(region));
}

function calculateExpressFee(method: "PICKUP" | "EXPRESS", address: string) {
  if (method !== "EXPRESS") return 0;
  return isRemoteExpressAddress(address) ? remoteExpressFee : 0;
}

function calculateTryOnFee(setting: TryOnSetting | null, style: string | null | undefined, type: "RENTAL" | "TRY_ON", quantity: number) {
  if (type !== "TRY_ON" || !setting?.enabled) return 0;
  const count = Math.max(quantity || 1, 1);
  const normalizedStyle = style || "";
  const byClosestQuantity = (rules: typeof setting.feeRules) =>
    rules.filter((rule) => rule.quantity <= count).sort((a, b) => b.quantity - a.quantity)[0];
  const exact = setting.feeRules.find((rule) => rule.style === normalizedStyle && rule.quantity === count);
  const styleRule = byClosestQuantity(setting.feeRules.filter((rule) => rule.style === normalizedStyle));
  const defaultExact = setting.feeRules.find((rule) => rule.style === "默认" && rule.quantity === count);
  const defaultRule = byClosestQuantity(setting.feeRules.filter((rule) => rule.style === "默认"));
  const fallbackExact = setting.feeRules.find((rule) => rule.quantity === count);
  const fallbackRule = byClosestQuantity(setting.feeRules);
  return exact?.fee ?? styleRule?.fee ?? defaultExact?.fee ?? defaultRule?.fee ?? fallbackExact?.fee ?? fallbackRule?.fee ?? 30 * count;
}

function todayString() {
  return new Date().toISOString().slice(0, 10);
}

function addDays(dateString: string, days: number) {
  const date = new Date(dateString);
  date.setDate(date.getDate() + days);
  return date.toISOString().slice(0, 10);
}

function countRentalDays(startDate: string, endDate: string) {
  if (!startDate || !endDate) return 0;
  const start = new Date(startDate);
  const end = new Date(endDate);
  const diff = Math.floor((end.getTime() - start.getTime()) / 86400000) + 1;
  return Number.isFinite(diff) ? diff : 0;
}

function normalizeImage(product: Product) {
  return product.images[0] || `https://placehold.co/800x1000/F8E7E7/7C2D12?text=${encodeURIComponent(product.category)}`;
}

function daysUntil(dateString?: string) {
  if (!dateString) return null;
  const end = new Date(dateString);
  const today = new Date(todayString());
  const days = Math.ceil((end.getTime() - today.getTime()) / 86400000);
  return days;
}

function App() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [announcement, setAnnouncement] = useState<ShopAnnouncement | null>(null);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [productOverview, setProductOverview] = useState<ProductOverview | null>(null);
  const [productReviews, setProductReviews] = useState<ProductReview[]>([]);
  const [merchantReviews, setMerchantReviews] = useState<ProductReview[]>([]);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [favoriteItems, setFavoriteItems] = useState<FavoriteItem[]>([]);
  const [wallet, setWallet] = useState<MerchantWallet | null>(null);
  const [withdrawals, setWithdrawals] = useState<Withdrawal[]>([]);
  const [withdrawalMethods, setWithdrawalMethods] = useState<WithdrawalMethod[]>([]);
  const [walletTransactions, setWalletTransactions] = useState<WalletTransaction[]>([]);
   const [merchantSubPage, setMerchantSubPage] = useState<"workbench" | "shop-decoration" | "decoration-list">("workbench");
  const [shopDecorations, setShopDecorations] = useState<ShopDecorationRecord[]>([]);
  const [editingDecoration, setEditingDecoration] = useState<ShopDecorationRecord | null>(null);
  const [shopSetting, setShopSetting] = useState<ShopSetting | null>(null);
  const [memberLevels, setMemberLevels] = useState<MemberLevel[]>([]);
  const [tryOnSetting, setTryOnSetting] = useState<TryOnSetting | null>(null);
  const [returnAddresses, setReturnAddresses] = useState<ReturnAddress[]>([]);
  const [sessions, setSessions] = useState<UserSession[]>([]);
  const [loginLogs, setLoginLogs] = useState<Array<{ id: string; ip?: string; device?: string; success: boolean; reason?: string; createdAt: string }>>([]);
  const [adminUsers, setAdminUsers] = useState<Array<{ id: string; name: string; phone: string; role: string; disabled: boolean; totpEnabled: boolean; lastLoginAt?: string | null }>>([]);
  const [adminOrders, setAdminOrders] = useState<Order[]>([]);
  const [adminAuditLogs, setAdminAuditLogs] = useState<Array<{ id: string; phone: string; role?: string; success: boolean; reason?: string; device?: string; ip?: string; createdAt: string }>>([]);
  const [adminSecuritySettings, setAdminSecuritySettings] = useState<Record<string, unknown> | null>(null);
  const [currentUser, setCurrentUser] = useState<AuthUser | null>(() => getSavedUser());
  const [authMode, setAuthMode] = useState<"login" | "register">("login");
  const [authForm, setAuthForm] = useState({
    name: "体验用户",
    phone: "13800000000",
    password: "Aa123456!",
    role: "USER" as "USER"
  });
  const [activeTab, setActiveTab] = useState<"products" | "orders" | "merchant" | "admin">("products");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [productTransition, setProductTransition] = useState<"idle" | "leaving" | "entering">("idle");
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [selectedSpecId, setSelectedSpecId] = useState("");
  const [successOrder, setSuccessOrder] = useState<Order | null>(null);
  const [extensionOrder, setExtensionOrder] = useState<Order | null>(null);
  const [extensionDays, setExtensionDays] = useState(1);
  const [extensionFee, setExtensionFee] = useState(0);
  const [extensionType, setExtensionType] = useState<"NORMAL" | "FORCE_MAJEURE">("NORMAL");
  const [extensionProof, setExtensionProof] = useState("");
  const [rentStartDate, setRentStartDate] = useState(todayString());
  const [rentEndDate, setRentEndDate] = useState(addDays(todayString(), 0));
  const [shippingMethod, setShippingMethod] = useState<"PICKUP" | "EXPRESS">("PICKUP");
  const [shippingAddress, setShippingAddress] = useState("");
  const [orderType, setOrderType] = useState<"RENTAL" | "TRY_ON">("RENTAL");
  const [tryOnQuantity, setTryOnQuantity] = useState(1);
  const [message, setMessage] = useState("正在加载商品...");
  const [loading, setLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState<"main" | "detail" | null>(null);
  const [showPublishForm, setShowPublishForm] = useState(false);
  const [publishStep, setPublishStep] = useState(1);
  const [publishForm, setPublishForm] = useState(emptyPublishForm);
  const [showTryOnForm, setShowTryOnForm] = useState(false);
  const [tryOnForm, setTryOnForm] = useState({
    enabled: true,
    feeRulesText: "拖尾,1,60\n修身,1,40\n默认,1,30",
    processNote: "确定租：试穿结束衣服寄回，收到后退押金和试穿费用。不租：当天寄回，收到后退租金押金，试穿费用不退。",
    careNotice: "试穿应避免衣服弄脏和破损；如产生清洁或修复费用，将从押金中扣除。"
  });
  const [showReturnAddressForm, setShowReturnAddressForm] = useState(false);
  const [returnAddressForm, setReturnAddressForm] = useState({
    label: "",
    receiver: "",
    phone: "",
    address: "",
    isDefault: false
  });
  const [chatOpen, setChatOpen] = useState(false);
  const [chatConversations, setChatConversations] = useState<ChatConversation[]>([]);
  const [activeChatId, setActiveChatId] = useState("");
  const [chatInput, setChatInput] = useState("");

  const selectedSpec = useMemo<ProductSpec | undefined>(
    () => selectedProduct?.specs.find((spec) => spec.id === selectedSpecId),
    [selectedProduct, selectedSpecId]
  );

  const rentalDays = useMemo(
    () => countRentalDays(rentStartDate, rentEndDate),
    [rentStartDate, rentEndDate]
  );

  const totalAmount = useMemo(() => {
    if (!selectedProduct || rentalDays < 1 || rentalDays > 7) return 0;
    return selectedProduct.dailyRentalPrice + selectedProduct.depositAmount + calculateExpressFee(shippingMethod, shippingAddress) + calculateTryOnFee(tryOnSetting, selectedProduct.style, orderType, tryOnQuantity);
  }, [rentalDays, selectedProduct, shippingAddress, shippingMethod, orderType, tryOnQuantity, tryOnSetting]);

  const directTryOnTotalAmount = useMemo(() => {
    if (!selectedProduct || rentalDays < 1 || rentalDays > 7) return 0;
    return selectedProduct.dailyRentalPrice + selectedProduct.depositAmount + calculateExpressFee(shippingMethod, shippingAddress) + calculateTryOnFee(tryOnSetting, selectedProduct.style, "TRY_ON", tryOnQuantity);
  }, [rentalDays, selectedProduct, shippingAddress, shippingMethod, tryOnQuantity, tryOnSetting]);

  const currentExpressFee = useMemo(
    () => calculateExpressFee(shippingMethod, shippingAddress),
    [shippingAddress, shippingMethod]
  );

  const currentTryOnFee = useMemo(
    () => calculateTryOnFee(tryOnSetting, selectedProduct?.style, orderType, tryOnQuantity),
    [orderType, selectedProduct?.style, tryOnQuantity, tryOnSetting]
  );

  const activeChat = useMemo(
    () => chatConversations.find((conversation) => conversation.id === activeChatId) ?? chatConversations[0],
    [activeChatId, chatConversations]
  );

  async function fetchProducts(category = selectedCategory) {
    setLoading(true);
    try {
      const [data, announcementData, categoryData, enabledCoupons, cartData, favoriteData, levels, tryOn, addresses] = await Promise.all([
        listProducts({ category }),
        getAnnouncement(),
        listCategories(),
        listCoupons(true),
        listCart(),
        listFavorites(),
        listMemberLevels(),
        getTryOnSetting(),
        listReturnAddresses(true)
      ]);
      setProducts(data);
      setAnnouncement(announcementData);
      setCategories(categoryData.map((item) => item.name));
      setCoupons(enabledCoupons);
      setCartItems(cartData);
      setFavoriteItems(favoriteData);
      setMemberLevels(levels);
      setTryOnSetting(tryOn);
      setReturnAddresses(addresses);
      setMessage(data.length ? "" : "当前品类暂无商品。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "商品加载失败，请检查后端服务。");
    } finally {
      setLoading(false);
    }
  }

  async function fetchOrders() {
    setLoading(true);
    try {
      const data = await listOrders();
      setOrders(data);
      setMessage(data.length ? "" : "暂无订单。");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "订单加载失败，请检查后端服务。");
    } finally {
      setLoading(false);
    }
  }

  async function fetchMerchantData() {
    const [overview, allProducts, allCoupons, walletData, withdrawalData, methods, transactions, setting, levels, reviews, tryOn, addresses] = await Promise.all([
      getProductOverview(),
      listProducts({ includeInactive: "true" }),
      listCoupons(false),
      getMerchantWallet(),
      listWithdrawals(),
      listWithdrawalMethods(),
      listWalletTransactions(),
      getShopSetting(),
      listMemberLevels(),
      listMerchantReviews(),
      getTryOnSetting(),
      listReturnAddresses(false)
    ]);
    setProductOverview(overview);
    setProducts(allProducts);
    setCoupons(allCoupons);
    setWallet(walletData);
    setWithdrawals(withdrawalData);
    setWithdrawalMethods(methods);
    setWalletTransactions(transactions);
    setShopSetting(setting);
    setMemberLevels(levels);
    setMerchantReviews(reviews);
    setTryOnSetting(tryOn);
    setReturnAddresses(addresses);
  }

  async function fetchChats() {
    if (!currentUser) return;
    const conversations = await listChatConversations();
    setChatConversations(conversations);
    setActiveChatId((prev) => prev || conversations[0]?.id || "");
  }

  function openDetail(product: Product) {
    if (productTransition !== "idle") return;
    const firstAvailableSpec = product.specs.find((spec) => spec.stock > 0) ?? product.specs[0];
    setProductTransition("leaving");
    listProductReviews(product.id).then(setProductReviews).catch(() => setProductReviews([]));
    window.scrollTo({ top: 0, behavior: "smooth" });
    window.setTimeout(() => {
      setSelectedProduct(product);
      setSuccessOrder(null);
      setActiveTab("products");
      setSelectedSpecId(firstAvailableSpec?.id ?? "");
      setRentStartDate(todayString());
      setRentEndDate(addDays(todayString(), 0));
      setProductTransition("entering");
      window.setTimeout(() => setProductTransition("idle"), 260);
    }, 140);
  }

  function closeDetail() {
    setProductTransition("leaving");
    window.setTimeout(() => {
      setSelectedProduct(null);
      setProductTransition("entering");
      window.scrollTo({ top: 0, behavior: "smooth" });
      window.setTimeout(() => setProductTransition("idle"), 220);
    }, 120);
  }

  function changeCategory(category: string) {
    setSelectedCategory(category);
    setSelectedProduct(null);
    fetchProducts(category);
  }

  function switchTab(tab: "products" | "orders" | "merchant" | "admin") {
    setActiveTab(tab);
    setSelectedProduct(null);
    setSelectedOrder(null);
    setSuccessOrder(null);
    setMessage("");
    if (tab === "orders" || tab === "merchant") {
      fetchOrders();
      if (tab === "merchant") {
        fetchMerchantData().catch(() => setMessage("商家数据概况加载失败。"));
      }
    } else if (tab === "admin") {
      refreshAdminData();
    } else {
      fetchProducts(selectedCategory);
    }
  }

  function handleStartDateChange(value: string) {
    setRentStartDate(value);
    const currentDays = countRentalDays(value, rentEndDate);
    if (currentDays < 1 || currentDays > 7) {
      setRentEndDate(value);
    }
  }

  function handleEndDateChange(value: string) {
    const days = countRentalDays(rentStartDate, value);
    if (days > 7) {
      setRentEndDate(addDays(rentStartDate, 6));
      setMessage("最长只能连续租赁 7 天，已自动调整结束日期。");
      return;
    }
    setRentEndDate(value);
  }

  async function handleRentNow(nextOrderType: "RENTAL" | "TRY_ON" = orderType) {
    if (!selectedProduct || !selectedSpec) {
      window.alert("请先选择商品规格");
      return;
    }
    if (selectedSpec.stock <= 0) {
      window.alert("库存不足");
      return;
    }
    if (rentalDays < 1 || rentalDays > 7) {
      window.alert("请选择 1 到 7 天的租赁日期");
      return;
    }
    if (!selectedProduct.shippingMethods?.includes(shippingMethod)) {
      window.alert(`该商品不支持${shippingMethod === "EXPRESS" ? "快递发货" : "自提"}`);
      return;
    }
    if (shippingMethod === "EXPRESS" && !shippingAddress.trim()) {
      window.alert("快递发货需填写收货地址");
      return;
    }

    setLoading(true);
    try {
      const effectiveTryOnFee = calculateTryOnFee(tryOnSetting, selectedProduct.style, nextOrderType, tryOnQuantity);
      const effectiveTotal = selectedProduct.dailyRentalPrice + selectedProduct.depositAmount + currentExpressFee + effectiveTryOnFee;
      const order = await createOrder({
        productId: selectedProduct.id,
        specId: selectedSpec.id,
        startDate: rentStartDate,
        endDate: rentEndDate,
        totalPrice: effectiveTotal,
        shippingMethod,
        shippingAddress: shippingAddress.trim() || undefined,
        expressFee: currentExpressFee,
        orderType: nextOrderType,
        tryOnQuantity: nextOrderType === "TRY_ON" ? tryOnQuantity : 0
      });
      setSuccessOrder(order);
      setSelectedProduct(null);
      setShippingAddress("");
      setMessage("");
      fetchOrders().catch(() => setMessage("订单已创建，订单列表稍后刷新。"));
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "下单失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleCancelOrder(orderId: string) {
    if (!window.confirm("确认取消该订单吗？取消后会释放对应档期。")) {
      return;
    }
    setLoading(true);
    try {
      await cancelOrder(orderId);
      await fetchOrders();
      setSelectedOrder(null);
      setMessage("订单已取消。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "取消失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handlePayOrder(orderId: string) {
    const paymentPassword = window.prompt("请输入 6 位支付密码");
    if (!paymentPassword) return;
    if (!/^\d{6}$/.test(paymentPassword)) {
      window.alert("支付密码必须是 6 位数字");
      return;
    }
    setLoading(true);
    try {
      const paidOrder = await confirmPayment(orderId, paymentPassword);
      if (successOrder) {
        setSuccessOrder(paidOrder);
      } else {
        setSelectedOrder(paidOrder);
      }
      fetchOrders().catch(() => setMessage("支付成功，订单列表稍后刷新。"));
      setMessage("支付成功，订单已进入租赁中。");
      window.alert("支付成功，订单已进入租赁中");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "支付失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleRequestReturn(orderId: string) {
    setLoading(true);
    try {
      const nextOrder = await requestReturn(orderId);
      setSelectedOrder(nextOrder);
      fetchOrders().catch(() => setMessage("已发起归还，订单列表稍后刷新。"));
      setMessage("已发起归还，等待商家验收。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "发起归还失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleInspectOrder(orderId: string, cleaningFee: number) {
    setLoading(true);
    try {
      const completedOrder = await inspectReturn(orderId, cleaningFee);
      setSelectedOrder(completedOrder);
      fetchOrders().catch(() => setMessage("验收完成，订单列表稍后刷新。"));
      if (cleaningFee > 0) {
        window.alert(`扣除清洁费${formatMoney(cleaningFee)}，剩余押金已退还`);
      } else {
        window.alert("押金已退还");
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "验收失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitExtension() {
    if (!extensionOrder) return;
    if (extensionType === "FORCE_MAJEURE" && !extensionProof.trim()) {
      window.alert("不可抗力延期需要上传或填写凭证占位");
      return;
    }
    if (!Number.isFinite(extensionFee) || extensionFee < 0) {
      window.alert("请输入有效的延期费用");
      return;
    }

    setLoading(true);
    try {
      const result = await requestExtension(extensionOrder.id, {
        type: extensionType,
        extensionDays,
        extensionFee,
        proof: extensionProof || undefined
      });
      setSelectedOrder(result.order);
      setExtensionOrder(null);
      fetchOrders().catch(() => setMessage("延期申请已提交，订单列表稍后刷新。"));
      window.alert(`延期申请已提交，延期费用 ${formatMoney(result.order.extensionFee ?? 0)}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "延期申请失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewExtension(orderId: string, approved: boolean) {
    setLoading(true);
    try {
      const order = await reviewExtension(orderId, approved, approved ? undefined : "商家审核驳回");
      setSelectedOrder(order);
      fetchOrders().catch(() => setMessage("延期审核已处理，订单列表稍后刷新。"));
      window.alert(approved ? "延期审核通过，归还日期已更新" : "延期审核驳回，原归还日期不变");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "审核失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleAdjustPrice(order: Order) {
    const current = order.totalPrice ?? order.totalAmount;
    const value = window.prompt("请输入改价后的订单总价", String(current));
    if (!value) return;
    const totalPrice = Number(value);
    if (!Number.isFinite(totalPrice) || totalPrice <= 0) {
      window.alert("请输入有效金额");
      return;
    }
    setLoading(true);
    try {
      const updatedOrder = await adjustOrderPrice(order.id, totalPrice, "商家拍后改价");
      setSelectedOrder(updatedOrder);
      fetchOrders().catch(() => setMessage("改价成功，订单列表稍后刷新。"));
      window.alert("改价成功");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "改价失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleDelayShipment(order: Order) {
    const delayedUntil = window.prompt("请输入延期发货日期，例如 2026-09-20", order.startDate ?? todayString());
    if (!delayedUntil) return;
    setLoading(true);
    try {
      const updatedOrder = await delayShipment(order.id, delayedUntil, "商家延期发货");
      setSelectedOrder(updatedOrder);
      fetchOrders().catch(() => setMessage("延期发货已更新，订单列表稍后刷新。"));
      window.alert("延期发货信息已更新");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "延期发货失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleEditAnnouncement() {
    const title = window.prompt("公告标题", announcement?.title ?? "店铺公告");
    if (!title) return;
    const content = window.prompt("公告内容", announcement?.content ?? "");
    if (!content) return;
    setLoading(true);
    try {
      const nextAnnouncement = await updateAnnouncement({ title, content, enabled: true });
      setAnnouncement(nextAnnouncement);
      window.alert("店铺公告已更新");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "公告更新失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleProduct(product: Product) {
    setLoading(true);
    try {
      await updateProductStatus(product.id, product.status === "ACTIVE" ? "INACTIVE" : "ACTIVE");
      if (activeTab === "merchant") {
        await fetchMerchantData();
      } else {
        await fetchProducts(selectedCategory);
      }
      window.alert("商品状态已更新");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "商品状态更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDeleteProduct(product: Product) {
    const confirmed = window.confirm(`确定要从商品列表删除「${product.name}」吗？历史订单会保留，但前台和商家商品列表将不再显示。`);
    if (!confirmed) return;
    setLoading(true);
    try {
      await deleteProduct(product.id);
      if (activeTab === "merchant") {
        await fetchMerchantData();
      } else {
        await fetchProducts(selectedCategory);
      }
      window.alert("商品已从列表删除");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "删除商品失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleEditSpec(spec: ProductSpec) {
    const skuCode = window.prompt("请输入 SKU 编码，例如：婚纱-白-M", spec.skuCode ?? `${spec.color ?? "默认色"}-${spec.size ?? "定制"}`);
    if (skuCode == null) return;
    const color = window.prompt("请输入颜色", spec.color ?? "");
    if (color == null) return;
    const size = window.prompt("请输入尺码", spec.size ?? "");
    if (size == null) return;
    const stockValue = window.prompt("请输入库存数量", String(spec.stock));
    if (stockValue == null) return;
    const stock = Number(stockValue);
    if (!Number.isInteger(stock) || stock < 0) {
      window.alert("请输入非负整数库存");
      return;
    }
    setLoading(true);
    try {
      await updateProductSpec(spec.id, {
        skuCode: skuCode.trim(),
        color: color.trim(),
        size: size.trim(),
        stock
      });
      if (activeTab === "merchant") {
        await fetchMerchantData();
      } else {
        await fetchProducts(selectedCategory);
      }
      window.alert("SKU 信息已更新");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "SKU 更新失败");
    } finally {
      setLoading(false);
    }
  }

  function handleCreateProduct() {
    setPublishForm((prev) => ({
      ...prev,
      category: selectedCategory || categories[0] || prev.category,
      skuCode: prev.skuCode || `${selectedCategory || categories[0] || "新品"}-默认-M`
    }));
    setPublishStep(1);
    setShowPublishForm(true);
  }

  async function handleUploadProductImage(file: File | undefined, target: "main" | "detail") {
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
      window.alert("仅支持 jpg、png、webp 图片格式");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      window.alert("图片大小不能超过 5MB");
      return;
    }
    setUploadingImage(target);
    try {
      const result = await uploadProductImage(file, publishForm.name.trim() || "draft-product");
      setPublishForm((prev) => target === "main"
        ? { ...prev, mainImage: result.url }
        : { ...prev, detailImages: [...prev.detailImages, result.url] }
      );
      setMessage("图片上传成功，已自动填入 URL。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "图片上传失败");
    } finally {
      setUploadingImage(null);
    }
  }

  async function handleSubmitProduct(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const tagPrice = Number(publishForm.tagPrice);
    const dailyRentalPrice = Number(publishForm.dailyRentalPrice);
    const depositAmount = Number(publishForm.depositAmount);
    const stock = Number(publishForm.stock);
    const selectedColors = Array.from(new Set((publishForm.selectedColors.length ? publishForm.selectedColors : [publishForm.color]).map((item) => item.trim()).filter(Boolean)));
    const selectedSizes = Array.from(new Set((publishForm.selectedSizes.length ? publishForm.selectedSizes : [publishForm.size]).map((item) => item.trim()).filter(Boolean)));
    const specs = (selectedColors.length ? selectedColors : ["默认色"]).flatMap((color) =>
      (selectedSizes.length ? selectedSizes : ["定制"]).map((size) => ({
        skuCode: publishForm.skuCode.trim() && selectedColors.length === 1 && selectedSizes.length === 1
          ? publishForm.skuCode.trim()
          : buildSkuCode(publishForm.name, color, size),
        color,
        size,
        stock
      }))
    );
    if (!publishForm.name.trim() || !publishForm.category.trim()) {
      setMessage("请填写商品名称和分类。SKU 编码可自动生成。");
      return;
    }
    if (![tagPrice, dailyRentalPrice, depositAmount, stock].every(Number.isFinite) || tagPrice <= 0 || dailyRentalPrice <= 0 || depositAmount < 40 || depositAmount > 300 || !Number.isInteger(stock) || stock < 1) {
      setMessage("请输入有效价格、押金和库存；押金需在 40-300 元之间，库存至少 1 件。");
      return;
    }
    setLoading(true);
    try {
      const product = await createProduct({
        name: publishForm.name.trim(),
        category: publishForm.category.trim(),
        style: publishForm.style.trim() || undefined,
        scenario: publishForm.scenario.trim() || undefined,
        tagPrice,
        dailyRentalPrice,
        depositAmount,
        tags: [publishForm.category.trim(), publishForm.style.trim() || "新品"].filter(Boolean),
        mainImage: publishForm.mainImage.trim() || undefined,
        videoUrl: publishForm.videoUrl.trim() || undefined,
        explanation: publishForm.explanation.trim() || undefined,
        detailImages: publishForm.detailImages,
        images: [],
        shippingMethods: publishForm.shippingMethods,
        specs
      });
      await createCategory(publishForm.category.trim()).catch(() => undefined);
      await fetchProducts(selectedCategory);
      await fetchMerchantData().catch(() => undefined);
      setCategories((prev) => Array.from(new Set([...prev, publishForm.category.trim()])));
      setShowPublishForm(false);
      setPublishStep(1);
      setPublishForm(emptyPublishForm);
      setMessage(`商品「${product.name}」已发布`);
      window.alert(`商品「${product.name}」已发布，共生成 ${specs.length} 个 SKU。`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : "发布商品失败";
      setMessage(errorMessage);
      window.alert(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddCategory() {
    const name = window.prompt("请输入新的商品分类名称，例如：亲子礼服");
    if (!name?.trim()) return;
    setLoading(true);
    try {
      const category = await createCategory(name.trim());
      setCategories((prev) => Array.from(new Set([...prev, category.name])));
      window.alert("商品分类已添加");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "商品分类添加失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateCoupon() {
    const minValue = window.prompt("请输入满减门槛，例如：满 399 元可用", "399");
    const minOrderAmount = Number(minValue ?? 0);
    if (!Number.isFinite(minOrderAmount) || minOrderAmount <= 0) {
      window.alert("请输入大于 0 的满减门槛");
      return;
    }
    const amountValue = window.prompt("请输入减免金额，例如：减 50 元", "50");
    const discountAmount = Number(amountValue ?? 0);
    if (!Number.isFinite(discountAmount) || discountAmount <= 0 || discountAmount >= minOrderAmount) {
      window.alert("请输入有效减免金额，且减免金额必须小于满减门槛");
      return;
    }
    const title = window.prompt("满减券名称，例如：满399减50", `满${minOrderAmount}减${discountAmount}`);
    if (!title?.trim()) return;
    const code = window.prompt("优惠码，例如：MJ39950", `MJ${minOrderAmount}${discountAmount}`);
    if (!code?.trim()) return;
    const usageLimitValue = window.prompt("发放张数限制，可留空表示不限量", "");
    const usageLimit = usageLimitValue?.trim() ? Number(usageLimitValue) : undefined;
    if (usageLimit != null && (!Number.isInteger(usageLimit) || usageLimit <= 0)) {
      window.alert("发放张数需为正整数，或留空表示不限量");
      return;
    }
    setLoading(true);
    try {
      const coupon = await createCoupon({
        title: title.trim(),
        code: code.trim(),
        discountAmount,
        minOrderAmount,
        usageLimit,
        enabled: true
      });
      setCoupons((prev) => [coupon, ...prev]);
      window.alert(`满${minOrderAmount}减${discountAmount}优惠券已创建`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "满减券创建失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleCoupon(coupon: Coupon) {
    setLoading(true);
    try {
      const updatedCoupon = await updateCouponStatus(coupon.id, !coupon.enabled);
      setCoupons((prev) => prev.map((item) => item.id === coupon.id ? updatedCoupon : item));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "优惠券状态更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleAddToCart(product: Product, specId?: string) {
    const targetSpecId = specId ?? product.specs.find((spec) => spec.stock > 0)?.id;
    if (!targetSpecId) {
      window.alert("当前商品暂无可加入购物车的规格");
      return;
    }
    setLoading(true);
    try {
      await addToCart(product.id, targetSpecId, 1);
      const nextCart = await listCart();
      setCartItems(nextCart);
      window.alert("已加入购物车");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "加入购物车失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleConsultProduct(product: Product) {
    setLoading(true);
    try {
      const conversation = await startChat({
        productId: product.id,
        initialMessage: `你好，我想咨询「${product.name}」的尺码、档期和租赁细节。`
      });
      await fetchChats();
      setActiveChatId(conversation.id);
      setChatOpen(true);
      setMessage("已打开聊天栏，可继续和商家沟通。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "发起咨询失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendChatMessage() {
    const content = chatInput.trim();
    if (!content || !activeChatId) return;
    setLoading(true);
    try {
      const conversation = await sendChatMessage(activeChatId, content);
      setChatConversations((prev) => {
        const others = prev.filter((item) => item.id !== conversation.id);
        return [conversation, ...others];
      });
      setActiveChatId(conversation.id);
      setChatInput("");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "消息发送失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleFavorite(product: Product) {
    const favorited = favoriteItems.some((item) => item.productId === product.id);
    setLoading(true);
    try {
      if (favorited) {
        await removeFavorite(product.id);
      } else {
        await addFavorite(product.id);
      }
      const nextFavorites = await listFavorites();
      setFavoriteItems(nextFavorites);
      window.alert(favorited ? "已取消收藏" : "已收藏");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "收藏操作失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleRemoveCartItem(id: string) {
    setLoading(true);
    try {
      await removeCartItem(id);
      setCartItems((prev) => prev.filter((item) => item.id !== id));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "移除购物车失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateTryOnSetting(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const feeRules = tryOnForm.feeRulesText.split("\n").map((line) => {
      const [style, quantity, fee] = line.split(",").map((item) => item.trim());
      return { style, quantity: Number(quantity), fee: Number(fee) };
    }).filter((rule) => rule.style && Number.isFinite(rule.quantity) && Number.isFinite(rule.fee));
    if (!feeRules.length) {
      window.alert("请至少填写一条有效试穿费用规则，格式：款式,数量,费用");
      return;
    }
    if (!tryOnForm.processNote.trim() || !tryOnForm.careNotice.trim()) {
      window.alert("请填写试穿流程说明和注意事项。");
      return;
    }
    setLoading(true);
    try {
      const updated = await updateTryOnSetting({
        enabled: tryOnForm.enabled,
        feeRules,
        processNote: tryOnForm.processNote.trim(),
        careNotice: tryOnForm.careNotice.trim()
      });
      setTryOnSetting(updated);
      setShowTryOnForm(false);
      window.alert("试穿服务设置已保存");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "试穿服务设置失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateReturnAddress(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!returnAddressForm.label.trim() || !returnAddressForm.receiver.trim() || !returnAddressForm.phone.trim() || !returnAddressForm.address.trim()) {
      window.alert("请完整填写寄回地址名称、收件人、电话和详细地址。");
      return;
    }
    setLoading(true);
    try {
      await createReturnAddress({
        label: returnAddressForm.label.trim(),
        receiver: returnAddressForm.receiver.trim(),
        phone: returnAddressForm.phone.trim(),
        address: returnAddressForm.address.trim(),
        isDefault: returnAddressForm.isDefault,
        enabled: true
      });
      setReturnAddresses(await listReturnAddresses(false));
      setReturnAddressForm({ label: "", receiver: "", phone: "", address: "", isDefault: false });
      setShowReturnAddressForm(false);
      window.alert("寄回地址已新增");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "新增寄回地址失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleReturnAddress(address: ReturnAddress) {
    setLoading(true);
    try {
      const updated = await updateReturnAddressStatus(address.id, !address.enabled);
      setReturnAddresses((prev) => prev.map((item) => item.id === updated.id ? updated : item));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "寄回地址状态更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetDefaultReturnAddress(address: ReturnAddress) {
    setLoading(true);
    try {
      await setDefaultReturnAddress(address.id);
      setReturnAddresses(await listReturnAddresses(false));
      window.alert("默认寄回地址已更新");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "设置默认地址失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleTryOnDecision(order: Order, decision: "RENT" | "NO_RENT") {
    setLoading(true);
    try {
      const updated = await decideTryOnOrder(order.id, decision);
      setSelectedOrder(updated);
      await fetchOrders();
      window.alert(decision === "RENT" ? "已记录确定租赁，收到寄回后退押金和试穿费用。" : "已记录不租赁，需当天寄回；收到后退租金押金，试穿费用不退。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "试穿结果处理失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleMarkOrderShipped(order: Order) {
    const logisticsCompany = window.prompt("请输入快递名称，例如：顺丰速运 / 中通快递 / 圆通速递", order.logisticsCompany ?? "顺丰速运");
    if (!logisticsCompany?.trim()) return;
    const logisticsTrackingNumber = window.prompt("请输入快递单号", order.logisticsTrackingNumber ?? "");
    if (!logisticsTrackingNumber?.trim()) return;
    setLoading(true);
    try {
      const updated = await markOrderShipped(order.id, logisticsCompany.trim(), logisticsTrackingNumber.trim());
      setSelectedOrder(updated);
      await fetchOrders();
      window.alert("已填写物流并确认发货，订单已进入租赁中。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "确认发货失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleRefreshLogistics(order: Order) {
    setLoading(true);
    try {
      const updated = await refreshOrderLogistics(order.id);
      setSelectedOrder(updated);
      await fetchOrders();
      window.alert("物流状态已刷新。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "物流刷新失败");
    } finally {
      setLoading(false);
    }
  }

  function renderInlineOrderDetail(order: Order, mode: "user" | "merchant") {
    return (
      <div className="order-inline-detail">
        <div className="section-title">
          <h3>{mode === "merchant" ? "后台订单详情" : "订单详情"}</h3>
          <button type="button" onClick={() => setSelectedOrder(null)}>收起</button>
        </div>
        <div className="order-inline-detail-grid">
          <div>
            <strong>{order.product?.name ?? order.productId}</strong>
            <p>订单号：{order.id}</p>
            <p>租赁日期：{order.startDate ?? order.rentStartDate?.slice(0, 10)} 至 {order.endDate ?? order.rentEndDate?.slice(0, 10)}</p>
            <p>规格：{order.spec?.color ?? "默认色"} / {order.spec?.size ?? "定制"} · SKU {order.spec?.skuCode ?? "未设置"}</p>
            <p>状态：{statusText[order.status] ?? order.status}</p>
            {order.settlementStatus === "SETTLING" && order.settlementDate && (
              <p>预计到账：{new Date(order.settlementDate).toLocaleDateString("zh-CN", { month: "long", day: "numeric" })}</p>
            )}
            {order.settlementStatus === "SETTLED" && <p>资金状态：已结算到账</p>}
            <p>发货方式：{order.shippingMethod === "EXPRESS" ? "快递发货" : "到店自提"}</p>
          </div>
          <div>
            {order.shippingMethod === "EXPRESS" && (
              <div className="address-full-card">
                <strong>完整收货地址</strong>
                <p>{order.shippingAddress || "未填写收货地址"}</p>
              </div>
            )}
            {order.shippingMethod === "EXPRESS" && (order.logisticsCompany || order.logisticsTrackingNumber) && (
              <div className="logistics-card">
                <div className="section-title">
                  <h3>物流追踪</h3>
                  <button type="button" disabled={loading} onClick={() => handleRefreshLogistics(order)}>刷新物流</button>
                </div>
                <p><strong>快递名称：</strong>{order.logisticsCompany ?? "未填写"}</p>
                <p><strong>快递单号：</strong>{order.logisticsTrackingNumber ?? "未填写"}</p>
                <p><strong>当前状态：</strong>{order.logisticsStatus ?? "待揽收"}</p>
                <div className="logistics-timeline">
                  {(order.logisticsHistory ?? []).map((item, index) => (
                    <div className="logistics-step" key={`${item.time}-${index}`}>
                      <span />
                      <div>
                        <strong>{item.status}</strong>
                        <p>{item.description}</p>
                        <small>{new Date(item.time).toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {order.orderType === "TRY_ON" && (
              <p>试穿服务：数量 {order.tryOnQuantity ?? 1} · 试穿费 {formatMoney(order.tryOnFee ?? 0)} · 结果 {order.tryOnDecision ?? "待确认"}</p>
            )}
            <p>费用明细：租金 {formatMoney(order.rentalFee)} · 押金 {formatMoney(order.deposit)} · 快递费 {formatMoney(order.expressFee ?? 0)} · 试穿费 {formatMoney(order.tryOnFee ?? 0)}</p>
            <strong>总价：{formatMoney(order.totalPrice ?? order.totalAmount)}</strong>
            {mode === "merchant" && order.status === "PENDING_SHIPMENT" && (
              <button type="button" className="primary-action-button" disabled={loading} onClick={() => handleMarkOrderShipped(order)}>
                填写快递并发货
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  async function handleInterceptShipment(order: Order) {
    const reason = window.prompt("请输入快递拦截原因", "用户申请快递拦截退回，快递退回后退款");
    if (!reason?.trim()) return;
    setLoading(true);
    try {
      const updated = await interceptShipment(order.id, reason.trim());
      setSelectedOrder(updated);
      await fetchOrders();
      window.alert(`快递已标记拦截退回，退款 ${formatMoney(updated.interceptRefund ?? updated.totalAmount)}。`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "快递拦截失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmitProductReview(order: Order) {
    const imagesValue = window.prompt("请粘贴至少一张上身实拍图 URL，多个用逗号分隔");
    const images = imagesValue?.split(",").map((item) => item.trim()).filter(Boolean) ?? [];
    if (!images.length) {
      window.alert("评价必须包含至少一张上身实拍图。");
      return;
    }
    const content = window.prompt("请填写评价内容，建议说明卫生、尺码、成色和上身效果");
    if (!content || content.trim().length < 6) {
      window.alert("评价内容至少 6 个字。");
      return;
    }
    const cleanlinessScore = Number(window.prompt("洁净程度评分 1-5", "5"));
    const sizeAccuracyScore = Number(window.prompt("尺码标准度评分 1-5", "5"));
    const matchScore = Number(window.prompt("实物相符度评分 1-5", "5"));
    const overallScore = Number(window.prompt("综合评分 1-5", "5"));
    if (![cleanlinessScore, sizeAccuracyScore, matchScore, overallScore].every((score) => Number.isInteger(score) && score >= 1 && score <= 5)) {
      window.alert("评分需为 1-5 的整数。");
      return;
    }
    setLoading(true);
    try {
      await createProductReview(order.id, { overallScore, cleanlinessScore, sizeAccuracyScore, matchScore, content: content.trim(), images });
      setMessage("评价已提交，商家审核通过后会公开展示。");
      await fetchOrders();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "评价提交失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleAuditReview(review: ProductReview, status: "APPROVED" | "REJECTED") {
    const reason = status === "REJECTED" ? window.prompt("请输入驳回原因或处理说明", "内容不符合平台规范") : undefined;
    setLoading(true);
    try {
      const updated = await auditProductReview(review.id, { status, reason: reason ?? undefined });
      setMerchantReviews((prev) => prev.map((item) => item.id === review.id ? updated : item));
      if (selectedProduct?.id === updated.productId) {
        setProductReviews(await listProductReviews(updated.productId));
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "评价审核失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleReplyReview(review: ProductReview) {
    const reply = window.prompt("请输入公开追评解释，例如：已加强消毒流程并复核尺码", review.merchantReply ?? "");
    if (!reply?.trim()) return;
    setLoading(true);
    try {
      const updated = await replyProductReview(review.id, reply.trim());
      setMerchantReviews((prev) => prev.map((item) => item.id === review.id ? updated : item));
      if (selectedProduct?.id === updated.productId) {
        setProductReviews(await listProductReviews(updated.productId));
      }
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "追评解释失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewTenant(order: Order) {
    const careScore = Number(window.prompt("请给租客爱惜衣物程度评分 1-5", "5"));
    if (!Number.isInteger(careScore) || careScore < 1 || careScore > 5) {
      window.alert("评分需为 1-5 的整数。");
      return;
    }
    const comment = window.prompt("可填写租客互评备注，例如：归还及时，衣物保存良好", "归还及时，衣物保存良好");
    setLoading(true);
    try {
      await createTenantReview(order.id, { careScore, comment: comment?.trim() || undefined });
      window.alert("租客互评已提交");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "租客互评失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleActivateAllProducts() {
    if (!window.confirm("确认上架全部商品吗？")) return;
    setLoading(true);
    try {
      const activeProducts = await activateAllProducts();
      setProducts(activeProducts);
      window.alert("全部商品已上架");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "一键上架失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWithdrawal() {
    const amountValue = window.prompt("请输入提现金额", String(wallet?.balance ?? 0));
    if (!amountValue) return;
    const amount = Number(amountValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      window.alert("请输入有效提现金额");
      return;
    }
    const minWithdrawalAmount = shopSetting?.minWithdrawalAmount ?? 100;
    if (amount < minWithdrawalAmount) {
      window.alert(`最低提现金额为 ${formatMoney(minWithdrawalAmount)}`);
      return;
    }
    const method = withdrawalMethods.find((item) => item.enabled && item.isDefault) ?? withdrawalMethods.find((item) => item.enabled);
    if (!method) {
      window.alert("请先绑定提现方式");
      return;
    }
    setLoading(true);
    try {
      const withdrawal = await createWithdrawal({ amount, methodId: method.id });
      setWithdrawals((prev) => [withdrawal, ...prev]);
      setWallet(await getMerchantWallet());
      setWalletTransactions(await listWalletTransactions());
      window.alert("提现申请已提交");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "提现申请失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateWithdrawalMethod() {
    const channelValue = window.prompt("提现渠道：BANK 银行卡 / ALIPAY 支付宝 / WECHAT 微信", "BANK")?.trim().toUpperCase();
    if (!channelValue || !["BANK", "ALIPAY", "WECHAT"].includes(channelValue)) return;
    const accountName = window.prompt(channelValue === "BANK" ? "请输入户名" : "请输入姓名", "商家");
    if (!accountName?.trim()) return;
    const accountNo = window.prompt(channelValue === "BANK" ? "请输入银行卡号" : channelValue === "ALIPAY" ? "请输入支付宝账号" : "请输入微信 OpenID / 收款码", "mock-account");
    if (!accountNo?.trim()) return;
    const bankName = channelValue === "BANK" ? window.prompt("请输入开户行", "招商银行") ?? "" : "";
    setLoading(true);
    try {
      const method = await createWithdrawalMethod({
        channel: channelValue as "BANK" | "ALIPAY" | "WECHAT",
        accountName: accountName.trim(),
        accountNo: accountNo.trim(),
        bankName: bankName.trim(),
        isDefault: !withdrawalMethods.length,
        enabled: true
      });
      setWithdrawalMethods((prev) => [method, ...prev]);
      window.alert("提现方式已绑定");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "绑定提现方式失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleReviewWithdrawal(withdrawal: Withdrawal, action: "approve" | "complete" | "reject") {
    setLoading(true);
    try {
      const updated = action === "approve"
        ? await approveWithdrawal(withdrawal.id)
        : action === "complete"
          ? await completeWithdrawal(withdrawal.id)
          : await rejectWithdrawal(withdrawal.id);
      setWithdrawals((prev) => prev.map((item) => item.id === updated.id ? updated : item));
      setWallet(await getMerchantWallet());
      setWalletTransactions(await listWalletTransactions());
      window.alert(action === "approve" ? "提现已审核通过" : action === "complete" ? "已确认打款" : "提现已驳回并解冻");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "提现处理失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateSettlementDays() {
    const value = window.prompt("请输入到账延迟天数，0 表示立即可结算", String(shopSetting?.settlementDays ?? 7));
    if (value == null) return;
    const settlementDays = Number(value);
    if (!Number.isInteger(settlementDays) || settlementDays < 0 || settlementDays > 60) {
      window.alert("到账延迟天数需为 0-60 的整数");
      return;
    }
    setLoading(true);
    try {
      const setting = await updateShopSetting({ settlementDays });
      setShopSetting(setting);
      window.alert(`到账规则已更新为 T+${settlementDays}`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "到账规则更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleRunSettlements() {
    setLoading(true);
    try {
      const settled = await runSettlements();
      await fetchOrders();
      await fetchMerchantData();
      window.alert(`已处理 ${settled.length} 笔到期结算`);
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "结算触发失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateMemberLevel() {
    const name = window.prompt("会员等级名称，例如：铂金会员");
    if (!name?.trim()) return;
    const minValue = window.prompt("累计消费门槛，例如：5000", "0");
    const minSpend = Number(minValue ?? 0);
    const discountValue = window.prompt("周期租金折扣百分比，例如：88 表示 88 折", "100");
    const discountPercent = Number(discountValue ?? 100);
    const benefitsValue = window.prompt("会员福利，多个福利用逗号分隔", "专属客服,优先预留档期");
    if (!Number.isFinite(minSpend) || minSpend < 0 || !Number.isFinite(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
      window.alert("请输入有效会员门槛和折扣");
      return;
    }
    setLoading(true);
    try {
      const level = await createMemberLevel({
        name: name.trim(),
        minSpend,
        discountPercent,
        benefits: benefitsValue?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
        enabled: true
      });
      setMemberLevels((prev) => [...prev, level]);
      window.alert("会员等级已创建");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "会员等级创建失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleToggleMemberLevel(level: MemberLevel) {
    setLoading(true);
    try {
      const updatedLevel = await updateMemberLevelStatus(level.id, !level.enabled);
      setMemberLevels((prev) => prev.map((item) => item.id === level.id ? updatedLevel : item));
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "会员等级状态更新失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (currentUser) {
      fetchProducts("");
      fetchChats().catch(() => undefined);
    }
  }, [currentUser]);

  useEffect(() => {
    if (!tryOnSetting) return;
    setTryOnForm({
      enabled: tryOnSetting.enabled,
      feeRulesText: tryOnSetting.feeRules.map((rule) => `${rule.style},${rule.quantity},${rule.fee}`).join("\n"),
      processNote: tryOnSetting.processNote,
      careNotice: tryOnSetting.careNotice
    });
  }, [tryOnSetting]);

  useEffect(() => {
    if (!currentUser) return;
    getMe()
      .then((user) => setCurrentUser(user))
      .catch(() => {
        clearAuth();
        setCurrentUser(null);
        setMessage("登录已过期，请重新登录。");
      });
  }, []);

  useEffect(() => {
    if (currentUser) {
      refreshSecurityData();
      getDeviceStatus().catch(() => undefined);
      if (currentUser.role === "ADMIN") refreshAdminData();
    }
  }, [currentUser?.id]);

  async function handleAuthSubmit() {
    setLoading(true);
    try {
      let result;
      if (authMode === "login") {
        const deviceId = window.localStorage.getItem("deviceId") || crypto.randomUUID();
        window.localStorage.setItem("deviceId", deviceId);
        const baseInput = {
          phone: authForm.phone,
          password: authForm.password,
          deviceId,
          deviceName: navigator.userAgent
        };
        try {
          result = await login(baseInput);
        } catch (error) {
          const message = error instanceof Error ? error.message : "";
          if (message.includes("陌生设备")) {
            const smsCode = window.prompt("请输入短信验证码（测试验证码 123456）") || "";
            try {
              result = await login({ ...baseInput, smsCode });
            } catch (nextError) {
              const nextMessage = nextError instanceof Error ? nextError.message : "";
              if (nextMessage.includes("TOTP") || nextMessage.includes("动态验证码")) {
                const totpCode = window.prompt("请输入身份验证器 6 位动态验证码") || "";
                result = await login({ ...baseInput, smsCode, totpCode });
              } else {
                throw nextError;
              }
            }
          } else if (message.includes("TOTP") || message.includes("动态验证码")) {
            const totpCode = window.prompt("请输入身份验证器 6 位动态验证码") || "";
            result = await login({ ...baseInput, totpCode });
          } else if (message.includes("已有设备")) {
            if (!window.confirm("已有设备在登录，是否继续？继续后旧设备将被下线。")) throw error;
            result = await login({ ...baseInput, forceLogin: true });
          } else {
            throw error;
          }
        }
      } else {
        result = await register(authForm);
      }
      saveAuth(result);
      setCurrentUser(result.user);
      if (result.user.role === "ADMIN") {
        setActiveTab("admin");
      }
      if (result.totpSetupRequired) {
        window.alert("建议立即绑定 TOTP 双重认证，可在账号安全中完成。");
      }
      setMessage("");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "登录失败，请稍后重试");
    } finally {
      setLoading(false);
    }
  }

  async function refreshSecurityData() {
    try {
      const [sessionData, logData] = await Promise.all([
        listSessions(),
        listLoginLogs()
      ]);
      setSessions(sessionData);
      setLoginLogs(logData);
    } catch {
      // 安全信息加载失败不影响主流程
    }
  }

  async function refreshAdminData() {
    if (currentUser?.role !== "ADMIN") return;
    try {
      const [users, allOrders, auditLogs, settings] = await Promise.all([
        listAdminUsers(),
        listAdminOrders(),
        listAdminAuditLogs(),
        getAdminSecuritySettings()
      ]);
      setAdminUsers(users);
      setAdminOrders(allOrders);
      setAdminAuditLogs(auditLogs);
      setAdminSecuritySettings(settings);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "管理员数据加载失败");
    }
  }

  async function handleToggleAdminUser(user: { id: string; disabled: boolean }) {
    setLoading(true);
    try {
      await updateAdminUserStatus(user.id, !user.disabled);
      await refreshAdminData();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "用户状态更新失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleResetAdminPassword(user: { id: string; phone: string }) {
    if (!window.confirm(`确认将 ${user.phone} 的密码重置为 Aa123456! 吗？`)) return;
    setLoading(true);
    try {
      const result = await resetAdminUserPassword(user.id);
      window.alert(`${result.message}，临时密码：${result.temporaryPassword}`);
      await refreshAdminData();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "重置密码失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleSetupTotp() {
    setLoading(true);
    try {
      const setup = await setupTotp();
      const token = window.prompt(`请用 Google Authenticator/Authy 扫码或手动输入密钥：${setup.secret}\n然后输入 6 位动态验证码完成绑定。`);
      if (!token) return;
      await verifyTotpSetup(token);
      window.alert("TOTP 双重认证已启用。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "TOTP 绑定失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleDisableTotp() {
    const token = window.prompt("请输入当前 TOTP 动态验证码");
    if (!token) return;
    const smsCode = window.prompt("请输入短信验证码（测试验证码 123456）");
    if (!smsCode) return;
    setLoading(true);
    try {
      await disableTotp({ token, smsCode });
      window.alert("TOTP 已解绑。");
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "TOTP 解绑失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleKickSession(session: UserSession) {
    if (!window.confirm(`确认下线设备「${session.deviceName}」吗？`)) return;
    setLoading(true);
    try {
      await logoutSession(session.id);
      await refreshSecurityData();
    } catch (error) {
      window.alert(error instanceof Error ? error.message : "下线设备失败");
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    await logoutCurrentSession().catch(() => undefined);
    clearAuth();
    setCurrentUser(null);
    setOrders([]);
    setProducts([]);
    setSelectedOrder(null);
    setSuccessOrder(null);
  }

  if (!currentUser) {
    return (
      <main className="app-shell auth-shell">
        <section className="auth-card">
          <p className="eyebrow">多金喜服装租赁</p>
          <h1>{authMode === "login" ? "登录账号" : "注册账号"}</h1>
          <p className="hero-copy">登录支持短信验证码、TOTP 双重认证和单设备保护。注册密码需包含大小写字母、数字和特殊字符。</p>
          {authMode === "register" && (
            <>
              <label>
                昵称
                <input value={authForm.name} onChange={(event) => setAuthForm({ ...authForm, name: event.target.value })} />
              </label>
              <p className="auth-hint">当前仅开放普通用户注册；商家与系统管理员账号由平台初始化创建。</p>
            </>
          )}
          <label>
            手机号
            <input value={authForm.phone} onChange={(event) => setAuthForm({ ...authForm, phone: event.target.value })} />
          </label>
          <label>
            密码
            <input type="password" value={authForm.password} onChange={(event) => setAuthForm({ ...authForm, password: event.target.value })} />
          </label>
          <button type="button" className="primary-action-button" disabled={loading} onClick={handleAuthSubmit}>
            {loading ? "处理中..." : authMode === "login" ? "登录" : "注册并登录"}
          </button>
          <button type="button" onClick={() => setAuthMode(authMode === "login" ? "register" : "login")}>
            {authMode === "login" ? "还没有账号？去注册" : "已有账号？去登录"}
          </button>
        </section>
      </main>
    );
  }

  if (successOrder) {
    return (
      <main className="app-shell success-shell">
        <section className="success-card">
          <div className="success-icon">✓</div>
          <h1>{successOrder.status === "RENTING" ? "支付成功" : "订单创建成功"}</h1>
          <p>{successOrder.status === "RENTING" ? "订单已进入租赁中，请按期归还。" : "请在待付款订单中继续完成支付流程。"}</p>
          <div className="success-info">
            <span>订单号 <strong>{successOrder.id}</strong></span>
            <span>订单状态 <strong>{statusText[successOrder.status] ?? successOrder.status}</strong></span>
            <span>费用明细 <strong>租金 {formatMoney(successOrder.rentalFee)} · 押金 {formatMoney(successOrder.deposit)} · 快递费 {formatMoney(successOrder.expressFee ?? 0)}{successOrder.orderType === "TRY_ON" ? ` · 试穿费 ${formatMoney(successOrder.tryOnFee ?? 0)}` : ""}</strong></span>
            <span>支付总价 <strong>{formatMoney(successOrder.totalPrice ?? successOrder.totalAmount)}</strong></span>
          </div>
          <div className="success-actions">
            {successOrder.status === "PENDING" && (
              <button type="button" onClick={() => handlePayOrder(successOrder.id)} disabled={loading}>
                {loading ? "支付中..." : `立即支付 ${formatMoney(successOrder.totalPrice ?? successOrder.totalAmount)}`}
              </button>
            )}
            <button type="button" onClick={() => switchTab("orders")}>查看我的订单</button>
            <button type="button" onClick={() => switchTab("products")}>继续逛逛</button>
          </div>
        </section>
        <ChatWidget
          currentUser={currentUser}
          open={chatOpen}
          conversations={chatConversations}
          activeConversation={activeChat}
          activeChatId={activeChatId}
          input={chatInput}
          loading={loading}
          onToggle={() => setChatOpen((prev) => !prev)}
          onSelect={setActiveChatId}
          onInput={setChatInput}
          onSend={handleSendChatMessage}
        />
        <ChatWidget
          currentUser={currentUser}
          open={chatOpen}
          conversations={chatConversations}
          activeConversation={activeChat}
          activeChatId={activeChatId}
          input={chatInput}
          loading={loading}
          onToggle={() => setChatOpen((prev) => !prev)}
          onSelect={setActiveChatId}
          onInput={setChatInput}
          onSend={handleSendChatMessage}
        />
        <BottomTabs activeTab={activeTab} onSwitch={switchTab} showMerchant={currentUser.role === "MERCHANT"} />
      </main>
    );
  }

  if (selectedProduct) {
    return (
      <main className={`app-shell detail-shell ${productTransition === "entering" ? "page-entering" : ""} ${productTransition === "leaving" ? "page-leaving" : ""}`}>
        <button type="button" className="back-button" onClick={closeDetail}>
          返回商品列表
        </button>

        <section className="detail-hero">
          <img src={selectedProduct.mainImage || normalizeImage(selectedProduct)} alt={selectedProduct.name} />
          <div className="detail-info">
            <span className="category-pill">{selectedProduct.category}</span>
            <h1>{selectedProduct.name}</h1>
            <p className="detail-subtitle">{selectedProduct.scenario ?? "多场合"} · {selectedProduct.style ?? "经典款"}</p>
            <div className="detail-price-grid">
              <span>吊牌价 <strong>{formatMoney(selectedProduct.tagPrice)}</strong></span>
              <span>周期租金 <strong>{formatMoney(selectedProduct.dailyRentalPrice)}</strong></span>
              <span>固定押金 <strong>{formatMoney(selectedProduct.depositAmount)}</strong></span>
            </div>
            <div className="tags">
              {selectedProduct.tags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="rental-care-grid">
              <span>成色：{selectedProduct.conditionLevel ?? "九成新及以上"}</span>
              <span>清洗：{selectedProduct.cleaningStandard ?? "一单一清洗，入库前消毒熨烫"}</span>
              <span>尺码：{selectedProduct.sizeAdvice ?? "建议结合身高、体重、胸围、腰围选择"}</span>
              <span>物流：{selectedProduct.shippingNote ?? "租赁周期不含路上运输时间"}</span>
            </div>
            <div className="shipping-method-badge">
              发货方式：{selectedProduct.shippingMethods?.includes("PICKUP") && "自提 "}{selectedProduct.shippingMethods?.includes("EXPRESS") && "快递 "}
            </div>
            <div className="quick-actions">
              <button type="button" onClick={() => handleToggleFavorite(selectedProduct)}>
                {favoriteItems.some((item) => item.productId === selectedProduct.id) ? "取消收藏" : "收藏商品"}
              </button>
              <button type="button" onClick={() => handleAddToCart(selectedProduct, selectedSpecId)}>
                加入购物车
              </button>
              <button type="button" onClick={() => handleConsultProduct(selectedProduct)}>
                咨询商家
              </button>
            </div>
          </div>
        </section>

        {(selectedProduct.videoUrl || selectedProduct.explanation) && (
          <section className="detail-card product-explanation-card">
            <div className="section-title">
              <h2>商品视频讲解</h2>
              <span>商家实物讲解，辅助判断版型、成色和上身效果</span>
            </div>
            {selectedProduct.videoUrl && (
              <video className="product-video" src={selectedProduct.videoUrl} controls poster={selectedProduct.mainImage || normalizeImage(selectedProduct)} />
            )}
            {selectedProduct.explanation && (
              <div className="explanation-content">
                {selectedProduct.explanation.split("\n").map((line, index) => (
                  <p key={index}>{line}</p>
                ))}
              </div>
            )}
          </section>
        )}

        {selectedProduct.detailImages.length > 0 && (
          <section className="detail-card detail-gallery">
            <div className="section-title"><h2>商品详情</h2></div>
            <div className="detail-images">
              {selectedProduct.detailImages.map((url, i) => (
                <img key={i} src={url} alt={`详情${i + 1}`} />
              ))}
            </div>
          </section>
        )}

        <section className="detail-card">
          <div className="section-title">
            <h2>选择规格</h2>
            <span>可租数量：{selectedSpec?.stock ?? 0}</span>
          </div>
          <div className="spec-grid">
            {selectedProduct.specs.map((spec) => (
              <button
                type="button"
                className={`spec-option ${selectedSpecId === spec.id ? "active" : ""} ${spec.stock <= 0 ? "disabled" : ""}`}
                key={spec.id}
                disabled={spec.stock <= 0}
                onClick={() => setSelectedSpecId(spec.id)}
              >
                <strong>{spec.color ?? "默认色"} / {spec.size ?? "定制"}</strong>
                <small>SKU：{spec.skuCode ?? "未设置"}</small>
                <span>{spec.stock > 0 ? `库存 ${spec.stock}` : "库存不足"}</span>
              </button>
            ))}
          </div>
        </section>

        <section className="detail-card">
          <div className="section-title">
            <h2>选择档期</h2>
            <span>一个周期 1-7 天，不含路上运输时间</span>
          </div>
          <div className="date-row">
            <label>
              起租日期
              <input
                min={todayString()}
                type="date"
                value={rentStartDate}
                onChange={(event) => handleStartDateChange(event.target.value)}
              />
            </label>
            <label>
              结束日期
              <input
                min={rentStartDate}
                max={rentStartDate ? addDays(rentStartDate, 6) : undefined}
                type="date"
                value={rentEndDate}
                onChange={(event) => handleEndDateChange(event.target.value)}
              />
            </label>
          </div>
          <div className="total-panel">
            <span>周期天数：{rentalDays > 0 ? rentalDays : 0} 天</span>
            <span>周期租金：{rentalDays > 0 ? formatMoney(selectedProduct.dailyRentalPrice) : "¥0"}</span>
            <span>押金：{formatMoney(selectedProduct.depositAmount)}</span>
            <span>快递费：{formatMoney(currentExpressFee)}</span>
            <span>试穿费：{formatMoney(currentTryOnFee)}</span>
            <strong>总价：{formatMoney(totalAmount)}</strong>
          </div>
          {rentalDays > 7 && <p className="message">租赁周期不能超过 7 天。</p>}
          {rentalDays < 1 && <p className="message">结束日期不能早于起租日期。</p>}
        </section>

        {tryOnSetting?.enabled && (
          <section className="detail-card">
            <div className="section-title">
              <h2>试穿服务</h2>
              <span>按衣服款式和数量自定义收取试穿费用</span>
            </div>
            <div className="shipping-method-options">
              <label className={`radio-label ${orderType === "RENTAL" ? "active" : ""}`}>
                <input type="radio" name="orderType" checked={orderType === "RENTAL"} onChange={() => setOrderType("RENTAL")} />
                <strong>直接租赁</strong>
                <span>按正常租赁流程下单</span>
              </label>
              <label className={`radio-label ${orderType === "TRY_ON" ? "active" : ""}`}>
                <input type="radio" name="orderType" checked={orderType === "TRY_ON"} onChange={() => setOrderType("TRY_ON")} />
                <strong>先试穿</strong>
                <span>试穿费 {formatMoney(currentTryOnFee)}</span>
              </label>
            </div>
            {orderType === "TRY_ON" && (
              <div className="try-on-panel">
                <label>
                  试穿数量
                  <input type="number" min="1" value={tryOnQuantity} onChange={(event) => setTryOnQuantity(Math.max(Number(event.target.value) || 1, 1))} />
                </label>
                <p><strong>流程：</strong>{tryOnSetting.processNote}</p>
                <p><strong>注意：</strong>{tryOnSetting.careNotice}</p>
                {returnAddresses.length > 0 && (
                  <p><strong>寄回地址：</strong>{returnAddresses[0].label} · {returnAddresses[0].receiver} · {returnAddresses[0].phone} · {returnAddresses[0].address}</p>
                )}
              </div>
            )}
          </section>
        )}

        <section className="detail-card">
          <div className="section-title"><h2>选择发货方式</h2></div>
          <div className="shipping-method-options">
            <label className={`radio-label ${shippingMethod === "PICKUP" ? "active" : ""}`}>
              <input type="radio" name="shipping" value="PICKUP" checked={shippingMethod === "PICKUP"} onChange={() => setShippingMethod("PICKUP")} />
              <strong>到店自提</strong>
              <span>免运费 · 需到店取货</span>
            </label>
            <label className={`radio-label ${shippingMethod === "EXPRESS" ? "active" : ""}`}>
              <input type="radio" name="shipping" value="EXPRESS" checked={shippingMethod === "EXPRESS"} onChange={() => setShippingMethod("EXPRESS")} />
              <strong>快递发货</strong>
              <span>非偏远地区包邮 · 偏远地区不包邮</span>
            </label>
          </div>
          {shippingMethod === "EXPRESS" && (
            <label className="address-input">
              收货地址
              <textarea rows={2} value={shippingAddress} onChange={(event) => setShippingAddress(event.target.value)} placeholder="请输入详细收货地址，包含省市区、街道、门牌号" />
              <small>
                {shippingAddress.trim()
                  ? currentExpressFee > 0
                    ? `该地址属于偏远地区，不包邮，快递费 ${formatMoney(currentExpressFee)}。`
                    : "该地址属于包邮地区，快递费 ¥0。"
                  : "偏远地区包含新疆、西藏、内蒙古、青海、宁夏、甘肃、海南、港澳台。"}
              </small>
            </label>
          )}
        </section>

        <section className="detail-card">
          <div className="section-title">
            <h2>租客实拍评价</h2>
            <span>审核后公开展示，重点看洁净、尺码、实物相符</span>
          </div>
          <div className="review-grid">
            {productReviews.map((review) => (
              <article className="review-card" key={review.id}>
                <div className="review-images">
                  {review.images.map((image) => <img src={image} alt="租客上身实拍" key={image} />)}
                </div>
                <strong>{review.user?.name ?? "租客"} · 综合 {review.overallScore}分</strong>
                <p>洁净 {review.cleanlinessScore} · 尺码 {review.sizeAccuracyScore} · 相符 {review.matchScore}</p>
                <p>{review.content}</p>
                {review.merchantReply && <blockquote>商家追评：{review.merchantReply}</blockquote>}
              </article>
            ))}
            {!productReviews.length && <p className="empty">暂无已展示评价，完成订单后可提交图文评价。</p>}
          </div>
        </section>

        <div className="bottom-rent-bar">
          <div>
            <span>直接租赁 {formatMoney(totalAmount)}</span>
            {tryOnSetting?.enabled ? (
              <strong>试穿支付 {formatMoney(directTryOnTotalAmount)}</strong>
            ) : (
              <strong>{formatMoney(totalAmount)}</strong>
            )}
            {tryOnSetting?.enabled && <small>试穿费已包含在试穿支付金额内</small>}
          </div>
          {tryOnSetting?.enabled && (
            <button type="button" className="try-on-action-button" onClick={() => handleRentNow("TRY_ON")} disabled={loading || !selectedSpec || selectedSpec.stock <= 0}>
              立即试穿 {formatMoney(directTryOnTotalAmount)}
            </button>
          )}
          <button type="button" onClick={() => handleRentNow("RENTAL")} disabled={loading || !selectedSpec || selectedSpec.stock <= 0}>
            {loading ? "创建订单中..." : `直接租赁 ${formatMoney(totalAmount)}`}
          </button>
          <button type="button" onClick={() => handleAddToCart(selectedProduct, selectedSpecId)} disabled={loading || !selectedSpec || selectedSpec.stock <= 0}>
            加购物车
          </button>
        </div>
        <ChatWidget
          currentUser={currentUser}
          open={chatOpen}
          conversations={chatConversations}
          activeConversation={activeChat}
          activeChatId={activeChatId}
          input={chatInput}
          loading={loading}
          onToggle={() => setChatOpen((prev) => !prev)}
          onSelect={setActiveChatId}
          onInput={setChatInput}
          onSend={handleSendChatMessage}
        />
      </main>
    );
  }

  if (activeTab === "orders") {
    return (
      <main className="app-shell orders-shell">
        <section className="home-hero order-hero">
          <p className="eyebrow">我的订单</p>
          <h1>查看租赁订单进度</h1>
          <p className="hero-copy">订单会按待付款、租赁中、待归还、已完成分组展示。</p>
        </section>

        {message && <p className="message">{message}</p>}

        {selectedOrder && (
          <section className="order-detail-panel legacy-order-detail-hidden">
            <div className="section-title">
              <h2>订单详情</h2>
              <button type="button" onClick={() => setSelectedOrder(null)}>关闭</button>
            </div>
            <div className="order-detail-content">
              <img
                src={selectedOrder.product ? normalizeImage(selectedOrder.product) : "https://placehold.co/300x300/F8E7E7/7C2D12?text=Order"}
                alt={selectedOrder.product?.name ?? "订单商品"}
              />
              <div>
                <h3>{selectedOrder.product?.name ?? selectedOrder.productId}</h3>
                <p>订单号：{selectedOrder.id}</p>
                <p>租赁日期：{selectedOrder.startDate ?? selectedOrder.rentStartDate?.slice(0, 10)} 至 {selectedOrder.endDate ?? selectedOrder.rentEndDate?.slice(0, 10)}</p>
                <p>规格：{selectedOrder.spec?.color ?? "默认色"} / {selectedOrder.spec?.size ?? "定制"}</p>
                <p>SKU：{selectedOrder.spec?.skuCode ?? "未设置"}</p>
                <p>发货方式：{selectedOrder.shippingMethod === "EXPRESS" ? "快递发货" : "到店自提"}{selectedOrder.shippingAddress ? ` · ${selectedOrder.shippingAddress}` : ""}</p>
                {selectedOrder.shippingMethod === "EXPRESS" && (
                  <p>快递费：{(selectedOrder.expressFee ?? 0) > 0 ? `${formatMoney(selectedOrder.expressFee ?? 0)}（偏远地区不包邮）` : "¥0（包邮）"}</p>
                )}
                {selectedOrder.orderType === "TRY_ON" && (
                  <>
                    <p>订单类型：试穿服务 · 数量 {selectedOrder.tryOnQuantity ?? 1} · 试穿费 {formatMoney(selectedOrder.tryOnFee ?? 0)}</p>
                    <p>试穿结果：{selectedOrder.tryOnDecision === "RENT" ? "确定租赁，收到寄回后退押金和试穿费" : selectedOrder.tryOnDecision === "NO_RENT" ? "不租赁，收到寄回后退租金押金，试穿费不退" : "待确认"}</p>
                  </>
                )}
                {selectedOrder.interceptStatus && (
                  <p>快递拦截：已退回退款，退款 {formatMoney(selectedOrder.interceptRefund ?? 0)}，原因：{selectedOrder.interceptReason}</p>
                )}
                <p>状态：{statusText[selectedOrder.status] ?? selectedOrder.status}</p>
                {selectedOrder.originalTotalAmount != null && (
                  <p>原价：{formatMoney(selectedOrder.originalTotalAmount)}，改价原因：{selectedOrder.priceAdjustmentReason ?? "拍后改价"}</p>
                )}
                {selectedOrder.shipmentDelayedUntil && (
                  <p>延期发货至：{selectedOrder.shipmentDelayedUntil.slice(0, 10)}，原因：{selectedOrder.shipmentDelayReason ?? "延期发货"}</p>
                )}
                {selectedOrder.extensionDays && (
                  <p>延期申请：{selectedOrder.extensionDays} 天，费用 {formatMoney(selectedOrder.extensionFee ?? 0)}</p>
                )}
                <p>费用明细：租金 {formatMoney(selectedOrder.rentalFee)} · 押金 {formatMoney(selectedOrder.deposit)} · 快递费 {formatMoney(selectedOrder.expressFee ?? 0)}{selectedOrder.orderType === "TRY_ON" ? ` · 试穿费 ${formatMoney(selectedOrder.tryOnFee ?? 0)}` : ""}</p>
                <strong>总价：{formatMoney(selectedOrder.totalPrice ?? selectedOrder.totalAmount)}</strong>
                <OrderActionButtons
                  order={selectedOrder}
                  role={currentUser.role}
                  loading={loading}
                  onPay={handlePayOrder}
                  onCancel={handleCancelOrder}
                  onReturn={handleRequestReturn}
                  onInspect={handleInspectOrder}
                  onOpenExtension={(order) => {
                    setExtensionOrder(order);
                    setExtensionDays(1);
                    setExtensionFee(order.product?.dailyRentalPrice ?? 0);
                    setExtensionType("NORMAL");
                    setExtensionProof("");
                  }}
                  onReviewExtension={handleReviewExtension}
                  onAdjustPrice={handleAdjustPrice}
                  onDelayShipment={handleDelayShipment}
                />
                {selectedOrder.orderType === "TRY_ON" && !selectedOrder.tryOnDecision && currentUser.role === "USER" && (
                  <div className="inline-actions">
                    <button type="button" disabled={loading} onClick={() => handleTryOnDecision(selectedOrder, "RENT")}>试穿后确定租</button>
                    <button type="button" disabled={loading} onClick={() => handleTryOnDecision(selectedOrder, "NO_RENT")}>试穿后不租</button>
                  </div>
                )}
                {currentUser.role === "MERCHANT" && selectedOrder.shippingMethod === "EXPRESS" && !selectedOrder.interceptStatus && !["COMPLETED", "CANCELED"].includes(selectedOrder.status) && (
                  <button type="button" className="danger-button" disabled={loading} onClick={() => handleInterceptShipment(selectedOrder)}>
                    快递拦截退回后退款
                  </button>
                )}
                {selectedOrder.status === "COMPLETED" && currentUser.role === "USER" && (
                  <button type="button" className="primary-action-button" disabled={loading} onClick={() => handleSubmitProductReview(selectedOrder)}>
                    发表图文评价
                  </button>
                )}
                {selectedOrder.status === "COMPLETED" && currentUser.role === "MERCHANT" && (
                  <button type="button" className="primary-action-button" disabled={loading} onClick={() => handleReviewTenant(selectedOrder)}>
                    给租客评分
                  </button>
                )}
              </div>
            </div>
          </section>
        )}

        <section className="order-groups">
          {orderGroups.map((group) => {
            const groupOrders = orders.filter((order) => group.statuses.includes(order.status));
            return (
              <div className="order-group" key={group.title}>
                <div className="section-title">
                  <h2>{group.title}</h2>
                  <span>{groupOrders.length} 单</span>
                </div>
                <div className="order-list">
                  {groupOrders.map((order) => (
                    <div className="order-inline-wrapper" key={order.id}>
                      <article
                        className={`order-item ${selectedOrder?.id === order.id ? "order-item-active" : ""}`}
                        role="button"
                        tabIndex={0}
                        onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                        onKeyDown={(event) => {
                          if (event.key === "Enter") setSelectedOrder(selectedOrder?.id === order.id ? null : order);
                        }}
                      >
                        <img
                          src={order.product ? normalizeImage(order.product) : "https://placehold.co/300x300/F8E7E7/7C2D12?text=Order"}
                          alt={order.product?.name ?? "订单商品"}
                        />
                        <div>
                          <h3>{order.product?.name ?? order.productId}</h3>
                          <p>{order.startDate ?? order.rentStartDate?.slice(0, 10)} 至 {order.endDate ?? order.rentEndDate?.slice(0, 10)}</p>
                          {daysUntil(order.endDate ?? order.rentEndDate?.slice(0, 10)) !== null && (
                            <p>距离归还还有 {Math.max(daysUntil(order.endDate ?? order.rentEndDate?.slice(0, 10)) ?? 0, 0)} 天</p>
                          )}
                          {order.orderType === "TRY_ON" && <p>含试穿费 {formatMoney(order.tryOnFee ?? 0)}</p>}
                          <strong>{formatMoney(order.totalPrice ?? order.totalAmount)}</strong>
                        </div>
                        <div className="order-side-actions">
                          <span className="status-tag">{statusText[order.status] ?? order.status}</span>
                          <button
                            type="button"
                            className="small-primary-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedOrder(selectedOrder?.id === order.id ? null : order);
                            }}
                          >
                            {selectedOrder?.id === order.id ? "收起订单详情" : "查看订单详情"}
                          </button>
                          {["PENDING", "PENDING_PAYMENT"].includes(order.status) && (
                          <button
                            type="button"
                            className="small-primary-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handlePayOrder(order.id);
                            }}
                          >
                            支付 {formatMoney(order.totalPrice ?? order.totalAmount)}
                          </button>
                        )}
                        {order.status === "RENTING" && (
                          <button
                            type="button"
                            className="small-primary-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleRequestReturn(order.id);
                            }}
                          >
                            归还
                          </button>
                        )}
                        {order.status === "RENTING" && (
                          <button
                            type="button"
                            className="small-primary-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setExtensionOrder(order);
                              setExtensionDays(1);
                              setExtensionFee(order.product?.dailyRentalPrice ?? 0);
                              setExtensionType("NORMAL");
                              setExtensionProof("");
                            }}
                          >
                            延期
                          </button>
                        )}
                        {currentUser.role === "MERCHANT" && ["PENDING_EXTENSION_REVIEW", "PENDING_EXTENSION"].includes(order.status) && (
                          <button
                            type="button"
                            className="small-primary-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleReviewExtension(order.id, true);
                            }}
                          >
                            通过
                          </button>
                        )}
                        {currentUser.role === "MERCHANT" && order.status === "PENDING_RETURN" && (
                          <button
                            type="button"
                            className="small-primary-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleInspectOrder(order.id, 0);
                            }}
                          >
                            验收
                          </button>
                        )}
                        {["PENDING", "PENDING_PAYMENT"].includes(order.status) && (
                          <button
                            type="button"
                            className="small-danger-button"
                            onClick={(event) => {
                              event.stopPropagation();
                              handleCancelOrder(order.id);
                            }}
                          >
                            取消
                          </button>
                          )}
                        </div>
                        {selectedOrder?.id === order.id && renderInlineOrderDetail(order, "user")}
                      </article>
                    </div>
                  ))}
                  {!groupOrders.length && <p className="empty">暂无{group.title}订单。</p>}
                </div>
              </div>
            );
          })}
        </section>

        {extensionOrder && (
          <ExtensionModal
            order={extensionOrder}
            extensionDays={extensionDays}
            extensionFee={extensionFee}
            extensionType={extensionType}
            extensionProof={extensionProof}
            loading={loading}
            onDaysChange={setExtensionDays}
            onFeeChange={setExtensionFee}
            onTypeChange={setExtensionType}
            onProofChange={setExtensionProof}
            onClose={() => setExtensionOrder(null)}
            onSubmit={handleSubmitExtension}
          />
        )}

        <ChatWidget
          currentUser={currentUser}
          open={chatOpen}
          conversations={chatConversations}
          activeConversation={activeChat}
          activeChatId={activeChatId}
          input={chatInput}
          loading={loading}
          onToggle={() => setChatOpen((prev) => !prev)}
          onSelect={setActiveChatId}
          onInput={setChatInput}
          onSend={handleSendChatMessage}
        />
        <BottomTabs activeTab={activeTab} onSwitch={switchTab} showMerchant={currentUser.role === "MERCHANT"} />
      </main>
    );
  }

  if (activeTab === "admin" && currentUser.role === "ADMIN") {
    return (
      <main className="merchant-admin-shell">
        <header className="merchant-admin-topbar">
          <div className="merchant-brand">
            <span className="merchant-logo">管</span>
            <div>
              <strong>系统管理员后台</strong>
              <small>用户、订单、安全配置和审计日志</small>
            </div>
          </div>
          <div className="merchant-topbar-actions">
            <button type="button" onClick={refreshAdminData} disabled={loading}>刷新</button>
            <button type="button" onClick={handleLogout}>退出</button>
          </div>
        </header>

        <section className="merchant-main-content">
          {message && <p className="message merchant-message">{message}</p>}
          <section className="order-detail-panel">
            <div className="section-title">
              <h2>用户管理</h2>
              <span>{adminUsers.length} 个账号</span>
            </div>
            <div className="mini-ranking">
              {adminUsers.map((user) => (
                <p key={user.id}>
                  {user.name} · {user.phone} · {user.role} · {user.totpEnabled ? "已启用2FA" : "未启用2FA"}
                  <span>
                    {user.disabled ? "已禁用" : "正常"}
                    <button type="button" disabled={loading || user.role === "ADMIN"} onClick={() => handleToggleAdminUser(user)}>{user.disabled ? "启用" : "禁用"}</button>
                    <button type="button" disabled={loading} onClick={() => handleResetAdminPassword(user)}>重置密码</button>
                  </span>
                </p>
              ))}
            </div>
          </section>

          <section className="order-detail-panel">
            <div className="section-title">
              <h2>全局订单</h2>
              <span>{adminOrders.length} 条最近订单</span>
            </div>
            <div className="mini-ranking">
              {adminOrders.slice(0, 20).map((order) => (
                <p key={order.id}>
                  {order.product?.name ?? order.productId} · {statusText[order.status] ?? order.status}
                  <span>{formatMoney(order.totalPrice ?? order.totalAmount)} · {order.id.slice(0, 8)}</span>
                </p>
              ))}
              {!adminOrders.length && <p>暂无订单<span>等待用户下单</span></p>}
            </div>
          </section>

          <section className="order-detail-panel">
            <div className="section-title">
              <h2>系统安全配置</h2>
              <span>当前策略</span>
            </div>
            <div className="overview-grid">
              <div><strong>{adminSecuritySettings?.totpRequired ? "开启" : "关闭"}</strong><span>TOTP 要求</span></div>
              <div><strong>{adminSecuritySettings?.singleDeviceLogin ? "开启" : "关闭"}</strong><span>单设备登录</span></div>
              <div><strong>{String(adminSecuritySettings?.passwordMinLength ?? 8)}-{String(adminSecuritySettings?.passwordMaxLength ?? 20)}</strong><span>密码长度</span></div>
              <div><strong>{String(adminSecuritySettings?.passwordHistoryLimit ?? 3)}</strong><span>历史密码限制</span></div>
            </div>
          </section>

          <section className="order-detail-panel">
            <div className="section-title">
              <h2>安全审计日志</h2>
              <span>{adminAuditLogs.length} 条</span>
            </div>
            <div className="mini-ranking">
              {adminAuditLogs.slice(0, 30).map((log) => (
                <p key={log.id}>
                  {log.phone} · {log.role ?? "UNKNOWN"} · {log.device ?? "未知设备"}
                  <span>{log.success ? "成功" : "失败"} · {log.reason ?? "无"} · {new Date(log.createdAt).toLocaleString()}</span>
                </p>
              ))}
            </div>
          </section>
        </section>

        <BottomTabs activeTab={activeTab} onSwitch={switchTab} showMerchant={false} showAdmin />
      </main>
    );
  }

  if (activeTab === "merchant" && currentUser.role === "MERCHANT") {
    return (
      <main className="merchant-admin-shell">
        <header className="merchant-admin-topbar">
          <div className="merchant-brand">
            <span className="merchant-logo">店</span>
            <div>
              <strong>商家后台</strong>
              <small>订单、商品、资金和售后管理</small>
            </div>
          </div>
          <div className="merchant-search">搜索功能/订单/商品/规则</div>
          <div className="merchant-top-links">
            <span>违规预警 0</span>
            <span>未读站内信 0</span>
            <span>{currentUser.name}</span>
          </div>
        </header>

        <div className="merchant-admin-layout">
          <aside className="merchant-sidebar">
            <a href="#merchant-workbench">售后工作台</a>
            <strong>发货管理</strong>
            <a href="#merchant-orders">订单查询</a>
            <a href="#merchant-aftersale">归还售后</a>
            <a href="#merchant-return">寄回地址</a>
            <a href="#merchant-tryon">试穿服务</a>
            <strong>商品管理</strong>
            <a href="#merchant-products">商品列表</a>
            <a href="#merchant-products">发布新商品</a>
            <a href="#merchant-reviews">评价管理</a>
            <strong>营销与资产</strong>
            <a href="#merchant-coupons">营销活动</a>
            <a href="#merchant-wallet">账户资金</a>
            <a href="#merchant-transactions">资金流水</a>
            <a href="#merchant-members">会员等级</a>
          </aside>

          <section className="merchant-main-content" id="merchant-workbench">
            <section className="merchant-workbench-hero">
              <div>
                <p className="eyebrow">Store Control Center</p>
                <h1>经营，一目了然。</h1>
                <p>以 Apple 官网式的清爽布局展示订单、商品、资金、售后与营销模块。</p>
              </div>
              <button type="button" onClick={handleEditAnnouncement}>编辑店铺公告</button>
            </section>

            <section className="merchant-task-grid">
              <a href="#merchant-orders">
                <span>待付款</span>
                <strong>{orders.filter((order) => ["PENDING", "PENDING_PAYMENT"].includes(order.status)).length}</strong>
                <small>催支付</small>
              </a>
              <a href="#merchant-orders">
                <span>待发货</span>
                <strong>{orders.filter((order) => order.status === "PENDING_SHIPMENT").length}</strong>
                <small>立即发货</small>
              </a>
              <a href="#merchant-orders">
                <span>租赁中</span>
                <strong>{orders.filter((order) => order.status === "RENTING").length}</strong>
                <small>查看物流/归还</small>
              </a>
              <a href="#merchant-reviews">
                <span>待审核评价</span>
                <strong>{merchantReviews.filter((review) => review.status === "PENDING").length}</strong>
                <small>立即处理</small>
              </a>
              <a href="#merchant-data">
                <span>访客数</span>
                <strong>{productOverview?.summary.visitorCount ?? 0}</strong>
                <small>收藏/加购/订单综合</small>
              </a>
              <a href="#merchant-wallet">
                <span>成交额</span>
                <strong>{formatMoney(productOverview?.summary.turnoverAmount ?? wallet?.totalIncome ?? 0)}</strong>
                <small>有效订单累计</small>
              </a>
            </section>

            {message && <p className="message merchant-message">{message}</p>}

        {announcement && (
          <section className="announcement-card">
            <div>
              <strong>{announcement.title}</strong>
              <p>{announcement.content}</p>
            </div>
            <button type="button" onClick={handleEditAnnouncement}>编辑公告</button>
          </section>
        )}

        <section className="order-detail-panel" id="merchant-tryon">
          <div className="section-title">
            <h2>试穿服务设置</h2>
            <button type="button" disabled={loading} onClick={() => setShowTryOnForm((prev) => !prev)}>
              {showTryOnForm ? "收起编辑" : "编辑试穿规则"}
            </button>
          </div>
          {showTryOnForm && (
            <form className="inline-form" onSubmit={handleUpdateTryOnSetting}>
              <label className="checkbox-label">
                <input type="checkbox" checked={tryOnForm.enabled} onChange={(event) => setTryOnForm((prev) => ({ ...prev, enabled: event.target.checked }))} />
                开启试穿服务
              </label>
              <label>
                试穿费用规则（每行：款式,数量,费用）
                <textarea rows={5} value={tryOnForm.feeRulesText} onChange={(event) => setTryOnForm((prev) => ({ ...prev, feeRulesText: event.target.value }))} />
              </label>
              <label>
                试穿流程说明
                <textarea rows={3} value={tryOnForm.processNote} onChange={(event) => setTryOnForm((prev) => ({ ...prev, processNote: event.target.value }))} />
              </label>
              <label>
                试穿注意事项
                <textarea rows={3} value={tryOnForm.careNotice} onChange={(event) => setTryOnForm((prev) => ({ ...prev, careNotice: event.target.value }))} />
              </label>
              <div className="inline-actions">
                <button className="primary-action-button" type="submit" disabled={loading}>{loading ? "保存中..." : "保存试穿设置"}</button>
                <button type="button" disabled={loading} onClick={() => setShowTryOnForm(false)}>取消</button>
              </div>
            </form>
          )}
          <div className="try-on-panel">
            <p><strong>状态：</strong>{tryOnSetting?.enabled ? "已开启" : "未开启"}</p>
            <p><strong>费用规则：</strong>{tryOnSetting?.feeRules.map((rule) => `${rule.style} ${rule.quantity}件 ${formatMoney(rule.fee)}`).join(" / ") || "未设置，默认按 30 元/件"}</p>
            <p><strong>流程：</strong>{tryOnSetting?.processNote}</p>
            <p><strong>注意：</strong>{tryOnSetting?.careNotice}</p>
          </div>
        </section>

        <section className="order-detail-panel" id="merchant-return">
          <div className="section-title">
            <h2>寄回地址管理</h2>
            <button type="button" disabled={loading} onClick={() => setShowReturnAddressForm((prev) => !prev)}>
              {showReturnAddressForm ? "收起新增" : "新增寄回地址"}
            </button>
          </div>
          {showReturnAddressForm && (
            <form className="inline-form" onSubmit={handleCreateReturnAddress}>
              <div className="form-grid">
                <label>
                  地址名称
                  <input value={returnAddressForm.label} onChange={(event) => setReturnAddressForm((prev) => ({ ...prev, label: event.target.value }))} placeholder="上海总仓" />
                </label>
                <label>
                  收件人
                  <input value={returnAddressForm.receiver} onChange={(event) => setReturnAddressForm((prev) => ({ ...prev, receiver: event.target.value }))} placeholder="商家售后" />
                </label>
                <label>
                  联系电话
                  <input value={returnAddressForm.phone} onChange={(event) => setReturnAddressForm((prev) => ({ ...prev, phone: event.target.value }))} placeholder="13900000000" />
                </label>
                <label>
                  详细地址
                  <input value={returnAddressForm.address} onChange={(event) => setReturnAddressForm((prev) => ({ ...prev, address: event.target.value }))} placeholder="上海市徐汇区试穿回寄中心 1 号" />
                </label>
              </div>
              <label className="checkbox-label">
                <input type="checkbox" checked={returnAddressForm.isDefault} onChange={(event) => setReturnAddressForm((prev) => ({ ...prev, isDefault: event.target.checked }))} />
                设为默认寄回地址
              </label>
              <div className="inline-actions">
                <button className="primary-action-button" type="submit" disabled={loading}>{loading ? "保存中..." : "保存寄回地址"}</button>
                <button type="button" disabled={loading} onClick={() => setShowReturnAddressForm(false)}>取消</button>
              </div>
            </form>
          )}
          <div className="coupon-grid">
            {returnAddresses.map((address) => (
              <article className="coupon-card" key={address.id}>
                <div>
                  <strong>{address.label}{address.isDefault ? " · 默认" : ""}</strong>
                  <p>{address.receiver} · {address.phone}</p>
                  <span>{address.address}</span>
                </div>
                <div className="inline-actions">
                  {!address.isDefault && (
                    <button type="button" disabled={loading} onClick={() => handleSetDefaultReturnAddress(address)}>设为默认</button>
                  )}
                  <button type="button" disabled={loading} onClick={() => handleToggleReturnAddress(address)}>
                    {address.enabled ? "停用" : "启用"}
                  </button>
                </div>
              </article>
            ))}
            {!returnAddresses.length && <p className="empty">暂无寄回地址，请先新增至少一个寄回地址。</p>}
          </div>
        </section>

        <section className="order-detail-panel" id="merchant-wallet">
          <div className="section-title">
            <h2>账户资金</h2>
            <div className="section-actions">
              <button type="button" disabled={loading} onClick={handleUpdateSettlementDays}>到账 T+{shopSetting?.settlementDays ?? 7}</button>
              <button type="button" disabled={loading} onClick={handleRunSettlements}>手动触发结算</button>
              <button type="button" disabled={loading} onClick={handleCreateWithdrawalMethod}>绑定提现方式</button>
              <button type="button" disabled={loading || (wallet?.balance ?? 0) <= 0} onClick={handleCreateWithdrawal}>申请提现</button>
            </div>
          </div>
          <div className="overview-grid">
            <div><strong>{formatMoney(wallet?.balance ?? 0)}</strong><span>可用余额</span></div>
            <div><strong>{formatMoney(wallet?.frozen ?? 0)}</strong><span>提现冻结</span></div>
            <div><strong>{formatMoney(wallet?.totalIncome ?? 0)}</strong><span>累计收入</span></div>
            <div><strong>{formatMoney(shopSetting?.minWithdrawalAmount ?? 100)}</strong><span>最低提现</span></div>
            <div><strong>{shopSetting?.withdrawalFeePercent ?? 0}% + {formatMoney(shopSetting?.withdrawalFeeFixed ?? 0)}</strong><span>提现手续费</span></div>
          </div>
          <div className="mini-ranking">
            <h3>提现方式</h3>
            {withdrawalMethods.map((method) => (
              <p key={method.id}>
                {method.channel === "BANK" ? `银行卡 · ${method.bankName ?? "未填开户行"}` : method.channel === "ALIPAY" ? "支付宝" : "微信"}
                <span>{method.accountName} · {method.accountNo}{method.isDefault ? " · 默认" : ""}</span>
              </p>
            ))}
            {!withdrawalMethods.length && <p>暂无提现方式<span>请先绑定</span></p>}
          </div>
          <div className="mini-ranking">
            <h3>提现记录</h3>
            {withdrawals.slice(0, 5).map((withdrawal) => (
              <p key={withdrawal.id}>
                {withdrawal.channel === "BANK" ? "银行卡" : withdrawal.channel === "ALIPAY" ? "支付宝" : "微信"} · {withdrawal.accountName} · {withdrawalStatusText(withdrawal.status)}
                <span>
                  {formatMoney(withdrawal.amount)}
                  {withdrawal.status === "PENDING" && <button type="button" disabled={loading} onClick={() => handleReviewWithdrawal(withdrawal, "approve")}>通过</button>}
                  {withdrawal.status === "APPROVED" && <button type="button" disabled={loading} onClick={() => handleReviewWithdrawal(withdrawal, "complete")}>确认打款</button>}
                  {["PENDING", "APPROVED"].includes(withdrawal.status) && <button type="button" disabled={loading} onClick={() => handleReviewWithdrawal(withdrawal, "reject")}>驳回</button>}
                </span>
              </p>
            ))}
            {!withdrawals.length && <p>暂无提现记录<span>可申请</span></p>}
          </div>
          <div className="mini-ranking" id="merchant-transactions">
            <h3>资金流水</h3>
            {walletTransactions.slice(0, 8).map((transaction) => (
              <p key={transaction.id}>
                {transaction.type === "ORDER_INCOME" ? "订单收入" : transaction.type === "DEPOSIT_REFUND" ? "押金退还" : transaction.type === "WITHDRAWAL_DEDUCT" ? "提现扣减" : transaction.type === "WITHDRAWAL_REJECT_RELEASE" ? "提现驳回解冻" : transaction.type}
                <span>{formatMoney(transaction.amount)} · {formatMoney(transaction.balanceBefore)} → {formatMoney(transaction.balanceAfter)}</span>
              </p>
            ))}
            {!walletTransactions.length && <p>暂无资金流水<span>待结算</span></p>}
          </div>
        </section>

        {productOverview && (
          <section className="order-detail-panel" id="merchant-data">
            <div className="section-title">
              <h2>商品数据概况</h2>
              <span>实时统计</span>
            </div>
            <div className="overview-grid">
              <div><strong>{productOverview.summary.totalProducts}</strong><span>商品总数</span></div>
              <div><strong>{productOverview.summary.activeProducts}</strong><span>上架商品</span></div>
              <div><strong>{productOverview.summary.totalStock}</strong><span>规格库存</span></div>
              <div><strong>{productOverview.summary.totalOrders}</strong><span>订单总数</span></div>
              <div><strong>{productOverview.summary.rentingOrders}</strong><span>租赁中</span></div>
              <div><strong>{productOverview.summary.completedOrders}</strong><span>已完成</span></div>
              <div><strong>{productOverview.summary.visitorCount ?? 0}</strong><span>访客数</span></div>
              <div><strong>{formatMoney(productOverview.summary.turnoverAmount ?? 0)}</strong><span>成交额</span></div>
              <div><strong>{productOverview.summary.pendingReturnOrders ?? 0}</strong><span>待归还</span></div>
              <div><strong>{productOverview.summary.pendingInspectionOrders ?? 0}</strong><span>待验收</span></div>
            </div>
            <div className="mini-ranking">
              <h3>商品租赁销量</h3>
              {productOverview.topProducts.map((product) => (
                <p key={product.id}>{product.name}<span>{product.salesCount} 单</span></p>
              ))}
            </div>
            <div className="mini-ranking">
              <h3>收藏加购数据分析</h3>
              {productOverview.engagementProducts.map((product) => (
                <p key={product.id}>
                  {product.name}
                  <span>收藏 {product.favoriteCount} · 加购 {product.cartCount} · 租赁 {product.salesCount}</span>
                </p>
              ))}
              {!productOverview.engagementProducts.length && <p>暂无收藏和加购数据<span>待积累</span></p>}
            </div>
          </section>
        )}

        <section className="order-detail-panel" id="merchant-coupons">
          <div className="section-title">
            <h2>满减券设置</h2>
            <button type="button" disabled={loading} onClick={handleCreateCoupon}>新增满减券</button>
          </div>
          <div className="coupon-grid">
            {coupons.map((coupon) => (
              <article className="coupon-card" key={coupon.id}>
                <div>
                  <strong>{coupon.title}</strong>
                  <p>{coupon.code} · {coupon.usageLimit ? `限 ${coupon.usageLimit} 张` : "不限量"}</p>
                  <span>满 {formatMoney(coupon.minOrderAmount)} 减 {formatMoney(coupon.discountAmount ?? 0)}</span>
                </div>
                <button type="button" disabled={loading} onClick={() => handleToggleCoupon(coupon)}>
                  {coupon.enabled ? "停用" : "启用"}
                </button>
              </article>
            ))}
            {!coupons.length && <p className="empty">暂无满减券，可点击新增满减券创建。</p>}
          </div>
        </section>

        <section className="order-detail-panel aftersale-panel" id="merchant-aftersale">
          <div className="section-title">
            <h2>归还售后</h2>
            <span>待归还 {orders.filter((order) => order.status === "PENDING_RETURN").length} · 待验收 {orders.filter((order) => order.status === "PENDING_INSPECTION").length}</span>
          </div>
          <div className="aftersale-summary-grid">
            <div>
              <strong>{orders.filter((order) => order.status === "PENDING_RETURN").length}</strong>
              <span>租客已申请归还</span>
            </div>
            <div>
              <strong>{orders.filter((order) => order.status === "PENDING_INSPECTION").length}</strong>
              <span>待商家验收</span>
            </div>
            <div>
              <strong>{orders.filter((order) => order.status === "RETURNED").length}</strong>
              <span>已归还待完成</span>
            </div>
            <div>
              <strong>{orders.filter((order) => order.status === "COMPLETED").length}</strong>
              <span>售后已完成</span>
            </div>
          </div>
          <div className="aftersale-board">
            {["PENDING_RETURN", "PENDING_INSPECTION", "RETURNED"].map((status) => {
              const items = orders.filter((order) => order.status === status);
              return (
                <div className="aftersale-column" key={status}>
                  <h3>{statusText[status] ?? status}<span>{items.length}</span></h3>
                  {items.slice(0, 6).map((order) => (
                    <article className="aftersale-card" key={order.id}>
                      <strong>{order.product?.name ?? order.productId}</strong>
                      <p>{order.startDate ?? order.rentStartDate?.slice(0, 10)} 至 {order.endDate ?? order.rentEndDate?.slice(0, 10)}</p>
                      <p>租客：{order.userId.slice(0, 8)} · 金额 {formatMoney(order.totalPrice ?? order.totalAmount)}</p>
                      {order.shippingMethod === "EXPRESS" && <p>物流：{order.logisticsCompany ?? "未填写"} {order.logisticsTrackingNumber ?? ""}</p>}
                      <div className="inline-actions">
                        {order.status === "PENDING_RETURN" && (
                          <button type="button" disabled={loading} onClick={() => handleInspectOrder(order.id, 0)}>确认收到并验收</button>
                        )}
                        <button type="button" onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}>
                          {selectedOrder?.id === order.id ? "收起详情" : "查看详情"}
                        </button>
                      </div>
                      {selectedOrder?.id === order.id && renderInlineOrderDetail(order, "merchant")}
                    </article>
                  ))}
                  {!items.length && <p className="empty">暂无{statusText[status] ?? status}订单。</p>}
                </div>
              );
            })}
          </div>
        </section>

        <section className="order-detail-panel" id="merchant-orders">
          <div className="section-title">
            <h2>全部订单</h2>
            <span>{orders.length} 单</span>
          </div>
          <div className="order-list">
            {orders.map((order) => (
              <div className="order-inline-wrapper" key={order.id}>
                <article
                  className={`order-item ${selectedOrder?.id === order.id ? "order-item-active" : ""}`}
                  role="button"
                  tabIndex={0}
                  onClick={() => setSelectedOrder(selectedOrder?.id === order.id ? null : order)}
                >
                  <img
                    src={order.product ? normalizeImage(order.product) : "https://placehold.co/300x300/F8E7E7/7C2D12?text=Order"}
                    alt={order.product?.name ?? "订单商品"}
                  />
                  <div>
                    <h3>{order.product?.name ?? order.productId}</h3>
                    <p>{order.startDate ?? order.rentStartDate?.slice(0, 10)} 至 {order.endDate ?? order.rentEndDate?.slice(0, 10)}</p>
                    {order.orderType === "TRY_ON" && <p>试穿订单 · 试穿费 {formatMoney(order.tryOnFee ?? 0)}</p>}
                    {order.shippingMethod === "EXPRESS" && <p>快递地址：{order.shippingAddress || "未填写"}</p>}
                    <strong>{formatMoney(order.totalPrice ?? order.totalAmount)}</strong>
                  </div>
                  <div className="order-side-actions">
                    <span className="status-tag">{statusText[order.status] ?? order.status}</span>
                    {order.status === "PENDING_SHIPMENT" && (
                      <button
                        type="button"
                        className="small-primary-button"
                        disabled={loading}
                        onClick={(event) => {
                          event.stopPropagation();
                          handleMarkOrderShipped(order);
                        }}
                      >
                        发货
                      </button>
                    )}
                    <button
                      type="button"
                      className="small-primary-button"
                      onClick={(event) => {
                        event.stopPropagation();
                        setSelectedOrder(selectedOrder?.id === order.id ? null : order);
                      }}
                    >
                      {selectedOrder?.id === order.id ? "收起订单详情" : "查看订单详情"}
                    </button>
                  </div>
                  {selectedOrder?.id === order.id && renderInlineOrderDetail(order, "merchant")}
                </article>
              </div>
            ))}
          </div>
        </section>

        <section className="order-detail-panel" id="merchant-reviews">
          <div className="section-title">
            <h2>评价管理</h2>
            <span>{merchantReviews.filter((review) => review.status === "PENDING").length} 条待审核</span>
          </div>
          <div className="review-admin-list">
            {merchantReviews.map((review) => (
              <article className="review-admin-card" key={review.id}>
                <div>
                  <strong>{review.product?.name ?? review.productId} · {reviewStatusText(review.status)}</strong>
                  <p>{review.user?.name ?? "租客"} · 综合 {review.overallScore} · 洁净 {review.cleanlinessScore} · 尺码 {review.sizeAccuracyScore} · 相符 {review.matchScore}</p>
                  <p>{review.content}</p>
                  <div className="review-images">
                    {review.images.map((image) => <img src={image} alt="租客上身实拍" key={image} />)}
                  </div>
                  {review.merchantReply && <blockquote>商家公开追评：{review.merchantReply}</blockquote>}
                </div>
                <div className="review-admin-actions">
                  {review.status === "PENDING" && (
                    <>
                      <button type="button" disabled={loading} onClick={() => handleAuditReview(review, "APPROVED")}>审核通过</button>
                      <button type="button" className="danger-button" disabled={loading} onClick={() => handleAuditReview(review, "REJECTED")}>驳回</button>
                    </>
                  )}
                  <button type="button" disabled={loading} onClick={() => handleReplyReview(review)}>公开追评解释</button>
                </div>
              </article>
            ))}
            {!merchantReviews.length && <p className="empty">暂无评价，用户完成订单后可提交图文评价。</p>}
          </div>
        </section>

        {selectedOrder && (
          <section className="order-detail-panel merchant-order-modal legacy-order-detail-hidden">
            <div className="section-title">
              <h2>后台订单操作</h2>
              <button type="button" onClick={() => setSelectedOrder(null)}>关闭</button>
            </div>
            <p>订单号：{selectedOrder.id}</p>
            <p>商品：{selectedOrder.product?.name ?? selectedOrder.productId}</p>
            <p>规格：{selectedOrder.spec?.color ?? "默认色"} / {selectedOrder.spec?.size ?? "定制"} · SKU {selectedOrder.spec?.skuCode ?? "未设置"}</p>
            <p>租赁日期：{selectedOrder.startDate ?? selectedOrder.rentStartDate?.slice(0, 10)} 至 {selectedOrder.endDate ?? selectedOrder.rentEndDate?.slice(0, 10)}</p>
            <p>状态：{statusText[selectedOrder.status] ?? selectedOrder.status}</p>
            <p>发货方式：{selectedOrder.shippingMethod === "EXPRESS" ? "快递发货" : "到店自提"}</p>
            {selectedOrder.shippingMethod === "EXPRESS" && (
              <div className="address-full-card">
                <strong>完整收货地址</strong>
                <p>{selectedOrder.shippingAddress || "未填写收货地址"}</p>
              </div>
            )}
            {selectedOrder.orderType === "TRY_ON" && (
              <p>试穿订单：数量 {selectedOrder.tryOnQuantity ?? 1} · 试穿费 {formatMoney(selectedOrder.tryOnFee ?? 0)} · 结果 {selectedOrder.tryOnDecision ?? "待确认"}</p>
            )}
            <p>费用明细：租金 {formatMoney(selectedOrder.rentalFee)} · 押金 {formatMoney(selectedOrder.deposit)} · 快递费 {formatMoney(selectedOrder.expressFee ?? 0)} · 试穿费 {formatMoney(selectedOrder.tryOnFee ?? 0)}</p>
            <p>总价：{formatMoney(selectedOrder.totalPrice ?? selectedOrder.totalAmount)}</p>
            {selectedOrder.status === "PENDING_SHIPMENT" && (
              <button type="button" className="primary-action-button" disabled={loading} onClick={() => handleMarkOrderShipped(selectedOrder)}>
                确认发货
              </button>
            )}
            <OrderActionButtons
              order={selectedOrder}
              role={currentUser.role}
              loading={loading}
              onPay={handlePayOrder}
              onCancel={handleCancelOrder}
              onReturn={handleRequestReturn}
              onInspect={handleInspectOrder}
              onOpenExtension={(order) => {
                setExtensionOrder(order);
                setExtensionDays(1);
                setExtensionFee(order.product?.dailyRentalPrice ?? 0);
                setExtensionType("NORMAL");
                setExtensionProof("");
              }}
              onReviewExtension={handleReviewExtension}
              onAdjustPrice={handleAdjustPrice}
              onDelayShipment={handleDelayShipment}
            />
            {selectedOrder.status === "COMPLETED" && (
              <button type="button" className="primary-action-button" disabled={loading} onClick={() => handleReviewTenant(selectedOrder)}>
                给租客爱惜衣物评分
              </button>
            )}
          </section>
        )}

        <section className="order-detail-panel" id="merchant-members">
          <div className="section-title">
            <h2>会员等级制度</h2>
            <button type="button" disabled={loading} onClick={handleCreateMemberLevel}>新增等级</button>
          </div>
          <div className="coupon-grid">
            {memberLevels.map((level) => {
              const benefits = parseBenefits(level.benefits);
              return (
                <article className="coupon-card" key={level.id}>
                  <div>
                    <strong>{level.name}</strong>
                    <p>累计消费满 {formatMoney(level.minSpend)} · {formatDiscount(level.discountPercent)}</p>
                    <span>{benefits.join(" / ") || "暂无福利说明"}</span>
                  </div>
                  <button type="button" disabled={loading} onClick={() => handleToggleMemberLevel(level)}>
                    {level.enabled ? "停用" : "启用"}
                  </button>
                </article>
              );
            })}
          </div>
        </section>

        <section className="order-detail-panel" id="merchant-products">
          <div className="section-title">
            <h2>商品与库存</h2>
            <div className="section-actions">
              <button type="button" disabled={loading} onClick={handleCreateProduct}>发布商品</button>
              <button type="button" disabled={loading} onClick={handleActivateAllProducts}>上架全部商品</button>
              <button type="button" disabled={loading} onClick={handleAddCategory}>添加分类</button>
            </div>
          </div>
          <div className="category-manager">
            {categories.map((category) => <span key={category}>{category}</span>)}
          </div>
          {showPublishForm && (
            <form className="publish-product-form" onSubmit={handleSubmitProduct}>
              <div className="section-title">
                <h3>发布商品 · 步骤 {publishStep}/5</h3>
                <button type="button" onClick={() => { setShowPublishForm(false); setPublishStep(1); }}>取消</button>
              </div>
              {publishStep === 1 && (
                <div className="form-step">
                  <h4>步骤1：上传主图</h4>
                  <label>
                    商品主图 URL
                    <input value={publishForm.mainImage} onChange={(event) => setPublishForm((prev) => ({ ...prev, mainImage: event.target.value }))} placeholder="https://example.com/main.jpg" />
                  </label>
                  <label className="file-upload-field">
                    从电脑选择主图
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      disabled={uploadingImage === "main"}
                      onChange={(event) => {
                        handleUploadProductImage(event.target.files?.[0], "main");
                        event.currentTarget.value = "";
                      }}
                    />
                    <span>{uploadingImage === "main" ? "主图上传中..." : "支持 jpg / png / webp，单张不超过 5MB"}</span>
                  </label>
                  {publishForm.mainImage && <img src={publishForm.mainImage} alt="主图预览" className="image-preview" />}
                  <label>
                    商品讲解视频 URL
                    <input value={publishForm.videoUrl} onChange={(event) => setPublishForm((prev) => ({ ...prev, videoUrl: event.target.value }))} placeholder="https://example.com/product-video.mp4" />
                  </label>
                  {publishForm.videoUrl && (
                    <video className="video-preview" src={publishForm.videoUrl} controls muted />
                  )}
                  <label>
                    商品讲解文案
                    <textarea rows={4} value={publishForm.explanation} onChange={(event) => setPublishForm((prev) => ({ ...prev, explanation: event.target.value }))} placeholder="可讲解版型、面料、适合场景、尺码建议和穿搭亮点" />
                  </label>
                  <div className="step-actions">
                    <button type="button" className="primary-action-button" onClick={() => setPublishStep(2)}>下一步：详情页图</button>
                  </div>
                </div>
              )}
              {publishStep === 2 && (
                <div className="form-step">
                  <h4>步骤2：上传详情页图</h4>
                  <label>
                    详情页图片 URL（每行一个链接，至少1张）
                    <textarea rows={4} value={publishForm.detailImages.join("\n")} onChange={(event) => setPublishForm((prev) => ({ ...prev, detailImages: event.target.value.split("\n").map((s) => s.trim()).filter(Boolean) }))} placeholder="https://example.com/detail1.jpg&#10;https://example.com/detail2.jpg" />
                  </label>
                  <label className="file-upload-field">
                    从电脑选择详情图
                    <input
                      type="file"
                      accept="image/jpeg,image/png,image/webp"
                      multiple
                      disabled={uploadingImage === "detail"}
                      onChange={async (event) => {
                        const files = Array.from(event.target.files ?? []);
                        for (const file of files) {
                          await handleUploadProductImage(file, "detail");
                        }
                        event.currentTarget.value = "";
                      }}
                    />
                    <span>{uploadingImage === "detail" ? "详情图上传中..." : "可多选，上传成功后自动追加到详情图 URL"}</span>
                  </label>
                  <div className="detail-preview">
                    {publishForm.detailImages.map((url, i) => (
                      <img key={i} src={url} alt={`详情${i + 1}`} className="image-preview" />
                    ))}
                  </div>
                  <div className="step-actions">
                    <button type="button" onClick={() => setPublishStep(1)}>上一步</button>
                    <button type="button" className="primary-action-button" onClick={() => setPublishStep(3)}>下一步：填写属性</button>
                  </div>
                </div>
              )}
              {publishStep === 3 && (
                <div className="form-step">
                  <h4>步骤3：填写商品属性</h4>
                  <div className="form-grid">
                    <label>
                      商品名称
                      <input value={publishForm.name} onChange={(event) => setPublishForm((prev) => ({ ...prev, name: event.target.value }))} placeholder="法式缎面主纱" />
                    </label>
                    <label>
                      分类
                      <input value={publishForm.category} onChange={(event) => setPublishForm((prev) => ({ ...prev, category: event.target.value }))} placeholder="婚纱" />
                    </label>
                    <label>
                      款式风格
                      <input value={publishForm.style} onChange={(event) => setPublishForm((prev) => ({ ...prev, style: event.target.value }))} placeholder="缎面拖尾" />
                    </label>
                    <label>
                      适用场景
                      <input value={publishForm.scenario} onChange={(event) => setPublishForm((prev) => ({ ...prev, scenario: event.target.value }))} placeholder="婚礼/晚宴/演出" />
                    </label>
                    <label>
                      吊牌价
                      <input type="number" min="1" value={publishForm.tagPrice} onChange={(event) => setPublishForm((prev) => ({ ...prev, tagPrice: event.target.value }))} />
                    </label>
                    <label>
                      周期租金
                      <input type="number" min="1" value={publishForm.dailyRentalPrice} onChange={(event) => setPublishForm((prev) => ({ ...prev, dailyRentalPrice: event.target.value }))} />
                    </label>
                    <label>
                      押金
                      <input type="number" min="40" max="300" value={publishForm.depositAmount} onChange={(event) => setPublishForm((prev) => ({ ...prev, depositAmount: event.target.value }))} />
                    </label>
                  </div>
                  <div className="step-actions">
                    <button type="button" onClick={() => setPublishStep(2)}>上一步</button>
                    <button type="button" className="primary-action-button" onClick={() => setPublishStep(4)}>下一步：SKU设置</button>
                  </div>
                </div>
              )}
              {publishStep === 4 && (
                <div className="form-step">
                  <div className="sku-standard-header">
                    <h4>步骤4：商品规格</h4>
                    <button type="button">规格类型排序</button>
                  </div>
                  <div className="sku-copy-tip">
                    <span>i</span>
                    <p>可一键设置店内相似商品规格，选择尺码和颜色后会自动生成 SKU 组合。</p>
                    <button type="button">立即复制</button>
                  </div>
                  <div className="sku-standard-card">
                    <div className="sku-standard-title">
                      <strong>尺码</strong>
                      <label><input type="checkbox" disabled /> 添加图片</label>
                      <div><button type="button">排序</button><button type="button">删除</button></div>
                    </div>
                    <input
                      value={publishForm.size}
                      onChange={(event) => setPublishForm((prev) => ({ ...prev, size: event.target.value }))}
                      placeholder="请输入规格值名称"
                    />
                    <div className="sku-standard-actions">
                      <button
                        type="button"
                        onClick={() => setPublishForm((prev) => ({ ...prev, selectedSizes: Array.from(new Set([...prev.selectedSizes, ...commonSkuSizes.slice(0, 6)])), size: commonSkuSizes[0] }))}
                      >
                        添加常用规格
                      </button>
                      <button
                        type="button"
                        onClick={() => setPublishForm((prev) => {
                          const value = prev.size.trim();
                          return value ? { ...prev, selectedSizes: Array.from(new Set([...prev.selectedSizes, value])) } : prev;
                        })}
                      >
                        添加定制规格
                      </button>
                    </div>
                    <div className="sku-common-panel">
                      <div className="sku-common-title">
                        <strong>选择尺码常用规格</strong>
                        <span>已选 {publishForm.selectedSizes.length} 个</span>
                      </div>
                      {commonSkuSizes.map((size) => (
                        <button
                          type="button"
                          key={size}
                          className={publishForm.selectedSizes.includes(size) ? "active" : ""}
                          onClick={() => setPublishForm((prev) => ({ ...prev, selectedSizes: toggleSpecValue(prev.selectedSizes, size), size }))}
                        >
                          <span>{size}</span>
                          <em>{publishForm.selectedSizes.includes(size) ? "✓" : ""}</em>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sku-standard-card">
                    <div className="sku-standard-title">
                      <strong>颜色</strong>
                      <label><input type="checkbox" /> 添加图片</label>
                      <div><button type="button">排序</button><button type="button">删除</button></div>
                    </div>
                      <input
                        value={publishForm.color}
                      onChange={(event) => setPublishForm((prev) => ({ ...prev, color: event.target.value }))}
                      placeholder="请输入规格值名称"
                      />
                    <div className="sku-standard-actions">
                      <button
                        type="button"
                        onClick={() => setPublishForm((prev) => ({ ...prev, selectedColors: Array.from(new Set([...prev.selectedColors, ...commonSkuColors.slice(0, 6)])), color: commonSkuColors[0] }))}
                      >
                        添加常用规格
                      </button>
                      <button
                        type="button"
                        onClick={() => setPublishForm((prev) => {
                          const value = prev.color.trim();
                          return value ? { ...prev, selectedColors: Array.from(new Set([...prev.selectedColors, value])) } : prev;
                        })}
                      >
                        添加定制规格
                      </button>
                    </div>
                    <div className="sku-common-panel">
                      <div className="sku-common-title">
                        <strong>选择颜色常用规格</strong>
                        <span>已选 {publishForm.selectedColors.length} 个</span>
                      </div>
                      {commonSkuColors.map((color) => (
                        <button
                          type="button"
                          key={color}
                          className={publishForm.selectedColors.includes(color) ? "active" : ""}
                          onClick={() => setPublishForm((prev) => ({ ...prev, selectedColors: toggleSpecValue(prev.selectedColors, color), color }))}
                        >
                          <span>{color}</span>
                          <em>{publishForm.selectedColors.includes(color) ? "✓" : ""}</em>
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="sku-generate-panel">
                    <div>
                      <strong>SKU 组合预览</strong>
                      <p>{Math.max(publishForm.selectedColors.length, 1)} 个颜色 × {Math.max(publishForm.selectedSizes.length, 1)} 个尺码，将生成 {Math.max(publishForm.selectedColors.length, 1) * Math.max(publishForm.selectedSizes.length, 1)} 个 SKU。</p>
                    </div>
                    <label>
                      统一库存
                      <input type="number" min="1" value={publishForm.stock} onChange={(event) => setPublishForm((prev) => ({ ...prev, stock: event.target.value }))} />
                    </label>
                    <label>
                      单规格 SKU 编码（多规格时自动按商品名-颜色-尺码生成）
                      <input
                        value={publishForm.skuCode}
                        onChange={(event) => setPublishForm((prev) => ({ ...prev, skuCode: event.target.value }))}
                        placeholder="不填则自动生成"
                      />
                    </label>
                  </div>
                  <div className="step-actions">
                    <button type="button" onClick={() => setPublishStep(3)}>上一步</button>
                    <button type="button" className="primary-action-button" onClick={() => setPublishStep(5)}>下一步：发货方式</button>
                  </div>
                </div>
              )}
              {publishStep === 5 && (
                <div className="form-step">
                  <h4>步骤5：选择发货方式</h4>
                  <div className="shipping-method-options">
                    <label className="checkbox-label">
                      <input type="checkbox" checked={publishForm.shippingMethods.includes("PICKUP")} onChange={(event) => setPublishForm((prev) => ({ ...prev, shippingMethods: event.target.checked ? [...prev.shippingMethods, "PICKUP"] : prev.shippingMethods.filter((m) => m !== "PICKUP") }))} />
                      支持自提
                    </label>
                    <label className="checkbox-label">
                      <input type="checkbox" checked={publishForm.shippingMethods.includes("EXPRESS")} onChange={(event) => setPublishForm((prev) => ({ ...prev, shippingMethods: event.target.checked ? [...prev.shippingMethods, "EXPRESS"] : prev.shippingMethods.filter((m) => m !== "EXPRESS") }))} />
                      支持快递发货
                    </label>
                  </div>
                  <div className="step-actions">
                    <button type="button" onClick={() => setPublishStep(4)}>上一步</button>
                    <button className="primary-action-button" type="submit" disabled={loading}>
                      {loading ? "发布中..." : "确认发布商品"}
                    </button>
                  </div>
                </div>
              )}
            </form>
          )}
          <div className="merchant-products">
            {products.map((product) => (
              <article className="merchant-product" key={product.id}>
                <img src={normalizeImage(product)} alt={product.name} />
                <div>
                  <h3>{product.name}</h3>
                  <p>{product.category} · {product.status === "ACTIVE" ? "已上架" : "已下架"} · 收藏 {product.favoriteCount} · 加购 {product.cartCount}</p>
                  <div className="tags">
                    {product.specs.map((spec) => (
                      <button type="button" key={spec.id} onClick={() => handleEditSpec(spec)}>
                        SKU {spec.skuCode ?? "未设置"} · {spec.color ?? "默认色"} / {spec.size ?? "定制"}：库存 {spec.stock}
                      </button>
                    ))}
                  </div>
                </div>
                <div className="merchant-product-actions">
                  <button type="button" onClick={() => handleToggleProduct(product)}>
                    {product.status === "ACTIVE" ? "下架" : "上架"}
                  </button>
                  <button type="button" className="danger-button" onClick={() => handleDeleteProduct(product)}>
                    删除
                  </button>
                </div>
              </article>
            ))}
          </div>
        </section>

        {extensionOrder && (
          <ExtensionModal
            order={extensionOrder}
            extensionDays={extensionDays}
            extensionFee={extensionFee}
            extensionType={extensionType}
            extensionProof={extensionProof}
            loading={loading}
            onDaysChange={setExtensionDays}
            onFeeChange={setExtensionFee}
            onTypeChange={setExtensionType}
            onProofChange={setExtensionProof}
            onClose={() => setExtensionOrder(null)}
            onSubmit={handleSubmitExtension}
          />
        )}

          </section>
        </div>

        <BottomTabs activeTab={activeTab} onSwitch={switchTab} showMerchant={currentUser.role === "MERCHANT"} />
      </main>
    );
  }

  return (
    <main className="app-shell pdd-shop-shell">
      <section className="pdd-shop-header">
        <div className="pdd-shop-topline">
          <button type="button" onClick={handleLogout}>‹</button>
          <span>多金喜服装租赁店</span>
          <div>
            <button type="button">搜索</button>
            <button type="button">分享</button>
          </div>
        </div>
        <div className="pdd-shop-profile">
          <img className="shop-avatar" src="/shop-avatar.png" alt="多金喜服装租赁店铺头像" />
          <div>
            <h1>多金喜服装租赁</h1>
            <p><span>8年老店</span><span>近期本店已租 {productOverview?.summary.totalOrders ?? orders.length} 件</span></p>
          </div>
          <div className="pdd-shop-actions">
            <button type="button" className="followed-button">已关注</button>
            <button type="button" onClick={() => setChatOpen(true)}>客服</button>
          </div>
        </div>
        <div className="pdd-shop-service-bar">
          <span>店铺资质</span>
          <span>7天无理由退货</span>
          <span>全场包邮</span>
        </div>
        <div className="pdd-shop-tabs">
          <button type="button" className="active">保障</button>
          <button type="button" className="active-red">全部商品</button>
          <button type="button">评价（{productReviews.length || merchantReviews.length || 2402} 条）</button>
          <button type="button">分类</button>
        </div>
        <div className="pdd-shop-sortbar">
          <button type="button" className="active">综合⌄</button>
          <button type="button">销量</button>
          <button type="button">上新</button>
          <button type="button">尺码⌄</button>
          <button type="button">大图</button>
        </div>
      </section>

      {message && <p className="message">{message}</p>}

      {coupons.length > 0 && (
        <section className="pdd-coupon-banner">
          <strong>店铺优惠</strong>
          <span>{coupons[0].title} · 满 {formatMoney(coupons[0].minOrderAmount)} 减 {formatMoney(coupons[0].discountAmount ?? 0)}</span>
        </section>
      )}

      <section className="pdd-category-strip">
        <button
          type="button"
          className={selectedCategory === "" ? "active" : ""}
          onClick={() => changeCategory("")}
        >
          全部
        </button>
        {categories.map((category) => (
          <button
            type="button"
            className={selectedCategory === category ? "active" : ""}
            key={category}
            onClick={() => changeCategory(category)}
          >
            {category}
          </button>
        ))}
      </section>

      <section className={`product-grid ${productTransition === "leaving" ? "product-grid-leaving" : ""}`}>
        {loading && products.length === 0 && Array.from({ length: 3 }).map((_, index) => (
          <div className="catalog-card skeleton-card" key={index}>
            <div className="skeleton-image" />
            <div className="catalog-body">
              <span />
              <h3 />
              <div />
            </div>
          </div>
        ))}
        {products.map((product) => (
          <article
            className="catalog-card"
            key={product.id}
            role="button"
            tabIndex={0}
            onClick={() => openDetail(product)}
            onKeyDown={(event) => {
              if (event.key === "Enter") openDetail(product);
            }}
          >
            <img src={normalizeImage(product)} alt={product.name} />
            <div className="catalog-body">
              <span>{product.category}</span>
              <h3>{product.name}</h3>
              <div className="catalog-price">
                <strong>{formatMoney(product.dailyRentalPrice)}</strong>
                <small>已租 {product.salesCount} 件</small>
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCart(product);
                  }}
                >
                  +
                </button>
              </div>
            </div>
          </article>
        ))}
        {!loading && products.length === 0 && (
          <div className="empty product-empty">暂无商品，商家上架后会展示在这里。</div>
        )}
      </section>

      {cartItems.length > 0 && (
        <div className="pdd-settle-bar">
          <button type="button">♡</button>
          <div>
            <strong>去结算</strong>
            <span>已选本店 {cartItems.reduce((sum, item) => sum + item.quantity, 0)} 件</span>
          </div>
        </div>
      )}

      {announcement && (
        <section className="announcement-card">
          <div>
            <strong>{announcement.title}</strong>
            <p>{announcement.content}</p>
          </div>
          {currentUser.role === "MERCHANT" && <button type="button" onClick={handleEditAnnouncement}>编辑公告</button>}
        </section>
      )}

      {coupons.length > 0 && (
        <section className="coupon-strip">
          <div className="section-title">
            <h2>店铺满减券</h2>
            <span>下单前可咨询商家使用</span>
          </div>
          <div className="coupon-grid">
            {coupons.slice(0, 3).map((coupon) => (
              <article className="coupon-card" key={coupon.id}>
                <div>
                  <strong>{coupon.title}</strong>
                  <p>{coupon.code} · {coupon.usageLimit ? `限 ${coupon.usageLimit} 张` : "不限量"}</p>
                  <span>满 {formatMoney(coupon.minOrderAmount)} 减 {formatMoney(coupon.discountAmount ?? 0)}</span>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      {memberLevels.length > 0 && (
        <section className="home-data-section">
          <div className="section-title">
            <h2>会员等级福利</h2>
            <span>商家自定义权益</span>
          </div>
          <div className="coupon-grid">
            {memberLevels.filter((level) => level.enabled).slice(0, 3).map((level) => {
              const benefits = parseBenefits(level.benefits);
              return (
                <article className="coupon-card" key={level.id}>
                  <div>
                    <strong>{level.name}</strong>
                    <p>累计消费满 {formatMoney(level.minSpend)}</p>
                    <span>{formatDiscount(level.discountPercent)} · {benefits.join(" / ") || "专属会员权益"}</span>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="home-data-section" id="account-security">
        <div className="section-title">
          <h2>账号安全</h2>
          <div className="section-actions">
            <button type="button" disabled={loading} onClick={handleSetupTotp}>绑定/重置 TOTP</button>
            <button type="button" disabled={loading} onClick={handleDisableTotp}>解绑 TOTP</button>
            <button type="button" disabled={loading} onClick={refreshSecurityData}>刷新设备</button>
          </div>
        </div>
        <div className="mini-ranking">
          <h3>当前登录设备</h3>
          {sessions.map((session) => (
            <p key={session.id}>
              {session.deviceName}
              <span>{session.isActive ? "在线" : "已下线"} · {new Date(session.lastActiveAt).toLocaleString()} {session.isActive && <button type="button" onClick={() => handleKickSession(session)}>下线</button>}</span>
            </p>
          ))}
          {!sessions.length && <p>暂无设备记录<span>登录后自动记录</span></p>}
        </div>
        <div className="mini-ranking">
          <h3>最近登录日志</h3>
          {loginLogs.slice(0, 5).map((log) => (
            <p key={log.id}>
              {log.device ?? "未知设备"}
              <span>{log.success ? "成功" : "失败"} · {log.reason ?? "无"} · {new Date(log.createdAt).toLocaleString()}</span>
            </p>
          ))}
          {!loginLogs.length && <p>暂无登录日志<span>登录后自动记录</span></p>}
        </div>
      </section>

      {(cartItems.length > 0 || favoriteItems.length > 0) && (
        <section className="home-data-section">
          <div className="section-title">
            <h2>我的购物车与收藏</h2>
            <span>{cartItems.length} 件购物车 · {favoriteItems.length} 件收藏</span>
          </div>
          <div className="mini-shop-list">
            {cartItems.slice(0, 3).map((item) => (
              <article key={item.id}>
                <img src={normalizeImage(item.product)} alt={item.product.name} />
                <div>
                  <strong>{item.product.name}</strong>
                  <p>SKU {item.spec.skuCode ?? "未设置"} · {item.spec.color ?? "默认色"} / {item.spec.size ?? "定制"} · 数量 {item.quantity}</p>
                </div>
                <button type="button" onClick={() => handleRemoveCartItem(item.id)}>移除</button>
              </article>
            ))}
            {favoriteItems.slice(0, 3).map((item) => (
              <article key={item.id}>
                <img src={normalizeImage(item.product)} alt={item.product.name} />
                <div>
                  <strong>{item.product.name}</strong>
                  <p>收藏商品 · {formatMoney(item.product.dailyRentalPrice)}/周期</p>
                </div>
                <button type="button" onClick={() => handleToggleFavorite(item.product)}>取消收藏</button>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="home-data-section">
        <div className="section-title">
          <h2>新品上架</h2>
          <span>近期入库</span>
        </div>
        <div className="horizontal-products">
          {products.slice(0, 4).map((product) => (
            <button type="button" key={product.id} onClick={() => openDetail(product)}>
              <img src={normalizeImage(product)} alt={product.name} />
              <strong>{product.name}</strong>
              <span>{formatMoney(product.dailyRentalPrice)}/周期</span>
            </button>
          ))}
        </div>
      </section>

      <section className="home-data-section">
        <div className="section-title">
          <h2>商品租赁销量</h2>
          <span>按有效订单统计</span>
        </div>
        <div className="sales-list">
          {[...products].sort((a, b) => b.salesCount - a.salesCount).slice(0, 5).map((product, index) => (
            <button type="button" key={product.id} onClick={() => openDetail(product)}>
              <span>{index + 1}</span>
              <strong>{product.name}</strong>
              <em>{product.salesCount} 单</em>
            </button>
          ))}
        </div>
      </section>

      <section className="filter-card">
        <div className="section-title">
          <h2>商品列表</h2>
          <span>{loading ? "加载中" : `${products.length} 件商品`}</span>
        </div>
        <div className="category-tabs">
          <button
            type="button"
            className={selectedCategory === "" ? "active" : ""}
            onClick={() => changeCategory("")}
          >
            全部
          </button>
          {categories.map((category) => (
            <button
              type="button"
              className={selectedCategory === category ? "active" : ""}
              key={category}
              onClick={() => changeCategory(category)}
            >
              {category}
            </button>
          ))}
        </div>
      </section>

      <section className={`product-grid legacy-shop-product-grid ${productTransition === "leaving" ? "product-grid-leaving" : ""}`}>
        {loading && products.length === 0 && Array.from({ length: 3 }).map((_, index) => (
          <div className="catalog-card skeleton-card" key={index}>
            <div className="skeleton-image" />
            <div className="catalog-body">
              <span />
              <h3 />
              <div />
            </div>
          </div>
        ))}
        {products.map((product) => (
          <article
            className="catalog-card"
            key={product.id}
            role="button"
            tabIndex={0}
            onClick={() => openDetail(product)}
            onKeyDown={(event) => {
              if (event.key === "Enter") openDetail(product);
            }}
          >
            <img src={normalizeImage(product)} alt={product.name} />
            <div className="catalog-body">
              <span>{product.category}</span>
              <h3>{product.name}</h3>
              <div className="catalog-price">
                <strong>{formatMoney(product.dailyRentalPrice)}/周期</strong>
                <small>押金 {formatMoney(product.depositAmount)}</small>
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleToggleFavorite(product);
                  }}
                >
                  {favoriteItems.some((item) => item.productId === product.id) ? "已收藏" : "收藏"}
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleAddToCart(product);
                  }}
                >
                  加购物车
                </button>
                <button
                  type="button"
                  onClick={(event) => {
                    event.stopPropagation();
                    handleConsultProduct(product);
                  }}
                >
                  咨询
                </button>
              </div>
            </div>
          </article>
        ))}
        {!loading && products.length === 0 && <p className="empty product-empty">暂无商品，请切换品类或稍后再试。</p>}
      </section>
      <ChatWidget
        currentUser={currentUser}
        open={chatOpen}
        conversations={chatConversations}
        activeConversation={activeChat}
        activeChatId={activeChatId}
        input={chatInput}
        loading={loading}
        onToggle={() => setChatOpen((prev) => !prev)}
        onSelect={setActiveChatId}
        onInput={setChatInput}
        onSend={handleSendChatMessage}
      />
      <BottomTabs activeTab={activeTab} onSwitch={switchTab} showMerchant={currentUser.role === "MERCHANT"} showAdmin={currentUser.role === "ADMIN"} />
    </main>
  );
}

function BottomTabs({
  activeTab,
  onSwitch,
  showMerchant = false,
  showAdmin = false
}: {
  activeTab: "products" | "orders" | "merchant" | "admin";
  onSwitch: (tab: "products" | "orders" | "merchant" | "admin") => void;
  showMerchant?: boolean;
  showAdmin?: boolean;
}) {
  return (
    <nav className={`bottom-tabs ${showMerchant || showAdmin ? "three-tabs" : ""}`}>
      <button
        type="button"
        className={activeTab === "products" ? "active" : ""}
        onClick={() => onSwitch("products")}
      >
        商品
      </button>
      <button
        type="button"
        className={activeTab === "orders" ? "active" : ""}
        onClick={() => onSwitch("orders")}
      >
        我的订单
      </button>
      {showMerchant && (
        <button
          type="button"
          className={activeTab === "merchant" ? "active" : ""}
          onClick={() => onSwitch("merchant")}
        >
          商家后台
        </button>
      )}
      {showAdmin && (
        <button
          type="button"
          className={activeTab === "admin" ? "active" : ""}
          onClick={() => onSwitch("admin")}
        >
          管理后台
        </button>
      )}
    </nav>
  );
}

function ChatWidget({
  currentUser,
  open,
  conversations,
  activeConversation,
  activeChatId,
  input,
  loading,
  onToggle,
  onSelect,
  onInput,
  onSend
}: {
  currentUser: AuthUser;
  open: boolean;
  conversations: ChatConversation[];
  activeConversation?: ChatConversation;
  activeChatId: string;
  input: string;
  loading: boolean;
  onToggle: () => void;
  onSelect: (id: string) => void;
  onInput: (value: string) => void;
  onSend: () => void;
}) {
  const title = currentUser.role === "MERCHANT" ? "租客咨询" : "联系商家";
  return (
    <aside className={`chat-widget ${open ? "open" : ""}`}>
      <button type="button" className="chat-toggle" onClick={onToggle}>
        {title}
        {conversations.length > 0 && <span>{conversations.length}</span>}
      </button>
      {open && (
        <div className="chat-panel">
          <div className="chat-header">
            <strong>{title}</strong>
            <button type="button" onClick={onToggle}>收起</button>
          </div>
          <div className="chat-body">
            <div className="chat-list">
              {conversations.map((conversation) => {
                const peer = currentUser.role === "MERCHANT" ? conversation.customer : conversation.merchant;
                const latest = conversation.messages[conversation.messages.length - 1];
                return (
                  <button
                    type="button"
                    className={activeChatId === conversation.id ? "active" : ""}
                    key={conversation.id}
                    onClick={() => onSelect(conversation.id)}
                  >
                    <strong>{peer.name}</strong>
                    <span>{conversation.product?.name ?? "店铺咨询"}</span>
                    <small>{latest?.content ?? "暂无消息"}</small>
                  </button>
                );
              })}
              {!conversations.length && <p className="empty">暂无聊天。用户可在商品详情点击“咨询商家”。</p>}
            </div>
            <div className="chat-room">
              {activeConversation ? (
                <>
                  <div className="chat-topic">
                    <strong>{activeConversation.product?.name ?? "店铺咨询"}</strong>
                    <span>{currentUser.role === "MERCHANT" ? activeConversation.customer.name : activeConversation.merchant.name}</span>
                  </div>
                  <div className="chat-messages">
                    {activeConversation.messages.map((message) => (
                      <div className={`chat-message ${message.senderId === currentUser.id ? "mine" : ""}`} key={message.id}>
                        <small>{message.sender.name}</small>
                        <p>{message.content}</p>
                      </div>
                    ))}
                    {!activeConversation.messages.length && <p className="empty">可以开始沟通尺码、档期、物流和归还细节。</p>}
                  </div>
                  <div className="chat-input-row">
                    <input
                      value={input}
                      onChange={(event) => onInput(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === "Enter") onSend();
                      }}
                      placeholder="输入消息..."
                    />
                    <button type="button" disabled={loading || !input.trim()} onClick={onSend}>发送</button>
                  </div>
                </>
              ) : (
                <p className="empty">选择一个会话查看消息。</p>
              )}
            </div>
          </div>
        </div>
      )}
    </aside>
  );
}

function OrderActionButtons({
  order,
  role,
  loading,
  onPay,
  onCancel,
  onReturn,
  onInspect,
  onOpenExtension,
  onReviewExtension,
  onAdjustPrice,
  onDelayShipment
}: {
  order: Order;
  role: "USER" | "MERCHANT" | "ADMIN";
  loading: boolean;
  onPay: (orderId: string) => void;
  onCancel: (orderId: string) => void;
  onReturn: (orderId: string) => void;
  onInspect: (orderId: string, cleaningFee: number) => void;
  onOpenExtension: (order: Order) => void;
  onReviewExtension: (orderId: string, approved: boolean) => void;
  onAdjustPrice: (order: Order) => void;
  onDelayShipment: (order: Order) => void;
}) {
  return (
    <div className="order-detail-actions">
      {["PENDING", "PENDING_PAYMENT"].includes(order.status) && (
        <>
          <button type="button" className="primary-action-button" disabled={loading} onClick={() => onPay(order.id)}>
            立即支付 {formatMoney(order.totalPrice ?? order.totalAmount)}
          </button>
          {role === "MERCHANT" && (
            <>
              <button type="button" className="primary-action-button" disabled={loading} onClick={() => onAdjustPrice(order)}>
                拍后改价
              </button>
              <button type="button" className="primary-action-button" disabled={loading} onClick={() => onDelayShipment(order)}>
                延期发货
              </button>
            </>
          )}
          <button type="button" className="danger-button" disabled={loading} onClick={() => onCancel(order.id)}>
            取消订单
          </button>
        </>
      )}
      {order.status === "RENTING" && (
        <>
          <button type="button" className="primary-action-button" disabled={loading} onClick={() => onOpenExtension(order)}>
            申请延期
          </button>
          {role === "MERCHANT" && (
            <button type="button" className="primary-action-button" disabled={loading} onClick={() => onDelayShipment(order)}>
              延期发货
            </button>
          )}
          <button type="button" className="primary-action-button" disabled={loading} onClick={() => onReturn(order.id)}>
            发起归还
          </button>
        </>
      )}
      {role === "MERCHANT" && ["PENDING_EXTENSION_REVIEW", "PENDING_EXTENSION"].includes(order.status) && (
        <>
          <button type="button" className="primary-action-button" disabled={loading} onClick={() => onReviewExtension(order.id, true)}>
            审核通过
          </button>
          <button type="button" className="danger-button" disabled={loading} onClick={() => onReviewExtension(order.id, false)}>
            审核驳回
          </button>
        </>
      )}
      {role === "MERCHANT" && order.status === "PENDING_RETURN" && (
        <>
          <button type="button" className="primary-action-button" disabled={loading} onClick={() => onInspect(order.id, 0)}>
            验收通过，退还押金
          </button>
          <button
            type="button"
            className="danger-button"
            disabled={loading}
            onClick={() => {
              const value = window.prompt("请输入扣取押金/清洁费金额", "30");
              if (value == null) return;
              const fee = Number(value);
              if (!Number.isFinite(fee) || fee < 0) {
                window.alert("请输入有效金额");
                return;
              }
              if (fee > order.deposit) {
                window.alert(`扣取金额不能超过押金 ${formatMoney(order.deposit)}`);
                return;
              }
              onInspect(order.id, fee);
            }}
          >
            验收不通过，自定义扣押金
          </button>
        </>
      )}
      {order.status === "COMPLETED" && (
        <p className="refund-tip">
          押金退还：{formatMoney(order.depositRefund ?? order.deposit)}
          {(order.cleaningFee ?? 0) > 0 ? `，清洁费：${formatMoney(order.cleaningFee ?? 0)}` : ""}
        </p>
      )}
    </div>
  );
}

function ExtensionModal({
  order,
  extensionDays,
  extensionFee,
  extensionType,
  extensionProof,
  loading,
  onDaysChange,
  onFeeChange,
  onTypeChange,
  onProofChange,
  onClose,
  onSubmit
}: {
  order: Order;
  extensionDays: number;
  extensionFee: number;
  extensionType: "NORMAL" | "FORCE_MAJEURE";
  extensionProof: string;
  loading: boolean;
  onDaysChange: (days: number) => void;
  onFeeChange: (fee: number) => void;
  onTypeChange: (type: "NORMAL" | "FORCE_MAJEURE") => void;
  onProofChange: (proof: string) => void;
  onClose: () => void;
  onSubmit: () => void;
}) {
  const suggestedFee = order.product?.dailyRentalPrice ?? 0;
  return (
    <div className="modal-backdrop">
      <section className="extension-modal">
        <div className="section-title">
          <h2>申请延期</h2>
          <button type="button" onClick={onClose}>关闭</button>
        </div>
        <p>当前归还日期：{order.endDate ?? order.rentEndDate?.slice(0, 10)}</p>
        <label>
          延期天数
          <select
            value={extensionDays}
            onChange={(event) => {
              onDaysChange(Number(event.target.value));
            }}
          >
            {[1, 2, 3, 4, 5, 6, 7].map((day) => (
              <option value={day} key={day}>{day} 天</option>
            ))}
          </select>
        </label>
        <label>
          延期类型
          <select value={extensionType} onChange={(event) => onTypeChange(event.target.value as "NORMAL" | "FORCE_MAJEURE")}>
            <option value="NORMAL">普通延期</option>
            <option value="FORCE_MAJEURE">不可抗力</option>
          </select>
        </label>
        {extensionType === "FORCE_MAJEURE" && (
          <label>
            凭证图片占位
            <input
              value={extensionProof}
              onChange={(event) => onProofChange(event.target.value)}
              placeholder="填写凭证图片链接或占位文字"
            />
          </label>
        )}
        <div className="extension-fee-box">
          <span>延期费用（可自定义）</span>
          <input
            min={0}
            type="number"
            value={extensionFee}
            onChange={(event) => onFeeChange(Number(event.target.value))}
          />
          <small>建议参考：{formatMoney(suggestedFee)} / 周期，可按协商结果手动调整</small>
        </div>
        <button type="button" className="primary-action-button" disabled={loading} onClick={onSubmit}>
          {loading ? "提交中..." : "提交延期申请"}
        </button>
      </section>
    </div>
  );
}

export default App;
