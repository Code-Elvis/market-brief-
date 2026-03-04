import { useState } from "react";

const INSTRUMENTS = {
  euro: { label: "EUR/USD", aliases: ["euro","eurusd","eur","6e"], color: "#00d4ff", flag: "EU" },
  gbp: { label: "GBP/USD", aliases: ["gbp","pound","cable","gbpusd","6b"], color: "#7fff7f", flag: "GB" },
  gold: { label: "XAU/USD Gold", aliases: ["gold","xauusd","xau","gc","gc1"], color: "#ffd700", flag: "XAU" },
  oil: { label: "WTI Crude", aliases: ["oil","crude","wti","usoil","cl","cl1"], color: "#ff8c42", flag: "OIL" },
  dxy: { label: "US Dollar DXY", aliases: ["dxy","dollar","usd","dx"], color: "#c084fc", flag: "USD" },
  es: { label: "ES S&P 500", aliases: ["es","es1","sp500","spx","spy","s&p"], color: "#00ffcc", flag: "ES" },
  nq: { label: "NQ NASDAQ 100", aliases: ["nq","nq1","nasdaq","nas100","ndx","qqq"], color: "#f472b6", flag: "NQ" },
  rty: { label: "RTY Russell 2000", aliases: ["rty","russell","iwm"], color: "#fb923c", flag: "RTY" },
  ym: { label: "YM Dow Jones", aliases: ["ym","ym1","dow","djia","dia"], color: "#a78bfa", flag: "YM" },
  btc: { label: "Bitcoin", aliases: ["btc","bitcoin","crypto","btcusd"], color: "#f7931a", flag: "BTC" },
  eth: { label: "Ethereum", aliases: ["eth","ethereum","ethusd"], color: "#627eea", flag: "ETH" },
  jpy: { label: "USD/JPY", aliases: ["jpy","yen","usdjpy","6j"], color: "#ff6b6b", flag: "JPY" },
  aud: { label: "AUD/USD", aliases: ["aud","aussie","audusd","6a"], color: "#34d399", flag: "AUD" },
  vix: { label: "VIX Fear Index", aliases: ["vix","volatility","fear"], color: "#f87171", flag: "VIX" },
};

const CHIPS = [
  { label: "ES", key: "es" },
  { label: "NQ", key: "nq" },
  { label: "Gold", key: "gold" },
  { label: "Oil", key: "oil" },
  { label: "Euro", key: "euro" },
  { label: "GBP", key: "gbp" },
  { label: "BTC", key: "btc" },
  { label: "VIX", key: "vix" },
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
  const base = [
    "You are a professional market intelligence analyst.",
    "Respond ONLY with valid JSON.",
    "No markdown, no backticks, no preamble.",
    "Start your response with { and end with }."
  ].join(" ");

  if (mode === "scalper") {
    return base + " SCALPER MODE: trader is about to trade RIGHT NOW. Be brief." +
      ' Schema: {"instrument":"string","risk_level":"GREEN|YELLOW|RED","risk_reason":"string","scalper_note":"string",' +
      '"breaking":[{"headline":"string","direction":"BULLISH|BEARISH|NEUTRAL","age":"string"}],' +
      '"imminent":[{"event":"string","due_in":"string","expected_impact":"string"}]}';
  }
  return base + " FULL BRIEF MODE: search for today high-impact news and economic events." +
    ' Schema: {"instrument":"string","sentiment":"bullish|bearish|neutral|mixed","headline_summary":"string",' +
    '"events":[{"title":"string","time":"string","impact":"HIGH|MEDIUM","direction":"BULLISH|BEARISH|NEUTRAL",' +
    '"summary":"string","why_it_moves_price":"string","confidence":"HIGH|MEDIUM|LOW"}],' +
    '"geopolitical_risks":"string","key_levels_context":"string","teaching_moment":"string"}';
}

function userPrompt(inst, mode) {
  const now = new Date().toLocaleString("en-GB", {
    weekday: "long", year: "numeric", month: "long",
    day: "numeric", hour: "2-digit", minute: "2-digit"
  });
  if (mode === "scalper") {
    return "Time: " + now + ". About to trade " + inst.label + ". What hit in last 10 min? What is due next 15 min? GREEN YELLOW or RED?";
  }
  return "Today: " + now + ". Full high-impact briefing for " + inst.label + ". Search economic events, central bank news, geopolitical developments. Explain WHY each moves price.";
}

