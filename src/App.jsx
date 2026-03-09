import { useState, useEffect } from “react”;
import {
ClerkProvider,
SignIn,
SignUp,
useUser,
useClerk,
} from “@clerk/clerk-react”;

const PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

// ─── Top-level provider ───────────────────────────────────────────────────────
export default function App() {
return (
<ClerkProvider
publishableKey={PUBLISHABLE_KEY}
proxyUrl="https://marketdebriefs.com/__clerk"
afterSignInUrl="/app"
afterSignUpUrl="/app"
>
<AuthGate />
</ClerkProvider>
);
}

// ─── Auth gate — handles the “already signed in” loop ────────────────────────
function AuthGate() {
const { isLoaded, isSignedIn } = useUser();

// Clerk is still initialising (or processing a redirect token)
if (!isLoaded) return <Spinner />;

if (isSignedIn) return <AppInner />;

return <AuthScreen />;
}

// ─── Loading spinner ──────────────────────────────────────────────────────────
function Spinner() {
return (
<div
style={{
minHeight: “100vh”,
background: “#0a0c0f”,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
}}
>
<div
style={{
width: 32,
height: 32,
border: “2px solid #1a1f2e”,
borderTop: “2px solid #00d4aa”,
borderRadius: “50%”,
animation: “spin 0.8s linear infinite”,
}}
/>
<style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
</div>
);
}

