import { useState, useEffect, useCallback } from "react";
import { useUser, useClerk, useAuth, SignIn, SignUp } from "@clerk/clerk-react";
import { useUsage } from "./useUsage.js";

// ── PWA UPDATE PROMPT ─────────────────────────────────────────────────────────
function UpdateBanner() {
  const [show, setShow] = useState(false);
  const [reg, setReg] = useState(null);

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    navigator.serviceWorker.ready.then((registration) => {
      registration.addEventListener("updatefound", () => {
        const newWorker = registration.installing;
        if (!newWorker) return;
        newWorker.addEventListener("statechange", () => {
          if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
            setReg(registration);
            setShow(true);
          }
        });
      });
    });
    // Also check if there's already a waiting worker on load
    navigator.serviceWorker.ready.then((registration) => {
      if (registration.waiting && navigator.serviceWorker.controller) {
        setReg(registration);
        setShow(true);
      }
    });
  }, []);

  const applyUpdate = () => {
    if (reg && reg.waiting) {
      reg.waiting.postMessage({ type: "SKIP_WAITING" });
    }
    window.location.reload();
  };

  if (!show) return null;
  return (
    <div style={{
      position: "fixed", bottom: 20, left: "50%", transform: "translateX(-50%)",
      zIndex: 9999, background: "#0d1117", border: "1px solid rgba(0,212,255,.3)",
      borderRadius: 10, padding: "12px 18px", display: "flex", alignItems: "center",
      gap: 14, boxShadow: "0 4px 24px rgba(0,0,0,.6)", maxWidth: 340, width: "calc(100% - 40px)"
    }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 12, fontWeight: 700, color: "#e0e0e0", marginBottom: 2 }}>Update available</div>
        <div style={{ fontSize: 11, color: "#444" }}>New version of MarketDebriefs is ready</div>
      </div>
      <button onClick={applyUpdate} style={{
        background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000",
        border: "none", borderRadius: 7, padding: "8px 14px", fontSize: 11,
        fontWeight: 800, cursor: "pointer", fontFamily: "inherit", whiteSpace: "nowrap"
      }}>Update Now</button>
      <button onClick={() => setShow(false)} style={{
        background: "none", border: "none", color: "#333", cursor: "pointer",
        fontSize: 16, padding: "0 2px", lineHeight: 1
      }}>✕</button>
    </div>
  );
}

