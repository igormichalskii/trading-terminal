import { useState } from "react";
import PriceChart from "./components/PriceChart";

interface Stats {
  time: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export default function App() {
  const [symbol, setSymbol] = useState("AAPL");
  const [input, setInput] = useState("AAPL");
  const [timeframe, setTimeframe] = useState("1M");
  const [stats, setStats] = useState<Stats | null>(null);

  return (
    <div className="min-h-screen bg-[#0f0f0f] text-white p-6">
      <div className="max-w-5x1 mx-auto">

        <div className="flex items-center gap-3 mb-6">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value.toUpperCase())}
            onKeyDown={(e) => e.key === "Enter" && setSymbol(input)}
            placeholder="Symbol e.g. AAPL"
            className="bg-[#1a1a1a] border border-[#2a2a2a] rounded px-3 py-2 text-sm w-40 focus:outline-none focus:border-gray-500"
            />
            <button
              onClick={() => setSymbol(input)}
              className="bg-white text-black text-sm px-4 py-2 rounded hover:bg-gray-200 transition-colors"
              >
                Load
              </button>
              <span className="text-xl font-semibold ml-2">{symbol}</span>
        </div>

        <PriceChart
          symbol={symbol}
          timeframe={timeframe}
          onTimeframeChange={setTimeframe}
          onStatsChange={setStats}
          />

          {stats && (
            <div className="grid grid-cols-5 gap-3 mt-4">
              {[
                { label: "Open", value: stats.open.toFixed(2) },
                { label: "High", value: stats.high.toFixed(2) },
                { label: "Low", value: stats.low.toFixed(2) },
                { label: "Close", value: stats.close.toFixed(2) },
                { label: "Volume", value: Number(stats.volume).toLocaleString() },
              ].map(({ label, value }) => (
                <div key={label} className="bg-[#1a1a1a] rounded p-3">
                  <div className="text-xs text-gray-500 mb-1">{label}</div>
                  <div className="text-sm font-medium">{value}</div>
                </div>
              ))}
            </div>
          )}

      </div>
    </div>
  );
}