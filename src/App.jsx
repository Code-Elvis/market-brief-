import { useState, useEffect, useCallback } from "react";
import { useUser, useClerk, SignIn, SignUp } from "@clerk/clerk-react";
import { useUsage } from "./useUsage.js";

const INSTRUMENTS = {
  euro: { label: "EUR/USD", aliases: ["euro","eurusd","eur","6e"], color: "#00d4ff", flag: "EU", optionsTicker: null },
  gbp:  { label: "GBP/USD", aliases: ["gbp","pound","cable","gbpusd","6b"], color: "#7fff7f", flag: "GB", optionsTicker: null },
  gold: { label: "XAU/USD Gold", aliases: ["gold","xauusd","xau","gc","gc1"], color: "#ffd700", flag: "XAU", optionsTicker: "GLD" },
  oil:  { label: "WTI Crude", aliases: ["oil","crude","wti","usoil","cl","cl1"], color: "#ff8c42", flag: "OIL", optionsTicker: "USO" },
  dxy:  { label: "US Dollar DXY", aliases: ["dxy","dollar","usd","dx"], color: "#c084fc", flag: "USD", optionsTicker: "UUP" },
  es:   { label: "ES S&P 500", aliases: ["es","es1","sp500","spx","spy","s&p"], color: "#00ffcc", flag: "ES", optionsTicker: "SPY" },
  nq:   { label: "NQ NASDAQ 100", aliases: ["nq","nq1","nasdaq","nas100","ndx","qqq"], color: "#f472b6", flag: "NQ", optionsTicker: "QQQ" },
  rty:  { label: "RTY Russell 2000", aliases: ["rty","russell","iwm"], color: "#fb923c", flag: "RTY", optionsTicker: "IWM" },
  ym:   { label: "YM Dow Jones", aliases: ["ym","ym1","dow","djia","dia"], color: "#a78bfa", flag: "YM", optionsTicker: "DIA" },
  btc:  { label: "Bitcoin", aliases: ["btc","bitcoin","crypto","btcusd"], color: "#f7931a", flag: "BTC", optionsTicker: null },
  eth:  { label: "Ethereum", aliases: ["eth","ethereum","ethusd"], color: "#627eea", flag: "ETH", optionsTicker: null },
  jpy:  { label: "USD/JPY", aliases: ["jpy","yen","usdjpy","6j"], color: "#ff6b6b", flag: "JPY", optionsTicker: null },
  aud:  { label: "AUD/USD", aliases: ["aud","aussie","audusd","6a"], color: "#34d399", flag: "AUD", optionsTicker: null },
  vix:  { label: "VIX Fear Index", aliases: ["vix","volatility","fear"], color: "#f87171", flag: "VIX", optionsTicker: "VIXY" },
};

const CHIPS = [
  { label: "ES", key: "es" }, { label: "NQ", key: "nq" }, { label: "Gold", key: "gold" },
  { label: "Oil", key: "oil" }, { label: "Euro", key: "euro" }, { label: "GBP", key: "gbp" },
  { label: "BTC", key: "btc" }, { label: "VIX", key: "vix" },
];

function detect(query) {
  const q = query.toLowerCase().trim();
  for (const [key, val] of Object.entries(INSTRUMENTS)) {
    if (val.aliases.some(a => a === q)) return { key, ...val };
  }
  for (const [key, val] of Object.entries(INSTRUMENTS)) {
    if (val.aliases.some(a => q.includes(a) || a.includes(q))) return { key, ...val };
  }
  return null;
}

function sysPrompt(mode) {
  const base = "You are a professional market intelligence analyst. Respond ONLY with valid JSON. No markdown, no backticks, no preamble. Start with { and end with }. CRITICAL: Do NOT quote specific price levels or index values — you do not have live market data. Focus only on macro drivers, events, central bank stance, and directional bias. Never say things like 'ES is at 5200' or 'Gold is at 2200' — these would be outdated. Instead describe sentiment, risks, and catalysts.";
  if (mode === "scalper") return base + ' SCALPER MODE schema: {"instrument":"string","risk_level":"GREEN|YELLOW|RED","risk_reason":"string","scalper_note":"string","breaking":[{"headline":"string","direction":"BULLISH|BEARISH|NEUTRAL","age":"string"}],"imminent":[{"event":"string","due_in":"string","expected_impact":"string"}]}';
  return base + ' FULL BRIEF schema: {"instrument":"string","sentiment":"bullish|bearish|neutral|mixed","headline_summary":"string","events":[{"title":"string","time":"string","impact":"HIGH|MEDIUM","direction":"BULLISH|BEARISH|NEUTRAL","summary":"string","why_it_moves_price":"string","confidence":"HIGH|MEDIUM|LOW"}],"geopolitical_risks":"string","key_levels_context":"string","teaching_moment":"string"}';
}