// ── ROUTING ───────────────────────────────────────────────────────────────────
export default function App() {
  const [path, setPath] = useState(window.location.pathname);

  useEffect(() => {
    const onPop = () => setPath(window.location.pathname);
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);

  const navigate = (to) => {
    window.history.pushState({}, "", to);
    setPath(to);
  };

  if (path === "/app") return <><UpdateBanner /><AppShell navigate={navigate} /></>;
  return <><UpdateBanner /><LandingPage navigate={navigate} /></>;
}

// ── LANDING PAGE ──────────────────────────────────────────────────────────────
function LandingPage({ navigate }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0e0e0", fontFamily: "Inter, system-ui, sans-serif", margin: 0 }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0a0c0f; } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .fade-up { animation: fadeUp 0.7s ease forwards; } .cta-btn:hover { opacity: 0.85; transform: translateY(-1px); } .cta-btn { transition: all 0.15s; } .chip:hover { border-color: rgba(0,212,255,.4) !important; color: #00d4ff !important; } .chip { transition: all 0.15s; cursor: default; }`}</style>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,.05)", position: "sticky", top: 0, background: "rgba(10,12,15,.95)", backdropFilter: "blur(10px)", zIndex: 100 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px" }}>MARKET<span style={{ color: "#00d4ff" }}>DEBRIEFS</span></div>
        <a href="/help" style={{ fontSize: 11, fontWeight: 600, color: "#333", textDecoration: "none", fontFamily: "inherit", marginRight: 8 }}>HELP</a> <button onClick={() => navigate("/app")} className="cta-btn" style={{ background: "rgba(0,212,255,.1)", border: "1px solid rgba(0,212,255,.25)", color: "#00d4ff", padding: "8px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>LAUNCH APP</button>
      </nav>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px 60px", textAlign: "center" }} className="fade-up">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, border: "1px solid rgba(0,212,255,.2)", background: "rgba(0,212,255,.05)", marginBottom: 28 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, color: "#00d4ff", fontWeight: 600, letterSpacing: 1 }}>INSTITUTIONAL INTELLIGENCE · INDEPENDENT TRADERS</span>
        </div>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 58px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1.5px", color: "#fff", marginBottom: 20 }}>Know the macro<br /><span style={{ color: "#00d4ff" }}>before you trade.</span></h1>
        <p style={{ fontSize: "clamp(14px, 2vw, 17px)", color: "#555", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 36px" }}>Bloomberg tells you what happened.<br /><span style={{ color: "#888" }}>Market Debriefs tells you what it means.</span></p>
        <button onClick={() => navigate("/app")} className="cta-btn" style={{ background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000", border: "none", padding: "15px 36px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginBottom: 14 }}>GET YOUR BRIEF FREE →</button>
        <div style={{ fontSize: 12, color: "#2a2a2a" }}>No credit card · 3 free briefs daily</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", padding: "0 32px 60px", maxWidth: 600, margin: "0 auto" }}>
        {["ES S&P 500","NQ NASDAQ","Gold XAU","WTI Oil","EUR/USD","GBP/USD","Bitcoin","VIX","USD/JPY","Russell 2000"].map(t => (
          <span key={t} className="chip" style={{ fontSize: 11, padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(255,255,255,.07)", color: "#333", background: "rgba(255,255,255,.02)" }}>{t}</span>
        ))}
      </div>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 32px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {[
          { icon: "📋", title: "Full Brief", desc: "Pre-trade macro research. Central bank stance, geopolitical risks, high-impact events and why they move price." },
          { icon: "⚡", title: "Scalper Mode", desc: "10-second risk check before you enter. GREEN / YELLOW / RED with breaking news and imminent events. Pro feature." },
          { icon: "📈", title: "Stocks Brief", desc: "Earnings context, macro tailwinds & headwinds, sector rotation, and institutional flow for any stock. Pro feature." },
          { icon: "📓", title: "Trade Journal", desc: "Daily reflection prompts to build self-awareness and improve your decision-making over time." },
        ].map(f => (
          <div key={f.title} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 12, padding: 22 }}>
            <div style={{ fontSize: 24, marginBottom: 10 }}>{f.icon}</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: "#e0e0e0", marginBottom: 7 }}>{f.title}</div>
            <div style={{ fontSize: 13, color: "#444", lineHeight: 1.65 }}>{f.desc}</div>
          </div>
        ))}
      </div>

      {/* ── HOW IT WORKS ── */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 32px 80px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#333", letterSpacing: 2, fontWeight: 700, marginBottom: 32 }}>HOW IT WORKS</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: 0, position: "relative" }}>
          {[
            { step: "01", icon: "🎯", title: "Pick Your Instrument", desc: "Select any market — ES, Gold, EUR/USD, BTC, Oil. Whatever you're about to trade." },
            { step: "02", icon: "📡", title: "Get Your Briefing", desc: "AI reads macro data, central bank stance, geopolitical risk, and live event risk in seconds." },
            { step: "03", icon: "🧠", title: "Trade With Context", desc: "Know the macro forces behind price. Enter with conviction — or stay out when the odds aren't with you." },
          ].map((s, i) => (
            <div key={s.step} style={{ padding: "24px 20px", position: "relative" }}>
              {i < 2 && <div style={{ position: "absolute", right: 0, top: "50%", transform: "translateY(-50%)", color: "#1a1a1a", fontSize: 20, display: "none" }}>→</div>}
              <div style={{ fontSize: 10, color: "#00d4ff", fontWeight: 800, letterSpacing: 3, marginBottom: 12, opacity: 0.5 }}>{s.step}</div>
              <div style={{ fontSize: 28, marginBottom: 12 }}>{s.icon}</div>
              <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", marginBottom: 8 }}>{s.title}</div>
              <div style={{ fontSize: 12, color: "#444", lineHeight: 1.65 }}>{s.desc}</div>
            </div>
          ))}
        </div>
        <div style={{ marginTop: 32, padding: "20px 24px", background: "rgba(0,212,255,.03)", border: "1px solid rgba(0,212,255,.08)", borderRadius: 12, textAlign: "left" }}>
          <div style={{ fontSize: 11, color: "#00d4ff", fontWeight: 700, letterSpacing: 1, marginBottom: 10 }}>WHY MACRO MATTERS</div>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.75, margin: 0 }}>
            Most retail traders lose not because of bad entries — but because they trade <em style={{ color: "#888" }}>against</em> the macro tide.
            A hawkish Fed, a risk-off geopolitical shock, or a surprise CPI print can invalidate any technical setup instantly.
            Institutional desks have economists and macro analysts. Market Debriefs gives independent traders that same edge —
            in seconds, before every trade.
          </p>
        </div>
      </div>

      {/* ── OLD WAY vs MARKET DEBRIEFS ── */}
      <style>{`.compare-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 2px; border-radius: 14px; overflow: hidden; border: 1px solid rgba(255,255,255,.06); } @media (max-width: 520px) { .compare-grid { grid-template-columns: 1fr; } .compare-grid .md-col { border-left: none !important; border-top: 1px solid rgba(0,212,255,.1); } }`}</style>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 32px 80px" }}>
        <div style={{ fontSize: 11, color: "#333", letterSpacing: 2, fontWeight: 700, marginBottom: 24, textAlign: "center" }}>THE ALTERNATIVE</div>
        <div className="compare-grid">
          <div style={{ background: "rgba(255,255,255,.02)", padding: "24px 20px" }}>
            <div style={{ fontSize: 11, color: "#333", fontWeight: 700, letterSpacing: 2, marginBottom: 20 }}>OLD WAY</div>
            {[
              ["Bloomberg Terminal", "$30,000 / year"],
              ["Manually scan news", "30–60 min / day"],
              ["Multiple paid services", "$200–500 / mo"],
              ["Still miss macro context", "Before key trades"],
              ["Institutional access only", "Not for retail"],
            ].map(([what, cost]) => (
              <div key={what} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(255,255,255,.04)", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#444" }}>{what}</span>
                <span style={{ fontSize: 11, color: "#333", fontWeight: 600, whiteSpace: "nowrap" }}>{cost}</span>
              </div>
            ))}
          </div>
          <div className="md-col" style={{ background: "rgba(0,212,255,.04)", padding: "24px 20px", borderLeft: "1px solid rgba(0,212,255,.1)" }}>
            <div style={{ fontSize: 11, color: "#00d4ff", fontWeight: 700, letterSpacing: 2, marginBottom: 20 }}>MARKET DEBRIEFS</div>
            {[
              ["Full macro briefing", "€0 — Free"],
              ["AI reads it for you", "< 30 seconds"],
              ["All-in-one platform", "€49 / mo Pro"],
              ["Macro context built-in", "Every brief"],
              ["Built for retail traders", "Anyone, anywhere"],
            ].map(([what, cost]) => (
              <div key={what} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "9px 0", borderBottom: "1px solid rgba(0,212,255,.06)", gap: 12 }}>
                <span style={{ fontSize: 12, color: "#888" }}>{what}</span>
                <span style={{ fontSize: 11, color: "#00d4ff", fontWeight: 700, whiteSpace: "nowrap" }}>{cost}</span>
              </div>
            ))}
          </div>
        </div>
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#2a2a2a" }}>
          * Bloomberg Terminal pricing based on publicly reported ~$30,000/year subscription cost.
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 32px 80px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#333", letterSpacing: 2, fontWeight: 700, marginBottom: 24 }}>PRICING</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
          {[
            { name: "Free", price: "€0", features: ["3 briefs/day", "Full Brief mode", "Trade Journal", "Learn to Fish"] },
            { name: "Pro", price: "€49/mo", features: ["Unlimited briefs", "Scalper Mode", "Stocks Brief", "All instruments"], highlight: true },
          ].map(p => (
            <div key={p.name} style={{ background: p.highlight ? "rgba(0,212,255,.06)" : "rgba(255,255,255,.02)", border: `1px solid ${p.highlight ? "rgba(0,212,255,.25)" : "rgba(255,255,255,.06)"}`, borderRadius: 12, padding: 20, textAlign: "left" }}>
              <div style={{ fontSize: 12, fontWeight: 700, color: p.highlight ? "#00d4ff" : "#555", marginBottom: 6 }}>{p.name}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 14 }}>{p.price}</div>
              {p.features.map(f => (
                <div key={f} style={{ fontSize: 12, color: "#555", marginBottom: 5, display: "flex", gap: 7 }}>
                  <span style={{ color: p.highlight ? "#00d4ff" : "#333" }}>✓</span>{f}
                </div>
              ))}
            </div>
          ))}
        </div>
        <button onClick={() => navigate("/app")} className="cta-btn" style={{ width: "100%", background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000", border: "none", padding: "14px", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>START FREE — NO CARD NEEDED</button>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 32px 100px", textAlign: "center" }}>
        <div style={{ padding: "48px 32px", background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.1)", borderRadius: 16 }}>
          <div style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.5px" }}>
            Stop trading blind.<br /><span style={{ color: "#00d4ff" }}>Know the macro.</span>
          </div>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.75, marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
            Every major move in markets is driven by macro forces — central bank policy, geopolitical risk,
            inflation data, liquidity cycles. Trading without this context is like sailing without knowing the weather.
            The institutions know. Now you can too.
          </p>
          <button onClick={() => navigate("/app")} className="cta-btn" style={{ background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000", border: "none", padding: "15px 40px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>GET YOUR BRIEF FREE →</button>
          <div style={{ marginTop: 14, fontSize: 11, color: "#2a2a2a" }}>Free forever · No card needed · Takes 30 seconds</div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.04)", padding: "24px 32px", textAlign: "center", color: "#2a2a2a", fontSize: 11 }}>
        © {new Date().getFullYear()} MarketDebriefs · Not financial advice
      </div>
    </div>
  );
}

