// ┏━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
// ┃ FI position field catalog (≥300 nested leaves) + AG columnDefs            ┃
// ┗━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┛

/**
 * @typedef {'string'|'float'|'integer'|'boolean'|'datetime'} FieldType
 * @typedef {{ path: string, type: FieldType, headerName?: string }} FieldDef
 */

/** @type {FieldDef[]} */
const CORE_FIELDS = [
    { path: "positionId", type: "string", headerName: "Position Id" },
    { path: "asOf", type: "datetime", headerName: "As Of" },

    // instrument
    { path: "instrument.isin", type: "string", headerName: "ISIN" },
    { path: "instrument.cusip", type: "string", headerName: "CUSIP" },
    { path: "instrument.ticker", type: "string", headerName: "Ticker" },
    { path: "instrument.name", type: "string", headerName: "Name" },
    { path: "instrument.currency", type: "string", headerName: "CCY" },
    { path: "instrument.sector", type: "string", headerName: "Sector" },
    { path: "instrument.rating", type: "string", headerName: "Rating" },
    { path: "instrument.country", type: "string", headerName: "Country" },
    { path: "instrument.issuer", type: "string", headerName: "Issuer" },
    { path: "instrument.coupon", type: "float", headerName: "Coupon" },
    { path: "instrument.couponFreq", type: "string", headerName: "Freq" },
    { path: "instrument.maturity", type: "datetime", headerName: "Maturity" },
    { path: "instrument.issueDate", type: "datetime", headerName: "Issue" },
    { path: "instrument.seniority", type: "string", headerName: "Seniority" },
    { path: "instrument.callProtected", type: "boolean", headerName: "Call Prot." },
    { path: "instrument.bondType", type: "string", headerName: "Bond Type" },
    { path: "instrument.benchmark", type: "string", headerName: "Benchmark" },

    // book
    { path: "book.desk", type: "string", headerName: "Desk" },
    { path: "book.bookName", type: "string", headerName: "Book" },
    { path: "book.trader", type: "string", headerName: "Trader" },
    { path: "book.entity", type: "string", headerName: "Entity" },
    { path: "book.region", type: "string", headerName: "Region" },
    { path: "book.strategy", type: "string", headerName: "Strategy" },
    { path: "book.portfolio", type: "string", headerName: "Portfolio" },

    // position
    { path: "position.qty", type: "float", headerName: "Qty" },
    { path: "position.notional", type: "float", headerName: "Notional" },
    { path: "position.marketValue", type: "float", headerName: "Mkt Value" },
    { path: "position.accrued", type: "float", headerName: "Accrued" },
    { path: "position.pendingBuy", type: "float", headerName: "Pend Buy" },
    { path: "position.pendingSell", type: "float", headerName: "Pend Sell" },
    { path: "position.avgCost", type: "float", headerName: "Avg Cost" },
    { path: "position.haircut", type: "float", headerName: "Haircut" },
    { path: "position.financed", type: "boolean", headerName: "Financed" },

    // prices
    { path: "prices.bid", type: "float", headerName: "Bid" },
    { path: "prices.ask", type: "float", headerName: "Ask" },
    { path: "prices.mid", type: "float", headerName: "Mid" },
    { path: "prices.last", type: "float", headerName: "Last" },
    { path: "prices.source", type: "string", headerName: "Px Src" },
    { path: "prices.pxTime", type: "datetime", headerName: "Px Time" },
    { path: "prices.clean", type: "float", headerName: "Clean" },
    { path: "prices.dirty", type: "float", headerName: "Dirty" },

    // yields
    { path: "yields.ytm", type: "float", headerName: "YTM" },
    { path: "yields.ytw", type: "float", headerName: "YTW" },
    { path: "yields.currentYield", type: "float", headerName: "Curr Yld" },
    { path: "yields.spreadToBench", type: "float", headerName: "Spread" },
    { path: "yields.zSpread", type: "float", headerName: "Z-Spread" },
    { path: "yields.oas", type: "float", headerName: "OAS" },
    { path: "yields.gSpread", type: "float", headerName: "G-Spread" },
    { path: "yields.iSpread", type: "float", headerName: "I-Spread" },

    // risk
    { path: "risk.duration", type: "float", headerName: "Duration" },
    { path: "risk.modDuration", type: "float", headerName: "Mod Dur" },
    { path: "risk.convexity", type: "float", headerName: "Convexity" },
    { path: "risk.dv01", type: "float", headerName: "DV01" },
    { path: "risk.cs01", type: "float", headerName: "CS01" },
    { path: "risk.vega", type: "float", headerName: "Vega" },
    { path: "risk.theta", type: "float", headerName: "Theta" },
];

