import { useEffect, useState, useCallback, useMemo } from "react";
import { request } from "../../api";
import type { Product } from "../../types";
import BannerCarousel from "./components/BannerCarousel";
import CountdownTimer from "./components/CountdownTimer";
import AnnouncementBar from "./components/AnnouncementBar";
import CategoryNav from "./components/CategoryNav";
import Marquee from "./components/Marquee";
import ImageText from "./components/ImageText";
import CouponDisplay from "./components/CouponDisplay";

interface DecorationComponent {
  id: string;
  type: string;
  sortOrder: number;
  config: Record<string, unknown>;
}

interface ShopDecoration {
  id: string;
  name: string;
  components: DecorationComponent[];
}

export default function ShopHome() {
  const [decoration, setDecoration] = useState<ShopDecoration | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDecoration();
    fetchProducts();
  }, []);

  const fetchDecoration = async () => {
    try {
      const res = await apiClient<{ data: ShopDecoration }>("/shop/decorations/active");
      setDecoration(res.data);
    } catch {
      // 如果没有装修配置，使用默认
      setDecoration(null);
    }
  };

  const fetchProducts = async () => {
    try {
      const res = await apiClient<{ data: Product[] }>("/products");
      setProducts(res.data);
    } catch (err) {
      console.error("Failed to fetch products", err);
    } finally {
      setLoading(false);
    }
  };

  const renderComponent = useCallback((component: DecorationComponent) => {
    const cfg = component.config || {};
    switch (component.type) {
      case "BANNER":
        return <BannerCarousel key={component.id} items={cfg.items as any[]} />;
      case "PRODUCT_GRID":
        return (
          <div key={component.id} className="py-4">
            <h2 className="text-lg font-bold mb-3 px-4">{(cfg.title as string) || "精选商品"}</h2>
            <div className="grid grid-cols-2 gap-3 px-4">
              {products.slice(0, (cfg.limit as number) || 4).map(p => (
                <div key={p.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <img src={p.mainImage || "https://placehold.co/300x400"} alt={p.name} className="w-full h-40 object-cover" loading="lazy" />
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-red-500 text-sm">¥{p.dailyRentalPrice}/天</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      case "COUPON":
        return <CouponDisplay key={component.id} />;
      case "COUNTDOWN":
        return <CountdownTimer key={component.id} targetDate={cfg.targetDate as string} title={cfg.title as string} />;
      case "ANNOUNCEMENT":
        return <AnnouncementBar key={component.id} content={cfg.content as string} />;
      case "CATEGORY_NAV":
        return <CategoryNav key={component.id} items={cfg.items as any[]} />;
      case "MARQUEE":
        return <Marquee key={component.id} text={cfg.text as string} />;
      case "IMAGE_TEXT":
        return <ImageText key={component.id} items={cfg.items as any[]} />;
      default:
        return null;
    }
  }, [products]);

  const sortedComponents = useMemo(() => {
    if (!decoration) return [];
    return [...decoration.components].sort((a, b) => a.sortOrder - b.sortOrder);
  }, [decoration]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-pulse text-gray-400">加载中...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 pb-16">
      {decoration ? (
        sortedComponents.map(renderComponent)
      ) : (
        // 默认首页
        <div>
          <div className="bg-gradient-to-r from-amber-700 to-amber-900 text-white p-6 text-center">
            <h1 className="text-2xl font-bold">多金喜服装租赁</h1>
            <p className="text-sm mt-2 opacity-80">高端礼服 · 品质租赁 · 专业清洗</p>
          </div>
          <div className="p-4">
            <h2 className="text-lg font-bold mb-3">热门商品</h2>
            <div className="grid grid-cols-2 gap-3">
              {products.slice(0, 6).map(p => (
                <div key={p.id} className="bg-white rounded-lg shadow overflow-hidden">
                  <img src={p.mainImage || "https://placehold.co/300x400"} alt={p.name} className="w-full h-40 object-cover" loading="lazy" />
                  <div className="p-2">
                    <p className="text-sm font-medium truncate">{p.name}</p>
                    <p className="text-red-500 text-sm">¥{p.dailyRentalPrice}/天</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
