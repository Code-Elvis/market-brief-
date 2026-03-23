import React, { useState, useEffect, useCallback, useRef } from "react";
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
// ── HELP PAGE ─────────────────────────────────────────────────────────────────
function HelpPage({ navigate }) {
  const [search, setSearch] = useState("");
  const [openItem, setOpenItem] = useState(null);
  const sections = [
    { id: "getting-started", icon: "🚀", title: "Getting Started", color: "rgba(0,212,255,.1)", items: [
      { q: "How do I get started with MarketDebriefs?", a: "Getting started takes under 60 seconds. Type any instrument into the search bar — ES, Gold, EUR/USD, BTC, Oil — and hit BRIEF ME. Your first brief is ready in under 30 seconds. No credit card needed." },
      { q: "What exactly does MarketDebriefs do?", a: "MarketDebriefs is a macro intelligence tool for active traders. Before you enter a trade, type in your instrument and receive an instant AI-powered briefing covering the current central bank stance, live geopolitical risks, upcoming high-impact events (CPI, NFP, Fed decisions), and why they move price. Think of it as having an institutional macro analyst on call — in seconds, before every trade." },
      { q: "Which instruments are supported?", a: "25+ instruments across all major asset classes. Equity Indices: ES S&P 500, NQ NASDAQ, RTY Russell 2000, YM Dow Jones, DAX, Nikkei, FTSE, CAC. Metals: Gold, Silver, Copper. Energy: WTI Crude, Brent, Natural Gas. FX: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, DXY. Crypto: Bitcoin, Ethereum. Rates: 10Y Treasury. Volatility: VIX. You can also type any custom instrument or stock ticker." },
      { q: "How many free briefs do I get?", a: "On the Free plan you get 3 Full Briefs per day. The limit resets every 24 hours. Upgrade to Pro (€49/month) for unlimited briefs plus Scalper Mode and Equity Debriefs." },
      { q: "Can I install MarketDebriefs on my phone?", a: "Yes — MarketDebriefs is a Progressive Web App (PWA). iPhone Safari: tap Share → Add to Home Screen. Android Chrome: tap the three-dot menu → Add to Home Screen, or tap the ⊕ GET APP button in the app header. Works like a native app once installed." },
    ]},
    { id: "plans", icon: "💎", title: "Plans & Pricing", color: "rgba(245,158,11,.1)", items: [
      { q: "What is the difference between Free and Pro?", a: "Free — 3 Full Briefs per day, Trade Journal, Learn to Fish. No credit card required. Pro (€49/month) — Unlimited briefs, Scalper Mode, Equity Debriefs, all instruments covered." },
      { q: "Can I cancel my Pro subscription anytime?", a: "Yes. No contracts, no cancellation fees. Cancel anytime. Your Pro access continues until the end of the current billing period and you won't be charged again after that." },
      { q: "Is there a refund policy?", a: "If you're not satisfied within the first 7 days of your Pro subscription, contact us for a full refund — no questions asked. After 7 days refunds are considered case-by-case. Email support@marketdebriefs.com." },
      { q: "Do you offer promo or discount codes?", a: "Promo codes are occasionally offered through our affiliate partners and creator collaborations. If you have a code, enter it at the Pro checkout screen." },
    ]},
    { id: "features", icon: "⚡", title: "Features", color: "rgba(0,212,170,.1)", items: [
      { q: "What is Scalper Mode?", a: "Scalper Mode is a Pro feature for intraday traders who need a fast macro risk awareness check before entering. You get CLEAR / CAUTION / STAND DOWN in seconds. CLEAR — macro conditions are calm, no imminent events. CAUTION — something is close on the calendar, proceed carefully. STAND DOWN — a major event is imminent or breaking news is active, not the time to scalp. This is a risk awareness tool, not a directional signal." },
      { q: "How do Equity (Stocks) Debriefs work?", a: "Go to the Stocks tab, type any stock name or ticker (Apple, NVDA, TSLA, MSFT, etc.) and get an instant debrief covering earnings context, macro tailwinds and headwinds, upcoming catalyst events, sector rotation signals, and institutional flow direction. Pro feature." },
      { q: "What is the Reflection tab?", a: "A daily trading journal built into the app. At the end of each trading day it presents 6 reflection prompts to build self-awareness around your trading decisions. Free for all users." },
      { q: "What is Learn to Fish?", a: "A free educational library of macro concepts — why high-impact news moves markets, the role of the US Dollar, risk-on vs risk-off, how interest rates affect currencies, and more. The goal is to help you understand why markets move." },
      { q: "How current is the data in my briefs?", a: "Each brief is generated fresh on demand focusing on current macro themes, central bank stances, and upcoming scheduled events. For best results run a fresh brief before each trading session. MarketDebriefs is an intelligence tool and does not constitute financial advice." },
    ]},
    { id: "billing", icon: "💳", title: "Billing", color: "rgba(0,212,255,.08)", items: [
      { q: "What payment methods do you accept?", a: "All major credit and debit cards (Visa, Mastercard, Amex) via Stripe. Your card details are never stored on our servers. Pricing is in EUR and Stripe handles currency conversion automatically." },
      { q: "When am I charged?", a: "You are charged €49 on the day you upgrade to Pro, then on the same date each month. You will receive a receipt by email after each payment." },
      { q: "Can I get a VAT invoice?", a: "Yes. A receipt is automatically emailed after each payment. For a formal VAT invoice email support@marketdebriefs.com with your billing details." },
      { q: "How do I cancel my subscription?", a: "Email support@marketdebriefs.com with the subject 'Cancel subscription' and your account email. We'll process it same day. Your Pro access continues until the end of the current billing period." },
    ]},
    { id: "account", icon: "👤", title: "Account", color: "rgba(255,71,87,.08)", items: [
      { q: "How do I change my email or password?", a: "On the sign-in screen, click 'Forgot password' to reset your password by email. To change your email address, contact support@marketdebriefs.com from your current registered email." },
      { q: "I upgraded to Pro but my account still shows Free — what do I do?", a: "Try signing out and back in to refresh your account status. If the issue persists, contact support@marketdebriefs.com with your account email and Stripe payment confirmation and we will activate Pro access manually within the hour." },
      { q: "How do I delete my account?", a: "Email support@marketdebriefs.com with the subject 'Delete my account' from your registered email. We will process the deletion within 5 business days. Any active Pro subscription will be cancelled as part of the process." },
    ]},
    { id: "technical", icon: "🔧", title: "Technical", color: "rgba(255,215,0,.06)", items: [
      { q: "Which browsers and devices are supported?", a: "All modern browsers — Chrome, Safari, Firefox, and Edge — on desktop and mobile. For the best mobile experience install it as a PWA. Internet Explorer is not supported." },
      { q: "Does MarketDebriefs work offline?", a: "The app shell loads offline but generating briefs requires an internet connection since they are generated live on each request. The Reflection journal and Learn to Fish sections work fully offline once the app has loaded at least once." },
      { q: "The app feels slow — how can I improve performance?", a: "Brief generation typically takes 5 to 15 seconds. If slower: check your internet connection, try installing as a PWA, or clear your browser cache and reload. If consistently slow contact support@marketdebriefs.com with your device and browser details." },
    ]},
  ];
  const filtered = sections.map(s => ({ ...s, items: s.items.filter(item => !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())) })).filter(s => s.items.length > 0);
  const toggle = (id) => setOpenItem(openItem === id ? null : id);
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0e0e0", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`@keyframes helpFade{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}} @keyframes helpPulse{0%,100%{opacity:1}50%{opacity:.3}} .help-ans{animation:helpFade .18s ease} .help-item:hover{border-color:rgba(255,255,255,.1)!important} .help-open{border-color:rgba(0,212,255,.25)!important}`}</style>
      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 24px", borderBottom:"1px solid rgba(255,255,255,.06)", position:"sticky", top:0, background:"rgba(10,12,15,.96)", backdropFilter:"blur(10px)", zIndex:100 }}>
        <div onClick={() => navigate("/")} style={{ fontSize:15, fontWeight:800, letterSpacing:"-0.5px", cursor:"pointer", color:"#fff" }}>MARKET<span style={{ color:"#00d4ff" }}>DEBRIEFS</span></div>
        <div style={{ display:"flex", gap:10 }}>
          <button onClick={() => navigate("/")} style={{ fontSize:11, fontFamily:"monospace", color:"#444", padding:"4px 10px", border:"1px solid #1a1a1a", borderRadius:5, background:"none", cursor:"pointer" }}>← HOME</button>
          <button onClick={() => navigate("/app")} style={{ fontSize:11, fontFamily:"monospace", color:"#00d4ff", padding:"4px 10px", border:"1px solid rgba(0,212,255,.2)", borderRadius:5, background:"rgba(0,212,255,.06)", cursor:"pointer" }}>LAUNCH APP</button>
        </div>
      </nav>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"52px 24px 36px", textAlign:"center" }}>
        <div style={{ display:"inline-flex", alignItems:"center", gap:6, padding:"4px 14px", borderRadius:20, border:"1px solid rgba(0,212,255,.2)", background:"rgba(0,212,255,.05)", marginBottom:18 }}>
          <div style={{ width:5, height:5, borderRadius:"50%", background:"#00d4ff", animation:"helpPulse 2s infinite" }} />
          <span style={{ fontSize:10, color:"#00d4ff", fontWeight:700, letterSpacing:1.5 }}>HELP CENTRE</span>
        </div>
        <h1 style={{ fontSize:"clamp(24px,5vw,40px)", fontWeight:900, color:"#fff", letterSpacing:"-1px", lineHeight:1.1, marginBottom:10 }}>How can we <span style={{ color:"#00d4ff" }}>help you?</span></h1>
        <p style={{ fontSize:13, color:"#555", lineHeight:1.7, marginBottom:24 }}>Everything you need to know about MarketDebriefs.</p>
        <div style={{ position:"relative", maxWidth:460, margin:"0 auto" }}>
          <input value={search} onChange={e => { setSearch(e.target.value); setOpenItem(null); }} placeholder="Search questions…" style={{ width:"100%", padding:"11px 42px 11px 15px", background:"rgba(255,255,255,.04)", border:"1px solid rgba(255,255,255,.1)", borderRadius:9, color:"#e0e0e0", fontSize:13, fontFamily:"inherit", outline:"none", boxSizing:"border-box" }} />
          <span style={{ position:"absolute", right:13, top:"50%", transform:"translateY(-50%)", color:"#333", fontSize:15, pointerEvents:"none" }}>⌕</span>
        </div>
      </div>
      <div style={{ maxWidth:680, margin:"0 auto", padding:"0 24px 80px" }}>
        {filtered.length === 0 && <div style={{ textAlign:"center", padding:"48px 0", color:"#444", fontSize:13 }}>No results for "{search}" — <button onClick={() => setSearch("")} style={{ background:"none", border:"none", color:"#00d4ff", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>clear search</button></div>}
        {filtered.map(section => (
          <div key={section.id} style={{ marginBottom:40 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, paddingBottom:11, borderBottom:"1px solid rgba(255,255,255,.05)" }}>
              <div style={{ width:32, height:32, borderRadius:8, background:section.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{section.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{section.title}</div>
              <div style={{ marginLeft:"auto", fontSize:10, fontFamily:"monospace", color:"#2a2a2a" }}>{section.items.length} articles</div>
            </div>
            {section.items.map((item, i) => {
              const id = section.id + "-" + i;
              const isOpen = openItem === id;
              return (
                <div key={id} className={"help-item" + (isOpen ? " help-open" : "")} onClick={() => toggle(id)} style={{ background:"rgba(255,255,255,.02)", border:"1px solid rgba(255,255,255,.06)", borderRadius:10, marginBottom:6, overflow:"hidden", transition:"border-color .2s", cursor:"pointer" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"13px 15px", gap:10 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:isOpen ? "#00d4ff" : "#e0e0e0", flex:1, lineHeight:1.4 }}>{item.q}</div>
                    <div style={{ width:20, height:20, borderRadius:4, background:isOpen ? "rgba(0,212,255,.1)" : "rgba(255,255,255,.03)", display:"flex", alignItems:"center", justifyContent:"center", fontSize:10, color:isOpen ? "#00d4ff" : "#333", flexShrink:0, transform:isOpen ? "rotate(180deg)" : "none", transition:"all .2s" }}>▾</div>
                  </div>
                  {isOpen && <div className="help-ans" style={{ padding:"0 15px 14px", fontSize:13, color:"#777", lineHeight:1.8, borderTop:"1px solid rgba(255,255,255,.05)" }}><div style={{ paddingTop:11 }}>{item.a}</div></div>}
                </div>
              );
            })}
          </div>
        ))}
        <div style={{ marginTop:16, padding:"26px 22px", background:"linear-gradient(135deg,rgba(0,212,255,.06),transparent)", border:"1px solid rgba(0,212,255,.15)", borderRadius:14, textAlign:"center" }}>
          <div style={{ fontSize:17, fontWeight:800, color:"#fff", marginBottom:7 }}>Still need help?</div>
          <div style={{ fontSize:13, color:"#555", lineHeight:1.7, marginBottom:18, maxWidth:360, margin:"0 auto 18px" }}>Can't find what you're looking for? We read every message and reply within 24 hours.</div>
          <a href="mailto:support@marketdebriefs.com" style={{ display:"inline-block", background:"linear-gradient(135deg,#00d4ff,#0099cc)", color:"#000", padding:"11px 26px", borderRadius:8, fontSize:13, fontWeight:800, fontFamily:"inherit", textDecoration:"none" }}>✉ EMAIL SUPPORT</a>
          <div style={{ marginTop:10, fontSize:11, color:"#2a2a2a", fontFamily:"monospace" }}>support@marketdebriefs.com · 24-hour response</div>
        </div>
      </div>
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
    window.scrollTo(0, 0);
  };
  if (path === "/app") return <><UpdateBanner /><AppShell navigate={navigate} /></>;
  if (path === "/help") return <HelpPage navigate={navigate} />;
  return <><UpdateBanner /><LandingPage navigate={navigate} /></>;
}

function LandingPage({ navigate }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0e0e0", fontFamily: "Inter, system-ui, sans-serif", margin: 0 }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0a0c0f; } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .fade-up { animation: fadeUp 0.7s ease forwards; } .cta-btn:hover { opacity: 0.85; transform: translateY(-1px); } .cta-btn { transition: all 0.15s; } .chip:hover { border-color: rgba(0,212,255,.4) !important; color: #00d4ff !important; } .chip { transition: all 0.15s; cursor: default; }`}</style>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,.05)", position: "sticky", top: 0, background: "rgba(10,12,15,.95)", backdropFilter: "blur(10px)", zIndex: 100 }}>
        <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px" }}>MARKET<span style={{ color: "#00d4ff" }}>DEBRIEFS</span></div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><button onClick={() => navigate("/help")} style={{ fontSize: 11, fontWeight: 600, color: "#333", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>HELP</button><button onClick={() => navigate("/app")} className="cta-btn" style={{ background: "rgba(0,212,255,.1)", border: "1px solid rgba(0,212,255,.25)", color: "#00d4ff", padding: "8px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>LAUNCH APP</button></div>
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

      {/* ── DATA VS ANSWERS ── */}
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 24px 100px", position: "relative" }}>

        {/* Grid bg glow */}
        <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 500, height: 300, background: "radial-gradient(ellipse, rgba(0,229,255,.05) 0%, transparent 70%)", pointerEvents: "none" }} />

        {/* Label */}
        <div style={{ textAlign: "center", fontSize: 11, color: "#00e5ff", letterSpacing: 3, fontWeight: 700, marginBottom: 28, opacity: 0.7 }}>WHY ANSWERS BEAT DATA</div>

        {/* Hero */}
        <div style={{ textAlign: "center", fontSize: "clamp(28px, 5vw, 56px)", fontWeight: 900, color: "#fff", lineHeight: 1.2, letterSpacing: -1, marginBottom: 24, fontFamily: "Georgia, serif" }}>
          <span style={{ color: "#444", textDecoration: "line-through", textDecorationColor: "#ff4757", textDecorationThickness: 2 }}>Data</span> tells you what.<br />
          <span style={{ color: "#00e5ff" }}>Answers</span> tell you what to do.
        </div>

        {/* Bloomberg context */}
        <p style={{ textAlign: "center", maxWidth: 640, margin: "0 auto 56px", fontSize: 15, color: "#555", lineHeight: 1.85, fontFamily: "Georgia, serif" }}>
          When NFP drops, Bloomberg gives you the number. What you actually need to know is: does this change the Fed's next move — and how does that hit the Dollar, Gold, and yields in the <span style={{ color: "#00e5ff", fontWeight: 700 }}>next 4 hours</span>?
        </p>

        {/* Data vs Answers cards — stacked on mobile, side by side on desktop */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 64, maxWidth: 680, margin: "0 auto 64px" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>

            {/* Data side */}
            <div style={{ flex: 1, padding: "20px 16px", borderRadius: 12, background: "rgba(255,71,87,.04)", border: "1px solid rgba(255,71,87,.15)" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#ff4757", marginBottom: 6, letterSpacing: -0.5 }}>Data</div>
              <div style={{ fontSize: 11, color: "#444", marginBottom: 12, lineHeight: 1.5 }}>The number. The release. The headline.</div>
              {[["NFP:", "+180k"], ["CPI:", "+3.2% YoY"], ["Fed Rate:", "5.25–5.50%"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ color: "#333" }}>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, display: "inline-block", padding: "3px 9px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: 1, background: "rgba(255,71,87,.1)", color: "#ff4757", border: "1px solid rgba(255,71,87,.2)" }}>RAW. UNINTERPRETED.</div>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 8px", flexShrink: 0 }}>
              <div style={{ width: 1, height: 50, background: "linear-gradient(to bottom, rgba(255,71,87,.3), rgba(0,229,255,.3))" }} />
              <div style={{ fontSize: 8, color: "#2a2a2a", textAlign: "center", lineHeight: 1.5, letterSpacing: 0.3, writingMode: "vertical-rl" }}>gap · traders bleed</div>
              <div style={{ width: 1, height: 50, background: "linear-gradient(to bottom, rgba(255,71,87,.3), rgba(0,229,255,.3))" }} />
            </div>

            {/* Answers side */}
            <div style={{ flex: 1, padding: "20px 16px", borderRadius: 12, background: "rgba(0,229,255,.04)", border: "1px solid rgba(0,229,255,.15)" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>⚡</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#00e5ff", marginBottom: 6, letterSpacing: -0.5 }}>Answers</div>
              <div style={{ fontSize: 11, color: "#444", marginBottom: 12, lineHeight: 1.5 }}>The interpretation. The implication. The edge.</div>
              {["Fed pivot pushed back — Dollar bullish", "Gold faces headwinds next 48hrs", "Yields pricing in higher-for-longer"].map(a => (
                <div key={a} style={{ fontSize: 11, color: "#666", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.04)", lineHeight: 1.4 }}>{a}</div>
              ))}
              <div style={{ marginTop: 12, display: "inline-block", padding: "3px 9px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: 1, background: "rgba(0,229,255,.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,.2)" }}>ACTIONABLE. IMMEDIATE.</div>
            </div>
          </div>
        </div>

        {/* 4 things data requires */}
        <div style={{ marginBottom: 56 }}>
          <div style={{ textAlign: "center", fontSize: 11, color: "#333", letterSpacing: 2, marginBottom: 20 }}>DATA REQUIRES YOU TO:</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }} className="dva-req-grid">
          <style>{`@media (max-width: 480px) { .dva-req-grid { grid-template-columns: 1fr !important; } }`}</style>
            {[
              ["01", "Know what it means in context"],
              ["02", "Cross-reference it with macro trends"],
              ["03", "Form a view under pressure"],
              ["04", "Decide — while the market is already moving"],
            ].map(([n, t]) => (
              <div key={n} style={{ display: "flex", gap: 12, padding: "14px 16px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 8, alignItems: "flex-start" }}>
                <span style={{ fontSize: 10, color: "#00e5ff", opacity: 0.4, fontWeight: 700, flexShrink: 0, marginTop: 2 }}>{n}</span>
                <span style={{ fontSize: 12, color: "#555", lineHeight: 1.5 }}>{t}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Core truth */}
        <div style={{ maxWidth: 640, margin: "0 auto 48px", textAlign: "center" }}>
          <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(0,229,255,.15), transparent)", marginBottom: 28 }} />
          <p style={{ fontSize: 15, color: "#444", lineHeight: 1.9, fontFamily: "Georgia, serif" }}>
            Most retail traders don't lose because they lacked data.<br />
            They lose because they had <span style={{ color: "#e0e0e0", fontWeight: 600 }}>too much uninterpreted data</span> and not enough time or expertise to turn it into a clear position.
          </p>
          <div style={{ height: 1, background: "linear-gradient(to right, transparent, rgba(0,229,255,.15), transparent)", marginTop: 28 }} />
        </div>

        {/* Gap statement */}
        <div style={{ textAlign: "center", fontSize: "clamp(18px, 3vw, 32px)", fontWeight: 800, color: "#222", lineHeight: 1.3, letterSpacing: -0.5, marginBottom: 56, fontFamily: "Georgia, serif" }}>
          The gap between data and a decision<br />
          <span style={{ color: "#ff4757" }}>is where most traders bleed.</span>
        </div>

        {/* MarketDebriefs proposition */}
        <div style={{ textAlign: "center", padding: "40px 32px", background: "rgba(0,229,255,.03)", border: "1px solid rgba(0,229,255,.1)", borderRadius: 16, maxWidth: 560, margin: "0 auto" }}>
          <div style={{ fontSize: 14, fontWeight: 900, color: "#fff", letterSpacing: 1, marginBottom: 18 }}>
            MARKET<span style={{ color: "#00e5ff" }}>DEBRIEFS</span>
          </div>
          <p style={{ fontSize: 16, color: "#666", lineHeight: 1.75, marginBottom: 14, fontFamily: "Georgia, serif" }}>
            Not another data feed.<br />
            A <span style={{ color: "#00e5ff", fontWeight: 600 }}>macro interpreter</span> sitting between the news and your trade.
          </p>
          <p style={{ fontSize: 13, color: "#333", lineHeight: 1.7, marginBottom: 28, fontFamily: "Georgia, serif" }}>
            Bloomberg charges $30,000/year to give you data.<br />
            We give you answers. <span style={{ color: "#00e5ff" }}>Free to start.</span>
          </p>
          <button onClick={() => navigate("/app")} style={{ padding: "14px 32px", background: "linear-gradient(135deg,#00e5ff,#0099bb)", color: "#000", fontSize: 14, fontWeight: 800, borderRadius: 8, border: "none", cursor: "pointer", fontFamily: "inherit", letterSpacing: 0.5 }}>
            Get Your First Brief Free →
          </button>
        </div>
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

// Known stock/equity keywords — anything matching these routes to the Stocks tab
const STOCK_HINTS = [
  "apple","aapl","nvidia","nvda","tesla","tsla","microsoft","msft","amazon","amzn",
  "meta","google","googl","goog","netflix","nflx","amd","palantir","pltr","spotify",
  "spot","uber","baba","alibaba","samsung","berkshire","brk","jpmorgan","jpm",
  "visa","v","mastercard","ma","paypal","pypl","disney","dis","boeing","ba",
  "ford","f","gm","general motors","coca cola","ko","pepsi","pep","walmart","wmt",
  "target","tgt","nike","nke","salesforce","crm","oracle","orcl","intel","intc",
  "qualcomm","qcom","broadcom","avgo","arm","snow","snowflake","shopify","shop",
  "coinbase","coin","robinhood","hood","sofi","affirm","afrm","rivian","rivn",
  "lucid","lcid","nio","xpeng","xpev","stock","shares","equity","ticker"
];

function isLikelyStock(q) {
  // Matches known stock names/tickers OR looks like a short ticker (2-5 uppercase-ish chars)
  if (STOCK_HINTS.some(h => q === h || q.includes(h))) return true;
  // Pure alphabetic query 2-5 chars that isn't a known instrument alias — likely a ticker
  if (/^[a-z]{2,5}$/.test(q)) return true;
  return false;
}

function detect(query) {
  const q = query.toLowerCase().trim();
  if (!q) return null;
  for (const [key, val] of Object.entries(INSTRUMENTS)) {
    if (val.aliases.some(a => a === q)) return { key, ...val };
  }
  for (const [key, val] of Object.entries(INSTRUMENTS)) {
    if (val.aliases.some(a => q.includes(a) || a.includes(q))) return { key, ...val };
  }
  // Flag as equity so the run() function can redirect instead of running a broken brief
  if (isLikelyStock(q)) return { key: "equity", label: query.trim(), aliases: [], color: "#f59e0b", flag: "STOCK", optionsTicker: null };
  return null;
}

function sysPrompt(mode) {
  const base = `You are a professional market intelligence analyst. Respond ONLY with valid JSON. No markdown, no backticks, no preamble. Start with { and end with }.
CRITICAL RULES — NEVER BREAK THESE:
1. NEVER mention specific price levels, support/resistance numbers, targets, stops, or historical price ranges.
2. EVENTS must be STRICTLY UPCOMING — scheduled in the future from the current time. NEVER include events that have already occurred or already been released today. If an event has already happened, exclude it entirely.
3. For events, only include the 2-3 most market-moving SCHEDULED releases coming up in the next 48 hours that directly affect this instrument. Include the exact scheduled time.
4. Your job is macro context and forward-looking event risk — not technical analysis, not past events.`;
  if (mode === "scalper") return base + ' SCALPER MODE schema: {"instrument":"string","risk_level":"GREEN|YELLOW|RED","risk_reason":"string","scalper_note":"string","breaking":[{"headline":"string","direction":"BULLISH|BEARISH|NEUTRAL","age":"string"}],"imminent":[{"event":"string","due_in":"string","expected_impact":"string"}]}. risk_level means: GREEN=macro conditions calm and no imminent events (CLEAR to trade), YELLOW=something is close on the calendar or in the news (proceed with CAUTION), RED=major event imminent or breaking news active (STAND DOWN — not the time to scalp). This is a RISK AWARENESS check, NOT a directional signal.';
  return base + ' FULL BRIEF schema: {"instrument":"string","macro_theme":"string","headline_summary":"string","events":[{"title":"string","time":"string","impact":"HIGH|MEDIUM","direction":"BULLISH|BEARISH|NEUTRAL","summary":"string","why_it_moves_price":"string","confidence":"HIGH|MEDIUM|LOW"}],"geopolitical_risks":"string","macro_context":"string","teaching_moment":"string"}. macro_theme must be a SHORT neutral phrase describing the dominant macro forces at play — e.g. "Safe haven demand vs dollar strength" or "Fed hawkishness weighing on rate-sensitive assets". NO directional bias words like bullish/bearish in macro_theme.';
}

function userPrompt(inst, mode) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  if (mode === "scalper") return "Current time: " + now + ". I am about to trade " + inst.label + ". What are the live macro risks RIGHT NOW? Is this a CLEAR, CAUTION or STAND DOWN moment? GREEN=clear macro conditions, YELLOW=caution something is close, RED=stand down major event imminent. No price levels. No directional signals. Risk awareness only.";
  return "Current time: " + now + ". Full macro briefing for " + inst.label + ". List only the most important UPCOMING scheduled events after this exact time that will move this instrument in the next 48 hours. Include their scheduled time. Do NOT include any events that have already happened today. Focus on CURRENT central bank stance and live geopolitical risks. No price levels.";
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

async function getEquityScalper(label) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const sys = `You are a professional equity trader's risk assistant. Respond ONLY with valid JSON. No markdown, no backticks, no preamble. Start with { and end with }.
RULES: Never mention specific price levels. Focus only on CURRENT and IMMINENT risks for this specific stock.
EQUITY SCALPER schema: {"ticker":"string","risk_level":"GREEN|YELLOW|RED","risk_reason":"string","scalper_note":"string","earnings_proximity":"SAFE|NEAR|IMMINENT","breaking":[{"headline":"string","direction":"BULLISH|BEARISH|NEUTRAL","age":"string"}],"imminent":[{"event":"string","due_in":"string","expected_impact":"string"}]}`;
  const msg = "Time: " + now + ". I am about to trade " + label + ". Give me a GREEN / YELLOW / RED equity scalper check. Flag: earnings proximity, any breaking company-specific news, analyst events, sector pressure, or macro events that directly affect this stock right now. No price levels.";
  return callClaude(sys, msg);
}

async function getPostSessionBrief(inst, priceContext) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const priceNote = priceContext
    ? `IMPORTANT: The actual last trading session move was ${priceContext.direction} ${priceContext.pct}. Your narrative MUST be consistent with this — if the move was positive/bullish write accordingly, if negative/bearish write accordingly.`
    : "";
  const sys = `You are a professional market intelligence analyst writing an end-of-day session debrief. Respond ONLY with valid JSON. No markdown, no backticks, no preamble. Start with { and end with }.
CRITICAL RULES:
1. You are looking BACKWARDS at the most recent completed TRADING SESSION (Monday-Friday only — ignore weekends).
2. NEVER mention specific price levels, targets, stops or support/resistance numbers.
3. Be specific about WHICH macro events or news actually fired in the last session and how the market reacted.
4. The watch_tomorrow field should name ONE specific upcoming event or theme to prepare for in the next trading session.
5. session_summary must be ONE short sentence max — like a trader's journal entry. Under 120 characters.
6. primary_driver and what_it_revealed must each be ONE sentence, under 100 characters each.
7. ${priceNote}
POST-SESSION schema: {"instrument":"string","session_summary":"string","primary_driver":"string","secondary_driver":"string","what_it_revealed":"string","watch_tomorrow":"string","next_event":{"title":"string","time":"string"}}`;
  const msg = `Current time: ${now}. Write a post-session debrief for the most recent TRADING DAY (Mon-Fri) for ${inst.label}. ${priceNote} Cover: (1) how the last trading session played out in one sentence, (2) the primary macro driver, (3) any secondary factor, (4) what it revealed about the macro picture, (5) what to watch in the next trading session, (6) the next scheduled high-impact event. No price levels.`;
  return callClaude(sys, msg);
}

async function getBreakingNarrative(headline) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const sys = `You are a professional macro market interpreter. A breaking news headline or event has just hit. Your job is to instantly explain what it means for markets — no fluff, no caveats, just clear macro interpretation. Respond ONLY with valid JSON. No markdown, no backticks. Start with { and end with }.
RULES:
1. NEVER mention specific price levels, targets or stops.
2. Be direct and specific — name which instruments are affected and how.
3. narrative_summary must be 1-2 punchy sentences max — the interpretation a trader needs in 10 seconds.
4. Each instrument impact must be ONE sentence: what happens and why.
5. urgency: CRITICAL (market moving now), HIGH (significant impact expected), MEDIUM (watch closely).
BREAKING NARRATIVE schema: {"headline":"string","narrative_summary":"string","urgency":"CRITICAL|HIGH|MEDIUM","instruments":[{"name":"string","direction":"BULLISH|BEARISH|NEUTRAL","impact":"string"}],"watch_for":"string","fades_when":"string"}`;
  const msg = `Current time: ${now}. Breaking headline: "${headline}". Interpret this instantly for macro traders. Which instruments are affected, in which direction, and why? What should traders watch for next? When does this narrative fade?`;
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
  const [view, setView] = useState("sign-up");
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: 20 }}>

      {/* Logo */}
      <div style={{ marginBottom: 24, textAlign: "center" }}>
        <div style={{ fontSize: 22, fontWeight: 800, color: "#fff", letterSpacing: "-0.5px" }}>MARKET<span style={{ color: "#00d4ff" }}>DEBRIEFS</span></div>
        <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>Know the macro before you trade</div>
      </div>

      {/* Tab toggle — prominent, above the form */}
      <div style={{ display: "flex", width: "100%", maxWidth: 400, marginBottom: 0, background: "#0d1117", borderRadius: "10px 10px 0 0", border: "1px solid rgba(255,255,255,.07)", borderBottom: "none", overflow: "hidden" }}>
        <button
          onClick={() => setView("sign-up")}
          style={{ flex: 1, padding: "13px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
            background: view === "sign-up" ? "rgba(0,212,255,.1)" : "transparent",
            color: view === "sign-up" ? "#00d4ff" : "#333",
            borderBottom: view === "sign-up" ? "2px solid #00d4ff" : "2px solid transparent",
            transition: "all .15s"
          }}>
          Sign up free
        </button>
        <button
          onClick={() => setView("sign-in")}
          style={{ flex: 1, padding: "13px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
            background: view === "sign-in" ? "rgba(0,212,255,.1)" : "transparent",
            color: view === "sign-in" ? "#00d4ff" : "#333",
            borderBottom: view === "sign-in" ? "2px solid #00d4ff" : "2px solid transparent",
            transition: "all .15s"
          }}>
          Sign in
        </button>
      </div>

      {/* Clerk form */}
      <div style={{ width: "100%", maxWidth: 400 }}>
        {view === "sign-up"
          ? <SignUp forceRedirectUrl="/app" appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" }, elements: { card: { borderRadius: "0 0 10px 10px", borderTop: "none" } } }} />
          : <SignIn forceRedirectUrl="/app" appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" }, elements: { card: { borderRadius: "0 0 10px 10px", borderTop: "none" } } }} />
        }
      </div>

      {/* Free tier reminder */}
      <div style={{ marginTop: 16, fontSize: 11, color: "#2a2a2a", textAlign: "center", fontFamily: "monospace", letterSpacing: 0.5 }}>
        Free · 3 briefs/day · No credit card needed
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
function StocksTab({ query, setQuery, data, setData, loading, setLoading, error, setError, mode, scalperData, setScalperData, scalperLoading, setScalperLoading, scalperError, setScalperError, onShareCard }) {
  const isScalper = mode === "scalper";

  const runStock = async () => {
    const q = query.trim();
    if (!q) return;
    if (isScalper) {
      setScalperLoading(true); setScalperError(null); setScalperData(null);
      try {
        const result = await getEquityScalper(q);
        setScalperData(result);
      } catch (e) { setScalperError(e.message || "Fetch failed. Please try again."); }
      finally { setScalperLoading(false); }
    } else {
      setLoading(true); setError(null); setData(null);
      try {
        const result = await getEquityBrief(q);
        setData(result);
      } catch (e) { setError(e.message || "Fetch failed. Please try again."); }
      finally { setLoading(false); }
    }
  };

  const SUGGESTIONS = ["Apple","Microsoft","Nvidia","Tesla","Amazon","Meta","Google","Netflix","AMD","Palantir","Spotify","Uber"];
  const activeLoading = isScalper ? scalperLoading : loading;
  const activeError   = isScalper ? scalperError   : error;

  return (
    <div>
      {/* Mode indicator */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, padding: "8px 12px", background: isScalper ? "rgba(245,158,11,.06)" : "rgba(255,255,255,.02)", border: "1px solid " + (isScalper ? "rgba(245,158,11,.2)" : "rgba(255,255,255,.06)"), borderRadius: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: isScalper ? "#f59e0b" : "#00d4ff", flexShrink: 0 }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: isScalper ? "#f59e0b" : "#00d4ff", letterSpacing: 1.5 }}>
          {isScalper ? "EQUITY SCALPER — PRO" : "EQUITY DEBRIEF — PRO"}
        </div>
        <div style={{ fontSize: 10, color: "#333", marginLeft: "auto" }}>
          {isScalper ? "CLEAR / CAUTION / STAND DOWN" : "Full macro & fundamental analysis"}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            onKeyDown={e => e.key === "Enter" && runStock()}
            placeholder={isScalper ? "NVDA, TSLA, AAPL — about to trade?" : "Tesla, MSFT, Apple, NVDA, any ticker…"}
            style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid " + (isScalper ? "rgba(245,158,11,.25)" : "rgba(245,158,11,.2)"), borderRadius: 8, color: "#e0e0e0", fontSize: 14, padding: "10px 13px", outline: "none", fontFamily: "inherit", minWidth: 0 }}
          />
          <button onClick={runStock} disabled={activeLoading} style={{ padding: "10px 16px", borderRadius: 8, cursor: activeLoading ? "not-allowed" : "pointer", background: activeLoading ? "rgba(255,255,255,.02)" : "rgba(245,158,11,.12)", color: activeLoading ? "#2a2a2a" : "#f59e0b", border: "1px solid rgba(245,158,11,.25)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit" }}>
            {activeLoading ? "…" : isScalper ? "CHECK NOW" : "BRIEF ME"}
          </button>
        </div>
        <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
          {SUGGESTIONS.map(s => (
            <button key={s} onClick={() => setQuery(s)} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: "rgba(245,158,11,.04)", border: "1px solid rgba(245,158,11,.12)", color: "#666" }}>{s}</button>
          ))}
        </div>
      </div>

      {/* Results */}
      {activeLoading && <Loader />}
      {activeError && <div style={{ color: "#ff4757", padding: "16px 0", fontSize: 13 }}>{activeError}</div>}

      {isScalper ? (
        !scalperLoading && !scalperData && !scalperError && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>⚡</div>
            <div style={{ fontSize: 13, color: "#444", marginBottom: 6 }}>Enter a stock ticker for an instant risk check</div>
            <div style={{ fontSize: 11, color: "#2a2a2a" }}>Earnings proximity · Breaking news · Imminent catalysts</div>
          </div>
        )
      ) : (
        !loading && !data && !error && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 13, color: "#444" }}>Search any stock or ticker above for a full macro & fundamental debrief</div>
            <div style={{ fontSize: 11, color: "#2a2a2a", marginTop: 6 }}>MAG7 · Large caps · Any public company</div>
          </div>
        )
      )}

      {isScalper && !scalperLoading && scalperData && (
        <EquityScalperView ticker={query} data={scalperData} loading={scalperLoading} error={scalperError} />
      )}
      {!isScalper && !loading && data && (
        <EquityView inst={{ label: data.instrument || query, color: "#f59e0b", flag: "STOCK" }} data={data} />
      )}
      {/* Share card button — shows after equity brief or equity scalper */}
      {((!isScalper && !loading && data) || (isScalper && !scalperLoading && scalperData)) && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={() => onShareCard(isScalper ? scalperData : data, isScalper ? "scalper-equity" : "equity", query)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 22px", borderRadius: 8, border: "1px solid rgba(245,158,11,.25)", background: "rgba(245,158,11,.08)", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ↗ DAILY OUTLOOK CARD
          </button>
        </div>
      )}
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
        </div>
        <div style={{ fontSize: 9, color: "#444", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>MACRO THEME</div>
        <div style={{ fontSize: 14, color: "#c8d6e5", lineHeight: 1.6 }}>{data.macro_theme || data.headline_summary}</div>
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

function EquityScalperView({ ticker, data, loading, error }) {
  if (loading) return <Loader />;
  if (error) return <div style={{ color: "#ff4757", padding: "16px 0", fontSize: 13 }}>{error}</div>;
  if (!data) return null;

  const RL = {
    GREEN:  { label: "CLEAR",      sub: "Macro conditions calm",         color: "#00d4ff", bg: "rgba(0,212,255,.08)",  border: "rgba(0,212,255,.2)"  },
    YELLOW: { label: "CAUTION",    sub: "Something is close — be aware", color: "#f59e0b", bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.2)" },
    RED:    { label: "STAND DOWN", sub: "Major event imminent — wait",   color: "#ff4757", bg: "rgba(255,71,87,.08)",  border: "rgba(255,71,87,.2)"  },
  };
  const rl = RL[data.risk_level] || RL.YELLOW;
  const EC = { SAFE: { color: "#00d4aa", label: "EARNINGS SAFE", bg: "rgba(0,212,170,.08)" }, NEAR: { color: "#ffd700", label: "EARNINGS NEAR", bg: "rgba(255,215,0,.06)" }, IMMINENT: { color: "#ff4757", label: "EARNINGS IMMINENT", bg: "rgba(255,71,87,.08)" } };
  const ep = EC[data.earnings_proximity] || EC.SAFE;

  return (
    <div>
      {/* Risk signal */}
      <div style={{ background: rl.bg, border: "1px solid " + rl.border, borderRadius: 12, padding: "22px 20px", marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
          {(data.ticker || ticker).toUpperCase()} — MACRO RISK CHECK
        </div>
        <div style={{ fontSize: 32, fontWeight: 900, color: rl.color, marginBottom: 4, letterSpacing: -1 }}>{rl.label}</div>
        <div style={{ fontSize: 10, color: rl.color, opacity: 0.6, fontFamily: "monospace", letterSpacing: 1, marginBottom: 10 }}>{rl.sub}</div>
        <div style={{ height: 1, background: "rgba(255,255,255,.05)", marginBottom: 10 }} />
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.5 }}>{data.risk_reason}</div>
      </div>

      {/* Earnings proximity badge */}
      <div style={{ background: ep.bg, border: "1px solid " + ep.color + "44", borderRadius: 8, padding: "10px 14px", marginBottom: 14, display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: ep.color, flexShrink: 0 }} />
        <div style={{ fontSize: 11, fontWeight: 700, color: ep.color, letterSpacing: 1 }}>{ep.label}</div>
      </div>

      {/* Scalper note */}
      <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: 13, marginBottom: 14 }}>
        <div style={{ fontSize: 9, color: "#666", letterSpacing: 1.5, fontWeight: 700, marginBottom: 5 }}>EQUITY SCALPER NOTE</div>
        <div style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.6, fontWeight: 500 }}>{data.scalper_note}</div>
      </div>

      {/* Breaking news */}
      {data.breaking && data.breaking.length > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ fontSize: 9, color: "#ff4757", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>BREAKING — {(data.ticker || ticker).toUpperCase()}</div>
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

      {/* Imminent events */}
      {data.imminent && data.imminent.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "#f59e0b", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>COMING UP — {(data.ticker || ticker).toUpperCase()}</div>
          {data.imminent.map((ev, i) => (
            <div key={i} style={{ background: "rgba(245,158,11,.05)", border: "1px solid rgba(245,158,11,.15)", borderRadius: 8, padding: "11px 13px", marginBottom: 7, display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 600 }}>{ev.event}</div>
              <div style={{ textAlign: "right", marginLeft: 12 }}>
                <div style={{ fontSize: 11, color: "#f59e0b", fontWeight: 700 }}>in {ev.due_in}</div>
                <div style={{ fontSize: 11, color: "#777", marginTop: 2 }}>{ev.expected_impact}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── DYNAMIC CALENDAR ICON ────────────────────────────────────────────────────
function DynamicCalendar({ size = 18 }) {
  const today = new Date();
  const day = today.getDate();
  const month = today.toLocaleDateString("en-GB", { month: "short" }).toUpperCase();
  const s = size;
  return (
    <svg width={s} height={s} viewBox="0 0 18 18" fill="none" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0, marginTop: 1 }}>
      {/* Calendar body */}
      <rect x="1" y="3" width="16" height="14" rx="2" fill="#1a1f2e" stroke="#2a3040" strokeWidth="0.8"/>
      {/* Red header */}
      <rect x="1" y="3" width="16" height="5" rx="2" fill="#ff4757"/>
      <rect x="1" y="6" width="16" height="2" fill="#ff4757"/>
      {/* Month text */}
      <text x="9" y="7.2" textAnchor="middle" fontSize="3.2" fontWeight="700" fill="#fff" fontFamily="monospace" letterSpacing="0.5">{month}</text>
      {/* Day number */}
      <text x="9" y="14.5" textAnchor="middle" fontSize="6" fontWeight="900" fill="#e0e0e0" fontFamily="monospace">{day}</text>
      {/* Ring pins */}
      <rect x="5" y="1.5" width="1.2" height="3.5" rx="0.6" fill="#555"/>
      <rect x="11.8" y="1.5" width="1.2" height="3.5" rx="0.6" fill="#555"/>
    </svg>
  );
}

// ── BREAKING NARRATIVE SHARE CARD ───────────────────────────────────────────
function BreakingShareCard({ data, onClose }) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared]   = useState(false);

  const date  = new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
  const urgencyColor = { CRITICAL: "#ff4757", HIGH: "#ffa500", MEDIUM: "#ffd700" }[data.urgency] || "#ffd700";
  const urgencyBg    = { CRITICAL: "rgba(255,71,87,.1)", HIGH: "rgba(255,165,0,.1)", MEDIUM: "rgba(255,215,0,.08)" }[data.urgency] || "rgba(255,215,0,.08)";
  const truncate = (s, n) => s && s.length > n ? s.slice(0, n-1) + "…" : (s || "");
  const firstSentence = (s) => { if (!s) return ""; const m = s.match(/^.*?[.!?](?:\s|$)/); return m ? m[0].trim() : s.length > 100 ? s.slice(0,99)+"." : s; };

  const handleShare = async () => {
    setSharing(true);
    try {
      if (!window.html2canvas) {
        await new Promise((res, rej) => {
          const sc = document.createElement("script");
          sc.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          sc.onload = res; sc.onerror = rej;
          document.head.appendChild(sc);
        });
      }
      const el     = document.getElementById("breaking-card-el");
      const canvas = await window.html2canvas(el, { backgroundColor: "#0a0c0f", scale: 2, useCORS: true, logging: false });
      const blob   = await new Promise(r => canvas.toBlob(r, "image/png"));
      const file   = new File([blob], "marketdebriefs-breaking.png", { type: "image/png" });
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: "⚡ Breaking Narrative\n\n" + data.headline + "\n\nBrief First, Trade After.\nmarketdebriefs.com" });
        setShared(true); setTimeout(() => setShared(false), 3000);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a"); a.href = url; a.download = "marketdebriefs-breaking.png"; a.click();
        URL.revokeObjectURL(url); setShared(true); setTimeout(() => setShared(false), 3000);
      }
    } catch(e) { console.error(e); }
    setSharing(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.92)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }} onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 400 }}>

        {/* CARD */}
        <div id="breaking-card-el" style={{ background: "#0a0c0f", borderRadius: 20, padding: 22, width: "100%", position: "relative", overflow: "hidden", boxShadow: "0 12px 60px rgba(0,0,0,.6)" }}>
          {/* Grid */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none", backgroundImage: "linear-gradient(rgba(255,71,87,.025) 1px,transparent 1px),linear-gradient(90deg,rgba(255,71,87,.025) 1px,transparent 1px)", backgroundSize: "36px 36px" }} />
          {/* Glow */}
          <div style={{ position: "absolute", top: -60, left: -60, width: 220, height: 220, pointerEvents: "none", background: "radial-gradient(circle,rgba(255,71,87,.08),transparent 70%)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Logo + badge */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#fff" }}>MARKET<span style={{ color: "#ff4757" }}>DEBRIEFS</span></div>
              <div style={{ fontSize: 9, color: "#ff4757", fontFamily: "monospace", letterSpacing: 1.5, opacity: 0.7 }}>BREAKING NARRATIVE</div>
            </div>

            {/* Urgency + date */}
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
              <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "4px 12px", borderRadius: 20, background: urgencyBg, border: "1px solid " + urgencyColor + "44" }}>
                <span style={{ fontSize: 10 }}>{data.urgency === "CRITICAL" ? "🔴" : data.urgency === "HIGH" ? "🟠" : "🟡"}</span>
                <span style={{ fontSize: 10, fontWeight: 800, color: urgencyColor, letterSpacing: 1 }}>{data.urgency}</span>
              </div>
              <span style={{ fontSize: 9, color: "#333", fontFamily: "monospace" }}>{date}</span>
            </div>

            {/* Headline */}
            <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0", lineHeight: 1.45, marginBottom: 10, fontFamily: "Georgia, serif" }}>
              "{truncate(data.headline, 120)}"
            </div>

            {/* Narrative summary */}
            <div style={{ fontSize: 9, color: "#ff4757", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6, opacity: 0.7 }}>MACRO INTERPRETATION</div>
            <div style={{ fontSize: 11, color: "#888", lineHeight: 1.6, marginBottom: 14, fontStyle: "italic" }}>
              {firstSentence(data.narrative_summary)}
            </div>

            {/* Top 3 instrument impacts */}
            {data.instruments && (
              <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 12 }}>
                {data.instruments.slice(0, 3).map((inst, i) => {
                  const c = { BULLISH: "#00d4aa", BEARISH: "#ff4757", NEUTRAL: "#ffd700" }[inst.direction] || "#666";
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 9px", background: c + "08", border: "1px solid " + c + "22", borderRadius: 6 }}>
                      <div style={{ flexShrink: 0, minWidth: 40 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{inst.name}</div>
                        <div style={{ fontSize: 8, color: c, fontWeight: 700 }}>{inst.direction}</div>
                      </div>
                      <div style={{ fontSize: 9, color: "#555", lineHeight: 1.4 }}>{truncate(inst.impact, 70)}</div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Watch for */}
            {data.watch_for && (
              <div style={{ padding: "6px 9px", borderRadius: 6, background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.1)", marginBottom: 14 }}>
                <div style={{ fontSize: 7, color: "#00d4ff", letterSpacing: 1, fontWeight: 700, marginBottom: 2, opacity: 0.7 }}>WATCH FOR</div>
                <div style={{ fontSize: 9, color: "#555", lineHeight: 1.4 }}>{firstSentence(data.watch_for)}</div>
              </div>
            )}

            {/* Footer */}
            <div style={{ height: 1, background: "rgba(255,255,255,.05)", marginBottom: 10 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <span style={{ fontSize: 9, color: "#ff4757", fontFamily: "monospace", opacity: 0.7 }}>Brief First, Trade After · marketdebriefs.com</span>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div style={{ display: "flex", gap: 10, width: "100%" }}>
          <button onClick={handleShare} disabled={sharing} style={{ flex: 1, padding: "12px", borderRadius: 8, border: "none", cursor: sharing ? "wait" : "pointer", background: sharing ? "rgba(255,71,87,.05)" : "linear-gradient(135deg,#ff4757,#cc0011)", color: sharing ? "#333" : "#fff", fontSize: 13, fontWeight: 800, fontFamily: "inherit" }}>
            {sharing ? "Preparing…" : shared ? "✓ Shared!" : "↗ Share Card"}
          </button>
          <button onClick={onClose} style={{ padding: "12px 20px", borderRadius: 8, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit" }}>Done</button>
        </div>
        <div style={{ fontSize: 11, color: "#2a2a2a", textAlign: "center" }}>Mobile — shares to any app · Desktop — downloads as PNG</div>
      </div>
    </div>
  );
}

// ── SHARE CARD ───────────────────────────────────────────────────────────────
function ShareCard({ inst, data, mode, cardType, isPostSessionBrief, onClose }) {
  const [sharing, setSharing] = useState(false);
  const [shared, setShared] = useState(false);
  const [isPostSession, setIsPostSession] = useState(!!isPostSessionBrief);
  const [priceMove, setPriceMove] = useState(null);

  const date = new Date().toLocaleDateString("en-GB", {
    day: "2-digit", month: "short", year: "numeric"
  }).toUpperCase();

  // cardType: "macro" | "scalper" | "equity"
  const isScalper = cardType === "scalper";
  const isEquity  = cardType === "equity";


  // Fetch price move data when switching to post-session
  useEffect(() => {
    if (!isPostSession) { setPriceMove(null); return; }
    fetch(`/api/chart-data?instrument=${encodeURIComponent(inst.label)}&days=7`)
      .then(r => r.json())
      .then(data => {
        if (data.error || !data.candles?.length) return;
        // Filter to weekdays only — ignore weekend thin trading
        const candles = data.candles.filter(c => {
          const day = new Date(c.t * 1000).getDay();
          return day >= 1 && day <= 5;
        });
        const last = candles[candles.length - 1];
        const prev = candles[candles.length - 2];
        if (!last || !prev) return;
        const change    = last.c - prev.c;
        const changePct = (change / prev.c) * 100;
        const isLarge   = Math.abs(last.c) > 1000;
        const fmt       = (n) => isLarge ? n.toFixed(0) : n.toFixed(4);
        setPriceMove({
          close:     fmt(last.c),
          change:    (change >= 0 ? "+" : "") + fmt(change),
          changePct: (changePct >= 0 ? "+" : "") + changePct.toFixed(2) + "%",
          up:        change >= 0,
        });
      })
      .catch(() => setPriceMove(null));
  }, [isPostSession, inst.label]);

  // Determine bias
  const rawBias = isScalper ? data.risk_level : data.sentiment;
  const bias = rawBias ? rawBias.toUpperCase() : "NEUTRAL";

  const biasConfig = {
    BULLISH: { emoji: "", color: "#00d4aa", bg: "rgba(0,212,170,.1)",  border: "rgba(0,212,170,.3)"  },
    BEARISH: { emoji: "", color: "#ff4757", bg: "rgba(255,71,87,.1)",  border: "rgba(255,71,87,.3)"  },
    NEUTRAL: { emoji: "", color: "#ffd700", bg: "rgba(255,215,0,.08)", border: "rgba(255,215,0,.25)" },
    MIXED:   { emoji: "", color: "#c084fc", bg: "rgba(192,132,252,.1)",border: "rgba(192,132,252,.3)"},
    GREEN:   { emoji: "", color: "#00d4ff", bg: "rgba(0,212,255,.1)",  border: "rgba(0,212,255,.3)"  },
    YELLOW:  { emoji: "", color: "#f59e0b", bg: "rgba(245,158,11,.1)", border: "rgba(245,158,11,.3)" },
    RED:     { emoji: "", color: "#ff4757", bg: "rgba(255,71,87,.1)",  border: "rgba(255,71,87,.3)"  },
  };
  const bc = biasConfig[bias] || biasConfig.NEUTRAL;

  // Accent colour — cyan for macro/scalper, amber for equity
  const accent = isEquity ? "#f59e0b" : "#00d4ff";
  const accentDim = isEquity ? "rgba(245,158,11,.1)" : "rgba(0,212,255,.035)";

  // Card label
  const cardLabel = (isPostSession || isPostSessionBrief) ? "POST-SESSION BRIEF" : isEquity ? "EQUITY DEBRIEF" : isScalper ? "LIVE RISK CHECK" : "MACRO BRIEF";

  // Content lines
  const truncate = (str, max) => str && str.length > max ? str.slice(0, max - 1) + "…" : (str || "");
  // Extract first complete sentence — no mid-word cuts
  const firstSentence = (str) => {
    if (!str) return "";
    const match = str.match(/^.*?[.!?](?:\s|$)/);
    if (match) return match[0].trim();
    // If no sentence ending found, return whole string up to 120 chars
    return str.length > 120 ? str.slice(0, 119) + "." : str;
  };

  let line1, line2, line3, biasReason;
  if (isEquity) {
    line1      = truncate(data.earnings_context, 80);
    line2      = truncate(data.macro_tailwinds || data.macro_headwinds, 80);
    line3      = truncate(data.catalyst_events?.[0]?.title, 80);
    biasReason = truncate(data.headline_summary, 70);
  } else if (isScalper) {
    line1      = truncate(data.risk_reason, 80);
    line2      = truncate(data.scalper_note, 80);
    line3      = data.imminent?.[0] ? truncate(data.imminent[0].event + " — in " + data.imminent[0].due_in, 80) : "";
    biasReason = truncate(data.risk_reason, 70);
  } else {
    line1      = truncate(data.geopolitical_risks || data.headline_summary, 80);
    line2      = truncate(data.macro_context, 80);
    line3      = data.events?.[0] ? truncate(data.events[0].title + " · " + data.events[0].time, 80) : "";
    biasReason = truncate(data.headline_summary, 70);
  }

  const lineIcons = isEquity
    ? ["📊", "📈", "CAL"]
    : isScalper
    ? ["⚡", "🎯", "CAL"]
    : ["🏦", "⚠️", "CAL"];

  // ── SHARE / DOWNLOAD ──────────────────────────────────────────────────────
  const handleShare = async () => {
    setSharing(true);
    try {
      // Dynamically load html2canvas
      if (!window.html2canvas) {
        await new Promise((resolve, reject) => {
          const script = document.createElement("script");
          script.src = "https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js";
          script.onload = resolve;
          script.onerror = reject;
          document.head.appendChild(script);
        });
      }

      const el = document.getElementById("share-card-el");
      const canvas = await window.html2canvas(el, {
        backgroundColor: "#0a0c0f",
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], "marketdebriefs-" + inst.label.replace(/\//g,"-") + ".png", { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Native share sheet — works on mobile (iOS/Android)
        await navigator.share({
          files: [file],
          text: inst.label + ((isPostSession || isPostSessionBrief) ? " — Post-Session Brief" : isScalper ? " — Live Risk Check" : isEquity ? " — Equity Debrief" : " — Daily Outlook") + "\n\nBrief First, Trade After.\nmarketdebriefs.com",
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else {
        // Desktop fallback — download the image
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = "marketdebriefs-" + inst.label.replace(/\//g,"-") + ".png";
        a.click();
        URL.revokeObjectURL(url);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      }
    } catch (e) {
      console.error("Share failed:", e);
    }
    setSharing(false);
  };

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.9)", zIndex: 2000, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}
      onClick={onClose}>
      <div onClick={e => e.stopPropagation()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 14, width: "100%", maxWidth: 400 }}>

        {/* CARD */}
        <div id="share-card-el" style={{
          background: "#0a0c0f", borderRadius: 20, padding: (isPostSession || isPostSessionBrief) ? 18 : 22,
          width: "100%", aspectRatio: "1 / 1",
          display: "flex", flexDirection: "column", justifyContent: "space-between",
          position: "relative", overflow: "hidden",
          boxShadow: "0 12px 60px rgba(0,0,0,.6)",
        }}>
          {/* Grid */}
          <div style={{ position: "absolute", inset: 0, pointerEvents: "none",
            backgroundImage: "linear-gradient(" + accentDim + " 1px,transparent 1px),linear-gradient(90deg," + accentDim + " 1px,transparent 1px)",
            backgroundSize: "36px 36px" }} />
          {/* Glow */}
          <div style={{ position: "absolute", top: -80, left: -80, width: 260, height: 260, pointerEvents: "none",
            background: "radial-gradient(circle," + (isEquity ? "rgba(245,158,11,.1)" : "rgba(0,212,255,.1)") + ",transparent 70%)" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            {/* Logo + card type */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: (isPostSession || isPostSessionBrief) ? 10 : 14 }}>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#fff", letterSpacing: -0.5 }}>
                MARKET<span style={{ color: accent }}>DEBRIEFS</span>
              </div>
              <div style={{ fontSize: 9, color: accent, fontFamily: "monospace", letterSpacing: 1.5, opacity: 0.7 }}>{cardLabel}</div>
            </div>

            {/* Instrument + motto */}
            <div style={{ fontSize: isEquity ? 22 : isScalper ? 24 : 26, fontWeight: 900, color: "#fff", letterSpacing: -1, lineHeight: 1, marginBottom: 2 }}>
              {isEquity ? (data.ticker || inst.label).toUpperCase() : inst.label}
            </div>
            <div style={{ fontSize: 8, color: accent, fontFamily: "monospace", letterSpacing: 0.8, opacity: 0.7, marginBottom: 4 }}>
              Brief First, Trade After.
            </div>
            {isEquity && data.sector && (
              <div style={{ fontSize: 10, color: "#555", letterSpacing: 1, marginBottom: 2 }}>{data.sector.toUpperCase()}</div>
            )}
            <div style={{ fontSize: 10, color: "#333", fontFamily: "monospace", letterSpacing: 1.5, marginBottom: (isPostSession || isPostSessionBrief) ? 8 : 14 }}>{date}</div>

            {/* Theme pill — scalper keeps GREEN/YELLOW/RED, others show macro theme */}
            <div style={{ marginBottom: isScalper || isPostSession ? 8 : 12 }}>
              {isScalper ? (
                <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 16px", borderRadius: 20, background: bc.bg, border: "1px solid " + bc.border }}>
                  <span style={{ fontSize: 11, fontWeight: 900, color: bc.color, letterSpacing: 1 }}>
                    {bias === "GREEN" ? "CLEAR" : bias === "YELLOW" ? "CAUTION" : bias === "RED" ? "STAND DOWN" : bias}
                  </span>
                </div>
              ) : (
                <div>
                  <div style={{ fontSize: 8, color: "#444", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>MACRO THEME</div>
                  <div style={{ fontSize: 10, color: "#888", lineHeight: 1.4 }}>{truncate(data.macro_theme || data.headline_summary, 90)}</div>
                </div>
              )}
            </div>

            {/* Price move — post-session only */}
            {isPostSession && priceMove && (
              <div style={{ display: "inline-flex", alignItems: "center", gap: 8, padding: "5px 14px", borderRadius: 20, background: priceMove.up ? "rgba(0,212,170,.08)" : "rgba(255,71,87,.08)", border: "1px solid " + (priceMove.up ? "rgba(0,212,170,.25)" : "rgba(255,71,87,.25)"), marginBottom: 8 }}>
                <span style={{ fontSize: 13 }}>{priceMove.up ? "↑" : "↓"}</span>
                <span style={{ fontSize: 15, fontWeight: 900, color: priceMove.up ? "#00d4aa" : "#ff4757", letterSpacing: -0.5 }}>{priceMove.changePct}</span>
                <span style={{ fontSize: 9, color: priceMove.up ? "#00d4aa" : "#ff4757", opacity: 0.7, fontFamily: "monospace" }}>ON THE DAY</span>
              </div>
            )}
            {isPostSession && !priceMove && (
              <div style={{ height: 4 }} />
            )}

            {/* Lines — scalper gets live desk layout, others get standard layout */}
            {isScalper ? (
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {/* Risk reason */}
                <div style={{ fontSize: 10, color: "#666", lineHeight: 1.4, marginBottom: 1 }}>
                  {truncate(data.risk_reason, 80)}
                </div>
                {/* Breaking news */}
                {data.breaking && data.breaking.length > 0 && (
                  <div>
                    <div style={{ fontSize: 7, color: "#ff4757", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>JUST HIT THE WIRE</div>
                    {data.breaking.slice(0, 2).map((b, i) => {
                      const dc = { BULLISH: "#00d4aa", BEARISH: "#ff4757", NEUTRAL: "#ffd700" };
                      const c = dc[b.direction] || "#666";
                      return (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 6, padding: "4px 7px", borderLeft: "2px solid " + c, marginBottom: 3, background: c + "08", borderRadius: "0 4px 4px 0" }}>
                          <span style={{ fontSize: 9, color: "#888", lineHeight: 1.3, flex: 1 }}>{truncate(b.headline, 44)}</span>
                          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", flexShrink: 0 }}>
                            <span style={{ fontSize: 8, fontWeight: 700, color: c }}>{b.direction}</span>
                            {b.age && <span style={{ fontSize: 8, color: "#333" }}>{b.age}</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                {/* Coming up next */}
                {data.imminent && data.imminent.length > 0 && (
                  <div>
                    <div style={{ fontSize: 7, color: "#ffd700", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>COMING UP NEXT</div>
                    {data.imminent.slice(0, 1).map((ev, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 7px", border: "1px solid rgba(255,215,0,.15)", borderRadius: 4, background: "rgba(255,215,0,.04)" }}>
                        <span style={{ fontSize: 9, color: "#888", flex: 1 }}>{truncate(ev.event, 38)}</span>
                        <span style={{ fontSize: 9, color: "#ffd700", fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>in {ev.due_in}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : isPostSession ? (
              // POST-SESSION — fresh AI brief looking backwards at the day
              <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                {data.session_summary && (
                  <div style={{ fontSize: 8, color: "#888", lineHeight: 1.4, fontStyle: "italic", marginBottom: 1, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                    "{firstSentence(data.session_summary)}"
                  </div>
                )}
                {data.primary_driver && (
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 10, flexShrink: 0, marginTop: 1 }}>📌</span>
                    <span style={{ fontSize: 8, color: "#666", lineHeight: 1.4 }}>{firstSentence(data.primary_driver)}</span>
                  </div>
                )}
                {data.what_it_revealed && (
                  <div style={{ display: "flex", gap: 6, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 10, flexShrink: 0, marginTop: 1 }}>🔍</span>
                    <span style={{ fontSize: 8, color: "#666", lineHeight: 1.4 }}>{firstSentence(data.what_it_revealed)}</span>
                  </div>
                )}
                {(data.watch_tomorrow || data.next_event?.title) && (
                  <div style={{ marginTop: 2, padding: "5px 8px", borderRadius: 5, background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.1)" }}>
                    <div style={{ fontSize: 7, color: "#00d4ff", fontFamily: "monospace", letterSpacing: 1, marginBottom: 2, opacity: 0.7 }}>WATCH TOMORROW</div>
                    <div style={{ fontSize: 8, color: "#666", lineHeight: 1.4 }}>{firstSentence(data.watch_tomorrow || data.next_event?.title)}</div>
                    {data.next_event?.time && (
                      <div style={{ fontSize: 7, color: "#444", fontFamily: "monospace", marginTop: 1 }}>{data.next_event.time}</div>
                    )}
                  </div>
                )}
              </div>
            ) : (
              // PRE-SESSION — standard macro context
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {line1 && <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  {lineIcons[0] === "CAL" ? <DynamicCalendar size={15} /> : <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{lineIcons[0]}</span>}
                  <span style={{ fontSize: 11, color: "#666", lineHeight: 1.45 }}>{line1}</span>
                </div>}
                {line2 && <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  {lineIcons[1] === "CAL" ? <DynamicCalendar size={15} /> : <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{lineIcons[1]}</span>}
                  <span style={{ fontSize: 11, color: "#666", lineHeight: 1.45 }}>{line2}</span>
                </div>}
                {line3 && <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                  {lineIcons[2] === "CAL" ? <DynamicCalendar size={15} /> : <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>{lineIcons[2]}</span>}
                  <span style={{ fontSize: 11, color: "#666", lineHeight: 1.45 }}>{line3}</span>
                </div>}
                {data.macro_context && (
                  <div style={{ display: "flex", gap: 9, alignItems: "flex-start" }}>
                    <span style={{ fontSize: 13, flexShrink: 0, marginTop: 1 }}>🔍</span>
                    <span style={{ fontSize: 11, color: "#666", lineHeight: 1.45 }}>{truncate(data.macro_context, 80)}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Footer */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ height: 1, background: "rgba(255,255,255,.05)", marginBottom: 8 }} />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
              <span style={{ fontSize: 9, color: accent, fontFamily: "monospace", opacity: 0.85, lineHeight: 1.4, letterSpacing: 0.2 }}>
                {(isPostSession || isPostSessionBrief)
                  ? "Get tomorrow's brief before the open · marketdebriefs.com"
                  : isEquity
                  ? "Go Pro · marketdebriefs.com"
                  : isScalper
                  ? "Rebrief before every trade · marketdebriefs.com"
                  : "Start free · marketdebriefs.com"}
              </span>
              <span style={{ fontSize: 8, color: "#1a1a1a", fontFamily: "monospace", letterSpacing: 1.2, flexShrink: 0 }}>MACRO INTELLIGENCE</span>
            </div>
          </div>
        </div>

        {/* Pre / Post session toggle */}
        <div style={{ display: "flex", width: "100%", background: "#0d1117", borderRadius: 8, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
          <button onClick={() => setIsPostSession(false)} style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: !isPostSession ? "rgba(0,212,255,.1)" : "transparent", color: !isPostSession ? "#00d4ff" : "#333", borderBottom: !isPostSession ? "2px solid #00d4ff" : "2px solid transparent", transition: "all .15s" }}>
            ☀️ Pre-Session
          </button>
          <button onClick={() => setIsPostSession(true)} style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: isPostSession ? "rgba(0,212,255,.1)" : "transparent", color: isPostSession ? "#00d4ff" : "#333", borderBottom: isPostSession ? "2px solid #00d4ff" : "2px solid transparent", transition: "all .15s" }}>
            🌙 Post-Session
          </button>
        </div>

        {/* Action buttons */}
        <div style={{ display: "flex", gap: 10, width: "100%", marginTop: 4 }}>
          <button onClick={handleShare} disabled={sharing} style={{
            flex: 1, padding: "12px", borderRadius: 8,
            border: "none", cursor: sharing ? "wait" : "pointer",
            background: sharing ? "rgba(0,212,255,.05)" : "linear-gradient(135deg,#00d4ff,#0099cc)",
            color: sharing ? "#333" : "#000",
            fontSize: 13, fontWeight: 800, fontFamily: "inherit",
            display: "flex", alignItems: "center", justifyContent: "center", gap: 7,
          }}>
            {sharing ? "Preparing…" : shared ? "✓ Shared!" : isPostSession ? "↗ Share Post-Session" : "↗ Share Pre-Session"}
          </button>
          <button onClick={onClose} style={{
            padding: "12px 20px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)",
            color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Done</button>
        </div>

        <div style={{ fontSize: 11, color: "#2a2a2a", textAlign: "center" }}>
          Mobile — shares to any app · Desktop — downloads as PNG
        </div>
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
        <div style={{ marginBottom: 10 }}>
          <div style={{ fontSize: 21, fontWeight: 800, color: inst.color, marginBottom: 8 }}>{inst.flag} {inst.label}</div>
          <div style={{ fontSize: 9, color: "#444", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>MACRO THEME</div>
          <div style={{ fontSize: 14, color: "#c8d6e5", lineHeight: 1.6 }}>{data.macro_theme || data.headline_summary}</div>
        </div>
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
  const RL = {
    GREEN:  { label: "CLEAR",       sub: "Macro conditions calm",         color: "#00d4ff", bg: "rgba(0,212,255,.08)",  border: "rgba(0,212,255,.2)"  },
    YELLOW: { label: "CAUTION",     sub: "Something is close — be aware", color: "#f59e0b", bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.2)" },
    RED:    { label: "STAND DOWN",  sub: "Major event imminent — wait",   color: "#ff4757", bg: "rgba(255,71,87,.08)",  border: "rgba(255,71,87,.2)"  },
  };
  const rl = RL[data.risk_level] || RL.YELLOW;
  return (
    <div>
      <div style={{ background: rl.bg, border: "1px solid " + rl.border, borderRadius: 12, padding: "22px 20px", marginBottom: 18, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>{inst.flag} {inst.label} — MACRO RISK CHECK</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: rl.color, marginBottom: 4, letterSpacing: -1 }}>{rl.label}</div>
        <div style={{ fontSize: 10, color: rl.color, opacity: 0.6, fontFamily: "monospace", letterSpacing: 1, marginBottom: 10 }}>{rl.sub}</div>
        <div style={{ height: 1, background: "rgba(255,255,255,.05)", marginBottom: 10 }} />
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{data.risk_reason}</div>
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
  const [scalperStockData, setScalperStockData] = useState(null);
  const [showShareCard, setShowShareCard] = useState(false);
  const [equityShareData, setEquityShareData] = useState(null);
  const [postSessionData, setPostSessionData] = useState(null);
  const [postSessionLoading, setPostSessionLoading] = useState(false);
  const [postSessionError, setPostSessionError] = useState(null);
  const [breakingHeadline, setBreakingHeadline] = useState("");
  const [breakingData, setBreakingData] = useState(null);
  const [breakingLoading, setBreakingLoading] = useState(false);
  const [breakingError, setBreakingError] = useState(null);
  const [scalperStockLoading, setScalperStockLoading] = useState(false);
  const [scalperStockError, setScalperStockError] = useState(null);

  const triggerUpgrade = (reason = "limit") => { setUpgradeReason(reason); setShowUpgrade(true); };

  const run = async (q, m) => {
    if (!canBrief) { triggerUpgrade("limit"); return; }
    const mm = m !== undefined ? m : mode;
    if (mm === "scalper" && !isPro) { triggerUpgrade("scalper"); return; }
    const found = detect(q);

    // ── STOCK INTERCEPT ──────────────────────────────────────────────────────
    // If the query looks like a stock/equity, don't run a macro brief.
    // Route Pro users to the Stocks tab, show upgrade modal for free users.
    if (found && found.key === "equity") {
      if (isPro) {
        // Pre-fill the stock search and switch to Stocks tab
        setStockQuery(q);
        setTab("stocks");
      } else {
        triggerUpgrade("stocks");
      }
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    if (!found) { setError("Instrument not recognised. Try: ES, NQ, Euro, Gold, GBP, Oil, BTC"); return; }
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
    { id: "intel",     label: "Intelligence" },
    { id: "stocks",    label: "Stocks" },
    { id: "breaking",  label: "⚡ Breaking" },
    { id: "journal",   label: "Reflection" },
    { id: "learn",     label: "Learn" }
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
                <button onClick={() => navigate("/help")} style={{ fontSize: 9, fontFamily: "monospace", color: "#222", padding: "3px 7px", border: "1px solid #181818", borderRadius: 4, background: "none", cursor: "pointer" }}>HELP</button>
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
            {!loading && data && inst && (
              <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => { setPostSessionData(null); setShowShareCard(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(0,212,255,.2)", background: "rgba(0,212,255,.06)", color: "#00d4ff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  ☀️ Pre-Session Card
                </button>
                <button
                  onClick={async () => {
                    setPostSessionLoading(true);
                    setPostSessionError(null);
                    try {
                      // Fetch last trading day price move first
                      let priceContext = null;
                      try {
                        const pd = await fetch(`/api/chart-data?instrument=${encodeURIComponent(inst.label)}&days=7`).then(r => r.json());
                        if (pd.candles?.length >= 2) {
                          // Filter to weekdays only (Mon=1 to Fri=5)
                          const weekdayCandles = pd.candles.filter(c => {
                            const d = new Date(c.t * 1000).getDay();
                            return d >= 1 && d <= 5;
                          });
                          if (weekdayCandles.length >= 2) {
                            const last = weekdayCandles[weekdayCandles.length - 1];
                            const prev = weekdayCandles[weekdayCandles.length - 2];
                            const pct = ((last.c - prev.c) / prev.c * 100).toFixed(2);
                            priceContext = {
                              pct: (pct >= 0 ? "+" : "") + pct + "%",
                              direction: pct >= 0 ? "UP" : "DOWN",
                            };
                          }
                        }
                      } catch(e) { /* price fetch optional */ }
                      const result = await getPostSessionBrief(inst, priceContext);
                      // Attach priceMove to result for card display
                      if (priceContext) result._priceContext = priceContext;
                      setPostSessionData(result);
                      setShowShareCard(true);
                    } catch(e) {
                      setPostSessionError("Post-session brief failed. Try again.");
                    }
                    setPostSessionLoading(false);
                  }}
                  disabled={postSessionLoading}
                  style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(255,165,0,.25)", background: "rgba(255,165,0,.06)", color: postSessionLoading ? "#444" : "#ffa500", fontSize: 12, fontWeight: 700, cursor: postSessionLoading ? "wait" : "pointer", fontFamily: "inherit" }}>
                  {postSessionLoading ? "Generating…" : "🌙 Post-Session Card"}
                </button>
              </div>
            )}
            {postSessionError && <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "#ff4757" }}>{postSessionError}</div>}
            {showShareCard && tab !== "breaking" && data && inst && (
              <ShareCard
                inst={inst}
                data={postSessionData || data}
                mode={mode}
                cardType={mode === "scalper" ? "scalper" : "macro"}
                isPostSessionBrief={!!postSessionData}
                onClose={() => { setShowShareCard(false); }}
              />
            )}
            {showShareCard && tab === "breaking" && breakingData && (
              <BreakingShareCard
                data={breakingData}
                onClose={() => setShowShareCard(false)}
              />
            )}
          </div>}
          {tab === "stocks" && (
            // Both Full Brief and Scalper Mode are now supported in the Stocks tab
            false ? null : isPro
                ? <StocksTab
                    query={stockQuery} setQuery={setStockQuery}
                    data={stockData} setData={setStockData}
                    loading={stockLoading} setLoading={setStockLoading}
                    error={stockError} setError={setStockError}
                    mode={mode}
                    scalperData={scalperStockData} setScalperData={setScalperStockData}
                    scalperLoading={scalperStockLoading} setScalperLoading={setScalperStockLoading}
                    scalperError={scalperStockError} setScalperError={setScalperStockError}
                    onShareCard={(d, ct, q) => {
                      setShowShareCard(true);
                      setEquityShareData({ data: d, cardType: ct, query: q });
                    }}
                  />
                : <StockGate onUpgrade={() => triggerUpgrade("stocks")} />
          )}
          {tab === "journal" && <Journal />}
          {tab === "breaking" && (
            <div style={{ paddingBottom: 40 }}>
              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#ff4757", letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>⚡ BREAKING NARRATIVE</div>
                <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>
                  Paste any headline, tweet or breaking news — get an instant macro interpretation across all affected instruments.
                </div>
              </div>

              {/* Input */}
              <div style={{ marginBottom: 14 }}>
                <textarea
                  value={breakingHeadline}
                  onChange={e => setBreakingHeadline(e.target.value)}
                  placeholder={"e.g. Trump announces 25% tariffs on all Chinese goods\n\nor: Fed Chair Powell signals rate cuts delayed until Q4\n\nor: Iran nuclear deal collapsed — US threatens military action"}
                  rows={4}
                  style={{ width: "100%", background: "rgba(255,71,87,.04)", border: "1px solid rgba(255,71,87,.15)", borderRadius: 10, color: "#e0e0e0", fontSize: 13, padding: "12px 14px", outline: "none", fontFamily: "inherit", lineHeight: 1.6, resize: "none" }}
                />
              </div>
              {/* Interpret button */}
              <button
                onClick={async () => {
                  if (!breakingHeadline.trim()) return;
                  setBreakingLoading(true);
                  setBreakingError(null);
                  setBreakingData(null);
                  try {
                    const result = await getBreakingNarrative(breakingHeadline.trim());
                    setBreakingData(result);
                  } catch(e) {
                    setBreakingError("Interpretation failed. Try again.");
                  }
                  setBreakingLoading(false);
                }}
                disabled={breakingLoading || !breakingHeadline.trim()}
                style={{ width: "100%", padding: "13px", borderRadius: 10, border: "none", background: breakingLoading || !breakingHeadline.trim() ? "rgba(255,71,87,.08)" : "linear-gradient(135deg,#ff4757,#cc0011)", color: breakingLoading || !breakingHeadline.trim() ? "#333" : "#fff", fontSize: 14, fontWeight: 800, cursor: breakingLoading || !breakingHeadline.trim() ? "not-allowed" : "pointer", fontFamily: "inherit", letterSpacing: 0.5, marginBottom: 20 }}>
                {breakingLoading ? "Interpreting…" : "⚡ INTERPRET NOW"}
              </button>
              {breakingError && <div style={{ color: "#ff4757", fontSize: 13, marginBottom: 16 }}>{breakingError}</div>}
              {/* Results */}
              {breakingData && (
                <div>
                  {/* Urgency badge + summary */}
                  <div style={{ background: "rgba(255,71,87,.06)", border: "1px solid rgba(255,71,87,.2)", borderRadius: 12, padding: "16px 18px", marginBottom: 16 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                      <div style={{ fontSize: 9, fontWeight: 700, letterSpacing: 1.5, color: breakingData.urgency === "CRITICAL" ? "#ff4757" : breakingData.urgency === "HIGH" ? "#ffa500" : "#ffd700" }}>
                        {breakingData.urgency === "CRITICAL" ? "🔴" : breakingData.urgency === "HIGH" ? "🟠" : "🟡"} {breakingData.urgency}
                      </div>
                      <div style={{ fontSize: 9, color: "#333", fontFamily: "monospace" }}>BREAKING NARRATIVE</div>
                    </div>
                    <div style={{ fontSize: 13, color: "#e0e0e0", lineHeight: 1.65, fontStyle: "italic" }}>
                      "{breakingData.narrative_summary}"
                    </div>
                  </div>
                  {/* Instrument impacts */}
                  {breakingData.instruments && breakingData.instruments.length > 0 && (
                    <div style={{ marginBottom: 16 }}>
                      <div style={{ fontSize: 9, color: "#444", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>INSTRUMENT IMPACT</div>
                      {breakingData.instruments.map((inst, i) => {
                        const c = { BULLISH: "#00d4aa", BEARISH: "#ff4757", NEUTRAL: "#ffd700" }[inst.direction] || "#666";
                        return (
                          <div key={i} style={{ display: "flex", gap: 12, padding: "11px 14px", background: c + "08", border: "1px solid " + c + "22", borderRadius: 8, marginBottom: 8, alignItems: "flex-start" }}>
                            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 3, flexShrink: 0, minWidth: 54 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{inst.name}</div>
                              <div style={{ fontSize: 9, fontWeight: 700, color: c, letterSpacing: 1 }}>{inst.direction}</div>
                            </div>
                            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{inst.impact}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Watch for + fades when */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {breakingData.watch_for && (
                      <div style={{ padding: "12px 14px", background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.1)", borderRadius: 8 }}>
                        <div style={{ fontSize: 8, color: "#00d4ff", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>WATCH FOR</div>
                        <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>{breakingData.watch_for}</div>
                      </div>
                    )}
                    {breakingData.fades_when && (
                      <div style={{ padding: "12px 14px", background: "rgba(255,215,0,.03)", border: "1px solid rgba(255,215,0,.1)", borderRadius: 8 }}>
                        <div style={{ fontSize: 8, color: "#ffd700", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>FADES WHEN</div>
                        <div style={{ fontSize: 11, color: "#666", lineHeight: 1.5 }}>{breakingData.fades_when}</div>
                      </div>
                    )}
                  </div>
                  {/* Share card button */}
                  <button
                    onClick={() => {
                      setPostSessionData(null);
                      setShowShareCard(true);
                    }}
                    style={{ width: "100%", padding: "11px", borderRadius: 8, border: "1px solid rgba(255,71,87,.25)", background: "rgba(255,71,87,.06)", color: "#ff4757", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                    ↗ Share Breaking Narrative Card
                  </button>
                </div>
              )}
              {/* Empty state */}
              {!breakingData && !breakingLoading && (
                <div style={{ textAlign: "center", padding: "40px 20px" }}>
                  <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
                  <div style={{ fontSize: 13, color: "#2a2a2a", lineHeight: 1.7 }}>
                    Paste any market-moving headline<br/>and get an instant macro read
                  </div>
                  <div style={{ marginTop: 16, fontSize: 11, color: "#1a1a1a" }}>
                    Trump tweets · Fed comments · Geopolitical events<br/>Economic surprises · Central bank decisions
                  </div>
                </div>
              )}
            </div>
          )}
          {showShareCard && equityShareData && tab === "stocks" && (
            <ShareCard
              inst={{ label: equityShareData.query, color: "#f59e0b", flag: "STOCK" }}
              data={equityShareData.data}
              mode={mode}
              cardType={equityShareData.cardType}
              onClose={() => { setShowShareCard(false); setEquityShareData(null); }}
            />
          )}
          {tab === "learn" && <Learn />}
        </div>
      </div>
    </>
  );
}
