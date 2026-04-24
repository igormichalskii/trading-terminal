import { useState, useEffect, useRef } from "react";
import { apiFetch, verifySymbol } from "../lib/api";
import { tickerError } from "../lib/validation";

const MAX_CUSTOM_SYMBOLS = 20;

interface SavedPreset {
    id: string;
    label: string;
    symbols: string[];
}

const STATIC_PRESETS: SavedPreset[] = [
    { id: "ndx5",  label: "NASDAQ TOP 5",  symbols: ["AAPL","MSFT","NVDA","AMZN","META"] },
    { id: "ndx10", label: "NASDAQ TOP 10", symbols: ["AAPL","MSFT","NVDA","AMZN","META","TSLA","GOOGL","AVGO","COST","NFLX"] },
    { id: "ndx20", label: "NASDAQ TOP 20", symbols: ["AAPL","MSFT","NVDA","AMZN","META","TSLA","GOOGL","AVGO","COST","NFLX","AMD","ADBE","QCOM","PEP","INTU","AMAT","ISRG","MU","LRCX","TXN"] },
];

interface FrontierPoint { vol: number; ret: number; sharpe: number }

interface PortfolioAllocation {
    weights: Record<string, number>;
    expected_return: number;
    volatility: number;
    sharpe: number;
}

interface OptimizeResult {
    symbols: string[];
    frontier: FrontierPoint[];
    max_sharpe: PortfolioAllocation;
    min_vol: PortfolioAllocation;
    equal_weight: PortfolioAllocation;
}

interface Props {
    watchlistSymbols: string[];
    isLoggedIn: boolean;
}

type Tab = "watchlist" | "custom" | "presets" | "compare";

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

// ── Helpers ────────────────────────────────────────────────────────────────

function lerpColor(a: [number,number,number], b: [number,number,number], t: number): string {
    return `rgb(${Math.round(a[0]+(b[0]-a[0])*t)},${Math.round(a[1]+(b[1]-a[1])*t)},${Math.round(a[2]+(b[2]-a[2])*t)})`;
}

function sharpeColor(s: number, min: number, max: number): string {
    const t = max > min ? Math.max(0, Math.min(1, (s-min)/(max-min))) : 0.5;
    return t < 0.5
        ? lerpColor([42,42,42],[59,130,246], t*2)
        : lerpColor([59,130,246],[0,214,143], (t-0.5)*2);
}

async function runOptimization(
    symbols: string[],
    setResult:  (r: OptimizeResult | null) => void,
    setLoading: (v: boolean) => void,
    setError:   (e: string | null) => void,
) {
    if (symbols.length < 2) { setError("SELECT AT LEAST 2 SYMBOLS"); return; }
    setLoading(true);
    setError(null);
    try {
        const data = await apiFetch<OptimizeResult>("/portfolio/optimize", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ symbols, period_days: 365 }),
        });
        setResult(data);
    } catch (e: any) {
        setError((e.message || "Optimization failed").toUpperCase());
    } finally {
        setLoading(false);
    }
}

// ── Sub-components ─────────────────────────────────────────────────────────

function EfficientFrontier({ frontier, maxSharpe, minVol }: {
    frontier: FrontierPoint[];
    maxSharpe: PortfolioAllocation;
    minVol: PortfolioAllocation;
}) {
    if (!frontier.length) return null;
    const W=500, H=240, P={l:48,r:24,t:16,b:36};
    const iW=W-P.l-P.r, iH=H-P.t-P.b;
    const vols=frontier.map(p=>p.vol), rets=frontier.map(p=>p.ret), sharps=frontier.map(p=>p.sharpe);
    const [minV,maxV]=[Math.min(...vols),Math.max(...vols)];
    const [minR,maxR]=[Math.min(...rets),Math.max(...rets)];
    const [minS,maxS]=[Math.min(...sharps),Math.max(...sharps)];
    const toX=(v:number)=>P.l+((v-minV)/(maxV-minV||1))*iW;
    const toY=(r:number)=>H-P.b-((r-minR)/(maxR-minR||1))*iH;
    const xTicks=[minV,(minV+maxV)/2,maxV];
    const yTicks=[minR,(minR+maxR)/2,maxR];
    return (
        <svg viewBox={`0 0 ${W} ${H}`} style={{width:"100%",maxHeight:240}}>
            {yTicks.map((r,i)=>(
                <g key={i}>
                    <line x1={P.l} x2={W-P.r} y1={toY(r)} y2={toY(r)} stroke="#1f1f1f" strokeWidth="1"/>
                    <text x={P.l-5} y={toY(r)+3.5} textAnchor="end" fill="#727272" fontSize="9" fontFamily="var(--font-mono)">{(r*100).toFixed(0)}%</text>
                </g>
            ))}
            {xTicks.map((v,i)=>(
                <g key={i}>
                    <line x1={toX(v)} x2={toX(v)} y1={P.t} y2={H-P.b} stroke="#1f1f1f" strokeWidth="1"/>
                    <text x={toX(v)} y={H-P.b+12} textAnchor="middle" fill="#727272" fontSize="9" fontFamily="var(--font-mono)">{(v*100).toFixed(0)}%</text>
                </g>
            ))}
            <text x={W/2} y={H-1} textAnchor="middle" fill="#727272" fontSize="8" fontFamily="var(--font-mono)">VOLATILITY (ANNUALIZED)</text>
            <text x={9} y={H/2} textAnchor="middle" fill="#727272" fontSize="8" fontFamily="var(--font-mono)" transform={`rotate(-90,9,${H/2})`}>RETURN</text>
            {frontier.map((p,i)=>(
                <circle key={i} cx={toX(p.vol)} cy={toY(p.ret)} r={2.5} fill={sharpeColor(p.sharpe,minS,maxS)} opacity={0.8}/>
            ))}
            <circle cx={toX(minVol.volatility)} cy={toY(minVol.expected_return)} r={5} fill="#3b82f6" stroke="#0a0a0a" strokeWidth="1.5"/>
            <text x={toX(minVol.volatility)+8} y={toY(minVol.expected_return)+3.5} fill="#3b82f6" fontSize="9" fontFamily="var(--font-mono)">MIN VOL</text>
            <circle cx={toX(maxSharpe.volatility)} cy={toY(maxSharpe.expected_return)} r={5} fill="#00d68f" stroke="#0a0a0a" strokeWidth="1.5"/>
            <text x={toX(maxSharpe.volatility)+8} y={toY(maxSharpe.expected_return)+3.5} fill="#00d68f" fontSize="9" fontFamily="var(--font-mono)">MAX SHARPE</text>
        </svg>
    );
}