const KEY_RATE_TENORS = [
    "6m",
    "1y",
    "2y",
    "3y",
    "5y",
    "7y",
    "10y",
    "15y",
    "20y",
    "30y",
];
for (const t of KEY_RATE_TENORS) {
    CORE_FIELDS.push({
        path: `risk.keyRate.kr${t}`,
        type: "float",
        headerName: `KR ${t}`,
    });
}

const SCENARIO_BPS = [10, 25, 50, 75, 100, 150, 200, 300];
for (const bp of SCENARIO_BPS) {
    CORE_FIELDS.push({
        path: `risk.scenario.bp${bp}`,
        type: "float",
        headerName: `+${bp}bp`,
    });
    CORE_FIELDS.push({
        path: `risk.scenario.bm${bp}`,
        type: "float",
        headerName: `-${bp}bp`,
    });
}

CORE_FIELDS.push(
    { path: "pnl.dtd", type: "float", headerName: "PnL DTD" },
    { path: "pnl.mtd", type: "float", headerName: "PnL MTD" },
    { path: "pnl.ytd", type: "float", headerName: "PnL YTD" },
    { path: "pnl.unrealized", type: "float", headerName: "Unrealized" },
    { path: "pnl.realized", type: "float", headerName: "Realized" },
    { path: "pnl.fx", type: "float", headerName: "FX PnL" },
    { path: "pnl.carry", type: "float", headerName: "Carry" },
    { path: "pnl.roll", type: "float", headerName: "Roll" },

    { path: "limits.notionalLimit", type: "float", headerName: "Not. Limit" },
    { path: "limits.dv01Limit", type: "float", headerName: "DV01 Limit" },
    { path: "limits.utilizationPct", type: "float", headerName: "Util %" },
    { path: "limits.breach", type: "boolean", headerName: "Breach" },
    { path: "limits.warning", type: "boolean", headerName: "Warning" },

    { path: "meta.sourceSystem", type: "string", headerName: "Source" },
    { path: "meta.lastUpdateTs", type: "datetime", headerName: "Updated" },
    { path: "meta.updateSeq", type: "integer", headerName: "Seq" },
    { path: "meta.version", type: "string", headerName: "Version" },
);

/**
 * @param {number} minFields
 * @returns {FieldDef[]}
 */
export function buildFieldCatalog(minFields = 300) {
    /** @type {FieldDef[]} */
    const fields = CORE_FIELDS.map((f) => ({ ...f }));
    let i = 0;
    while (fields.length < minFields) {
        const n = String(i).padStart(3, "0");
        const type =
            i % 5 === 0 ? "string" : i % 5 === 1 ? "integer" : "float";
        fields.push({
            path: `analytics.f${n}`,
            type,
            headerName: `A${n}`,
        });
        // nested bucket every 20
        if (i % 20 === 19) {
            const b = String(Math.floor(i / 20)).padStart(2, "0");
            fields.push({
                path: `analytics.bucket${b}.score`,
                type: "float",
                headerName: `B${b} Score`,
            });
            fields.push({
                path: `analytics.bucket${b}.flag`,
                type: "boolean",
                headerName: `B${b} Flag`,
            });
        }
        i += 1;
    }
    return fields;
}

/**
 * Perspective schema map: column name → type string.
 * @param {FieldDef[]} fields
 */