// ── APP SHELL ─────────────────────────────────────────────────────────────────
function AppShell({ navigate }) {
  const { isLoaded, userId } = useAuth();
  if (!isLoaded) return <Spinner />;
  if (userId) return <AppInner navigate={navigate} />;
  return <AuthScreen />;
}

function Spinner() {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ width: 28, height: 28, border: "2px solid #1a1f2e", borderTop: "2px solid #00d4ff", borderRadius: "50%", animation: "spin 0.8s linear infinite" }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── INSTRUMENTS ───────────────────────────────────────────────────────────────
const INSTRUMENTS = {
  es:     { label: "ES S&P 500",        aliases: ["es","es1","sp500","spx","spy","s&p","s&p 500","s&p500","standard and poor"], color: "#00ffcc", flag: "ES",  optionsTicker: "SPY" },
  nq:     { label: "NQ NASDAQ 100",     aliases: ["nq","nq1","nasdaq","nas100","ndx","qqq","nasdaq 100","nasdaq100"], color: "#f472b6", flag: "NQ",  optionsTicker: "QQQ" },
  rty:    { label: "RTY Russell 2000",  aliases: ["rty","russell","russell 2000","russell2000","iwm","small cap"], color: "#fb923c", flag: "RTY", optionsTicker: "IWM" },
  ym:     { label: "YM Dow Jones",      aliases: ["ym","ym1","dow","djia","dia","dow jones","dowjones"], color: "#a78bfa", flag: "YM",  optionsTicker: "DIA" },
  dax:    { label: "DAX 40",            aliases: ["dax","dax40","germany","german index","fdax"], color: "#4ade80", flag: "DAX", optionsTicker: null },
  nikkei: { label: "Nikkei 225",        aliases: ["nikkei","nk","n225","nikkei225","japan","japanese index","nk225"], color: "#f97316", flag: "NIK", optionsTicker: null },
  ftse:   { label: "FTSE 100",          aliases: ["ftse","ftse100","ftse 100","uk index","z"], color: "#60a5fa", flag: "UK",  optionsTicker: null },
  cac:    { label: "CAC 40",            aliases: ["cac","cac40","cac 40","france","french index"], color: "#e879f9", flag: "CAC", optionsTicker: null },
  gold:   { label: "Gold XAU/USD",      aliases: ["gold","xauusd","xau","gc","gc1","xag/usd","gold futures"], color: "#ffd700", flag: "XAU", optionsTicker: "GLD" },
  silver: { label: "Silver XAG/USD",    aliases: ["silver","xagusd","xag","si","si1","silver futures"], color: "#c0c0c0", flag: "XAG", optionsTicker: "SLV" },
  copper: { label: "Copper HG",         aliases: ["copper","hg","hg1","copper futures","cu"], color: "#b87333", flag: "HG",  optionsTicker: "CPER" },
  oil:    { label: "WTI Crude Oil",     aliases: ["oil","crude","wti","usoil","cl","cl1","crude oil","wti oil","light crude"], color: "#ff8c42", flag: "OIL", optionsTicker: "USO" },
  brent:  { label: "Brent Crude",       aliases: ["brent","brent crude","brn","brent oil","cb1"], color: "#ffa500", flag: "BRT", optionsTicker: null },
  natgas: { label: "Natural Gas",       aliases: ["natgas","natural gas","ng","ng1","gas","henry hub"], color: "#67e8f9", flag: "GAS", optionsTicker: "UNG" },
  euro:   { label: "EUR/USD",           aliases: ["euro","eurusd","eur","6e","eur/usd","euros"], color: "#00d4ff", flag: "EUR", optionsTicker: null },
  gbp:    { label: "GBP/USD",           aliases: ["gbp","pound","cable","gbpusd","6b","gbp/usd","sterling","british pound"], color: "#7fff7f", flag: "GBP", optionsTicker: null },
  jpy:    { label: "USD/JPY",           aliases: ["jpy","yen","usdjpy","6j","usd/jpy","japanese yen"], color: "#ff6b6b", flag: "JPY", optionsTicker: null },
  aud:    { label: "AUD/USD",           aliases: ["aud","aussie","audusd","6a","aud/usd","australian dollar"], color: "#34d399", flag: "AUD", optionsTicker: null },
  cad:    { label: "USD/CAD",           aliases: ["cad","usdcad","6c","usd/cad","loonie","canadian dollar"], color: "#facc15", flag: "CAD", optionsTicker: null },
  chf:    { label: "USD/CHF",           aliases: ["chf","usdchf","6s","usd/chf","swiss franc","swissie"], color: "#e2e8f0", flag: "CHF", optionsTicker: null },
  dxy:    { label: "US Dollar DXY",     aliases: ["dxy","dollar","usd","dx","dollar index","us dollar"], color: "#c084fc", flag: "DXY", optionsTicker: "UUP" },
  btc:    { label: "Bitcoin",           aliases: ["btc","bitcoin","crypto","btcusd","xbt"], color: "#f7931a", flag: "BTC", optionsTicker: null },
  eth:    { label: "Ethereum",          aliases: ["eth","ethereum","ethusd","ether"], color: "#627eea", flag: "ETH", optionsTicker: null },
  tnote:  { label: "10Y Treasury Note", aliases: ["tnote","10y","10yr","treasuries","treasury","bonds","zt","zn","bond market","10 year","us bonds","yields"], color: "#a5f3fc", flag: "10Y", optionsTicker: "TLT" },
  vix:    { label: "VIX Fear Index",    aliases: ["vix","volatility","fear","fear index","vol"], color: "#f87171", flag: "VIX", optionsTicker: "VIXY" },
};

const CHIPS = [
  { label: "ES", key: "es" }, { label: "NQ", key: "nq" }, { label: "Gold", key: "gold" },
  { label: "Silver", key: "silver" }, { label: "Oil", key: "oil" }, { label: "Euro", key: "euro" },
  { label: "GBP", key: "gbp" }, { label: "BTC", key: "btc" }, { label: "VIX", key: "vix" },
];

function detect(query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  for (const [key, val] of Object.entries(INSTRUMENTS)) {
    if (val.aliases.some(a => a === q)) return { key, ...val };
  }
  for (const [key, val] of Object.entries(INSTRUMENTS)) {
    if (val.aliases.some(a => q.includes(a) || a.includes(q))) return { key, ...val };
  }
  return { key: "custom", label: query.trim(), aliases: [], color: "#e0e0e0", flag: "?", optionsTicker: null };
}

