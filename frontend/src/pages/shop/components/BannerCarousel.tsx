import { useState, useEffect } from "react";

interface BannerItem {
  image?: string;
  title?: string;
  link?: string;
  bgColor?: string;
  textColor?: string;
}

const DEFAULT_BANNERS: BannerItem[] = [
  { title: "春季新品上市", bgColor: "#f59e0b", textColor: "#fff", image: "" },
  { title: "全场低至3折", bgColor: "#ef4444", textColor: "#fff", image: "" },
  { title: "新用户首单立减50", bgColor: "#8b5cf6", textColor: "#fff", image: "" },
];

export default function BannerCarousel({ items }: { items?: BannerItem[] }) {
  const banners = items && items.length > 0 ? items : DEFAULT_BANNERS;
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrent((prev) => (prev + 1) % banners.length);
    }, 3000);
    return () => clearInterval(timer);
  }, [banners.length]);

  return (
    <div className="relative w-full h-40 overflow-hidden">
      {banners.map((banner, i) => (
        <div
          key={i}
          className="absolute inset-0 flex items-center justify-center transition-opacity duration-500"
          style={{
            backgroundColor: banner.bgColor || "#f59e0b",
            color: banner.textColor || "#fff",
            opacity: current === i ? 1 : 0,
          }}
        >
          {banner.image ? (
            <img src={banner.image} alt={banner.title} className="w-full h-full object-cover" />
          ) : (
            <span className="text-xl font-bold">{banner.title}</span>
          )}
        </div>
      ))}
      <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
        {banners.map((_, i) => (
          <button
            key={i}
            onClick={() => setCurrent(i)}
            className={`w-2 h-2 rounded-full transition-all ${current === i ? "bg-white w-4" : "bg-white/50"}`}
          />
        ))}
      </div>
    </div>
  );
}
