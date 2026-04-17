import { useState, useEffect, useRef } from "react";
import { supabase } from "../lib/supabase";
import { apiFetch } from "../lib/api";
import type { User } from "@supabase/supabase-js";

interface Alert {
    id: string;
    symbol: string;
    target: number;
    direction: "above" | "below";
    triggered: boolean;
}

interface Candle { time: string | number; close: number; }

interface Props {
    user: User;
}

const POLL_INTERVAL = 60_000;

async function requestNotificationPermission() {
    if (Notification.permission === "default") {
        await Notification.requestPermission();
    }
}

function notify(symbol: string, price: number, target: number, direction: "above" | "below") {
    if (Notification.permission !== "granted") return;
    new Notification(`Price Alert: ${symbol}`, {
        body: `${symbol} is ${direction} your target of $${target.toFixed(2)} (current: $${price.toFixed(2)})`,
        icon: "/favicon.ico",
    });
}

export default function PriceAlertPanel({ user }: Props) {
    const [alerts, setAlerts] = useState<Alert[]>([]);
    const [symbol, setSymbol] = useState("");
    const [target, setTarget] = useState("");
    const [direction, setDirection] = useState<"above" | "below">("above");
    const [error, setError] = useState<string | null>(null);
    const alertsRef = useRef<Alert[]>([]);
    alertsRef.current = alerts;

    // Load persisted alerts
    useEffect(() => {
        requestNotificationPermission();
        supabase
            .from("price_alerts")
            .select("id, symbol, target, direction, triggered")
            .eq("triggered", false)
            .then(({ data }) => { if (data) setAlerts(data); });
    }, [user.id]);

    // Poll prices every 60s and fire notifications
    useEffect(() => {
        const check = async () => {
            const active = alertsRef.current.filter((a) => !a.triggered);
            if (!active.length) return;

            const symbols = [...new Set(active.map((a) => a.symbol))];
            const prices: Record<string, number> = {};

            await Promise.all(
                symbols.map(async (sym) => {
                    try {
                        const { candles } = await apiFetch<{ candles: Candle[] }>(`/ohlcv/${sym}?timeframe=1D`);
                        if (candles.length) prices[sym] = candles[candles.length - 1].close;
                    } catch {}
                })
            );

            const triggered: string[] = [];
            for (const alert of active) {
                const price = prices[alert.symbol];
                if (price === undefined) continue;
                const hit =
                    (alert.direction === "above" && price >= alert.target) ||
                    (alert.direction === "below" && price <= alert.target);
                if (hit) {
                    notify(alert.symbol, price, alert.target, alert.direction);
                    triggered.push(alert.id);
                }
            }

            if (triggered.length) {
                await supabase.from("price_alerts").update({ triggered: true }).in("id", triggered);
                setAlerts((prev) => prev.map((a) => triggered.includes(a.id) ? { ...a, triggered: true } : a));
            }
        };

        check();
        const id = setInterval(check, POLL_INTERVAL);
        return () => clearInterval(id);
    }, []);

    const add = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        const sym = symbol.trim().toUpperCase();
        const t = parseFloat(target);
        if (!sym || isNaN(t) || t <= 0) { setError("Enter a valid symbol and price."); return; }

        const { data, error: dbErr } = await supabase
            .from("price_alerts")
            .insert({ user_id: user.id, symbol: sym, target: t, direction, triggered: false })
            .select("id, symbol, target, direction, triggered")
            .single();

        if (dbErr) { setError(dbErr.message); return; }
        if (data) setAlerts((prev) => [...prev, data]);
        setSymbol("");
        setTarget("");
    };

    const remove = async (id: string) => {
        await supabase.from("price_alerts").delete().eq("id", id);
        setAlerts((prev) => prev.filter((a) => a.id !== id));
    };

    const active = alerts.filter((a) => !a.triggered);
    const fired = alerts.filter((a) => a.triggered);

    return (
        <div className="bg-[#1a1a1a] border border-[#2a2a2a] rounded p-3">
            <p className="text-xs text-gray-500 mb-3">Price Alerts</p>

            <form onSubmit={add} className="flex flex-wrap gap-2 mb-3">
                <input
                    value={symbol}
                    onChange={(e) => setSymbol(e.target.value.toUpperCase())}
                    placeholder="Symbol"
                    className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs w-20 focus:outline-none focus:border-gray-500"
                />
                <select
                    value={direction}
                    onChange={(e) => setDirection(e.target.value as "above" | "below")}
                    className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs focus:outline-none cursor-pointer"
                >
                    <option value="above">Above</option>
                    <option value="below">Below</option>
                </select>
                <input
                    type="number"
                    value={target}
                    onChange={(e) => setTarget(e.target.value)}
                    placeholder="Price"
                    step="0.01"
                    className="bg-[#0f0f0f] border border-[#2a2a2a] rounded px-2 py-1 text-xs w-24 focus:outline-none focus:border-gray-500"
                />
                <button
                    type="submit"
                    className="px-3 py-1 text-xs bg-white text-black rounded hover:bg-gray-200 transition-colors cursor-pointer"
                >
                    Add
                </button>
                {error && <p className="w-full text-xs text-red-400">{error}</p>}
            </form>

            {active.length === 0 && fired.length === 0 && (
                <p className="text-xs text-gray-600">No alerts set.</p>
            )}

            <div className="flex flex-col gap-1">
                {active.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs text-gray-300">
                        <span>
                            <span className="font-medium text-white">{a.symbol}</span>
                            {" "}{a.direction}{" "}
                            <span className="text-yellow-400">${a.target.toFixed(2)}</span>
                        </span>
                        <button
                            onClick={() => remove(a.id)}
                            className="text-gray-600 hover:text-red-400 transition-colors cursor-pointer ml-2"
                        >
                            ×
                        </button>
                    </div>
                ))}
                {fired.map((a) => (
                    <div key={a.id} className="flex items-center justify-between text-xs text-gray-600 line-through">
                        <span>{a.symbol} {a.direction} ${a.target.toFixed(2)}</span>
                        <button
                            onClick={() => remove(a.id)}
                            className="hover:text-red-400 transition-colors cursor-pointer ml-2 no-underline"
                        >
                            ×
                        </button>
                    </div>
                ))}
            </div>
        </div>
    );
}