function WeightBar({ symbol, weight, barColor = "var(--accent)" }: { symbol: string; weight: number; barColor?: string }) {
    return (
        <div style={{ display: "grid", gridTemplateColumns: "64px 1fr 40px", gap: 8, alignItems: "center" }}>
            <span style={{ ...mono, fontSize: 11, color: "var(--text)", fontWeight: 600 }}>{symbol}</span>
            <div style={{ height: 3, background: "var(--border)", position: "relative" }}>
                <div style={{ position: "absolute", top: 0, bottom: 0, left: 0, width: `${weight*100}%`, background: barColor }} />
            </div>
            <span style={{ ...mono, fontSize: 10, color: "var(--text-dim)", textAlign: "right" }}>{(weight*100).toFixed(1)}%</span>
        </div>
    );
}

function PortfolioCard({ title, portfolio, accentColor }: { title: string; portfolio: PortfolioAllocation; accentColor: string }) {
    const sorted = Object.entries(portfolio.weights).sort((a,b)=>b[1]-a[1]);
    const retColor = portfolio.expected_return >= 0 ? "var(--up)" : "var(--down)";
    return (
        <div style={{ border: "1px solid var(--border)" }}>
            <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 14px", borderBottom:"1px solid var(--border)" }}>
                <span style={{ ...mono, fontSize:11, fontWeight:700, color:accentColor, letterSpacing:"0.06em" }}>{title}</span>
                <span style={{ ...mono, fontSize:10, color:"var(--text-muted)" }}>SHARPE {portfolio.sharpe.toFixed(2)}</span>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:"var(--border)", borderBottom:"1px solid var(--border)" }}>
                {[
                    { label:"RETURN",     value:`${portfolio.expected_return>=0?"+":""}${(portfolio.expected_return*100).toFixed(1)}%`, color:retColor },
                    { label:"VOLATILITY", value:`${(portfolio.volatility*100).toFixed(1)}%`, color:"var(--text)" },
                    { label:"SHARPE",     value:portfolio.sharpe.toFixed(2), color:"var(--text)" },
                ].map(({label,value,color})=>(
                    <div key={label} style={{ background:"var(--panel)", padding:"8px 14px", textAlign:"center" }}>
                        <div style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.1em", marginBottom:4 }}>{label}</div>
                        <div style={{ ...mono, fontSize:14, fontWeight:600, color }}>{value}</div>
                    </div>
                ))}
            </div>
            <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:8 }}>
                {sorted.filter(([,w])=>w>=0.005).map(([sym,w])=>(
                    <WeightBar key={sym} symbol={sym} weight={w} barColor={accentColor}/>
                ))}
            </div>
        </div>
    );
}

