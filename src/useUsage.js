import { useState, useEffect } from "react";

const FREE_LIMIT = 5;

function getTodayKey(userId) {
  const today = new Date().toISOString().slice(0, 10);
  return `usage_${userId}_${today}`;
}

export function useUsage(userId, isPro) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!userId) return;
    const key = getTodayKey(userId);
    const stored = parseInt(localStorage.getItem(key) || "0", 10);
    setCount(stored);
  }, [userId]);

  const increment = () => {
    if (!userId) return;
    const key = getTodayKey(userId);
    const next = count + 1;
    localStorage.setItem(key, String(next));
    setCount(next);
  };

  const canBrief = isPro || count < FREE_LIMIT;
  const remaining = isPro ? Infinity : Math.max(0, FREE_LIMIT - count);

  return { count, increment, canBrief, remaining, limit: FREE_LIMIT };
}
