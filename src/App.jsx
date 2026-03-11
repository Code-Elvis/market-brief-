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
          ? <SignIn signInForceRedirectUrl="/app" fallbackRedirectUrl="/app" appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" } }} />
          : <SignUp signUpForceRedirectUrl="/app" fallbackRedirectUrl="/app" appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" } }} />
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

function LandingPage() {
  const style = `
    @import url('https://fonts.googleapis.com/css2?family=Syne:wght@700;800;900&family=DM+Sans:wght@300;400;500&display=swap');
    html { scroll-behavior: smooth; }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body { background: #050709; }
    .land-btn-primary {
      display: inline-block; padding: 16px 36px; border-radius: 6px;
      background: #00d4ff; color: #000; font-size: 15px; font-weight: 700;
      text-decoration: none; letter-spacing: 0.5px;
      font-family: 'Syne', sans-serif;
      transition: opacity .15s, transform .15s;
    }
    .land-btn-primary:hover { opacity: .88; transform: translateY(-1px); }
    .land-btn-ghost {
      display: inline-block; padding: 16px 36px; border-radius: 6px;
      border: 1px solid rgba(255,255,255,.12); color: #777; font-size: 15px; font-weight: 500;
      text-decoration: none; letter-spacing: 0.5px; font-family: 'DM Sans', sans-serif;
      transition: border-color .15s, color .15s;
    }
    .land-btn-ghost:hover { border-color: rgba(255,255,255,.3); color: #bbb; }
    .feature-card {
      background: rgba(255,255,255,.025);
      border: 1px solid rgba(255,255,255,.07);
      border-radius: 12px; padding: 28px;
      transition: border-color .2s, background .2s;
    }
    .feature-card:hover {
      border-color: rgba(0,212,255,.2);
      background: rgba(0,212,255,.04);
    }
    .ticker-row {
      display: flex; gap: 0; overflow: hidden; white-space: nowrap;
      border-top: 1px solid rgba(255,255,255,.05);
      border-bottom: 1px solid rgba(255,255,255,.05);
    }
    @keyframes ticker { from { transform: translateX(0) } to { transform: translateX(-50%) } }
    .ticker-inner { display: flex; gap: 0; animation: ticker 22s linear infinite; }
    .ticker-item { padding: 10px 28px; font-family: monospace; font-size: 11px; color: #2a2a2a; border-right: 1px solid rgba(255,255,255,.04); }
    @keyframes fadeup { from { opacity: 0; transform: translateY(18px) } to { opacity: 1; transform: translateY(0) } }
    .hero-anim { animation: fadeup .7s ease both; }
    .hero-anim-1 { animation-delay: .1s; }
    .hero-anim-2 { animation-delay: .22s; }
    .hero-anim-3 { animation-delay: .36s; }
    .hero-anim-4 { animation-delay: .5s; }
    @keyframes pulse-dot { 0%,100% { opacity: 1 } 50% { opacity: .3 } }
  `;

  const tickers = ["ES S&P 500", "NQ NASDAQ", "XAU GOLD", "WTI CRUDE", "EUR/USD", "GBP/USD", "BTC/USD", "VIX", "RTY RUSSELL", "YM DOW", "USD/JPY", "AUD/USD"];

  return (
    <div style={{ minHeight: "100vh", background: "#050709", color: "#e0e0e0", fontFamily: "'DM Sans', system-ui, sans-serif" }}>
      <style>{style}</style>

      {/* NAV */}
      <nav style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 100, padding: "18px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid rgba(255,255,255,.04)", background: "rgba(5,7,9,.85)", backdropFilter: "blur(12px)" }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 16, fontWeight: 900, letterSpacing: "-0.3px", color: "#fff" }}>
          MARKET<span style={{ color: "#00d4ff" }}>DEBRIEFS</span>
        </div>
        <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
          <a href="/app" style={{ fontSize: 13, color: "#555", textDecoration: "none", padding: "8px 16px" }}>Sign in</a>
          <a href="/app" className="land-btn-primary" style={{ padding: "9px 20px", fontSize: 13 }}>Start free</a>
        </div>
      </nav>

      {/* HERO */}
      <section style={{ paddingTop: 140, paddingBottom: 80, paddingLeft: 24, paddingRight: 24, textAlign: "center", maxWidth: 780, margin: "0 auto" }}>
        <div className="hero-anim hero-anim-1" style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(0,212,255,.2)", background: "rgba(0,212,255,.06)", marginBottom: 32 }}>
          <span style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", display: "inline-block", animation: "pulse-dot 1.8s ease infinite" }} />
          <span style={{ fontSize: 11, color: "#00d4ff", fontWeight: 600, letterSpacing: 1.5, fontFamily: "monospace" }}>LIVE MACRO INTELLIGENCE</span>
        </div>

        <h1 className="hero-anim hero-anim-2" style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(38px, 7vw, 72px)", fontWeight: 900, color: "#fff", lineHeight: 1.06, letterSpacing: "-2px", marginBottom: 24 }}>
          Bloomberg tells you<br />
          <span style={{ color: "#00d4ff" }}>what happened.</span><br />
          <span style={{ color: "rgba(255,255,255,.35)" }}>We tell you what it means.</span>
        </h1>

        <p className="hero-anim hero-anim-3" style={{ fontSize: 18, color: "#555", lineHeight: 1.75, maxWidth: 520, margin: "0 auto 44px", fontWeight: 300 }}>
          Instant macro briefings for every major instrument. Know the central bank stance, high-impact events, and geopolitical risks before you place a trade.
        </p>

        <div className="hero-anim hero-anim-4" style={{ display: "flex", gap: 12, justifyContent: "center", flexWrap: "wrap", marginBottom: 20 }}>
          <a href="/app" className="land-btn-primary">Start free — 3 briefs/day</a>
          <a href="/app" className="land-btn-ghost">Sign in</a>
        </div>
        <div className="hero-anim hero-anim-4" style={{ fontSize: 12, color: "#2a2a2a" }}>No credit card required for free tier</div>
      </section>

      {/* TICKER */}
      <div className="ticker-row" style={{ marginBottom: 80 }}>
        <div className="ticker-inner">
          {[...tickers, ...tickers].map((t, i) => (
            <div key={i} className="ticker-item">{t}</div>
          ))}
        </div>
      </div>

      {/* PROBLEM / POSITIONING */}
      <section style={{ maxWidth: 900, margin: "0 auto 100px", padding: "0 24px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 2 }}>
          <div style={{ background: "rgba(255,71,87,.04)", border: "1px solid rgba(255,71,87,.12)", borderRadius: "12px 0 0 12px", padding: "36px 32px" }}>
            <div style={{ fontSize: 10, color: "#ff4757", fontWeight: 700, letterSpacing: 2, marginBottom: 16, fontFamily: "monospace" }}>THE OLD WAY</div>
            {["Bloomberg terminal — $30,000/year", "30 tabs open before every trade", "News sites with no trading context", "Macro blind spots that cost you", "Hours of research, no clear answer"].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, fontSize: 14, color: "#555" }}>
                <span style={{ color: "#ff4757", fontSize: 12, flexShrink: 0 }}>✕</span> {t}
              </div>
            ))}
          </div>
          <div style={{ background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.15)", borderRadius: "0 12px 12px 0", padding: "36px 32px" }}>
            <div style={{ fontSize: 10, color: "#00d4ff", fontWeight: 700, letterSpacing: 2, marginBottom: 16, fontFamily: "monospace" }}>MARKET DEBRIEFS</div>
            {["€49/month — full institutional context", "One brief, everything you need to know", "Trading-first macro analysis", "Central bank stance + geopolitical risk", "30 seconds to a complete pre-trade read"].map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: 12, fontSize: 14, color: "#c0d0e0" }}>
                <span style={{ color: "#00d4ff", fontSize: 12, flexShrink: 0 }}>✓</span> {t}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section style={{ maxWidth: 900, margin: "0 auto 100px", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, fontWeight: 700, marginBottom: 16, fontFamily: "monospace" }}>HOW IT WORKS</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 60 }}>Brief me in 30 seconds.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 16 }}>
          {[
            { n: "01", title: "Pick your instrument", body: "ES, NQ, Gold, Oil, EUR/USD, GBP, BTC, VIX and more. Type it or tap a chip." },
            { n: "02", title: "Get your briefing", body: "Instant macro brief: sentiment, high-impact events, central bank stance, geopolitical risks, and why each event moves price." },
            { n: "03", title: "Trade with context", body: "Know what the market is reacting to before you enter. Stop trading blind." },
          ].map((s, i) => (
            <div key={i} className="feature-card" style={{ textAlign: "left" }}>
              <div style={{ fontFamily: "monospace", fontSize: 11, color: "#00d4ff", marginBottom: 16, opacity: .5 }}>{s.n}</div>
              <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 17, fontWeight: 700, color: "#f0f0f0", marginBottom: 10 }}>{s.title}</div>
              <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{s.body}</div>
            </div>
          ))}
        </div>
      </section>

      {/* FEATURES */}
      <section style={{ maxWidth: 900, margin: "0 auto 100px", padding: "0 24px" }}>
        <div style={{ textAlign: "center", fontSize: 10, color: "#333", letterSpacing: 3, fontWeight: 700, marginBottom: 16, fontFamily: "monospace" }}>WHAT YOU GET</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 60, textAlign: "center" }}>Built for traders, not economists.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(2, 1fr)", gap: 14 }}>
          {[
            { icon: "◎", color: "#00d4ff", title: "Full Brief", body: "Pre-trade macro briefing with events, sentiment, geopolitical risks, and teaching moments. Understand why price moves, not just that it moved." },
            { icon: "⚡", color: "#ffd700", title: "Scalper Mode", body: "Green / Yellow / Red risk check for the next 10 minutes. Breaking wire headlines, upcoming events with due time, and a clear scalper note. Pro feature." },
            { icon: "⊕", color: "#c084fc", title: "Options Flow", body: "Dealer positioning, key gamma levels, call/put walls, GEX flip zones, and max pain strike for equity instruments. Know where the magnet is. Pro feature." },
            { icon: "✦", color: "#00d4aa", title: "14 Instruments", body: "ES, NQ, Gold, Oil, DXY, EUR/USD, GBP, BTC, ETH, JPY, AUD, VIX, RTY, YM. Every major futures and FX instrument covered." },
            { icon: "◐", color: "#ff8c42", title: "Daily Reflection", body: "Built-in trading journal with 6 guided prompts. Review your decisions, not just your P&L. The habit that separates consistent traders." },
            { icon: "∿", color: "#f87171", title: "Learn to Fish", body: "Eight macro education modules built into the app. Understand risk-on vs off, the dollar's role, how options flow moves price, and more." },
          ].map((f, i) => (
            <div key={i} className="feature-card" style={{ display: "flex", gap: 18, alignItems: "flex-start" }}>
              <div style={{ fontSize: 20, color: f.color, flexShrink: 0, marginTop: 2 }}>{f.icon}</div>
              <div>
                <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 15, fontWeight: 700, color: "#f0f0f0", marginBottom: 7 }}>{f.title}</div>
                <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>{f.body}</div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* PRICING */}
      <section style={{ maxWidth: 680, margin: "0 auto 100px", padding: "0 24px", textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#333", letterSpacing: 3, fontWeight: 700, marginBottom: 16, fontFamily: "monospace" }}>PRICING</div>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(26px, 4vw, 42px)", fontWeight: 800, color: "#fff", letterSpacing: "-1px", marginBottom: 60 }}>Less than a single bad trade.</h2>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, textAlign: "left" }}>
          {/* FREE */}
          <div style={{ border: "1px solid rgba(255,255,255,.08)", borderRadius: 14, padding: "30px 26px" }}>
            <div style={{ fontSize: 11, color: "#555", letterSpacing: 1.5, fontWeight: 600, marginBottom: 12, fontFamily: "monospace" }}>FREE</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 4 }}>€0</div>
            <div style={{ fontSize: 12, color: "#333", marginBottom: 24 }}>forever</div>
            {["3 Full Briefs per day", "All 14 instruments", "Daily Reflection journal", "Learn to Fish modules"].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 10, fontSize: 13, color: "#555" }}>
                <span style={{ color: "#2a2a2a", fontSize: 11 }}>✓</span> {f}
              </div>
            ))}
            <a href="/app" style={{ display: "block", textAlign: "center", marginTop: 24, padding: "12px", borderRadius: 8, border: "1px solid rgba(255,255,255,.08)", color: "#555", fontSize: 13, fontWeight: 600, textDecoration: "none", fontFamily: "inherit" }}>Get started free</a>
          </div>
          {/* PRO */}
          <div style={{ border: "1px solid rgba(0,212,255,.3)", borderRadius: 14, padding: "30px 26px", background: "rgba(0,212,255,.03)", position: "relative" }}>
            <div style={{ position: "absolute", top: -1, right: 20, background: "#00d4ff", color: "#000", fontSize: 9, fontWeight: 800, padding: "4px 10px", borderRadius: "0 0 6px 6px", letterSpacing: 1 }}>MOST POPULAR</div>
            <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: 1.5, fontWeight: 600, marginBottom: 12, fontFamily: "monospace" }}>PRO</div>
            <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 36, fontWeight: 900, color: "#fff", marginBottom: 4 }}>€49</div>
            <div style={{ fontSize: 12, color: "#333", marginBottom: 24 }}>per month — cancel anytime</div>
            {["Unlimited briefs every day", "Scalper Mode — GREEN/YELLOW/RED", "Options Flow + dealer positioning", "All Free features included", "Bloomberg context at 0.2% of the cost"].map((f, i) => (
              <div key={i} style={{ display: "flex", gap: 9, alignItems: "center", marginBottom: 10, fontSize: 13, color: "#c0d0e0" }}>
                <span style={{ color: "#00d4ff", fontSize: 11 }}>✓</span> {f}
              </div>
            ))}
            <a href="/app" className="land-btn-primary" style={{ display: "block", textAlign: "center", marginTop: 24, padding: "12px" }}>Start with Pro</a>
          </div>
        </div>
        <div style={{ marginTop: 20, fontSize: 12, color: "#222" }}>Bloomberg terminal costs ~$30,000/year. Market Debriefs Pro is €588/year.</div>
      </section>

      {/* FINAL CTA */}
      <section style={{ textAlign: "center", padding: "80px 24px 120px", borderTop: "1px solid rgba(255,255,255,.04)" }}>
        <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: "clamp(28px, 5vw, 52px)", fontWeight: 900, color: "#fff", letterSpacing: "-1.5px", marginBottom: 20, lineHeight: 1.1 }}>
          Stop trading blind.<br /><span style={{ color: "#00d4ff" }}>Know the macro.</span>
        </h2>
        <p style={{ fontSize: 16, color: "#444", marginBottom: 36, maxWidth: 400, margin: "0 auto 36px" }}>Free to start. 30 seconds to your first brief.</p>
        <a href="/app" className="land-btn-primary" style={{ fontSize: 16, padding: "18px 44px" }}>Get your first brief free</a>
      </section>

      {/* FOOTER */}
      <footer style={{ borderTop: "1px solid rgba(255,255,255,.04)", padding: "24px 32px", display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
        <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 800, color: "#1a1a1a" }}>MARKET<span style={{ color: "#0a3a44" }}>DEBRIEFS</span></div>
        <div style={{ fontSize: 11, color: "#1a1a1a" }}>Not financial advice. For informational purposes only.</div>
      </footer>
    </div>
  );
}

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
      {data.geopolitical_risks && (
        <div style={{ background: "rgba(255,140,0,.08)", border: "1px solid rgba(255,140,0,.25)", borderRadius: 8, padding: 14, marginBottom: 15 }}>
          <div style={{ fontSize: 9, color: "#ff8c00", fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>GEOPOLITICAL RISK</div>
          <div style={{ fontSize: 13, color: "#e0c88a", lineHeight: 1.6 }}>{data.geopolitical_risks}</div>
        </div>
      )}
      <div style={{ fontSize: 9, color: "#333", letterSpacing: 2, fontWeight: 700, marginBottom: 11 }}>HIGH-IMPACT EVENTS</div>
      {data.events && data.events.map((e, i) => <EventCard key={i} ev={e} />)}
      {data.key_levels_context && (
        <div style={{ background: "rgba(0,212,255,.06)", border: "1px solid rgba(0,212,255,.15)", borderRadius: 8, padding: 13, marginBottom: 13 }}>
          <div style={{ fontSize: 9, color: "#00d4ff", fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>WHAT TO WATCH</div>
          <div style={{ fontSize: 13, color: "#a8d8ea", lineHeight: 1.65 }}>{data.key_levels_context}</div>
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
      <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: 13, marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: "#666", letterSpacing: 1.5, fontWeight: 700, marginBottom: 5 }}>SCALPER NOTE</div>
        <div style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.6, fontWeight: 500 }}>{data.scalper_note}</div>
      </div>
      {data.breaking && data.breaking.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "#ff4757", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>JUST HIT THE WIRE</div>
          {data.breaking.map((b, i) => (
            <div key={i} style={{ background: DB[b.direction] || "rgba(255,255,255,.02)", borderLeft: "3px solid " + (DC[b.direction] || "#555"), borderRadius: 8, padding: "11px 13px", marginBottom: 7 }}>
              <div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}>
                <div style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 600, flex: 1 }}>{b.headline}</div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  <div style={{ fontSize: 10, fontWeight: 800, color: DC[b.direction] || "#888" }}>{b.direction}</div>
                  <div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{b.age}</div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
      {data.imminent && data.imminent.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "#ffd700", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>COMING UP NEXT</div>
          {data.imminent.map((ev, i) => (
            <div key={i} style={{ background: "rgba(255,215,0,.05)", border: "1px solid rgba(255,215,0,.15)", borderRadius: 8, padding: "11px 13px", marginBottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 600 }}>{ev.event}</div>
              <div style={{ textAlign: "right", marginLeft: 12 }}>
                <div style={{ fontSize: 11, color: "#ffd700", fontWeight: 700 }}>in {ev.due_in}</div>
                <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{ev.expected_impact}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function GammaLevelCard({ level }) {
  const [open, setOpen] = useState(false);
  const meta = TYPE_COLORS[level.type] || { color: "#888", bg: "rgba(255,255,255,.04)", label: level.type };
  return (
    <div onClick={() => setOpen(o => !o)} style={{ background: meta.bg, border: "1px solid " + meta.color + "33", borderLeft: "3px solid " + meta.color, borderRadius: 8, padding: "13px 15px", marginBottom: 8, cursor: "pointer" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 4 }}>
            <span style={{ fontSize: 9, fontWeight: 800, letterSpacing: 1.2, color: meta.color, border: "1px solid " + meta.color + "44", padding: "2px 7px", borderRadius: 3 }}>{meta.label}</span>
          </div>
          <div style={{ fontSize: 15, fontWeight: 800, color: "#f0f0f0", fontFamily: "monospace" }}>{level.label}</div>
        </div>
        <div style={{ fontSize: 18, fontWeight: 900, color: meta.color, fontFamily: "monospace" }}>{level.strike.toLocaleString()}</div>
      </div>
      {open && <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)", fontSize: 13, color: "#b0c4d8", lineHeight: 1.7 }}>{level.context}</div>}
      <div style={{ fontSize: 10, color: "#333", marginTop: 5, textAlign: "right" }}>{open ? "collapse" : "tap for context"}</div>
    </div>
  );
}

function OptionsFlowView({ inst, data, loading, error, onFetch, lastUpdated, isPro, onUpgrade }) {
  if (!isPro) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 32, marginBottom: 18, opacity: 0.2 }}>⊕</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#e0e0e0", marginBottom: 10 }}>Options Flow</div>
      <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7, maxWidth: 300, margin: "0 auto 24px" }}>Dealer positioning, key gamma levels, and options flow intelligence. Pro feature.</div>
      <button onClick={onUpgrade} style={{ padding: "11px 24px", borderRadius: 8, cursor: "pointer", background: "rgba(0,212,255,.1)", color: "#00d4ff", border: "1px solid rgba(0,212,255,.25)", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>UPGRADE TO PRO</button>
    </div>
  );
  if (!inst) return <div style={{ textAlign: "center", padding: "56px 20px" }}><div style={{ fontSize: 38, marginBottom: 14, opacity: 0.3 }}>⊕</div><div style={{ fontSize: 14, color: "#444" }}>Run a brief first to load Options Flow</div></div>;
  if (!inst.optionsTicker) return <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 12, padding: 24, textAlign: "center" }}><div style={{ fontSize: 13, color: "#555" }}>No listed options market for {inst.label}</div></div>;
  if (loading) return <Loader />;
  if (data && data.coming_soon) return (
    <div style={{ textAlign: "center", padding: "60px 20px" }}>
      <div style={{ fontSize: 32, marginBottom: 18, opacity: 0.15 }}>◎</div>
      <div style={{ fontSize: 15, fontWeight: 700, color: "#e0e0e0", marginBottom: 10 }}>Options Flow</div>
      <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7, maxWidth: 320, margin: "0 auto 20px" }}>Real-time dealer positioning launching soon with live data.</div>
      <div style={{ display: "inline-flex", gap: 6, alignItems: "center", padding: "6px 14px", borderRadius: 20, border: "1px solid rgba(0,212,255,.15)", background: "rgba(0,212,255,.04)" }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", opacity: 0.5 }} />
        <span style={{ fontSize: 11, color: "#00d4ff", opacity: 0.5, letterSpacing: 1, fontWeight: 700 }}>COMING SOON</span>
      </div>
    </div>
  );
  if (error) return <div style={{ color: "#ff4757", padding: "16px 0", fontSize: 13 }}>{error}</div>;
  if (!data) return (
    <div style={{ textAlign: "center", padding: "40px 20px" }}>
      <div style={{ fontSize: 13, color: "#555", marginBottom: 16 }}>Options flow for <span style={{ color: inst.color }}>{inst.label}</span> via {inst.optionsTicker}</div>
      <button onClick={onFetch} style={{ padding: "11px 24px", borderRadius: 8, cursor: "pointer", background: "rgba(0,212,255,.1)", color: "#00d4ff", border: "1px solid rgba(0,212,255,.25)", fontSize: 12, fontWeight: 700, fontFamily: "inherit" }}>LOAD OPTIONS FLOW</button>
    </div>
  );
  return (
    <div>
      <div style={{ background: "linear-gradient(135deg," + inst.color + "12,transparent)", border: "1px solid " + inst.color + "2a", borderRadius: 12, padding: "16px 18px", marginBottom: 18, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div><div style={{ fontSize: 17, fontWeight: 800, color: inst.color, marginBottom: 2 }}>{inst.flag} {inst.label} — Options Flow</div><div style={{ fontSize: 10, color: "#444", fontFamily: "monospace" }}>via {data.ticker} · {data.as_of}</div></div>
        {lastUpdated && <div style={{ textAlign: "right" }}><div style={{ fontSize: 9, color: "#2a2a2a", fontFamily: "monospace" }}>UPDATED</div><div style={{ fontSize: 10, color: "#333", fontFamily: "monospace" }}>{lastUpdated}</div></div>}
      </div>
      {data.max_pain && <div style={{ background: "rgba(255,215,0,.06)", border: "1px solid rgba(255,215,0,.2)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}><div style={{ fontSize: 9, color: "#ffd700", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>MAX PAIN STRIKE</div><div style={{ fontSize: 22, fontWeight: 900, color: "#ffd700", fontFamily: "monospace", marginBottom: 6 }}>{data.max_pain.strike?.toLocaleString()}</div><div style={{ fontSize: 13, color: "#c8a84b", lineHeight: 1.6 }}>{data.max_pain.context}</div></div>}
      {data.gamma_levels && data.gamma_levels.length > 0 && <div style={{ marginBottom: 16 }}><div style={{ fontSize: 9, color: "#444", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>KEY STRIKE LEVELS</div>{data.gamma_levels.map((l, i) => <GammaLevelCard key={i} level={l} />)}</div>}
      {data.dealer_positioning && <div style={{ background: "rgba(192,132,252,.06)", border: "1px solid rgba(192,132,252,.18)", borderRadius: 10, padding: "14px 16px", marginBottom: 14 }}><div style={{ fontSize: 9, color: "#c084fc", fontWeight: 700, letterSpacing: 1.5, marginBottom: 6 }}>DEALER POSITIONING</div><div style={{ fontSize: 13, color: "#d4b8f7", lineHeight: 1.7 }}>{data.dealer_positioning}</div></div>}
      <div style={{ marginTop: 20, textAlign: "center" }}><button onClick={onFetch} style={{ padding: "9px 20px", borderRadius: 7, cursor: "pointer", background: "rgba(255,255,255,.02)", color: "#333", border: "1px solid rgba(255,255,255,.06)", fontSize: 11, fontWeight: 600, fontFamily: "inherit" }}>↻ REFRESH</button></div>
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
      {PROMPTS.map((p, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, color: "#777", marginBottom: 7 }}><span style={{ color: "#333", marginRight: 8, fontFamily: "monospace" }}>0{i + 1}.</span>{p}</label>
          <textarea value={entries[i] || ""} onChange={e => setEntries(en => ({ ...en, [i]: e.target.value }))} placeholder="Write freely..." style={{ width: "100%", minHeight: 68, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, color: "#e0e0e0", fontSize: 13, padding: 11, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, outline: "none", boxSizing: "border-box" }} />
        </div>
      ))}
      <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }} style={{ width: "100%", padding: 13, borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", background: saved ? "rgba(0,212,170,.14)" : "rgba(192,132,252,.1)", color: saved ? "#00d4aa" : "#c084fc", fontSize: 13, fontWeight: 700 }}>{saved ? "REFLECTION SAVED" : "SAVE REFLECTION"}</button>
    </div>
  );
}

const CONCEPTS = [
  { title: "Why High-Impact News Moves Markets", body: "Markets are priced on expectations. When actual data differs from forecasts, the gap triggers rapid repositioning. A jobs report beat does not just mean employment is good — traders positioned for a miss must cover fast, compounding the move." },
  { title: "The Dollar Role in Everything", body: "The US Dollar DXY is the world reserve currency. When the dollar strengthens, commodities priced in USD like gold and oil get more expensive for foreign buyers — demand falls, price falls." },
  { title: "Risk-On vs Risk-Off", body: "In times of fear such as wars and crashes, money flows to safe havens: USD, JPY, CHF, Gold. When confidence returns, money flows to equities, AUD, NZD, crude oil. Identify which regime you are in." },
  { title: "Futures Contracts ES NQ CL Explained", body: "ES (S&P 500 futures), NQ (Nasdaq futures), CL (crude oil futures) trade nearly 24 hours and gap up or down at the open based on overnight news. Futures lead spot markets." },
  { title: "Interest Rates and Currency Value", body: "Higher rates make a currency more attractive. When the Fed raises rates, USD strengthens. When ECB cuts, EUR weakens. It is rate expectations, not the rate itself, that drive moves." },
  { title: "Geopolitical Events and Market Impact", body: "War, sanctions, and political instability create uncertainty. When conflict escalates in oil-producing regions, oil spikes. Always ask: who is affected in the supply chain or trade relationship?" },
  { title: "Reading News Like a Trader", body: "The question is not whether news is good or bad. It is whether it is better or worse than expected. This is why price drops on good news — it was already priced in. Always check consensus forecasts." },
  { title: "Options Flow and Dealer Gamma", body: "Dealers who sell options must hedge by buying or selling the underlying. At large call walls, dealers buy as price rises — this can act like a magnet. At put walls, dealers sell as price falls — this can accelerate drops. Max pain is the strike where options expire worthless for the most buyers." },
];

function Learn() {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <div style={{ marginBottom: 22 }}><div style={{ fontSize: 19, fontWeight: 700, color: "#f0f0f0", marginBottom: 3 }}>Learn to Fish</div><div style={{ fontSize: 13, color: "#444" }}>The macro concepts behind every market move</div></div>
      {CONCEPTS.map((c, i) => (
        <div key={i} onClick={() => setOpen(open === i ? null : i)} style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 10, padding: 15, marginBottom: 9, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: "#d0d0d0", flex: 1, marginRight: 8 }}>{c.title}</div>
            <span style={{ color: "#333", flexShrink: 0 }}>{open === i ? "^" : "v"}</span>
          </div>
          {open === i && <div style={{ marginTop: 13, fontSize: 13, color: "#999", lineHeight: 1.8, paddingTop: 13, borderTop: "1px solid rgba(255,255,255,.06)" }}>{c.body}</div>}
        </div>
      ))}
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
  const path = window.location.pathname;

  if (!isLoaded) {
    return (
      <div style={{ minHeight: "100vh", background: "#0a0c0f", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <div style={{ color: "#333", fontSize: 13, fontFamily: "monospace" }}>...</div>
      </div>
    );
  }

  // /app route: show auth or the app
  if (path.startsWith("/app")) {
    if (isSignedIn) return <AppInner />;
    return <AuthScreen />;
  }

  // / root route: if signed in send straight to /app, else show landing
  if (isSignedIn) {
    window.location.replace("/app");
    return null;
  }

  return <LandingPage />;
}
