import { useState } from "react";

export type ShopDecorationRecord = {
  id: string;
  name: string;
  status: string;
  template?: string;
};

const COMPONENT_TYPES = [
  { type: "banner", name: "轮播图", icon: "🖼️" },
  { type: "product_grid", name: "商品网格", icon: "🛍️" },
  { type: "coupon", name: "优惠券", icon: "🎫" },
  { type: "countdown", name: "倒计时", icon: "⏰" },
  { type: "announcement", name: "公告", icon: "📢" },
  { type: "category_nav", name: "分类导航", icon: "📂" },
  { type: "marquee", name: "跑马灯", icon: "📜" },
  { type: "image_text", name: "图文", icon: "📝" },
];

export default function ShopDecoration({
  initialData,
  onSave,
  onPublish,
  onBack,
}: {
  initialData?: ShopDecorationRecord;
  onSave?: (r: ShopDecorationRecord) => void;
  onPublish?: (r: ShopDecorationRecord) => void;
  onBack?: () => void;
}) {
  const [name, setName] = useState(initialData?.name || "");
  const [selectedComponents, setSelectedComponents] = useState<string[]>([]);

  const toggleComponent = (type: string) => {
    setSelectedComponents((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type]
    );
  };

  const handleSave = () => {
    const record: ShopDecorationRecord = {
      id: initialData?.id || String(Date.now()),
      name: name || "未命名装修",
      status: "DRAFT",
    };
    onSave?.(record);
  };

  const handlePublish = () => {
    const record: ShopDecorationRecord = {
      id: initialData?.id || String(Date.now()),
      name: name || "未命名装修",
      status: "PUBLISHED",
    };
    onPublish?.(record);
  };

  return (
    <div className="p-6 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">店铺装修</h2>
        <div className="flex gap-2">
          <button onClick={onBack} className="px-4 py-2 border rounded">返回</button>
          <button onClick={handleSave} className="px-4 py-2 bg-gray-200 rounded">保存草稿</button>
          <button onClick={handlePublish} className="px-4 py-2 bg-amber-700 text-white rounded">发布</button>
        </div>
      </div>
      <div className="mb-4">
        <label className="block text-sm font-medium mb-1">装修名称</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="w-full px-3 py-2 border rounded"
          placeholder="例如：春节活动装修"
        />
      </div>
      <h3 className="font-bold mb-3">选择组件</h3>
      <div className="grid grid-cols-4 gap-3">
        {COMPONENT_TYPES.map((c) => (
          <button
            key={c.type}
            onClick={() => toggleComponent(c.type)}
            className={`p-4 rounded-lg border-2 text-center ${selectedComponents.includes(c.type) ? "border-amber-700 bg-amber-50" : "border-gray-200"}`}
          >
            <div className="text-2xl mb-1">{c.icon}</div>
            <div className="text-sm">{c.name}</div>
          </button>
        ))}
      </div>
      {selectedComponents.length > 0 && (
        <div className="mt-4 p-4 bg-gray-50 rounded">
          <p className="text-sm text-gray-600">已选择：{selectedComponents.length} 个组件</p>
        </div>
      )}
    </div>
  );
}