function sysPrompt(mode) {
  const base = `You are a professional market intelligence analyst. Respond ONLY with valid JSON. No markdown, no backticks, no preamble. Start with { and end with }.
CRITICAL RULES — NEVER BREAK THESE:
1. NEVER mention specific price levels, support/resistance numbers, targets, stops, or historical price ranges.
2. ONLY discuss CURRENT or UPCOMING macro events — central bank decisions, economic data releases, geopolitical developments relevant NOW or scheduled soon.
3. Your job is macro context, not technical analysis.`;
  if (mode === "scalper") return base + ' SCALPER MODE schema: {"instrument":"string","risk_level":"GREEN|YELLOW|RED","risk_reason":"string","scalper_note":"string","breaking":[{"headline":"string","direction":"BULLISH|BEARISH|NEUTRAL","age":"string"}],"imminent":[{"event":"string","due_in":"string","expected_impact":"string"}]}';
  return base + ' FULL BRIEF schema: {"instrument":"string","sentiment":"bullish|bearish|neutral|mixed","headline_summary":"string","events":[{"title":"string","time":"string","impact":"HIGH|MEDIUM","direction":"BULLISH|BEARISH|NEUTRAL","summary":"string","why_it_moves_price":"string","confidence":"HIGH|MEDIUM|LOW"}],"geopolitical_risks":"string","macro_context":"string","teaching_moment":"string"}';
}

function userPrompt(inst, mode) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  if (mode === "scalper") return "Time: " + now + ". About to trade " + inst.label + ". What are the CURRENT macro risks right now and what events are IMMINENT? GREEN YELLOW or RED? No price levels.";
  return "Today: " + now + ". Full macro briefing for " + inst.label + ". Focus on CURRENT central bank stance, UPCOMING scheduled events, and live geopolitical risks. No price levels — only macro context and why it moves price.";
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

async function getEquityBrief(label) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const sys = `You are a professional equity analyst. Respond ONLY with valid JSON. No markdown, no backticks, no preamble. Start with { and end with }.
RULES: Never mention specific price levels. Focus on macro, fundamental, and sector context only — current and upcoming only.
` + 'EQUITY BRIEF schema: {"instrument":"string","ticker":"string","sector":"string","sentiment":"bullish|bearish|neutral|mixed","headline_summary":"string","earnings_context":"string","macro_tailwinds":"string","macro_headwinds":"string","sector_rotation":"string","catalyst_events":[{"title":"string","time":"string","impact":"HIGH|MEDIUM","direction":"BULLISH|BEARISH|NEUTRAL","summary":"string"}],"institutional_flow":"string","teaching_moment":"string"}';
  const msg = "Today: " + now + ". Equity debrief for " + label + ". Cover: latest earnings context, current macro tailwinds and headwinds for this stock and its sector, upcoming catalyst events, sector rotation dynamics, and institutional flow signals. No price levels.";
  return callClaude(sys, msg);
}

const DC = { BULLISH: "#00d4aa", BEARISH: "#ff4757", NEUTRAL: "#ffd700" };
const DB = { BULLISH: "rgba(0,212,170,.08)", BEARISH: "rgba(255,71,87,.08)", NEUTRAL: "rgba(255,215,0,.06)" };

// ── UPGRADE MODAL ─────────────────────────────────────────────────────────────
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
        <div style={{ fontSize: 20, fontWeight: 800, color: "#f0f0f0", marginBottom: 10 }}>
          {reason === "limit" ? "Daily Limit Reached" : reason === "stocks" ? "Equity Debriefs — Pro" : "Pro Feature"}
        </div>
        <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 24 }}>
          {reason === "limit"
            ? "You've used your 3 free briefs today. Upgrade to Pro for unlimited briefs, Scalper Mode, and Equity Debriefs."
            : reason === "stocks"
            ? "Stock debriefs are a Pro feature. Get earnings context, macro tailwinds & headwinds, sector rotation, and institutional flow for any stock — instantly."
            : "Scalper Mode and Equity Debriefs are Pro features."}
        </div>
        <div style={{ background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.12)", borderRadius: 10, padding: 16, marginBottom: 24, textAlign: "left" }}>
          {["Unlimited briefs every day", "Scalper Mode — live risk checks", "Equity Debriefs — any stock", "All instruments covered"].map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: i < 3 ? 10 : 0 }}>
              <span style={{ color: "#00d4ff", fontSize: 14 }}>✓</span>
              <span style={{ fontSize: 13, color: "#c0d0e0" }}>{f}</span>
            </div>
          ))}
        </div>
        <button onClick={checkout} disabled={loading} style={{ width: "100%", padding: "14px 20px", borderRadius: 10, border: "none", cursor: loading ? "wait" : "pointer", background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000", fontSize: 15, fontWeight: 800, fontFamily: "inherit", marginBottom: 12 }}>
          {loading ? "Redirecting…" : "Upgrade to Pro — €49/mo"}
        </button>
        <button onClick={onClose} style={{ background: "none", border: "none", color: "#333", fontSize: 12, cursor: "pointer", fontFamily: "inherit" }}>Maybe later</button>
      </div>
    </div>
  );
}

// ── AUTH SCREEN ───────────────────────────────────────────────────────────────
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
          ? <SignIn forceRedirectUrl="/app" appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" } }} />
          : <SignUp forceRedirectUrl="/app" appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" } }} />
        }
      </div>
      <div style={{ marginTop: 20, fontSize: 13, color: "#333" }}>
        {view === "sign-in"
          ? <span>Don't have an account? <button onClick={() => setView("sign-up")} style={{ background: "none", border: "none", color: "#00d4ff", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign up free</button></span>
          : <span>Already have an account? <button onClick={() => setView("sign-in")} style={{ background: "none", border: "none", color: "#00d4ff", cursor: "pointer", fontFamily: "inherit", fontSize: 13 }}>Sign in</button></span>
        }
      </div>
    </div>
  );
}

// ── SHARED UI ─────────────────────────────────────────────────────────────────
function Loader() {
  return (
    <div>
      <style>{"@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}"}</style>
      {[90, 65, 80, 55].map((h, i) => (
        <div key={i} style={{ height: h, borderRadius: 8, marginBottom: 12, background: "linear-gradient(90deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.03) 100%)", backgroundSize: "200% 100%", animation: "sh 1.4s " + (i * 0.15) + "s infinite" }} />
      ))}
    </div>
  );
}

