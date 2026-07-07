import { useState, useEffect } from "react";

export default function CountdownTimer({ targetDate, title }: { targetDate?: string; title?: string }) {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const target = targetDate ? new Date(targetDate) : new Date(Date.now() + 3 * 24 * 3600 * 1000);
  const displayTitle = title || "限时特惠";

  useEffect(() => {
    const timer = setInterval(() => {
      const now = Date.now();
      const diff = Math.max(0, target.getTime() - now);
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((diff / (1000 * 60)) % 60),
        seconds: Math.floor((diff / 1000) % 60),
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [target]);

  return (
    <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white p-4 mx-4 mt-4 rounded-lg text-center">
      <p className="text-sm font-bold mb-2">{displayTitle}</p>
      <div className="flex justify-center gap-2">
        {[
          { v: timeLeft.days, l: "天" },
          { v: timeLeft.hours, l: "时" },
          { v: timeLeft.minutes, l: "分" },
          { v: timeLeft.seconds, l: "秒" },
        ].map((item, i) => (
          <div key={i} className="bg-black/30 rounded px-2 py-1">
            <span className="text-xl font-bold">{String(item.v).padStart(2, "0")}</span>
            <span className="text-xs ml-1">{item.l}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
