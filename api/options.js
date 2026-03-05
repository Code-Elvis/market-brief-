export const config = {
  runtime: "edge",
};

// Map instrument keys to their ETF/equity ticker for Polygon options chain
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

// Instruments with no listed options market
const NO_OPTIONS = ["euro", "gbp", "jpy", "aud", "btc", "eth"];

// ─── COMPUTE MAX PAIN ────────────────────────────────────────────────────────
// For each strike, sum the total dollar pain to option buyers if expiry = that strike
function computeMaxPain(contracts) {
  const strikes = [...new Set(contracts.map(c => c.strike))].sort((a, b) => a - b);
  let minPain = Infinity;
  let maxPainStrike = strikes[0];

  for (const testStrike of strikes) {
    let totalPain = 0;
    for (const c of contracts) {
      const oi = c.open_interest || 0;
      if (c.contract_type === "call" && testStrike > c.strike) {
        totalPain += (testStrike - c.strike) * oi * 100;
      } else if (c.contract_type === "put" && testStrike < c.strike) {
        totalPain += (c.strike - testStrike) * oi * 100;
      }
    }
    if (totalPain < minPain) {
      minPain = totalPain;
      maxPainStrike = testStrike;
    }
  }
  return maxPainStrike;
}

// ─── FIND CALL / PUT WALLS ───────────────────────────────────────────────────
// Wall = strike with highest open interest on each side of current price
function findWalls(contracts, currentPrice) {
  const calls = contracts.filter(c => c.contract_type === "call" && c.strike >= currentPrice);
  const puts  = contracts.filter(c => c.contract_type === "put"  && c.strike <= currentPrice);

  const topCalls = calls.sort((a, b) => (b.open_interest || 0) - (a.open_interest || 0)).slice(0, 3);
  const topPuts  = puts.sort((a, b) => (b.open_interest || 0) - (a.open_interest || 0)).slice(0, 3);

  return { topCalls, topPuts };
}

// ─── FIND GEX FLIP ZONE ──────────────────────────────────────────────────────
// GEX flip = strike where net gamma (calls - puts) crosses zero
// Simplified: find strike where delta-weighted gamma is closest to neutral
function findGexFlip(contracts, currentPrice) {
  const strikeMap = {};

  for (const c of contracts) {
    if (!strikeMap[c.strike]) strikeMap[c.strike] = { call_gamma: 0, put_gamma: 0, call_oi: 0, put_oi: 0 };
    const gamma = c.greeks?.gamma || 0;
    const oi    = c.open_interest || 0;
    if (c.contract_type === "call") {
      strikeMap[c.strike].call_gamma += gamma * oi * 100;
      strikeMap[c.strike].call_oi    += oi;
    } else {
      strikeMap[c.strike].put_gamma  += gamma * oi * 100;
      strikeMap[c.strike].put_oi     += oi;
    }
  }

  let closestStrike = null;
  let closestDiff = Infinity;

  for (const [strike, data] of Object.entries(strikeMap)) {
    const netGamma = data.call_gamma - data.put_gamma;
    const diff = Math.abs(netGamma);
    // Only consider strikes near current price (±8%)
    if (Math.abs(strike - currentPrice) / currentPrice < 0.08 && diff < closestDiff) {
      closestDiff = diff;
      closestStrike = parseFloat(strike);
    }
  }

  return closestStrike;
}

// ─── COMPUTE PUT/CALL RATIO ──────────────────────────────────────────────────
function computePCR(contracts) {
  const totalPutOI  = contracts.filter(c => c.contract_type === "put").reduce((s, c) => s + (c.open_interest || 0), 0);
  const totalCallOI = contracts.filter(c => c.contract_type === "call").reduce((s, c) => s + (c.open_interest || 0), 0);
  if (!totalCallOI) return null;
  return (totalPutOI / totalCallOI).toFixed(2);
}

// ─── FETCH OPTIONS CHAIN FROM POLYGON ───────────────────────────────────────
async function fetchChain(ticker, apiKey) {
  // Get nearest 2 expiries — fetch contracts expiring within 30 days
  const today = new Date();
  const in30  = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
  const fmt   = d => d.toISOString().split("T")[0];

  const url = `https://api.polygon.io/v3/snapshot/options/${ticker}?expiration_date.gte=${fmt(today)}&expiration_date.lte=${fmt(in30)}&limit=250&apiKey=${apiKey}`;

  const res  = await fetch(url);
  const data = await res.json();

  if (!res.ok || data.status === "ERROR") {
    throw new Error(data.error || `Polygon error for ${ticker}`);
  }

  // Polygon wraps results in data.results array
  const raw = data.results || [];

  // Flatten: extract what we need from each contract snapshot
  return raw.map(item => ({
    strike:        item.details?.strike_price ?? item.strike_price,
    contract_type: item.details?.contract_type ?? item.contract_type,
    expiration:    item.details?.expiration_date ?? item.expiration_date,
    open_interest: item.open_interest,
    greeks: {
      delta: item.greeks?.delta,
      gamma: item.greeks?.gamma,
      theta: item.greeks?.theta,
      vega:  item.greeks?.vega,
    },
    iv:            item.implied_volatility,
    last_price:    item.last_quote?.midpoint ?? item.day?.close,
    underlying_price: item.underlying_asset?.price,
  }));
}