function userPrompt(inst, mode) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  if (mode === "scalper") return "Current date and time: " + now + ". I am about to trade " + inst.label + ". Give me a macro risk assessment for right now based on recent central bank policy, economic data releases, and geopolitical developments. Rate GREEN YELLOW or RED. Do not quote specific price levels.";
  return "Current date: " + now + ". Give me a full macro briefing for " + inst.label + " based on current central bank stance, upcoming high-impact events, geopolitical risks, and macro sentiment. Do not quote specific price levels — focus on drivers and direction.";
}

async function callClaude(system, userMsg) {
  const res = await fetch("/api/brief", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ model: "claude-sonnet-4-20250514", max_tokens: 1000, system, messages: [{ role: "user", content: userMsg }] }) });
  if (!res.ok) throw new Error("API error " + res.status);
  const data = await res.json();
  if (data.error) throw new Error(data.error.message || "API error");
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in response");
  return JSON.parse(match[0]);
}

async function getBriefing(inst, mode) { return callClaude(sysPrompt(mode), userPrompt(inst, mode)); }

async function getOptionsFlow(inst) {
  const res = await fetch("/api/options", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ instKey: inst.key, instLabel: inst.label }) });
  const data = await res.json();
  if (!res.ok) throw new Error("Options API error " + res.status);
  if (data.error) throw new Error(data.error + (data.debug_hint ? "\n\n" + data.debug_hint : ""));
  return data;
}

const DC = { BULLISH: "#00d4aa", BEARISH: "#ff4757", NEUTRAL: "#ffd700" };
const DB = { BULLISH: "rgba(0,212,170,.08)", BEARISH: "rgba(255,71,87,.08)", NEUTRAL: "rgba(255,215,0,.06)" };
const TYPE_COLORS = {
  CALL_WALL: { color: "#00d4aa", bg: "rgba(0,212,170,.08)", label: "CALL WALL" },
  PUT_WALL:  { color: "#ff4757", bg: "rgba(255,71,87,.08)", label: "PUT WALL"  },
  GEX_FLIP:  { color: "#c084fc", bg: "rgba(192,132,252,.08)", label: "GEX FLIP" },
  PIN_RISK:  { color: "#ffd700", bg: "rgba(255,215,0,.08)", label: "PIN RISK"  },
};

function UpgradeModal({ reason, onClose, userId, email }) {
  const [loading, setLoading] = useState(false);
  const checkout = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/checkout", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ userId, email }) });
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) { console.error(e); setLoading(false); }
  };
  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.85)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ background: "#0d1117", border: "1px solid rgba(0,212,255,.2)", borderRadius: 16, padding: 32, maxWidth: 380, width: "100%", textAlign: "center" }}>
        <div style={{ fontSize: 32, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 20, fontWeight: 800, color: "#f0f0f0", marginBottom: 10 }}>{reason === "limit" ? "Daily Limit Reached" : "Pro Feature"}</div>
        <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 24 }}>
          {reason === "limit" ? "You've used your 5 free briefs today. Upgrade to Pro for unlimited briefs, Scalper Mode, and Options Flow." : "Scalper Mode and Options Flow are Pro features. Unlimited briefs, real-time risk checks, and dealer positioning."}
        </div>
        <div style={{ background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.12)", borderRadius: 10, padding: 16, marginBottom: 24, textAlign: "left" }}>
          {["Unlimited briefs every day", "Scalper Mode — live risk checks", "Options Flow intelligence", "All instruments covered"].map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: i < 3 ? 10 : 0 }}>
              <span style={{ color: "#00d4ff", fontSize: 14 }}>✓</span>
              <span style={{ fontSize: 13, color: "#c0d0e0" }}>{f}</span>
            </div>
          ))}
        </div>
        <button onClick={checkout} disabled={loading} style={{ width: "100%", padding: "14px 20px", borderRadius: 10, border: "none", cursor: loading ? "wait" : "pointer", background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000", fontSize: 15, fontWeight: 800, fontFamily: "inherit", marginBottom: 12 }}>
          {loading ? "Redirecting..." : "Upgrade to Pro — €49/mo"}
        </button>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#333", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Maybe later</button>
      </div>
    </div>
  );
}