function EventCard({ ev }) {
  const [open, setOpen] = useState(false);
  const c = DC[ev.direction] || "#666";
  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: DB[ev.direction] || "rgba(255,255,255,.02)", borderLeft: "3px solid " + c, border: "1px solid " + c + "22", borderRadius: 8, padding: "13px 15px", marginBottom: 9, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 7, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#777" }}>{ev.time}</span>
            {ev.impact === "HIGH" && <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700, background: "rgba(255,71,87,.15)", color: "#ff4757" }}>HIGH</span>}
          </div>
          <div style={{ fontSize: 14, fontWeight: 600, color: "#f0f0f0", marginBottom: 3 }}>{ev.title}</div>
          <div style={{ fontSize: 12, color: "#999", lineHeight: 1.5 }}>{ev.summary}</div>
        </div>
        <div style={{ textAlign: "right", flexShrink: 0 }}>
          <div style={{ fontSize: 10, fontWeight: 800, padding: "3px 8px", borderRadius: 4, color: c, border: "1px solid " + c + "44", background: c + "11" }}>{ev.direction}</div>
          <div style={{ fontSize: 10, color: "#444", marginTop: 3 }}>{ev.confidence}</div>
        </div>
      </div>
      {open && (
        <div style={{ marginTop: 12, paddingTop: 12, borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <div style={{ fontSize: 9, color: "#444", letterSpacing: 1.5, fontWeight: 700, marginBottom: 5 }}>WHY IT MOVES PRICE</div>
          <div style={{ fontSize: 13, color: "#c8d6e5", lineHeight: 1.75, background: "rgba(0,0,0,.25)", padding: 11, borderRadius: 6 }}>{ev.why_it_moves_price}</div>
        </div>
      )}
      <div style={{ fontSize: 10, color: "#333", marginTop: 6, textAlign: "right" }}>{open ? "collapse" : "tap to understand why"}</div>
    </div>
  );
}

// ── STOCK GATE (free users) ───────────────────────────────────────────────────
function StockGate({ onUpgrade }) {
  return (
    <div style={{ textAlign: "center", padding: "48px 20px" }}>
      <div style={{ fontSize: 36, marginBottom: 16 }}>📈</div>
      <div style={{ fontSize: 16, fontWeight: 800, color: "#f59e0b", marginBottom: 8 }}>Equity Debriefs</div>
      <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7, maxWidth: 340, margin: "0 auto 24px" }}>
        Search any stock or ticker and get a full macro debrief —
        earnings context, tailwinds, headwinds, sector rotation and institutional flow.
        <br /><br />
        This is a <span style={{ color: "#00d4ff", fontWeight: 700 }}>Pro feature</span>.
      </div>
      <div style={{ background: "rgba(245,158,11,.06)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 12, padding: "18px 20px", maxWidth: 320, margin: "0 auto 24px", textAlign: "left" }}>
        <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700, letterSpacing: 1, marginBottom: 12 }}>EQUITY BRIEF INCLUDES</div>
        {["Earnings context & outlook","Macro tailwinds for this sector","Macro headwinds to watch","Upcoming catalyst events","Sector rotation signals","Institutional flow direction"].map(f => (
          <div key={f} style={{ fontSize: 12, color: "#666", marginBottom: 6, display: "flex", gap: 8 }}>
            <span style={{ color: "#f59e0b" }}>✓</span>{f}
          </div>
        ))}
      </div>
      <button onClick={onUpgrade} style={{ background: "linear-gradient(135deg,#f59e0b,#d97706)", color: "#000", border: "none", padding: "13px 32px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>
        UPGRADE TO PRO — €49/mo
      </button>
      <div style={{ marginTop: 10, fontSize: 11, color: "#2a2a2a" }}>Includes Scalper Mode & all instruments</div>
    </div>
  );
}

// ── STOCKS TAB (Pro) ──────────────────────────────────────────────────────────
function StocksTab({ query, setQuery, data, setData, loading, setLoading, error, setError }) {
  const runStock = async () => {
    const q = query.trim();
    if (!q) return;
    setLoading(true); setError(null); setData(null);
    try {
      const result = await getEquityBrief(q);
      setData(result);
    } catch (e) { setError(e.message || "Fetch failed. Please try again."); }
    finally { setLoading(false); }
  };
  const SUGGESTIONS = ["Apple","Microsoft","Nvidia","Tesla","Amazon","Meta","Google","Netflix","AMD","Palantir","Spotify","Uber"];
  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <div style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700, letterSpacing: 2, marginBottom: 10 }}>EQUITY DEBRIEF — PRO</div>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runStock()}
            placeholder="Tesla, MSFT, Apple, NVDA, any ticker…"
            style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 8, color: "#e0e0e0", fontSize: 14, padding: "10px 13px", outline: "none", fontFamily: "inherit", minWidth: 0 }}
          />
          <button onClick={runStock} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(255,255,255,.02)" : "rgba(245,158,11,.12)", color: loading ? "#2a2a2a" : "#f59e0b", border: "1px solid rgba(245,158,11,.25)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit" }}>
            {loading ? "…" : "BRIEF ME"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => { setQuery(s); }} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: "rgba(245,158,11,.04)", border: "1px solid rgba(245,158,11,.12)", color: "#666" }}>{s}</button>
          ))}
        </div>
      </div>
      {loading && <Loader />}
      {error && <div style={{ color: "#ff4757", padding: "16px 0", fontSize: 13 }}>{error}</div>}
      {!loading && !data && !error && (
        <div style={{ textAlign: "center", padding: "40px 20px" }}>
          <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
          <div style={{ fontSize: 13, color: "#444" }}>Search any stock or ticker above for a full macro & fundamental debrief</div>
          <div style={{ fontSize: 11, color: "#2a2a2a", marginTop: 6 }}>MAG7 · Large caps · Any public company</div>
        </div>
      )}
      {!loading && data && <EquityView inst={{ label: data.instrument || query, color: "#f59e0b", flag: "STOCK" }} data={data} />}
    </div>
  );
}