// ─── ASK CLAUDE TO INTERPRET THE REAL DATA ───────────────────────────────────
async function getClaudeNarrative(instLabel, ticker, levels, anthropicKey) {
  const prompt = `You are a senior options market structure analyst. You have been given REAL, LIVE options market data for ${instLabel} (ETF proxy: ${ticker}). 

Here is the computed market structure from today's options chain:

${JSON.stringify(levels, null, 2)}

Write a professional options flow intelligence briefing based STRICTLY on this real data. Do not invent or estimate any numbers — only interpret what is shown above.

Respond ONLY with valid JSON. No markdown. Schema:
{
  "dealer_positioning": "2-3 sentence analytical summary of what the dealer gamma positioning implies for price behaviour",
  "pcr_interpretation": "1-2 sentence interpretation of the put/call ratio and what the skew suggests",
  "flow_notes": [
    {"observation": "string — specific observation about the data", "significance": "string — why it matters for price"}
  ],
  "max_pain_context": "1 sentence explaining the max pain implication for this expiry",
  "call_wall_context": "1 sentence on the primary call wall level",
  "put_wall_context": "1 sentence on the primary put wall level"
}`;

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": anthropicKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514",
      max_tokens: 800,
      messages: [{ role: "user", content: prompt }],
    }),
  });

  const data = await res.json();
  const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
  const match = text.match(/\{[\s\S]*\}/);
  if (!match) throw new Error("No JSON from Claude narrative");
  return JSON.parse(match[0]);
}

// ─── MAIN HANDLER ─────────────────────────────────────────────────────────────
export default async function handler(req) {
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), { status: 405 });
  }

  try {
    const { instKey, instLabel } = await req.json();

    // No options for spot FX / crypto
    if (NO_OPTIONS.includes(instKey)) {
      return new Response(JSON.stringify({ options_available: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const ticker = TICKER_MAP[instKey];
    if (!ticker) {
      return new Response(JSON.stringify({ options_available: false }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    const polygonKey   = process.env.POLYGON_API_KEY;
    const anthropicKey = process.env.VITE_ANTHROPIC_API_KEY;

    if (!polygonKey) {
      return new Response(JSON.stringify({ error: "POLYGON_API_KEY not set in environment" }), { status: 500 });
    }

    // 1. Fetch real chain from Polygon
    const contracts = await fetchChain(ticker, polygonKey);

    if (!contracts.length) {
      return new Response(JSON.stringify({ options_available: false, error: "No contracts returned" }), { status: 200 });
    }

    // 2. Get current underlying price from first contract that has it
    const currentPrice = contracts.find(c => c.underlying_price)?.underlying_price
      ?? contracts[0]?.strike; // fallback

    // 3. Compute structural levels
    const maxPainStrike = computeMaxPain(contracts);
    const { topCalls, topPuts } = findWalls(contracts, currentPrice);
    const gexFlip = findGexFlip(contracts, currentPrice);
    const pcr = computePCR(contracts);

    // 4. Build gamma levels array
    const gammaLevels = [];

    if (topCalls[0]) gammaLevels.push({
      strike: topCalls[0].strike,
      type: "CALL_WALL",
      label: "Primary Call Wall",
      oi: topCalls[0].open_interest,
    });
    if (topCalls[1]) gammaLevels.push({
      strike: topCalls[1].strike,
      type: "CALL_WALL",
      label: "Secondary Call Wall",
      oi: topCalls[1].open_interest,
    });
    if (topPuts[0]) gammaLevels.push({
      strike: topPuts[0].strike,
      type: "PUT_WALL",
      label: "Primary Put Wall",
      oi: topPuts[0].open_interest,
    });
    if (topPuts[1]) gammaLevels.push({
      strike: topPuts[1].strike,
      type: "PUT_WALL",
      label: "Secondary Put Wall",
      oi: topPuts[1].open_interest,
    });
    if (gexFlip) gammaLevels.push({
      strike: gexFlip,
      type: "GEX_FLIP",
      label: "Gamma Flip Zone",
    });
    if (maxPainStrike) gammaLevels.push({
      strike: maxPainStrike,
      type: "PIN_RISK",
      label: "Max Pain / Pin Risk",
    });

    // Sort by strike descending
    gammaLevels.sort((a, b) => b.strike - a.strike);

    const levelsPayload = {
      ticker,
      current_price: currentPrice,
      max_pain_strike: maxPainStrike,
      put_call_ratio: pcr,
      gamma_levels: gammaLevels,
      total_contracts_analyzed: contracts.length,
    };

    // 5. Ask Claude to write the narrative around the real data
    const narrative = await getClaudeNarrative(instLabel, ticker, levelsPayload, anthropicKey);

    // 6. Build final response
    const as_of = new Date().toLocaleString("en-GB", {
      weekday: "short", month: "short", day: "numeric",
      hour: "2-digit", minute: "2-digit", timeZoneName: "short"
    });

    const response = {
      options_available: true,
      ticker,
      as_of,
      current_price: currentPrice,
      max_pain: {
        strike: maxPainStrike,
        context: narrative.max_pain_context || "",
      },
      gamma_levels: gammaLevels.map(l => ({
        ...l,
        context: l.type === "CALL_WALL"
          ? (l.label.includes("Primary") ? narrative.call_wall_context : `OI: ${l.oi?.toLocaleString() ?? "—"}`)
          : l.type === "PUT_WALL"
          ? (l.label.includes("Primary") ? narrative.put_wall_context : `OI: ${l.oi?.toLocaleString() ?? "—"}`)
          : `Net gamma approaches neutral — dealer hedging behaviour may shift above/below this level.`,
      })),
      put_call_ratio: {
        value: pcr ?? "N/A",
        interpretation: narrative.pcr_interpretation || "",
      },
      dealer_positioning: narrative.dealer_positioning || "",
      flow_notes: narrative.flow_notes || [],
      meta: {
        contracts_analyzed: contracts.length,
        data_source: "Polygon.io (end-of-day)",
      },
    };

    return new Response(JSON.stringify(response), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });

  } catch (err) {
    console.error("Options handler error:", err);
    return new Response(JSON.stringify({ error: err.message || "Options fetch failed" }), { status: 500 });
  }
}
