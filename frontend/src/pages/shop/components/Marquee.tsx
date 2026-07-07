export default function Marquee({ text }: { text?: string }) {
  const content = text || "🎉 新品上架 | 满200减30 | 全场包邮 | 限时特惠 🎉";
  return (
    <div className="bg-red-600 text-white py-1 overflow-hidden">
      <div className="animate-[scroll_15s_linear_infinite] whitespace-nowrap text-sm">
        {content}&nbsp;&nbsp;&nbsp;&nbsp;{content}&nbsp;&nbsp;&nbsp;&nbsp;
      </div>
      <style>{`
        @keyframes scroll {
          0% { transform: translateX(100%); }
          100% { transform: translateX(-100%); }
        }
      `}</style>
    </div>
  );
}