async function getBriefing(inst, mode) {
  const res = await fetch("/api/brief", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 1000,
      system: sysPrompt(mode),
      messages: [{ role: "user", content: userPrompt(inst, mode) }]
    })
  });
  if (!res.ok) throw new Error("API error " + res.status);
  const data = await res.json();
const raw = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
const text = raw.replace(/<cite[^>]*>|<\/cite>/g, "");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON in response");
  return JSON.parse(match[0]);
}

const DC = { BULLISH: "#00d4aa", BEARISH: "#ff4757", NEUTRAL: "#ffd700" };
const DB = { BULLISH: "rgba(0,212,170,.08)", BEARISH: "rgba(255,71,87,.08)", NEUTRAL: "rgba(255,215,0,.06)" };

function Loader() {
  return (
    <div>
      <style>{"@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}"}</style>
      {[90, 65, 80].map((h, i) => (
        <div key={i} style={{
          height: h, borderRadius: 8, marginBottom: 12,
          background: "linear-gradient(90deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.03) 100%)",
          backgroundSize: "200% 100%",
          animation: "sh 1.4s " + (i * 0.15) + "s infinite"
        }} />
      ))}
    </div>
  );
}

function EventCard({ ev }) {
  const [open, setOpen] = useState(false);
  const c = DC[ev.direction] || "#666";
  return (
    <div onClick={() => setOpen(o => !o)} style={{
      background: DB[ev.direction] || "rgba(255,255,255,.02)",
      borderLeft: "3px solid " + c,
      border: "1px solid " + c + "22",
      borderRadius: 8, padding: "13px 15px", marginBottom: 9, cursor: "pointer"
    }}>
      <div style={{ display: "flex", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", gap: 7, marginBottom: 4, flexWrap: "wrap", alignItems: "center" }}>
            <span style={{ fontFamily: "monospace", fontSize: 10, color: "#777" }}>{ev.time}</span>
            {ev.impact === "HIGH" && (
              <span style={{ fontSize: 9, padding: "2px 6px", borderRadius: 3, fontWeight: 700, background: "rgba(255,71,87,.15)", color: "#ff4757" }}>HIGH</span>
            )}
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
          <div style={{ fontSize: 13, color: "#c8d6e5", lineHeight: 1.75, background: "rgba(0,0,0,.25)", padding: 11, borderRadius: 6 }}>
            {ev.why_it_moves_price}
          </div>
        </div>
      )}
      <div style={{ fontSize: 10, color: "#333", marginTop: 6, textAlign: "right" }}>
        {open ? "collapse" : "tap to understand why"}
      </div>
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

const PROMPTS = [
  "What did the market do today that surprised you?",
  "Did you follow your plan? What made it hard?",
  "What did the market try to teach you today?",
  "What emotion showed up most in your trading today?",
  "What will you do differently tomorrow?",
  "One thing you are proud of from today."
];

function Journal() {
  const today = new Date().toLocaleDateString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric" });
  const [entries, setEntries] = useState({});
  const [saved, setSaved] = useState(false);
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: "#f0f0f0", marginBottom: 3 }}>Daily Reflection</div>
        <div style={{ fontSize: 10, color: "#333", fontFamily: "monospace", letterSpacing: 1 }}>{today.toUpperCase()}</div>
      </div>
      <div style={{ background: "rgba(255,215,0,.05)", border: "1px solid rgba(255,215,0,.12)", borderRadius: 8, padding: 13, marginBottom: 22 }}>
        <div style={{ fontSize: 13, color: "#c8a84b", lineHeight: 1.7, fontStyle: "italic" }}>
          The goal is not to be right about the market. The goal is to understand it better each day.
        </div>
      </div>
      {PROMPTS.map((p, i) => (
        <div key={i} style={{ marginBottom: 18 }}>
          <label style={{ display: "block", fontSize: 13, color: "#777", marginBottom: 7 }}>
            <span style={{ color: "#333", marginRight: 8, fontFamily: "monospace" }}>0{i + 1}.</span>{p}
          </label>
          <textarea
            value={entries[i] || ""}
            onChange={e => setEntries(en => ({ ...en, [i]: e.target.value }))}
            placeholder="Write freely..."
            style={{ width: "100%", minHeight: 68, background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, color: "#e0e0e0", fontSize: 13, padding: 11, resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, outline: "none", boxSizing: "border-box" }}
          />
        </div>
      ))}
      <button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }}
        style={{ width: "100%", padding: 13, borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", background: saved ? "rgba(0,212,170,.14)" : "rgba(192,132,252,.1)", color: saved ? "#00d4aa" : "#c084fc", fontSize: 13, fontWeight: 700 }}>
        {saved ? "REFLECTION SAVED" : "SAVE REFLECTION"}
      </button>
    </div>
  );
}