// ── EQUITY VIEW (Pro) ─────────────────────────────────────────────────────────
function EquityView({ inst, data }) {
  const sc = { bullish: "#00d4aa", bearish: "#ff4757", neutral: "#ffd700", mixed: "#c084fc" };
  const cc = sc[data.sentiment] || "#888";
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg,rgba(245,158,11,.12),transparent)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 12, padding: 20, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
          <div>
            <div style={{ fontSize: 21, fontWeight: 800, color: "#f59e0b" }}>{data.ticker || inst.label.toUpperCase()}</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 3, letterSpacing: 1 }}>{data.sector || "EQUITY"}</div>
          </div>
          <div style={{ fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 6, color: cc, border: "1px solid " + cc + "55", background: cc + "11", textTransform: "uppercase" }}>{data.sentiment}</div>
        </div>
        <div style={{ fontSize: 14, color: "#c8d6e5", lineHeight: 1.6, fontStyle: "italic" }}>{data.headline_summary}</div>
      </div>
      {data.earnings_context && (
        <div style={{ background: "rgba(245,158,11,.07)", border: "1px solid rgba(245,158,11,.2)", borderRadius: 8, padding: 14, marginBottom: 13 }}>
          <div style={{ fontSize: 9, color: "#f59e0b", fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>EARNINGS CONTEXT</div>
          <div style={{ fontSize: 13, color: "#e0c88a", lineHeight: 1.65 }}>{data.earnings_context}</div>
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 13 }}>
        {data.macro_tailwinds && (
          <div style={{ background: "rgba(0,212,170,.07)", border: "1px solid rgba(0,212,170,.2)", borderRadius: 8, padding: 13 }}>
            <div style={{ fontSize: 9, color: "#00d4aa", fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>↑ TAILWINDS</div>
            <div style={{ fontSize: 12, color: "#a8f0d8", lineHeight: 1.65 }}>{data.macro_tailwinds}</div>
          </div>
        )}
        {data.macro_headwinds && (
          <div style={{ background: "rgba(255,71,87,.07)", border: "1px solid rgba(255,71,87,.2)", borderRadius: 8, padding: 13 }}>
            <div style={{ fontSize: 9, color: "#ff4757", fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>↓ HEADWINDS</div>
            <div style={{ fontSize: 12, color: "#ffb3b8", lineHeight: 1.65 }}>{data.macro_headwinds}</div>
          </div>
        )}
      </div>
      {data.catalyst_events && data.catalyst_events.length > 0 && (
        <div style={{ marginBottom: 13 }}>
          <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>CATALYST EVENTS</div>
          {data.catalyst_events.map((e, i) => <EventCard key={i} ev={e} />)}
        </div>
      )}
      {data.sector_rotation && (
        <div style={{ background: "rgba(192,132,252,.06)", border: "1px solid rgba(192,132,252,.2)", borderRadius: 8, padding: 13, marginBottom: 13 }}>
          <div style={{ fontSize: 9, color: "#c084fc", fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>SECTOR ROTATION</div>
          <div style={{ fontSize: 13, color: "#d4b8f7", lineHeight: 1.65 }}>{data.sector_rotation}</div>
        </div>
      )}
      {data.institutional_flow && (
        <div style={{ background: "rgba(0,212,255,.06)", border: "1px solid rgba(0,212,255,.15)", borderRadius: 8, padding: 13, marginBottom: 13 }}>
          <div style={{ fontSize: 9, color: "#00d4ff", fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>INSTITUTIONAL FLOW</div>
          <div style={{ fontSize: 13, color: "#a8d8ea", lineHeight: 1.65 }}>{data.institutional_flow}</div>
        </div>
      )}
      {data.teaching_moment && (
        <div style={{ background: "rgba(192,132,252,.06)", border: "1px solid rgba(192,132,252,.2)", borderRadius: 8, padding: 15 }}>
          <div style={{ fontSize: 9, color: "#c084fc", fontWeight: 700, letterSpacing: 1.5, marginBottom: 7 }}>TEACH ME TO FISH</div>
          <div style={{ fontSize: 13, color: "#d4b8f7", lineHeight: 1.75 }}>{data.teaching_moment}</div>
        </div>
      )}
    </div>
  );
}

function FullView({ inst, data }) {
  const sc = { bullish: "#00d4aa", bearish: "#ff4757", neutral: "#ffd700", mixed: "#c084fc" };
  const cc = sc[data.sentiment] || "#888";
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg," + inst.color + "15,transparent)", border: "1px solid " + inst.color + "33", borderRadius: 12, padding: 20, marginBottom: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: inst.color }}>{inst.flag} {inst.label}</div>
          <div style={{ fontSize: 11, fontWeight: 800, padding: "5px 12px", borderRadius: 6, color: cc, border: "1px solid " + cc + "55", background: cc + "11", textTransform: "uppercase" }}>{data.sentiment}</div>
        </div>
        <div style={{ fontSize: 14, color: "#c8d6e5", lineHeight: 1.6, fontStyle: "italic" }}>{data.headline_summary}</div>
      </div>
      {data.geopolitical_risks && <div style={{ background: "rgba(255,140,0,.08)", border: "1px solid rgba(255,140,0,.25)", borderRadius: 8, padding: 14, marginBottom: 15 }}><div style={{ fontSize: 9, color: "#ff8c00", fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>GEOPOLITICAL RISK</div><div style={{ fontSize: 13, color: "#e0c88a", lineHeight: 1.6 }}>{data.geopolitical_risks}</div></div>}
      <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, fontWeight: 700, marginBottom: 11 }}>HIGH-IMPACT EVENTS</div>
      {data.events && data.events.map((e, i) => <EventCard key={i} ev={e} />)}
      {data.macro_context && <div style={{ background: "rgba(0,212,255,.06)", border: "1px solid rgba(0,212,255,.15)", borderRadius: 8, padding: 13, marginBottom: 13 }}><div style={{ fontSize: 9, color: "#00d4ff", fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>WHAT TO WATCH</div><div style={{ fontSize: 13, color: "#a8d8ea", lineHeight: 1.65 }}>{data.macro_context}</div></div>}
      {data.teaching_moment && <div style={{ background: "rgba(192,132,252,.06)", border: "1px solid rgba(192,132,252,.2)", borderRadius: 8, padding: 15 }}><div style={{ fontSize: 9, color: "#c084fc", fontWeight: 700, letterSpacing: 1.5, marginBottom: 7 }}>TEACH ME TO FISH</div><div style={{ fontSize: 13, color: "#d4b8f7", lineHeight: 1.75 }}>{data.teaching_moment}</div></div>}
    </div>
  );
}

function ScalperView({ inst, data }) {
  const RC = { GREEN: "#00d4aa", YELLOW: "#ffd700", RED: "#ff4757" };
  const rc = RC[data.risk_level] || "#888";
  const label = data.risk_level === "GREEN" ? "ALL CLEAR" : data.risk_level === "YELLOW" ? "CAUTION" : "HOLD OFF";
  return (
    <div>
      <div style={{ background: rc + "12", border: "2px solid " + rc + "44", borderRadius: 12, padding: "22px 20px", marginBottom: 18, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#555", letterSpacing: 2, fontWeight: 700, marginBottom: 7 }}>{inst.flag} {inst.label} — TRADE NOW?</div>
        <div style={{ fontSize: 30, fontWeight: 800, color: rc, marginBottom: 9 }}>{label}</div>
        <div style={{ fontSize: 13, color: "#aaa", lineHeight: 1.5 }}>{data.risk_reason}</div>
      </div>
      <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: 13, marginBottom: 14 }}><div style={{ fontSize: 9, color: "#666", letterSpacing: 1.5, fontWeight: 700, marginBottom: 5 }}>SCALPER NOTE</div><div style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.6, fontWeight: 500 }}>{data.scalper_note}</div></div>
      {data.breaking && data.breaking.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 9, color: "#ff4757", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>JUST HIT THE WIRE</div>{data.breaking.map((b, i) => (<div key={i} style={{ background: DB[b.direction] || "rgba(255,255,255,.02)", borderLeft: "3px solid " + (DC[b.direction] || "#555"), borderRadius: 8, padding: "11px 13px", marginBottom: 7 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 600, flex: 1 }}>{b.headline}</div><div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 10, fontWeight: 800, color: DC[b.direction] || "#888" }}>{b.direction}</div><div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{b.age}</div></div></div></div>))}</div>}
      {data.imminent && data.imminent.length > 0 && <div><div style={{ fontSize: 9, color: "#ffd700", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>COMING UP NEXT</div>{data.imminent.map((ev, i) => (<div key={i} style={{ background: "rgba(255,215,0,.05)", border: "1px solid rgba(255,215,0,.15)", borderRadius: 8, padding: "11px 13px", marginBottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 600 }}>{ev.event}</div><div style={{ textAlign: "right", marginLeft: 12 }}><div style={{ fontSize: 11, color: "#ffd700", fontWeight: 700 }}>in {ev.due_in}</div><div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{ev.expected_impact}</div></div></div>))}</div>}
    </div>
  );
}

const PROMPTS = ["What did the market do today that surprised you?","Did you follow your plan? What made it hard?","What did the market try to teach you today?","What emotion showed up most in your trading today?","What will you do differently tomorrow?","One thing you are proud of from today."];

function Journal() {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const [entries, setEntries] = useState({});
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <div style={{ marginBottom: 22 }}><div style={{ fontSize: 19, fontWeight: 700, color: "#f0f0f0", marginBottom: 3 }}>Daily Reflection</div><div style={{ fontSize: 10, color: "#333", fontFamily: "monospace", letterSpacing: 1 }}>{today.toUpperCase()}</div></div>
      <div style={{ background: "rgba(255,215,0,.05)", border: "1px solid rgba(255,215,0,.12)", borderRadius: 8, padding: 13, marginBottom: 22 }}><div style={{ fontSize: 13, color: "#c8a84b", lineHeight: 1.7, fontStyle: "italic" }}>The goal is not to be right about the market. The goal is to understand it better each day.</div></div>
      {PROMPTS.map((p, i) => (<div key={i} style={{ marginBottom: 18 }}><label style={{ display: "block", fontSize: 13, color: "#777", marginBottom: 7 }}><span style={{ color: "#333", marginRight: 8, fontFamily: "monospace" }}>0{i + 1}.</span>{p}</label><textarea value={entries[i] || ""} onChange={e => setEntries(en => ({ ...en, [i]: e.target.value }))} placeholder="Write freely…" style={{ width: "100%", minHeight: 68, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, color: "#e0e0e0", fontSize: 13, padding: 11, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, outline: "none", boxSizing: "border-box" }} /></div>))}
      <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }} style={{ width: "100%", padding: 13, borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", background: saved ? "rgba(0,212,170,.14)" : "rgba(192,132,252,.1)", color: saved ? "#00d4aa" : "#c084fc", fontSize: 13, fontWeight: 700 }}>{saved ? "REFLECTION SAVED" : "SAVE REFLECTION"}</button>
    </div>
  );
}

const CONCEPTS = [
  { title: "Why High-Impact News Moves Markets", body: "Markets are priced on expectations. When actual data differs from forecasts, the gap triggers rapid repositioning." },
  { title: "The Dollar Role in Everything", body: "The US Dollar DXY is the world reserve currency. When the dollar strengthens, commodities priced in USD get more expensive for foreign buyers." },
  { title: "Risk-On vs Risk-Off", body: "In times of fear, money flows to safe havens: USD, JPY, CHF, Gold. When confidence returns, money flows to equities, AUD, crude oil." },
  { title: "Futures Contracts ES NQ CL Explained", body: "ES (S&P 500 futures), NQ (Nasdaq futures), CL (crude oil futures) trade nearly 24 hours and gap up or down at the open based on overnight news." },
  { title: "Interest Rates and Currency Value", body: "Higher rates make a currency more attractive. When the Fed raises rates, USD strengthens. It is rate expectations, not the rate itself, that drive moves." },
  { title: "Geopolitical Events and Market Impact", body: "War, sanctions, and political instability create uncertainty. Always ask: who is affected in the supply chain or trade relationship?" },
  { title: "Reading News Like a Trader", body: "The question is not whether news is good or bad. It is whether it is better or worse than expected. Always check consensus forecasts." },
  { title: "Options Flow and Dealer Gamma", body: "Dealers who sell options must hedge by buying or selling the underlying. Max pain is the strike where options expire worthless for the most buyers." },
];

function Learn() {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <div style={{ marginBottom: 22 }}><div style={{ fontSize: 19, fontWeight: 700, color: "#f0f0f0", marginBottom: 3 }}>Learn to Fish</div><div style={{ fontSize: 13, color: "#444" }}>The macro concepts behind every market move</div></div>
      {CONCEPTS.map((c, i) => (<div key={i} onClick={() => setOpen(open === i ? null : i)} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: 15, marginBottom: 9, cursor: "pointer" }}><div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}><div style={{ fontSize: 13, fontWeight: 600, color: "#d0d0d0", flex: 1, marginRight: 8 }}>{c.title}</div><span style={{ color: "#333", flexShrink: 0 }}>{open === i ? "^" : "v"}</span></div>{open === i && <div style={{ marginTop: 13, fontSize: 13, color: "#999", lineHeight: 1.8, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.06)" }}>{c.body}</div>}</div>))}
    </div>
  );
}

// ── APP INNER (authenticated) ─────────────────────────────────────────────────
function AppInner({ navigate }) {
  const { user } = useUser();
  const { signOut } = useClerk();
  const [isPro, setIsPro] = useState(false);

  useEffect(() => {
    if (!user) return;
    const proMeta = user.publicMetadata?.pro === true;
    const proLocal = localStorage.getItem(`pro_${user.id}`) === "true";
    setIsPro(proMeta || proLocal);
    const params = new URLSearchParams(window.location.search);
    if (params.get("upgraded") === "true") {
      localStorage.setItem(`pro_${user.id}`, "true");
      setIsPro(true);
      window.history.replaceState({}, "", "/app");
    }
  }, [user]);

  useEffect(() => {
    const handler = (e) => { e.preventDefault(); window._deferredInstallPrompt = e; };
    window.addEventListener("beforeinstallprompt", handler);
    return () => window.removeEventListener("beforeinstallprompt", handler);
  }, []);

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
  const [stockQuery, setStockQuery] = useState("");
  const [stockData, setStockData] = useState(null);
  const [stockLoading, setStockLoading] = useState(false);
  const [stockError, setStockError] = useState(null);

  const triggerUpgrade = (reason = "limit") => { setUpgradeReason(reason); setShowUpgrade(true); };

  const run = async (q, m) => {
    if (!canBrief) { triggerUpgrade("limit"); return; }
    const mm = m !== undefined ? m : mode;
    if (mm === "scalper" && !isPro) { triggerUpgrade("scalper"); return; }
    const found = detect(q);
    setInst(found); setLoading(true); setError(null); setData(null); setTab("intel");
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

  // Tabs — Options Flow removed until API is ready
  const TABS = [
    { id: "intel", label: "Intelligence" },
    { id: "stocks", label: "Stocks" },
    { id: "journal", label: "Reflection" },
    { id: "learn", label: "Learn" }
  ];

  return (
    <>
      <style>{`*, *::before, *::after { box-sizing: border-box; } body { margin: 0; padding: 0; } textarea { box-sizing: border-box; } @media (max-width: 480px) { .main-content { padding: 14px 14px 60px !important; } .header-inner { padding: 14px 14px 0 !important; } }`}</style>
      {showUpgrade && <UpgradeModal reason={upgradeReason} onClose={() => setShowUpgrade(false)} userId={user?.id} email={user?.primaryEmailAddress?.emailAddress} />}
      <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0e0e0", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div className="header-inner" style={{ background: "linear-gradient(180deg,#0d1117,#0a0c0f)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "16px 20px 0", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 860, margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
              <div onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff" }}>MARKET BRIEF</div>
                <div style={{ fontSize: 9, color: "#2a2a2a", letterSpacing: 2, fontFamily: "monospace" }}>INTELLIGENCE — REFLECTION — EDUCATION</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!isPro && <button onClick={() => triggerUpgrade("limit")} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: remaining <= 1 ? "rgba(255,71,87,.1)" : "rgba(255,255,255,.03)", border: "1px solid " + (remaining <= 1 ? "rgba(255,71,87,.3)" : "rgba(255,255,255,.07)"), color: remaining <= 1 ? "#ff4757" : "#333", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>{remaining} left</button>}
                {isPro && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: "rgba(0,212,255,.08)", border: "1px solid rgba(0,212,255,.2)", color: "#00d4ff", fontWeight: 700 }}>PRO</span>}
                <span style={{ fontSize: 9, fontFamily: "monospace", color: "#2a2a2a", letterSpacing: 1 }}>
                  {new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short" }).toUpperCase()}
                </span>
                <button
                  onClick={() => {
                    if (window.matchMedia("(display-mode: standalone)").matches) return;
                    if (window._deferredInstallPrompt) {
                      window._deferredInstallPrompt.prompt();
                    } else {
                      alert("To add to home screen:\n\niOS Safari: tap Share → Add to Home Screen\nAndroid Chrome: tap Menu → Add to Home Screen");
                    }
                  }}
                  style={{ fontSize: 9, fontFamily: "monospace", color: "#00d4ff", padding: "3px 7px", border: "1px solid rgba(0,212,255,.2)", borderRadius: 4, background: "rgba(0,212,255,.05)", cursor: "pointer", display: "flex", alignItems: "center", gap: 4 }}
                >⊕ GET APP</button>
                <a href="/help" target="_blank" rel="noopener noreferrer" style={{ fontSize: 9, fontFamily: "monospace", color: "#222", padding: "3px 7px", border: "1px solid #181818", borderRadius: 4, textDecoration: "none" }}>HELP</a>
                <button onClick={() => signOut({ redirectUrl: "/" })} style={{ fontSize: 9, fontFamily: "monospace", color: "#222", padding: "3px 7px", border: "1px solid #181818", borderRadius: 4, background: "none", cursor: "pointer" }}>SIGN OUT</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
              {[{ id: "full", label: "Full Brief", sub: "Pre-trade research" }, { id: "scalper", label: "Scalper Mode", sub: isPro ? "Live risk check" : "Pro only 🔒" }].map(m => (
                <button key={m.id} onClick={() => switchMode(m.id)} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", background: mode === m.id ? "rgba(0,212,255,.1)" : "rgba(255,255,255,.02)", border: mode === m.id ? "1px solid rgba(0,212,255,.25)" : "1px solid rgba(255,255,255,.05)", color: mode === m.id ? "#00d4ff" : (m.id === "scalper" && !isPro ? "#2a2a2a" : "#444") }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{m.sub}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 11 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run(query.trim())} placeholder={mode === "scalper" ? "ES, NQ, CL, GC, 6E…" : "Euro, Gold, GBP, ES, NQ, Oil, BTC…"} style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 8, color: "#e0e0e0", fontSize: 14, padding: "10px 13px", outline: "none", fontFamily: "inherit", minWidth: 0 }} />
              <button onClick={() => run(query.trim())} disabled={loading} style={{ padding: "10px 16px", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(255,255,255,.02)" : "rgba(0,212,255,.1)", color: loading ? "#2a2a2a" : "#00d4ff", border: "1px solid rgba(0,212,255,.2)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit" }}>{loading ? "…" : "BRIEF ME"}</button>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 13, flexWrap: "wrap" }}>
              {CHIPS.map(({ label, key }) => (<button key={key} onClick={() => { setQuery(label); run(label); }} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", color: "#444" }}>{label}</button>))}
            </div>
            <div style={{ display: "flex", overflowX: "auto" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, minWidth: 60, padding: "9px 4px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#00d4ff" : "#333", borderBottom: "2px solid " + (tab === t.id ? "#00d4ff" : "transparent"), whiteSpace: "nowrap" }}>
                  {t.label}
                  {t.id === "stocks" && !isPro && <span style={{ marginLeft: 3, fontSize: 8 }}>🔒</span>}
                  {t.id === "stocks" && isPro && <span style={{ marginLeft: 4, fontSize: 8, color: "#f59e0b", opacity: 0.6 }}>●</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="main-content" style={{ maxWidth: 860, margin: "0 auto", padding: "20px 20px 60px", width: "100%" }}>
          {tab === "intel" && <div>
            {loading && <Loader />}
            {error && <div style={{ color: "#ff4757", padding: "16px 0", fontSize: 13 }}>{error}</div>}
            {!loading && !error && !data && !inst && (
              <div style={{ textAlign: "center", padding: "56px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>+</div>
                <div style={{ fontSize: 14, color: "#444", marginBottom: 7 }}>{mode === "scalper" ? "Enter your futures contract for a live risk check" : "Enter any instrument for your briefing"}</div>
                <div style={{ fontSize: 11, color: "#2a2a2a" }}>{mode === "scalper" ? "ES · NQ · CL · GC · 6E · RTY · YM" : "Euro · Gold · Silver · Oil · BTC · NQ"}</div>
              </div>
            )}
            {!loading && data && inst && mode === "full" && <FullView inst={inst} data={data} />}
            {!loading && data && inst && mode === "scalper" && <ScalperView inst={inst} data={data} />}
          </div>}
          {tab === "stocks" && (
            isPro
              ? <StocksTab
                  query={stockQuery} setQuery={setStockQuery}
                  data={stockData} setData={setStockData}
                  loading={stockLoading} setLoading={setStockLoading}
                  error={stockError} setError={setStockError}
                />
              : <StockGate onUpgrade={() => triggerUpgrade("stocks")} />
          )}
          {tab === "journal" && <Journal />}
          {tab === "learn" && <Learn />}
        </div>
      </div>
    </>
  );
}
