import { useState, useEffect } from "react";

export default function AnnouncementBar({ content }: { content?: string }) {
  const text = content || "欢迎光临多金喜服装租赁！新用户首单立减50元，全场包邮～";
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    setVisible(true);
  }, [text]);

  if (!visible) return null;

  return (
    <div className="bg-amber-50 text-amber-800 px-4 py-2 flex items-center justify-between">
      <p className="text-sm truncate flex-1">{text}</p>
      <button onClick={() => setVisible(false)} className="ml-2 text-amber-400 text-lg leading-none">&times;</button>
    </div>
  );
}
