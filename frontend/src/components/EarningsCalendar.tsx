import { useEffect, useState, useMemo } from "react";
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

interface TooltipState {
    event: EarningsEvent;
    x: number;
    y: number;
}

interface Props {
    watchlistSymbols: string[];
    activeSymbol: string;
    isLoggedIn: boolean;
}

const mono: React.CSSProperties = { fontFamily: "var(--font-mono)" };
const DAYS = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
const MONTHS = ["JANUARY","FEBRUARY","MARCH","APRIL","MAY","JUNE","JULY","AUGUST","SEPTEMBER","OCTOBER","NOVEMBER","DECEMBER"];

function toDateStr(d: Date): string { return d.toISOString().slice(0, 10); }

function getMonthGrid(year: number, month: number): (Date | null)[] {
    const first = new Date(year, month, 1);
    const last  = new Date(year, month + 1, 0);
    const cells: (Date | null)[] = [];
    for (let i = 0; i < first.getDay(); i++) cells.push(null);
    for (let d = 1; d <= last.getDate(); d++) cells.push(new Date(year, month, d));
    while (cells.length % 7 !== 0) cells.push(null);
    return cells;
}

function formatEps(val: number | null): string {
    if (val == null) return "—";
    return (val >= 0 ? "+" : "") + val.toFixed(2);
}

function formatRevenue(val: number | null): string {
    if (val == null) return "—";
    const a = Math.abs(val);
    if (a >= 1e12) return `$${(val / 1e12).toFixed(1)}T`;
    if (a >= 1e9)  return `$${(val / 1e9).toFixed(1)}B`;
    if (a >= 1e6)  return `$${(val / 1e6).toFixed(1)}M`;
    return `$${val.toFixed(0)}`;
}

function reportTimeFull(hour: string): string {
    if (hour === "bmo") return "PRE-MARKET";
    if (hour === "amc") return "AFTER-HOURS";
    if (hour === "dmh") return "DURING MKT";
    return "—";
}

function reportTimeShort(hour: string): string {
    if (hour === "bmo") return "PRE";
    if (hour === "amc") return "AFT";
    if (hour === "dmh") return "MKT";
    return "—";
}

// ── Hover tooltip ───────────────────────────────────────────────────────────