export function toPerspectiveSchema(fields) {
    /** @type {Record<string, string>} */
    const schema = {};
    for (const f of fields) {
        schema[f.path] =
            f.type === "datetime"
                ? "datetime"
                : f.type === "integer"
                  ? "integer"
                  : f.type === "boolean"
                    ? "boolean"
                    : f.type === "float"
                      ? "float"
                      : "string";
    }
    return schema;
}

/**
 * Build nested AG ColGroupDef tree from dot-path catalog.
 * Large analytics groups start collapsed (`openByDefault: false`).
 * @param {FieldDef[]} fields
 */
export function buildColumnDefs(fields) {
    /** @type {{ children: any[], _map: Map<string, any> }} */
    const root = { children: [], _map: new Map() };

    for (const f of fields) {
        if (f.path === "positionId" || f.path === "asOf") {
            root.children.push({
                field: f.path,
                headerName: f.headerName || f.path,
                width: f.path === "positionId" ? 120 : 160,
            });
            continue;
        }
        const parts = f.path.split(".");
        let parent = root;
        for (let d = 0; d < parts.length - 1; d++) {
            const key = parts.slice(0, d + 1).join(".");
            if (!parent._map.has(key)) {
                const node = {
                    groupId: key,
                    headerName: titleCase(parts[d]),
                    openByDefault: parts[0] !== "analytics",
                    // Keep domain bands contiguous under drag (AG marryChildren)
                    marryChildren: d === 0,
                    children: [],
                    _map: new Map(),
                };
                if (parts[0] === "risk" && parts[1] === "scenario") {
                    node.openByDefault = false;
                }
                // Medals-style: collapse analytics to a compact closed set
                if (parts[0] === "analytics" && d === 0) {
                    node.openByDefault = false;
                }
                parent._map.set(key, node);
                parent.children.push(node);
            }
            parent = parent._map.get(key);
        }
        const leafName = parts[parts.length - 1];
        const leafIndex = parent.children.length;
        parent.children.push({
            field: f.path,
            headerName: f.headerName || titleCase(leafName),
            width: 100,
            // AG columnGroupShow: compact closed view + expanded detail
            columnGroupShow:
                parts[0] === "analytics"
                    ? leafIndex < 2
                        ? "closed"
                        : leafIndex < 4
                          ? undefined
                          : "open"
                    : undefined,
        });
    }

    return stripMaps(root.children);
}

function stripMaps(nodes) {
    return nodes.map((n) => {
        if (n.children) {
            const { _map, ...rest } = n;
            return { ...rest, children: stripMaps(n.children) };
        }
        return n;
    });
}

function titleCase(s) {
    return String(s)
        .replace(/([A-Z])/g, " $1")
        .replace(/[_.]/g, " ")
        .replace(/\b\w/g, (c) => c.toUpperCase())
        .trim();
}

/**
 * Seeded PRNG (mulberry32).
 * @param {number} seed
 */
export function createRng(seed = 42) {
    let t = seed >>> 0;
    return function rng() {
        t += 0x6d2b79f5;
        let r = Math.imul(t ^ (t >>> 15), 1 | t);
        r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
        return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
    };
}

const SECTORS = [
    "Financials",
    "Energy",
    "Utilities",
    "Industrials",
    "Sovereign",
    "Agency",
    "ABS",
    "CMBS",
];
const RATINGS = ["AAA", "AA", "A", "BBB", "BB", "B"];
const DESKS = ["IG Credit", "HY Credit", "Rates", "EM Debt", "Munís"];
const REGIONS = ["AMER", "EMEA", "APAC"];
const CURRENCIES = ["USD", "EUR", "GBP", "JPY"];

/**
 * Build one nested position for index `i` (deterministic identity + randomish markets).
 * @param {number} i
 * @param {FieldDef[]} fields
 * @param {() => number} rng
 * @param {{ updateSeq?: number, partial?: boolean }} [opts]
 */
