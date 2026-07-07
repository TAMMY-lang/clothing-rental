const DEFAULT_COUPONS = [
  { title: "新人优惠券", amount: 50, minOrder: 200 },
  { title: "满减券", amount: 30, minOrder: 150 },
  { title: "免运费券", amount: 0, minOrder: 0 },
];

export default function CouponDisplay() {
  return (
    <div className="px-4 py-3">
      <h3 className="text-sm font-bold mb-2">优惠券</h3>
      <div className="flex overflow-x-auto gap-2 pb-2">
        {DEFAULT_COUPONS.map((coupon, i) => (
          <div key={i} className="min-w-[140px] bg-gradient-to-r from-red-500 to-orange-500 text-white rounded-lg p-3 flex-shrink-0">
            <p className="text-xs">{coupon.title}</p>
            {coupon.amount > 0 ? (
              <p className="text-xl font-bold mt-1">¥{coupon.amount}</p>
            ) : (
              <p className="text-lg font-bold mt-1">免运费</p>
            )}
            {coupon.minOrder > 0 && <p className="text-xs opacity-80 mt-1">满{coupon.minOrder}可用</p>}
          </div>
        ))}
      </div>
    </div>
  );
}
