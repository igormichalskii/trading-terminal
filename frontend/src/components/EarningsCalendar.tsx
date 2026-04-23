import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";

interface EarningsEvent {
    symbol: string;
    date: string;
    hour: string;
    epsEstimate: number | null;
    epsActual: number | null;
    revenueEstimate: number | null;
    revenueActual: number | null;
    quarter: number | null;
    year: number | null;
}

interface Props {
    watchlistSymbols: string[];
    activeSymbol: string;
    isLoggedIn: boolean;
}

function formatRevenue(val: number | null): string {
    if (val == null) return "—";
    if (Math.abs(val) >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
    if (Math.abs(val) >= 1e9)  return `$${(val / 1e9).toFixed(2)}B`;
    if (Math.abs(val) >= 1e6)  return `$${(val / 1e6).toFixed(2)}M`;
    return `$${val.toFixed(2)}`;
}

function formatEps(val: number | null): string {
    if (val == null) return "—";
    return val >= 0 ? `+${val.toFixed(2)}` : val.toFixed(2);
}

function surprise(actual: number | null, estimate: number | null): string | null {
    if (actual == null || estimate == null || estimate === 0) return null;
    const pct = ((actual - estimate) / Math.abs(estimate)) * 100;
    return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
}

function reportTime(hour: string): string {
    if (hour === "bmo") return "PRE-MKT";
    if (hour === "amc") return "AFTER-HRS";
    if (hour === "dmh") return "DURING";
    return "—";
}

function labelDate(dateStr: string): { label: string; isToday: boolean; isPast: boolean } {
    const today     = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const tomorrow  = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    if (dateStr === today)     return { label: "TODAY",     isToday: true,  isPast: false };
    if (dateStr === yesterday) return { label: "YESTERDAY", isToday: false, isPast: true  };
    if (dateStr === tomorrow)  return { label: "TOMORROW",  isToday: false, isPast: false };
    const d = new Date(dateStr + "T12:00:00Z");
    return {
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }).toUpperCase(),
        isToday: false,
        isPast: dateStr < today,
    };
}

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };

function SectionHeader({ title }: { title: string }) {
    return (
        <div style={{
            ...mono,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.1em",
            color: "var(--text-muted)",
            padding: "8px 14px",
            borderBottom: "1px solid var(--border)",
            background: "var(--panel)",
        }}>
            {title}
        </div>
    );
}