export function generatePosition(i, fields, rng, opts = {}) {
    const id = `FI-${String(i).padStart(6, "0")}`;
    const now = Date.now();
    if (opts.partial) {
        return generatePatch(id, i, fields, rng, opts.updateSeq ?? 1);
    }

    const coupon = 1 + rng() * 8;
    const mid = 80 + rng() * 40;
    const qty = Math.round((rng() * 20 + 1) * 1000) * 1000;
    const notional = qty * (mid / 100);

    /** @type {Record<string, any>} */
    const row = {
        positionId: id,
        asOf: new Date(now).toISOString(),
        instrument: {
            isin: `US${String(100000000 + (i % 900000000))}`,
            cusip: String(100000000 + (i % 900000000)),
            ticker: `TKR${i % 500}`,
            name: `Issuer ${(i % 200) + 1} ${coupon.toFixed(2)}% ${2030 + (i % 20)}`,
            currency: CURRENCIES[i % CURRENCIES.length],
            sector: SECTORS[i % SECTORS.length],
            rating: RATINGS[i % RATINGS.length],
            country: ["US", "GB", "DE", "FR", "JP"][i % 5],
            issuer: `Issuer ${(i % 200) + 1}`,
            coupon,
            couponFreq: ["Semi", "Annual", "Quarterly"][i % 3],
            maturity: new Date(Date.UTC(2030 + (i % 20), i % 12, 15)).toISOString(),
            issueDate: new Date(Date.UTC(2015 + (i % 10), i % 12, 1)).toISOString(),
            seniority: ["Senior", "Sub", "Secured"][i % 3],
            callProtected: i % 4 === 0,
            bondType: ["Corp", "Govt", "Agency", "Muni"][i % 4],
            benchmark: ["UST10", "UST5", "Bund10", "Gilt10"][i % 4],
        },
        book: {
            desk: DESKS[i % DESKS.length],
            bookName: `Book-${(i % 40) + 1}`,
            trader: `T${(i % 25) + 1}`,
            entity: `Entity-${(i % 8) + 1}`,
            region: REGIONS[i % REGIONS.length],
            strategy: ["Long", "RV", "Carry", "Hedge"][i % 4],
            portfolio: `PF-${(i % 12) + 1}`,
        },
        position: {
            qty,
            notional,
            marketValue: notional * (0.98 + rng() * 0.04),
            accrued: rng() * 2,
            pendingBuy: rng() > 0.9 ? qty * 0.1 : 0,
            pendingSell: rng() > 0.9 ? qty * 0.05 : 0,
            avgCost: mid - 1 + rng() * 2,
            haircut: rng() * 0.05,
            financed: i % 3 === 0,
        },
        prices: {
            bid: mid - 0.05 - rng() * 0.1,
            ask: mid + 0.05 + rng() * 0.1,
            mid,
            last: mid + (rng() - 0.5) * 0.2,
            source: ["BBG", "IDC", "Markit", "Internal"][i % 4],
            pxTime: new Date(now - rng() * 60_000).toISOString(),
            clean: mid,
            dirty: mid + rng() * 0.5,
        },
        yields: {
            ytm: coupon / 100 + (rng() - 0.5) * 0.02,
            ytw: coupon / 100 + (rng() - 0.5) * 0.015,
            currentYield: coupon / mid,
            spreadToBench: 50 + rng() * 200,
            zSpread: 40 + rng() * 180,
            oas: 35 + rng() * 160,
            gSpread: 45 + rng() * 170,
            iSpread: 30 + rng() * 150,
        },
        risk: {
            duration: 2 + rng() * 12,
            modDuration: 2 + rng() * 11,
            convexity: rng() * 2,
            dv01: (notional / 10000) * (2 + rng() * 10),
            cs01: (notional / 10000) * (rng() * 5),
            vega: rng() * 100,
            theta: (rng() - 0.5) * 50,
            keyRate: Object.fromEntries(
                KEY_RATE_TENORS.map((t) => [`kr${t}`, (rng() - 0.5) * 1000]),
            ),
            scenario: Object.fromEntries(
                SCENARIO_BPS.flatMap((bp) => [
                    [`bp${bp}`, -bp * (0.5 + rng())],
                    [`bm${bp}`, bp * (0.5 + rng())],
                ]),
            ),
        },
        pnl: {
            dtd: (rng() - 0.5) * 50_000,
            mtd: (rng() - 0.5) * 200_000,
            ytd: (rng() - 0.5) * 1_000_000,
            unrealized: (rng() - 0.5) * 100_000,
            realized: (rng() - 0.5) * 80_000,
            fx: (rng() - 0.5) * 10_000,
            carry: rng() * 5_000,
            roll: (rng() - 0.5) * 3_000,
        },
        limits: {
            notionalLimit: notional * (1.5 + rng()),
            dv01Limit: 50_000 + rng() * 200_000,
            utilizationPct: rng() * 100,
            breach: rng() > 0.97,
            warning: rng() > 0.9,
        },
        analytics: {},
        meta: {
            sourceSystem: "FI-POS",
            lastUpdateTs: new Date(now).toISOString(),
            updateSeq: opts.updateSeq ?? 0,
            version: "1.0",
        },
    };

    // Fill analytics + any catalog paths not set
    for (const f of fields) {
        if (f.path === "positionId" || f.path === "asOf") continue;
        if (hasPath(row, f.path)) continue;
        setPath(row, f.path, sampleValue(f.type, rng, i));
    }
    return row;
}

