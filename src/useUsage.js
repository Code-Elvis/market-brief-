// useUsage.js — usage tracking tied to email (harder to game than userId)
import { useState, useEffect } from "react";

export const FREE_LIMIT = 5;

export function useUsage(user, isPro) {
  const email = user?.primaryEmailAddress?.emailAddress || user?.id || "anon";
  const today = new Date().toISOString().split("T")[0];
  const key = `usage_${btoa(email)}_${today}`;

  const getCount = () => {
    try { return parseInt(localStorage.getItem(key) || "0", 10); }
    catch { return 0; }
  };

  const [count, setCount] = useState(getCount);

  useEffect(() => {
    setCount(getCount());
  }, [email, today]);

  const increment = () => {
    if (isPro) return;
    const next = getCount() + 1;
    try { localStorage.setItem(key, String(next)); } catch {}
    setCount(next);
  };

  if (isPro) return { count: 0, increment, canBrief: true, remaining: Infinity, limit: Infinity };

  const remaining = Math.max(0, FREE_LIMIT - count);
  return { count, increment, canBrief: count < FREE_LIMIT, remaining, limit: FREE_LIMIT };
}
