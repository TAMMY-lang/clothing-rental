import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/utils/auth.js";

const prisma = new PrismaClient();

async function main() {
  await prisma.userSession.deleteMany();
  await prisma.device.deleteMany();
  await prisma.loginLog.deleteMany();
  await prisma.securitySetting.deleteMany();
  await prisma.inventoryBooking.deleteMany();
  await prisma.extensionReview.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.order.deleteMany();
  await prisma.cartItem.deleteMany();
  await prisma.favorite.deleteMany();
  await prisma.withdrawal.deleteMany();
  await prisma.merchantWallet.deleteMany();
  await prisma.memberLevel.deleteMany();
  await prisma.tryOnSetting.deleteMany();
  await prisma.returnAddress.deleteMany();
  await prisma.coupon.deleteMany();
  await prisma.shopAnnouncement.deleteMany();
  await prisma.productSpec.deleteMany();
  await prisma.product.deleteMany();
  await prisma.productCategory.deleteMany();
  await prisma.user.deleteMany();

  const defaultCategories = ["婚纱", "西服", "秀禾服", "敬酒服", "伴郎伴娘服", "表演服", "生日晚宴服"];

  await prisma.productCategory.createMany({
    data: defaultCategories.map((name, index) => ({
      name,
      sortOrder: index
    }))
  });

  await prisma.product.createMany({
    data: [
      {
        name: "星河拖尾主纱",
        category: "婚纱",
        style: "拖尾",
        scenario: "婚礼",
        tagPrice: 3999,
        dailyRentalPrice: 299,
        depositAmount: 300,
        tags: JSON.stringify(["主纱", "重工蕾丝", "仪式感"]),
        mainImage: "https://placehold.co/800x1000/F8E7E7/7C2D12?text=Wedding+Dress",
        videoUrl: "https://interactive-examples.mdn.mozilla.net/media/cc0-videos/flower.mp4",
        explanation: "这款主纱适合仪式感较强的婚礼场景。\n重工蕾丝和拖尾设计更显身形比例，建议提前确认场地动线和跟妆安排。\n尺码建议结合胸围、腰围和鞋跟高度确认，可下单前咨询商家。",
        detailImages: JSON.stringify(["https://placehold.co/800x1000/F8E7E7/7C2D12?text=Detail+1", "https://placehold.co/800x1000/F8E7E7/7C2D12?text=Detail+2"]),
        images: JSON.stringify(["https://placehold.co/800x1000/F8E7E7/7C2D12?text=Wedding+Dress"]),
        shippingMethods: JSON.stringify(["PICKUP", "EXPRESS"])
      },
      {
        name: "黑色经典修身西服",
        category: "西服",
        style: "修身",
        scenario: "婚礼",
        tagPrice: 1599,
        dailyRentalPrice: 128,
        depositAmount: 180,
        tags: JSON.stringify(["伴郎", "商务", "黑色"]),
        mainImage: "https://placehold.co/800x1000/E5E7EB/111827?text=Suit",
        detailImages: JSON.stringify(["https://placehold.co/800x1000/E5E7EB/111827?text=Suit+Detail"]),
        images: JSON.stringify(["https://placehold.co/800x1000/E5E7EB/111827?text=Suit"]),
        shippingMethods: JSON.stringify(["PICKUP", "EXPRESS"])
      },
      {
        name: "红金刺绣秀禾服",
        category: "秀禾服",
        style: "中式刺绣",
        scenario: "婚礼",
        tagPrice: 2699,
        dailyRentalPrice: 218,
        depositAmount: 260,
        tags: JSON.stringify(["中式", "敬茶", "红金"]),
        mainImage: "https://placehold.co/800x1000/FEE2E2/991B1B?text=Xiuhe+Dress",
        detailImages: JSON.stringify(["https://placehold.co/800x1000/FEE2E2/991B1B?text=Xiuhe+Detail"]),
        images: JSON.stringify(["https://placehold.co/800x1000/FEE2E2/991B1B?text=Xiuhe+Dress"]),
        shippingMethods: JSON.stringify(["PICKUP", "EXPRESS"])
      },
      {
        name: "香槟缎面敬酒服",
        category: "敬酒服",
        style: "缎面鱼尾",
        scenario: "婚礼",
        tagPrice: 1299,
        dailyRentalPrice: 118,
        depositAmount: 160,
        tags: JSON.stringify(["敬酒", "轻礼服", "显瘦"]),
        mainImage: "https://placehold.co/800x1000/FDE68A/92400E?text=Toast+Dress",
        detailImages: JSON.stringify(["https://placehold.co/800x1000/FDE68A/92400E?text=Toast+Detail"]),
        images: JSON.stringify(["https://placehold.co/800x1000/FDE68A/92400E?text=Toast+Dress"]),
        shippingMethods: JSON.stringify(["PICKUP", "EXPRESS"])
      },
      {
        name: "雾蓝伴娘礼服",
        category: "伴郎伴娘服",
        style: "简约长裙",
        scenario: "婚礼",
        tagPrice: 699,
        dailyRentalPrice: 68,
        depositAmount: 80,
        tags: JSON.stringify(["伴娘", "团队", "雾蓝"]),
        mainImage: "https://placehold.co/800x1000/DBEAFE/1E3A8A?text=Bridesmaid",
        detailImages: JSON.stringify(["https://placehold.co/800x1000/DBEAFE/1E3A8A?text=Bridesmaid+Detail"]),
        images: JSON.stringify(["https://placehold.co/800x1000/DBEAFE/1E3A8A?text=Bridesmaid"]),
        shippingMethods: JSON.stringify(["PICKUP", "EXPRESS"])
      },
      {
        name: "亮片舞台表演服",
        category: "表演服",
        style: "亮片舞台",
        scenario: "演出",
        tagPrice: 899,
        dailyRentalPrice: 88,
        depositAmount: 100,
        tags: JSON.stringify(["演出", "舞台", "亮片"]),
        mainImage: "https://placehold.co/800x1000/EDE9FE/5B21B6?text=Stage+Costume",
        detailImages: JSON.stringify(["https://placehold.co/800x1000/EDE9FE/5B21B6?text=Stage+Detail"]),
        images: JSON.stringify(["https://placehold.co/800x1000/EDE9FE/5B21B6?text=Stage+Costume"]),
        shippingMethods: JSON.stringify(["PICKUP", "EXPRESS"])
      },
      {
        name: "黑金生日晚宴裙",
        category: "生日晚宴服",
        style: "黑金派对",
        scenario: "生日",
        tagPrice: 1099,
        dailyRentalPrice: 98,
        depositAmount: 120,
        tags: JSON.stringify(["生日", "晚宴", "派对"]),
        mainImage: "https://placehold.co/800x1000/111827/FACC15?text=Party+Dress",
        detailImages: JSON.stringify(["https://placehold.co/800x1000/111827/FACC15?text=Party+Detail"]),
        images: JSON.stringify(["https://placehold.co/800x1000/111827/FACC15?text=Party+Dress"]),
        shippingMethods: JSON.stringify(["PICKUP", "EXPRESS"])
      }
    ]
  });

  await prisma.shopAnnouncement.create({
    data: {
      title: "春节档期公告",
      content: "热门婚礼档期建议提前 7 天预订，支持普通延期和不可抗力延期申请。",
      enabled: true
    }
  });

  await prisma.tryOnSetting.create({
    data: {
      enabled: true,
      feeRules: JSON.stringify([
        { style: "拖尾", quantity: 1, fee: 60 },
        { style: "修身", quantity: 1, fee: 40 },
        { style: "默认", quantity: 1, fee: 30 },
        { style: "默认", quantity: 2, fee: 50 }
      ]),
      processNote: "确定租：试穿结束衣服寄回，收到并验收后退押金和试穿费用。不租：需当天寄回，收到后退租金押金，试穿费用不退。",
      careNotice: "试穿应避免衣服弄脏和破损，请勿喷香水、化妆品蹭染或长时间外穿；如有清洁或修复费用，将从押金中扣除。"
    }
  });

  await prisma.returnAddress.create({
    data: {
      label: "上海总仓",
      receiver: "商家售后",
      phone: "13900000000",
      address: "上海市徐汇区试穿回寄中心 1 号",
      isDefault: true,
      enabled: true
    }
  });

  await prisma.coupon.createMany({
    data: [
      {
        title: "新客立减券",
        code: "NEW50",
        type: "AMOUNT",
        discountAmount: 50,
        minOrderAmount: 499,
        enabled: true
      },
      {
        title: "婚礼档期专享",
        code: "WEDDING88",
        type: "AMOUNT",
        discountAmount: 88,
        minOrderAmount: 699,
        enabled: true
      }
    ]
  });

  await prisma.merchantWallet.create({
    data: {
      balance: 0,
      frozen: 0,
      totalIncome: 0
    }
  });

  await prisma.memberLevel.createMany({
    data: [
      {
        name: "银卡会员",
        minSpend: 1000,
        discountPercent: 95,
        benefits: JSON.stringify(["租赁周期价 95 折", "优先预留热门档期"]),
        sortOrder: 1
      },
      {
        name: "金卡会员",
        minSpend: 3000,
        discountPercent: 90,
        benefits: JSON.stringify(["租赁周期价 9 折", "免费改期 1 次", "专属尺码建议"]),
        sortOrder: 2
      }
    ]
  });

  const adminPasswordHash = hashPassword("Aa123456!");
  await prisma.user.createMany({
    data: [
      { name: "体验用户", phone: "13800000000", passwordHash: hashPassword("123456"), role: "USER" },
      { name: "商家账号", phone: "13900000000", passwordHash: hashPassword("123456"), role: "MERCHANT" },
      { name: "系统管理员", phone: "13700000000", passwordHash: adminPasswordHash, passwordHistory: JSON.stringify([adminPasswordHash]), role: "ADMIN" }
    ]
  });

  await prisma.securitySetting.create({ data: {} });

  const products = await prisma.product.findMany();

  for (const product of products) {
    if (product.category === "婚纱") {
      await prisma.productSpec.createMany({
        data: [
          { productId: product.id, skuCode: "婚纱-白-S", color: "白", size: "S", bust: 80, waist: 62, stock: 1 },
          { productId: product.id, skuCode: "婚纱-白-M", color: "白", size: "M", bust: 84, waist: 66, stock: 1 },
          { productId: product.id, skuCode: "婚纱-白-L", color: "白", size: "L", bust: 88, waist: 70, stock: 1 }
        ]
      });
    }

    if (product.category === "西服") {
      await prisma.productSpec.createMany({
        data: [
          { productId: product.id, skuCode: "西服-黑-M", color: "黑", size: "M", stock: 2 },
          { productId: product.id, skuCode: "西服-黑-L", color: "黑", size: "L", stock: 2 },
          { productId: product.id, skuCode: "西服-黑-XL", color: "黑", size: "XL", stock: 1 }
        ]
      });
    }

    if (product.category === "秀禾服") {
      await prisma.productSpec.createMany({
        data: [
          { productId: product.id, skuCode: "秀禾服-红-S", color: "红", size: "S", bust: 82, waist: 64, stock: 1 },
          { productId: product.id, skuCode: "秀禾服-红-M", color: "红", size: "M", bust: 86, waist: 68, stock: 1 },
          { productId: product.id, skuCode: "秀禾服-金-L", color: "金", size: "L", bust: 90, waist: 72, stock: 1 }
        ]
      });
    }

    if (["敬酒服", "生日晚宴服"].includes(product.category)) {
      await prisma.productSpec.createMany({
        data: [
          { productId: product.id, skuCode: `${product.category}-香槟-S`, color: "香槟", size: "S", stock: 1 },
          { productId: product.id, skuCode: `${product.category}-香槟-M`, color: "香槟", size: "M", stock: 1 },
          { productId: product.id, skuCode: `${product.category}-黑金-L`, color: "黑金", size: "L", stock: 1 }
        ]
      });
    }

    if (product.category === "伴郎伴娘服") {
      await prisma.productSpec.createMany({
        data: [
          { productId: product.id, skuCode: "伴娘服-雾蓝-S", color: "雾蓝", size: "S", stock: 3 },
          { productId: product.id, skuCode: "伴娘服-雾蓝-M", color: "雾蓝", size: "M", stock: 3 },
          { productId: product.id, skuCode: "伴娘服-雾蓝-L", color: "雾蓝", size: "L", stock: 2 }
        ]
      });
    }

    if (product.category === "表演服") {
      await prisma.productSpec.createMany({
        data: [
          { productId: product.id, skuCode: "表演服-银-M", color: "银", size: "M", stock: 2 },
          { productId: product.id, skuCode: "表演服-紫-L", color: "紫", size: "L", stock: 2 },
          { productId: product.id, skuCode: "表演服-金-XL", color: "金", size: "XL", stock: 1 }
        ]
      });
    }
  }

  console.log("基础测试数据已写入：7 个品类商品、店铺公告、体验用户、商家账号和系统管理员账号。");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