const CONCEPTS = [
  { title: "Why High-Impact News Moves Markets", body: "Markets are priced on expectations. When actual data differs from forecasts, the gap triggers rapid repositioning. A jobs report beat does not just mean employment is good — traders positioned for a miss must cover fast, compounding the move." },
  { title: "The Dollar Role in Everything", body: "The US Dollar DXY is the world reserve currency. When the dollar strengthens, commodities priced in USD like gold and oil get more expensive for foreign buyers — demand falls, price falls. Dollar strength also weighs on EUR/USD, GBP/USD, AUD/USD." },
  { title: "Risk-On vs Risk-Off", body: "In times of fear such as wars and crashes, money flows to safe havens: USD, JPY, CHF, Gold. These are risk-off trades. When confidence returns, money flows to equities, AUD, NZD, crude oil. Identify which regime you are in — it shapes every trade." },
  { title: "Futures Contracts ES NQ CL Explained", body: "ES (S&P 500 futures), NQ (Nasdaq futures), CL (crude oil futures) trade nearly 24 hours and gap up or down at the open based on overnight news. Futures lead spot markets. Scalpers watch futures because they react fastest to breaking news." },
  { title: "Interest Rates and Currency Value", body: "Higher rates make a currency more attractive. When the Fed raises rates, USD strengthens. When ECB cuts, EUR weakens. Key insight: it is rate expectations, not the rate itself, that drive moves. Markets price in the future." },
  { title: "Geopolitical Events and Market Impact", body: "War, sanctions, and political instability create uncertainty — and markets hate uncertainty. When conflict escalates in oil-producing regions, oil spikes. Always ask: who is affected in the supply chain or trade relationship?" },
  { title: "Reading News Like a Trader", body: "The question is not whether news is good or bad. It is whether it is better or worse than expected. Markets are forward-looking. This is why price drops on good news — it was already priced in. Always check consensus forecasts before reacting." }
];

