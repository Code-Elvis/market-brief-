// src/useUsage.js
// Tracks daily brief usage with localStorage.
// Now also computes trial status from Clerk publicMetadata.

import { useState, useEffect } from "react";

const DAILY_FREE_LIMIT = 3;
const TRIAL_DAYS = 7;

export function useUsage(userId, isPro, user) {
  // ── Trial computation ────────────────────────────────────────────────────
  const trialStart = user?.publicMetadata?.trial_start;
  const isOnTrial  = trialStart
    ? (Date.now() - new Date(trialStart).getTime()) < TRIAL_DAYS * 24 * 60 * 60 * 1000
    : false;
  const daysLeft = trialStart
    ? Math.max(0, TRIAL_DAYS - Math.floor(
        (Date.now() - new Date(trialStart).getTime()) / (24 * 60 * 60 * 1000)
      ))
    : 0;

  // Trial users get the same access as paid Pro
  const effectivelyPro = isPro || isOnTrial;

  // ── Daily usage tracking ─────────────────────────────────────────────────
  const storageKey = userId ? `usage_${userId}` : null;
  const today = new Date().toISOString().slice(0, 10);

  const [count, setCount] = useState(() => {
    if (!storageKey) return 0;
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || "{}");
      return stored.date === today ? (stored.count || 0) : 0;
    } catch { return 0; }
  });

  // Reset count if day has rolled over
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
    if (effectivelyPro) return; // No tracking needed for Pro/trial users
    setCount(prev => {
      const next = prev + 1;
      try {
        localStorage.setItem(storageKey, JSON.stringify({ date: today, count: next }));
      } catch {}
      return next;
    });
  };

  const canBrief   = effectivelyPro || count < DAILY_FREE_LIMIT;
  const remaining  = effectivelyPro ? Infinity : Math.max(0, DAILY_FREE_LIMIT - count);

  return { increment, canBrief, remaining, isOnTrial, daysLeft, effectivelyPro };
}
