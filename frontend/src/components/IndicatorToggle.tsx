const INDICATORS = [
    { id: "sma",      label: "SMA",       group: "overlay" },
    { id: "ema",      label: "EMA",       group: "overlay" },
    { id: "bb",       label: "BB",        group: "overlay" },
    { id: "vwap",     label: "VWAP",      group: "overlay" },
    { id: "ichimoku", label: "Ichimoku",  group: "overlay" },
    { id: "rsi",      label: "RSI",       group: "panel" },
    { id: "macd",     label: "MACD",      group: "panel" },
    { id: "stoch",    label: "Stoch",     group: "panel" },
    { id: "atr",      label: "ATR",       group: "panel" },
    { id: "obv",      label: "OBV",       group: "panel" },
];

interface Props {
    active: Set<string>;
    onToggle: (id: string) => void;
}

export default function IndicatorToggle({ active, onToggle }: Props) {
    return (
        <div className="flex flex-wrap gap-1 mb-3">
            {INDICATORS.map(({ id, label }) => (
                <button
                    key={id}
                    onClick={() => onToggle(id)}
                    className={`px-2 py-1 text-xs rounded border transition-colors cursor-pointer ${
                        active.has(id)
                            ? "bg-white text-black border-white"
                            : "text-gray-400 border-[#2a2a2a] hover:border-gray-500 hover:text-white"
                    }`}
                >
                    {label}
                </button>
            ))}
        </div>
    );
}
