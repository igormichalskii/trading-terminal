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
    return val.toFixed(2);
}

function surprise(actual: number | null, estimate: number | null): string | null {
    if (actual == null || estimate == null || estimate === 0) return null;
    const pct = ((actual - estimate) / Math.abs(estimate)) * 100;
    return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%";
}

function reportTime(hour: string): string {
    if (hour === "bmo") return "Pre-market";
    if (hour === "amc") return "After-hours";
    if (hour === "dmh") return "During hours";
    return "—";
}

function labelDate(dateStr: string): { label: string; isToday: boolean; isPast: boolean } {
    const today = new Date().toISOString().slice(0, 10);
    const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10);
    const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
    if (dateStr === today)     return { label: "Today",     isToday: true,  isPast: false };
    if (dateStr === yesterday) return { label: "Yesterday", isToday: false, isPast: true  };
    if (dateStr === tomorrow)  return { label: "Tomorrow",  isToday: false, isPast: false };
    const d = new Date(dateStr + "T12:00:00Z");
    const isPast = dateStr < today;
    return {
        label: d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
        isToday: false,
        isPast,
    };
}

export default function EarningsCalendar({ watchlistSymbols, activeSymbol, isLoggedIn }: Props) {
    const [earnings, setEarnings] = useState<EarningsEvent[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [includeActive, setIncludeActive] = useState(!isLoggedIn);

    const activeInWatchlist = watchlistSymbols.includes(activeSymbol);

    const symbols = (() => {
        const base = [...watchlistSymbols];
        if (!activeInWatchlist && activeSymbol && includeActive) {
            base.push(activeSymbol);
        }
        return [...new Set(base)];
    })();

    useEffect(() => {
        if (symbols.length === 0) {
            setEarnings([]);
            return;
        }
        setLoading(true);
        setError(null);
        apiFetch<{ earnings: EarningsEvent[] }>(`/earnings?symbols=${symbols.join(",")}`)
            .then(({ earnings }) => setEarnings(earnings))
            .catch(() => setError("Failed to load earnings data"))
            .finally(() => setLoading(false));
    }, [symbols.join(",")]);

    const today = new Date().toISOString().slice(0, 10);
    const upcoming = earnings.filter((e) => e.date >= today);
    const past     = earnings.filter((e) => e.date < today).reverse();

    function renderTable(events: EarningsEvent[], showSurprise: boolean) {
        if (events.length === 0) return (
            <p className="text-sm text-gray-600 py-6 text-center">Nothing to show</p>
        );
        return (
            <table className="w-full text-sm">
                <thead>
                    <tr className="text-xs text-gray-500 border-b border-[#2a2a2a]">
                        <th className="text-left py-2 px-4 font-medium">Date</th>
                        <th className="text-left py-2 px-4 font-medium">Symbol</th>
                        <th className="text-left py-2 px-4 font-medium">Time</th>
                        <th className="text-right py-2 px-4 font-medium">EPS Est.</th>
                        {showSurprise && <th className="text-right py-2 px-4 font-medium">EPS Actual</th>}
                        {showSurprise && <th className="text-right py-2 px-4 font-medium">Surprise</th>}
                        <th className="text-right py-2 px-4 font-medium">Rev. Est.</th>
                        {showSurprise && <th className="text-right py-2 px-4 font-medium">Rev. Actual</th>}
                    </tr>
                </thead>
                <tbody>
                    {events.map((e, i) => {
                        const { label, isToday } = labelDate(e.date);
                        const epsSurprise = surprise(e.epsActual, e.epsEstimate);
                        const beat = e.epsActual != null && e.epsEstimate != null && e.epsActual >= e.epsEstimate;
                        return (
                            <tr
                                key={i}
                                className={`border-b border-[#2a2a2a] last:border-0 ${
                                    isToday ? "bg-white/5" : "hover:bg-white/[0.02]"
                                }`}
                            >
                                <td className="py-3 px-4">
                                    <span className={`${isToday ? "text-white font-medium" : "text-gray-400"}`}>
                                        {label}
                                    </span>
                                </td>
                                <td className="py-3 px-4">
                                    <span className="font-medium text-gray-100">{e.symbol}</span>
                                    {e.quarter && e.year && (
                                        <span className="text-xs text-gray-600 ml-1.5">Q{e.quarter} {e.year}</span>
                                    )}
                                </td>
                                <td className="py-3 px-4 text-gray-500 text-xs">{reportTime(e.hour)}</td>
                                <td className="py-3 px-4 text-right text-gray-400">{formatEps(e.epsEstimate)}</td>
                                {showSurprise && (
                                    <td className="py-3 px-4 text-right text-gray-300">{formatEps(e.epsActual)}</td>
                                )}
                                {showSurprise && (
                                    <td className="py-3 px-4 text-right">
                                        {epsSurprise ? (
                                            <span className={beat ? "text-green-400" : "text-red-400"}>
                                                {epsSurprise}
                                            </span>
                                        ) : "—"}
                                    </td>
                                )}
                                <td className="py-3 px-4 text-right text-gray-400">{formatRevenue(e.revenueEstimate)}</td>
                                {showSurprise && (
                                    <td className="py-3 px-4 text-right text-gray-300">{formatRevenue(e.revenueActual)}</td>
                                )}
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        );
    }

    return (
        <div className="flex-1 min-w-0 space-y-6">
            {/* Page header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-lg font-semibold text-gray-100">Earnings Calendar</h1>
                    <p className="text-xs text-gray-500 mt-0.5">±8 weeks · {symbols.length} symbol{symbols.length !== 1 ? "s" : ""}</p>
                </div>

                {/* Toggle: include active symbol */}
                {!activeInWatchlist && activeSymbol && (
                    <button
                        onClick={() => setIncludeActive((v) => !v)}
                        className="flex items-center gap-2 text-sm cursor-pointer"
                    >
                        <span className="text-gray-400">Include <span className="text-gray-200 font-medium">{activeSymbol}</span></span>
                        <div className={`w-9 h-5 rounded-full transition-colors relative ${includeActive ? "bg-white/20" : "bg-[#2a2a2a]"}`}>
                            <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white transition-transform ${includeActive ? "translate-x-4" : "translate-x-0.5"}`} />
                        </div>
                    </button>
                )}
            </div>

            {/* No symbols state */}
            {symbols.length === 0 && (
                <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] p-12 text-center">
                    <p className="text-gray-400 text-sm">
                        {isLoggedIn
                            ? "Add symbols to your watchlist to see their earnings here."
                            : "Sign in to use your watchlist, or toggle the active symbol above."}
                    </p>
                </div>
            )}

            {loading && (
                <div className="flex justify-center py-16">
                    <div className="w-6 h-6 border-2 border-gray-600 border-t-white rounded-full animate-spin" />
                </div>
            )}

            {!loading && error && (
                <p className="text-sm text-red-400 text-center py-8">{error}</p>
            )}

            {!loading && !error && symbols.length > 0 && (
                <>
                    {/* Upcoming */}
                    <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#2a2a2a]">
                            <h2 className="text-sm font-medium text-gray-200">Upcoming</h2>
                        </div>
                        {renderTable(upcoming, false)}
                    </div>

                    {/* Past results */}
                    <div className="bg-[#1a1a1a] rounded-lg border border-[#2a2a2a] overflow-hidden">
                        <div className="px-4 py-3 border-b border-[#2a2a2a]">
                            <h2 className="text-sm font-medium text-gray-200">Recent Results</h2>
                        </div>
                        {renderTable(past, true)}
                    </div>
                </>
            )}
        </div>
    );
}