function AuthScreen() {
  const [view, setView] = useState("sign-in");
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div style={{ marginBottom: 32, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>MARKET<span style={{ color: "#00d4ff" }}>DEBRIEFS</span></div>
        <div style={{ fontSize: 12, color: "#333", marginTop: 4 }}>Know the macro before you trade</div>
      </div>
      <div style={{ width: "100%", maxWidth: 400 }}>
        {view === "sign-in"
          ? <SignIn appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" } }} afterSignInUrl="https://marketdebriefs.com/app" />
          : <SignUp appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" } }} afterSignUpUrl="https://marketdebriefs.com/app" />
        }
      </div>
      <div style={{ marginTop: 20, fontSize: 13, color: "#333" }}>
        {view === "sign-in"
          ? <>Don't have an account? <button onClick={() => setView("sign-up")} style={{ background: "none", border: "none", color: "#00d4ff", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign up free</button></>
          : <>Already have an account? <button onClick={() => setView("sign-in")} style={{ background: "none", border: "none", color: "#00d4ff", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign in</button></>
        }
      </div>
    </div>
  );
}


function AppInner() {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (!user) return;
    const proMeta = user.publicMetadata?.pro === true;
    const proLocal = localStorage.getItem("pro_" + user.id) === "true";
    setIsPro(proMeta || proLocal);
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      localStorage.setItem("pro_" + user.id, "true");
      setIsPro(true);
      window.history.replaceState({}, "", "/app");
    }
  }, [user]);

  const { increment, canBrief, remaining } = useUsage(user?.id, isPro);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("intel");
  const [mode, setMode] = useState("full");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [inst, setInst] = useState(null);
  const [error, setError] = useState(null);
  const [showUpgrade, setShowUpgrade] = useState(false);
  const [upgradeReason, setUpgradeReason] = useState("limit");
  const [optData, setOptData] = useState(null);
  const [optLoading, setOptLoading] = useState(false);
  const [optError, setOptError] = useState(null);
  const [optLastUpdated, setOptLastUpdated] = useState(null);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); setInstallPrompt(e); };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

  const handleInstall = async () => {
    if (!installPrompt) {
      setShowInstallBanner(true);
      return;
    }
    installPrompt.prompt();
    const { outcome } = await installPrompt.userChoice;
    if (outcome === "accepted") setInstallPrompt(null);
  };

  const triggerUpgrade = (reason) => { setUpgradeReason(reason || "limit"); setShowUpgrade(true); };

  const fetchOptions = useCallback(async (instrument) => {
    if (!instrument || !instrument.optionsTicker) return;
    setOptLoading(true); setOptError(null);
    try {
      const result = await getOptionsFlow(instrument);
      setOptData(result);
      if (!result.coming_soon) setOptLastUpdated(new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }));
    } catch (e) { setOptError(e.message || "Options data fetch failed."); }
    finally { setOptLoading(false); }
  }, []);

  const run = async (q, m) => {
    if (!canBrief) { triggerUpgrade("limit"); return; }
    const mm = m !== undefined ? m : mode;
    if (mm === "scalper" && !isPro) { triggerUpgrade("scalper"); return; }
    const found = detect(q);
    if (!found) { setError("Not recognised. Try: ES, NQ, Euro, Gold, GBP, Oil, BTC"); return; }
    setInst(found); setLoading(true); setError(null); setData(null); setTab("intel");
    setOptData(null); setOptError(null); setOptLastUpdated(null);
    try {
      const result = await getBriefing(found, mm);
      setData(result); increment();
    } catch (e) { setError(e.message || "Fetch failed. Please try again."); }
    finally { setLoading(false); }
  };

  const switchMode = (m) => {
    if (m === "scalper" && !isPro) { triggerUpgrade("scalper"); return; }
    setMode(m); if (inst && data) run(inst.label, m);
  };

  const handleTabChange = (id) => {
    setTab(id);
    if (id === "options" && inst && inst.optionsTicker && !optData && !optLoading) fetchOptions(inst);
  };

  const TABS = [{ id: "intel", label: "Intelligence" }, { id: "options", label: "Options Flow" }, { id: "journal", label: "Reflection" }, { id: "learn", label: "Learn" }];

  return (
    <>
      <style>{" *, *::before, *::after { box-sizing: border-box; } html { font-size: 16px; } body { margin: 0; padding: 0; } textarea { box-sizing: border-box; } @media (max-width: 480px) { .main-content { padding: 14px 14px 60px !important; } .header-inner { padding: 14px 14px 0 !important; } } "}</style>
      {showUpgrade && <UpgradeModal reason={upgradeReason} onClose={() => setShowUpgrade(false)} userId={user?.id} email={user?.primaryEmailAddress?.emailAddress} />}
      <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0e0e0", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div className="header-inner" style={{ background: "linear-gradient(180deg,#0d1117,#0a0c0f)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "16px 20px 0", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 860, margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
              <div>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff" }}>MARKET BRIEF</div>
                <div style={{ fontSize: 9, color: "#2a2a2a", letterSpacing: 2, fontFamily: "monospace" }}>INTELLIGENCE — REFLECTION — EDUCATION</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                {!isPro && (
                  <button onClick={() => triggerUpgrade("limit")} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: remaining <= 1 ? "rgba(255,71,87,.1)" : "rgba(255,255,255,.03)", border: "1px solid " + (remaining <= 1 ? "rgba(255,71,87,.3)" : "rgba(255,255,255,.07)"), color: remaining <= 1 ? "#ff4757" : "#333", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>
                    {remaining} left
                  </button>
                )}
                {isPro && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: "rgba(0,212,255,.08)", border: "1px solid rgba(0,212,255,.2)", color: "#00d4ff", fontWeight: 700 }}>PRO</span>}
                <div style={{ width: 1, height: 12, background: "rgba(255,255,255,.07)" }} />
                <span style={{ fontSize: 9, color: "#2a2a2a", fontFamily: "monospace", letterSpacing: 0.5 }}>
                  {new Date().toLocaleDateString("en-GB", { day: "numeric", month: "short" }).toUpperCase()}
                </span>
                <button onClick={handleInstall} title="Add to Home Screen" style={{ fontSize: 9, fontFamily: "inherit", color: "#00d4ff", padding: "3px 8px", border: "1px solid rgba(0,212,255,.2)", borderRadius: 4, background: "rgba(0,212,255,.05)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}>
                  <span style={{ fontSize: 10 }}>⊕</span> GET APP
                </button>
                <div style={{ width: 1, height: 12, background: "rgba(255,255,255,.07)" }} />
                <button onClick={() => signOut({ redirectUrl: "/" })} style={{ fontSize: 9, fontFamily: "monospace", color: "#444", padding: "3px 9px", border: "1px solid rgba(255,255,255,.08)", borderRadius: 4, background: "rgba(255,255,255,.02)", cursor: "pointer" }}>
                  SIGN OUT
                </button>
              </div>
              {showInstallBanner && (
                <div style={{ position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)", background: "#0d1117", border: "1px solid rgba(0,212,255,.25)", borderRadius: 12, padding: "14px 18px", zIndex: 999, maxWidth: 320, width: "calc(100% - 40px)", boxShadow: "0 8px 32px rgba(0,0,0,.6)" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#f0f0f0" }}>Add to Home Screen</div>
                    <button onClick={() => setShowInstallBanner(false)} style={{ background: "none", border: "none", color: "#333", cursor: "pointer", fontSize: 16, padding: 0, lineHeight: 1 }}>×</button>
                  </div>
                  <div style={{ fontSize: 12, color: "#555", lineHeight: 1.6, marginBottom: 12 }}>
                    On iOS: tap <span style={{ color: "#00d4ff" }}>Share</span> → <span style={{ color: "#00d4ff" }}>Add to Home Screen</span><br />
                    On Android: tap <span style={{ color: "#00d4ff" }}>Menu ⋮</span> → <span style={{ color: "#00d4ff" }}>Add to Home Screen</span>
                  </div>
                  <button onClick={() => setShowInstallBanner(false)} style={{ width: "100%", padding: "8px", borderRadius: 7, border: "none", background: "rgba(0,212,255,.1)", color: "#00d4ff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>Got it</button>
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
              {[{ id: "full", label: "Full Brief", sub: "Pre-trade research" }, { id: "scalper", label: "Scalper Mode", sub: isPro ? "Last 10 min" : "Pro only 🔒" }].map(m => (
                <button key={m.id} onClick={() => switchMode(m.id)} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", background: mode === m.id ? "rgba(0,212,255,.1)" : "rgba(255,255,255,.02)", border: mode === m.id ? "1px solid rgba(0,212,255,.25)" : "1px solid rgba(255,255,255,.05)", color: mode === m.id ? "#00d4ff" : (m.id === "scalper" && !isPro ? "#2a2a2a" : "#444") }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{m.sub}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 11 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run(query.trim())} placeholder={mode === "scalper" ? "ES, NQ, CL, GC, 6E..." : "Euro, Gold, GBP, ES, NQ, Oil, BTC..."} style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 8, color: "#e0e0e0", fontSize: 14, padding: "10px 13px", outline: "none", fontFamily: "inherit", minWidth: 0 }} />
              <button onClick={() => run(query.trim())} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(255,255,255,.02)" : "rgba(0,212,255,.1)", color: loading ? "#2a2a2a" : "#00d4ff", border: "1px solid rgba(0,212,255,.2)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit" }}>{loading ? "..." : "BRIEF ME"}</button>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 13, flexWrap: "wrap" }}>
              {CHIPS.map(({ label, key }) => (
                <button key={key} onClick={() => { setQuery(label); run(label); }} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", color: "#444" }}>{label}</button>
              ))}
            </div>
            <div style={{ display: "flex", overflowX: "auto" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => handleTabChange(t.id)} style={{ flex: 1, minWidth: 70, padding: "9px 6px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#00d4ff" : "#333", borderBottom: "2px solid " + (tab === t.id ? "#00d4ff" : "transparent"), whiteSpace: "nowrap" }}>
                  {t.label}
                  {t.id === "options" && !isPro && <span style={{ marginLeft: 3, fontSize: 8 }}>🔒</span>}
                  {t.id === "options" && isPro && inst && inst.optionsTicker && <span style={{ marginLeft: 4, fontSize: 8, color: "#00d4ff", opacity: 0.5 }}>●</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="main-content" style={{ maxWidth: 860, margin: "0 auto", padding: "20px 20px 60px", width: "100%" }}>
          {tab === "intel" && (
            <div>
              {loading && <Loader />}
              {error && <div style={{ color: "#ff4757", padding: "16px 0", fontSize: 13 }}>{error}</div>}
              {!loading && !error && !data && (
                <div style={{ textAlign: "center", padding: "56px 20px" }}>
                  <div style={{ fontSize: 44, marginBottom: 14 }}>+</div>
                  <div style={{ fontSize: 14, color: "#444", marginBottom: 7 }}>{mode === "scalper" ? "Enter your futures contract for a live risk check" : "Enter an instrument for your full market briefing"}</div>
                  <div style={{ fontSize: 11, color: "#2a2a2a" }}>{mode === "scalper" ? "ES · NQ · CL · GC · 6E · RTY · YM" : "Euro · Gold · GBP · Oil · Bitcoin · ES · NQ · VIX"}</div>
                </div>
              )}
              {!loading && data && inst && mode === "full" && <FullView inst={inst} data={data} />}
              {!loading && data && inst && mode === "scalper" && <ScalperView inst={inst} data={data} />}
            </div>
          )}
          {tab === "options" && <OptionsFlowView inst={inst} data={optData} loading={optLoading} error={optError} onFetch={() => fetchOptions(inst)} lastUpdated={optLastUpdated} isPro={isPro} onUpgrade={() => triggerUpgrade("options")} />}
          {tab === "journal" && <Journal />}
          {tab === "learn" && <Learn />}
        </div>
      </div>
    </>
  );
}

// ── ROOT ──────────────────────────────────────────────────────────────────────
export default function App() {
  const { isLoaded, isSignedIn } = useUser();

  if (!isLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0c0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#333", fontSize: 13, fontFamily: "monospace" }}>...</div>
      </div>
    );
  }

  if (isSignedIn) return <AppInner />;
  return <AuthScreen />;
}
