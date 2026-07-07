import { useEffect, useState, useMemo, useRef, useCallback } from "react";
import { apiClient } from "../../api";
import type { Product } from "../../types";

export default function ProductList() {
  const [products, setProducts] = useState<Product[]>([]);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(true);
  const [filter, setFilter] = useState({ category: "", style: "", minPrice: "", maxPrice: "" });
  const [search, setSearch] = useState("");
  const observerRef = useRef<HTMLDivElement>(null);

  const fetchProducts = useCallback(async (pageNum: number, append = false) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append("page", String(pageNum));
      params.append("limit", "20");
      if (filter.category) params.append("category", filter.category);
      if (filter.style) params.append("style", filter.style);
      if (filter.minPrice) params.append("minPrice", filter.minPrice);
      if (filter.maxPrice) params.append("maxPrice", filter.maxPrice);
      if (search) params.append("search", search);

      const res = await apiClient<{ data: Product[]; total: number }>(`/products?${params}`);
      setProducts(prev => append ? [...prev, ...res.data] : res.data);
      setHasMore(res.data.length >= 20);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [filter, search]);

  useEffect(() => {
    setPage(1);
    fetchProducts(1, false);
  }, [filter, search, fetchProducts]);

  useEffect(() => {
    const el = observerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting && !loading && hasMore) {
        setPage(p => {
          const next = p + 1;
          fetchProducts(next, true);
          return next;
        });
      }
    }, { rootMargin: "100px" });
    observer.observe(el);
    return () => observer.disconnect();
  }, [loading, hasMore, fetchProducts]);

  return (
    <div className="min-h-screen bg-gray-50 pb-8">
      <div className="bg-white p-3 sticky top-0 z-10 shadow-sm">
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="搜索商品..."
          className="w-full px-3 py-2 border rounded-lg text-sm"
        />
        <div className="flex gap-2 mt-2 overflow-x-auto">
          {["全部分类", "晚礼服", "旗袍", "西装", "汉服"].map(c => (
            <button
              key={c}
              onClick={() => setFilter(f => ({ ...f, category: c === "全部分类" ? "" : c }))}
              className={`px-3 py-1 text-xs rounded-full whitespace-nowrap ${filter.category === c || (c === "全部分类" && !filter.category) ? "bg-amber-700 text-white" : "bg-gray-100"}`}
            >
              {c}
            </button>
          ))}
        </div>
      </div>
      <div className="grid grid-cols-2 gap-3 p-3">
        {products.map(p => (
          <div key={p.id} className="bg-white rounded-lg shadow overflow-hidden">
            <img src={p.mainImage || "https://placehold.co/300x400"} alt={p.name} className="w-full h-40 object-cover" loading="lazy" />
            <div className="p-2">
              <p className="text-sm font-medium truncate">{p.name}</p>
              <p className="text-xs text-gray-400">{p.category}</p>
              <p className="text-red-500 text-sm font-bold mt-1">¥{p.dailyRentalPrice}/天</p>
              <p className="text-xs text-gray-400">押金 ¥{p.depositAmount}</p>
            </div>
          </div>
        ))}
      </div>
      <div ref={observerRef} className="h-10 flex items-center justify-center">
        {loading && <span className="text-gray-400 text-sm">加载中...</span>}
        {!hasMore && products.length > 0 && <span className="text-gray-400 text-sm">没有更多了</span>}
      </div>
    </div>
  );
}
