import { useState, useEffect } from "react";
import { supabase } from "../lib/supabase";
import { tickerError } from "../lib/validation";
import type { User } from "@supabase/supabase-js";

interface WatchlistItem {
    id: string;
    symbol: string;
}

interface Props {
    user: User;
    activeSymbol: string;
    onSelect: (symbol: string) => void;
    onSymbolsChange?: (symbols: string[]) => void;
}

export default function WatchlistPanel({ user, activeSymbol, onSelect, onSymbolsChange }: Props) {
    const [items, setItems] = useState<WatchlistItem[]>([]);
    const [input, setInput] = useState("");
    const [inputErr, setInputErr] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        supabase
            .from("watchlist")
            .select("id, symbol")
            .order("created_at", { ascending: true })
            .then(({ data }) => {
                if (data) {
                    setItems(data);
                    onSymbolsChange?.(data.map((i) => i.symbol));
                }
                setLoading(false);
            });
    }, [user.id]);

    const add = async () => {
        const symbol = input.trim().toUpperCase();
        const err = tickerError(symbol);
        if (err) { setInputErr(err); return; }
        if (items.some((i) => i.symbol === symbol)) { setInputErr("Already in watchlist."); return; }
        setInputErr(null);
        const { data, error } = await supabase
            .from("watchlist")
            .insert({ user_id: user.id, symbol })
            .select("id, symbol")
            .single();
        if (!error && data) {
            setItems((prev) => {
                const next = [...prev, data];
                onSymbolsChange?.(next.map((i) => i.symbol));
                return next;
            });
            setInput("");
        }
    };

    const remove = async (id: string) => {
        await supabase.from("watchlist").delete().eq("id", id);
        setItems((prev) => {
            const next = prev.filter((i) => i.id !== id);
            onSymbolsChange?.(next.map((i) => i.symbol));
            return next;
        });
    };

    return (
        <div className="w-44 shrink-0 flex flex-col gap-1">
            <p className="text-xs text-gray-500 mb-1 px-1">Watchlist</p>

            <div className="flex gap-1">
                <input
                    value={input}
                    onChange={(e) => { setInput(e.target.value.toUpperCase()); setInputErr(null); }}
                    onKeyDown={(e) => e.key === "Enter" && add()}
                    placeholder="Add symbol"
                    className="flex-1 min-w-0 bg-[#1a1a1a] rounded px-2 py-1 text-xs focus:outline-none"
                    style={{ border: `1px solid ${inputErr ? "#ff4757" : "#2a2a2a"}` }}
                />
                <button
                    onClick={add}
                    className="px-2 py-1 text-xs bg-[#1a1a1a] border border-[#2a2a2a] rounded hover:border-gray-500 transition-colors cursor-pointer"
                >
                    +
                </button>
            </div>
            {inputErr && <p className="text-xs px-1" style={{ color: "#ff4757" }}>{inputErr}</p>}

            <div className="flex flex-col gap-0.5 mt-1">
                {loading ? (
                    <p className="text-xs text-gray-600 px-1">Loading…</p>
                ) : items.length === 0 ? (
                    <p className="text-xs text-gray-600 px-1">Empty</p>
                ) : (
                    items.map((item) => (
                        <div
                            key={item.id}
                            className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer group transition-colors ${
                                item.symbol === activeSymbol
                                    ? "bg-white/10 text-white"
                                    : "text-gray-400 hover:text-white hover:bg-white/5"
                            }`}
                            onClick={() => onSelect(item.symbol)}
                        >
                            <span className="text-xs font-medium">{item.symbol}</span>
                            <button
                                onClick={(e) => { e.stopPropagation(); remove(item.id); }}
                                className="text-gray-600 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer text-xs leading-none"
                            >
                                ×
                            </button>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
}