import { useState, useCallback, useRef } from "react";

export type DecorationComponentType =
  | "banner"
  | "product_grid"
  | "coupon"
  | "countdown"
  | "announcement"
  | "category_nav"
  | "marquee"
  | "image_text";

export type DecorationComponentData = {
  id: string;
  type: DecorationComponentType;
  title?: string;
  content?: string;
  image?: string;
  link?: string;
  backgroundColor?: string;
  textColor?: string;
  sortOrder: number;
};

export type DecorationTemplate =
  | "spring_festival"
  | "double_eleven"
  | "anniversary"
  | "new_arrival"
  | "custom";

export type ShopDecorationRecord = {
  id: string;
  name: string;
  template: DecorationTemplate;
  templateName: string;
  startDate: string;
  endDate: string;
  status: "PUBLISHED" | "DRAFT" | "EXPIRED";
  components: DecorationComponentData[];
  createdAt: string;
  updatedAt: string;
};

const componentLabels: Record<DecorationComponentType, string> = {
  banner: "Banner 轮播",
  product_grid: "商品网格",
  coupon: "优惠券",
  countdown: "倒计时",
  announcement: "店铺公告",
  category_nav: "分类导航",
  marquee: "跑马灯",
  image_text: "图文组件"
};

const templateOptions: { value: DecorationTemplate; label: string; description: string }[] = [
  { value: "spring_festival", label: "春节", description: "红色喜庆风格，适合春节促销" },
  { value: "double_eleven", label: "双十一", description: "橙色狂欢风格，适合大促活动" },
  { value: "anniversary", label: "店庆", description: "金色庆典风格，适合周年庆" },
  { value: "new_arrival", label: "新品上市", description: "清新简约风格，适合新品发布" },
  { value: "custom", label: "自定义", description: "空白模板，自由搭建" }
];

const templateStyles: Record<DecorationTemplate, { bg: string; accent: string; previewClass: string }> = {
  spring_festival: { bg: "#FFF5F5", accent: "#C53030", previewClass: "bg-red-50 border-red-200" },
  double_eleven: { bg: "#FFF7ED", accent: "#EA580C", previewClass: "bg-orange-50 border-orange-200" },
  anniversary: { bg: "#FFFBEB", accent: "#B45309", previewClass: "bg-amber-50 border-amber-200" },
  new_arrival: { bg: "#F0FDF4", accent: "#15803D", previewClass: "bg-green-50 border-green-200" },
  custom: { bg: "#F9FAFB", accent: "#374151", previewClass: "bg-gray-50 border-gray-200" }
};

