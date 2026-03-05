export const config = {
  runtime: "edge",
};

const TICKER_MAP = {
  es:   "SPY",
  nq:   "QQQ",
  gold: "GLD",
  oil:  "USO",
  dxy:  "UUP",
  rty:  "IWM",
  ym:   "DIA",
  vix:  "VIXY",
};

const NO_OPTIONS = ["euro", "gbp", "jpy", "aud", "btc", "eth"];

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "Content-Type": "application/json" },
  });

function computeMaxPain(contracts) {
  const strikes = [...new Set(contracts.map(c => c.strike))].sort((a, b) => a - b);
  if (!strikes.length) return null;
  let minPain = Infinity, maxPainStrike = strikes[0];
  for (const testStrike of strikes) {
    let pain = 0;
    for (const c of contracts) {
      const oi = c.open_interest || 0;
      if (c.contract_type === "call" && testStrike > c.strike) pain += (testStrike - c.strike) * oi * 100;
      else if (c.contract_type === "put" && testStrike < c.strike) pain += (c.strike - testStrike) * oi * 100;
    }
    if (pain < minPain) { minPain = pain; maxPainStrike = testStrike; }
  }
  return maxPainStrike;
}

function findWalls(contracts, currentPrice) {
  const calls = contracts.filter(c => c.contract_type === "call" && c.strike >= currentPrice)
    .sort((a, b) => (b.open_interest || 0) - (a.open_interest || 0)).slice(0, 3);
  const puts = contracts.filter(c => c.contract_type === "put" && c.strike <= currentPrice)
    .sort((a, b) => (b.open_interest || 0) - (a.open_interest || 0)).slice(0, 3);
  return { topCalls: calls, topPuts: puts };
}

function findGexFlip(contracts, currentPrice) {
  const map = {};
  for (const c of contracts) {
    if (!map[c.strike]) map[c.strike] = { cg: 0, pg: 0 };
    const gex = (c.greeks?.gamma || 0) * (c.open_interest || 0) * 100;
    if (c.contract_type === "call") map[c.strike].cg += gex;
    else map[c.strike].pg += gex;
  }
  let best = null, bestDiff = Infinity;
  for (const [s, v] of Object.entries(map)) {
    const strike = parseFloat(s);
    if (Math.abs(strike - currentPrice) / currentPrice > 0.08) continue;
    const diff = Math.abs(v.cg - v.pg);
    if (diff < bestDiff) { bestDiff = diff; best = strike; }
  }
  return best;
}

function computePCR(contracts) {
  const putOI  = contracts.filter(c => c.contract_type === "put").reduce((s, c) => s + (c.open_interest || 0), 0);
  const callOI = contracts.filter(c => c.contract_type === "call").reduce((s, c) => s + (c.open_interest || 0), 0);
  return callOI ? (putOI / callOI).toFixed(2) : null;
}

async function fetchChain(ticker, apiKey) {
  const today = new Date();
  const in45  = new Date(today.getTime() + 45 * 24 * 60 * 60 * 1000);
  const fmt   = d => d.toISOString().split("T")[0];
  const url   = `https://api.polygon.io/v3/snapshot/options/${ticker}?expiration_date.gte=${fmt(today)}&expiration_date.lte=${fmt(in45)}&limit=250&apiKey=${apiKey}`;

  const res  = await fetch(url);
  const text = await res.text();
  let data;
  try { data = JSON.parse(text); } catch { throw new Error(`Polygon non-JSON (HTTP ${res.status}): ${text.slice(0, 300)}`); }

  if (res.status === 403) throw new Error("Polygon 403: Options snapshot data requires a paid Polygon plan. Free tier does not include options chains. Upgrade at polygon.io.");
  if (res.status === 404) throw new Error(`Polygon 404: Ticker ${ticker} not found.`);
  if (!res.ok)            throw new Error(`Polygon HTTP ${res.status}: ${data?.error || text.slice(0, 200)}`);
  if (data.status === "ERROR") throw new Error(`Polygon API error: ${data.error || JSON.stringify(data).slice(0, 200)}`);

  const raw = data.results || [];
  if (!raw.length) throw new Error(`Polygon returned 0 contracts for ${ticker}. Check your plan includes options data.`);

  return raw.map(item => ({
    strike:           item.details?.strike_price   ?? item.strike_price   ?? 0,
    contract_type:    item.details?.contract_type  ?? item.contract_type  ?? "unknown",
    open_interest:    item.open_interest ?? 0,
    greeks:           { gamma: item.greeks?.gamma ?? 0, delta: item.greeks?.delta ?? 0 },
    underlying_price: item.underlying_asset?.price ?? null,
  }));
}