function EarningsTooltip({ tip }: { tip: TooltipState }) {
    const e = tip.event;
    const reported = e.epsActual != null;
    const beat = reported && e.epsActual! >= (e.epsEstimate ?? e.epsActual!);
    const accentColor = reported ? (beat ? "var(--up)" : "var(--down)") : "var(--accent)";

    const epsSurp = reported && e.epsEstimate != null && e.epsEstimate !== 0
        ? ((e.epsActual! - e.epsEstimate) / Math.abs(e.epsEstimate) * 100)
        : null;

    // Keep tooltip on screen: flip left if near right edge
    const TOOLTIP_W = 220;
    const x = tip.x + 14 + TOOLTIP_W > window.innerWidth ? tip.x - TOOLTIP_W - 8 : tip.x + 14;
    const y = Math.min(tip.y - 8, window.innerHeight - 220);

    const row = (label: string, value: string, valueColor = "var(--text)") => (
        <div style={{ display: "flex", justifyContent: "space-between", gap: 16, padding: "3px 0" }}>
            <span style={{ ...mono, fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.08em" }}>{label}</span>
            <span style={{ ...mono, fontSize: 10, color: valueColor, fontWeight: 600 }}>{value}</span>
        </div>
    );

    return (
        <div style={{
            position: "fixed", zIndex: 9999,
            left: x, top: y,
            width: TOOLTIP_W,
            background: "var(--panel)",
            border: `1px solid ${accentColor}`,
            padding: "10px 12px",
            pointerEvents: "none",
            boxShadow: "0 4px 24px rgba(0,0,0,0.6)",
        }}>
            {/* Header */}
            <div style={{ display: "flex", alignItems: "baseline", gap: 8, marginBottom: 8, paddingBottom: 8, borderBottom: "1px solid var(--border)" }}>
                <span style={{ ...mono, fontSize: 13, fontWeight: 700, color: accentColor, letterSpacing: "0.04em" }}>{e.symbol}</span>
                {e.quarter && e.year && (
                    <span style={{ ...mono, fontSize: 10, color: "var(--text-muted)" }}>Q{e.quarter} {e.year}</span>
                )}
                <span style={{ ...mono, fontSize: 9, color: "var(--text-muted)", marginLeft: "auto" }}>{reportTimeFull(e.hour)}</span>
            </div>

            {/* EPS */}
            <div style={{ marginBottom: 6 }}>
                <div style={{ ...mono, fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 4 }}>EPS</div>
                {row("ESTIMATE", formatEps(e.epsEstimate), "var(--text-dim)")}
                {reported && row("ACTUAL", formatEps(e.epsActual), beat ? "var(--up)" : "var(--down)")}
                {epsSurp != null && row("SURPRISE", (epsSurp >= 0 ? "+" : "") + epsSurp.toFixed(1) + "%", beat ? "var(--up)" : "var(--down)")}
            </div>

            {/* Revenue */}
            <div style={{ paddingTop: 6, borderTop: "1px solid var(--border)" }}>
                <div style={{ ...mono, fontSize: 8, color: "var(--text-muted)", letterSpacing: "0.1em", marginBottom: 4 }}>REVENUE</div>
                {row("ESTIMATE", formatRevenue(e.revenueEstimate), "var(--text-dim)")}
                {reported && e.revenueActual != null && row("ACTUAL", formatRevenue(e.revenueActual), "var(--text-dim)")}
            </div>

            {!reported && (
                <div style={{ ...mono, fontSize: 9, color: "var(--text-muted)", marginTop: 8, letterSpacing: "0.06em" }}>
                    NOT YET REPORTED
                </div>
            )}
        </div>
    );
}

// ── Earnings chip inside a day cell ────────────────────────────────────────

function EarningsChip({ event, onEnter, onLeave }: {
    event: EarningsEvent;
    onEnter: (e: React.MouseEvent, ev: EarningsEvent) => void;
    onLeave: () => void;
}) {
    const reported  = event.epsActual != null;
    const beat      = reported && event.epsActual! >= (event.epsEstimate ?? event.epsActual!);
    const chipBg    = reported ? (beat ? "var(--up-bg)" : "var(--down-bg)") : "rgba(255,255,255,0.04)";
    const chipColor = reported ? (beat ? "var(--up)"   : "var(--down)")    : "var(--text-dim)";
    return (
        <div
            onMouseEnter={e => onEnter(e, event)}
            onMouseLeave={onLeave}
            style={{
                display: "flex", justifyContent: "space-between", alignItems: "center",
                background: chipBg, padding: "2px 5px", marginBottom: 2,
                borderLeft: `2px solid ${chipColor}`,
                cursor: "default",
            }}
        >
            <span style={{ ...mono, fontSize: 10, color: chipColor, fontWeight: 700, letterSpacing: "0.04em" }}>
                {event.symbol}
            </span>
            <span style={{ ...mono, fontSize: 8, color: "var(--text-muted)", marginLeft: 4, letterSpacing: "0.05em" }}>
                {reportTimeShort(event.hour)}
            </span>
        </div>
    );
}

// ── Single day cell ─────────────────────────────────────────────────────────

function DayCell({ date, events, isCurrentMonth, isToday, isPast, onChipEnter, onChipLeave }: {
    date: Date | null;
    events: EarningsEvent[];
    isCurrentMonth: boolean;
    isToday: boolean;
    isPast: boolean;
    onChipEnter: (e: React.MouseEvent, ev: EarningsEvent) => void;
    onChipLeave: () => void;
}) {
    const MAX_VISIBLE = 3;
    const visible  = events.slice(0, MAX_VISIBLE);
    const overflow = events.length - MAX_VISIBLE;
    const isWeekend = date ? (date.getDay() === 0 || date.getDay() === 6) : false;

    return (
        <div style={{
            minHeight: 96,
            background: isToday ? "var(--accent-dim)" : "var(--panel)",
            borderTop: `2px solid ${isToday ? "var(--accent)" : "transparent"}`,
            padding: "5px 6px",
            opacity: !isCurrentMonth ? 0.25 : isPast && !isWeekend ? 0.6 : 1,
            overflow: "hidden",
        }}>
            {date && (
                <>
                    <div style={{
                        ...mono, fontSize: 11, fontWeight: isToday ? 700 : 400,
                        color: isToday ? "var(--accent)" : isWeekend ? "var(--text-muted)" : "var(--text-dim)",
                        marginBottom: 5, letterSpacing: "0.02em",
                    }}>
                        {date.getDate()}
                    </div>
                    {visible.map((e, i) => (
                        <EarningsChip key={i} event={e} onEnter={onChipEnter} onLeave={onChipLeave} />
                    ))}
                    {overflow > 0 && (
                        <div style={{ ...mono, fontSize: 9, color: "var(--text-muted)", marginTop: 2 }}>
                            +{overflow} MORE
                        </div>
                    )}
                </>
            )}
        </div>
    );
}

// ── Recent results row ──────────────────────────────────────────────────────

function ResultRow({ event }: { event: EarningsEvent }) {
    const beat    = event.epsActual != null && event.epsEstimate != null && event.epsActual >= event.epsEstimate;
    const epsSurp = event.epsActual != null && event.epsEstimate != null && event.epsEstimate !== 0
        ? ((event.epsActual - event.epsEstimate) / Math.abs(event.epsEstimate) * 100)
        : null;
    const d = new Date(event.date + "T12:00:00Z");
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" }).toUpperCase();
    const cell: React.CSSProperties = { ...mono, fontSize: 11, padding: "7px 14px", borderBottom: "1px solid var(--border)" };
    return (
        <tr>
            <td style={{ ...cell, color: "var(--text-muted)", fontSize: 10 }}>{dateLabel}</td>
            <td style={cell}>
                <span style={{ color: "var(--text)", fontWeight: 700 }}>{event.symbol}</span>
                {event.quarter && <span style={{ ...mono, fontSize: 9, color: "var(--text-muted)", marginLeft: 6 }}>Q{event.quarter}</span>}
            </td>
            <td style={{ ...cell, color: "var(--text-muted)", fontSize: 10 }}>{reportTimeShort(event.hour)}</td>
            <td style={{ ...cell, textAlign: "right", color: "var(--text-dim)" }}>{formatEps(event.epsEstimate)}</td>
            <td style={{ ...cell, textAlign: "right", color: beat ? "var(--up)" : "var(--down)", fontWeight: 600 }}>{formatEps(event.epsActual)}</td>
            <td style={{ ...cell, textAlign: "right", color: epsSurp == null ? "var(--text-muted)" : beat ? "var(--up)" : "var(--down)", fontWeight: 600 }}>
                {epsSurp != null ? (epsSurp >= 0 ? "+" : "") + epsSurp.toFixed(1) + "%" : "—"}
            </td>
            <td style={{ ...cell, textAlign: "right", color: "var(--text-dim)" }}>{formatRevenue(event.revenueEstimate)}</td>
            <td style={{ ...cell, textAlign: "right", color: "var(--text-dim)" }}>{formatRevenue(event.revenueActual)}</td>
        </tr>
    );
}

// ── Main component ──────────────────────────────────────────────────────────

export default function EarningsCalendar({ watchlistSymbols, activeSymbol, isLoggedIn }: Props) {
    const [earnings,      setEarnings]      = useState<EarningsEvent[]>([]);
    const [loading,       setLoading]       = useState(false);
    const [error,         setError]         = useState<string | null>(null);
    const [includeActive, setIncludeActive] = useState(!isLoggedIn);
    const [tooltip,       setTooltip]       = useState<TooltipState | null>(null);

    const now = new Date();
    const [viewYear,  setViewYear]  = useState(now.getFullYear());
    const [viewMonth, setViewMonth] = useState(now.getMonth());

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
            .catch(() => setError("FAILED TO LOAD EARNINGS DATA"))
            .finally(() => setLoading(false));
    }, [symbols.join(",")]);

    const eventsByDate = useMemo(() => {
        const map: Record<string, EarningsEvent[]> = {};
        for (const e of earnings) {
            if (!map[e.date]) map[e.date] = [];
            map[e.date].push(e);
        }
        return map;
    }, [earnings]);

    const todayStr = toDateStr(now);
    const cells    = getMonthGrid(viewYear, viewMonth);

    const past = useMemo(() =>
        [...earnings].filter(e => e.date < todayStr && e.epsActual != null)
                     .sort((a, b) => b.date.localeCompare(a.date))
                     .slice(0, 20),
        [earnings, todayStr]
    );

    function prevMonth() {
        if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
        else setViewMonth(m => m - 1);
    }
    function nextMonth() {
        if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
        else setViewMonth(m => m + 1);
    }

    function handleChipEnter(e: React.MouseEvent, ev: EarningsEvent) {
        setTooltip({ event: ev, x: e.clientX, y: e.clientY });
    }

    const thStyle: React.CSSProperties = {
        ...mono, fontSize: 9, fontWeight: 600, color: "var(--text-muted)",
        letterSpacing: "0.1em", padding: "6px 14px", textAlign: "left",
        borderBottom: "1px solid var(--border)", whiteSpace: "nowrap",
    };

    return (
        <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>

            {tooltip && <EarningsTooltip tip={tooltip} />}

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
                        onClick={() => setIncludeActive(v => !v)}
                        style={{
                            ...mono, fontSize: 10, letterSpacing: "0.08em", padding: "5px 12px",
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
                    {error}
                </div>
            )}

            {!loading && !error && symbols.length > 0 && (
                <>
                    {/* ── Calendar grid ── */}
                    <div style={{ border: "1px solid var(--border)" }}>

                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "10px 14px", borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
                            <button onClick={prevMonth} style={{ ...mono, fontSize: 13, background: "none", border: "1px solid var(--border-bright)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
                            <span style={{ ...mono, fontSize: 12, fontWeight: 700, color: "var(--text)", letterSpacing: "0.1em" }}>
                                {MONTHS[viewMonth]} {viewYear}
                            </span>
                            <button onClick={nextMonth} style={{ ...mono, fontSize: 13, background: "none", border: "1px solid var(--border-bright)", color: "var(--text-dim)", width: 28, height: 28, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--border)" }}>
                            {DAYS.map(d => (
                                <div key={d} style={{ background: "var(--panel)", padding: "6px 0", textAlign: "center" }}>
                                    <span style={{ ...mono, fontSize: 9, color: d === "SUN" || d === "SAT" ? "var(--border-bright)" : "var(--text-muted)", letterSpacing: "0.08em", fontWeight: 600 }}>{d}</span>
                                </div>
                            ))}
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 1, background: "var(--border)" }}>
                            {cells.map((date, i) => {
                                const ds     = date ? toDateStr(date) : null;
                                const events = ds ? (eventsByDate[ds] ?? []) : [];
                                return (
                                    <DayCell
                                        key={i}
                                        date={date}
                                        events={events}
                                        isCurrentMonth={date ? date.getMonth() === viewMonth : false}
                                        isToday={ds === todayStr}
                                        isPast={ds != null && ds < todayStr}
                                        onChipEnter={handleChipEnter}
                                        onChipLeave={() => setTooltip(null)}
                                    />
                                );
                            })}
                        </div>

                        <div style={{ display: "flex", alignItems: "center", gap: 16, padding: "8px 14px", borderTop: "1px solid var(--border)", background: "var(--panel)" }}>
                            {[
                                { color: "var(--up)",       bg: "var(--up-bg)",              label: "BEAT" },
                                { color: "var(--down)",     bg: "var(--down-bg)",             label: "MISSED" },
                                { color: "var(--text-dim)", bg: "rgba(255,255,255,0.04)",     label: "UPCOMING" },
                            ].map(({ color, bg, label }) => (
                                <div key={label} style={{ display: "flex", alignItems: "center", gap: 5 }}>
                                    <div style={{ width: 10, height: 10, background: bg, borderLeft: `2px solid ${color}` }} />
                                    <span style={{ ...mono, fontSize: 9, color: "var(--text-muted)", letterSpacing: "0.07em" }}>{label}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Recent results table ── */}
                    {past.length > 0 && (
                        <div style={{ border: "1px solid var(--border)", overflow: "hidden" }}>
                            <div style={{ ...mono, fontSize: 10, fontWeight: 600, letterSpacing: "0.1em", color: "var(--text-muted)", padding: "8px 14px", borderBottom: "1px solid var(--border)", background: "var(--panel)" }}>
                                RECENT RESULTS
                            </div>
                            <div style={{ overflowX: "auto" }}>
                                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                                    <thead>
                                        <tr>
                                            {["DATE","SYMBOL","TIME","EPS EST.","EPS ACT.","SURPRISE","REV. EST.","REV. ACT."].map((h, i) => (
                                                <th key={h} style={{ ...thStyle, textAlign: i >= 3 ? "right" : "left" }}>{h}</th>
                                            ))}
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {past.map((e, i) => <ResultRow key={i} event={e} />)}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    )}
                </>
            )}
        </div>
    );
}
