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
        <div style={{ fontSize: 32, marginBottom: 16 }}>──</div>
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
          {loading ? "Redirecting..." : "Upgrade to Pro — $12/mo"}
        </button>