function Learn() {
  const [open, setOpen] = useState(null);
  return (
    <div>
      <div style={{ marginBottom: 22 }}>
        <div style={{ fontSize: 19, fontWeight: 700, color: "#f0f0f0", marginBottom: 3 }}>Learn to Fish</div>
        <div style={{ fontSize: 13, color: "#444" }}>The macro concepts behind every market move</div>
      </div>
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

export default function App() {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("intel");
  const [mode, setMode] = useState("full");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [inst, setInst] = useState(null);
  const [error, setError] = useState(null);

  const run = async (q, m) => {
    const mm = m !== undefined ? m : mode;
    const found = detect(q);
    if (!found) { setError("Not recognised. Try: ES, NQ, Euro, Gold, GBP, Oil, BTC"); return; }
    setInst(found); setLoading(true); setError(null); setData(null); setTab("intel");
    try {
      const result = await getBriefing(found, mm);
      setData(result);
    } catch (e) {
      setError("Fetch failed. Please try again.");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (m) => {
    setMode(m);
    if (inst && data) run(inst.label, m);
  };

  const TABS = [
    { id: "intel", label: "Intelligence" },
    { id: "journal", label: "Reflection" },
    { id: "learn", label: "Learn" }
  ];

  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0e0e0", fontFamily: "Inter, system-ui, sans-serif" }}>
      <div style={{ background: "linear-gradient(180deg,#0d1117,#0a0c0f)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "16px 18px 0", position: "sticky", top: 0, zIndex: 100 }}>
        <div style={{ maxWidth: 620, margin: "0 auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
            <div>
              <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff" }}>MARKET BRIEF</div>
              <div style={{ fontSize: 9, color: "#2a2a2a", letterSpacing: 2, fontFamily: "monospace" }}>INTELLIGENCE - REFLECTION - EDUCATION</div>
            </div>
            <div style={{ fontSize: 9, fontFamily: "monospace", color: "#222", padding: "3px 7px", border: "1px solid #181818", borderRadius: 4 }}>
              {new Date().toLocaleDateString("en-GB", { month: "short", day: "numeric" }).toUpperCase()}
            </div>
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
            {[{ id: "full", label: "Full Brief", sub: "Pre-trade research" }, { id: "scalper", label: "Scalper Mode", sub: "Last 10 min" }].map(m => (
              <button key={m.id} onClick={() => switchMode(m.id)} style={{ flex: 1, padding: "7px 10px", borderRadius: 7, cursor: "pointer", fontFamily: "inherit", background: mode === m.id ? "rgba(0,212,255,.1)" : "rgba(255,255,255,.02)", border: mode === m.id ? "1px solid rgba(0,212,255,.25)" : "1px solid rgba(255,255,255,.05)", color: mode === m.id ? "#00d4ff" : "#444" }}>
                <div style={{ fontSize: 11, fontWeight: 700 }}>{m.label}</div>
                <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{m.sub}</div>
              </button>
            ))}
          </div>
          <div style={{ display: "flex", gap: 7, marginBottom: 11 }}>
            <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run(query.trim())}
              placeholder={mode === "scalper" ? "ES, NQ, CL, GC, 6E..." : "Euro, Gold, GBP, ES, NQ, Oil, BTC..."}
              style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 8, color: "#e0e0e0", fontSize: 14, padding: "10px 13px", outline: "none", fontFamily: "inherit" }} />
            <button onClick={() => run(query.trim())} disabled={loading}
              style={{ padding: "10px 16px", borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(255,255,255,.02)" : "rgba(0,212,255,.1)", color: loading ? "#2a2a2a" : "#00d4ff", border: "1px solid rgba(0,212,255,.2)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit" }}>
              {loading ? "..." : "BRIEF ME"}
            </button>
          </div>
          <div style={{ display: "flex", gap: 5, marginBottom: 13, flexWrap: "wrap" }}>
            {CHIPS.map(({ label, key }) => (
              <button key={key} onClick={() => { setQuery(label); run(label); }}
                style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", color: "#444" }}>
                {label}
              </button>
            ))}
          </div>
          <div style={{ display: "flex" }}>
            {TABS.map(t => (
              <button key={t.id} onClick={() => setTab(t.id)}
                style={{ flex: 1, padding: "9px 6px", border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#00d4ff" : "#333", borderBottom: "2px solid " + (tab === t.id ? "#00d4ff" : "transparent") }}>
                {t.label}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div style={{ maxWidth: 620, margin: "0 auto", padding: "18px 18px 48px" }}>
        {tab === "intel" && (
          <div>
            {loading && <Loader />}
            {error && <div style={{ color: "#ff4757", padding: "16px 0", fontSize: 13 }}>{error}</div>}
            {!loading && !error && !data && (
              <div style={{ textAlign: "center", padding: "56px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>+</div>
                <div style={{ fontSize: 14, color: "#444", marginBottom: 7 }}>
                  {mode === "scalper" ? "Enter your futures contract for a live risk check" : "Enter an instrument for your full market briefing"}
                </div>
                <div style={{ fontSize: 11, color: "#2a2a2a" }}>
                  {mode === "scalper" ? "ES - NQ - CL - GC - 6E - RTY - YM" : "Euro - Gold - GBP - Oil - Bitcoin - ES - NQ - VIX"}
                </div>
              </div>
            )}
            {!loading && data && inst && mode === "full" && <FullView inst={inst} data={data} />}
            {!loading && data && inst && mode === "scalper" && <ScalperView inst={inst} data={data} />}
          </div>
        )}
        {tab === "journal" && <Journal />}
        {tab === "learn" && <Learn />}
      </div>
    </div>
  );
}
