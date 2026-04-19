// src/useUsage.js
// Tracks daily brief usage.
// Trial status is driven by Stripe via publicMetadata.on_trial (set by stripe-webhook.js).
// isPro = publicMetadata.pro === true (paid subscriber)
// isOnTrial = publicMetadata.on_trial === true (card collected, within 7-day trial)
// effectivelyPro = isPro || isOnTrial

import { useState, useEffect } from "react";

const DAILY_FREE_LIMIT = 3;

export function useUsage(userId, isPro, user) {
  // Trial status comes from Stripe webhook via Clerk publicMetadata
  const isOnTrial     = user?.publicMetadata?.on_trial === true;
  const effectivelyPro = isPro || isOnTrial;

  // Daily usage tracking via localStorage
  const storageKey = userId ? `usage_${userId}` : null;
  const today = new Date().toISOString().slice(0, 10);

  const [count, setCount] = useState(() => {
    if (!storageKey) return 0;
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return stored.date === today ? (stored.count || 0) : 0;
    } catch { return 0; }
  });

  useEffect(() => {
    if (!storageKey) return;
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      if (stored.date !== today) {
        setCount(0);
        localStorage.setItem(storageKey, JSON.stringify({ date: today, count: 0 }));
      }
    } catch {}
  }, [storageKey, today]);

  const increment = () => {
    if (effectivelyPro) return;
    setCount(prev => {
      const next = prev + 1;
      try {
        localStorage.setItem(storageKey, JSON.stringify({ date: today, count: next }));
      } catch {}
      return next;
    });
  };

  const canBrief  = effectivelyPro || count < DAILY_FREE_LIMIT;
  const remaining = effectivelyPro ? Infinity : Math.max(0, DAILY_FREE_LIMIT - count);

  return { increment, canBrief, remaining, isOnTrial, effectivelyPro };
}
