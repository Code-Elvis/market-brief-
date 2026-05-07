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
      { q: "How do I get started with MarketDebriefs?", a: "Getting started takes under 60 seconds. Sign up for a free 7-day trial  -  no credit card needed. Type any instrument into the search bar  -  ES, Gold, EUR/USD, BTC, Oil  -  and hit BRIEF ME. Your first brief is ready in under 30 seconds. You get full Pro access for 7 days." },
      { q: "What is the recommended workflow before and during trading?", a: "Step 1  -  Type your instrument and run a Full Brief. Read the macro theme, high-impact events and geopolitical risks. Step 2  -  Run Events Brief for a CLEAR / CAUTION / STAND DOWN check  -  see exactly what each scheduled event means for your specific instrument. Step 3  -  Check Breaking Narratives every 15 minutes. If a political alert or macro headline fires that invalidates your setup you see it here first. Step 4  -  For stocks, check the Stocks tab  -  macro sector impacts auto-populate from your brief. Step 5  -  End of day, run a Post-Session Brief on any stock to understand what drove the move. Brief First, Trade After." },
      { q: "What exactly does MarketDebriefs do?", a: "MarketDebriefs is a macro intelligence tool for active traders. Before you enter a trade, type in your instrument and receive an instant AI-powered briefing covering the current central bank stance, live geopolitical risks, upcoming high-impact events (CPI, NFP, Fed decisions), and why they move price. Think of it as having an institutional macro analyst on call  -  in seconds, before every trade." },
      { q: "Which instruments are supported?", a: "25+ instruments across all major asset classes. Equity Indices: ES S&P 500, NQ NASDAQ, RTY Russell 2000, YM Dow Jones, DAX, Nikkei, FTSE, CAC. Metals: Gold, Silver, Copper. Energy: WTI Crude, Brent, Natural Gas. FX: EUR/USD, GBP/USD, USD/JPY, AUD/USD, USD/CAD, USD/CHF, DXY. Crypto: Bitcoin, Ethereum. Rates: 10Y Treasury. Volatility: VIX. You can also type any custom instrument or stock ticker." },
      { q: "How many free briefs do I get?", a: "New users get a full 7-day free trial with complete Pro access  -  unlimited briefs, Events Brief, Breaking Narratives, Stocks, all instruments. No credit card required. After 7 days you can upgrade to Pro (\u20ac49/month) or continue on the free tier with 3 Full Briefs per day." },
      { q: "Can I install MarketDebriefs on my phone?", a: "Yes  -  MarketDebriefs is a Progressive Web App (PWA). iPhone Safari: tap Share → Add to Home Screen. Android Chrome: tap the three-dot menu → Add to Home Screen, or tap the ⊕ GET APP button in the app header. Works like a native app once installed." },
    ]},
    { id: "plans", icon: "💎", title: "Plans & Pricing", color: "rgba(245,158,11,.1)", items: [
      { q: "What is the difference between Free and Pro?", a: "New users start with a 7-day free trial  -  full Pro access, no credit card required. After the trial: Free tier gives 3 Full Briefs per day and the Learn section. Pro (\u20ac49/month) gives unlimited briefs, Events Brief, Breaking Narratives (live macro feed + political alerts), Equity Debriefs, macro sector intelligence in Stocks, and all 25+ instruments." },
      { q: "Can I cancel my Pro subscription anytime?", a: "Yes. No contracts, no cancellation fees. Cancel anytime. Your Pro access continues until the end of the current billing period and you won't be charged again after that." },
      { q: "Is there a refund policy?", a: "If you're not satisfied within the first 7 days of your Pro subscription, contact us for a full refund  -  no questions asked. After 7 days refunds are considered case-by-case. Email support@marketdebriefs.com." },
      { q: "Do you offer promo or discount codes?", a: "Promo codes are occasionally offered through our affiliate partners and creator collaborations. If you have a code, enter it at the Pro checkout screen." },
    ]},
    { id: "features", icon: "⚡", title: "Features", color: "rgba(0,212,170,.1)", items: [
      { q: "What is the Breaking Narratives tab?", a: "Breaking Narratives is two tools in one. First  -  a live macro learning tool. If you see a headline in Discord, on X, or in the news and don't understand how it affects your trade, paste it in and get a clear macro breakdown: which instruments are affected, what the flow is (DEMAND / PRESSURE / VOLATILE), and when the narrative fades. Second  -  an auto-updating wire feed. Real-time financial headlines are pulled and interpreted automatically every 15 minutes during market hours. If something breaks that invalidates your setup  -  a Fed comment, Trump tweet, OPEC announcement, geopolitical escalation  -  you see it here first, with a full macro interpretation and a shareable card. Pro feature." },
      { q: "How do I use Breaking Narratives as a learning tool?", a: "Open the Breaking tab → scroll past the live feed → paste any headline, tweet, or Discord message into the text box and tap INTERPRET NOW. You'll get: a one-sentence macro summary, which instruments are affected and how (using flow labels not directional signals), any conflicting forces (e.g. Dollar strength vs Gold safe haven demand), what to watch for next, and when the narrative is likely to fade. Examples you can try: 'Fed signals higher for longer', 'OPEC+ cuts 1M barrels', 'Trump announces Iran sanctions', 'CPI comes in hotter than expected'." },
      { q: "What is Events Brief?", a: "Events Brief is not just an economic calendar  -  it tells you what each event means for the specific instrument you're trading. Before you enter a position, you get a plain-English explanation of how each scheduled event is likely to impact your market, so you don't just know what's on the calendar, you know why it matters for your trade. You get CLEAR / CAUTION / STAND DOWN in seconds. CLEAR  -  no imminent events, macro conditions calm. CAUTION  -  something is close on the calendar, be aware. STAND DOWN  -  a major event is imminent, stay out of the market until it passes. This is an event calendar awareness tool, not a directional signal. Pro feature." },
      { q: "How do Equity (Stocks) Debriefs work?", a: "Go to the Stocks tab, type any stock name or ticker (Apple, NVDA, TSLA, MSFT, etc.) and get an instant debrief covering earnings context, macro tailwinds and headwinds, upcoming catalyst events, sector rotation signals, and institutional flow direction. Pro feature." },

      { q: "What is Learn to Fish?", a: "A free educational library of macro concepts plus an AI-powered Ask section. Tap any concept to read a plain-English explanation of why markets move. Or type any term you don't understand  -  hawkish, yield curve inversion, risk-off  -  and get an instant explanation written for retail traders. No jargon, no finance degree required." },
      { q: "How current is the data in my briefs?", a: "Each brief is generated fresh on demand focusing on current macro themes, central bank stances, and upcoming scheduled events. For best results run a fresh brief before each trading session. MarketDebriefs is an intelligence tool and does not constitute financial advice." },
    ]},
    { id: "billing", icon: "💳", title: "Billing", color: "rgba(0,212,255,.08)", items: [
      { q: "What payment methods do you accept?", a: "All major credit and debit cards (Visa, Mastercard, Amex) via Stripe. Your card details are never stored on our servers. Pricing is in EUR and Stripe handles currency conversion automatically." },
      { q: "When am I charged?", a: "Your card is collected when you start the 7-day free trial but you are not charged until the trial ends. After 7 days your subscription starts at €49/month and renews monthly. Cancel anytime before day 7 and you will not be charged. A receipt is emailed after each payment." },
      { q: "Can I get a VAT invoice?", a: "Yes. A receipt is automatically emailed after each payment. For a formal VAT invoice email support@marketdebriefs.com with your billing details." },
      { q: "How do I cancel my subscription?", a: "Email support@marketdebriefs.com with the subject 'Cancel subscription' and your account email. We'll process it same day. Your Pro access continues until the end of the current billing period." },
    ]},
    { id: "account", icon: "👤", title: "Account", color: "rgba(255,71,87,.08)", items: [
      { q: "How do I change my email or password?", a: "On the sign-in screen, click 'Forgot password' to reset your password by email. To change your email address, contact support@marketdebriefs.com from your current registered email." },
      { q: "I upgraded to Pro but my account still shows Free  -  what do I do?", a: "Try signing out and back in to refresh your account status. If the issue persists, contact support@marketdebriefs.com with your account email and Stripe payment confirmation and we will activate Pro access manually within the hour." },
      { q: "How do I delete my account?", a: "Email support@marketdebriefs.com with the subject 'Delete my account' from your registered email. We will process the deletion within 5 business days. Any active Pro subscription will be cancelled as part of the process." },
    ]},
    { id: "technical", icon: "🔧", title: "Technical", color: "rgba(255,215,0,.06)", items: [
      { q: "Which browsers and devices are supported?", a: "All modern browsers  -  Chrome, Safari, Firefox, and Edge  -  on desktop and mobile. For the best mobile experience install it as a PWA. Internet Explorer is not supported." },
      { q: "Does MarketDebriefs work offline?", a: "The app shell loads offline but generating briefs requires an internet connection since they are generated live on each request. The Learn to Fish section works fully offline once the app has loaded at least once." },
      { q: "The app feels slow  -  how can I improve performance?", a: "Brief generation typically takes 5 to 15 seconds. If slower: check your internet connection, try installing as a PWA, or clear your browser cache and reload. If consistently slow contact support@marketdebriefs.com with your device and browser details." },
    ]},
  ];
  const filtered = sections.map(s => ({ ...s, items: s.items.filter(item => !search || item.q.toLowerCase().includes(search.toLowerCase()) || item.a.toLowerCase().includes(search.toLowerCase())) })).filter(s => s.items.length > 0);
  const toggle = (id) => setOpenItem(openItem === id ? null : id);
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0e0e0", fontFamily: "Inter, system-ui, sans-serif" }}>
      <style>{`@keyframes helpFade{from{opacity:0;transform:translateY(-5px)}to{opacity:1;transform:translateY(0)}} @keyframes helpPulse{0%,100%{opacity:1}50%{opacity:.3}} .help-ans{animation:helpFade .18s ease} .help-item:hover{border-color:rgba(255,255,255,.1)!important} .help-open{border-color:rgba(0,212,255,.25)!important}`}</style>
      <nav style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"16px 24px", borderBottom:"1px solid rgba(255,255,255,.06)", position:"sticky", top:0, background:"rgba(10,12,15,.96)", backdropFilter:"blur(10px)", zIndex:100 }}>
        <div onClick={() => navigate("/")} style={{ cursor:"pointer", display:"flex", alignItems:"center" }}>
  <svg width="148" height="26" viewBox="0 0 460 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="0,36 16,36 23,14 32,58 40,20 49,52 56,36 70,36" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="70" cy="36" r="3" fill="#00e5ff"/>
    <rect x="78"  y="28" width="8" height="28" rx="2" fill="#00e5ff" opacity="0.28"/>
    <rect x="91"  y="18" width="8" height="38" rx="2" fill="#00e5ff" opacity="0.58"/>
    <rect x="104" y="22" width="8" height="34" rx="2" fill="#00e5ff"/>
    <line x1="78" y1="34" x2="112" y2="34" stroke="#00e5ff" strokeWidth="1" opacity="0.3"/>
    <line x1="130" y1="10" x2="130" y2="62" stroke="#1a2626" strokeWidth="1"/>
    <text x="144" y="30" fontFamily="'Courier New', monospace" fontSize="17" fontWeight="700" fill="#ffffff" letterSpacing="2.5">MARKET</text>
    <text x="144" y="52" fontFamily="'Courier New', monospace" fontSize="17" fontWeight="700" fill="#00e5ff" letterSpacing="2.5">DEBRIEFS</text>
    <text x="145" y="66" fontFamily="'Courier New', monospace" fontSize="7.5" fill="#4d8f8f" letterSpacing="3.5">BRIEF FIRST · TRADE AFTER</text>
  </svg>
</div>
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
        {filtered.length === 0 && <div style={{ textAlign:"center", padding:"48px 0", color:"#444", fontSize:13 }}>No results for "{search}"  -  <button onClick={() => setSearch("")} style={{ background:"none", border:"none", color:"#00d4ff", cursor:"pointer", fontFamily:"inherit", fontSize:13 }}>clear search</button></div>}
        {filtered.map(section => (
          <div key={section.id} style={{ marginBottom:40 }}>
            <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12, paddingBottom:11, borderBottom:"1px solid rgba(255,255,255,.05)" }}>
              <div style={{ width:32, height:32, borderRadius:8, background:section.color, display:"flex", alignItems:"center", justifyContent:"center", fontSize:15, flexShrink:0 }}>{section.icon}</div>
              <div style={{ fontSize:13, fontWeight:700, color:"#fff" }}>{section.title}</div>
              <div style={{ marginLeft:"auto", fontSize:10, fontFamily:"monospace", color:"#555" }}>{section.items.length} articles</div>
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
          <div style={{ marginTop:10, fontSize:11, color:"#555", fontFamily:"monospace" }}>support@marketdebriefs.com · 24-hour response</div>
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

// ── EMAIL CAPTURE COMPONENT ──────────────────────────────────────────────────
function EmailCapture() {
  const [email, setEmail]   = useState("");
  const [status, setStatus] = useState("idle"); // idle | loading | success | error
  const [msg, setMsg]       = useState("");

  const handleSubmit = async () => {
    const trimmed = email.trim().toLowerCase();
    if (!trimmed || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
      setStatus("error"); setMsg("Please enter a valid email address."); return;
    }
    setStatus("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: trimmed }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatus("success");
        setMsg("You're in. First brief arriving tomorrow morning.");
      } else {
        setStatus("error");
        setMsg(data.message || "Something went wrong. Try again.");
      }
    } catch(e) {
      setStatus("error"); setMsg("Network error. Please try again.");
    }
  };

  if (status === "success") {
    return (
      <div style={{ padding: "16px 20px", background: "rgba(0,212,170,.08)", border: "1px solid rgba(0,212,170,.2)", borderRadius: 10, textAlign: "center" }}>
        <div style={{ fontSize: 20, marginBottom: 8 }}>✓</div>
        <div style={{ fontSize: 14, color: "#00d4aa", fontWeight: 700, marginBottom: 4 }}>You're subscribed.</div>
        <div style={{ fontSize: 12, color: "#444" }}>{msg}</div>
      </div>
    );
  }

  const inputStyle = {
    display: "block", width: "100%", padding: "13px 16px",
    borderRadius: 8, border: "1px solid rgba(0,212,255,.2)",
    background: "rgba(0,0,0,.3)", color: "#e0e0e0", fontSize: 14,
    fontFamily: "inherit", outline: "none", boxSizing: "border-box",
    marginBottom: 10,
  };
  const btnStyle = {
    display: "block", width: "100%", padding: "14px 20px",
    borderRadius: 8, border: "none",
    cursor: status === "loading" ? "wait" : "pointer",
    fontSize: 14, fontWeight: 800, fontFamily: "inherit",
    letterSpacing: 0.3,
    background: status === "loading" ? "rgba(0,212,255,.1)" : "linear-gradient(135deg,#00d4ff,#0099cc)",
    color: status === "loading" ? "#333" : "#000",
  };

  return (
    <div style={{ width: "100%", maxWidth: 420, margin: "0 auto", boxSizing: "border-box" }}>
      <input
        type="email"
        value={email}
        onChange={e => { setEmail(e.target.value); setStatus("idle"); setMsg(""); }}
        onKeyDown={e => e.key === "Enter" && handleSubmit()}
        placeholder="your@email.com"
        style={inputStyle}
      />
      <button
        onClick={handleSubmit}
        disabled={status === "loading"}
        style={btnStyle}>
        {status === "loading" ? "Subscribing…" : "Get Daily Macro Briefs Free →"}
      </button>
      {status === "error" && (
        <div style={{ marginTop: 8, fontSize: 12, color: "#ff4757", textAlign: "center" }}>{msg}</div>
      )}
      <div style={{ marginTop: 10, fontSize: 11, color: "#555", textAlign: "center" }}>
        Free forever · No spam · Unsubscribe anytime
      </div>
    </div>
  );
}