// ─── Auth screen (sign-in / sign-up toggle) ───────────────────────────────────
function AuthScreen() {
const [mode, setMode] = useState(“signin”);

return (
<div
style={{
minHeight: “100vh”,
background: “#0a0c0f”,
display: “flex”,
flexDirection: “column”,
alignItems: “center”,
justifyContent: “center”,
fontFamily: “‘Inter’, sans-serif”,
padding: “24px”,
}}
>
{/* Logo / brand */}
<div style={{ marginBottom: 32, textAlign: “center” }}>
<div
style={{
fontSize: 22,
fontWeight: 700,
color: “#fff”,
letterSpacing: “-0.5px”,
}}
>
Market<span style={{ color: “#00d4aa” }}>Debriefs</span>
</div>
<div style={{ color: “#555”, fontSize: 13, marginTop: 6 }}>
{mode === “signin” ? “Sign in to your account” : “Create your account”}
</div>
</div>

```
  {/* Clerk component */}
  {mode === "signin" ? (
    <SignIn
      afterSignInUrl="/app"
      signUpUrl="/app"
      appearance={{ variables: { colorPrimary: "#00d4aa" } }}
    />
  ) : (
    <SignUp
      afterSignUpUrl="/app"
      signInUrl="/app"
      appearance={{ variables: { colorPrimary: "#00d4aa" } }}
    />
  )}

  {/* Toggle */}
  <div style={{ marginTop: 20, color: "#555", fontSize: 13 }}>
    {mode === "signin" ? (
      <>
        No account?{" "}
        <button
          onClick={() => setMode("signup")}
          style={{
            color: "#00d4aa",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            padding: 0,
          }}
        >
          Sign up free
        </button>
      </>
    ) : (
      <>
        Already have an account?{" "}
        <button
          onClick={() => setMode("signin")}
          style={{
            color: "#00d4aa",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 13,
            padding: 0,
          }}
        >
          Sign in
        </button>
      </>
    )}
  </div>
</div>
```

);
}

// ─── Main app (signed-in users only) ─────────────────────────────────────────
function AppInner() {
const { user } = useUser();
const { signOut } = useClerk();

const isPro =
user?.publicMetadata?.pro === true ||
localStorage.getItem(`pro_${user?.id}`) === “true”;

const [ticker, setTicker] = useState(””);
const [brief, setBrief] = useState(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState(null);
const [usageCount, setUsageCount] = useState(0);
const [showUpgrade, setShowUpgrade] = useState(false);
const [mode, setMode] = useState(“full”); // “full” | “scalper” | “options”

const FREE_LIMIT = 3;

// Load daily usage count from localStorage
useEffect(() => {
const today = new Date().toISOString().split(“T”)[0];
const stored = JSON.parse(
localStorage.getItem(`usage_${user?.id}`) || “{}”
);
if (stored.date === today) {
setUsageCount(stored.count || 0);
} else {
localStorage.setItem(
`usage_${user?.id}`,
JSON.stringify({ date: today, count: 0 })
);
setUsageCount(0);
}
}, [user?.id]);

const incrementUsage = () => {
const today = new Date().toISOString().split(“T”)[0];
const newCount = usageCount + 1;
localStorage.setItem(
`usage_${user?.id}`,
JSON.stringify({ date: today, count: newCount })
);
setUsageCount(newCount);
};

const handleBrief = async () => {
if (!ticker.trim()) return;

```
if (!isPro && usageCount >= FREE_LIMIT) {
  setShowUpgrade(true);
  return;
}

if (!isPro && (mode === "scalper" || mode === "options")) {
  setShowUpgrade(true);
  return;
}

setLoading(true);
setError(null);
setBrief(null);

try {
  const res = await fetch("/api/brief", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ticker: ticker.toUpperCase(), mode }),
  });

  if (!res.ok) throw new Error(`Server error ${res.status}`);
  const data = await res.json();
  setBrief(data);
  incrementUsage();
} catch (err) {
  setError(err.message || "Failed to generate brief. Please try again.");
} finally {
  setLoading(false);
}
```

};

const handleUpgrade = async () => {
try {
const res = await fetch(”/api/checkout”, {
method: “POST”,
headers: { “Content-Type”: “application/json” },
body: JSON.stringify({
userId: user.id,
email: user.primaryEmailAddress?.emailAddress,
}),
});
const { url } = await res.json();
window.location.href = url;
} catch {
alert(“Could not start checkout. Please try again.”);
}
};

const remainingBriefs = Math.max(0, FREE_LIMIT - usageCount);

return (
<div
style={{
minHeight: “100vh”,
background: “#0a0c0f”,
color: “#e8eaed”,
fontFamily: “‘Inter’, sans-serif”,
}}
>
{/* Header */}
<header
style={{
display: “flex”,
alignItems: “center”,
justifyContent: “space-between”,
padding: “16px 24px”,
borderBottom: “1px solid #111720”,
background: “#0a0c0f”,
position: “sticky”,
top: 0,
zIndex: 100,
}}
>
<div style={{ fontSize: 18, fontWeight: 700, letterSpacing: “-0.5px” }}>
Market<span style={{ color: “#00d4aa” }}>Debriefs</span>
</div>
<div style={{ display: “flex”, alignItems: “center”, gap: 16 }}>
{isPro ? (
<span
style={{
background: “linear-gradient(135deg, #00d4aa22, #00d4aa11)”,
border: “1px solid #00d4aa44”,
color: “#00d4aa”,
fontSize: 11,
fontWeight: 600,
padding: “3px 10px”,
borderRadius: 20,
letterSpacing: “0.5px”,
}}
>
PRO
</span>
) : (
<button
onClick={() => setShowUpgrade(true)}
style={{
background: “#00d4aa”,
color: “#000”,
border: “none”,
borderRadius: 6,
padding: “6px 14px”,
fontSize: 12,
fontWeight: 600,
cursor: “pointer”,
}}
>
Upgrade
</button>
)}
<button
onClick={() => signOut({ redirectUrl: “/” })}
style={{
background: “none”,
border: “1px solid #1a1f2e”,
color: “#555”,
borderRadius: 6,
padding: “6px 12px”,
fontSize: 12,
cursor: “pointer”,
}}
>
Sign out
</button>
</div>
</header>

```
  {/* Main content */}
  <main style={{ maxWidth: 760, margin: "0 auto", padding: "40px 24px" }}>
    {/* Usage badge (free users) */}
    {!isPro && (
      <div
        style={{
          background: "#0d1117",
          border: "1px solid #1a1f2e",
          borderRadius: 8,
          padding: "10px 16px",
          marginBottom: 28,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontSize: 13,
        }}
      >
        <span style={{ color: "#666" }}>
          Free plan —{" "}
          <span
            style={{
              color: remainingBriefs > 0 ? "#e8eaed" : "#ff6b6b",
            }}
          >
            {remainingBriefs} brief{remainingBriefs !== 1 ? "s" : ""} remaining today
          </span>
        </span>
        <button
          onClick={() => setShowUpgrade(true)}
          style={{
            color: "#00d4aa",
            background: "none",
            border: "none",
            cursor: "pointer",
            fontSize: 12,
            fontWeight: 500,
          }}
        >
          Go Pro →
        </button>
      </div>
    )}

    {/* Mode tabs (Pro only) */}
    {isPro && (
      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        {[
          { id: "full", label: "Full Brief" },
          { id: "scalper", label: "Scalper Mode" },
          { id: "options", label: "Options Flow" },
        ].map((m) => (
          <button
            key={m.id}
            onClick={() => setMode(m.id)}
            style={{
              background: mode === m.id ? "#00d4aa" : "#0d1117",
              color: mode === m.id ? "#000" : "#666",
              border: `1px solid ${mode === m.id ? "#00d4aa" : "#1a1f2e"}`,
              borderRadius: 6,
              padding: "7px 16px",
              fontSize: 13,
              fontWeight: mode === m.id ? 600 : 400,
              cursor: "pointer",
              transition: "all 0.15s",
            }}
          >
            {m.label}
          </button>
        ))}
      </div>
    )}

    {/* Ticker input */}
    <div style={{ display: "flex", gap: 10, marginBottom: 32 }}>
      <input
        type="text"
        value={ticker}
        onChange={(e) => setTicker(e.target.value.toUpperCase())}
        onKeyDown={(e) => e.key === "Enter" && handleBrief()}
        placeholder="Enter ticker — AAPL, BTC, SPY..."
        maxLength={10}
        style={{
          flex: 1,
          background: "#0d1117",
          border: "1px solid #1a1f2e",
          borderRadius: 8,
          padding: "14px 18px",
          color: "#e8eaed",
          fontSize: 15,
          outline: "none",
          fontFamily: "'Inter', sans-serif",
          letterSpacing: "0.5px",
        }}
      />
      <button
        onClick={handleBrief}
        disabled={loading || !ticker.trim()}
        style={{
          background: loading ? "#0d1117" : "#00d4aa",
          color: loading ? "#333" : "#000",
          border: "none",
          borderRadius: 8,
          padding: "14px 28px",
          fontSize: 14,
          fontWeight: 600,
          cursor: loading || !ticker.trim() ? "not-allowed" : "pointer",
          transition: "all 0.15s",
          minWidth: 120,
        }}
      >
        {loading ? "Analysing..." : "Get Brief"}
      </button>
    </div>

    {/* Error */}
    {error && (
      <div
        style={{
          background: "#1a0a0a",
          border: "1px solid #4a1a1a",
          borderRadius: 8,
          padding: "14px 18px",
          color: "#ff6b6b",
          fontSize: 13,
          marginBottom: 24,
        }}
      >
        {error}
      </div>
    )}

    {/* Brief output */}
    {brief && <BriefCard brief={brief} mode={mode} />}

    {/* Empty state */}
    {!brief && !loading && !error && (
      <div style={{ textAlign: "center", paddingTop: 60, color: "#333" }}>
        <div style={{ fontSize: 40, marginBottom: 16 }}>📊</div>
        <div style={{ fontSize: 15, marginBottom: 8, color: "#444" }}>
          Enter a ticker to get your debrief
        </div>
        <div style={{ fontSize: 13 }}>
          Stocks, ETFs, crypto — any tradeable asset
        </div>
      </div>
    )}
  </main>

  {/* Upgrade modal */}
  {showUpgrade && (
    <UpgradeModal
      onClose={() => setShowUpgrade(false)}
      onUpgrade={handleUpgrade}
    />
  )}
</div>
```

);
}

// ─── Brief card ───────────────────────────────────────────────────────────────
function BriefCard({ brief, mode }) {
return (
<div
style={{
background: “#0d1117”,
border: “1px solid #1a1f2e”,
borderRadius: 12,
padding: “28px”,
lineHeight: 1.7,
}}
>
<div
style={{
display: “flex”,
alignItems: “center”,
justifyContent: “space-between”,
marginBottom: 20,
paddingBottom: 16,
borderBottom: “1px solid #111720”,
}}
>
<div>
<span
style={{
fontSize: 22,
fontWeight: 700,
color: “#fff”,
letterSpacing: “-0.5px”,
}}
>
{brief.ticker}
</span>
{brief.name && (
<span style={{ color: “#555”, fontSize: 14, marginLeft: 10 }}>
{brief.name}
</span>
)}
</div>
<div style={{ display: “flex”, gap: 8, alignItems: “center” }}>
{brief.price && (
<span style={{ color: “#e8eaed”, fontSize: 15, fontWeight: 500 }}>
${brief.price}
</span>
)}
{brief.change !== undefined && (
<span
style={{
color: brief.change >= 0 ? “#00d4aa” : “#ff6b6b”,
fontSize: 13,
fontWeight: 500,
}}
>
{brief.change >= 0 ? “+” : “”}
{brief.change}%
</span>
)}
<span
style={{
background: “#111720”,
color: “#444”,
fontSize: 11,
padding: “3px 8px”,
borderRadius: 4,
textTransform: “uppercase”,
letterSpacing: “0.5px”,
}}
>
{mode}
</span>
</div>
</div>

```
  <div
    style={{
      color: "#aab",
      fontSize: 14,
      whiteSpace: "pre-wrap",
      lineHeight: 1.8,
    }}
  >
    {brief.content || brief.summary || brief.text || JSON.stringify(brief, null, 2)}
  </div>

  <div style={{ marginTop: 20, color: "#333", fontSize: 11 }}>
    Generated {new Date().toLocaleTimeString()} ·{" "}
    {new Date().toLocaleDateString("en-GB", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })}
  </div>
</div>
```

);
}

// ─── Upgrade modal ────────────────────────────────────────────────────────────
function UpgradeModal({ onClose, onUpgrade }) {
return (
<div
style={{
position: “fixed”,
inset: 0,
background: “rgba(0,0,0,0.85)”,
display: “flex”,
alignItems: “center”,
justifyContent: “center”,
zIndex: 1000,
padding: 24,
}}
onClick={onClose}
>
<div
style={{
background: “#0d1117”,
border: “1px solid #1a1f2e”,
borderRadius: 16,
padding: “36px”,
maxWidth: 440,
width: “100%”,
textAlign: “center”,
}}
onClick={(e) => e.stopPropagation()}
>
<div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
<div
style={{
fontSize: 20,
fontWeight: 700,
color: “#fff”,
marginBottom: 8,
}}
>
Upgrade to Pro
</div>
<div
style={{
color: “#555”,
fontSize: 14,
lineHeight: 1.6,
marginBottom: 28,
}}
>
Get unlimited briefs, Scalper Mode, and Options Flow analysis.
Bloomberg costs $30k/year. We don’t.
</div>

```
    <div
      style={{
        background: "#0a0c0f",
        border: "1px solid #1a1f2e",
        borderRadius: 10,
        padding: "20px",
        marginBottom: 24,
      }}
    >
      <div style={{ fontSize: 28, fontWeight: 700, color: "#fff" }}>
        €49
        <span style={{ fontSize: 14, color: "#555", fontWeight: 400 }}>
          /month
        </span>
      </div>
      <div style={{ color: "#555", fontSize: 12, marginTop: 4, lineHeight: 1.6 }}>
        Unlimited briefs · Scalper Mode · Options Flow · Cancel anytime
      </div>
    </div>

    <button
      onClick={onUpgrade}
      style={{
        width: "100%",
        background: "#00d4aa",
        color: "#000",
        border: "none",
        borderRadius: 8,
        padding: "14px",
        fontSize: 15,
        fontWeight: 700,
        cursor: "pointer",
        marginBottom: 12,
      }}
    >
      Upgrade Now
    </button>
    <button
      onClick={onClose}
      style={{
        background: "none",
        border: "none",
        color: "#444",
        fontSize: 13,
        cursor: "pointer",
      }}
    >
      Maybe later
    </button>
  </div>
</div>
```

);
}