async function getClaudeNarrative(instLabel, ticker, levels, anthropicKey) {
  if (!anthropicKey) return { dealer_positioning: "Narrative unavailable.", pcr_interpretation: "", flow_notes: [], max_pain_context: "", call_wall_context: "", put_wall_context: "" };

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": anthropicKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: `Senior options analyst. Real data for ${instLabel} (${ticker}):\n\n${JSON.stringify(levels, null, 2)}\n\nWrite intelligence briefing based STRICTLY on this data. Respond ONLY with valid JSON:\n{"dealer_positioning":"string","pcr_interpretation":"string","flow_notes":[{"observation":"string","significance":"string"}],"max_pain_context":"string","call_wall_context":"string","put_wall_context":"string"}` }],
    }),
  });
  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) return { dealer_positioning: "Narrative parsing failed.", pcr_interpretation: "", flow_notes: [], max_pain_context: "", call_wall_context: "", put_wall_context: "" };
  return JSON.parse(match[0]);
}

export default async function handler(req) {
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const { instKey, instLabel } = await req.json();

    if (NO_OPTIONS.includes(instKey)) return json({ options_available: false });
    const ticker = TICKER_MAP[instKey];
    if (!ticker) return json({ options_available: false });

    const polygonKey   = process.env.POLYGON_API_KEY;
    const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY;

    if (!polygonKey) return json({ options_available: false, error: "POLYGON_API_KEY not set in Vercel environment variables." });

    const contracts    = await fetchChain(ticker, polygonKey);
    const currentPrice = contracts.find(c => c.underlying_price)?.underlying_price ?? contracts[Math.floor(contracts.length / 2)]?.strike ?? 0;
    const maxPainStrike          = computeMaxPain(contracts);
    const { topCalls, topPuts }  = findWalls(contracts, currentPrice);
    const gexFlip                = findGexFlip(contracts, currentPrice);
    const pcr                    = computePCR(contracts);

    const gammaLevels = [
      topCalls[0] && { strike: topCalls[0].strike, type: "CALL_WALL", label: "Primary Call Wall",   oi: topCalls[0].open_interest },
      topCalls[1] && { strike: topCalls[1].strike, type: "CALL_WALL", label: "Secondary Call Wall", oi: topCalls[1].open_interest },
      topPuts[0]  && { strike: topPuts[0].strike,  type: "PUT_WALL",  label: "Primary Put Wall",    oi: topPuts[0].open_interest  },
      topPuts[1]  && { strike: topPuts[1].strike,  type: "PUT_WALL",  label: "Secondary Put Wall",  oi: topPuts[1].open_interest  },
      gexFlip     && { strike: gexFlip,             type: "GEX_FLIP", label: "Gamma Flip Zone" },
      maxPainStrike && { strike: maxPainStrike,     type: "PIN_RISK", label: "Max Pain / Pin Risk" },
    ].filter(Boolean).sort((a, b) => b.strike - a.strike);

    const levelsPayload = { ticker, current_price: currentPrice, max_pain_strike: maxPainStrike, put_call_ratio: pcr, gamma_levels: gammaLevels, contracts_analyzed: contracts.length };
    const narrative     = await getClaudeNarrative(instLabel, ticker, levelsPayload, anthropicKey);
    const as_of         = new Date().toLocaleString("en-GB", { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit", timeZoneName: "short" });

    return json({
      options_available: true,
      ticker,
      as_of,
      current_price: currentPrice,
      max_pain: { strike: maxPainStrike, context: narrative.max_pain_context || "" },
      gamma_levels: gammaLevels.map(l => ({
        ...l,
        context: l.type === "CALL_WALL" && l.label.includes("Primary") ? narrative.call_wall_context
                : l.type === "PUT_WALL"  && l.label.includes("Primary") ? narrative.put_wall_context
                : l.type === "GEX_FLIP"  ? "Net gamma approaches neutral — dealer hedging direction may shift at this level."
                : l.oi ? `Open interest: ${l.oi.toLocaleString()}` : "",
      })),
      put_call_ratio:     { value: pcr ?? "N/A", interpretation: narrative.pcr_interpretation || "" },
      dealer_positioning: narrative.dealer_positioning || "",
      flow_notes:         narrative.flow_notes || [],
      meta:               { contracts_analyzed: contracts.length, data_source: "Polygon.io" },
    });

  } catch (err) {
    // Always 200 so App.jsx reads the message
    return json({ options_available: false, error: err.message || "Options fetch failed" });
  }
}