function LandingPage({ navigate }) {
  return (
    <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0e0e0", fontFamily: "Inter, system-ui, sans-serif", margin: 0 }}>
      <style>{`* { box-sizing: border-box; margin: 0; padding: 0; } body { background: #0a0c0f; } @keyframes pulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.4; } } @keyframes fadeUp { from { opacity: 0; transform: translateY(20px); } to { opacity: 1; transform: translateY(0); } } .fade-up { animation: fadeUp 0.7s ease forwards; } .cta-btn:hover { opacity: 0.85; transform: translateY(-1px); } .cta-btn { transition: all 0.15s; } .chip:hover { border-color: rgba(0,212,255,.4) !important; color: #00d4ff !important; } .chip { transition: all 0.15s; cursor: default; }`}</style>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 32px", borderBottom: "1px solid rgba(255,255,255,.05)", position: "sticky", top: 0, background: "rgba(10,12,15,.95)", backdropFilter: "blur(10px)", zIndex: 100 }}>
        <div style={{ display:"flex", alignItems:"center" }}>
  <svg width="148" height="26" viewBox="0 0 460 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="0,36 16,36 23,14 32,58 40,20 49,52 56,36 70,36" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="70" cy="36" r="3" fill="#00e5ff"/>
    <rect x="78"  y="28" width="8" height="28" rx="2" fill="#00e5ff" opacity="0.28"/>
    <rect x="91"  y="18" width="8" height="38" rx="2" fill="#00e5ff" opacity="0.58"/>
    <rect x="104" y="22" width="8" height="34" rx="2" fill="#00e5ff"/>
    <line x1="78" y1="34" x2="112" y2="34" stroke="#00e5ff" strokeWidth="1" opacity="0.3"/>
    <line x1="130" y1="10" x2="130" y2="62" stroke="#1a2626" strokeWidth="1"/>
    <text x="144" y="30" fontFamily="'Courier New', monospace" fontSize="17" fontWeight="700" fill="#ffffff" letterSpacing="2.5">MARKET</text>
    <text x="144" y="52" fontFamily="'Courier New', monospace" fontSize="17" fontWeight="700" fill="#00e5ff" letterSpacing="2.5">DEBRIEFS</text>
    <text x="145" y="66" fontFamily="'Courier New', monospace" fontSize="7.5" fill="#4d8f8f" letterSpacing="3.5">BRIEF FIRST · TRADE AFTER</text>
  </svg>
</div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}><button onClick={() => navigate("/help")} style={{ fontSize: 11, fontWeight: 600, color: "#666", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit" }}>HELP</button><button onClick={() => navigate("/app")} className="cta-btn" style={{ background: "rgba(0,212,255,.1)", border: "1px solid rgba(0,212,255,.25)", color: "#00d4ff", padding: "8px 18px", borderRadius: 7, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>LAUNCH APP</button></div>
      </nav>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "80px 32px 60px", textAlign: "center" }} className="fade-up">
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "5px 14px", borderRadius: 20, border: "1px solid rgba(0,212,255,.2)", background: "rgba(0,212,255,.05)", marginBottom: 28 }}>
          <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00d4ff", animation: "pulse 2s infinite" }} />
          <span style={{ fontSize: 11, color: "#00d4ff", fontWeight: 600, letterSpacing: 1 }}>INSTITUTIONAL INTELLIGENCE · INDEPENDENT TRADERS</span>
        </div>
        <h1 style={{ fontSize: "clamp(32px, 6vw, 58px)", fontWeight: 900, lineHeight: 1.1, letterSpacing: "-1.5px", color: "#fff", marginBottom: 20 }}>Know the macro<br /><span style={{ color: "#00d4ff" }}>before you trade.</span></h1>
        <p style={{ fontSize: "clamp(14px, 2vw, 17px)", color: "#555", lineHeight: 1.7, maxWidth: 520, margin: "0 auto 36px" }}>Bloomberg tells you what happened.<br /><span style={{ color: "#888" }}>Market Debriefs tells you what it means.</span></p>
        <div style={{ display: "inline-flex", alignItems: "center", gap: 6, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 20, padding: "4px 14px", marginBottom: 16 }}>
          <span style={{ fontSize: 10, color: "#f59e0b", fontWeight: 800, letterSpacing: 1 }}>7-DAY FREE TRIAL</span>
          <span style={{ fontSize: 10, color: "#555" }}>Stop missing moves while you sleep</span>
        </div>
        <div style={{ marginBottom: 0 }} />
        <button onClick={() => navigate("/app")} className="cta-btn" style={{ background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000", border: "none", padding: "15px 36px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginBottom: 14 }}>START FREE 7-DAY TRIAL →</button>
        <div style={{ fontSize: 12, color: "#555" }}>Used by traders who trade smarter · Cancel anytime</div>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center", padding: "0 32px 60px", maxWidth: 600, margin: "0 auto" }}>
        {["ES S&P 500","NQ NASDAQ","Gold XAU","WTI Oil","EUR/USD","GBP/USD","Bitcoin","VIX","USD/JPY","Russell 2000"].map(t => (
          <span key={t} className="chip" style={{ fontSize: 11, padding: "5px 12px", borderRadius: 5, border: "1px solid rgba(255,255,255,.07)", color: "#333", background: "rgba(255,255,255,.02)" }}>{t}</span>
        ))}
      </div>
      <div style={{ maxWidth: 860, margin: "0 auto", padding: "0 32px 80px", display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 16 }}>
        {[
          { icon: "📋", title: "Full Brief", desc: "Pre-trade macro research. Central bank stance, geopolitical risks, high-impact events and why they move price." },
          { icon: "⚡", title: "Events Brief", desc: "10-second risk check before you enter. GREEN / YELLOW / RED with breaking news and imminent events. Pro feature." },
          { icon: "📈", title: "Stocks Brief", desc: "Earnings context, macro tailwinds & headwinds, sector rotation, and institutional flow for any stock. Pro feature." },

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
          When NFP drops, Bloomberg gives you the number. What you actually need to know is: does this change the Fed's next move  -  and how does that hit the Dollar, Gold, and yields in the <span style={{ color: "#00e5ff", fontWeight: 700 }}>next 4 hours</span>?
        </p>

        {/* Data vs Answers cards  -  stacked on mobile, side by side on desktop */}
        <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 64, maxWidth: 680, margin: "0 auto 64px" }}>
          <div style={{ display: "flex", gap: 12, alignItems: "stretch" }}>

            {/* Data side */}
            <div style={{ flex: 1, padding: "20px 16px", borderRadius: 12, background: "rgba(255,71,87,.04)", border: "1px solid rgba(255,71,87,.15)" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>📊</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#ff4757", marginBottom: 6, letterSpacing: -0.5 }}>Data</div>
              <div style={{ fontSize: 11, color: "#444", marginBottom: 12, lineHeight: 1.5 }}>The number. The release. The headline.</div>
              {[["NFP:", "+180k"], ["CPI:", "+3.2% YoY"], ["Fed Rate:", "5.25 - 5.50%"]].map(([k, v]) => (
                <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#555", padding: "5px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                  <span style={{ color: "#333" }}>{k}</span><span>{v}</span>
                </div>
              ))}
              <div style={{ marginTop: 12, display: "inline-block", padding: "3px 9px", borderRadius: 4, fontSize: 9, fontWeight: 700, letterSpacing: 1, background: "rgba(255,71,87,.1)", color: "#ff4757", border: "1px solid rgba(255,71,87,.2)" }}>RAW. UNINTERPRETED.</div>
            </div>

            {/* Divider */}
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6, padding: "0 8px", flexShrink: 0 }}>
              <div style={{ width: 1, height: 50, background: "linear-gradient(to bottom, rgba(255,71,87,.3), rgba(0,229,255,.3))" }} />
              <div style={{ fontSize: 8, color: "#555", textAlign: "center", lineHeight: 1.5, letterSpacing: 0.3, writingMode: "vertical-rl" }}>gap · traders bleed</div>
              <div style={{ width: 1, height: 50, background: "linear-gradient(to bottom, rgba(255,71,87,.3), rgba(0,229,255,.3))" }} />
            </div>

            {/* Answers side */}
            <div style={{ flex: 1, padding: "20px 16px", borderRadius: 12, background: "rgba(0,229,255,.04)", border: "1px solid rgba(0,229,255,.15)" }}>
              <div style={{ fontSize: 20, marginBottom: 6 }}>⚡</div>
              <div style={{ fontSize: 16, fontWeight: 900, color: "#00e5ff", marginBottom: 6, letterSpacing: -0.5 }}>Answers</div>
              <div style={{ fontSize: 11, color: "#444", marginBottom: 12, lineHeight: 1.5 }}>The interpretation. The implication. The edge.</div>
              {["Fed pivot pushed back  -  Dollar bullish", "Gold faces headwinds next 48hrs", "Yields pricing in higher-for-longer"].map(a => (
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
              ["04", "Decide  -  while the market is already moving"],
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

      {/* ── THE TRADER WORKFLOW ── */}
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "0 32px 80px" }}>
        <div style={{ textAlign: "center", marginBottom: 40 }}>
          <div style={{ fontSize: 11, color: "#333", letterSpacing: 2, fontWeight: 700, marginBottom: 12 }}>THE TRADER WORKFLOW</div>
          <div style={{ fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 900, color: "#fff", letterSpacing: -0.5, lineHeight: 1.2 }}>
            Five steps. Every session.<br/>
            <span style={{ color: "#00d4ff" }}>Brief First, Trade After.</span>
          </div>
        </div>

        {/* Workflow steps */}
        <div style={{ display: "flex", flexDirection: "column", gap: 0 }}>
          {[
            {
              step: "01",
              phase: "PRE-TRADE",
              phaseColor: "#00d4ff",
              icon: "🎯",
              title: "Pick your instrument",
              desc: "Type any market  -  EUR/USD, ES, Gold, Oil, BTC. Whatever you're about to trade.",
              detail: "Full Brief tab",
              detailColor: "#00d4ff",
            },
            {
              step: "02",
              phase: "PRE-TRADE",
              phaseColor: "#00d4ff",
              icon: "📋",
              title: "Read the Full Brief",
              desc: "Get the macro theme, high-impact events, geopolitical risks and what to watch. Understand the forces driving price before you look at a chart.",
              detail: "Intelligence tab",
              detailColor: "#00d4ff",
            },
            {
              step: "03",
              phase: "PRE-TRADE",
              phaseColor: "#00d4ff",
              icon: "⚡",
              title: "Run the Events Brief",
              desc: "Not just what's on the calendar  -  what it means for the instrument you're trading. Get CLEAR / CAUTION / STAND DOWN in seconds with a plain-English explanation of why each event matters for your trade.",
              detail: "Events Brief",
              detailColor: "#f59e0b",
            },
            {
              step: "04",
              phase: "DURING SESSION",
              phaseColor: "#ffd700",
              icon: "📡",
              title: "Monitor Breaking Narratives",
              desc: "Monitor live macro wire stories every 15 minutes. Paste any headline you don't understand for an instant explanation. The Stocks tab automatically shows which sectors and tickers are affected by the current macro theme  -  no manual searching needed.",
              detail: "Breaking tab",
              detailColor: "#ff4757",
            },
            {
              step: "05",
              phase: "DURING SESSION",
              phaseColor: "#ffd700",
              icon: "🔄",
              title: "Rebrief when narratives shift",
              desc: "Markets don't stand still. If a major event fires, run a fresh brief. The new macro context automatically updates the Stocks tab with the latest affected sectors and tickers. Every section stays in sync  -  Intelligence, Events, Breaking Narratives and Stocks all reflect the same macro reality.",
              detail: "Brief First, Trade After.",
              detailColor: "#00d4ff",
            },
          ].map((s, i) => (
            <div key={s.step} style={{ display: "flex", gap: 0, position: "relative" }}>
              {/* Connector line */}
              {i < 4 && <div style={{ position: "absolute", left: 19, top: 52, width: 2, height: "calc(100% - 20px)", background: "linear-gradient(to bottom, rgba(0,212,255,.15), rgba(0,212,255,.05))", zIndex: 0 }} />}

              {/* Step number circle */}
              <div style={{ flexShrink: 0, width: 40, height: 40, borderRadius: "50%", background: "#0a0c0f", border: "1px solid rgba(0,212,255,.2)", display: "flex", alignItems: "center", justifyContent: "center", marginRight: 16, marginTop: 4, zIndex: 1 }}>
                <span style={{ fontSize: 11, fontWeight: 800, color: "#00d4ff", opacity: 0.7 }}>{s.step}</span>
              </div>

              {/* Content */}
              <div style={{ flex: 1, paddingBottom: 28 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 16 }}>{s.icon}</span>
                  <div style={{ fontSize: 9, color: s.phaseColor, fontWeight: 700, letterSpacing: 1.5, opacity: 0.6 }}>{s.phase}</div>
                </div>
                <div style={{ fontSize: 15, fontWeight: 800, color: "#fff", marginBottom: 6, letterSpacing: -0.3 }}>{s.title}</div>
                <div style={{ fontSize: 13, color: "#444", lineHeight: 1.7, marginBottom: 8 }}>{s.desc}</div>
                <div style={{ display: "inline-flex", alignItems: "center", gap: 5, padding: "3px 10px", borderRadius: 20, background: s.detailColor + "10", border: "1px solid " + s.detailColor + "30" }}>
                  <span style={{ fontSize: 10, fontWeight: 700, color: s.detailColor, letterSpacing: 0.5 }}>{s.detail}</span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Bottom CTA */}
        <div style={{ marginTop: 8, padding: "20px 24px", background: "rgba(0,212,255,.03)", border: "1px solid rgba(0,212,255,.08)", borderRadius: 12 }}>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.8, margin: 0, textAlign: "center" }}>
            Most retail traders lose not because of bad entries  -  but because they trade <em style={{ color: "#888" }}>against</em> the macro tide.<br/>
            A hawkish Fed comment, a geopolitical escalation, a surprise CPI print  -  any of these can invalidate a perfect technical setup instantly.<br/>
            <span style={{ color: "#888" }}>MarketDebriefs makes sure you always know which way the macro tide is running.</span>
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
              ["Manually scan news", "30 - 60 min / day"],
              ["Multiple paid services", "$200 - 500 / mo"],
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
              ["Full macro briefing", "7-day free trial"],
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
        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "#555" }}>
          * Bloomberg Terminal pricing based on publicly reported ~$30,000/year subscription cost.
        </div>
      </div>

      <div style={{ maxWidth: 480, margin: "0 auto", padding: "0 32px 80px", textAlign: "center" }}>
        <div style={{ fontSize: 11, color: "#333", letterSpacing: 2, fontWeight: 700, marginBottom: 24 }}>PRICING</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, marginBottom: 32 }}>
          {[
            { name: "Trial", price: "Free · 7 days", features: ["Full Pro access", "All features", "Cancel anytime"], highlight: false, isTrial: true },
            { name: "Pro", price: "€49/mo", features: ["Unlimited briefs", "Events Brief", "Breaking Narratives", "Stocks + Post-Session", "All instruments"], highlight: true },
          ].map(p => (
            <div key={p.name} style={{ background: p.highlight ? "rgba(0,212,255,.06)" : p.isTrial ? "rgba(245,158,11,.06)" : "rgba(255,255,255,.02)", border: `1px solid ${p.highlight ? "rgba(0,212,255,.25)" : p.isTrial ? "rgba(245,158,11,.3)" : "rgba(255,255,255,.06)"}`, borderRadius: 12, padding: 20, textAlign: "left", position: "relative" }}>
              {p.isTrial && <div style={{ position: "absolute", top: -10, left: "50%", transform: "translateX(-50%)", background: "#f59e0b", color: "#000", fontSize: 9, fontWeight: 800, padding: "2px 10px", borderRadius: 10, letterSpacing: 1, whiteSpace: "nowrap" }}>START HERE</div>}
              <div style={{ fontSize: 12, fontWeight: 700, color: p.highlight ? "#00d4ff" : p.isTrial ? "#f59e0b" : "#555", marginBottom: 6 }}>{p.name}</div>
              <div style={{ fontSize: 22, fontWeight: 900, color: "#fff", marginBottom: 14 }}>{p.price}</div>
              {p.features.map(f => (
                <div key={f} style={{ fontSize: 12, color: "#555", marginBottom: 5, display: "flex", gap: 7 }}>
                  <span style={{ color: p.highlight ? "#00d4ff" : p.isTrial ? "#f59e0b" : "#333" }}>✓</span>{f}
                </div>
              ))}
            </div>
          ))}
        </div>
        <button onClick={() => navigate("/app")} className="cta-btn" style={{ width: "100%", background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000", border: "none", padding: "14px", borderRadius: 10, fontSize: 14, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>START FREE 7-DAY TRIAL →</button>
      </div>

      {/* ── EMAIL CAPTURE ── */}
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 80px" }}>
        <div style={{ background: "rgba(0,212,255,.03)", border: "1px solid rgba(0,212,255,.08)", borderRadius: 16, padding: "40px 32px", textAlign: "center", position: "relative", overflow: "hidden" }}>
          {/* Background glow */}
          <div style={{ position: "absolute", top: -60, left: "50%", transform: "translateX(-50%)", width: 400, height: 200, background: "radial-gradient(ellipse, rgba(0,212,255,.05) 0%, transparent 70%)", pointerEvents: "none" }} />

          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: 2, fontWeight: 700, marginBottom: 14, opacity: 0.7 }}>FREE DAILY MACRO BRIEF</div>
            <div style={{ fontSize: "clamp(20px, 3.5vw, 28px)", fontWeight: 900, color: "#fff", letterSpacing: -0.5, lineHeight: 1.25, marginBottom: 10 }}>
              Get the macro context<br />
              <span style={{ color: "#00d4ff" }}>delivered to your inbox.</span>
            </div>
            <p style={{ fontSize: 13, color: "#444", lineHeight: 1.75, maxWidth: 420, margin: "0 auto 24px" }}>
              Daily macro brief before markets open. What's moving, what to watch, and why it matters for your trades. Free. No spam. Unsubscribe anytime.
            </p>

            {/* Email form */}
            <EmailCapture />
          </div>
        </div>
      </div>

      {/* ── FINAL CTA ── */}
      <div style={{ maxWidth: 600, margin: "0 auto", padding: "0 32px 100px", textAlign: "center" }}>
        <div style={{ padding: "48px 32px", background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.1)", borderRadius: 16 }}>
          <div style={{ fontSize: "clamp(22px, 4vw, 34px)", fontWeight: 900, color: "#fff", lineHeight: 1.2, marginBottom: 16, letterSpacing: "-0.5px" }}>
            Stop trading blind.<br /><span style={{ color: "#00d4ff" }}>Know the macro.</span>
          </div>
          <p style={{ fontSize: 13, color: "#555", lineHeight: 1.75, marginBottom: 28, maxWidth: 420, margin: "0 auto 28px" }}>
            Every major move in markets is driven by macro forces  -  central bank policy, geopolitical risk,
            inflation data, liquidity cycles. Trading without this context is like sailing without knowing the weather.
            The institutions know. Now you can too.
          </p>
          <button onClick={() => navigate("/app")} className="cta-btn" style={{ background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000", border: "none", padding: "15px 40px", borderRadius: 10, fontSize: 15, fontWeight: 800, cursor: "pointer", fontFamily: "inherit" }}>START FREE 7-DAY TRIAL →</button>
          <div style={{ marginTop: 14, fontSize: 11, color: "#555" }}>Join traders who brief first and trade after · Cancel anytime</div>
        </div>
      </div>

      <div style={{ borderTop: "1px solid rgba(255,255,255,.04)", padding: "24px 32px", textAlign: "center", color: "#555", fontSize: 11 }}>
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
  ftse:   { label: "FTSE 100",          aliases: ["ftse","ftse100","ftse 100","uk index","uk100"], color: "#60a5fa", flag: "UK",  optionsTicker: null },
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
  nzd:    { label: "NZD/USD",           aliases: ["nzd","nzdusd","6n","nzd/usd","kiwi","new zealand dollar","newzealand"], color: "#4ade80", flag: "NZD", optionsTicker: null },
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

// Known stock/equity keywords  -  anything matching these routes to the Stocks tab
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
  // Pure alphabetic query 2-5 chars that isn't a known instrument alias  -  likely a ticker
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
    // For short aliases (1-2 chars), only match if they are the ENTIRE query  -  no substring matching
    if (val.aliases.some(a => a.length <= 2 ? a === q : (q.includes(a) || a.includes(q)))) return { key, ...val };
  }
  // Flag as equity so the run() function can redirect instead of running a broken brief
  if (isLikelyStock(q)) return { key: "equity", label: query.trim(), aliases: [], color: "#f59e0b", flag: "STOCK", optionsTicker: null };
  return null;
}

function sysPrompt(mode) {
  const base = "You are a professional market intelligence analyst. Respond ONLY with valid JSON. No markdown. No preamble. Start with { and end with }.\n" + "CRITICAL RULES  -  NEVER BREAK THESE:\n" + "1. NEVER mention specific price levels, support/resistance numbers, targets, stops, or historical price ranges.\n" + "2. EVENTS must be STRICTLY UPCOMING  -  scheduled in the future from the current time. NEVER include events that have already occurred or already been released today. If an event has already happened, exclude it entirely.\n" + "3. For events, only include the 2-3 most market-moving SCHEDULED releases coming up in the next 48 hours that directly affect this instrument. Include the exact scheduled time.\n" + "4. Your job is macro context and forward-looking event risk  -  not technical analysis, not past events.";
  if (mode === "scalper") return base + ' SCALPER MODE schema: {"instrument":"string","risk_level":"GREEN|YELLOW|RED","risk_reason":"string","scalper_note":"string","breaking":[{"headline":"string","direction":"BULLISH|BEARISH|NEUTRAL","age":"string"}],"imminent":[{"event":"string","time_est":"string","due_in":"string","passed":false,"expected_impact":"string"}]}. CRITICAL RULES: (1) Only include events from the REAL CALENDAR DATA provided in the prompt  -  do not add events from memory. (2) Copy time_est and due_in exactly from the calendar data provided. (3) passed = true if event time has already passed. (4) expected_impact = ONE sentence explaining what this event means specifically for THIS instrument  -  the macro mechanism, not a generic description. (5) risk_level based on next UPCOMING event time: GREEN=nothing in 2hrs (CLEAR), YELLOW=something in 2hrs (CAUTION), RED=something in 30min (STAND DOWN). NOT a directional signal.';
  return base + ' FULL BRIEF schema: {"instrument":"string","macro_theme":"string","headline_summary":"string","events":[{"title":"string","time":"string","impact":"HIGH|MEDIUM","direction":"BULLISH|BEARISH|NEUTRAL","summary":"string","why_it_moves_price":"string","confidence":"HIGH|MEDIUM|LOW"}],"geopolitical_risks":"string","macro_context":"string","teaching_moment":"string"}. STRICT FIELD RULES  -  each field serves a DIFFERENT purpose, never repeat content across fields: macro_theme = 4-7 word neutral phrase ONLY e.g. "Central bank divergence vs safe haven demand". headline_summary = ONE sentence describing the SINGLE most important macro force acting on this instrument RIGHT NOW. macro_context = ONE sentence about what SPECIFIC EVENT OR DATA to watch for NEXT  -  must be forward-looking and completely different from headline_summary, e.g. "Watch Wednesday FOMC minutes for rate path signals." geopolitical_risks = only populate if an active geopolitical event is directly relevant, otherwise use empty string "". IF macro_context would repeat headline_summary, write something genuinely different or use "".';
}

function userPrompt(inst, mode, calendarEvents = []) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const nowEST = new Date().toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  if (mode === "scalper") {
    // Build calendar context from real API data if available
    let calendarContext = "";
    if (calendarEvents && calendarEvents.length > 0) {
      const eventLines = calendarEvents.map(ev =>
        `- ${ev.event} at ${ev.time_est} EST (${ev.due_in}${ev.passed ? "  -  already released" : ""})${ev.estimate ? ", estimate: " + ev.estimate : ""}${ev.prev ? ", prev: " + ev.prev : ""}`
      ).join("\n");
      calendarContext = `\n\nREAL ECONOMIC CALENDAR FOR TODAY (from live data  -  use these exact times):\n${eventLines}`;
    } else {
      calendarContext = "\n\n(No live calendar data available  -  use your knowledge of today\'s scheduled releases but clearly note uncertainty)";
    }
    return "EXACT CURRENT TIME IN EST: " + nowEST + ". I am about to trade " + inst.label + "." + calendarContext + "\n\nYour task: (1) Determine risk level for trading " + inst.label + " right now. (2) For EVERY event listed above, write expected_impact: ONE sentence explaining the macro mechanism  -  specifically how this event affects " + inst.label + " e.g. for Gold: \'Strong ISM Services PMI reinforces Fed hawkishness reducing gold appeal as a non-yielding safe haven asset.\' (3) Copy time_est and due_in EXACTLY from the calendar data. (4) Risk: GREEN=nothing in 2hrs, YELLOW=something in 2hrs, RED=something in 30min. NEVER leave expected_impact empty  -  it is the core value of this feature.";
  }
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

async function getBriefing(inst, mode, calendarEvents = []) { return callClaude(sysPrompt(mode), userPrompt(inst, mode, calendarEvents)); }

async function getSectorImpact(macroContext) {
  const now = new Date().toLocaleString("en-GB", { weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit", timeZone:"America/New_York" });
  const sys = "You are a macro market analyst identifying which stock sectors are affected by current macro themes.\n" + "Respond ONLY with valid JSON. No markdown. No preamble. Start with { and end with }.\n" + "RULES:\n" + "1. Only include sectors DIRECTLY affected by the macro context  -  max 4 sectors.\n" + "2. flow: DEMAND (sector benefits), PRESSURE (sector faces headwinds), VOLATILE (mixed), WATCH (monitor).\n" + "3. reason: ONE sentence  -  the specific macro mechanism affecting this sector.\n" + "4. tickers: 4-5 most relevant US-listed tickers for this sector in this context.\n" + "SCHEMA: {\"sectors\":[{\"name\":\"string\",\"flow\":\"DEMAND|PRESSURE|VOLATILE|WATCH\",\"reason\":\"string\",\"tickers\":[\"string\"]}]}";
  const msg = `Current time: ${now}. Macro context: "${macroContext.macro_theme}". ${macroContext.geopolitical ? "Geopolitical: " + macroContext.geopolitical + "." : ""} ${macroContext.headline ? "Current driver: " + macroContext.headline : ""} Which stock sectors are directly affected? For each sector, list 4-5 relevant US tickers.`;
  return callClaude(sys, msg);
}

async function getEquityBrief(label) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const sys = "You are a professional equity analyst. Respond ONLY with valid JSON. No markdown. No preamble. Start with { and end with }." +
    " RULES: Never mention specific price levels. Focus on macro, fundamental, and sector context only." +
    " EQUITY BRIEF schema: {\"instrument\":\"string\",\"ticker\":\"string\",\"sector\":\"string\",\"sentiment\":\"bullish|bearish|neutral|mixed\",\"headline_summary\":\"string\",\"earnings_context\":\"string\",\"macro_tailwinds\":\"string\",\"macro_headwinds\":\"string\",\"sector_rotation\":\"string\",\"catalyst_events\":[{\"title\":\"string\",\"time\":\"string\",\"impact\":\"HIGH|MEDIUM\",\"direction\":\"BULLISH|BEARISH|NEUTRAL\",\"summary\":\"string\",\"why_it_moves_price\":\"string\"}],\"institutional_flow\":\"string\",\"teaching_moment\":\"string\"}." +
    " IMPORTANT: why_it_moves_price is MANDATORY - never empty. ONE sentence explaining the macro mechanism. No price levels.";
  const msg = "Today: " + now + ". Equity debrief for " + label + ". Cover: latest earnings context, current macro tailwinds and headwinds for this stock and its sector, upcoming catalyst events, sector rotation dynamics, and institutional flow signals. No price levels.";
  return callClaude(sys, msg);
}

async function getEquityPostSession(ticker) {
  const now = new Date().toLocaleString("en-GB", { weekday:"long", year:"numeric", month:"long", day:"numeric", hour:"2-digit", minute:"2-digit", timeZone:"America/New_York" });
  const sys = "You are a professional equity macro analyst writing an end-of-day debrief for a stock." +
    " Respond ONLY with valid JSON. No markdown. Start with { and end with }." +
    " RULES: 1. Look BACKWARDS at the most recent completed trading session." +
    " 2. Explain what actually moved the stock today - earnings, macro, sector rotation, Fed news." +
    " 3. NEVER mention specific price levels, targets or stops." +
    " 4. session_summary: ONE sentence about what happened today. Under 120 chars." +
    " 5. primary_driver: the main catalyst - earnings, macro, sector move, news event." +
    " 6. macro_connection: how this move connects to the broader macro environment." +
    " 7. what_it_signals: what does this move tell us about the stock/sector going forward." +
    " 8. watch_next: ONE specific upcoming catalyst - earnings date, macro event, sector data." +
    " SCHEMA: {\"ticker\":\"string\",\"sector\":\"string\",\"session_summary\":\"string\",\"primary_driver\":\"string\",\"macro_connection\":\"string\",\"what_it_signals\":\"string\",\"watch_next\":\"string\",\"next_event\":{\"title\":\"string\",\"time\":\"string\"}}";
  const msg = "Current time: " + now + " EST. Post-session debrief for " + ticker + ". What drove this stock today? Explain the macro mechanism behind the move - earnings beat/miss, sector rotation, Fed impact, geopolitical, institutional flow. What does it signal going forward? No price levels.";
  return callClaude(sys, msg);
}

async function getEquityScalper(label) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const sys = "You are a professional equity risk assistant for traders. Respond ONLY with valid JSON. No markdown. Start with { and end with }." +
    " RULES: Never mention specific price levels. Focus only on CURRENT and IMMINENT risks for this specific stock." +
    " EQUITY SCALPER schema: {\"ticker\":\"string\",\"risk_level\":\"GREEN|YELLOW|RED\",\"risk_reason\":\"string\",\"scalper_note\":\"string\",\"earnings_proximity\":\"SAFE|NEAR|IMMINENT\",\"breaking\":[{\"headline\":\"string\",\"direction\":\"BULLISH|BEARISH|NEUTRAL\",\"age\":\"string\"}],\"imminent\":[{\"event\":\"string\",\"due_in\":\"string\",\"expected_impact\":\"string\"}]}";
  const msg = "Time: " + now + ". I am about to trade " + label + ". Give me a GREEN / YELLOW / RED equity scalper check. Flag: earnings proximity, any breaking company-specific news, analyst events, sector pressure, or macro events that directly affect this stock right now. No price levels.";
  return callClaude(sys, msg);
}

async function getPostSessionBrief(inst, priceContext) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const priceNote = priceContext
    ? "IMPORTANT: The actual last trading session move was " + priceContext.direction + " " + priceContext.pct + ". Your narrative MUST be consistent with this."
    : "";
  const sys = "You are a professional market intelligence analyst writing an end-of-day session debrief. Respond ONLY with valid JSON. No markdown. No preamble. Start with { and end with }." +
    " CRITICAL RULES: 1. Look BACKWARDS at the most recent completed TRADING SESSION (Mon-Fri only)." +
    " 2. NEVER mention specific price levels, targets, stops or support/resistance." +
    " 3. Be specific about WHICH macro events fired in the last session and how markets reacted." +
    " 4. watch_tomorrow = ONE specific upcoming event or theme for the next session." +
    " 5. session_summary = ONE short sentence max. Under 120 chars." +
    " 6. primary_driver and what_it_revealed = ONE sentence each, under 100 chars." +
    " 7. " + priceNote +
    " POST-SESSION schema: {\"instrument\":\"string\",\"session_summary\":\"string\",\"primary_driver\":\"string\",\"secondary_driver\":\"string\",\"what_it_revealed\":\"string\",\"watch_tomorrow\":\"string\",\"next_event\":{\"title\":\"string\",\"time\":\"string\"}}";
  const msg = "Current time: " + now + ". Write a post-session debrief for the most recent TRADING DAY (Mon-Fri) for " + inst.label + ". " + priceNote + " Cover: (1) how the last trading session played out in one sentence, (2) the primary macro driver, (3) any secondary factor, (4) what it revealed about the macro picture, (5) what to watch in the next trading session, (6) the next scheduled high-impact event. No price levels.";
  return callClaude(sys, msg);
}

