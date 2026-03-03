import { useState, useRef } from “react”;

const INSTRUMENTS = {
euro: { label: “EUR/USD”, aliases: [“euro”,“eurusd”,“eur”,“6e”,“eur/usd”], color: “#00d4ff”, flag: “\u{1F1EA}\u{1F1FA}” },
gbp: { label: “GBP/USD”, aliases: [“gbp”,“pound”,“cable”,“gbpusd”,“6b”,“gbp/usd”], color: “#7fff7f”, flag: “\u{1F1EC}\u{1F1E7}” },
gold: { label: “XAU/USD (Gold)”, aliases: [“gold”,“xauusd”,“xau”,“gc”,“gc1”], color: “#ffd700”, flag: “\u{1F947}” },
oil: { label: “WTI Crude”, aliases: [“oil”,“crude”,“wti”,“usoil”,“cl”,“cl1”], color: “#ff8c42”, flag: “\u{1F6E2}\uFE0F” },
dxy: { label: “US Dollar (DXY)”, aliases: [“dxy”,“dollar”,“usd”,“dx”,“dx1”], color: “#c084fc”, flag: “\u{1F1FA}\u{1F1F8}” },
es: { label: “ES (S&P 500)”, aliases: [“es”,“es1”,“sp500”,“s&p”,“spx”,“s&p 500”,“spy”], color: “#00ffcc”, flag: “\u{1F1FA}\u{1F1F8}” },
nq: { label: “NQ (NASDAQ 100)”, aliases: [“nq”,“nq1”,“nasdaq”,“nas100”,“ndx”,“qqq”], color: “#f472b6”, flag: “\u{1F4C8}” },
rty: { label: “RTY (Russell)”, aliases: [“rty”,“rty1”,“russell”,“iwm”,“russell 2000”], color: “#fb923c”, flag: “\u{1F4CA}” },
ym: { label: “YM (Dow Jones)”, aliases: [“ym”,“ym1”,“dow”,“djia”,“dia”], color: “#a78bfa”, flag: “\u{1F3DB}\uFE0F” },
btc: { label: “Bitcoin”, aliases: [“btc”,“bitcoin”,“crypto”,“btcusd”,“xbt”], color: “#f7931a”, flag: “\u20BF” },
eth: { label: “Ethereum”, aliases: [“eth”,“ethereum”,“ethusd”], color: “#627eea”, flag: “\u039E” },
jpy: { label: “USD/JPY”, aliases: [“jpy”,“yen”,“usdjpy”,“6j”,“usd/jpy”], color: “#ff6b6b”, flag: “\u{1F1EF}\u{1F1F5}” },
aud: { label: “AUD/USD”, aliases: [“aud”,“aussie”,“audusd”,“6a”,“aud/usd”], color: “#34d399”, flag: “\u{1F1E6}\u{1F1FA}” },
vix: { label: “VIX (Fear Index)”, aliases: [“vix”,“volatility”,“fear”], color: “#f87171”, flag: “\u{1F631}” },
};

const QUICK_CHIPS = [
{ label: “ES”, key: “es” },
{ label: “NQ”, key: “nq” },
{ label: “Gold”, key: “gold” },
{ label: “Oil”, key: “oil” },
{ label: “Euro”, key: “euro” },
{ label: “GBP”, key: “gbp” },
{ label: “BTC”, key: “btc” },
{ label: “VIX”, key: “vix” },
];

function detectInstrument(query) {
const q = query.toLowerCase().trim();
for (const [key, val] of Object.entries(INSTRUMENTS)) {
if (val.aliases.some(a => a === q)) return { key, …val };
}
for (const [key, val] of Object.entries(INSTRUMENTS)) {
if (val.aliases.some(a => q.includes(a) || a.includes(q))) return { key, …val };
}
return null;
}

function buildSystemPrompt(mode) {
const base = “You are a professional market intelligence analyst. Respond ONLY with valid JSON — no markdown, no backticks, no preamble. Start with { end with }.”;
if (mode === “scalper”) {
return base + “\nSCALPER MODE: The trader is about to take a trade RIGHT NOW. Be extremely brief and direct.\nJSON schema exactly:\n{"instrument":"string","risk_level":"GREEN|YELLOW|RED","risk_reason":"one sentence","scalper_note":"one punchy sentence","breaking":[{"headline":"string","direction":"BULLISH|BEARISH|NEUTRAL","age":"X mins ago"}],"imminent":[{"event":"string","due_in":"X mins","expected_impact":"string"}]}”;
}
return base + “\nFULL BRIEF MODE: Search for today’s high-impact news and economic events.\nJSON schema exactly:\n{"instrument":"string","sentiment":"bullish|bearish|neutral|mixed","headline_summary":"string","events":[{"title":"string","time":"string","impact":"HIGH|MEDIUM","direction":"BULLISH|BEARISH|NEUTRAL","summary":"string","why_it_moves_price":"explain macro transmission simply","confidence":"HIGH|MEDIUM|LOW"}],"geopolitical_risks":"string","key_levels_context":"string","teaching_moment":"string"}”;
}

function buildUserPrompt(inst, mode) {
const now = new Date().toLocaleString(“en-GB”, { weekday: “long”, year: “numeric”, month: “long”, day: “numeric”, hour: “2-digit”, minute: “2-digit”, timeZoneName: “short” });
if (mode === “scalper”) return “Time: “ + now + “. I am about to trade “ + inst.label + “. What high-impact news hit in the last 10 minutes and what is due in the next 15 minutes? Risk level: GREEN/YELLOW/RED?”;
return “Today: “ + now + “. Full high-impact briefing for “ + inst.label + “. Search for today’s economic events, central bank news, geopolitical developments. Explain WHY each event moves price. All red-folder events.”;
}

async function fetchBriefing(inst, mode) {
const apiKey = import.meta.env.VITE_ANTHROPIC_API_KEY;
const res = await fetch(“https://api.anthropic.com/v1/messages”, {
method: “POST”,
headers: {
“Content-Type”: “application/json”,
“x-api-key”: apiKey,
“anthropic-version”: “2023-06-01”,
“anthropic-dangerous-direct-browser-access”: “true”
},
body: JSON.stringify({
model: “claude-sonnet-4-20250514”,
max_tokens: 1000,
system: buildSystemPrompt(mode),
tools: [{ type: “web_search_20250305”, name: “web_search” }],
messages: [{ role: “user”, content: buildUserPrompt(inst, mode) }],
}),
});
if (!res.ok) throw new Error(“API “ + res.status);
const data = await res.json();
const text = (data.content || []).filter(b => b.type === “text”).map(b => b.text).join(””);
const match = text.match(/{[\s\S]*}/);
if (!match) throw new Error(“No JSON found”);
return JSON.parse(match[0]);
}

const DIR_COLOR = { BULLISH: “#00d4aa”, BEARISH: “#ff4757”, NEUTRAL: “#ffd700” };
const DIR_BG = { BULLISH: “rgba(0,212,170,.08)”, BEARISH: “rgba(255,71,87,.08)”, NEUTRAL: “rgba(255,215,0,.06)” };

function Shimmer() {
return (
<>
<style>{”@keyframes sh{0%{background-position:200% 0}100%{background-position:-200% 0}}”}</style>
{[90, 65, 80].map((h, i) => (
<div key={i} style={{ height: h, borderRadius: 8, marginBottom: 12, background: “linear-gradient(90deg,rgba(255,255,255,.03) 0%,rgba(255,255,255,.08) 50%,rgba(255,255,255,.03) 100%)”, backgroundSize: “200% 100%”, animation: “sh 1.4s “ + (i * 0.15) + “s infinite” }} />
))}
</>
);
}

function EventCard({ event }) {
const [open, setOpen] = useState(false);
const c = DIR_COLOR[event.direction] || “#666”;
return (
<div onClick={() => setOpen(o => !o)} style={{ background: DIR_BG[event.direction] || “rgba(255,255,255,.02)”, borderLeft: “3px solid “ + c, border: “1px solid “ + c + “22”, borderRadius: 8, padding: “13px 15px”, marginBottom: 9, cursor: “pointer” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “flex-start”, gap: 10 }}>
<div style={{ flex: 1 }}>
<div style={{ display: “flex”, alignItems: “center”, gap: 7, marginBottom: 4, flexWrap: “wrap” }}>
<span style={{ fontFamily: “monospace”, fontSize: 10, color: “#777”, letterSpacing: 1 }}>{event.time}</span>
{event.impact === “HIGH” && <span style={{ fontSize: 9, padding: “2px 6px”, borderRadius: 3, fontWeight: 700, background: “rgba(255,71,87,.15)”, color: “#ff4757”, border: “1px solid #ff475733”, letterSpacing: 1 }}>HIGH</span>}
</div>
<div style={{ fontFamily: “Sora, sans-serif”, fontSize: 14, fontWeight: 600, color: “#f0f0f0”, marginBottom: 3 }}>{event.title}</div>
<div style={{ fontSize: 12, color: “#999”, lineHeight: 1.5 }}>{event.summary}</div>
</div>
<div style={{ textAlign: “right”, flexShrink: 0 }}>
<div style={{ fontSize: 10, fontWeight: 800, letterSpacing: 1.5, padding: “3px 8px”, borderRadius: 4, color: c, border: “1px solid “ + c + “44”, background: c + “11” }}>{event.direction}</div>
<div style={{ fontSize: 10, color: “#444”, marginTop: 3 }}>{event.confidence}</div>
</div>
</div>
{open && (
<div style={{ marginTop: 13, paddingTop: 13, borderTop: “1px solid rgba(255,255,255,.06)” }}>
<div style={{ fontSize: 9, color: “#444”, letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>WHY IT MOVES PRICE</div>
<div style={{ fontSize: 13, color: “#c8d6e5”, lineHeight: 1.75, background: “rgba(0,0,0,.25)”, padding: 11, borderRadius: 6 }}>{event.why_it_moves_price}</div>
</div>
)}
<div style={{ fontSize: 10, color: “#333”, marginTop: 7, textAlign: “right” }}>{open ? “collapse” : “tap to understand why”}</div>
</div>
);
}

function FullBrief({ inst, data }) {
const sc = { bullish: “#00d4aa”, bearish: “#ff4757”, neutral: “#ffd700”, mixed: “#c084fc” };
const sc2 = sc[data.sentiment] || “#888”;
return (
<div>
<div style={{ background: “linear-gradient(135deg,” + inst.color + “15,transparent)”, border: “1px solid “ + inst.color + “33”, borderRadius: 12, padding: 20, marginBottom: 18 }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 10 }}>
<div style={{ fontFamily: “Sora, sans-serif”, fontSize: 21, fontWeight: 800, color: inst.color }}>{inst.flag} {inst.label}</div>
<div style={{ fontSize: 11, fontWeight: 800, letterSpacing: 2, padding: “5px 12px”, borderRadius: 6, color: sc2, border: “1px solid “ + sc2 + “55”, background: sc2 + “11”, textTransform: “uppercase” }}>{data.sentiment}</div>
</div>
<div style={{ fontSize: 14, color: “#c8d6e5”, lineHeight: 1.6, fontStyle: “italic” }}>{data.headline_summary}</div>
</div>
{data.geopolitical_risks && (
<div style={{ background: “rgba(255,140,0,.08)”, border: “1px solid rgba(255,140,0,.25)”, borderRadius: 8, padding: 14, marginBottom: 15, display: “flex”, gap: 10 }}>
<span style={{ fontSize: 18 }}>!</span>
<div>
<div style={{ fontSize: 9, color: “#ff8c00”, fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>GEOPOLITICAL RISK</div>
<div style={{ fontSize: 13, color: “#e0c88a”, lineHeight: 1.6 }}>{data.geopolitical_risks}</div>
</div>
</div>
)}
<div style={{ fontSize: 9, color: “#333”, letterSpacing: 2, fontWeight: 700, marginBottom: 11 }}>HIGH-IMPACT EVENTS</div>
{data.events && data.events.map((e, i) => <EventCard key={i} event={e} />)}
{data.key_levels_context && (
<div style={{ background: “rgba(0,212,255,.06)”, border: “1px solid rgba(0,212,255,.15)”, borderRadius: 8, padding: 13, marginBottom: 13 }}>
<div style={{ fontSize: 9, color: “#00d4ff”, fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>WHAT TO WATCH</div>
<div style={{ fontSize: 13, color: “#a8d8ea”, lineHeight: 1.65 }}>{data.key_levels_context}</div>
</div>
)}
{data.teaching_moment && (
<div style={{ background: “rgba(192,132,252,.06)”, border: “1px solid rgba(192,132,252,.2)”, borderRadius: 8, padding: 15 }}>
<div style={{ fontSize: 9, color: “#c084fc”, fontWeight: 700, letterSpacing: 1.5, marginBottom: 7 }}>TEACH ME TO FISH</div>
<div style={{ fontSize: 13, color: “#d4b8f7”, lineHeight: 1.75 }}>{data.teaching_moment}</div>
</div>
)}
</div>
);
}

function ScalperBrief({ inst, data }) {
const RC = { GREEN: “#00d4aa”, YELLOW: “#ffd700”, RED: “#ff4757” };
const rc = RC[data.risk_level] || “#888”;
const icon = data.risk_level === “GREEN” ? “ALL CLEAR” : data.risk_level === “YELLOW” ? “CAUTION” : “HOLD OFF”;
return (
<div>
<div style={{ background: rc + “12”, border: “2px solid “ + rc + “44”, borderRadius: 12, padding: “22px 20px”, marginBottom: 18, textAlign: “center” }}>
<div style={{ fontSize: 10, color: “#555”, letterSpacing: 2, fontWeight: 700, marginBottom: 7 }}>{inst.flag} {inst.label} — TRADE NOW?</div>
<div style={{ fontFamily: “Sora, sans-serif”, fontSize: 30, fontWeight: 800, color: rc, letterSpacing: 1, marginBottom: 9 }}>{icon}</div>
<div style={{ fontSize: 13, color: “#aaa”, lineHeight: 1.5 }}>{data.risk_reason}</div>
</div>
<div style={{ background: “rgba(255,255,255,.03)”, border: “1px solid rgba(255,255,255,.07)”, borderRadius: 8, padding: 13, marginBottom: 14 }}>
<div style={{ fontSize: 9, color: “#666”, letterSpacing: 1.5, fontWeight: 700, marginBottom: 5 }}>SCALPER NOTE</div>
<div style={{ fontSize: 14, color: “#e0e0e0”, lineHeight: 1.6, fontWeight: 500 }}>{data.scalper_note}</div>
</div>
{data.breaking && data.breaking.length > 0 && (
<div style={{ marginBottom: 14 }}>
<div style={{ fontSize: 9, color: “#ff4757”, letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>JUST HIT THE WIRE</div>
{data.breaking.map((b, i) => (
<div key={i} style={{ background: DIR_BG[b.direction] || “rgba(255,255,255,.02)”, borderLeft: “3px solid “ + (DIR_COLOR[b.direction] || “#555”), border: “1px solid “ + (DIR_COLOR[b.direction] || “#333”) + “22”, borderRadius: 8, padding: “11px 13px”, marginBottom: 7 }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, gap: 8 }}>
<div style={{ fontSize: 13, color: “#e0e0e0”, fontWeight: 600, flex: 1 }}>{b.headline}</div>
<div style={{ flexShrink: 0, textAlign: “right” }}>
<div style={{ fontSize: 10, fontWeight: 800, color: DIR_COLOR[b.direction] || “#888” }}>{b.direction}</div>
<div style={{ fontSize: 10, color: “#444”, marginTop: 2 }}>{b.age}</div>
</div>
</div>
</div>
))}
</div>
)}
{data.imminent && data.imminent.length > 0 && (
<div>
<div style={{ fontSize: 9, color: “#ffd700”, letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>COMING UP NEXT</div>
{data.imminent.map((ev, i) => (
<div key={i} style={{ background: “rgba(255,215,0,.05)”, border: “1px solid rgba(255,215,0,.15)”, borderRadius: 8, padding: “11px 13px”, marginBottom: 7, display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<div style={{ fontSize: 13, color: “#e0e0e0”, fontWeight: 600 }}>{ev.event}</div>
<div style={{ textAlign: “right”, flexShrink: 0, marginLeft: 12 }}>
<div style={{ fontSize: 11, color: “#ffd700”, fontWeight: 700 }}>in {ev.due_in}</div>
<div style={{ fontSize: 11, color: “#777”, marginTop: 2 }}>{ev.expected_impact}</div>
</div>
</div>
))}
</div>
)}
</div>
);
}

const PROMPTS = [
“What did the market do today that surprised you?”,
“Did you follow your plan? What made it hard?”,
“What did the market try to teach you today?”,
“What emotion showed up most in your trading today?”,
“What will you do differently tomorrow?”,
“One thing you are proud of from today’s session.”,
];

function JournalTab() {
const today = new Date().toLocaleDateString(“en-GB”, { weekday: “long”, year: “numeric”, month: “long”, day: “numeric” });
const [entries, setEntries] = useState({});
const [saved, setSaved] = useState(false);
return (
<div>
<div style={{ marginBottom: 22 }}>
<div style={{ fontFamily: “Sora, sans-serif”, fontSize: 19, fontWeight: 700, color: “#f0f0f0”, marginBottom: 3 }}>Daily Reflection</div>
<div style={{ fontSize: 10, color: “#333”, fontFamily: “monospace”, letterSpacing: 1 }}>{today.toUpperCase()}</div>
</div>
<div style={{ background: “rgba(255,215,0,.05)”, border: “1px solid rgba(255,215,0,.12)”, borderRadius: 8, padding: 13, marginBottom: 22 }}>
<div style={{ fontSize: 13, color: “#c8a84b”, lineHeight: 1.7, fontStyle: “italic” }}>The goal is not to be right about the market. The goal is to understand it better each day.</div>
</div>
{PROMPTS.map((p, i) => (
<div key={i} style={{ marginBottom: 18 }}>
<label style={{ display: “block”, fontSize: 13, color: “#777”, marginBottom: 7, lineHeight: 1.5 }}>
<span style={{ color: “#333”, marginRight: 8, fontFamily: “monospace” }}>0{i + 1}.</span>{p}
</label>
<textarea value={entries[i] || “”} onChange={e => setEntries(en => ({ …en, [i]: e.target.value }))} placeholder=“Write freely…” style={{ width: “100%”, minHeight: 68, background: “rgba(255,255,255,.03)”, border: “1px solid rgba(255,255,255,.07)”, borderRadius: 8, color: “#e0e0e0”, fontSize: 13, padding: 11, resize: “vertical”, fontFamily: “inherit”, lineHeight: 1.6, outline: “none”, boxSizing: “border-box” }} onFocus={e => e.target.style.borderColor = “rgba(192,132,252,.4)”} onBlur={e => e.target.style.borderColor = “rgba(255,255,255,.07)”} />
</div>
))}
<button onClick={() => { setSaved(true); setTimeout(() => setSaved(false), 2200); }} style={{ width: “100%”, padding: 13, borderRadius: 8, border: “none”, cursor: “pointer”, fontFamily: “inherit”, background: saved ? “rgba(0,212,170,.14)” : “rgba(192,132,252,.1)”, color: saved ? “#00d4aa” : “#c084fc”, fontSize: 13, fontWeight: 700, letterSpacing: 1.5, transition: “all .3s” }}>{saved ? “REFLECTION SAVED” : “SAVE REFLECTION”}</button>
</div>
);
}

const CONCEPTS = [
{ icon: “bolt”, title: “Why High-Impact News Moves Markets”, body: “Markets are priced on expectations. When actual data differs from forecasts, the gap triggers rapid repositioning. A jobs report beat does not just mean employment is good — traders positioned for a miss must cover fast, compounding the move. The same data can produce opposite price reactions depending on what was expected.” },
{ icon: “fx”, title: “The Dollar’s Role in Everything”, body: “The US Dollar (DXY) is the world’s reserve currency. When the dollar strengthens, commodities priced in USD like gold and oil get more expensive for foreign buyers — demand falls, price falls. Dollar strength also weighs directly on EUR/USD, GBP/USD, AUD/USD. Understanding dollar direction is the foundation of macro trading.” },
{ icon: “shield”, title: “Risk-On vs Risk-Off”, body: “In times of fear such as wars and crashes, money flows to safe havens: USD, JPY, CHF, Gold. These are risk-off trades. When confidence returns, money flows to higher-yielding assets: equities, AUD, NZD, crude oil. Identify which regime you are in — it shapes every trade.” },
{ icon: “chart”, title: “Futures Contracts — ES, NQ, CL Explained”, body: “ES (S&P 500 futures), NQ (Nasdaq futures), CL (crude oil futures) are contracts to buy or sell at a future price. They trade nearly 24 hours — so they gap up or down at the open based on overnight news. Futures lead spot markets. ES often moves before SPY does. Scalpers watch futures because they react fastest to breaking news.” },
{ icon: “pct”, title: “Interest Rates and Currency Value”, body: “Higher rates make a currency more attractive — global investors park money where it earns more. When the Fed raises rates, USD strengthens. When ECB cuts, EUR weakens. Key insight: it is rate expectations, not the rate itself, that drive moves. Markets price in the future, not the present.” },
{ icon: “globe”, title: “Geopolitical Events and Market Impact”, body: “War, sanctions, and political instability create uncertainty — and markets hate uncertainty. When conflict escalates in oil-producing regions, oil spikes. When US-China tensions rise, tech stocks and AUD suffer. Always ask: who is affected in the supply chain or trade relationship?” },
{ icon: “news”, title: “Reading News Like a Trader”, body: “The question is not whether news is good or bad. It is whether it is better or worse than expected. Markets are forward-looking. By the time news confirms what traders already believed, the move is done. This is why price drops on good news — it was priced in already. Always check consensus forecasts before reacting to a data print.” },
];

function ConceptCard({ icon, title, body }) {
const [open, setOpen] = useState(false);
return (
<div onClick={() => setOpen(o => !o)} style={{ background: “rgba(255,255,255,.02)”, border: “1px solid rgba(255,255,255,.07)”, borderRadius: 10, padding: 15, marginBottom: 9, cursor: “pointer” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center” }}>
<div style={{ fontFamily: “Sora, sans-serif”, fontSize: 13, fontWeight: 600, color: “#d0d0d0” }}>{title}</div>
<span style={{ color: “#333”, display: “inline-block”, transform: open ? “rotate(180deg)” : “none”, transition: “transform .2s” }}>v</span>
</div>
{open && <div style={{ marginTop: 13, fontSize: 13, color: “#999”, lineHeight: 1.8, paddingTop: 13, borderTop: “1px solid rgba(255,255,255,.06)” }}>{body}</div>}
</div>
);
}

function LearnTab() {
return (
<div>
<div style={{ marginBottom: 22 }}>
<div style={{ fontFamily: “Sora, sans-serif”, fontSize: 19, fontWeight: 700, color: “#f0f0f0”, marginBottom: 3 }}>Learn to Fish</div>
<div style={{ fontSize: 13, color: “#444” }}>The macro concepts behind every market move</div>
</div>
{CONCEPTS.map((c, i) => <ConceptCard key={i} {…c} />)}
</div>
);
}

export default function MarketBrief() {
const [query, setQuery] = useState(””);
const [tab, setTab] = useState(“intel”);
const [mode, setMode] = useState(“full”);
const [loading, setLoading] = useState(false);
const [data, setData] = useState(null);
const [inst, setInst] = useState(null);
const [error, setError] = useState(null);

const run = async (q, m) => {
const mm = m || mode;
const detected = detectInstrument(q);
if (!detected) { setError(“Not recognised — try: ES, NQ, Euro, Gold, GBP, Oil, BTC”); return; }
setInst(detected); setLoading(true); setError(null); setData(null); setTab(“intel”);
try { setData(await fetchBriefing(detected, mm)); }
catch (e) { setError(“Fetch failed. Please try again.”); console.error(e); }
finally { setLoading(false); }
};

const handleChip = (key) => { const i = INSTRUMENTS[key]; setQuery(i.label); run(i.label, mode); };
const toggleMode = (m) => { setMode(m); if (data && inst) run(inst.label, m); };

const TABS = [
{ id: “intel”, label: “Intelligence”, icon: “signal” },
{ id: “journal”, label: “Reflection”, icon: “pen” },
{ id: “learn”, label: “Learn”, icon: “book” },
];

return (
<div style={{ minHeight: “100vh”, background: “#0a0c0f”, color: “#e0e0e0”, fontFamily: “Inter, system-ui, sans-serif” }}>
<link href="https://fonts.googleapis.com/css2?family=Sora:wght@400;600;700;800&display=swap" rel="stylesheet" />
<div style={{ background: “linear-gradient(180deg,#0d1117,#0a0c0f)”, borderBottom: “1px solid rgba(255,255,255,.06)”, padding: “16px 18px 0”, position: “sticky”, top: 0, zIndex: 100 }}>
<div style={{ maxWidth: 620, margin: “0 auto” }}>
<div style={{ display: “flex”, justifyContent: “space-between”, alignItems: “center”, marginBottom: 13 }}>
<div>
<div style={{ fontFamily: “Sora, sans-serif”, fontSize: 16, fontWeight: 800, letterSpacing: “-0.5px”, color: “#fff” }}>MARKET BRIEF</div>
<div style={{ fontSize: 9, color: “#2a2a2a”, letterSpacing: 2, fontFamily: “monospace” }}>INTELLIGENCE - REFLECTION - EDUCATION</div>
</div>
<div style={{ fontSize: 9, fontFamily: “monospace”, color: “#222”, padding: “3px 7px”, border: “1px solid #181818”, borderRadius: 4 }}>{new Date().toLocaleDateString(“en-GB”, { month: “short”, day: “numeric” }).toUpperCase()}</div>
</div>
<div style={{ display: “flex”, gap: 6, marginBottom: 11 }}>
{[{ id: “full”, label: “Full Brief”, sub: “Pre-trade research” }, { id: “scalper”, label: “Scalper Mode”, sub: “Last 10 min” }].map(m => (
<button key={m.id} onClick={() => toggleMode(m.id)} style={{ flex: 1, padding: “7px 10px”, borderRadius: 7, border: mode === m.id ? “1px solid rgba(0,212,255,.25)” : “1px solid rgba(255,255,255,.05)”, cursor: “pointer”, fontFamily: “inherit”, background: mode === m.id ? “rgba(0,212,255,.1)” : “rgba(255,255,255,.02)”, color: mode === m.id ? “#00d4ff” : “#444”, transition: “all .2s” }}>
<div style={{ fontSize: 11, fontWeight: 700 }}>{m.label}</div>
<div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{m.sub}</div>
</button>
))}
</div>
<div style={{ display: “flex”, gap: 7, marginBottom: 11 }}>
<input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === “Enter” && run(query.trim(), mode)} placeholder={mode === “scalper” ? “ES, NQ, CL, GC, 6E…” : “Euro, Gold, GBP, ES, NQ, Oil, BTC…”} style={{ flex: 1, background: “rgba(255,255,255,.04)”, border: “1px solid rgba(255,255,255,.09)”, borderRadius: 8, color: “#e0e0e0”, fontSize: 14, padding: “10px 13px”, outline: “none”, fontFamily: “inherit” }} />
<button onClick={() => run(query.trim(), mode)} disabled={loading} style={{ padding: “10px 16px”, borderRadius: 8, cursor: loading ? “not-allowed” : “pointer”, background: loading ? “rgba(255,255,255,.02)” : “rgba(0,212,255,.1)”, color: loading ? “#2a2a2a” : “#00d4ff”, border: “1px solid rgba(0,212,255,.2)”, fontSize: 12, fontWeight: 700, letterSpacing: 1, whiteSpace: “nowrap”, transition: “all .2s”, fontFamily: “inherit” }}>{loading ? “…” : “BRIEF ME”}</button>
</div>
<div style={{ display: “flex”, gap: 5, marginBottom: 13, flexWrap: “wrap” }}>
{QUICK_CHIPS.map(({ label, key }) => (
<button key={key} onClick={() => handleChip(key)} style={{ fontSize: 11, padding: “3px 9px”, borderRadius: 4, cursor: “pointer”, fontFamily: “inherit”, background: “rgba(255,255,255,.02)”, border: “1px solid rgba(255,255,255,.06)”, color: “#444”, transition: “all .15s” }}>{label}</button>
))}
</div>
<div style={{ display: “flex” }}>
{TABS.map(t => (
<button key={t.id} onClick={() => setTab(t.id)} style={{ flex: 1, padding: “9px 6px”, border: “none”, background: “transparent”, cursor: “pointer”, fontFamily: “inherit”, fontSize: 11, fontWeight: tab === t.id ? 700 : 400, letterSpacing: 0.5, color: tab === t.id ? “#00d4ff” : “#333”, borderBottom: “2px solid “ + (tab === t.id ? “#00d4ff” : “transparent”), transition: “all .2s” }}>{t.label}</button>
))}
</div>
</div>
</div>
<div style={{ maxWidth: 620, margin: “0 auto”, padding: “18px 18px 48px” }}>
{tab === “intel” && (
<>
{loading && <Shimmer />}
{error && <div style={{ color: “#ff4757”, padding: “16px 0”, fontSize: 13 }}>{error}</div>}
{!loading && !error && !data && (
<div style={{ textAlign: “center”, padding: “56px 20px”, color: “#2a2a2a” }}>
<div style={{ fontSize: 44, marginBottom: 14 }}>+</div>
<div style={{ fontFamily: “Sora, sans-serif”, fontSize: 14, color: “#444”, marginBottom: 7 }}>{mode === “scalper” ? “Enter your futures contract for a live risk check” : “Enter an instrument for your full market briefing”}</div>
<div style={{ fontSize: 11, color: “#2a2a2a” }}>{mode === “scalper” ? “ES - NQ - CL - GC - 6E - RTY - YM” : “Euro - Gold - GBP - Oil - Bitcoin - ES - NQ - VIX”}</div>
</div>
)}
{!loading && data && inst && mode === “full” && <FullBrief inst={inst} data={data} />}
{!loading && data && inst && mode === “scalper” && <ScalperBrief inst={inst} data={data} />}
</>
)}
{tab === “journal” && <JournalTab />}
{tab === “learn” && <LearnTab />}
</div>
</div>
);
}