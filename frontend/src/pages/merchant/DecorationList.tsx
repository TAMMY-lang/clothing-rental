import { useState, useMemo } from "react";
import type { ShopDecorationRecord } from "./ShopDecoration";

export default function DecorationList({
  records,
  onCreate,
  onEdit,
  onDelete,
  onPreview,
  onTogglePublish
}: {
  records: ShopDecorationRecord[];
  onCreate?: () => void;
  onEdit?: (record: ShopDecorationRecord) => void;
  onDelete?: (record: ShopDecorationRecord) => void;
  onPreview?: (record: ShopDecorationRecord) => void;
  onTogglePublish?: (record: ShopDecorationRecord) => void;
}) {
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PUBLISHED" | "DRAFT" | "EXPIRED">("ALL");

  const filtered = useMemo(() => {
    return records.filter((r) => {
      const matchSearch = !search || r.name.includes(search) || r.templateName.includes(search);
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [records, search, statusFilter]);

  function statusBadge(status: string) {
    switch (status) {
      case "PUBLISHED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
            已发布
          </span>
        );
      case "DRAFT":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            草稿
          </span>
        );
      case "EXPIRED":
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">
            已过期
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            {status}
          </span>
        );
    }
  }

  function formatDate(dateString?: string) {
    if (!dateString) return "-";
    const d = new Date(dateString);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex flex-wrap items-center justify-between gap-4 p-5 border-b border-gray-200 bg-white/80 backdrop-blur-sm">
        <h2 className="text-lg font-bold text-gray-900">装修方案列表</h2>
        <button
          type="button"
          onClick={onCreate}
          className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
        >
          + 新建装修
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-3 p-4 border-b border-gray-200 bg-gray-50/60">
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜索名称或模板"
          className="w-64 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
        />
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value as typeof statusFilter)}
          className="px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
        >
          <option value="ALL">全部状态</option>
          <option value="PUBLISHED">已发布</option>
          <option value="DRAFT">草稿</option>
          <option value="EXPIRED">已过期</option>
        </select>
      </div>

      <div className="flex-1 overflow-auto p-4">
        <div className="bg-white border border-gray-200 rounded-2xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  名称
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  模板类型
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  生效时间
                </th>
                <th className="px-6 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  状态
                </th>
                <th className="px-6 py-3 text-right text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  操作
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filtered.map((record) => (
                <tr key={record.id} className="hover:bg-gray-50/60 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900">{record.name}</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      {record.components.length} 个组件
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-md text-xs font-medium bg-blue-50 text-blue-700">
                      {record.templateName}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-700">
                      {formatDate(record.startDate)} ~ {formatDate(record.endDate)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">{statusBadge(record.status)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        type="button"
                        onClick={() => onPreview?.(record)}
                        className="px-2.5 py-1.5 text-xs font-medium text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        预览
                      </button>
                      <button
                        type="button"
                        onClick={() => onEdit?.(record)}
                        className="px-2.5 py-1.5 text-xs font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                      >
                        编辑
                      </button>
                      <button
                        type="button"
                        onClick={() => onTogglePublish?.(record)}
                        className={`px-2.5 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                          record.status === "PUBLISHED"
                            ? "text-orange-600 bg-orange-50 hover:bg-orange-100"
                            : "text-green-600 bg-green-50 hover:bg-green-100"
                        }`}
                      >
                        {record.status === "PUBLISHED" ? "停用" : "发布"}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          if (window.confirm(`确定删除装修方案「${record.name}」吗？`)) {
                            onDelete?.(record);
                          }
                        }}
                        className="px-2.5 py-1.5 text-xs font-medium text-red-600 bg-red-50 rounded-lg hover:bg-red-100 transition-colors"
                      >
                        删除
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-12 text-center text-gray-400 text-sm">
                    暂无装修方案，点击右上角"新建装修"创建
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