function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function formatDateInput(date?: string | Date) {
  if (!date) return "";
  const d = typeof date === "string" ? new Date(date) : date;
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}-${mm}-${dd}`;
}

export default function ShopDecoration({
  initialData,
  onSave,
  onPublish,
  onBack
}: {
  initialData?: ShopDecorationRecord;
  onSave?: (data: ShopDecorationRecord) => void;
  onPublish?: (data: ShopDecorationRecord) => void;
  onBack?: () => void;
}) {
  const [name, setName] = useState(initialData?.name ?? "");
  const [template, setTemplate] = useState<DecorationTemplate>(initialData?.template ?? "custom");
  const [startDate, setStartDate] = useState(initialData?.startDate ? formatDateInput(initialData.startDate) : "");
  const [endDate, setEndDate] = useState(initialData?.endDate ? formatDateInput(initialData.endDate) : "");
  const [components, setComponents] = useState<DecorationComponentData[]>(
    initialData?.components?.map((c) => ({ ...c })) ?? []
  );
  const [selectedComponentId, setSelectedComponentId] = useState<string | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [isPreview, setIsPreview] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [pendingImageComponentId, setPendingImageComponentId] = useState<string | null>(null);

  const selectedComponent = components.find((c) => c.id === selectedComponentId) ?? null;

  const handleDragStart = useCallback((event: React.DragEvent, type: DecorationComponentType) => {
    event.dataTransfer.setData("componentType", type);
    event.dataTransfer.effectAllowed = "copy";
  }, []);

  const handleDragOver = useCallback((event: React.DragEvent, index?: number) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = "copy";
    if (typeof index === "number") {
      setDragOverIndex(index);
    }
  }, []);

  const handleDragLeave = useCallback(() => {
    setDragOverIndex(null);
  }, []);

  const handleDrop = useCallback(
    (event: React.DragEvent, dropIndex?: number) => {
      event.preventDefault();
      const type = event.dataTransfer.getData("componentType") as DecorationComponentType;
      if (!type || !componentLabels[type]) return;

      const newComponent: DecorationComponentData = {
        id: generateId(),
        type,
        title: componentLabels[type],
        content: "",
        sortOrder: components.length
      };

      setComponents((prev) => {
        const next = [...prev];
        const idx = typeof dropIndex === "number" ? dropIndex : next.length;
        next.splice(idx, 0, newComponent);
        return next.map((c, i) => ({ ...c, sortOrder: i }));
      });
      setSelectedComponentId(newComponent.id);
      setDragOverIndex(null);
    },
    [components.length]
  );

  const handleMoveComponent = useCallback((id: string, direction: "up" | "down") => {
    setComponents((prev) => {
      const index = prev.findIndex((c) => c.id === id);
      if (index === -1) return prev;
      if (direction === "up" && index === 0) return prev;
      if (direction === "down" && index === prev.length - 1) return prev;
      const next = [...prev];
      const swapIndex = direction === "up" ? index - 1 : index + 1;
      [next[index], next[swapIndex]] = [next[swapIndex], next[index]];
      return next.map((c, i) => ({ ...c, sortOrder: i }));
    });
  }, []);

  const handleDeleteComponent = useCallback((id: string) => {
    setComponents((prev) => prev.filter((c) => c.id !== id).map((c, i) => ({ ...c, sortOrder: i })));
    setSelectedComponentId((prev) => (prev === id ? null : prev));
  }, []);

  const handleUpdateComponent = useCallback((id: string, updates: Partial<DecorationComponentData>) => {
    setComponents((prev) => prev.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }, []);

  const handleImageUpload = useCallback(
    async (file: File, componentId: string) => {
      // 使用本地预览（项目中没有通用的图片上传接口用于装修）
      const url = URL.createObjectURL(file);
      handleUpdateComponent(componentId, { image: url });
    },
    [handleUpdateComponent]
  );

  const buildRecord = useCallback((): ShopDecorationRecord => {
    return {
      id: initialData?.id ?? generateId(),
      name: name || "未命名装修",
      template,
      templateName: templateOptions.find((t) => t.value === template)?.label ?? "自定义",
      startDate: startDate ? new Date(startDate).toISOString() : new Date().toISOString(),
      endDate: endDate ? new Date(endDate).toISOString() : new Date().toISOString(),
      status: initialData?.status ?? "DRAFT",
      components: components.map((c) => ({ ...c })),
      createdAt: initialData?.createdAt ?? new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }, [initialData, name, template, startDate, endDate, components]);

  const handleSave = useCallback(async () => {
    setSaving(true);
    try {
      const record = buildRecord();
      await onSave?.(record);
    } finally {
      setSaving(false);
    }
  }, [buildRecord, onSave]);

  const handlePublish = useCallback(async () => {
    setSaving(true);
    try {
      const record = buildRecord();
      await onPublish?.({ ...record, status: "PUBLISHED" });
    } finally {
      setSaving(false);
    }
  }, [buildRecord, onPublish]);

  const handleTriggerImageUpload = useCallback((componentId: string) => {
    setPendingImageComponentId(componentId);
    fileInputRef.current?.click();
  }, []);

  const onFileChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const file = event.target.files?.[0];
      if (file && pendingImageComponentId) {
        handleImageUpload(file, pendingImageComponentId);
      }
      event.target.value = "";
      setPendingImageComponentId(null);
    },
    [pendingImageComponentId, handleImageUpload]
  );

  const templateStyle = templateStyles[template];

  return (
    <div className="flex flex-col h-full">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={onFileChange}
      />

      {/* 顶部工具栏 */}
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-gray-200 bg-white/80 backdrop-blur-sm sticky top-0 z-20">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              type="button"
              onClick={onBack}
              className="px-3 py-1.5 text-sm font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
            >
              返回
            </button>
          )}
          <h2 className="text-lg font-bold text-gray-900">店铺装修编辑器</h2>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsPreview((p) => !p)}
            className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
          >
            {isPreview ? "退出预览" : "预览"}
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 disabled:opacity-60 transition-colors"
          >
            {saving ? "保存中..." : "保存"}
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={saving}
            className="px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-lg hover:bg-green-700 disabled:opacity-60 transition-colors"
          >
            {saving ? "发布中..." : "发布"}
          </button>
        </div>
      </div>

      {/* 基本信息 */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 p-5 border-b border-gray-200 bg-white/60">
        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-gray-700 mb-1">装修名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="输入装修方案名称"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">生效开始日期</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">生效结束日期</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* 左侧模板与组件库 */}
        {!isPreview && (
          <aside className="w-64 flex-shrink-0 border-r border-gray-200 bg-gray-50/80 overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-3">选择模板</h3>
              <div className="space-y-2 mb-6">
                {templateOptions.map((t) => (
                  <button
                    key={t.value}
                    type="button"
                    onClick={() => setTemplate(t.value)}
                    className={`w-full text-left px-3 py-2.5 rounded-xl border text-sm transition-all ${
                      template === t.value
                        ? "border-blue-500 bg-blue-50 text-blue-700 shadow-sm"
                        : "border-gray-200 bg-white text-gray-700 hover:border-gray-300"
                    }`}
                  >
                    <div className="font-semibold">{t.label}</div>
                    <div className="text-xs text-gray-500 mt-0.5">{t.description}</div>
                  </button>
                ))}
              </div>

              <h3 className="text-sm font-bold text-gray-900 mb-3">组件库</h3>
              <p className="text-xs text-gray-500 mb-3">拖拽组件到右侧编辑区</p>
              <div className="grid grid-cols-2 gap-2">
                {(Object.keys(componentLabels) as DecorationComponentType[]).map((type) => (
                  <div
                    key={type}
                    draggable
                    onDragStart={(e) => handleDragStart(e, type)}
                    className="px-3 py-3 bg-white border border-gray-200 rounded-xl text-xs font-medium text-gray-700 cursor-move hover:border-blue-400 hover:shadow-sm transition-all text-center select-none"
                  >
                    {componentLabels[type]}
                  </div>
                ))}
              </div>
            </div>
          </aside>
        )}

        {/* 中间编辑区 / 预览区 */}
        <main className="flex-1 overflow-y-auto bg-gray-100/60">
          <div className="max-w-3xl mx-auto p-6">
            <div
              onDragOver={(e) => handleDragOver(e)}
              onDrop={(e) => handleDrop(e)}
              onDragLeave={handleDragLeave}
              className={`min-h-[600px] rounded-2xl border-2 border-dashed transition-all ${
                dragOverIndex === null && components.length === 0
                  ? "border-gray-300 bg-white/60"
                  : "border-transparent"
              }`}
            >
              {components.length === 0 && (
                <div className="flex flex-col items-center justify-center h-96 text-gray-400">
                  <svg className="w-12 h-12 mb-3 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <p className="text-sm">从左侧拖拽组件到此处</p>
                </div>
              )}

              <div className={`space-y-4 ${templateStyle.previewClass} rounded-2xl p-4 border`}>
                {components.map((component, index) => (
                  <div
                    key={component.id}
                    draggable={!isPreview}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDrop={(e) => {
                      handleDrop(e, index);
                    }}
                    onDragLeave={handleDragLeave}
                    onDragStart={(e) => {
                      e.dataTransfer.setData("moveComponentId", component.id);
                      e.dataTransfer.effectAllowed = "move";
                    }}
                    onDropCapture={(e) => {
                      const moveId = e.dataTransfer.getData("moveComponentId");
                      if (moveId && moveId !== component.id) {
                        e.preventDefault();
                        setComponents((prev) => {
                          const fromIndex = prev.findIndex((c) => c.id === moveId);
                          if (fromIndex === -1) return prev;
                          const next = [...prev];
                          const [moved] = next.splice(fromIndex, 1);
                          next.splice(index, 0, moved);
                          return next.map((c, i) => ({ ...c, sortOrder: i }));
                        });
                        setDragOverIndex(null);
                      }
                    }}
                    onClick={() => !isPreview && setSelectedComponentId(component.id)}
                    className={`relative rounded-xl transition-all ${
                      isPreview
                        ? ""
                        : selectedComponentId === component.id
                          ? "ring-2 ring-blue-500 shadow-md"
                          : "hover:ring-1 hover:ring-blue-300 cursor-pointer"
                    } ${dragOverIndex === index ? "border-t-4 border-blue-400" : ""}`}
                    style={{
                      backgroundColor: component.backgroundColor || "#ffffff",
                      color: component.textColor || "#1f2937"
                    }}
                  >
                    {!isPreview && (
                      <div className="absolute -top-3 right-2 flex items-center gap-1 opacity-0 group-hover:opacity-100 hover:opacity-100 z-10">
                        <div className="flex bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveComponent(component.id, "up");
                            }}
                            disabled={index === 0}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                            title="上移"
                          >
                            ↑
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleMoveComponent(component.id, "down");
                            }}
                            disabled={index === components.length - 1}
                            className="px-2 py-1 text-xs text-gray-600 hover:bg-gray-50 disabled:opacity-30"
                            title="下移"
                          >
                            ↓
                          </button>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteComponent(component.id);
                            }}
                            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50"
                            title="删除"
                          >
                            ×
                          </button>
                        </div>
                      </div>
                    )}

                    <div className="p-4">
                      <ComponentRenderer
                        component={component}
                        isPreview={isPreview}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </main>

        {/* 右侧属性面板 */}
        {!isPreview && selectedComponent && (
          <aside className="w-72 flex-shrink-0 border-l border-gray-200 bg-white overflow-y-auto">
            <div className="p-4">
              <h3 className="text-sm font-bold text-gray-900 mb-4">组件配置</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">标题</label>
                  <input
                    type="text"
                    value={selectedComponent.title ?? ""}
                    onChange={(e) => handleUpdateComponent(selectedComponent.id, { title: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">内容 / 文案</label>
                  <textarea
                    rows={3}
                    value={selectedComponent.content ?? ""}
                    onChange={(e) => handleUpdateComponent(selectedComponent.id, { content: e.target.value })}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 resize-y"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">链接</label>
                  <input
                    type="text"
                    value={selectedComponent.link ?? ""}
                    onChange={(e) => handleUpdateComponent(selectedComponent.id, { link: e.target.value })}
                    placeholder="https://"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">背景颜色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedComponent.backgroundColor || "#ffffff"}
                      onChange={(e) => handleUpdateComponent(selectedComponent.id, { backgroundColor: e.target.value })}
                      className="w-10 h-10 p-0 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedComponent.backgroundColor || ""}
                      onChange={(e) => handleUpdateComponent(selectedComponent.id, { backgroundColor: e.target.value })}
                      placeholder="#ffffff"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">文字颜色</label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={selectedComponent.textColor || "#1f2937"}
                      onChange={(e) => handleUpdateComponent(selectedComponent.id, { textColor: e.target.value })}
                      className="w-10 h-10 p-0 border border-gray-300 rounded-lg cursor-pointer"
                    />
                    <input
                      type="text"
                      value={selectedComponent.textColor || ""}
                      onChange={(e) => handleUpdateComponent(selectedComponent.id, { textColor: e.target.value })}
                      placeholder="#1f2937"
                      className="flex-1 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                    />
                  </div>
                </div>

                {(selectedComponent.type === "banner" ||
                  selectedComponent.type === "image_text" ||
                  selectedComponent.type === "coupon") && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 mb-1">图片</label>
                    {selectedComponent.image ? (
                      <div className="relative">
                        <img
                          src={selectedComponent.image}
                          alt="component"
                          className="w-full h-32 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleUpdateComponent(selectedComponent.id, { image: undefined })}
                          className="absolute top-1 right-1 px-2 py-1 text-xs text-white bg-red-500 rounded-md hover:bg-red-600"
                        >
                          移除
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleTriggerImageUpload(selectedComponent.id)}
                        className="w-full py-6 text-sm text-gray-500 border border-dashed border-gray-300 rounded-lg hover:border-blue-400 hover:text-blue-600 transition-colors"
                      >
                        + 上传图片
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
}

function ComponentRenderer({
  component,
  isPreview
}: {
  component: DecorationComponentData;
  isPreview: boolean;
}) {
  switch (component.type) {
    case "banner":
      return (
        <div className="text-center">
          {component.image ? (
            <img src={component.image} alt={component.title} className="w-full h-40 object-cover rounded-lg" />
          ) : (
            <div className="w-full h-40 flex items-center justify-center bg-gray-100 rounded-lg text-gray-400 text-sm">
              {isPreview ? "" : "Banner 图片区域"}
            </div>
          )}
          {component.title && <h4 className="mt-2 font-bold text-base">{component.title}</h4>}
          {component.content && <p className="mt-1 text-sm opacity-80">{component.content}</p>}
        </div>
      );

    case "product_grid":
      return (
        <div>
          {component.title && <h4 className="font-bold text-base mb-3">{component.title}</h4>}
          <div className="grid grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white/60 rounded-lg p-2 text-center">
                <div className="w-full h-20 bg-gray-200 rounded-md mb-2" />
                <div className="text-xs text-gray-500">商品 {i + 1}</div>
              </div>
            ))}
          </div>
          {component.content && <p className="mt-2 text-sm opacity-80">{component.content}</p>}
        </div>
      );

    case "coupon":
      return (
        <div className="flex items-center gap-4">
          {component.image && (
            <img src={component.image} alt="" className="w-16 h-16 object-cover rounded-lg" />
          )}
          <div className="flex-1">
            {component.title && <h4 className="font-bold text-base">{component.title}</h4>}
            {component.content && <p className="text-sm opacity-80">{component.content}</p>}
          </div>
          <div className="px-4 py-2 bg-red-500 text-white rounded-full text-sm font-bold">
            立即领取
          </div>
        </div>
      );

    case "countdown":
      return (
        <div className="text-center py-2">
          {component.title && <h4 className="font-bold text-base mb-2">{component.title}</h4>}
          <div className="inline-flex items-center gap-2 text-lg font-mono font-bold">
            <span className="px-2 py-1 bg-black/10 rounded">02</span>
            <span>:</span>
            <span className="px-2 py-1 bg-black/10 rounded">15</span>
            <span>:</span>
            <span className="px-2 py-1 bg-black/10 rounded">43</span>
          </div>
          {component.content && <p className="mt-2 text-sm opacity-80">{component.content}</p>}
        </div>
      );

    case "announcement":
      return (
        <div className="flex items-center gap-2 py-1">
          <span className="px-2 py-0.5 bg-red-500 text-white text-xs rounded font-bold">公告</span>
          <div className="flex-1 text-sm truncate">
            {component.content || component.title || "店铺公告内容"}
          </div>
        </div>
      );

    case "category_nav":
      return (
        <div>
          {component.title && <h4 className="font-bold text-base mb-2">{component.title}</h4>}
          <div className="grid grid-cols-5 gap-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="text-center">
                <div className="w-10 h-10 mx-auto bg-gray-200 rounded-full mb-1" />
                <div className="text-xs">分类{i + 1}</div>
              </div>
            ))}
          </div>
        </div>
      );

    case "marquee":
      return (
        <div className="overflow-hidden py-1">
          <div className="whitespace-nowrap text-sm animate-pulse">
            {component.content || component.title || "跑马灯滚动内容"}
          </div>
        </div>
      );

    case "image_text":
      return (
        <div className="flex gap-3">
          {component.image ? (
            <img src={component.image} alt="" className="w-24 h-24 object-cover rounded-lg" />
          ) : (
            <div className="w-24 h-24 bg-gray-200 rounded-lg flex-shrink-0" />
          )}
          <div className="flex-1">
            {component.title && <h4 className="font-bold text-base">{component.title}</h4>}
            {component.content && <p className="text-sm opacity-80 mt-1">{component.content}</p>}
          </div>
        </div>
      );

    default:
      return null;
  }
}
