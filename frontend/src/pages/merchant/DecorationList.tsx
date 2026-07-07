import { useState } from "react";
import type { ShopDecorationRecord } from "./ShopDecoration";

export default function DecorationList({
  records,
  onCreate,
  onEdit,
  onDelete,
  onPreview,
  onTogglePublish,
}: {
  records: ShopDecorationRecord[];
  onCreate?: () => void;
  onEdit?: (r: ShopDecorationRecord) => void;
  onDelete?: (r: ShopDecorationRecord) => void;
  onPreview?: (r: ShopDecorationRecord) => void;
  onTogglePublish?: (r: ShopDecorationRecord) => void;
}) {
  const [filter, setFilter] = useState("");

  const filtered = records.filter((r) => r.name.includes(filter));

  return (
    <div className="p-6 bg-white rounded-lg">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-xl font-bold">装修列表</h2>
        <button onClick={onCreate} className="px-4 py-2 bg-amber-700 text-white rounded">新建装修</button>
      </div>
      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        className="w-full px-3 py-2 border rounded mb-4"
        placeholder="搜索装修..."
      />
      {filtered.length === 0 ? (
        <p className="text-gray-400 text-center py-8">暂无装修记录</p>
      ) : (
        <table className="w-full">
          <thead>
            <tr className="border-b">
              <th className="text-left py-2">名称</th>
              <th className="text-left py-2">状态</th>
              <th className="text-right py-2">操作</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => (
              <tr key={r.id} className="border-b">
                <td className="py-2">{r.name}</td>
                <td className="py-2">
                  <span className={`px-2 py-1 rounded text-xs ${r.status === "PUBLISHED" ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"}`}>
                    {r.status === "PUBLISHED" ? "已发布" : "草稿"}
                  </span>
                </td>
                <td className="py-2 text-right">
                  <button onClick={() => onEdit?.(r)} className="text-blue-600 text-sm mr-2">编辑</button>
                  <button onClick={() => onTogglePublish?.(r)} className="text-amber-700 text-sm mr-2">
                    {r.status === "PUBLISHED" ? "停用" : "发布"}
                  </button>
                  <button onClick={() => onDelete?.(r)} className="text-red-500 text-sm">删除</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
