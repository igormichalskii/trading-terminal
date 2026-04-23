import { useEffect, useState } from "react";
import { apiFetch } from "../lib/api";
import "../terminal.css";

interface Props {
    onAskAI: () => void;
}

type MarketStatus = {
    label: string;
    action: string;       // "OPENS" | "CLOSES" | "OPENS TOMORROW"
    nextEtH: number;      // ET hour of the next event
    nextEtM: number;      // ET minute of the next event
    countdown?: string;   // "02:34 LEFT" — only shown when market is open
    open: boolean;
    extended: boolean;
};

function etToLocal(etH: number, etM: number): string {
    const now   = new Date();
    const etNow = new Date(now.toLocaleString("en-US", { timeZone: "America/New_York" }));
    const diffMins = (etH * 60 + etM) - (etNow.getHours() * 60 + etNow.getMinutes());
    const local = new Date(now.getTime() + diffMins * 60_000);
    return `${String(local.getHours()).padStart(2, "0")}:${String(local.getMinutes()).padStart(2, "0")}`;
}

function getMarketStatus(est: Date): MarketStatus {
    const day  = est.getDay();
    const mins = est.getHours() * 60 + est.getMinutes();

    const isWeekday = day >= 1 && day <= 5;
    const preOpen   = 4 * 60;
    const mktOpen   = 9 * 60 + 30;
    const mktClose  = 16 * 60;
    const extClose  = 20 * 60;

    if (!isWeekday || mins >= extClose || mins < preOpen) {
        return { label: "CLOSED",    action: "OPENS TOMORROW", nextEtH: 9,  nextEtM: 30, open: false, extended: false };
    }
    if (mins >= mktOpen && mins < mktClose) {
        const remaining = mktClose - mins;
        const rh = String(Math.floor(remaining / 60)).padStart(2, "0");
        const rm = String(remaining % 60).padStart(2, "0");
        return { label: "OPEN",      action: "CLOSES",         nextEtH: 16, nextEtM: 0,  open: true,  extended: false, countdown: `${rh}:${rm} LEFT` };
    }
    if (mins >= preOpen && mins < mktOpen) {
        return { label: "PRE-MKT",   action: "OPENS",          nextEtH: 9,  nextEtM: 30, open: false, extended: true  };
    }
    return     { label: "AFTER-HRS", action: "OPENS TOMORROW", nextEtH: 9,  nextEtM: 30, open: false, extended: true  };
}

export default function StatusBar({ onAskAI }: Props) {
    const [clock,    setClock]   = useState("");
    const [market,   setMarket]  = useState<MarketStatus>({ label: "—", action: "", nextEtH: 0, nextEtM: 0, open: false, extended: false });
    const [latency,  setLatency] = useState<number | null>(null);
    const [apiOk,    setApiOk]   = useState<boolean | null>(null);

    // Clock + market status — ticks every second
    useEffect(() => {
        function tick() {
            const est = new Date(new Date().toLocaleString("en-US", { timeZone: "America/New_York" }));
            const hh  = String(est.getHours()).padStart(2, "0");
            const mm  = String(est.getMinutes()).padStart(2, "0");
            const ss  = String(est.getSeconds()).padStart(2, "0");
            setClock(`${hh}:${mm}:${ss} ET`);
            setMarket(getMarketStatus(est));
        }
        tick();
        const id = setInterval(tick, 1000);
        return () => clearInterval(id);
    }, []);

    // Health check — on mount then every 30s
    useEffect(() => {
        async function ping() {
            const t0 = performance.now();
            try {
                await apiFetch("/health");
                setLatency(Math.round(performance.now() - t0));
                setApiOk(true);
            } catch {
                setLatency(null);
                setApiOk(false);
            }
        }
        ping();
        const id = setInterval(ping, 30_000);
        return () => clearInterval(id);
    }, []);

    const mktColor = market.open ? "var(--up)" : market.extended ? "var(--accent)" : "var(--text-muted)";

    return (
        <div className="t-status-bar">
            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                <span style={{ width: 6, height: 6, borderRadius: "50%", background: apiOk ? "var(--up)" : apiOk === false ? "var(--down)" : "var(--text-muted)", display: "inline-block", flexShrink: 0 }} />
                {apiOk === false ? "DISCONNECTED" : "LIVE · ALPACA"}
            </div>

            <span style={{ color: "var(--border-bright)" }}>│</span>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                LATENCY{" "}
                <span style={{ color: latency == null ? "var(--text-muted)" : latency < 200 ? "var(--up)" : latency < 600 ? "var(--accent)" : "var(--down)" }}>
                    {latency == null ? "—" : `${latency}ms`}
                </span>
            </div>

            <span style={{ color: "var(--border-bright)" }}>│</span>

            <div>{clock}</div>

            <span style={{ color: "var(--border-bright)" }}>│</span>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                MKT <span style={{ color: mktColor }}>{market.label}</span>
                {market.action && <>
                    <span style={{ color: "var(--text-muted)" }}>
                        · {market.action}{" "}
                        {String(market.nextEtH).padStart(2, "0")}:{String(market.nextEtM).padStart(2, "0")}
                    </span>
                    <span style={{ color: "var(--text-muted)" }}>
                        /{etToLocal(market.nextEtH, market.nextEtM)}
                    </span>
                    {market.countdown && (
                        <span style={{ color: "var(--text-muted)" }}>· {market.countdown}</span>
                    )}
                </>}
            </div>

            <span style={{ color: "var(--border-bright)" }}>│</span>

            <div style={{ display: "flex", alignItems: "center", gap: 5 }}>
                API <span style={{ color: apiOk ? "var(--up)" : apiOk === false ? "var(--down)" : "var(--text-muted)" }}>
                    {apiOk == null ? "—" : apiOk ? "OK" : "ERROR"}
                </span>
            </div>

            <button className="t-ai-badge" onClick={onAskAI}>⚡ ASK AI ASSISTANT</button>
        </div>
    );
}