function ResultSection({ result, loading }: { result: OptimizeResult | null; loading: boolean }) {
    if (loading) return (
        <div style={{ ...mono, padding:"40px 0", textAlign:"center", fontSize:11, color:"var(--text-muted)", letterSpacing:"0.1em" }}>
            RUNNING MODEL…
        </div>
    );
    if (!result) return null;
    return (
        <>
            <div style={{ border:"1px solid var(--border)" }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 14px", borderBottom:"1px solid var(--border)" }}>
                    <span style={{ ...mono, fontSize:10, fontWeight:600, letterSpacing:"0.1em", color:"var(--text-muted)" }}>EFFICIENT FRONTIER</span>
                    <div style={{ display:"flex", gap:16 }}>
                        {[{color:"#00d68f",label:"MAX SHARPE"},{color:"#3b82f6",label:"MIN VOLATILITY"}].map(({color,label})=>(
                            <div key={label} style={{ display:"flex", alignItems:"center", gap:5 }}>
                                <div style={{ width:6, height:6, background:color, borderRadius:"50%" }}/>
                                <span style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.06em" }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
                <div style={{ padding:"12px 14px" }}>
                    <EfficientFrontier frontier={result.frontier} maxSharpe={result.max_sharpe} minVol={result.min_vol}/>
                </div>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1, background:"var(--border)" }}>
                <PortfolioCard title="MAX SHARPE"     portfolio={result.max_sharpe}   accentColor="var(--up)"/>
                <PortfolioCard title="MIN VOLATILITY" portfolio={result.min_vol}       accentColor="var(--accent)"/>
                <PortfolioCard title="EQUAL WEIGHT"   portfolio={result.equal_weight}  accentColor="var(--text-dim)"/>
            </div>
        </>
    );
}

function PresetCard({ preset, isStatic, isActive, loading, onRun, onDelete }: {
    preset: SavedPreset;
    isStatic: boolean;
    isActive: boolean;
    loading: boolean;
    onRun: () => void;
    onDelete?: () => void;
}) {
    return (
        <div style={{ background:"var(--panel)", border:`1px solid ${isActive?"var(--accent)":"var(--border)"}`, transition:"border-color 0.15s" }}>
            <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", display:"flex", alignItems:"center", gap:8 }}>
                {isStatic && <span style={{ ...mono, fontSize:9, color:"var(--text-muted)" }}>▣</span>}
                <span style={{ ...mono, fontSize:11, fontWeight:700, color:isActive?"var(--accent)":"var(--text)", letterSpacing:"0.06em", flex:1 }}>
                    {preset.label}
                </span>
                <span style={{ ...mono, fontSize:9, color:"var(--text-muted)" }}>{preset.symbols.length} SYM</span>
            </div>
            <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)", minHeight:52 }}>
                <div style={{ display:"flex", flexWrap:"wrap", gap:4 }}>
                    {preset.symbols.map(s=>(
                        <span key={s} style={{ ...mono, fontSize:9, color:"var(--text-dim)", border:"1px solid var(--border-bright)", padding:"1px 5px" }}>{s}</span>
                    ))}
                </div>
            </div>
            <div style={{ padding:"8px 14px", display:"flex", gap:6 }}>
                <button onClick={onRun} disabled={loading} style={{
                    ...mono, fontSize:10, letterSpacing:"0.08em", padding:"4px 12px",
                    cursor:loading?"not-allowed":"pointer",
                    border:"1px solid var(--accent)", color:"var(--bg)",
                    background:loading?"var(--text-muted)":"var(--accent)",
                    opacity:loading?0.5:1, transition:"all 0.15s",
                }}>
                    {loading&&isActive?"RUNNING…":"RUN"}
                </button>
                {!isStatic && onDelete && (
                    <button onClick={onDelete} style={{
                        ...mono, fontSize:10, padding:"4px 10px", cursor:"pointer",
                        border:"1px solid var(--border-bright)", color:"var(--text-muted)",
                        background:"transparent", transition:"all 0.15s",
                    }}>DELETE</button>
                )}
            </div>
        </div>
    );
}

function SymbolSetup({ symbols, selected, onToggle, onRun, loading, error }: {
    symbols: string[];
    selected: Set<string>;
    onToggle: (s: string) => void;
    onRun: () => void;
    loading: boolean;
    error: string | null;
}) {
    const btnDisabled = loading || selected.size < 2;
    return (
        <div style={{ border:"1px solid var(--border)" }}>
            <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)" }}>
                <div style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.1em", marginBottom:10 }}>SYMBOLS</div>
                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                    {symbols.map(sym=>(
                        <button key={sym} onClick={()=>onToggle(sym)} style={{
                            ...mono, fontSize:10, letterSpacing:"0.06em", padding:"4px 10px", cursor:"pointer",
                            border:`1px solid ${selected.has(sym)?"var(--accent)":"var(--border-bright)"}`,
                            color: selected.has(sym)?"var(--accent)":"var(--text-muted)",
                            background: selected.has(sym)?"var(--accent-dim)":"transparent",
                            transition:"all 0.15s",
                        }}>{sym}</button>
                    ))}
                    {symbols.length === 0 && (
                        <span style={{ ...mono, fontSize:11, color:"var(--text-muted)" }}>NO SYMBOLS</span>
                    )}
                </div>
            </div>
            <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
                <button onClick={onRun} disabled={btnDisabled} style={{
                    ...mono, fontSize:10, letterSpacing:"0.1em", padding:"6px 16px",
                    cursor: btnDisabled?"not-allowed":"pointer",
                    border:"1px solid var(--accent)",
                    color:"var(--bg)",
                    background: btnDisabled?"var(--text-muted)":"var(--accent)",
                    opacity: btnDisabled?0.5:1,
                    transition:"all 0.15s",
                }}>
                    {loading?"OPTIMIZING…":"RUN OPTIMIZATION"}
                </button>
                {selected.size < 2 && !loading && (
                    <span style={{ ...mono, fontSize:10, color:"var(--text-muted)" }}>SELECT AT LEAST 2 SYMBOLS</span>
                )}
                {error && <span style={{ ...mono, fontSize:10, color:"var(--down)" }}>{error}</span>}
            </div>
        </div>
    );
}