/**
 * Mutable market patch for an existing position id.
 */
export function generatePatch(positionId, i, fields, rng, updateSeq) {
    const mid = 80 + rng() * 40;
    const now = new Date().toISOString();
    const patch = {
        positionId,
        // Keep left-side columns moving so the default viewport shows ticks
        asOf: now,
        instrument: {
            coupon: 1 + rng() * 8,
        },
        book: {
            trader: `T${(Math.floor(rng() * 25) % 25) + 1}`,
        },
        position: {
            marketValue: (rng() * 5 + 1) * 1_000_000,
            qty: Math.round((rng() * 20 + 1) * 1000) * 1000,
        },
        prices: {
            bid: mid - 0.05 - rng() * 0.1,
            ask: mid + 0.05 + rng() * 0.1,
            mid,
            last: mid + (rng() - 0.5) * 0.2,
            pxTime: now,
        },
        risk: {
            dv01: 1000 + rng() * 50_000,
            cs01: rng() * 10_000,
        },
        pnl: {
            dtd: (rng() - 0.5) * 50_000,
            unrealized: (rng() - 0.5) * 100_000,
        },
        meta: {
            lastUpdateTs: now,
            updateSeq,
        },
    };
    for (let k = 0; k < 3; k++) {
        const f = fields[20 + ((i + k * 17) % Math.max(1, fields.length - 20))];
        if (f && f.path.startsWith("analytics.")) {
            setPath(patch, f.path, sampleValue(f.type, rng, i));
        }
    }
    return patch;
}

function sampleValue(type, rng, i) {
    if (type === "boolean") return rng() > 0.5;
    if (type === "integer") return Math.floor(rng() * 10_000);
    if (type === "float") return (rng() - 0.5) * 10_000;
    if (type === "datetime") return new Date(Date.now() - rng() * 86_400_000).toISOString();
    return `v${i}-${Math.floor(rng() * 1000)}`;
}

function hasPath(obj, path) {
    const parts = path.split(".");
    let cur = obj;
    for (const p of parts) {
        if (cur == null || typeof cur !== "object" || !(p in cur)) return false;
        cur = cur[p];
    }
    return true;
}

function setPath(obj, path, value) {
    const parts = path.split(".");
    let cur = obj;
    for (let i = 0; i < parts.length - 1; i++) {
        const p = parts[i];
        if (cur[p] == null || typeof cur[p] !== "object") cur[p] = {};
        cur = cur[p];
    }
    cur[parts[parts.length - 1]] = value;
}