function EarningsTable({ events, showSurprise }: { events: EarningsEvent[]; showSurprise: boolean }) {
    if (events.length === 0) return (
        <div style={{ ...mono, padding: "20px 14px", fontSize: 11, color: "var(--text-muted)" }}>
            NOTHING TO SHOW
        </div>
    );

    const thStyle: React.CSSProperties = {
        ...mono,
        fontSize: 9,
        fontWeight: 600,
        letterSpacing: "0.1em",
        color: "var(--text-muted)",
        padding: "6px 14px",
        textAlign: "left",
        borderBottom: "1px solid var(--border)",
        whiteSpace: "nowrap",
    };

    return (
        <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
                <tr>
                    <th style={thStyle}>DATE</th>
                    <th style={thStyle}>SYMBOL</th>
                    <th style={thStyle}>TIME</th>
                    <th style={{ ...thStyle, textAlign: "right" }}>EPS EST.</th>
                    {showSurprise && <th style={{ ...thStyle, textAlign: "right" }}>EPS ACT.</th>}
                    {showSurprise && <th style={{ ...thStyle, textAlign: "right" }}>SURPRISE</th>}
                    <th style={{ ...thStyle, textAlign: "right" }}>REV. EST.</th>
                    {showSurprise && <th style={{ ...thStyle, textAlign: "right" }}>REV. ACT.</th>}
                </tr>
            </thead>
            <tbody>
                {events.map((e, i) => {
                    const { label, isToday } = labelDate(e.date);
                    const epsSurp = surprise(e.epsActual, e.epsEstimate);
                    const beat    = e.epsActual != null && e.epsEstimate != null && e.epsActual >= e.epsEstimate;

                    const tdStyle: React.CSSProperties = {
                        ...mono,
                        fontSize: 11,
                        padding: "8px 14px",
                        borderBottom: i < events.length - 1 ? "1px solid var(--border)" : "none",
                        borderLeft: isToday ? "2px solid var(--accent)" : "none",
                        background: isToday ? "var(--accent-dim)" : "transparent",
                    };

                    return (
                        <tr key={i}>
                            <td style={tdStyle}>
                                <span style={{ color: isToday ? "var(--accent)" : "var(--text-dim)", fontWeight: isToday ? 600 : 400 }}>
                                    {label}
                                </span>
                            </td>
                            <td style={tdStyle}>
                                <span style={{ color: "var(--text)", fontWeight: 600 }}>{e.symbol}</span>
                                {e.quarter && e.year && (
                                    <span style={{ color: "var(--text-muted)", marginLeft: 6, fontSize: 10 }}>
                                        Q{e.quarter} {e.year}
                                    </span>
                                )}
                            </td>
                            <td style={{ ...tdStyle, color: "var(--text-muted)", fontSize: 10 }}>{reportTime(e.hour)}</td>
                            <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-dim)" }}>{formatEps(e.epsEstimate)}</td>
                            {showSurprise && (
                                <td style={{ ...tdStyle, textAlign: "right", color: "var(--text)" }}>{formatEps(e.epsActual)}</td>
                            )}
                            {showSurprise && (
                                <td style={{ ...tdStyle, textAlign: "right", color: epsSurp ? (beat ? "var(--up)" : "var(--down)") : "var(--text-muted)", fontWeight: 600 }}>
                                    {epsSurp ?? "—"}
                                </td>
                            )}
                            <td style={{ ...tdStyle, textAlign: "right", color: "var(--text-dim)" }}>{formatRevenue(e.revenueEstimate)}</td>
                            {showSurprise && (
                                <td style={{ ...tdStyle, textAlign: "right", color: "var(--text)" }}>{formatRevenue(e.revenueActual)}</td>
                            )}
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}

export default function EarningsCalendar({ watchlistSymbols, activeSymbol, isLoggedIn }: Props) {
    const [earnings,       setEarnings]       = useState<EarningsEvent[]>([]);
    const [loading,        setLoading]        = useState(false);
    const [error,          setError]          = useState<string | null>(null);
    const [includeActive,  setIncludeActive]  = useState(!isLoggedIn);

    const activeInWatchlist = watchlistSymbols.includes(activeSymbol);
    const symbols = (() => {
        const base = [...watchlistSymbols];
        if (!activeInWatchlist && activeSymbol && includeActive) base.push(activeSymbol);
        return [...new Set(base)];
    })();

    useEffect(() => {
        if (symbols.length === 0) { setEarnings([]); return; }
        setLoading(true);
        setError(null);
        apiFetch<{ earnings: EarningsEvent[] }>(`/earnings?symbols=${symbols.join(",")}`)
            .then(({ earnings }) => setEarnings(earnings))
            .catch(() => setError("Failed to load earnings data"))
            .finally(() => setLoading(false));
    }, [symbols.join(",")]);

    const today    = new Date().toISOString().slice(0, 10);
    const upcoming = earnings.filter((e) => e.date >= today);
    const past     = earnings.filter((e) => e.date < today).reverse();

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {/* Page header */}
            <div style={{ display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <div>
                    <div style={{ ...mono, fontSize: 16, fontWeight: 700, color: "var(--text)", letterSpacing: "0.04em" }}>
                        EARNINGS CALENDAR
                    </div>
                    <div style={{ ...mono, fontSize: 10, color: "var(--text-muted)", letterSpacing: "0.08em", marginTop: 4 }}>
                        ±8 WEEKS · {symbols.length} SYMBOL{symbols.length !== 1 ? "S" : ""}
                    </div>
                </div>

                {!activeInWatchlist && activeSymbol && (
                    <button
                        onClick={() => setIncludeActive((v) => !v)}
                        style={{
                            ...mono,
                            fontSize: 10,
                            letterSpacing: "0.08em",
                            padding: "5px 12px",
                            cursor: "pointer",
                            border: `1px solid ${includeActive ? "var(--accent)" : "var(--border-bright)"}`,
                            color: includeActive ? "var(--accent)" : "var(--text-muted)",
                            background: includeActive ? "var(--accent-dim)" : "transparent",
                            transition: "all 0.15s",
                        }}
                    >
                        {includeActive ? "▣" : "□"} INCLUDE {activeSymbol}
                    </button>
                )}
            </div>

            {symbols.length === 0 && (
                <div style={{ border: "1px solid var(--border)", padding: "40px 24px", textAlign: "center" }}>
                    <p style={{ ...mono, fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.06em" }}>
                        {isLoggedIn
                            ? "ADD SYMBOLS TO YOUR WATCHLIST TO SEE THEIR EARNINGS HERE."
                            : "SIGN IN TO USE YOUR WATCHLIST, OR TOGGLE THE ACTIVE SYMBOL ABOVE."}
                    </p>
                </div>
            )}

            {loading && (
                <div style={{ ...mono, padding: "40px 0", textAlign: "center", fontSize: 11, color: "var(--text-muted)", letterSpacing: "0.1em" }}>
                    LOADING…
                </div>
            )}

            {!loading && error && (
                <div style={{ ...mono, padding: "20px 0", textAlign: "center", fontSize: 11, color: "var(--down)", letterSpacing: "0.06em" }}>
                    {error.toUpperCase()}
                </div>
            )}

            {!loading && !error && symbols.length > 0 && (
                <>
                    <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                        <SectionHeader title="UPCOMING" />
                        <EarningsTable events={upcoming} showSurprise={false} />
                    </div>

                    <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                        <SectionHeader title="RECENT RESULTS" />
                        <EarningsTable events={past} showSurprise={true} />
                    </div>
                </>
            )}
        </div>
    );
}
