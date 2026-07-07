interface ImageTextItem {
  image?: string;
  title?: string;
  description?: string;
  link?: string;
}

const DEFAULT_ITEMS: ImageTextItem[] = [
  { title: "品质保证", description: "一单一清洗，入库前消毒熨烫", image: "" },
  { title: "极速发货", description: "下单后24小时内发货", image: "" },
];

export default function ImageText({ items }: { items?: ImageTextItem[] }) {
  const list = items && items.length > 0 ? items : DEFAULT_ITEMS;
  return (
    <div className="px-4 py-4">
      <div className="grid grid-cols-2 gap-3">
        {list.map((item, i) => (
          <div key={i} className="bg-white rounded-lg p-4 text-center shadow-sm">
            {item.image && <img src={item.image} alt={item.title} className="w-12 h-12 mx-auto mb-2 rounded" />}
            <h3 className="text-sm font-bold">{item.title}</h3>
            <p className="text-xs text-gray-500 mt-1">{item.description}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
