const DEFAULT_CATEGORIES = [
  { name: "晚礼服", icon: "👗" },
  { name: "旗袍", icon: "👘" },
  { name: "西装", icon: "🤵" },
  { name: "汉服", icon: "🏯" },
  { name: "亲子装", icon: "👨‍👩‍👧" },
];

interface CategoryItem {
  name: string;
  icon?: string;
  link?: string;
}

export default function CategoryNav({ items }: { items?: CategoryItem[] }) {
  const categories = items && items.length > 0 ? items : DEFAULT_CATEGORIES;

  return (
    <div className="py-4 px-4">
      <div className="flex overflow-x-auto gap-4 pb-2">
        {categories.map((cat, i) => (
          <button
            key={i}
            className="flex flex-col items-center gap-1 min-w-[4rem]"
            onClick={() => cat.link && window.open(cat.link, "_blank")}
          >
            <span className="text-2xl">{cat.icon || "🏷️"}</span>
            <span className="text-xs text-gray-600 whitespace-nowrap">{cat.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