async function getBreakingNarrative(headline) {
  const now = new Date().toLocaleString("en-GB", { weekday: "long", year: "numeric", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const sys = "You are a professional macro market interpreter. A breaking news headline has just hit. Your job is to explain what it means for markets - no fluff, no directional signals, just clear macro cause-and-effect. Respond ONLY with valid JSON. No markdown. No preamble. Start with { and end with }." +
    " RULES: 1. NEVER mention specific price levels, targets or stops." +
    " 2. NEVER label instruments as BULLISH or BEARISH - instead describe the MECHANISM: what force is acting on this instrument and why." +
    " 3. CRITICAL: Always check for cross-instrument tensions. For example if Dollar strengthens, that typically creates headwinds for Gold." +
    " 4. narrative_summary must be 1-2 punchy sentences - the macro cause-and-effect a trader needs in 10 seconds." +
    " 5. Each instrument impact must be ONE sentence describing what macro force is acting on it and why." +
    " 6. urgency: CRITICAL (market moving now), HIGH (significant impact expected), MEDIUM (watch closely)." +
    " BREAKING NARRATIVE schema: {\"headline\":\"string\",\"narrative_summary\":\"string\",\"urgency\":\"CRITICAL|HIGH|MEDIUM\",\"instruments\":[{\"name\":\"string\",\"flow\":\"DEMAND|PRESSURE|VOLATILE|WATCH\",\"impact\":\"string\"}],\"tensions\":\"string\",\"watch_for\":\"string\",\"fades_when\":\"string\"}." +
    " tensions field: if any instruments have conflicting forces describe the conflict here in one sentence. Leave empty string if no conflicts.";
  const msg = "Current time: " + now + ". Breaking headline: \"" + headline + "\". Interpret this for macro traders. For each affected instrument explain the MACRO MECHANISM - what force is acting on it and why. Check for cross-instrument conflicts. Never use bullish/bearish labels - describe the flow instead.";
  return callClaude(sys, msg);
}

async function getEventSessionSummary(inst, releasedEvents) {
  const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  const eventList = releasedEvents.map(ev =>
    ev.event + (ev.estimate ? " (Est: " + ev.estimate + ")" : "") + (ev.prev ? " (Prev: " + ev.prev + ")" : "")
  ).join(", ");
  const sys = "You are a professional macro market analyst. Write a concise mid/end-of-session summary of what high-impact events fired today and what they meant for a specific instrument. Respond ONLY with valid JSON. No markdown. Start with { and end with }." +
    " RULES: Never mention specific price levels. Be direct about macro mechanisms." +
    " SCHEMA: {\"session_headline\":\"string\",\"events_summary\":[{\"event\":\"string\",\"verdict\":\"HAWKISH|DOVISH|BULLISH|BEARISH|NEUTRAL\",\"impact\":\"string\"}],\"net_bias\":\"string\",\"watch_next\":\"string\"}." +
    " session_headline: ONE sentence describing the overall macro tone of the session based on releases." +
    " events_summary: each released event and what it meant for this instrument." +
    " net_bias: overall net effect of today's releases on this instrument in ONE sentence." +
    " watch_next: the next key event or theme to watch.";
  const msg = "Current time: " + now + " EST. Instrument: " + inst.label + ". High-impact events released today: " + (eventList || "none specifically flagged") + ". Summarise what these releases meant for " + inst.label + " during today's session. What was the net macro tone? What should the trader watch next?";
  return callClaude(sys, msg);
}

async function getPostReleaseRead(ev, instLabel) {
  const now = new Date().toLocaleString("en-US", { timeZone: "America/New_York", weekday: "long", month: "long", day: "numeric", hour: "2-digit", minute: "2-digit", hour12: true });
  const sys = "You are a professional macro market analyst. An economic event or data release has just occurred. Your job is to explain what the actual result means for traders right now  -  not what was expected, but what it signals for the current session. Respond ONLY with valid JSON. No markdown. Start with { and end with }." +
    " RULES: 1. NEVER mention specific price levels. 2. Be direct about the macro mechanism  -  what does this result actually mean for this instrument RIGHT NOW. 3. verdict: one word  -  HAWKISH, DOVISH, BULLISH, BEARISH, or NEUTRAL  -  whichever best describes the impact on the instrument. 4. session_impact: ONE sentence  -  what this means for the rest of the current trading session. 5. watch_now: what to watch for in the next 1-2 hours as a direct result." +
    " SCHEMA: {\"event\":\"string\",\"verdict\":\"HAWKISH|DOVISH|BULLISH|BEARISH|NEUTRAL\",\"headline\":\"string\",\"session_impact\":\"string\",\"watch_now\":\"string\",\"fades_when\":\"string\"}";
  const contextLine = (ev.estimate || ev.prev)
    ? " Estimate was: " + (ev.estimate || "n/a") + ". Previous reading: " + (ev.prev || "n/a") + "."
    : "";
  const msg = "Current time: " + now + " EST. Event just released: " + ev.event + "." + contextLine + " Instrument I am trading: " + instLabel + ". IMPORTANT: If estimate and previous are provided, use them to determine the direction of the surprise (higher or lower than expected) and make your verdict and explanation specific to that. For example if PPI came in higher than the estimate, it is HAWKISH for the Dollar. If it came in lower, it is DOVISH. Base your verdict on the actual numbers, not just the event name. Explain what this specific result means for " + instLabel + " right now. What is the macro mechanism? What should the trader watch for now?";
  return callClaude(sys, msg);
}

const DC = { BULLISH: "#00d4aa", BEARISH: "#ff4757", NEUTRAL: "#ffd700" };
const DB = { BULLISH: "rgba(0,212,170,.08)", BEARISH: "rgba(255,71,87,.08)", NEUTRAL: "rgba(255,215,0,.06)" };

// ── UPGRADE MODAL ─────────────────────────────────────────────────────────────
function UpgradeModal({ reason, onClose, userId, email, isOnTrial, trialExpired }) {
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
          {trialExpired ? "Your Trial Has Ended" : isOnTrial ? "Lock In Pro Access" : reason === "limit" ? "Daily Limit Reached" : reason === "stocks" ? "Equity Debriefs  -  Pro" : "Pro Feature"}
        </div>
        <div style={{ fontSize: 13, color: "#666", lineHeight: 1.7, marginBottom: 24 }}>
          {trialExpired
            ? "Everything you used over the last 7 days  -  Events Brief, Breaking Narratives, unlimited briefs  -  is still available. Upgrade to keep it."
            : isOnTrial
            ? "You are on a free trial with full Pro access. Upgrade now to ensure uninterrupted access after your trial ends."
            : reason === "limit"
            ? "You have used your 3 briefs for today. Upgrade to Pro for unlimited briefs, all instruments, Events Brief, and Breaking Narratives."
            : reason === "stocks"
            ? "Stock debriefs are a Pro feature. Get earnings context, macro tailwinds and headwinds, sector rotation, and institutional flow for any stock  -  instantly."
            : "Events Brief and Equity Debriefs are Pro features."}
        </div>
        <div style={{ background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.12)", borderRadius: 10, padding: 16, marginBottom: 24, textAlign: "left" }}>
          {["Unlimited briefs every day", "Events Brief  -  what events mean for your trade", "Equity Debriefs  -  any stock", "All instruments covered"].map((f, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "center", marginBottom: i < 3 ? 10 : 0 }}>
              <span style={{ color: "#00d4ff", fontSize: 14 }}>✓</span>
              <span style={{ fontSize: 13, color: "#c0d0e0" }}>{f}</span>
            </div>
          ))}
        </div>
        <button onClick={checkout} disabled={loading} style={{ width: "100%", padding: "14px 20px", borderRadius: 10, border: "none", cursor: loading ? "wait" : "pointer", background: "linear-gradient(135deg,#00d4ff,#0099cc)", color: "#000", fontSize: 15, fontWeight: 800, fontFamily: "inherit", marginBottom: 12 }}>
          {loading ? "Redirecting…" : isOnTrial ? "Continue with Pro  -  €49/mo" : trialExpired ? "Reactivate Pro  -  €49/mo" : "Start 7-Day Free Trial  -  €49/mo after"}
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
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center" }}>
  <svg width="148" height="26" viewBox="0 0 460 72" fill="none" xmlns="http://www.w3.org/2000/svg">
    <polyline points="0,36 16,36 23,14 32,58 40,20 49,52 56,36 70,36" stroke="#00e5ff" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" fill="none"/>
    <circle cx="70" cy="36" r="3" fill="#00e5ff"/>
    <rect x="78"  y="28" width="8" height="28" rx="2" fill="#00e5ff" opacity="0.28"/>
    <rect x="91"  y="18" width="8" height="38" rx="2" fill="#00e5ff" opacity="0.58"/>
    <rect x="104" y="22" width="8" height="34" rx="2" fill="#00e5ff"/>
    <line x1="78" y1="34" x2="112" y2="34" stroke="#00e5ff" strokeWidth="1" opacity="0.3"/>
    <line x1="130" y1="10" x2="130" y2="62" stroke="#1a2626" strokeWidth="1"/>
    <text x="144" y="30" fontFamily="'Courier New', monospace" fontSize="17" fontWeight="700" fill="#ffffff" letterSpacing="2.5">MARKET</text>
    <text x="144" y="52" fontFamily="'Courier New', monospace" fontSize="17" fontWeight="700" fill="#00e5ff" letterSpacing="2.5">DEBRIEFS</text>
    <text x="145" y="66" fontFamily="'Courier New', monospace" fontSize="7.5" fill="#4d8f8f" letterSpacing="3.5">BRIEF FIRST · TRADE AFTER</text>
  </svg>
</div>
        <div style={{ fontSize: 12, color: "#444", marginTop: 4 }}>Know the macro before you trade</div>
      </div>

      {/* Tab toggle  -  prominent, above the form */}
      <div style={{ display: "flex", width: "100%", maxWidth: 400, marginBottom: 0, background: "#0d1117", borderRadius: "10px 10px 0 0", border: "1px solid rgba(255,255,255,.07)", borderBottom: "none", overflow: "hidden" }}>
        <button
          onClick={() => setView("sign-up")}
          style={{ flex: 1, padding: "13px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 700,
            background: view === "sign-up" ? "rgba(0,212,255,.1)" : "transparent",
            color: view === "sign-up" ? "#00d4ff" : "#333",
            borderBottom: view === "sign-up" ? "2px solid #00d4ff" : "2px solid transparent",
            transition: "all .15s"
          }}>
          Start free trial
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
          ? <SignUp forceRedirectUrl="/app" appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" }, elements: { card: { borderRadius: "0 0 10px 10px", borderTop: "none" }, footer: { display: "none" }, footerAction: { display: "none" }, footerActionLink: { display: "none" }, footerPages: { display: "none" } } }} />
          : <SignIn forceRedirectUrl="/app" appearance={{ variables: { colorBackground: "#0d1117", colorText: "#e0e0e0", colorPrimary: "#00d4ff", colorInputBackground: "#161b22", colorInputText: "#e0e0e0" }, elements: { card: { borderRadius: "0 0 10px 10px", borderTop: "none" }, footer: { display: "none" }, footerAction: { display: "none" }, footerActionLink: { display: "none" }, footerPages: { display: "none" } } }} />
        }
      </div>

      {/* Manual toggle fallback - in case Clerk's internal links don't work */}
      <div style={{ marginTop: 12, fontSize: 12, color: "#444", textAlign: "center" }}>
        {view === "sign-up"
          ? <>Already have an account?{" "}<button onClick={() => setView("sign-in")} style={{ background: "none", border: "none", color: "#00d4ff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, padding: 0, textDecoration: "underline" }}>Sign in</button></>
          : <>Don't have an account?{" "}<button onClick={() => setView("sign-up")} style={{ background: "none", border: "none", color: "#00d4ff", cursor: "pointer", fontFamily: "inherit", fontSize: 12, padding: 0, textDecoration: "underline" }}>Sign up free</button></>
        }
      </div>
      {/* Free tier reminder */}
      <div style={{ marginTop: 10, fontSize: 11, color: "#555", textAlign: "center", fontFamily: "monospace", letterSpacing: 0.5 }}>
        7-day free trial · Cancel anytime
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
      <div style={{ marginTop: 8, display: "flex", justifyContent: "flex-end" }}>
        <span style={{ fontSize: 10, fontWeight: 700, letterSpacing: 0.5, color: open ? "#555" : "#ffd700", background: open ? "transparent" : "rgba(255,215,0,.08)", border: open ? "none" : "1px solid rgba(255,215,0,.2)", borderRadius: 4, padding: open ? 0 : "2px 8px" }}>
          {open ? "▲ Close" : "▼ Why does this move price?"}
        </span>
      </div>
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
        Search any stock or ticker and get a full macro debrief  - 
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
        UPGRADE TO PRO  -  €49/mo
      </button>
      <div style={{ marginTop: 10, fontSize: 11, color: "#555" }}>Includes Scalper Mode & all instruments</div>
    </div>
  );
}

// ── BREAKING NARRATIVE GATE (Pro) ───────────────────────────────────────────
function BreakingGate({ onUpgrade }) {
  return (
    <div style={{ padding: "40px 20px 20px" }}>

      {/* Hero */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
        <div style={{ fontSize: 32, marginBottom: 12 }}>⚡</div>
        <div style={{ fontSize: 17, fontWeight: 900, color: "#fff", marginBottom: 10, letterSpacing: -0.5 }}>Breaking Narratives</div>
        <div style={{ fontSize: 13, color: "#555", lineHeight: 1.75, maxWidth: 340, margin: "0 auto" }}>
          See a headline in Discord or on Twitter and have no idea how it affects your trade?
          <span style={{ color: "#e0e0e0" }}> Paste it in. Get the full macro explanation instantly.</span>
        </div>
      </div>

      {/* Two use cases */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 24, maxWidth: 360, margin: "0 auto 24px" }}>
        <div style={{ padding: "14px 16px", background: "rgba(255,71,87,.05)", border: "1px solid rgba(255,71,87,.15)", borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: "#ff4757", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>📡 LIVE FEED</div>
          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
            Real-time macro wire stories interpreted every 15 minutes during market hours.
            Know when a breaking event invalidates your setup <em style={{ color: "#888" }}>before</em> it hits the chart.
          </div>
        </div>
        <div style={{ padding: "14px 16px", background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.12)", borderRadius: 10 }}>
          <div style={{ fontSize: 10, color: "#00d4ff", fontWeight: 700, letterSpacing: 1, marginBottom: 6 }}>🧠 MACRO LEARNING TOOL</div>
          <div style={{ fontSize: 12, color: "#666", lineHeight: 1.6 }}>
            Paste any headline, tweet or Discord narrative you don't understand.
            Get a clear explanation of what it means macro-wise and how it affects your instrument  -  so you trade informed, not confused.
          </div>
        </div>
      </div>

      {/* Example scenarios */}
      <div style={{ maxWidth: 360, margin: "0 auto 24px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.05)", borderRadius: 10, padding: "14px 16px" }}>
        <div style={{ fontSize: 10, color: "#333", letterSpacing: 1, fontWeight: 700, marginBottom: 10 }}>EXAMPLE USE CASES</div>
        {[
          { q: "'Fed signals higher for longer'", a: "What does this mean for EUR/USD and Gold?" },
          { q: "'Trump announces new Iran sanctions'", a: "How does this hit Oil, Dollar and risk assets?" },
          { q: "'OPEC+ cuts production by 1M barrels'", a: "Why does this move Brent and what's the macro chain?" },
        ].map((ex, i) => (
          <div key={i} style={{ marginBottom: i < 2 ? 10 : 0, paddingBottom: i < 2 ? 10 : 0, borderBottom: i < 2 ? "1px solid rgba(255,255,255,.04)" : "none" }}>
            <div style={{ fontSize: 11, color: "#888", fontStyle: "italic", marginBottom: 3 }}>{ex.q}</div>
            <div style={{ fontSize: 11, color: "#444" }}>→ {ex.a}</div>
          </div>
        ))}
      </div>

      {/* Feature list */}
      <div style={{ maxWidth: 360, margin: "0 auto 24px" }}>
        {[
          "Live interpreted macro wire feed  -  every 15 minutes",
          "Paste any headline for instant macro breakdown",
          "Instrument-level impact  -  DEMAND / PRESSURE / VOLATILE",
          "Conflicting forces flagged automatically",
          "Watch For and Fades When guidance",
          "Shareable narrative cards for X",
        ].map(f => (
          <div key={f} style={{ fontSize: 12, color: "#555", marginBottom: 7, display: "flex", gap: 8, alignItems: "flex-start" }}>
            <span style={{ color: "#ff4757", flexShrink: 0 }}>✓</span>{f}
          </div>
        ))}
      </div>

      <div style={{ textAlign: "center" }}>
        <button onClick={onUpgrade} style={{ background: "linear-gradient(135deg,#ff4757,#cc0011)", color: "#fff", border: "none", padding: "13px 36px", borderRadius: 10, fontSize: 13, fontWeight: 800, cursor: "pointer", fontFamily: "inherit", marginBottom: 10 }}>
          UPGRADE TO PRO  -  €49/mo
        </button>
        <div style={{ fontSize: 11, color: "#555" }}>Includes Equity Debriefs, Scalper Mode & all instruments</div>
      </div>
    </div>
  );
}

// ── STOCKS TAB (Pro) ──────────────────────────────────────────────────────────

// ── SOCIAL HEAT ───────────────────────────────────────────────────────────────
function SocialHeat({ ticker }) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [fetched, setFetched] = React.useState(null); // last ticker fetched

  React.useEffect(() => {
    if (!ticker || ticker === fetched) return;
    setLoading(true);
    setData(null);
    fetch("/api/social?ticker=" + encodeURIComponent(ticker))
      .then(r => r.json())
      .then(d => { setData(d); setFetched(ticker); })
      .catch(() => { setData({ found: false }); setFetched(ticker); })
      .finally(() => setLoading(false));
  }, [ticker]);

  if (loading) return (
    <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ fontSize: 9, color: "#333", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>SOCIAL HEAT</div>
      <div style={{ fontSize: 11, color: "#333" }}>Reading social pulse...</div>
    </div>
  );

  if (!data || !data.found) return null;

  const TREND_STYLE = {
    rising:  { color: "#00d4aa", icon: "▲", label: "RISING",  bg: "rgba(0,212,170,.08)",  border: "rgba(0,212,170,.2)"  },
    stable:  { color: "#ffd700", icon: "●", label: "STABLE",  bg: "rgba(255,215,0,.06)",  border: "rgba(255,215,0,.2)"  },
    falling: { color: "#ff4757", icon: "▼", label: "FALLING", bg: "rgba(255,71,87,.08)",  border: "rgba(255,71,87,.2)"  },
  };
  const ts = TREND_STYLE[data.trend] || TREND_STYLE.stable;
  const buzz = data.buzz_score ?? 0;
  const bullPct = data.bullish_pct ?? 0;
  const bearPct = data.bearish_pct ?? 0;

  // Buzz bar colour based on score
  const buzzColor = buzz >= 70 ? "#ff4757" : buzz >= 40 ? "#ffd700" : "#00d4aa";

  return (
    <div style={{ background: ts.bg, border: "1px solid " + ts.border, borderRadius: 10, padding: "12px 14px", marginBottom: 14 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
        <div style={{ fontSize: 9, color: ts.color, letterSpacing: 1.5, fontWeight: 700 }}>SOCIAL HEAT</div>
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          {data.is_validated && (
            <span style={{ fontSize: 8, color: "#00d4aa", background: "rgba(0,212,170,.1)", border: "1px solid rgba(0,212,170,.25)", borderRadius: 3, padding: "1px 5px", fontWeight: 700, letterSpacing: 0.5 }}>
              MULTI-PLATFORM
            </span>
          )}
          <span style={{ fontSize: 11, fontWeight: 800, color: ts.color }}>
            {ts.icon} {ts.label}
          </span>
        </div>
      </div>

      {/* Buzz score bar */}
      <div style={{ marginBottom: 10 }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
          <span style={{ fontSize: 9, color: "#555", letterSpacing: 1 }}>BUZZ SCORE</span>
          <span style={{ fontSize: 11, fontWeight: 700, color: buzzColor }}>{Math.round(buzz)}/100</span>
        </div>
        <div style={{ height: 4, background: "rgba(255,255,255,.06)", borderRadius: 2 }}>
          <div style={{ height: 4, width: Math.min(buzz, 100) + "%", background: buzzColor, borderRadius: 2, transition: "width .4s ease" }} />
        </div>
      </div>

      {/* Bullish / Bearish split */}
      {(bullPct > 0 || bearPct > 0) && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
            <span style={{ fontSize: 9, color: "#00d4aa", fontWeight: 700 }}>▲ BULLISH {Math.round(bullPct)}%</span>
            <span style={{ fontSize: 9, color: "#ff4757", fontWeight: 700 }}>▼ BEARISH {Math.round(bearPct)}%</span>
          </div>
          <div style={{ height: 4, background: "rgba(255,71,87,.3)", borderRadius: 2, overflow: "hidden" }}>
            <div style={{ height: 4, width: Math.round(bullPct) + "%", background: "#00d4aa", borderRadius: 2 }} />
          </div>
        </div>
      )}

      {/* Trend history sparkline */}
      {data.trend_history && data.trend_history.length > 1 && (
        <div style={{ marginBottom: 8 }}>
          <div style={{ fontSize: 9, color: "#333", letterSpacing: 1, marginBottom: 5 }}>7-DAY BUZZ</div>
          <div style={{ display: "flex", alignItems: "flex-end", gap: 3, height: 24 }}>
            {data.trend_history.slice(-7).map((v, i) => {
              const h = Math.max(3, Math.round((v / 100) * 24));
              const c = v >= 60 ? "#ff4757" : v >= 35 ? "#ffd700" : "#00d4aa";
              return <div key={i} style={{ flex: 1, height: h, background: c, borderRadius: 2, opacity: 0.7 }} />;
            })}
          </div>
        </div>
      )}

      <div style={{ fontSize: 10, color: "#333", lineHeight: 1.4 }}>
        {buzz >= 70
          ? "Unusually high social activity - often precedes volatility. Cross-reference with fundamentals before trading."
          : buzz >= 40
          ? "Moderate social interest. Monitor for narrative shifts."
          : "Low social noise. Price action likely driven by macro or fundamentals, not social narrative."}
      </div>
    </div>
  );
}



// ── AGED WELL ─────────────────────────────────────────────────────────────
// Stores equity brief snapshots in localStorage at generation time.
// After 4pm EST checks if the stock moved in the predicted direction.
// If yes → surfaces a shareable card with an intraday price chart.

const AW_STORAGE_KEY = "md:agedwell:calls";
const AW_MAX_STORED  = 20; // keep last 20 calls rolling

function awStoreCall(ticker, sentiment, headline_summary) {
  if (!ticker || !sentiment || sentiment === "neutral" || sentiment === "mixed") return;
  try {
    const stored = JSON.parse(localStorage.getItem(AW_STORAGE_KEY) || "[]");
    // dedupe same ticker same day
    const today = new Date().toISOString().slice(0, 10);
    const filtered = stored.filter(c => !(c.ticker === ticker.toUpperCase() && c.date === today));
    filtered.unshift({
      ticker: ticker.toUpperCase(),
      sentiment,          // "bullish" | "bearish"
      headline_summary,
      timestamp: Date.now(),
      date: today,
    });
    localStorage.setItem(AW_STORAGE_KEY, JSON.stringify(filtered.slice(0, AW_MAX_STORED)));
  } catch(e) {}
}

function awGetTodayCalls() {
  try {
    const today = new Date().toISOString().slice(0, 10);
    const stored = JSON.parse(localStorage.getItem(AW_STORAGE_KEY) || "[]");
    return stored.filter(c => c.date === today);
  } catch(e) { return []; }
}

async function awFetchIntradayCandles(ticker) {
  // Finnhub intraday 5-min candles for today
  const now   = Math.floor(Date.now() / 1000);
  const start = now - 8 * 3600; // last 8 hours covers full session
  const url   = `/api/candle?symbol=${ticker.toUpperCase()}&resolution=5&from=${start}&to=${now}`;
  const r = await fetch(url);
  if (!r.ok) throw new Error("candle fetch failed");
  const d = await r.json();
  if (!d.c || d.c.length < 2) throw new Error("insufficient candle data");
  return d; // { t, o, h, l, c, v }
}

function awCheckAgedWell(call, candles) {
  if (!candles || !candles.c || candles.c.length < 2) return null;
  const firstClose = candles.c[0];
  const lastClose  = candles.c[candles.c.length - 1];
  const pctMove    = ((lastClose - firstClose) / firstClose) * 100;
  const movedUp    = pctMove >= 2;
  const movedDown  = pctMove <= -2;
  if (call.sentiment === "bullish" && movedUp)   return { pct: pctMove, direction: "up" };
  if (call.sentiment === "bearish" && movedDown)  return { pct: pctMove, direction: "down" };
  return null;
}

function awIsAfterMarketClose() {
  const now = new Date();
  // Convert to EST
  const est = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
  return est.getHours() >= 16;
}

// Draw Lightweight Charts intraday chart inside a canvas div
function AgedWellChart({ candles, briefTimestamp }) {
  const containerRef = React.useRef(null);
  const chartRef     = React.useRef(null);

  React.useEffect(() => {
    if (!containerRef.current || !candles || !candles.t) return;

    // Load Lightweight Charts from CDN dynamically
    if (!window.LightweightCharts) {
      const script = document.createElement("script");
      script.src = "https://unpkg.com/lightweight-charts/dist/lightweight-charts.standalone.production.js";
      script.onload = () => initChart();
      document.head.appendChild(script);
    } else {
      initChart();
    }

    function initChart() {
      if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; }
      const chart = window.LightweightCharts.createChart(containerRef.current, {
        width:  containerRef.current.clientWidth,
        height: 160,
        layout: { background: { color: "#0a0c0f" }, textColor: "#444" },
        grid:   { vertLines: { color: "rgba(255,255,255,.04)" }, horzLines: { color: "rgba(255,255,255,.04)" } },
        rightPriceScale: { borderColor: "rgba(255,255,255,.08)" },
        timeScale: { borderColor: "rgba(255,255,255,.08)", timeVisible: true, secondsVisible: false },
        crosshair: { mode: 0 },
      });
      chartRef.current = chart;

      const series = chart.addCandlestickSeries({
        upColor:   "#00d4aa",
        downColor: "#ff4757",
        borderUpColor:   "#00d4aa",
        borderDownColor: "#ff4757",
        wickUpColor:     "#00d4aa",
        wickDownColor:   "#ff4757",
      });

      const chartData = candles.t.map((t, i) => ({
        time: t,
        open:  candles.o[i],
        high:  candles.h[i],
        low:   candles.l[i],
        close: candles.c[i],
      }));
      series.setData(chartData);

      // Flag line at brief generation time
      if (briefTimestamp) {
        const briefTime = Math.floor(briefTimestamp / 1000);
        series.setMarkers([{
          time:     briefTime,
          position: "belowBar",
          color:    "#ffd700",
          shape:    "arrowUp",
          text:     "Brief",
        }]);
      }
      chart.timeScale().fitContent();
    }

    return () => { if (chartRef.current) { chartRef.current.remove(); chartRef.current = null; } };
  }, [candles, briefTimestamp]);

  return (
    <div ref={containerRef} style={{ width: "100%", height: 160, borderRadius: 6, overflow: "hidden" }} />
  );
}

function AgedWellCard({ call, candles, outcome, onShare, onDismiss }) {
  const [sharing, setSharing]  = React.useState(false);
  const [shared,  setShared]   = React.useState(false);
  const cardRef = React.useRef(null);

  const briefTime = new Date(call.timestamp).toLocaleTimeString("en-US", {
    hour: "2-digit", minute: "2-digit", hour12: true, timeZone: "America/New_York"
  });
  const pctStr  = (outcome.pct >= 0 ? "+" : "") + outcome.pct.toFixed(2) + "%";
  const callDir = call.sentiment === "bullish" ? "bullish" : "bearish";
  const moveDir = outcome.direction === "up" ? "moved up" : "moved down";

  const handleShare = async () => {
    if (!cardRef.current) return;
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
      const canvas = await window.html2canvas(cardRef.current, {
        backgroundColor: "#0a0c0f", scale: 2, useCORS: true, logging: false,
      });
      const blob = await new Promise(res => canvas.toBlob(res, "image/png"));
      const file = new File([blob], `marketdebriefs-aged-well-${call.ticker}.png`, { type: "image/png" });
      const shareText = `${call.ticker} was called ${callDir} at ${briefTime} this morning.

It ${moveDir} ${pctStr} by close.

Brief First, Trade After. Get your full briefs @ marketdebriefs.com`;
      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        await navigator.share({ files: [file], text: shareText });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url; a.download = file.name; a.click();
        URL.revokeObjectURL(url);
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      }
    } catch(e) { console.error("share failed", e); }
    finally { setSharing(false); }
  };

  return (
    <div style={{ marginBottom: 16, border: "1px solid rgba(255,215,0,.25)", borderRadius: 12, overflow: "hidden", background: "rgba(255,215,0,.03)" }}>
      {/* Card content — captured by html2canvas */}
      <div ref={cardRef} style={{ background: "#0a0c0f", padding: "14px 14px 10px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontSize: 14 }}>✅</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#ffd700", letterSpacing: 1.5 }}>AGED WELL</span>
            <span style={{ fontSize: 10, fontWeight: 800, color: "#e0e0e0", fontFamily: "monospace" }}>{call.ticker}</span>
          </div>
          <span style={{ fontSize: 9, color: "#444", fontFamily: "monospace" }}>marketdebriefs.com</span>
        </div>

        {/* Original brief snippet */}
        <div style={{ padding: "8px 10px", background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 7, marginBottom: 10 }}>
          <div style={{ fontSize: 8, color: "#ffd700", fontWeight: 700, letterSpacing: 1.2, marginBottom: 4 }}>
            BRIEF GENERATED {briefTime} EST
          </div>
          <div style={{ fontSize: 11, color: "#ccc", lineHeight: 1.5 }}>
            {call.headline_summary?.slice(0, 120)}{call.headline_summary?.length > 120 ? "..." : ""}
          </div>
          <div style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{ fontSize: 9, fontWeight: 700, color: callDir === "bullish" ? "#00d4aa" : "#ff4757",
              background: callDir === "bullish" ? "rgba(0,212,170,.1)" : "rgba(255,71,87,.1)",
              border: "1px solid " + (callDir === "bullish" ? "rgba(0,212,170,.25)" : "rgba(255,71,87,.25)"),
              borderRadius: 3, padding: "1px 6px" }}>
              {callDir.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Chart */}
        <AgedWellChart candles={candles} briefTimestamp={call.timestamp} />

        {/* Outcome */}
        <div style={{ marginTop: 8, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <div style={{ fontSize: 11, color: "#e0e0e0" }}>
            Session close: <span style={{ fontWeight: 800, color: outcome.direction === "up" ? "#00d4aa" : "#ff4757",
              fontFamily: "monospace" }}>{pctStr}</span>
          </div>
          <div style={{ fontSize: 9, color: "#ffd700", fontWeight: 700 }}>Brief First, Trade After.</div>
        </div>
      </div>

      {/* Action buttons — outside canvas capture */}
      <div style={{ display: "flex", gap: 8, padding: "10px 14px", borderTop: "1px solid rgba(255,215,0,.08)" }}>
        <button onClick={handleShare} disabled={sharing} style={{
          flex: 1, padding: "10px", borderRadius: 8, border: "none",
          background: sharing ? "rgba(255,215,0,.05)" : "linear-gradient(135deg,#ffd700,#f59e0b)",
          color: sharing ? "#555" : "#000",
          fontSize: 12, fontWeight: 800, fontFamily: "inherit", cursor: sharing ? "wait" : "pointer",
        }}>
          {sharing ? "Preparing..." : shared ? "✓ Shared!" : "↗ Share This Call"}
        </button>
        <button onClick={onDismiss} style={{
          padding: "10px 16px", borderRadius: 8,
          border: "1px solid rgba(255,255,255,.08)", background: "transparent",
          color: "#444", fontSize: 12, cursor: "pointer", fontFamily: "inherit",
        }}>Dismiss</button>
      </div>
    </div>
  );
}

function AgedWellSection() {
  const [calls,    setCalls]    = React.useState([]);
  const [results,  setResults]  = React.useState({}); // ticker -> { candles, outcome }
  const [loading,  setLoading]  = React.useState(false);
  const [dismissed, setDismissed] = React.useState([]);
  const [open,     setOpen]     = React.useState(false);

  React.useEffect(() => {
    if (!awIsAfterMarketClose()) return;
    const todayCalls = awGetTodayCalls();
    if (!todayCalls.length) return;
    setCalls(todayCalls);
    setLoading(true);

    Promise.all(todayCalls.map(async call => {
      try {
        const candles = await awFetchIntradayCandles(call.ticker);
        const outcome = awCheckAgedWell(call, candles);
        return { ticker: call.ticker, candles, outcome };
      } catch(e) { return { ticker: call.ticker, candles: null, outcome: null }; }
    })).then(res => {
      const r = {};
      res.forEach(x => { r[x.ticker] = { candles: x.candles, outcome: x.outcome }; });
      setResults(r);
      // auto-expand if any aged well
      const anyAged = res.some(x => x.outcome !== null);
      if (anyAged) setOpen(true);
      setLoading(false);
    });
  }, []);

  const agedCalls = calls.filter(c => {
    const r = results[c.ticker];
    return r?.outcome !== null && r?.outcome !== undefined && !dismissed.includes(c.ticker);
  });

  // hide entirely before 4pm or nothing stored
  if (!awIsAfterMarketClose() || (calls.length === 0 && !loading)) return null;

  return (
    <div style={{ marginBottom: 20 }}>
      {/* Section header */}
      <button onClick={() => setOpen(o => !o)} style={{
        width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between",
        padding: "10px 14px", background: "rgba(255,215,0,.03)",
        border: "1px solid rgba(255,215,0,.15)", borderRadius: 10,
        cursor: "pointer", fontFamily: "inherit", marginBottom: open ? 10 : 0,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13 }}>✅</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#ffd700", letterSpacing: 1.5 }}>TODAY'S CALLS</span>
          {!loading && agedCalls.length > 0 && (
            <span style={{ fontSize: 9, background: "rgba(255,215,0,.12)", color: "#ffd700",
              border: "1px solid rgba(255,215,0,.2)", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
              {agedCalls.length} aged well
            </span>
          )}
          {loading && <span style={{ fontSize: 9, color: "#555" }}>Checking calls...</span>}
        </div>
        <span style={{ fontSize: 10, color: "#555" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && (
        <div>
          {loading && (
            <div style={{ textAlign: "center", padding: "16px 0", fontSize: 11, color: "#555" }}>
              Checking today's calls against market close...
            </div>
          )}
          {!loading && agedCalls.length === 0 && (
            <div style={{ textAlign: "center", padding: "12px 0", fontSize: 11, color: "#555" }}>
              No calls aged well today — market didn't move enough in the predicted direction.
            </div>
          )}
          {!loading && agedCalls.map(call => (
            <AgedWellCard
              key={call.ticker}
              call={call}
              candles={results[call.ticker]?.candles}
              outcome={results[call.ticker]?.outcome}
              onDismiss={() => setDismissed(d => [...d, call.ticker])}
            />
          ))}
        </div>
      )}
    </div>
  );
}


// ── EARNINGS WATCH ────────────────────────────────────────────────────────────
function EarningsWatch({ onBriefMe, ewData, ewImplications, ewLoading }) {
  const [open, setOpen] = React.useState(false);

  React.useEffect(() => {
    if (ewData?.prevMovers?.some(m => !m.pending)) setOpen(true);
  }, [ewData]);

  const data  = ewData;
  const total = data ? data.reportingToday.length + data.prevMovers.length : 0;

  if (!ewLoading && total === 0) return null;

  const todayPre  = data?.reportingToday.filter(e => e.hour === "pre")  || [];
  const todayPost = data?.reportingToday.filter(e => e.hour === "post") || [];
  const todayTbd  = data?.reportingToday.filter(e => e.hour === "tbd")  || [];

  return (
    <div style={{ marginBottom: 16, border: "1px solid rgba(255,215,0,.15)", borderRadius: 10, overflow: "hidden", background: "rgba(255,215,0,.02)" }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", background: "transparent", border: "none", cursor: "pointer", fontFamily: "inherit" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 13 }}>📅</span>
          <span style={{ fontSize: 10, fontWeight: 700, color: "#ffd700", letterSpacing: 1.5 }}>EARNINGS WATCH</span>
          {!ewLoading && total > 0 && (
            <span style={{ fontSize: 9, background: "rgba(255,215,0,.12)", color: "#ffd700", border: "1px solid rgba(255,215,0,.2)", borderRadius: 4, padding: "1px 6px", fontWeight: 700 }}>
              {data.reportingToday.length > 0 && `${data.reportingToday.length} today`}
              {data.reportingToday.length > 0 && data.prevMovers.length > 0 && " · "}
              {data.prevMovers.length > 0 && `${data.prevMovers.length} recent`}
            </span>
          )}
          {ewLoading && <span style={{ fontSize: 9, color: "#555" }}>Loading…</span>}
        </div>
        <span style={{ fontSize: 10, color: "#555" }}>{open ? "▲" : "▼"}</span>
      </button>

      {open && !ewLoading && data && (
        <div style={{ borderTop: "1px solid rgba(255,215,0,.08)", padding: "10px 14px 14px" }}>
          {data.reportingToday.length > 0 && (
            <div style={{ marginBottom: data.prevMovers.length > 0 ? 14 : 0 }}>
              {todayPre.length > 0 && (
                <div style={{ marginBottom: 8 }}>
                  <div style={{ fontSize: 8, color: "#f59e0b", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>☀️ PRE-MARKET TODAY</div>
                  {todayPre.map(e => (
                    <div key={e.ticker} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#e0e0e0", fontFamily: "monospace" }}>{e.ticker}</span>
                        <span style={{ fontSize: 10, color: "#444" }}>{e.name}</span>
                      </div>
                      <button onClick={() => onBriefMe(e.ticker)} style={{ fontSize: 9, padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(245,158,11,.3)", background: "rgba(245,158,11,.06)", color: "#f59e0b", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Brief Me</button>
                    </div>
                  ))}
                </div>
              )}
              {todayPost.length > 0 && (
                <div style={{ marginBottom: todayTbd.length > 0 ? 8 : 0 }}>
                  <div style={{ fontSize: 8, color: "#c084fc", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>🌙 AFTER CLOSE TODAY</div>
                  {todayPost.map(e => (
                    <div key={e.ticker} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#e0e0e0", fontFamily: "monospace" }}>{e.ticker}</span>
                        <span style={{ fontSize: 10, color: "#444" }}>{e.name}</span>
                      </div>
                      <button onClick={() => onBriefMe(e.ticker)} style={{ fontSize: 9, padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(192,132,252,.3)", background: "rgba(192,132,252,.06)", color: "#c084fc", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Brief Me</button>
                    </div>
                  ))}
                </div>
              )}
              {todayTbd.length > 0 && (
                <div>
                  <div style={{ fontSize: 8, color: "#555", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>📋 REPORTING TODAY</div>
                  {todayTbd.map(e => (
                    <div key={e.ticker} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "6px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#e0e0e0", fontFamily: "monospace" }}>{e.ticker}</span>
                        <span style={{ fontSize: 10, color: "#444" }}>{e.name}</span>
                      </div>
                      <button onClick={() => onBriefMe(e.ticker)} style={{ fontSize: 9, padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)", color: "#555", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>Brief Me</button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
          {data.prevMovers.length > 0 && (
            <div>
              <div style={{ fontSize: 8, color: "#ff4757", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>⚡ RECENT EARNINGS</div>
              {data.prevMovers.map(e => {
                const impl = ewImplications[e.ticker];
                const beatColor = e.pending ? "#555" : e.beat ? "#00d4aa" : "#ff4757";
                const beatLabel = e.pending ? "PENDING" : e.beat ? "BEAT" : "MISS";
                const badgeBg   = e.pending ? "rgba(255,255,255,.04)" : e.beat ? "rgba(0,212,170,.1)" : "rgba(255,71,87,.1)";
                const badgeBdr  = e.pending ? "rgba(255,255,255,.1)" : e.beat ? "rgba(0,212,170,.25)" : "rgba(255,71,87,.25)";
                return (
                  <div key={e.ticker} style={{ padding: "8px 0", borderBottom: "1px solid rgba(255,255,255,.04)" }}>
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: (!e.pending && impl) ? 6 : 2 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: "#e0e0e0", fontFamily: "monospace" }}>{e.ticker}</span>
                        <span style={{ fontSize: 9, fontWeight: 700, color: beatColor, background: badgeBg, border: "1px solid " + badgeBdr, borderRadius: 3, padding: "1px 5px" }}>{beatLabel}</span>
                        {e.surprise != null && !e.pending && <span style={{ fontSize: 9, color: beatColor }}>{e.beat ? "+" : ""}{e.surprise}% vs est.</span>}
                        {e.pending && <span style={{ fontSize: 9, color: "#333" }}>Results pending</span>}
                      </div>
                      <button onClick={() => onBriefMe(e.ticker)} style={{ fontSize: 9, padding: "4px 10px", borderRadius: 5, border: "1px solid rgba(255,71,87,.3)", background: "rgba(255,71,87,.06)", color: "#ff4757", cursor: "pointer", fontFamily: "inherit", fontWeight: 700, flexShrink: 0 }}>Brief Me</button>
                    </div>
                    {!e.pending && impl ? (
                      <div style={{ paddingLeft: 2 }}>
                        <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5, marginBottom: 2 }}>{impl.implication}</div>
                        <div style={{ fontSize: 10, color: "#00d4ff", opacity: 0.7 }}>📊 {impl.index_impact}</div>
                      </div>
                    ) : !e.pending && e.beat != null ? (
                      <div style={{ fontSize: 10, color: "#555", paddingLeft: 2 }}>Generating macro implication…</div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          )}
          {data.reportingToday.length === 0 && data.prevMovers.length === 0 && (
            <div style={{ fontSize: 11, color: "#555", textAlign: "center", padding: "8px 0" }}>No large cap earnings in this window</div>
          )}
        </div>
      )}
    </div>
  );
}


function StocksTab({ query, setQuery, data, setData, loading, setLoading, error, setError, mode, scalperData, setScalperData, scalperLoading, setScalperLoading, scalperError, setScalperError, onShareCard, macroContext, onPostSession, ewData, ewImplications, ewLoading }) {
  const isScalper = mode === "scalper";
  const [sectorData, setSectorData] = React.useState(null);
  const [sectorLoading, setSectorLoading] = React.useState(false);
  const [expandedSector, setExpandedSector] = React.useState(null);
  const [selectedTicker, setSelectedTicker] = React.useState(null);
  const [equityPostData, setEquityPostData] = React.useState(null);
  const [equityPostLoading, setEquityPostLoading] = React.useState(false);
  const [equityPostError, setEquityPostError] = React.useState(null);

  // EarningsWatch: tap Brief Me -> prefill ticker and run brief
  const handleEarningsBriefMe = (ticker) => {
    setQuery(ticker);
    const top = document.getElementById("stocks-top");
    if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
    setTimeout(async () => {
      if (isScalper) {
        setScalperLoading(true); setScalperError(null); setScalperData(null);
        try { const r = await getEquityScalper(ticker); setScalperData(r); }
        catch(e) { setScalperError(e.message || "Failed"); }
        finally { setScalperLoading(false); }
      } else {
        setLoading(true); setError(null); setData(null);
        try { const r = await getEquityBrief(ticker); setData(r); }
        catch(e) { setError(e.message || "Failed"); }
        finally { setLoading(false); }
      }
    }, 50);
  };

  const runEquityPost = async () => {
    const q = query.trim();
    if (!q) return;
    setEquityPostLoading(true); setEquityPostError(null); setEquityPostData(null);
    try {
      const result = await getEquityPostSession(q);
      setEquityPostData(result);
    } catch(e) {
      setEquityPostError(e.message || "Post-session brief failed.");
    } finally {
      setEquityPostLoading(false);
    }
  };

  // Auto-load sector impacts when macroContext arrives or changes
  React.useEffect(() => {
    if (!macroContext || isScalper) return;
    const age = Date.now() - (macroContext.timestamp || 0);
    if (age > 30 * 60 * 1000) return; // ignore context older than 30 min
    setSectorData(null);
    setSectorLoading(true);
    getSectorImpact(macroContext)
      .then(d => setSectorData(d))
      .catch(() => {})
      .finally(() => setSectorLoading(false));
  }, [macroContext?.timestamp, isScalper]);

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
        // Store for Aged Well tracking
        if (result?.sentiment && result?.ticker) {
          awStoreCall(result.ticker || q, result.sentiment, result.headline_summary || "");
        }
      } catch (e) { setError(e.message || "Fetch failed. Please try again."); }
      finally { setLoading(false); }
    }
  };

  const SUGGESTIONS = ["Apple","Microsoft","Nvidia","Tesla","Amazon","Meta","Google","Netflix","AMD","Palantir","Spotify","Uber"];
  const activeLoading = isScalper ? scalperLoading : loading;
  const activeError   = isScalper ? scalperError   : error;

  const FC = { DEMAND: "#00d4aa", PRESSURE: "#ff4757", VOLATILE: "#ffd700", WATCH: "#c084fc" };

  return (
    <div>
      {/* Anchor for scroll-to-top when ticker is tapped */}
      <div id="stocks-top" style={{ height: 0 }} />
      {/* ── EARNINGS WATCH ── */}
      {!isScalper && <EarningsWatch onBriefMe={handleEarningsBriefMe} ewData={ewData} ewImplications={ewImplications} ewLoading={ewLoading} />}
      {/* ── AGED WELL: TODAY'S CALLS ── */}
      {!isScalper && <AgedWellSection />}
      {/* ── MACRO SECTOR IMPACT ── */}
      {!isScalper && macroContext && (
        <div style={{ marginBottom: 20 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
            <div style={{ fontSize: 10, color: "#00d4ff", letterSpacing: 1.5, fontWeight: 700 }}>⚡ MACRO SECTOR IMPACT</div>
            <div style={{ fontSize: 9, color: "#555", fontFamily: "monospace" }}>from {macroContext.instrument} brief</div>
          </div>
          <div style={{ padding: "8px 12px", background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.1)", borderRadius: 8, marginBottom: 12 }}>
            <div style={{ fontSize: 11, color: "#555", lineHeight: 1.5 }}>{macroContext.macro_theme}</div>
          </div>

          {sectorLoading && (
            <div style={{ textAlign: "center", padding: "16px 0", fontSize: 12, color: "#555" }}>Analysing sector impacts…</div>
          )}

          {sectorData?.sectors && sectorData.sectors.map((sector, i) => {
            const c = FC[sector.flow] || "#555";
            const isExp = expandedSector === i;
            return (
              <div key={i} style={{ marginBottom: 8 }}>
                <div
                  onClick={() => setExpandedSector(isExp ? null : i)}
                  style={{ display: "flex", alignItems: "center", gap: 10, padding: "11px 14px", background: isExp ? c + "10" : "rgba(255,255,255,.02)", border: "1px solid " + (isExp ? c + "30" : "rgba(255,255,255,.06)"), borderLeft: "3px solid " + c, borderRadius: "0 8px 8px 0", cursor: "pointer" }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: "#e0e0e0" }}>{sector.name}</div>
                    <div style={{ fontSize: 10, color: "#444", marginTop: 2, lineHeight: 1.4 }}>{sector.reason}</div>
                  </div>
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 3 }}>
                    <div style={{ fontSize: 9, fontWeight: 800, color: c, letterSpacing: 1 }}>{sector.flow}</div>
                    <div style={{ fontSize: 9, color: "#333" }}>{isExp ? "▲" : "▼"}</div>
                  </div>
                </div>

                {isExp && (
                  <div style={{ background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderTop: "none", borderRadius: "0 0 8px 8px", padding: "12px 14px" }}>
                    <div style={{ fontSize: 9, color: "#333", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>AFFECTED TICKERS  -  tap to brief</div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {(sector.tickers || []).map(ticker => (
                        <button key={ticker}
                          onClick={() => {
                            // 1. Set the query
                            setQuery(ticker);
                            // 2. Collapse sector panel but KEEP sector data so user can go back
                            setExpandedSector(null);
                            // 3. Scroll to the brief result area  -  user sees the loading state
                            setTimeout(() => {
                              const anchor = document.getElementById("stocks-brief-result");
                              if (anchor) anchor.scrollIntoView({ behavior: "smooth", block: "start" });
                            }, 60);
                            // 4. Run the brief after scroll starts
                            setTimeout(() => document.getElementById("stocks-brief-btn")?.click(), 220);
                          }}
                          style={{ padding: "6px 14px", borderRadius: 6, border: "1px solid " + c + "40", background: c + "08", color: c, fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                          {ticker}
                        </button>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
          <div style={{ height: 1, background: "rgba(255,255,255,.05)", margin: "16px 0" }} />
        </div>
      )}

      {/* ── BACK TO SECTORS ── */}
      {!isScalper && sectorData?.sectors && (data || loading) && (
        <div style={{ marginBottom: 12 }}>
          <button
            onClick={() => {
              setData(null); setError(null);
              setEquityPostData(null); setEquityPostError(null);
              setTimeout(() => {
                const top = document.getElementById("stocks-top");
                if (top) top.scrollIntoView({ behavior: "smooth", block: "start" });
              }, 60);
            }}
            style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 14px", borderRadius: 7, border: "1px solid rgba(0,212,255,.2)", background: "rgba(0,212,255,.05)", color: "#00d4ff", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ← Back to Sectors
          </button>
        </div>
      )}
      {/* ── BRIEF RESULT ANCHOR  -  ticker taps scroll here ── */}
      <div id="stocks-brief-result" style={{ height: 0 }} />

      {/* Mode indicator */}
      <div style={{ display: "flex", gap: 8, alignItems: "center", marginBottom: 14, padding: "8px 12px", background: isScalper ? "rgba(245,158,11,.06)" : "rgba(255,255,255,.02)", border: "1px solid " + (isScalper ? "rgba(245,158,11,.2)" : "rgba(255,255,255,.06)"), borderRadius: 8 }}>
        <div style={{ width: 6, height: 6, borderRadius: "50%", background: isScalper ? "#f59e0b" : "#00d4ff", flexShrink: 0 }} />
        <div style={{ fontSize: 10, fontWeight: 700, color: isScalper ? "#f59e0b" : "#00d4ff", letterSpacing: 1.5 }}>
          {isScalper ? "EQUITY SCALPER  -  PRO" : "EQUITY DEBRIEF  -  PRO"}
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
            placeholder={isScalper ? "NVDA, TSLA, AAPL  -  about to trade?" : "Tesla, MSFT, Apple, NVDA, any ticker…"}
            style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid " + (isScalper ? "rgba(245,158,11,.25)" : "rgba(245,158,11,.2)"), borderRadius: 8, color: "#e0e0e0", fontSize: 14, padding: "10px 13px", outline: "none", fontFamily: "inherit", minWidth: 0 }}
          />
          <button id="stocks-brief-btn" onClick={runStock} disabled={activeLoading} style={{ padding: "10px 16px", borderRadius: 8, cursor: activeLoading ? "not-allowed" : "pointer", background: activeLoading ? "rgba(255,255,255,.02)" : "rgba(245,158,11,.12)", color: activeLoading ? "#2a2a2a" : "#f59e0b", border: "1px solid rgba(245,158,11,.25)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit" }}>
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
            <div style={{ fontSize: 11, color: "#555" }}>Earnings proximity · Breaking news · Imminent catalysts</div>
          </div>
        )
      ) : (
        !loading && !data && !error && (
          <div style={{ textAlign: "center", padding: "40px 20px" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>📊</div>
            <div style={{ fontSize: 13, color: "#444" }}>Search any stock or ticker above for a full macro & fundamental debrief</div>
            <div style={{ fontSize: 11, color: "#555", marginTop: 6 }}>MAG7 · Large caps · Any public company</div>
          </div>
        )
      )}

      {isScalper && !scalperLoading && scalperData && (
        <EquityScalperView ticker={query} data={scalperData} loading={scalperLoading} error={scalperError} />
      )}
      {!isScalper && !loading && data && (
        <EquityView inst={{ label: data.instrument || query, color: "#f59e0b", flag: "STOCK" }} data={data} />
      )}
      {/* Social Heat - auto-loads when equity brief is ready */}
      {!isScalper && !loading && data && query && (
        <SocialHeat ticker={query.toUpperCase().trim()} />
      )}
      {/* Session cards  -  Pre and Post  -  shown after equity brief loads */}
      {!isScalper && !loading && data && (
        <div style={{ marginTop: 20 }}>
          {/* Pre-session share */}
          <button onClick={() => onShareCard(data, "equity", query, "pre")}
            style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 16px", borderRadius: 8, border: "1px solid rgba(245,158,11,.25)", background: "rgba(245,158,11,.08)", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit", marginBottom: 8 }}>
            ☀️ Share Pre-Session Brief
          </button>

          {/* Post-session  -  generate on demand */}
          {!equityPostData ? (
            <button onClick={runEquityPost} disabled={equityPostLoading}
              style={{ width: "100%", display: "flex", alignItems: "center", justifyContent: "center", gap: 7, padding: "11px 16px", borderRadius: 8, border: "1px solid rgba(255,165,0,.25)", background: equityPostLoading ? "rgba(255,255,255,.02)" : "rgba(255,165,0,.06)", color: equityPostLoading ? "#333" : "#ffa500", fontSize: 12, fontWeight: 700, cursor: equityPostLoading ? "wait" : "pointer", fontFamily: "inherit" }}>
              {equityPostLoading ? "Generating post-session…" : "🌙 Get Post-Session Brief"}
            </button>
          ) : (
            <div style={{ marginTop: 4 }}>
              {/* Post-session brief card */}
              <div style={{ background: "rgba(255,165,0,.06)", border: "1px solid rgba(255,165,0,.2)", borderRadius: 10, padding: 16, marginBottom: 8 }}>
                <div style={{ fontSize: 9, color: "#ffa500", letterSpacing: 1.5, fontWeight: 700, marginBottom: 10 }}>🌙 POST-SESSION BRIEF</div>
                {equityPostData.session_summary && (
                  <div style={{ fontSize: 14, color: "#e0e0e0", fontWeight: 700, lineHeight: 1.4, marginBottom: 12 }}>{equityPostData.session_summary}</div>
                )}
                {equityPostData.primary_driver && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: "#ffa500", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>PRIMARY DRIVER</div>
                    <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{equityPostData.primary_driver}</div>
                  </div>
                )}
                {equityPostData.macro_connection && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: "#00d4ff", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>MACRO CONNECTION</div>
                    <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{equityPostData.macro_connection}</div>
                  </div>
                )}
                {equityPostData.what_it_signals && (
                  <div style={{ marginBottom: 8 }}>
                    <div style={{ fontSize: 9, color: "#c084fc", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>WHAT IT SIGNALS</div>
                    <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6 }}>{equityPostData.what_it_signals}</div>
                  </div>
                )}
                {equityPostData.watch_next && (
                  <div style={{ padding: "9px 12px", background: "rgba(0,212,255,.06)", border: "1px solid rgba(0,212,255,.12)", borderRadius: 7 }}>
                    <div style={{ fontSize: 9, color: "#00d4ff", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>WATCH NEXT</div>
                    <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>{equityPostData.watch_next}</div>
                  </div>
                )}
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                <button onClick={() => onShareCard(equityPostData, "equity-post", query)}
                  style={{ flex: 1, padding: "10px 0", borderRadius: 8, border: "1px solid rgba(255,165,0,.25)", background: "rgba(255,165,0,.08)", color: "#ffa500", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  ↗ Share Post-Session
                </button>
                <button onClick={() => { setEquityPostData(null); setEquityPostError(null); }}
                  style={{ padding: "10px 14px", borderRadius: 8, border: "1px solid rgba(255,255,255,.06)", background: "transparent", color: "#444", fontSize: 11, cursor: "pointer", fontFamily: "inherit" }}>
                  ✕
                </button>
              </div>
            </div>
          )}
          {equityPostError && <div style={{ marginTop: 6, fontSize: 11, color: "#ff4757", textAlign: "center" }}>{equityPostError}</div>}
        </div>
      )}
      {/* Events Brief share card */}
      {isScalper && !scalperLoading && scalperData && (
        <div style={{ marginTop: 20, textAlign: "center" }}>
          <button onClick={() => onShareCard(scalperData, "scalper-equity", query)}
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 22px", borderRadius: 8, border: "1px solid rgba(245,158,11,.25)", background: "rgba(245,158,11,.08)", color: "#f59e0b", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
            ↗ Share Events Card
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
    YELLOW: { label: "CAUTION",    sub: "Something is close  -  be aware", color: "#f59e0b", bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.2)" },
    RED:    { label: "STAND DOWN", sub: "Major event imminent  -  wait",   color: "#ff4757", bg: "rgba(255,71,87,.08)",  border: "rgba(255,71,87,.2)"  },
  };
  const rl = RL[data.risk_level] || RL.YELLOW;
  const EC = { SAFE: { color: "#00d4aa", label: "EARNINGS SAFE", bg: "rgba(0,212,170,.08)" }, NEAR: { color: "#ffd700", label: "EARNINGS NEAR", bg: "rgba(255,215,0,.06)" }, IMMINENT: { color: "#ff4757", label: "EARNINGS IMMINENT", bg: "rgba(255,71,87,.08)" } };
  const ep = EC[data.earnings_proximity] || EC.SAFE;

  return (
    <div>
      {/* Risk signal */}
      <div style={{ background: rl.bg, border: "1px solid " + rl.border, borderRadius: 12, padding: "22px 20px", marginBottom: 14, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>
          {(data.ticker || ticker).toUpperCase()}  -  MACRO RISK CHECK
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
          <div style={{ fontSize: 9, color: "#ff4757", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>BREAKING  -  {(data.ticker || ticker).toUpperCase()}</div>
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
          <div style={{ fontSize: 9, color: "#f59e0b", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>COMING UP  -  {(data.ticker || ticker).toUpperCase()}</div>
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
        await navigator.share({ files: [file], text: "Don't Trade Blind. Don't Get Fixated on what you think the market should do. Adapt your Trading Bias with Real time Narrative shifts.\n\nBrief First, Trade After. Get your Full Briefs in Real Time @ marketdebriefs.com" });
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
                  const FC = { DEMAND: "#00d4aa", PRESSURE: "#ff4757", VOLATILE: "#ffd700", WATCH: "#c084fc" };
                  const c = FC[inst.flow] || "#555";
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start", padding: "6px 9px", background: "rgba(255,255,255,.02)", borderLeft: "2px solid " + c, borderRadius: "0 5px 5px 0", marginBottom: 5 }}>
                      <div style={{ flexShrink: 0, minWidth: 42 }}>
                        <div style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{inst.name}</div>
                        <div style={{ fontSize: 7, color: c, fontWeight: 700, letterSpacing: 0 }}>{inst.flow || "WATCH"}</div>
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
        <div style={{ fontSize: 11, color: "#555", textAlign: "center" }}>Mobile  -  shares to any app · Desktop  -  downloads as PNG</div>
      </div>
    </div>
  );
}

// ── SHARE CARD ───────────────────────────────────────────────────────────────
function ShareCard({ inst, data, mode, cardType, isPostSessionBrief, isEventSummary, onClose }) {
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
        // Filter to weekdays only  -  ignore weekend thin trading
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

  // Accent colour  -  cyan for macro/scalper, amber for equity
  const accent = isEquity ? "#f59e0b" : "#00d4ff";
  const accentDim = isEquity ? "rgba(245,158,11,.1)" : "rgba(0,212,255,.035)";

  // Card label
  const cardLabel = isEventSummary ? "SESSION SUMMARY" : (isPostSession || isPostSessionBrief) ? "POST-SESSION BRIEF" : isEquity ? "EQUITY DEBRIEF" : isScalper ? "EVENTS BRIEF" : "MACRO BRIEF";

  // Content lines
  const truncate = (str, max) => str && str.length > max ? str.slice(0, max - 1) + "…" : (str || "");
  // Extract first complete sentence  -  no mid-word cuts
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
    // Show up to 3 events on the card
    const imminentCount = data.imminent?.length || 0;
    if (imminentCount === 0) {
      line3 = "";
    } else if (imminentCount === 1) {
      line3 = truncate(data.imminent[0].event + (data.imminent[0].time_est ? " · " + data.imminent[0].time_est + " ET" : "  -  in " + data.imminent[0].due_in), 80);
    } else {
      line3 = truncate(imminentCount + " events today  -  " + data.imminent.slice(0,2).map(e => e.event).join(", "), 80);
    }
    biasReason = truncate(data.risk_reason, 70);
  } else {
    // line1 = primary macro driver (geopolitical if exists, else headline)
    // line2 = first event's why_it_moves_price OR macro_context if distinct from line1
    // line3 = next scheduled event on the calendar
    const geo = data.geopolitical_risks;
    const hs  = data.headline_summary || "";
    const mc  = data.macro_context || "";
    const ev0 = data.events?.[0];
    line1      = truncate(geo || hs, 80);
    // Use first event's why_it_moves_price as line2  -  always distinct from line1
    // Fall back to macro_context only if it differs meaningfully from line1
    const why  = ev0?.why_it_moves_price || "";
    const mcDistinct = mc && mc.slice(0,35) !== (geo || hs).slice(0,35);
    line2      = truncate(why || (mcDistinct ? mc : ""), 80);
    // line3 = next event on the calendar (skip ev0 if we used its why above)
    const calEv = ev0 ? ev0 : data.events?.[1];
    line3      = calEv ? truncate(calEv.title + " · " + calEv.time, 80) : "";
    biasReason = truncate(hs, 70);
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

      // Scroll to top of card before capture to ensure no offset
      el.scrollIntoView({ block: "start" });
      await new Promise(r => setTimeout(r, 60));

      const canvas = await window.html2canvas(el, {
        backgroundColor: "#0a0c0f",
        scale: 2,
        useCORS: true,
        logging: false,
        scrollX: -window.scrollX,
        scrollY: -window.scrollY,
      });

      const blob = await new Promise(resolve => canvas.toBlob(resolve, "image/png"));
      const file = new File([blob], "marketdebriefs-" + inst.label.replace(/\//g,"-") + ".png", { type: "image/png" });

      if (navigator.share && navigator.canShare && navigator.canShare({ files: [file] })) {
        // Native share sheet  -  works on mobile (iOS/Android)
        await navigator.share({
          files: [file],
          text: (() => {
            const name = inst.label;
            if (isEventSummary) return name + "  -  Session Summary\n\nThis is a snapshot of today's session  -  not the full picture.\nMarketDebriefs gives you the full read: what every release means for your trade, before and after it fires.\n\nGet your full briefs @ marketdebriefs.com";
            if (isPostSession || isPostSessionBrief) return name + "  -  Post-Session Brief\n\nWhat drove today's move. What it signals. What to watch next session.\nBrief First, Trade After. marketdebriefs.com";
            if (isScalper) return name + "  -  Event Impact Check\n\nThis is a snapshot  -  not the full picture.\nThe full brief tells you exactly what each scheduled event means for the instrument you're trading, in real time.\n\nGet your full briefs @ marketdebriefs.com";
            if (isEquity) return name + "  -  Equity Brief\n\nThis is a snapshot  -  not the full picture.\nThe full brief gives you the complete macro context: sector rotation, institutional flow, catalyst events and what they mean for your trade.\n\nGet your full briefs @ marketdebriefs.com";
            return name + "  -  Full Brief\n\nThis is a snapshot  -  not the full picture.\nThe full brief covers what's driving price, every high-impact event, geopolitical risk, and what it all means for your trade.\n\nGet your full briefs @ marketdebriefs.com";
          })(),
        });
        setShared(true);
        setTimeout(() => setShared(false), 3000);
      } else {
        // Desktop fallback  -  download the image
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
          background: "#0a0c0f", borderRadius: 20,
          padding: (isPostSession || isPostSessionBrief) ? 18 : 22,
          paddingBottom: 24,
          width: "100%",
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

            {/* Theme pill  -  scalper keeps GREEN/YELLOW/RED, others show macro theme */}
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

            {/* Price move  -  post-session only */}
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

            {/* Lines  -  scalper gets live desk layout, others get standard layout */}
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
                    <div style={{ fontSize: 7, color: "#ffd700", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>TODAY'S EVENTS</div>
                    {data.imminent.slice(0, 3).map((ev, i) => (
                      <div key={i} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "4px 7px", border: "1px solid rgba(255,215,0,.15)", borderRadius: 4, background: "rgba(255,215,0,.04)" }}>
                        <span style={{ fontSize: 9, color: "#888", flex: 1 }}>{truncate(ev.event, 38)}</span>
                        <span style={{ fontSize: 9, color: "#ffd700", fontWeight: 700, flexShrink: 0, marginLeft: 6 }}>in {ev.due_in}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            ) : isEventSummary ? (
              // EVENT SUMMARY  -  what fired today and what it meant
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                {data.session_headline && (
                  <div style={{ fontSize: 12, color: "#c8d6e5", lineHeight: 1.5, fontStyle: "italic", marginBottom: 4 }}>
                    "{data.session_headline}"
                  </div>
                )}
                {data.events_summary && data.events_summary.slice(0, 3).map((ev, i) => {
                  const vc = { HAWKISH: "#ff4757", DOVISH: "#00d4aa", BULLISH: "#00d4aa", BEARISH: "#ff4757", NEUTRAL: "#ffd700" };
                  const c = vc[ev.verdict] || "#888";
                  return (
                    <div key={i} style={{ display: "flex", gap: 8, alignItems: "flex-start" }}>
                      <span style={{ fontSize: 9, fontWeight: 800, color: c, flexShrink: 0, marginTop: 2, minWidth: 52 }}>{ev.verdict}</span>
                      <span style={{ fontSize: 10, color: "#666", lineHeight: 1.4 }}>{truncate(ev.event + (ev.impact ? "  -  " + ev.impact : ""), 70)}</span>
                    </div>
                  );
                })}
                {data.net_bias && (
                  <div style={{ marginTop: 4, padding: "6px 9px", borderRadius: 5, background: "rgba(0,212,255,.05)", border: "1px solid rgba(0,212,255,.15)" }}>
                    <div style={{ fontSize: 8, color: "#00d4ff", letterSpacing: 1, fontWeight: 700, marginBottom: 2 }}>NET SESSION BIAS</div>
                    <div style={{ fontSize: 10, color: "#888", lineHeight: 1.4 }}>{truncate(data.net_bias, 80)}</div>
                  </div>
                )}
                {data.watch_next && (
                  <div style={{ fontSize: 9, color: "#555" }}>
                    <span style={{ color: "#ffd700", fontWeight: 700 }}>Watch: </span>{truncate(data.watch_next, 60)}
                  </div>
                )}
              </div>
            ) : isPostSession ? (
              // POST-SESSION  -  fresh AI brief looking backwards at the day
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
              // PRE-SESSION  -  standard macro context
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
                {data.macro_context && data.macro_context !== data.headline_summary && data.macro_context.slice(0,40) !== data.headline_summary?.slice(0,40) && (
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
                {isEventSummary
                  ? "This is a snapshot. Get your full briefs @ marketdebriefs.com"
                  : (isPostSession || isPostSessionBrief)
                  ? "What drove the move. What to watch next. marketdebriefs.com"
                  : isEquity
                  ? "This is a snapshot. Get your full briefs @ marketdebriefs.com"
                  : isScalper
                  ? "This is a snapshot. Get your full briefs @ marketdebriefs.com"
                  : "This is a snapshot. Get your full briefs @ marketdebriefs.com"}
              </span>
              <span style={{ fontSize: 8, color: "#1a1a1a", fontFamily: "monospace", letterSpacing: 1.2, flexShrink: 0 }}>MACRO INTELLIGENCE</span>
            </div>
          </div>
        </div>

        {/* Pre / Post session toggle */}
        {!isEventSummary && (
          <div style={{ display: "flex", width: "100%", background: "#0d1117", borderRadius: 8, border: "1px solid rgba(255,255,255,.07)", overflow: "hidden" }}>
            <button onClick={() => setIsPostSession(false)} style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: !isPostSession ? "rgba(0,212,255,.1)" : "transparent", color: !isPostSession ? "#00d4ff" : "#333", borderBottom: !isPostSession ? "2px solid #00d4ff" : "2px solid transparent", transition: "all .15s" }}>
              ☀️ Pre-Session
            </button>
            <button onClick={() => setIsPostSession(true)} style={{ flex: 1, padding: "10px 0", border: "none", cursor: "pointer", fontFamily: "inherit", fontSize: 12, fontWeight: 700, background: isPostSession ? "rgba(0,212,255,.1)" : "transparent", color: isPostSession ? "#00d4ff" : "#333", borderBottom: isPostSession ? "2px solid #00d4ff" : "2px solid transparent", transition: "all .15s" }}>
              🌙 Post-Session
            </button>
          </div>
        )}

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
            {sharing ? "Preparing…" : shared ? "✓ Shared!" : isEventSummary ? "↗ Share Session Summary" : isPostSession ? "↗ Share Post-Session" : "↗ Share Pre-Session"}
          </button>
          <button onClick={onClose} style={{
            padding: "12px 20px", borderRadius: 8,
            border: "1px solid rgba(255,255,255,.1)", background: "rgba(255,255,255,.03)",
            color: "#555", fontSize: 13, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
          }}>Done</button>
        </div>

        <div style={{ fontSize: 11, color: "#555", textAlign: "center" }}>
          Mobile  -  shares to any app · Desktop  -  downloads as PNG
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
      {data.macro_context && data.macro_context !== data.headline_summary && data.macro_context.slice(0,40) !== data.headline_summary?.slice(0,40) && <div style={{ background: "rgba(0,212,255,.06)", border: "1px solid rgba(0,212,255,.15)", borderRadius: 8, padding: 13, marginBottom: 13 }}><div style={{ fontSize: 9, color: "#00d4ff", fontWeight: 700, letterSpacing: 1.5, marginBottom: 5 }}>WHAT TO WATCH</div><div style={{ fontSize: 13, color: "#a8d8ea", lineHeight: 1.65 }}>{data.macro_context}</div></div>}
      {data.teaching_moment && <div style={{ background: "rgba(192,132,252,.06)", border: "1px solid rgba(192,132,252,.2)", borderRadius: 8, padding: 15 }}><div style={{ fontSize: 9, color: "#c084fc", fontWeight: 700, letterSpacing: 1.5, marginBottom: 7 }}>TEACH ME TO FISH</div><div style={{ fontSize: 13, color: "#d4b8f7", lineHeight: 1.75 }}>{data.teaching_moment}</div></div>}
    </div>
  );
}

function ScalperView({ inst, data, rawCalendar = [] }) {
  const [postReads, setPostReads] = React.useState({});
  const [postLoading, setPostLoading] = React.useState({});
  const [postErrors, setPostErrors] = React.useState({});
  const [openReads, setOpenReads] = React.useState({});
  const [autoFetched, setAutoFetched] = React.useState({});

  const fetchPostRead = async (ev, i) => {
    setPostLoading(p => ({ ...p, [i]: true }));
    setPostErrors(p => ({ ...p, [i]: null }));
    try {
      const result = await getPostReleaseRead(ev, inst.label);
      setPostReads(p => ({ ...p, [i]: result }));
      // Auto-open the result when it arrives
      setOpenReads(p => ({ ...p, [i]: true }));
    } catch(e) {
      setPostErrors(p => ({ ...p, [i]: "Could not get read. Try again." }));
    }
    setPostLoading(p => ({ ...p, [i]: false }));
  };

  // Auto-fetch released events when they appear
  React.useEffect(() => {
    const released = rawCalendar.filter(ev =>
      ev.passed && ev.country === "US" && (ev.impact === "high" || ev.impact === "medium")
    );
    released.forEach((ev, i) => {
      const key = "cal_" + i;
      if (!autoFetched[key] && !postReads[key] && !postLoading[key]) {
        setAutoFetched(p => ({ ...p, [key]: true }));
        fetchPostRead(ev, key);
      }
    });
  }, [rawCalendar.length]);

  const VERDICT_STYLE = {
    HAWKISH:  { color: "#ff4757", bg: "rgba(255,71,87,.1)",   border: "rgba(255,71,87,.25)"   },
    DOVISH:   { color: "#00d4aa", bg: "rgba(0,212,170,.1)",   border: "rgba(0,212,170,.25)"   },
    BULLISH:  { color: "#00d4aa", bg: "rgba(0,212,170,.1)",   border: "rgba(0,212,170,.25)"   },
    BEARISH:  { color: "#ff4757", bg: "rgba(255,71,87,.1)",   border: "rgba(255,71,87,.25)"   },
    NEUTRAL:  { color: "#ffd700", bg: "rgba(255,215,0,.08)",  border: "rgba(255,215,0,.2)"    },
  };

  const RL = {
    GREEN:  { label: "CLEAR",       sub: "Macro conditions calm",         color: "#00d4ff", bg: "rgba(0,212,255,.08)",  border: "rgba(0,212,255,.2)"  },
    YELLOW: { label: "CAUTION",     sub: "Something is close  -  be aware", color: "#f59e0b", bg: "rgba(245,158,11,.08)", border: "rgba(245,158,11,.2)" },
    RED:    { label: "STAND DOWN",  sub: "Major event imminent  -  wait",   color: "#ff4757", bg: "rgba(255,71,87,.08)",  border: "rgba(255,71,87,.2)"  },
  };
  const rl = RL[data.risk_level] || RL.YELLOW;
  return (
    <div>
      <div style={{ background: rl.bg, border: "1px solid " + rl.border, borderRadius: 12, padding: "22px 20px", marginBottom: 18, textAlign: "center" }}>
        <div style={{ fontSize: 10, color: "#444", letterSpacing: 2, fontWeight: 700, marginBottom: 10 }}>{inst.flag} {inst.label}  -  MACRO RISK CHECK</div>
        <div style={{ fontSize: 32, fontWeight: 900, color: rl.color, marginBottom: 4, letterSpacing: -1 }}>{rl.label}</div>
        <div style={{ fontSize: 10, color: rl.color, opacity: 0.6, fontFamily: "monospace", letterSpacing: 1, marginBottom: 10 }}>{rl.sub}</div>
        <div style={{ height: 1, background: "rgba(255,255,255,.05)", marginBottom: 10 }} />
        <div style={{ fontSize: 13, color: "#888", lineHeight: 1.6 }}>{data.risk_reason}</div>
      </div>
      <div style={{ background: "rgba(255,255,255,.03)", border: "1px solid rgba(255,255,255,.07)", borderRadius: 8, padding: 13, marginBottom: 14 }}><div style={{ fontSize: 9, color: "#666", letterSpacing: 1.5, fontWeight: 700, marginBottom: 5 }}>SCALPER NOTE</div><div style={{ fontSize: 14, color: "#e0e0e0", lineHeight: 1.6, fontWeight: 500 }}>{data.scalper_note}</div></div>
      {data.breaking && data.breaking.length > 0 && <div style={{ marginBottom: 14 }}><div style={{ fontSize: 9, color: "#ff4757", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>JUST HIT THE WIRE</div>{data.breaking.map((b, i) => (<div key={i} style={{ background: "rgba(255,255,255,.02)", borderLeft: "3px solid rgba(0,212,255,.3)", borderRadius: 8, padding: "11px 13px", marginBottom: 7 }}><div style={{ display: "flex", justifyContent: "space-between", gap: 8 }}><div style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 600, flex: 1 }}>{b.headline}</div><div style={{ textAlign: "right", flexShrink: 0 }}><div style={{ fontSize: 10, color: "#444", marginTop: 2 }}>{b.age}</div></div></div></div>))}</div>}
      {/* Released events from live calendar  -  high-impact US events that have passed */}
      {(() => {
        const released = rawCalendar.filter(ev =>
          ev.passed && ev.country === "US" && (ev.impact === "high" || ev.impact === "medium")
        );
        if (!released.length) return null;
        return (
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontSize: 9, color: "#00d4ff", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>
              RELEASED TODAY ({released.length})
            </div>
            {released.map((ev, i) => {
              const key = "cal_" + i;
              const read = postReads[key];
              const loading = postLoading[key];
              const isOpen = !!openReads[key];
              const vs = read ? (VERDICT_STYLE[read.verdict] || VERDICT_STYLE.NEUTRAL) : null;
              return (
                <div key={i}
                  onClick={() => read && setOpenReads(p => ({ ...p, [key]: !p[key] }))}
                  style={{
                    background: read ? (vs.bg) : "rgba(0,212,255,.04)",
                    border: "1px solid " + (read ? vs.border : "rgba(0,212,255,.15)"),
                    borderLeft: "3px solid " + (read ? vs.color : "#00d4ff"),
                    borderRadius: "0 8px 8px 0",
                    padding: "11px 13px",
                    marginBottom: 7,
                    cursor: read ? "pointer" : "default",
                  }}>
                  {/* Header row */}
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                    <div style={{ flex: 1 }}>
                      <div style={{ fontSize: 8, color: "#00d4ff", fontWeight: 700, letterSpacing: 1.5, marginBottom: 3 }}>
                        RELEASED {ev.time_est} ET{ev.impact === "high" ? " · HIGH IMPACT" : ""}
                      </div>
                      <div style={{ fontSize: 13, color: read ? "#f0f0f0" : "#c0d0e0", fontWeight: 600 }}>{ev.event}</div>
                      {(ev.estimate || ev.prev) && (
                        <div style={{ fontSize: 10, color: "#555", marginTop: 2 }}>
                          {ev.estimate ? "Est: " + ev.estimate : ""}{ev.estimate && ev.prev ? " · " : ""}{ev.prev ? "Prev: " + ev.prev : ""}
                        </div>
                      )}
                    </div>
                    <div style={{ textAlign: "right", flexShrink: 0 }}>
                      {read && (
                        <div style={{ fontSize: 10, fontWeight: 800, color: vs.color, border: "1px solid " + vs.border, background: vs.bg, borderRadius: 4, padding: "2px 8px", marginBottom: 3 }}>
                          {read.verdict}
                        </div>
                      )}
                      {loading && <div style={{ fontSize: 10, color: "#555" }}>reading...</div>}
                    </div>
                  </div>
                  {/* Loading state */}
                  {loading && (
                    <div style={{ marginTop: 8, fontSize: 11, color: "#444", fontStyle: "italic" }}>Analysing release...</div>
                  )}
                  {/* Collapsed summary line  -  always visible once read is ready */}
                  {read && !isOpen && (
                    <div style={{ marginTop: 6, fontSize: 11, color: "#888", lineHeight: 1.4 }}>{read.headline}</div>
                  )}
                  {/* Expanded detail */}
                  {read && isOpen && (
                    <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                      <div style={{ fontSize: 8, color: "#444", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>WHAT IT MEANS FOR THIS SESSION</div>
                      <div style={{ fontSize: 13, color: "#c8d6e5", lineHeight: 1.75, background: "rgba(0,0,0,.25)", padding: 11, borderRadius: 6, marginBottom: 10 }}>{read.session_impact}</div>
                      <div style={{ padding: "8px 10px", background: "rgba(255,215,0,.05)", border: "1px solid rgba(255,215,0,.15)", borderRadius: 6, marginBottom: 8 }}>
                        <div style={{ fontSize: 8, color: "#ffd700", letterSpacing: 1.5, fontWeight: 700, marginBottom: 3 }}>WATCH NOW</div>
                        <div style={{ fontSize: 11, color: "#c8a84b", lineHeight: 1.5 }}>{read.watch_now}</div>
                      </div>
                      {read.fades_when && (
                        <div style={{ fontSize: 10, color: "#333", lineHeight: 1.4 }}>
                          <span style={{ color: "#555", fontWeight: 700 }}>Fades when: </span>{read.fades_when}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Tap hint */}
                  {read && (
                    <div style={{ marginTop: 6, display: "flex", justifyContent: "flex-end" }}>
                      <span style={{ fontSize: 10, fontWeight: 700, color: isOpen ? "#555" : "#ffd700", background: isOpen ? "transparent" : "rgba(255,215,0,.08)", border: isOpen ? "none" : "1px solid rgba(255,215,0,.2)", borderRadius: 4, padding: isOpen ? 0 : "2px 8px" }}>
                        {isOpen ? "▲ Hide explanation" : "▼ What does this mean?"}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        );
      })()}
      {data.imminent && data.imminent.length > 0 && (
        <div>
          <div style={{ fontSize: 9, color: "#ffd700", letterSpacing: 2, fontWeight: 700, marginBottom: 9 }}>
            TODAY'S HIGH-IMPACT EVENTS ({data.imminent.length})
          </div>
          {data.imminent.map((ev, i) => (
            <div key={i} onClick={() => ev.passed && postReads[i] && setOpenReads(p => ({ ...p, [i]: !p[i] }))} style={{ background: ev.passed ? "rgba(0,212,255,.04)" : "rgba(255,215,0,.05)", border: "1px solid " + (ev.passed ? "rgba(0,212,255,.15)" : "rgba(255,215,0,.15)"), borderLeft: "3px solid " + (ev.passed && postReads[i] ? (VERDICT_STYLE[postReads[i].verdict] || VERDICT_STYLE.NEUTRAL).color : ev.passed ? "#00d4ff" : "rgba(255,215,0,.5)"), borderRadius: "0 8px 8px 0", padding: "11px 13px", marginBottom: 7, cursor: ev.passed && postReads[i] ? "pointer" : "default" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8 }}>
                <div style={{ flex: 1 }}>
                  {ev.passed && <div style={{ fontSize: 8, color: "#00d4ff", fontWeight: 700, letterSpacing: 1.5, marginBottom: 4 }}>RELEASED</div>}
                  <div style={{ fontSize: 13, color: ev.passed ? "#c0d0e0" : "#e0e0e0", fontWeight: 600 }}>{ev.event}</div>
                </div>
                <div style={{ textAlign: "right", flexShrink: 0 }}>
                  {ev.time_est && <div style={{ fontSize: 11, color: ev.passed ? "#00d4ff" : "#ffd700", fontWeight: 700 }}>{ev.time_est.replace(/ (EST|EDT|ET)$/i, "")} ET</div>}
                  <div style={{ fontSize: 10, color: ev.passed ? "#00d4ff" : "#888", marginTop: 2, opacity: 0.6 }}>
                    {ev.passed ? "released" : ev.due_in ? ev.due_in.replace(/^in\s+/i, "").replace(/^(\d)/, "in $1") : ""}
                  </div>
                </div>
              </div>
              {/* Pre-release: show expected impact */}
              {ev.expected_impact && !ev.passed && (
                <div style={{ fontSize: 11, color: "#555", marginTop: 6, lineHeight: 1.5, paddingTop: 6, borderTop: "1px solid rgba(255,215,0,.08)" }}>
                  {ev.expected_impact}
                </div>
              )}
              {/* Post-release: collapsible read */}
              {ev.passed && postLoading[i] && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#444", fontStyle: "italic" }}>Analysing release...</div>
              )}
              {ev.passed && postReads[i] && !openReads[i] && (
                <div style={{ marginTop: 6, fontSize: 11, color: "#888" }}>{postReads[i].headline}</div>
              )}
              {ev.passed && postReads[i] && openReads[i] && (
                <div style={{ marginTop: 10, paddingTop: 10, borderTop: "1px solid rgba(255,255,255,.06)" }}>
                  <div style={{ fontSize: 8, color: "#444", letterSpacing: 1.5, fontWeight: 700, marginBottom: 4 }}>WHAT IT MEANS FOR THIS SESSION</div>
                  <div style={{ fontSize: 13, color: "#c8d6e5", lineHeight: 1.75, background: "rgba(0,0,0,.25)", padding: 11, borderRadius: 6, marginBottom: 10 }}>{postReads[i].session_impact}</div>
                  <div style={{ padding: "8px 10px", background: "rgba(255,215,0,.05)", border: "1px solid rgba(255,215,0,.15)", borderRadius: 6 }}>
                    <div style={{ fontSize: 8, color: "#ffd700", letterSpacing: 1.5, fontWeight: 700, marginBottom: 3 }}>WATCH NOW</div>
                    <div style={{ fontSize: 11, color: "#c8a84b", lineHeight: 1.5 }}>{postReads[i].watch_now}</div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
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
      {/* ── ASK A QUESTION ── */}
      <div style={{ marginTop: 28, borderTop: "1px solid rgba(255,255,255,.06)", paddingTop: 24 }}>
        <div style={{ fontSize: 14, fontWeight: 700, color: "#f0f0f0", marginBottom: 4 }}>Ask a Macro Question</div>
        <div style={{ fontSize: 12, color: "#444", marginBottom: 14 }}>Don't understand a term or concept? Ask and get a plain-English explanation.</div>
        <LearnAsk />
      </div>
    </div>
  );
}

function LearnAsk() {
  const [question, setQuestion] = React.useState("");
  const [answer, setAnswer] = React.useState(null);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState(null);
  const EXAMPLES = ["What does hawkish mean?", "What is yield curve inversion?", "Why does the dollar affect Gold?", "What is risk-off sentiment?", "What is quantitative tightening?"];
  const ask = async () => {
    const q = question.trim();
    if (!q) return;
    setLoading(true); setError(null); setAnswer(null);
    try {
      const res = await fetch("/api/brief", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 400,
          system: "You are a macro trading educator. Answer the question in plain English as if explaining to a retail trader with no finance background. Be concise - 3 to 5 sentences max. No jargon without explanation. No bullet points - write in flowing sentences. Never give financial advice or price predictions.",
          messages: [{ role: "user", content: "Explain this macro trading concept in plain English: " + q }]
        })
      });
      const data = await res.json();
      const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      if (text) setAnswer(text);
      else throw new Error("No response");
    } catch(e) {
      setError("Could not get an answer. Please try again.");
    }
    setLoading(false);
  };
  return (
    <div>
      <div style={{ display: "flex", gap: 8, marginBottom: 10 }}>
        <input
          value={question}
          onChange={e => { setQuestion(e.target.value); setAnswer(null); setError(null); }}
          onKeyDown={e => e.key === "Enter" && ask()}
          placeholder="e.g. What does hawkish mean?"
          style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(192,132,252,.2)", borderRadius: 8, color: "#e0e0e0", fontSize: 13, padding: "10px 13px", outline: "none", fontFamily: "inherit", minWidth: 0 }}
        />
        <button onClick={ask} disabled={loading || !question.trim()} style={{ padding: "10px 16px", borderRadius: 8, border: "none", cursor: loading || !question.trim() ? "not-allowed" : "pointer", background: loading || !question.trim() ? "rgba(192,132,252,.08)" : "rgba(192,132,252,.15)", color: loading || !question.trim() ? "#555" : "#c084fc", fontSize: 12, fontWeight: 700, fontFamily: "inherit", whiteSpace: "nowrap" }}>
          {loading ? "…" : "Ask"}
        </button>
      </div>
      <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 14 }}>
        {EXAMPLES.map(ex => (
          <button key={ex} onClick={() => { setQuestion(ex); setAnswer(null); }} style={{ fontSize: 10, padding: "3px 9px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: "rgba(192,132,252,.05)", border: "1px solid rgba(192,132,252,.15)", color: "#666" }}>{ex}</button>
        ))}
      </div>
      {loading && <div style={{ padding: "14px 0", fontSize: 12, color: "#555" }}>Thinking…</div>}
      {error && <div style={{ fontSize: 12, color: "#ff4757" }}>{error}</div>}
      {answer && (
        <div style={{ background: "rgba(192,132,252,.06)", border: "1px solid rgba(192,132,252,.2)", borderRadius: 10, padding: "14px 16px" }}>
          <div style={{ fontSize: 9, color: "#c084fc", letterSpacing: 1.5, fontWeight: 700, marginBottom: 8 }}>EXPLANATION</div>
          <div style={{ fontSize: 13, color: "#d4b8f7", lineHeight: 1.8 }}>{answer}</div>
        </div>
      )}
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

  const { increment, canBrief, remaining, isOnTrial, effectivelyPro } = useUsage(user?.id, isPro, user);
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState("brief");
  const [mode, setMode] = useState("full");
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [inst, setInst] = useState(null);
  const [error, setError] = useState(null);
  // Cache results per mode so switching modes doesn't re-run brief
  const [dataCache, setDataCache] = useState({}); // { full: {inst, data}, scalper: {inst, data} }
  // Global macro context  -  set when any Full Brief is generated
  // Passed to Stocks tab for sector impact intelligence
  const [globalMacroContext, setGlobalMacroContext] = useState(null);
  // EarningsWatch: fetched once at app level, survives tab switches
  const [ewData, setEwData] = useState(null);
  const [ewImplications, setEwImplications] = useState({});
  const [ewLoading, setEwLoading] = useState(false);
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
  const [rawCalendarEvents, setRawCalendarEvents] = useState([]);
  const [alertsEnabled, setAlertsEnabled] = useState(() => {
    try { return localStorage.getItem("md_alerts_enabled") === "true"; } catch(e) { return false; }
  });
  const [newAlertBanner, setNewAlertBanner] = useState(null); // headline string or null
  const [pushSupported, setPushSupported] = useState(false);
  const [postSessionLoading, setPostSessionLoading] = useState(false);
  const [postSessionError, setPostSessionError] = useState(null);
  const [breakingHeadline, setBreakingHeadline] = useState("");
  const [breakingData, setBreakingData] = useState(null);
  const [breakingLoading, setBreakingLoading] = useState(false);
  const [breakingError, setBreakingError] = useState(null);
  const [narrativeFeed, setNarrativeFeed] = useState(() => {
    try {
      const stored = localStorage.getItem("md_narrative_feed");
      if (stored) {
        const { date, feed } = JSON.parse(stored);
        const today = new Date().toISOString().slice(0, 10);
        // Only use cache if it has actual content (not empty from error period)
        if (date === today && Array.isArray(feed) && feed.length > 0) return feed;
      }
    } catch(e) {}
    return [];
  });
  const [feedLoading, setFeedLoading] = useState(false);
  const [lastFetchCount, setLastFetchCount] = useState(null);
  const [feedLastFetched, setFeedLastFetched] = useState(() => {
    try {
      const stored = localStorage.getItem("md_narrative_feed_ts");
      if (stored) {
        const { date, ts } = JSON.parse(stored);
        const today = new Date().toISOString().slice(0, 10);
        if (date === today) return new Date(ts);
      }
    } catch(e) {}
    return null;
  });
  const [selectedNarrative, setSelectedNarrative] = useState(null);
  const [scalperStockLoading, setScalperStockLoading] = useState(false);
  const [scalperStockError, setScalperStockError] = useState(null);

  const triggerUpgrade = (reason = "limit") => { setUpgradeReason(reason); setShowUpgrade(true); };

  const run = async (q, m) => {
    if (!canBrief) { triggerUpgrade("limit"); return; }
    const mm = m !== undefined ? m : mode;
    if (mm === "scalper" && !effectivelyPro) { triggerUpgrade("scalper"); return; }
    const found = detect(q);

    // ── STOCK INTERCEPT ──────────────────────────────────────────────────────
    // If the query looks like a stock/equity, don't run a macro brief.
    // Route Pro users to the Stocks tab, show upgrade modal for free users.
    if (found && found.key === "equity") {
      if (isPro) {
        // Pre-fill the stock search and switch to Stocks tab
        setStockQuery(q);
        setTab("stocks"); // Route to stocks tab
      } else {
        triggerUpgrade("stocks");
      }
      return;
    }
    // ────────────────────────────────────────────────────────────────────────

    if (!found) { setError("Instrument not recognised. Try: ES, NQ, Euro, Gold, GBP, Oil, BTC"); return; }
    setInst(found); setLoading(true); setError(null); setData(null);
    try {
      // For scalper mode, fetch live calendar first and inject into the brief
      let calendarEvents = [];
      if (mm === "scalper") {
        try {
          const calRes = await fetch("/api/calendar");
          const calData = await calRes.json();
          calendarEvents = calData.events || [];
          setRawCalendarEvents(calendarEvents);
        } catch(e) {
          console.warn("Calendar fetch failed, falling back to Claude knowledge:", e.message);
        }
      }
      const result = await getBriefing(found, mm, calendarEvents);
      setData(result);
      setDataCache(prev => ({ ...prev, [mm]: { inst: found, data: result } }));
      setTab("brief"); // Show brief results
      increment();
      // Store macro context globally for Stocks tab sector intelligence
      if (mm === "full" && result) {
        setGlobalMacroContext({
          instrument: found.label,
          macro_theme: result.macro_theme || result.headline_summary || "",
          geopolitical: result.geopolitical_risks || "",
          headline: result.headline_summary || "",
          timestamp: Date.now(),
        });
      }
    } catch (e) { setError(e.message || "Fetch failed. Please try again."); }
    finally { setLoading(false); }
  };

  // Check push support on mount
  React.useEffect(() => {
    const supported = "serviceWorker" in navigator && "PushManager" in window;
    setPushSupported(supported);
  }, []);

  // EarningsWatch: fetch once on mount, never again for this session
  React.useEffect(() => {
    if (ewData !== null || ewLoading) return; // already fetched or in flight
    setEwLoading(true);
    fetch("/api/earnings-watch")
      .then(r => r.json())
      .then(async d => {
        setEwData(d);
        setEwLoading(false);
        // Pre-generate AI implications for non-pending prev movers
        if (d.prevMovers && d.prevMovers.length > 0) {
          const impls = {};
          await Promise.all(
            d.prevMovers.filter(m => !m.pending && m.beat != null).map(async m => {
              try {
                const beatStr = m.beat ? "beat" : "missed";
                const surpriseStr = m.surprise != null ? ` by ${Math.abs(m.surprise)}%` : "";
                const sys = "You are a macro market analyst. Respond ONLY with valid JSON. No markdown. Schema: {\"implication\":\"string\",\"index_impact\":\"string\"}";
                const msg = `${m.name} (${m.ticker}) ${beatStr} earnings estimates${surpriseStr}. In one sentence each: (1) implication for the sector and related stocks, (2) likely impact on ES/NQ/index futures at the open. No price levels.`;
                const impl = await callClaude(sys, msg, 200);
                if (impl) impls[m.ticker] = impl;
              } catch(e) {}
            })
          );
          setEwImplications(impls);
        }
      })
      .catch(() => {
        setEwData({ reportingToday: [], prevMovers: [] });
        setEwLoading(false);
      });
  }, []);

  // Auto-fetch handled by server cron (narratives-cron.js) - no client polling needed

  const switchMode = (m) => {
    if (m === "scalper" && !effectivelyPro) { triggerUpgrade("scalper"); return; }
    setMode(m);
    setTab("brief"); // Always return to brief view when tapping mode buttons
    // Restore cached result for this mode if same instrument
    const cached = dataCache[m];
    if (cached && inst && cached.inst.key === inst.key) {
      setData(cached.data);
      setError(null);
      setTab("brief"); // Show brief results
    } else if (inst && (!cached || cached.inst.key !== inst.key)) {
      // Different instrument or no cache - run fresh
      run(inst.label, m);
    }
    // If no instrument yet, just switch mode - nothing to run
  };

  // Tabs  -  Options Flow removed until API is ready
  const TABS = [
    { id: "stocks",   label: "Stocks" },
    { id: "breaking", label: "⚡ Breaking", pro: true },
    { id: "learn",    label: "Learn" }
  ];

  return (
    <>
      <style>{`*, *::before, *::after { box-sizing: border-box; } html, body { margin: 0; padding: 0; height: 100%; overscroll-behavior: none; -webkit-overflow-scrolling: touch; background: #0a0c0f; } textarea { box-sizing: border-box; } @supports (padding-top: env(safe-area-inset-top)) { .safe-top { padding-top: env(safe-area-inset-top) !important; } .safe-bottom { padding-bottom: calc(60px + env(safe-area-inset-bottom)) !important; } } @media (max-width: 480px) { .main-content { padding: 14px 14px 60px !important; } .header-inner { padding: 14px 14px 0 !important; } } @keyframes md-ping { 0% { transform: scale(1); opacity: .8; } 100% { transform: scale(2.2); opacity: 0; } }`}</style>
      {showUpgrade && <UpgradeModal reason={upgradeReason} onClose={() => setShowUpgrade(false)} userId={user?.id} email={user?.primaryEmailAddress?.emailAddress} isOnTrial={isOnTrial} trialExpired={!isPro && !isOnTrial && !!user?.publicMetadata?.signup_at} />}

      {/* ── BRIEF LOADING OVERLAY  -  keeps user in app during fetch ── */}
      {loading && (
        <div style={{
          position: "fixed", inset: 0, zIndex: 9999,
          background: "rgba(6,14,14,.94)",
          display: "flex", flexDirection: "column",
          alignItems: "center", justifyContent: "center",
          gap: 24, padding: 32,
        }}>
          <div style={{ position: "relative", width: 72, height: 72 }}>
            <div style={{ position: "absolute", inset: 0, borderRadius: "50%", border: "2px solid rgba(0,212,255,.15)", animation: "md-ping 1.6s cubic-bezier(0,0,.2,1) infinite" }} />
            <div style={{ position: "absolute", inset: 8, borderRadius: "50%", border: "2px solid rgba(0,212,255,.25)", animation: "md-ping 1.6s cubic-bezier(0,0,.2,1) infinite .4s" }} />
            <div style={{ position: "absolute", inset: 18, borderRadius: "50%", background: "rgba(0,212,255,.1)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18 }}>⚡</div>
          </div>
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 11, color: "#00d4ff", letterSpacing: 2, fontWeight: 700, fontFamily: "monospace", marginBottom: 8 }}>MARKETDEBRIEFS</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: "#fff", marginBottom: 6 }}>Generating brief…</div>
            <div style={{ fontSize: 12, color: "#555", marginBottom: 20 }}>{inst?.label || "Loading macro context"}</div>
            <div style={{
              padding: "12px 20px",
              background: "rgba(255,165,0,.06)",
              border: "1px solid rgba(255,165,0,.18)",
              borderRadius: 10,
              maxWidth: 260, margin: "0 auto",
            }}>
              <div style={{ fontSize: 12, color: "#ffa500", fontWeight: 700, marginBottom: 4 }}>⚠️ Stay in this tab</div>
              <div style={{ fontSize: 11, color: "#444", lineHeight: 1.6 }}>Leaving the app will interrupt the brief and cause it to fail</div>
            </div>
          </div>
        </div>
      )}
      <div style={{ minHeight: "100vh", background: "#0a0c0f", color: "#e0e0e0", fontFamily: "Inter, system-ui, sans-serif" }}>
        <div className="header-inner safe-top" style={{ background: "linear-gradient(180deg,#0d1117,#0a0c0f)", borderBottom: "1px solid rgba(255,255,255,.06)", padding: "16px 20px 0", position: "sticky", top: 0, zIndex: 100 }}>
          <div style={{ maxWidth: 860, margin: "0 auto", width: "100%" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 13 }}>
              <div onClick={() => navigate("/")} style={{ cursor: "pointer" }}>
                <div style={{ fontSize: 16, fontWeight: 800, letterSpacing: "-0.5px", color: "#fff" }}>MARKET BRIEF</div>
                <div style={{ fontSize: 9, color: "#555", letterSpacing: 2, fontFamily: "monospace" }}>INTELLIGENCE  -  EVENTS  -  BREAKING  -  STOCKS</div>
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {!isPro && <button onClick={() => triggerUpgrade("limit")} style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: remaining <= 1 ? "rgba(255,71,87,.1)" : "rgba(255,255,255,.03)", border: "1px solid " + (remaining <= 1 ? "rgba(255,71,87,.3)" : "rgba(255,255,255,.07)"), color: remaining <= 1 ? "#ff4757" : "#333", cursor: "pointer", fontFamily: "inherit", fontWeight: 700 }}>{remaining} left</button>}
                {isPro && !isOnTrial && <span style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: "rgba(0,212,255,.08)", border: "1px solid rgba(0,212,255,.2)", color: "#00d4ff", fontWeight: 700 }}>PRO</span>}
                {isOnTrial && (
                  <span
                    onClick={() => triggerUpgrade("trial")}
                    style={{ fontSize: 9, padding: "3px 8px", borderRadius: 4, background: "rgba(245,158,11,.1)", border: "1px solid rgba(245,158,11,.3)", color: "#f59e0b", fontWeight: 700, cursor: "pointer" }}>
                    TRIAL
                  </span>
                )}
                <span style={{ fontSize: 9, fontFamily: "monospace", color: "#666", letterSpacing: 1 }}>
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
                <button onClick={() => navigate("/help")} style={{ fontSize: 9, fontFamily: "monospace", color: "#222", padding: "3px 7px", border: "1px solid #2a2a2a", borderRadius: 4, background: "none", cursor: "pointer" }}>HELP</button>
                <button onClick={() => signOut({ redirectUrl: "/" })} style={{ fontSize: 9, fontFamily: "monospace", color: "#666", padding: "3px 7px", border: "1px solid #444", borderRadius: 4, background: "none", cursor: "pointer" }}>SIGN OUT</button>
              </div>
            </div>
            <div style={{ display: "flex", gap: 6, marginBottom: 11 }}>
              {[{ id: "full", label: "Full Brief", sub: "Pre-trade research" }, { id: "scalper", label: "Events Brief", sub: effectivelyPro ? "Event impact before you enter" : "Pro only 🔒" }].map(m => (
                <button key={m.id} onClick={() => switchMode(m.id)} style={{ flex: 1, padding: "10px 10px", minHeight: 44, borderRadius: 7, cursor: "pointer", fontFamily: "inherit", background: mode === m.id ? "rgba(0,212,255,.1)" : "rgba(255,255,255,.02)", border: mode === m.id ? "1px solid rgba(0,212,255,.25)" : "1px solid rgba(255,255,255,.05)", color: mode === m.id ? "#00d4ff" : (m.id === "scalper" && !effectivelyPro ? "#2a2a2a" : "#444") }}>
                  <div style={{ fontSize: 11, fontWeight: 700 }}>{m.label}</div>
                  <div style={{ fontSize: 9, marginTop: 2, opacity: 0.7 }}>{m.sub}</div>
                </button>
              ))}
            </div>
            <div style={{ display: "flex", gap: 7, marginBottom: 11 }}>
              <input value={query} onChange={e => setQuery(e.target.value)} onKeyDown={e => e.key === "Enter" && run(query.trim())} placeholder={mode === "scalper" ? "ES, NQ, CL, GC, 6E…" : "Euro, Gold, GBP, ES, NQ, Oil, BTC…"} style={{ flex: 1, background: "rgba(255,255,255,.04)", border: "1px solid rgba(255,255,255,.09)", borderRadius: 8, color: "#e0e0e0", fontSize: 14, padding: "10px 13px", outline: "none", fontFamily: "inherit", minWidth: 0 }} />
              <button onClick={() => run(query.trim())} disabled={loading} style={{ padding: "12px 16px", minHeight: 44, borderRadius: 8, cursor: loading ? "not-allowed" : "pointer", background: loading ? "rgba(255,255,255,.02)" : "rgba(0,212,255,.1)", color: loading ? "#2a2a2a" : "#00d4ff", border: "1px solid rgba(0,212,255,.2)", fontSize: 12, fontWeight: 700, whiteSpace: "nowrap", fontFamily: "inherit" }}>{loading ? "…" : "BRIEF ME"}</button>
            </div>
            <div style={{ display: "flex", gap: 5, marginBottom: 13, flexWrap: "wrap" }}>
              {CHIPS.map(({ label, key }) => (<button key={key} onClick={() => { setQuery(label); setTab("brief"); run(label); }} style={{ fontSize: 11, padding: "3px 9px", borderRadius: 4, cursor: "pointer", fontFamily: "inherit", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", color: "#444" }}>{label}</button>))}
            </div>
            <div style={{ display: "flex", overflowX: "auto" }}>
              {TABS.map(t => (
                <button key={t.id} onClick={() => {
                  setTab(t.id);
                  if (t.id === "breaking" && isPro) {
                    const isStale = !feedLastFetched || (Date.now() - new Date(feedLastFetched).getTime()) > 14 * 60 * 1000;
                    if (narrativeFeed.length === 0 || isStale) {
                      setFeedLoading(true);
                      fetch("/api/narratives")
                        .then(r => r.json())
                        .then(d => {
                          if (d.narratives?.length > 0) {
                            setNarrativeFeed(prev => {
                              const existingIds = new Set(prev.map(n => n.id));
                              const newOnes = d.narratives.filter(n => !existingIds.has(n.id));
                              setLastFetchCount(newOnes.length);
                              const merged = [...newOnes, ...prev].slice(0, 40);
                              const updated = [...merged.filter(n => n.political_alert), ...merged.filter(n => !n.political_alert)];
                              const today = new Date().toISOString().slice(0, 10);
                              try { localStorage.setItem("md_narrative_feed", JSON.stringify({ date: today, feed: updated })); } catch(e) {}
                              return updated;
                            });
                            const now = new Date();
                            setFeedLastFetched(now);
                            try { localStorage.setItem("md_narrative_feed_ts", JSON.stringify({ date: new Date().toISOString().slice(0,10), ts: now.toISOString() })); } catch(e) {}
                          }
                        })
                        .catch(() => {})
                        .finally(() => setFeedLoading(false));
                    }
                  }
                }} style={{ flex: 1, minWidth: 60, padding: "11px 4px", minHeight: 44, border: "none", background: "transparent", cursor: "pointer", fontFamily: "inherit", fontSize: 11, fontWeight: tab === t.id ? 700 : 400, color: tab === t.id ? "#00d4ff" : "#333", borderBottom: "2px solid " + (tab === t.id ? "#00d4ff" : "transparent"), whiteSpace: "nowrap" }}>
                  {t.label}
                  {t.id === "stocks" && !effectivelyPro && <span style={{ marginLeft: 3, fontSize: 8 }}>🔒</span>}
                  {t.id === "stocks" && effectivelyPro && <span style={{ marginLeft: 4, fontSize: 8, color: "#f59e0b", opacity: 0.6 }}>●</span>}
                  {t.id === "breaking" && !effectivelyPro && <span style={{ marginLeft: 3, fontSize: 8 }}>🔒</span>}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="main-content safe-bottom" style={{ maxWidth: 860, margin: "0 auto", padding: "20px 20px 60px", width: "100%" }}>
          {/* Trial expiry banner - shows once per session when trial just ended */}
          {!isPro && !isOnTrial && user?.publicMetadata?.signup_at && (() => {
            const dismissed = (() => { try { return sessionStorage.getItem("md_trial_banner_dismissed") === "true"; } catch(e) { return false; } })();
            if (dismissed) return null;
            return (
              <div style={{ marginBottom: 14, padding: "12px 16px", borderRadius: 9, background: "rgba(245,158,11,.08)", border: "1px solid rgba(245,158,11,.25)", display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 12 }}>
                <div>
                  <div style={{ fontSize: 11, fontWeight: 700, color: "#f59e0b", marginBottom: 3 }}>Your 7-day trial has ended</div>
                  <div style={{ fontSize: 11, color: "#888", lineHeight: 1.5 }}>Upgrade to keep knowing the macro before every trade.</div>
                </div>
                <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                  <button onClick={() => triggerUpgrade("trial_expired")} style={{ fontSize: 10, fontWeight: 700, color: "#f59e0b", background: "rgba(245,158,11,.12)", border: "1px solid rgba(245,158,11,.3)", borderRadius: 6, padding: "5px 11px", cursor: "pointer", fontFamily: "inherit" }}>Upgrade</button>
                  <button onClick={() => { try { sessionStorage.setItem("md_trial_banner_dismissed", "true"); } catch(e) {} const el = document.getElementById("md-trial-banner"); if (el) el.style.display = "none"; }} style={{ fontSize: 10, color: "#444", background: "none", border: "none", cursor: "pointer", fontFamily: "inherit", padding: "5px 8px" }}>x</button>
                </div>
              </div>
            );
          })()}
          {/* Brief results always visible above other tabs */}
          <div style={{ display: tab === "stocks" || tab === "breaking" || tab === "learn" ? "none" : "block" }}>
            {loading && <Loader />}
            {error && <div style={{ color: "#ff4757", padding: "16px 0", fontSize: 13 }}>{error}</div>}
            {!loading && !error && !data && !inst && (
              <div style={{ textAlign: "center", padding: "56px 20px" }}>
                <div style={{ fontSize: 44, marginBottom: 14 }}>+</div>
                <div style={{ fontSize: 14, color: "#444", marginBottom: 7 }}>{mode === "scalper" ? "Enter your futures contract for a live risk check" : "Enter any instrument for your briefing"}</div>
                <div style={{ fontSize: 11, color: "#555" }}>{mode === "scalper" ? "ES · NQ · CL · GC · 6E · RTY · YM" : "Euro · Gold · Silver · Oil · BTC · NQ"}</div>
              </div>
            )}
            {!loading && data && inst && mode === "full" && <FullView inst={inst} data={data} />}
            {!loading && data && inst && mode === "scalper" && <ScalperView inst={inst} data={data} rawCalendar={rawCalendarEvents} />}
            {!loading && data && inst && (
              <div style={{ marginTop: 20, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
                <button onClick={() => { setPostSessionData(null); setShowShareCard(true); }} style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "10px 18px", borderRadius: 8, border: "1px solid rgba(0,212,255,.2)", background: "rgba(0,212,255,.06)", color: "#00d4ff", fontSize: 12, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                  {mode === "scalper" ? "📋 Upcoming Events Card" : "☀️ Pre-Session Card"}
                </button>
                <button
                  onClick={async () => {
                    setPostSessionLoading(true);
                    setPostSessionError(null);
                    try {
                      // Events Brief mode: generate session summary of what fired
                      if (mode === "scalper") {
                        // Fetch calendar inline if rawCalendarEvents is empty
                        let calEvents = rawCalendarEvents;
                        if (!calEvents || calEvents.length === 0) {
                          try {
                            const cr = await fetch("/api/calendar");
                            const cd = await cr.json();
                            calEvents = cd.events || [];
                            setRawCalendarEvents(calEvents);
                          } catch(e) { calEvents = []; }
                        }
                        const releasedUS = calEvents.filter(ev =>
                          ev.passed && ev.country === "US" && (ev.impact === "high" || ev.impact === "medium")
                        );
                        const result = await getEventSessionSummary(inst, releasedUS);
                        setPostSessionData({ ...result, _isEventSummary: true });
                        setShowShareCard(true);
                        setPostSessionLoading(false);
                        return;
                      }
                      // Full Brief mode: fetch price and generate macro post-session
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
                  {postSessionLoading ? "Generating…" : mode === "scalper" ? "📊 Session Summary Card" : "🌙 Post-Session Card"}
                </button>
              </div>
            )}
            {postSessionError && <div style={{ marginTop: 8, textAlign: "center", fontSize: 11, color: "#ff4757" }}>{postSessionError}</div>}
            {showShareCard && tab !== "breaking" && data && inst && (
              <ShareCard
                inst={inst}
                data={postSessionData || data}
                mode={mode}
                cardType={postSessionData?._isEventSummary ? "event-summary" : mode === "scalper" ? "scalper" : "macro"}
                isPostSessionBrief={!!postSessionData && !postSessionData._isEventSummary}
                isEventSummary={!!postSessionData?._isEventSummary}
                onClose={() => { setShowShareCard(false); }}
              />
            )}

          </div>
          {tab === "stocks" && (
            // Both Full Brief and Scalper Mode are now supported in the Stocks tab
            false ? null : effectivelyPro
                ? <StocksTab
                    query={stockQuery} setQuery={setStockQuery}
                    data={stockData} setData={setStockData}
                    macroContext={globalMacroContext}
                    loading={stockLoading} setLoading={setStockLoading}
                    error={stockError} setError={setStockError}
                    mode={mode}
                    scalperData={scalperStockData} setScalperData={setScalperStockData}
                    scalperLoading={scalperStockLoading} setScalperLoading={setScalperStockLoading}
                    scalperError={scalperStockError} setScalperError={setScalperStockError}
                    ewData={ewData} ewImplications={ewImplications} ewLoading={ewLoading}
                    onShareCard={async (d, ct, q, sessionType) => {
                      if (sessionType === "post") {
                        // Generate post-session brief for the equity
                        setPostSessionLoading(true);
                        setPostSessionError(null);
                        try {
                          let priceContext = null;
                          try {
                            const fhKey = "";
                            const sym = (q || d.ticker || "").toUpperCase().trim();
                            if (sym) {
                              const now2 = Math.floor(Date.now()/1000);
                              const from2 = now2 - 7*24*3600;
                              const pr = await fetch(`https://finnhub.io/api/v1/stock/candle?symbol=${sym}&resolution=D&from=${from2}&to=${now2}&token=${fhKey}`);
                              if (pr.ok) {
                                const pd = await pr.json();
                                if (pd.c?.length >= 2) {
                                  const pct2 = ((pd.c[pd.c.length-1] - pd.c[pd.c.length-2]) / pd.c[pd.c.length-2] * 100).toFixed(2);
                                  priceContext = { pct: (pct2>=0?"+":"")+pct2+"%", direction: pct2>=0?"UP":"DOWN" };
                                }
                              }
                            }
                          } catch(e) {}
                          const inst2 = { label: d.instrument || q || d.ticker || "Equity", key: "equity" };
                          const postResult = await getPostSessionBrief(inst2, priceContext);
                          if (priceContext) postResult._priceContext = priceContext;
                          setPostSessionData(postResult);
                          setShowShareCard(true);
                        } catch(e) {
                          setPostSessionError("Post-session brief failed. Try again.");
                        }
                        setPostSessionLoading(false);
                      } else {
                        setShowShareCard(true);
                        setEquityShareData({ data: d, cardType: ct, query: q });
                      }
                    }}
                  />
                : <StockGate onUpgrade={() => triggerUpgrade("stocks")} />
          )}

          {tab === "breaking" && (
            <div style={{ paddingBottom: 40 }}>
              {!effectivelyPro && <BreakingGate onUpgrade={() => triggerUpgrade("breaking")} />}
              {effectivelyPro && <>

              {/* ── IN-APP ALERT BANNER ── */}
              {newAlertBanner && (
                <div onClick={() => setNewAlertBanner(null)} style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 9999, background: "#ff4757", padding: "11px 16px", display: "flex", alignItems: "center", gap: 10, cursor: "pointer", boxShadow: "0 2px 12px rgba(255,71,87,.4)" }}>
                  <span style={{ fontSize: 16 }}>🚨</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 10, fontWeight: 800, color: "white", letterSpacing: 1, marginBottom: 1 }}>BREAKING ALERT</div>
                    <div style={{ fontSize: 11, color: "rgba(255,255,255,.9)", lineHeight: 1.3 }}>{newAlertBanner}</div>
                  </div>
                  <span style={{ fontSize: 11, color: "rgba(255,255,255,.6)" }}>x</span>
                </div>
              )}

              {/* ── NOTIFICATION OPT-IN/OUT STRIP ── */}
              {pushSupported && (
                <div style={{ marginBottom: 14, padding: "12px 14px", background: alertsEnabled ? "rgba(0,212,255,.06)" : "rgba(255,255,255,.02)", border: "1px solid " + (alertsEnabled ? "rgba(0,212,255,.2)" : "rgba(255,255,255,.07)"), borderRadius: 10, display: "flex", alignItems: "center", gap: 12 }}>
                  {/* Text */}
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 11, fontWeight: 700, color: alertsEnabled ? "#00d4ff" : "#888", marginBottom: 2 }}>
                      {alertsEnabled ? "🔔 Breaking alerts ON" : "🔕 Breaking alerts OFF"}
                    </div>
                    <div style={{ fontSize: 10, color: "#555", lineHeight: 1.4 }}>
                      {alertsEnabled
                        ? "You'll be notified for political alerts and high-impact breaking narratives."
                        : "Get notified for political alerts and high-impact breaking narratives."}
                    </div>
                  </div>
                  {/* Toggle switch */}
                  <button
                    onClick={async () => {
                      if (alertsEnabled) {
                        // UNSUBSCRIBE
                        try {
                          const reg = await navigator.serviceWorker.ready;
                          const sub = await reg.pushManager.getSubscription();
                          if (sub) {
                            await fetch("/api/push-subscribe", {
                              method: "DELETE",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ endpoint: sub.endpoint }),
                            });
                            await sub.unsubscribe();
                          }
                        } catch(e) { console.error("Unsubscribe failed:", e); }
                        setAlertsEnabled(false);
                        try { localStorage.setItem("md_alerts_enabled", "false"); } catch(e) {}
                      } else {
                        // SUBSCRIBE
                        try {
                          const permission = await Notification.requestPermission();
                          if (permission !== "granted") {
                            alert("To receive alerts, enable notifications for this site in your browser or phone settings.");
                            return;
                          }
                          const reg = await navigator.serviceWorker.ready;
                          const vapidKey = document.querySelector("meta[name=vapid-public-key]")?.content;
                          if (!vapidKey) {
                            setAlertsEnabled(true);
                            try { localStorage.setItem("md_alerts_enabled", "true"); } catch(e) {}
                            return;
                          }
                          const sub = await reg.pushManager.subscribe({
                            userVisibleOnly: true,
                            applicationServerKey: vapidKey,
                          });
                          await fetch("/api/push-subscribe", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({ subscription: sub.toJSON() }),
                          });
                          setAlertsEnabled(true);
                          try { localStorage.setItem("md_alerts_enabled", "true"); } catch(e) {}
                        } catch(e) {
                          console.error("Subscribe failed:", e);
                          if (e.name === "NotAllowedError") {
                            alert("Notification permission denied. Go to your browser or phone Settings to allow notifications for this site.");
                          }
                        }
                      }
                    }}
                    style={{
                      position: "relative",
                      width: 48,
                      height: 28,
                      borderRadius: 14,
                      background: alertsEnabled ? "#00d4ff" : "rgba(255,255,255,.1)",
                      border: "1px solid " + (alertsEnabled ? "rgba(0,212,255,.6)" : "rgba(255,255,255,.15)"),
                      cursor: "pointer",
                      transition: "background .25s ease, border .25s ease",
                      flexShrink: 0,
                      padding: 0,
                      outline: "none",
                      WebkitAppearance: "none",
                      appearance: "none",
                    }}
                  >
                    {/* Thumb */}
                    <div style={{
                      position: "absolute",
                      top: 3,
                      left: alertsEnabled ? 23 : 3,
                      width: 20,
                      height: 20,
                      borderRadius: "50%",
                      background: alertsEnabled ? "#000" : "#555",
                      boxShadow: "0 1px 4px rgba(0,0,0,.4)",
                      transition: "left .25s ease, background .25s ease",
                    }} />
                  </button>
                </div>
              )}
              {/* ── LIVE FEED ── */}
              <div style={{ marginBottom: 24 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                    <div style={{ fontSize: 11, color: "#ff4757", letterSpacing: 2, fontWeight: 700 }}>📰 TODAY'S NARRATIVES</div>

                  </div>
                  {/* Refresh button only in header row */}
                  {/* Manual refresh - always visible */}
                  <button
                    onClick={async () => {
                      setFeedLoading(true);
                      try {
                        const r = await fetch("/api/narratives?force=true");
                        const d = await r.json();
                        if (d.narratives?.length > 0) {
                          setNarrativeFeed(prev => {
                            const existingIds = new Set(prev.map(n => n.id));
                            const newOnes = d.narratives.filter(n => !existingIds.has(n.id));
                            setLastFetchCount(newOnes.length);
                            const merged = [...newOnes, ...prev].slice(0, 40);
                            const updated = [...merged.filter(n => n.political_alert), ...merged.filter(n => !n.political_alert)];
                            const today = new Date().toISOString().slice(0, 10);
                            try { localStorage.setItem("md_narrative_feed", JSON.stringify({ date: today, feed: updated })); } catch(e) {}
                            return updated;
                          });
                          const now = new Date();
                          setFeedLastFetched(now);
                          try { localStorage.setItem("md_narrative_feed_ts", JSON.stringify({ date: new Date().toISOString().slice(0,10), ts: now.toISOString() })); } catch(e) {}
                        }
                      } catch(e) { console.error(e); }
                      setFeedLoading(false);
                    }}
                    disabled={feedLoading}
                    style={{ fontSize: 10, color: feedLoading ? "#333" : "#ff4757", background: "none", border: "1px solid rgba(255,71,87,.2)", borderRadius: 6, padding: "4px 10px", cursor: feedLoading ? "not-allowed" : "pointer", fontFamily: "inherit" }}>
                    {feedLoading ? "Fetching…" : "↻ Refresh"}
                  </button>
                </div>

                {feedLastFetched && (
                  <div style={{ fontSize: 9, color: "#555", fontFamily: "monospace", marginBottom: 10 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                    <span style={{ fontSize: 9, color: "#555", fontFamily: "monospace" }}>Updated {feedLastFetched.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                    {lastFetchCount !== null && lastFetchCount > 0 && (
                      <span style={{ fontSize: 9, fontWeight: 700, padding: "2px 8px", borderRadius: 10, background: "rgba(0,229,255,.1)", color: "#00e5ff", border: "1px solid rgba(0,229,255,.2)", fontFamily: "monospace" }}>
                        +{lastFetchCount} new
                      </span>
                    )}
                  </div>
                  </div>
                )}

                {/* Feed items */}
                {narrativeFeed.length > 0 ? (
                  <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                    {narrativeFeed.length > 0 && narrativeFeed[0] && !narrativeFeed[0].political_alert && (
                      <div style={{ padding: "7px 12px", background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.1)", borderRadius: 7, fontSize: 10, color: "#00d4ff", display: "flex", justifyContent: "space-between" }}>
                      <div style={{ padding: "7px 12px", background: lastFetchCount > 0 ? "rgba(0,229,255,.06)" : "rgba(255,255,255,.02)", border: "1px solid " + (lastFetchCount > 0 ? "rgba(0,229,255,.15)" : "rgba(255,255,255,.05)"), borderRadius: 7, fontSize: 10, color: lastFetchCount > 0 ? "#00e5ff" : "#333", display: "flex", justifyContent: "space-between" }}>
                        <span>{lastFetchCount > 0 ? `↻ ${lastFetchCount} new ${lastFetchCount === 1 ? "story" : "stories"} fetched` : "↻ Feed up to date"}</span>
                        <span style={{ color: "#555" }}>{narrativeFeed.length} today</span>
                      </div>
                        <span style={{ color: "#555" }}>{narrativeFeed.length} narratives today</span>
                      </div>
                    )}
                    {narrativeFeed.map((n, i) => (
                      <div key={n.id || i}
                        onClick={() => setSelectedNarrative(selectedNarrative?.id === n.id ? null : n)}
                        style={{
                          background: n.political_alert
                            ? (selectedNarrative?.id === n.id ? "rgba(255,71,87,.1)" : "rgba(255,71,87,.05)")
                            : (selectedNarrative?.id === n.id ? "rgba(255,71,87,.06)" : "rgba(255,255,255,.02)"),
                          border: "1px solid " + (n.political_alert ? "rgba(255,71,87,.3)" : selectedNarrative?.id === n.id ? "rgba(255,71,87,.2)" : "rgba(255,255,255,.06)"),
                          borderLeft: "3px solid " + (n.political_alert ? "#ff4757" : n.urgency === "CRITICAL" ? "#ff4757" : n.urgency === "HIGH" ? "#ffa500" : "#ffd700"),
                          borderRadius: "0 8px 8px 0", padding: "11px 13px", cursor: "pointer",
                        }}>
                        {/* NEW badge for most recently fetched non-political items */}
                        {!n.political_alert && i === 0 && feedLastFetched && (Date.now() - feedLastFetched) < 90000 && (
                          <div style={{ display: "inline-flex", alignItems: "center", gap: 4, marginBottom: 6, padding: "3px 8px", background: "rgba(0,229,255,.12)", borderRadius: 4 }}>
                            <span style={{ fontSize: 9, color: "#00e5ff", fontWeight: 800, letterSpacing: 1.5, fontFamily: "monospace" }}>✦ JUST FETCHED</span>
                          </div>
                        )}
                        {/* Political Alert banner */}
                        {n.political_alert && (
                          <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 7, padding: "4px 8px", background: "rgba(255,71,87,.12)", borderRadius: 4, width: "fit-content" }}>
                            <span style={{ fontSize: 9, color: "#ff4757", fontWeight: 800, letterSpacing: 1.5, fontFamily: "monospace" }}>🔴 POLITICAL MARKET ALERT</span>
                          </div>
                        )}
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 8, marginBottom: 4 }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                            <span style={{ fontSize: 9, fontWeight: 700, color: n.political_alert ? "#ff4757" : n.tag === "BREAKING" ? "#ff4757" : "#555", fontFamily: "monospace" }}>
                              {n.political_alert ? "🔴" : n.tag === "BREAKING" ? "⚡" : "📰"} {n.political_alert ? "POLITICAL" : n.tag}
                            </span>
                            <span style={{ fontSize: 9, color: "#555", fontFamily: "monospace" }}>{n.age || n.published_at?.slice(11,16)}</span>
                          </div>
                          <span style={{ fontSize: 9, fontWeight: 700, color: n.urgency === "CRITICAL" ? "#ff4757" : n.urgency === "HIGH" ? "#ffa500" : "#ffd700", flexShrink: 0 }}>{n.urgency}</span>
                        </div>
                        <div style={{ fontSize: 12, color: n.political_alert ? "#ffb3b3" : "#e0e0e0", fontWeight: n.political_alert ? 700 : 600, lineHeight: 1.4, marginBottom: selectedNarrative?.id === n.id ? 10 : 0 }}>{n.headline}</div>

                        {/* Expanded view */}
                        {selectedNarrative?.id === n.id && (
                          <div>
                            <div style={{ fontSize: 12, color: "#888", lineHeight: 1.6, fontStyle: "italic", marginBottom: 10 }}>"{n.narrative_summary}"</div>
                            {n.instruments?.map((inst, j) => {
                              const FC = { DEMAND: "#00d4aa", PRESSURE: "#ff4757", VOLATILE: "#ffd700", WATCH: "#c084fc" };
                              const c = FC[inst.flow] || "#555";
                              return (
                                <div key={j} style={{ display: "flex", gap: 8, padding: "6px 9px", background: "rgba(255,255,255,.02)", borderLeft: "2px solid " + c, borderRadius: "0 5px 5px 0", marginBottom: 5 }}>
                                  <div style={{ flexShrink: 0, minWidth: 52 }}>
                                    <div style={{ fontSize: 10, fontWeight: 800, color: "#fff" }}>{inst.name}</div>
                                    <div style={{ fontSize: 8, color: c, fontWeight: 700, letterSpacing: 0 }}>{inst.flow}</div>
                                  </div>
                                  <div style={{ fontSize: 11, color: "#666", lineHeight: 1.4 }}>{inst.impact}</div>
                                </div>
                              );
                            })}
                            {n.tensions && (
                              <div style={{ padding: "7px 10px", background: "rgba(255,165,0,.04)", border: "1px solid rgba(255,165,0,.12)", borderRadius: 6, marginBottom: 8 }}>
                                <div style={{ fontSize: 7, color: "#ffa500", letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>⚡ CONFLICTING FORCES</div>
                                <div style={{ fontSize: 11, color: "#666", lineHeight: 1.4 }}>{n.tensions}</div>
                              </div>
                            )}
                            {n.watch_for && (
                              <div style={{ padding: "7px 10px", background: "rgba(0,212,255,.04)", border: "1px solid rgba(0,212,255,.1)", borderRadius: 6, marginBottom: 10 }}>
                                <div style={{ fontSize: 7, color: "#00d4ff", letterSpacing: 1, fontWeight: 700, marginBottom: 3 }}>WATCH FOR</div>
                                <div style={{ fontSize: 11, color: "#666", lineHeight: 1.4 }}>{n.watch_for}</div>
                              </div>
                            )}
                            <button
                              onClick={(e) => { e.stopPropagation(); setBreakingData(n); setShowShareCard(true); }}
                              style={{ width: "100%", padding: "9px", borderRadius: 7, border: "1px solid rgba(255,71,87,.25)", background: "rgba(255,71,87,.06)", color: "#ff4757", fontSize: 11, fontWeight: 700, cursor: "pointer", fontFamily: "inherit" }}>
                              ↗ Share This Narrative Card
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{ padding: "24px 20px", textAlign: "center", border: "1px dashed rgba(255,255,255,.06)", borderRadius: 8 }}>
                    {feedLastFetched ? (
                      <>
                        <div style={{ fontSize: 22, marginBottom: 10 }}>📭</div>
                        <div style={{ fontSize: 13, color: "#e0e0e0", fontWeight: 600, marginBottom: 6 }}>No breaking narratives right now</div>
                        <div style={{ fontSize: 11, color: "#333", lineHeight: 1.7 }}>
                          Markets are quiet  -  no macro-moving headlines in the current news cycle.<br/>
                          <span style={{ color: "#555" }}>Last checked {feedLastFetched.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}</span>
                        </div>
                      </>
                    ) : (
                      <>
                        <div style={{ fontSize: 12, color: "#555", lineHeight: 1.7 }}>
                          Tap Refresh to load today's narratives<br/>
                          <span style={{ fontSize: 10 }}>Checks for macro-moving headlines</span>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div style={{ height: 1, background: "rgba(255,255,255,.05)", marginBottom: 20 }} />

              {/* Header */}
              <div style={{ marginBottom: 20 }}>
                <div style={{ fontSize: 11, color: "#ff4757", letterSpacing: 2, fontWeight: 700, marginBottom: 6 }}>⚡ BREAKING NARRATIVE</div>
                <div style={{ fontSize: 13, color: "#444", lineHeight: 1.6 }}>
                  See a headline you don't understand? Paste it in  -  get a clear macro explanation and how it affects your instruments.
                  Also monitors the live wire for market-moving events every 15 minutes.
                </div>
              </div>

              {/* Input */}
              <div style={{ marginBottom: 14 }}>
                <textarea
                  value={breakingHeadline}
                  onChange={e => setBreakingHeadline(e.target.value)}
                  placeholder={"Paste any headline, tweet or Discord narrative you don't understand...\n\ne.g. \"Fed signals higher for longer\"  -  what does this mean for my EUR/USD trade?\n\nor: \"OPEC+ cuts 1M barrels\"  -  how does this hit Oil and the Dollar?"}
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
                    // Add to feed as ⚡ BREAKING with priority
                    const manualNarrative = {
                      ...result,
                      id: "manual-" + Date.now(),
                      headline: breakingHeadline.trim(),
                      tag: "BREAKING",
                      age: "just now",
                      published_at: new Date().toISOString(),
                    };
                    setNarrativeFeed(prev => {
                        const updated = [manualNarrative, ...prev].slice(0, 40);
                        const today = new Date().toISOString().slice(0, 10);
                        try { localStorage.setItem("md_narrative_feed", JSON.stringify({ date: today, feed: updated })); } catch(e) {}
                        return updated;
                      });
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
                        const FC = { DEMAND: "#00d4aa", PRESSURE: "#ff4757", VOLATILE: "#ffd700", WATCH: "#c084fc" };
                        const c = FC[inst.flow] || "#555";
                        return (
                          <div key={i} style={{ display: "flex", gap: 12, padding: "11px 14px", background: "rgba(255,255,255,.02)", border: "1px solid rgba(255,255,255,.06)", borderLeft: "3px solid " + c, borderRadius: "0 8px 8px 0", marginBottom: 8, alignItems: "flex-start" }}>
                            <div style={{ display: "flex", flexDirection: "column", gap: 3, flexShrink: 0, minWidth: 60 }}>
                              <div style={{ fontSize: 11, fontWeight: 800, color: "#fff" }}>{inst.name}</div>
                              <div style={{ fontSize: 8, fontWeight: 700, color: c, letterSpacing: 0 }}>{inst.flow || "WATCH"}</div>
                            </div>
                            <div style={{ fontSize: 12, color: "#666", lineHeight: 1.5 }}>{inst.impact}</div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                  {/* Watch for + fades when */}
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 20 }}>
                    {breakingData.tensions && (
                      <div style={{ padding: "12px 14px", background: "rgba(255,165,0,.04)", border: "1px solid rgba(255,165,0,.15)", borderRadius: 8, marginBottom: 10 }}>
                        <div style={{ fontSize: 8, color: "#ffa500", letterSpacing: 1.5, fontWeight: 700, marginBottom: 6 }}>⚡ CONFLICTING FORCES</div>
                        <div style={{ fontSize: 12, color: "#888", lineHeight: 1.5 }}>{breakingData.tensions}</div>
                      </div>
                    )}
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
                  <div style={{ fontSize: 13, color: "#555", lineHeight: 1.7 }}>
                    Paste any market-moving headline<br/>and get an instant macro read
                  </div>
                  <div style={{ marginTop: 16, fontSize: 11, color: "#1a1a1a" }}>
                    Trump tweets · Fed comments · Geopolitical events<br/>Economic surprises · Central bank decisions
                  </div>
                </div>
              )}
              </>}
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
          {/* Breaking narrative share card  -  rendered outside tab conditions */}
          {showShareCard && breakingData && tab === "breaking" && (
            <BreakingShareCard
              data={breakingData}
              onClose={() => setShowShareCard(false)}
            />
          )}
        </div>
      </div>
    </>
  );
}