// ── Main component ─────────────────────────────────────────────────────────

export default function PortfolioOptimizer({ watchlistSymbols, isLoggedIn }: Props) {
    const [tab, setTab] = useState<Tab>("watchlist");

    // Watchlist mode
    const [wlSelected, setWlSelected] = useState<Set<string>>(new Set(watchlistSymbols));
    const [wlResult,   setWlResult]   = useState<OptimizeResult | null>(null);
    const [wlLoading,  setWlLoading]  = useState(false);
    const [wlError,    setWlError]    = useState<string | null>(null);

    // Custom mode
    const [customSymbols,  setCustomSymbols]  = useState<string[]>([]);
    const [customSelected, setCustomSelected] = useState<Set<string>>(new Set());
    const [customInput,    setCustomInput]    = useState("");
    const [customInputErr,      setCustomInputErr]      = useState<string | null>(null);
    const [customInputChecking, setCustomInputChecking] = useState(false);
    const [customResult,   setCustomResult]   = useState<OptimizeResult | null>(null);
    const [customLoading,  setCustomLoading]  = useState(false);
    const [customError,    setCustomError]    = useState<string | null>(null);
    const inputRef = useRef<HTMLInputElement>(null);

    // Presets tab
    const [userPresets,      setUserPresets]      = useState<SavedPreset[]>(() => {
        try { return JSON.parse(localStorage.getItem("portfolio_presets") || "[]"); } catch { return []; }
    });
    const [activePresetId,   setActivePresetId]   = useState<string | null>(null);
    const [presetResult,     setPresetResult]     = useState<OptimizeResult | null>(null);
    const [presetLoading,    setPresetLoading]    = useState(false);
    const [presetError,      setPresetError]      = useState<string | null>(null);
    // New preset form
    const [newPresetOpen,    setNewPresetOpen]    = useState(false);
    const [newPresetName,    setNewPresetName]    = useState("");
    const [newPresetSymbols, setNewPresetSymbols] = useState<string[]>([]);
    const [newPresetInput,   setNewPresetInput]   = useState("");
    const [newPresetInputErr,     setNewPresetInputErr]     = useState<string | null>(null);
    const [newPresetChecking,     setNewPresetChecking]     = useState(false);
    const newPresetInputRef = useRef<HTMLInputElement>(null);

    const canCompare = !!wlResult && !!customResult;

    useEffect(() => {
        setWlSelected(prev => {
            const next = new Set(prev);
            watchlistSymbols.forEach(s => next.add(s));
            return next;
        });
    }, [watchlistSymbols.join(",")]);

    async function addCustomSymbol() {
        const sym = customInput.trim().toUpperCase();
        const fmtErr = tickerError(sym);
        if (fmtErr) { setCustomInputErr(fmtErr); return; }
        if (customSymbols.includes(sym)) { setCustomInputErr("Already added."); return; }
        if (customSymbols.length >= MAX_CUSTOM_SYMBOLS) { setCustomInputErr(`Max ${MAX_CUSTOM_SYMBOLS} symbols.`); return; }
        setCustomInputErr(null);
        setCustomInputChecking(true);
        const { valid, error } = await verifySymbol(sym);
        setCustomInputChecking(false);
        if (!valid) { setCustomInputErr(error); return; }
        setCustomSymbols(prev => [...prev, sym]);
        setCustomSelected(prev => new Set([...prev, sym]));
        setCustomInput("");
        inputRef.current?.focus();
    }

    function removeCustomSymbol(sym: string) {
        setCustomSymbols(prev => prev.filter(s => s !== sym));
        setCustomSelected(prev => { const n = new Set(prev); n.delete(sym); return n; });
    }

    function persistUserPresets(presets: SavedPreset[]) {
        setUserPresets(presets);
        localStorage.setItem("portfolio_presets", JSON.stringify(presets));
    }

    async function addNewPresetSymbol() {
        const sym = newPresetInput.trim().toUpperCase();
        const fmtErr = tickerError(sym);
        if (fmtErr) { setNewPresetInputErr(fmtErr); return; }
        if (newPresetSymbols.includes(sym)) { setNewPresetInputErr("Already added."); return; }
        if (newPresetSymbols.length >= MAX_CUSTOM_SYMBOLS) { setNewPresetInputErr(`Max ${MAX_CUSTOM_SYMBOLS} symbols.`); return; }
        setNewPresetInputErr(null);
        setNewPresetChecking(true);
        const { valid, error } = await verifySymbol(sym);
        setNewPresetChecking(false);
        if (!valid) { setNewPresetInputErr(error); return; }
        setNewPresetSymbols(prev => [...prev, sym]);
        setNewPresetInput("");
        newPresetInputRef.current?.focus();
    }

    function saveNewPreset() {
        if (!newPresetName.trim() || newPresetSymbols.length < 2) return;
        const preset: SavedPreset = {
            id: `user_${Date.now()}`,
            label: newPresetName.trim().toUpperCase(),
            symbols: [...newPresetSymbols],
        };
        persistUserPresets([...userPresets, preset]);
        setNewPresetOpen(false);
        setNewPresetName("");
        setNewPresetSymbols([]);
        setNewPresetInput("");
    }

    const tabs: { id: Tab; label: string }[] = [
        { id: "watchlist", label: "WATCHLIST" },
        { id: "custom",    label: "CUSTOM" },
        { id: "presets",   label: "PRESETS" },
        ...(canCompare ? [{ id: "compare" as Tab, label: "COMPARE ▶" }] : []),
    ];

    const tabStyle = (active: boolean, isCompare = false): React.CSSProperties => ({
        ...mono,
        fontSize: 10,
        letterSpacing: "0.08em",
        padding: "8px 16px",
        cursor: "pointer",
        background: "transparent",
        border: "none",
        borderBottom: `2px solid ${active ? (isCompare ? "var(--purple)" : "var(--accent)") : "transparent"}`,
        color: active ? (isCompare ? "var(--purple)" : "var(--accent)") : "var(--text-muted)",
        borderRight: "1px solid var(--border)",
        transition: "color 0.15s, border-color 0.15s",
    });

    return (
        <div style={{ display:"flex", flexDirection:"column", gap:24 }}>

            {/* Header */}
            <div>
                <div style={{ ...mono, fontSize:16, fontWeight:700, color:"var(--text)", letterSpacing:"0.04em" }}>PORTFOLIO OPTIMIZER</div>
                <div style={{ ...mono, fontSize:10, color:"var(--text-muted)", letterSpacing:"0.08em", marginTop:4 }}>
                    MODERN PORTFOLIO THEORY · 1-YEAR DAILY RETURNS · 2,000 MONTE CARLO SIMULATIONS
                </div>
            </div>

            {/* Tabs */}
            <div style={{ display:"flex", borderBottom:"1px solid var(--border)" }}>
                {tabs.map(t => (
                    <button key={t.id} onClick={() => setTab(t.id)} style={tabStyle(tab === t.id, t.id === "compare")}>
                        {t.label}
                    </button>
                ))}
            </div>

            {/* ── WATCHLIST tab ── */}
            {tab === "watchlist" && (
                watchlistSymbols.length === 0 ? (
                    <div style={{ border:"1px solid var(--border)", padding:"40px 24px", textAlign:"center" }}>
                        <p style={{ ...mono, fontSize:11, color:"var(--text-muted)", letterSpacing:"0.06em" }}>
                            {isLoggedIn
                                ? "ADD SYMBOLS TO YOUR WATCHLIST TO OPTIMIZE A PORTFOLIO."
                                : "SIGN IN AND ADD SYMBOLS TO YOUR WATCHLIST TO USE THE OPTIMIZER."}
                        </p>
                    </div>
                ) : (
                    <>
                        <SymbolSetup
                            symbols={watchlistSymbols}
                            selected={wlSelected}
                            onToggle={sym => setWlSelected(prev => { const n=new Set(prev); n.has(sym)?n.delete(sym):n.add(sym); return n; })}
                            onRun={() => runOptimization([...wlSelected], setWlResult, setWlLoading, setWlError)}
                            loading={wlLoading}
                            error={wlError}
                        />
                        <ResultSection result={wlResult} loading={wlLoading}/>
                    </>
                )
            )}

            {/* ── CUSTOM tab ── */}
            {tab === "custom" && (
                <>
                    <div style={{ border:"1px solid var(--border)" }}>
                        {/* Symbol input */}
                        <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)" }}>
                            <div style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.1em", marginBottom:10 }}>ADD SYMBOLS</div>
                            <div style={{ display:"flex", gap:6 }}>
                                <div style={{ display:"flex", flexDirection:"column", gap:4 }}>
                                <input
                                    ref={inputRef}
                                    value={customInput}
                                    onChange={e => { setCustomInput(e.target.value.toUpperCase()); setCustomInputErr(null); }}
                                    onKeyDown={e => e.key === "Enter" && addCustomSymbol()}
                                    placeholder={customInputChecking ? "VERIFYING…" : "TICKER"}
                                    disabled={customInputChecking}
                                    style={{
                                        ...mono, fontSize:11, width:100,
                                        background:"var(--bg)",
                                        border:`1px solid ${customInputErr ? "var(--down)" : customInputChecking ? "var(--accent)" : "var(--border-bright)"}`,
                                        color:"var(--text)", padding:"4px 8px", outline:"none",
                                    }}
                                />
                                {customInputErr && (
                                    <span style={{ ...mono, fontSize:9, color:"var(--down)", letterSpacing:"0.04em" }}>{customInputErr}</span>
                                )}
                                </div>
                                <button onClick={addCustomSymbol} disabled={customInputChecking} style={{
                                    ...mono, fontSize:12, padding:"4px 10px",
                                    cursor: customInputChecking ? "not-allowed" : "pointer",
                                    background:"transparent", border:"1px solid var(--border-bright)",
                                    color: customInputChecking ? "var(--text-muted)" : "var(--text-dim)",
                                    transition:"all 0.15s",
                                }}>{customInputChecking ? "…" : "+"}</button>
                            </div>
                        </div>

                        {/* Added symbols */}
                        {customSymbols.length > 0 && (
                            <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)" }}>
                                <div style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.1em", marginBottom:10 }}>SYMBOLS</div>
                                <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                                    {customSymbols.map(sym => (
                                        <div key={sym} style={{ display:"flex", alignItems:"center", gap:0 }}>
                                            <button onClick={() => setCustomSelected(prev => { const n=new Set(prev); n.has(sym)?n.delete(sym):n.add(sym); return n; })} style={{
                                                ...mono, fontSize:10, letterSpacing:"0.06em", padding:"4px 8px", cursor:"pointer",
                                                border:`1px solid ${customSelected.has(sym)?"var(--accent)":"var(--border-bright)"}`,
                                                borderRight:"none",
                                                color: customSelected.has(sym)?"var(--accent)":"var(--text-muted)",
                                                background: customSelected.has(sym)?"var(--accent-dim)":"transparent",
                                                transition:"all 0.15s",
                                            }}>{sym}</button>
                                            <button onClick={() => removeCustomSymbol(sym)} style={{
                                                ...mono, fontSize:10, padding:"4px 6px", cursor:"pointer",
                                                border:`1px solid ${customSelected.has(sym)?"var(--accent)":"var(--border-bright)"}`,
                                                color:"var(--text-muted)", background:"transparent",
                                                transition:"all 0.15s",
                                            }}>×</button>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        )}

                        {/* Run */}
                        <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
                            <button
                                onClick={() => runOptimization([...customSelected], setCustomResult, setCustomLoading, setCustomError)}
                                disabled={customLoading || customSelected.size < 2}
                                style={{
                                    ...mono, fontSize:10, letterSpacing:"0.1em", padding:"6px 16px",
                                    cursor: customLoading||customSelected.size<2?"not-allowed":"pointer",
                                    border:"1px solid var(--accent)", color:"var(--bg)",
                                    background: customLoading||customSelected.size<2?"var(--text-muted)":"var(--accent)",
                                    opacity: customLoading||customSelected.size<2?0.5:1, transition:"all 0.15s",
                                }}
                            >
                                {customLoading?"OPTIMIZING…":"RUN OPTIMIZATION"}
                            </button>
                            {customSelected.size < 2 && !customLoading && (
                                <span style={{ ...mono, fontSize:10, color:"var(--text-muted)" }}>
                                    {customSymbols.length === 0 ? "ADD SYMBOLS ABOVE" : "SELECT AT LEAST 2 SYMBOLS"}
                                </span>
                            )}
                            {customError && <span style={{ ...mono, fontSize:10, color:"var(--down)" }}>{customError}</span>}
                        </div>
                    </div>

                    <ResultSection result={customResult} loading={customLoading}/>
                </>
            )}

            {/* ── PRESETS tab ── */}
            {tab === "presets" && (
                <>
                    {/* Static presets */}
                    <div>
                        <div style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.1em", marginBottom:10 }}>BUILT-IN PRESETS</div>
                        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1, background:"var(--border)" }}>
                            {STATIC_PRESETS.map(p=>(
                                <PresetCard
                                    key={p.id}
                                    preset={p}
                                    isStatic={true}
                                    isActive={activePresetId===p.id}
                                    loading={presetLoading&&activePresetId===p.id}
                                    onRun={()=>{ setActivePresetId(p.id); runOptimization(p.symbols,setPresetResult,setPresetLoading,setPresetError); }}
                                />
                            ))}
                        </div>
                    </div>

                    {/* User presets */}
                    <div>
                        <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:10 }}>
                            <div style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.1em" }}>MY PRESETS</div>
                            <button
                                onClick={()=>{ setNewPresetOpen(o=>!o); setNewPresetInputErr(null); }}
                                style={{ ...mono, fontSize:10, padding:"4px 12px", cursor:"pointer", border:"1px solid var(--border-bright)", color:"var(--text-dim)", background:"transparent", transition:"all 0.15s" }}
                            >
                                {newPresetOpen?"CANCEL":"+ NEW PRESET"}
                            </button>
                        </div>

                        {/* New preset form */}
                        {newPresetOpen && (
                            <div style={{ border:"1px solid var(--border)", marginBottom:12 }}>
                                <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)" }}>
                                    <div style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.1em", marginBottom:8 }}>PRESET NAME</div>
                                    <input
                                        value={newPresetName}
                                        onChange={e=>setNewPresetName(e.target.value)}
                                        placeholder="MY PRESET"
                                        maxLength={32}
                                        style={{ ...mono, fontSize:11, width:220, background:"var(--bg)", border:"1px solid var(--border-bright)", color:"var(--text)", padding:"5px 10px", outline:"none" }}
                                        onFocus={e=>{ (e.currentTarget as HTMLInputElement).style.borderColor="var(--accent)"; }}
                                        onBlur={e=>{ (e.currentTarget as HTMLInputElement).style.borderColor="var(--border-bright)"; }}
                                    />
                                </div>
                                <div style={{ padding:"10px 14px", borderBottom:"1px solid var(--border)" }}>
                                    <div style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.1em", marginBottom:8 }}>ADD SYMBOLS</div>
                                    <div style={{ display:"flex", gap:6, marginBottom:6 }}>
                                        <input
                                            ref={newPresetInputRef}
                                            value={newPresetInput}
                                            onChange={e=>{ setNewPresetInput(e.target.value.toUpperCase()); setNewPresetInputErr(null); }}
                                            onKeyDown={e=>e.key==="Enter"&&addNewPresetSymbol()}
                                            placeholder={newPresetChecking?"VERIFYING…":"TICKER"}
                                            disabled={newPresetChecking}
                                            style={{ ...mono, fontSize:11, width:100, background:"var(--bg)", border:`1px solid ${newPresetInputErr?"var(--down)":newPresetChecking?"var(--accent)":"var(--border-bright)"}`, color:"var(--text)", padding:"4px 8px", outline:"none" }}
                                        />
                                        <button onClick={addNewPresetSymbol} disabled={newPresetChecking} style={{ ...mono, fontSize:12, padding:"4px 10px", cursor:newPresetChecking?"not-allowed":"pointer", background:"transparent", border:"1px solid var(--border-bright)", color:newPresetChecking?"var(--text-muted)":"var(--text-dim)", transition:"all 0.15s" }}>
                                            {newPresetChecking?"…":"+"}
                                        </button>
                                    </div>
                                    {newPresetInputErr && <p style={{ ...mono, fontSize:9, color:"var(--down)", marginBottom:6 }}>{newPresetInputErr}</p>}
                                    {newPresetSymbols.length>0 && (
                                        <div style={{ display:"flex", flexWrap:"wrap", gap:5 }}>
                                            {newPresetSymbols.map(s=>(
                                                <div key={s} style={{ display:"flex", alignItems:"center" }}>
                                                    <span style={{ ...mono, fontSize:10, color:"var(--text-dim)", border:"1px solid var(--border-bright)", borderRight:"none", padding:"2px 6px" }}>{s}</span>
                                                    <button onClick={()=>setNewPresetSymbols(prev=>prev.filter(x=>x!==s))} style={{ ...mono, fontSize:10, padding:"2px 5px", cursor:"pointer", border:"1px solid var(--border-bright)", color:"var(--text-muted)", background:"transparent" }}>×</button>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                                <div style={{ padding:"10px 14px", display:"flex", alignItems:"center", gap:12 }}>
                                    <button
                                        onClick={saveNewPreset}
                                        disabled={!newPresetName.trim()||newPresetSymbols.length<2}
                                        style={{ ...mono, fontSize:10, letterSpacing:"0.08em", padding:"6px 16px", cursor:!newPresetName.trim()||newPresetSymbols.length<2?"not-allowed":"pointer", border:"1px solid var(--up)", color:"var(--bg)", background:!newPresetName.trim()||newPresetSymbols.length<2?"var(--text-muted)":"var(--up)", opacity:!newPresetName.trim()||newPresetSymbols.length<2?0.5:1, transition:"all 0.15s" }}
                                    >
                                        SAVE PRESET
                                    </button>
                                    {newPresetSymbols.length<2 && (
                                        <span style={{ ...mono, fontSize:10, color:"var(--text-muted)" }}>
                                            {newPresetSymbols.length===0?"ADD AT LEAST 2 SYMBOLS":"ONE MORE SYMBOL NEEDED"}
                                        </span>
                                    )}
                                </div>
                            </div>
                        )}

                        {userPresets.length===0 ? (
                            !newPresetOpen && (
                                <div style={{ border:"1px solid var(--border)", padding:"32px 24px", textAlign:"center" }}>
                                    <span style={{ ...mono, fontSize:11, color:"var(--text-muted)", letterSpacing:"0.06em" }}>NO SAVED PRESETS — CREATE ONE ABOVE</span>
                                </div>
                            )
                        ) : (
                            <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:1, background:"var(--border)" }}>
                                {userPresets.map(p=>(
                                    <PresetCard
                                        key={p.id}
                                        preset={p}
                                        isStatic={false}
                                        isActive={activePresetId===p.id}
                                        loading={presetLoading&&activePresetId===p.id}
                                        onRun={()=>{ setActivePresetId(p.id); runOptimization(p.symbols,setPresetResult,setPresetLoading,setPresetError); }}
                                        onDelete={()=>{
                                            persistUserPresets(userPresets.filter(x=>x.id!==p.id));
                                            if(activePresetId===p.id){ setActivePresetId(null); setPresetResult(null); }
                                        }}
                                    />
                                ))}
                            </div>
                        )}
                    </div>

                    {presetError && <div style={{ ...mono, fontSize:10, color:"var(--down)" }}>{presetError}</div>}
                    <ResultSection result={presetResult} loading={presetLoading}/>
                </>
            )}

            {/* ── COMPARE tab ── */}
            {tab === "compare" && canCompare && (() => {
                const wl = wlResult!.max_sharpe;
                const cu = customResult!.max_sharpe;
                const wlWins = wl.sharpe >= cu.sharpe;
                const winnerLabel = wlWins ? "WATCHLIST PORTFOLIO" : "CUSTOM PORTFOLIO";
                const winnerColor = wlWins ? "var(--up)" : "var(--purple)";

                const metrics = [
                    { label: "RETURN",     wl: `${wl.expected_return>=0?"+":""}${(wl.expected_return*100).toFixed(1)}%`, cu: `${cu.expected_return>=0?"+":""}${(cu.expected_return*100).toFixed(1)}%`, wlBetter: wl.expected_return >= cu.expected_return },
                    { label: "VOLATILITY", wl: `${(wl.volatility*100).toFixed(1)}%`,  cu: `${(cu.volatility*100).toFixed(1)}%`,  wlBetter: wl.volatility <= cu.volatility },
                    { label: "SHARPE",     wl: wl.sharpe.toFixed(2),                  cu: cu.sharpe.toFixed(2),                  wlBetter: wl.sharpe >= cu.sharpe },
                ];

                return (
                    <>
                        {/* Winner banner */}
                        <div style={{ border:`1px solid ${winnerColor}`, padding:"12px 16px", background:`color-mix(in srgb, ${winnerColor} 8%, transparent)`, display:"flex", alignItems:"center", gap:12 }}>
                            <span style={{ ...mono, fontSize:10, color:"var(--text-muted)", letterSpacing:"0.08em" }}>BETTER RISK-ADJUSTED RETURN</span>
                            <span style={{ ...mono, fontSize:13, fontWeight:700, color:winnerColor, letterSpacing:"0.06em" }}>
                                ▶ {winnerLabel}
                            </span>
                            <span style={{ ...mono, fontSize:10, color:"var(--text-muted)", marginLeft:"auto" }}>
                                SHARPE {Math.max(wl.sharpe,cu.sharpe).toFixed(2)} vs {Math.min(wl.sharpe,cu.sharpe).toFixed(2)}
                            </span>
                        </div>

                        {/* Metrics table */}
                        <div style={{ border:"1px solid var(--border)" }}>
                            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:"var(--border)" }}>
                                <div style={{ background:"var(--panel)", padding:"8px 14px" }}>
                                    <span style={{ ...mono, fontSize:9, color:"var(--text-muted)", letterSpacing:"0.1em" }}>METRIC</span>
                                </div>
                                <div style={{ background:"var(--panel)", padding:"8px 14px", textAlign:"center" }}>
                                    <span style={{ ...mono, fontSize:9, color:"var(--up)", letterSpacing:"0.1em" }}>WATCHLIST</span>
                                </div>
                                <div style={{ background:"var(--panel)", padding:"8px 14px", textAlign:"center" }}>
                                    <span style={{ ...mono, fontSize:9, color:"var(--purple)", letterSpacing:"0.1em" }}>CUSTOM</span>
                                </div>
                            </div>
                            {metrics.map(({ label, wl, cu, wlBetter }) => (
                                <div key={label} style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:1, background:"var(--border)" }}>
                                    <div style={{ background:"var(--panel)", padding:"10px 14px" }}>
                                        <span style={{ ...mono, fontSize:10, color:"var(--text-dim)", letterSpacing:"0.08em" }}>{label}</span>
                                    </div>
                                    <div style={{ background:"var(--panel)", padding:"10px 14px", textAlign:"center" }}>
                                        <span style={{ ...mono, fontSize:13, fontWeight:600, color: wlBetter?"var(--up)":"var(--text-dim)" }}>{wl}</span>
                                    </div>
                                    <div style={{ background:"var(--panel)", padding:"10px 14px", textAlign:"center" }}>
                                        <span style={{ ...mono, fontSize:13, fontWeight:600, color: !wlBetter?"var(--purple)":"var(--text-dim)" }}>{cu}</span>
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Side-by-side weight allocations */}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:"var(--border)" }}>
                            {[
                                { label:"WATCHLIST — MAX SHARPE WEIGHTS", p:wl, color:"var(--up)" },
                                { label:"CUSTOM — MAX SHARPE WEIGHTS",     p:cu, color:"var(--purple)" },
                            ].map(({ label, p, color }) => (
                                <div key={label} style={{ background:"var(--panel)" }}>
                                    <div style={{ padding:"8px 14px", borderBottom:"1px solid var(--border)" }}>
                                        <span style={{ ...mono, fontSize:9, color, letterSpacing:"0.08em", fontWeight:600 }}>{label}</span>
                                    </div>
                                    <div style={{ padding:"10px 14px", display:"flex", flexDirection:"column", gap:8 }}>
                                        {Object.entries(p.weights).sort((a,b)=>b[1]-a[1]).filter(([,w])=>w>=0.005).map(([sym,w])=>(
                                            <WeightBar key={sym} symbol={sym} weight={w} barColor={color}/>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        {/* Symbols used */}
                        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:1, background:"var(--border)" }}>
                            {[
                                { label:"WATCHLIST SYMBOLS", syms: wlResult!.symbols, color:"var(--up)" },
                                { label:"CUSTOM SYMBOLS",    syms: customResult!.symbols, color:"var(--purple)" },
                            ].map(({ label, syms, color }) => (
                                <div key={label} style={{ background:"var(--panel)", padding:"10px 14px" }}>
                                    <div style={{ ...mono, fontSize:9, color, letterSpacing:"0.08em", marginBottom:8 }}>{label}</div>
                                    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
                                        {syms.map(s => (
                                            <span key={s} style={{ ...mono, fontSize:10, color:"var(--text-dim)", border:"1px solid var(--border-bright)", padding:"2px 8px" }}>{s}</span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                );
            })()}
        </div>
    );
}
