const FEATURES = [
    {
        label: "Interactive Charts",
        desc:  "Candlestick charts with 10+ technical indicators — SMA, EMA, RSI, MACD, Bollinger Bands, Ichimoku, and more.",
    },
    {
        label: "Portfolio Optimizer",
        desc:  "Modern Portfolio Theory engine running 2,000 Monte Carlo simulations to find your optimal risk-adjusted allocation.",
    },
    {
        label: "Earnings Calendar",
        desc:  "Month-view calendar tracking upcoming earnings dates and historical results with beat/miss analysis for every symbol.",
    },
    {
        label: "Live Watchlist",
        desc:  "Persistent watchlist with real-time prices, daily change, and sortable market-mover view.",
    },
    {
        label: "AI Trading Assistant",
        desc:  "Context-aware AI advisor with access to your current chart, indicators, and portfolio data.",
    },
    {
        label: "Preset Portfolios",
        desc:  "One-click optimization for NASDAQ Top 5, 10, and 20, plus your own saved custom presets.",
    },
];

export default function MobileGate() {
    return (
        <div style={{
            minHeight: "100vh",
            background: "#0a0a0a",
            color: "#f2f2f2",
            display: "flex",
            flexDirection: "column",
            padding: "40px 24px 48px",
            boxSizing: "border-box",
            overflowY: "auto",
        }}>

            {/* Logo */}
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 48 }}>
                <div style={{
                    width: 22, height: 22,
                    background: "#3b82f6",
                    clipPath: "polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)",
                    flexShrink: 0,
                }} />
                <span style={{ fontFamily: "'JetBrains Mono', 'Consolas', monospace", fontWeight: 700, fontSize: 15, color: "#3b82f6", letterSpacing: "0.1em" }}>
                    TERMINAL
                </span>
            </div>

            {/* Hero */}
            <div style={{ marginBottom: 40 }}>
                <h1 style={{
                    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                    fontSize: 28, fontWeight: 700, lineHeight: 1.2,
                    color: "#f2f2f2", letterSpacing: "-0.01em",
                    margin: "0 0 16px",
                }}>
                    Professional-grade trading tools for retail investors.
                </h1>
                <p style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: 15, lineHeight: 1.6,
                    color: "#a8a8a8", margin: 0,
                }}>
                    Everything you need to research, analyze, and optimize — in one terminal built for the modern investor.
                </p>
            </div>

            {/* Feature list */}
            <div style={{ display: "flex", flexDirection: "column", gap: 1, marginBottom: 48 }}>
                {FEATURES.map(({ label, desc }) => (
                    <div key={label} style={{
                        background: "#111111",
                        borderLeft: "2px solid #3b82f6",
                        padding: "14px 16px",
                    }}>
                        <div style={{
                            fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                            fontSize: 11, fontWeight: 700, letterSpacing: "0.08em",
                            color: "#3b82f6", marginBottom: 5, textTransform: "uppercase",
                        }}>
                            {label}
                        </div>
                        <div style={{
                            fontFamily: "Inter, system-ui, sans-serif",
                            fontSize: 13, lineHeight: 1.5, color: "#727272",
                        }}>
                            {desc}
                        </div>
                    </div>
                ))}
            </div>

            {/* Screen size notice */}
            <div style={{
                border: "1px solid #2a2a2a",
                padding: "20px",
                marginTop: "auto",
            }}>
                <div style={{
                    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                    fontSize: 11, fontWeight: 700, letterSpacing: "0.1em",
                    color: "#f59e0b", marginBottom: 8,
                }}>
                    ⚠ LARGER SCREEN REQUIRED
                </div>
                <p style={{
                    fontFamily: "Inter, system-ui, sans-serif",
                    fontSize: 13, lineHeight: 1.5, color: "#727272", margin: 0,
                }}>
                    Terminal is designed for tablets, laptops, and desktops. Please open it on a device with a screen wider than 768px for the full experience.
                </p>
                <div style={{
                    fontFamily: "'JetBrains Mono', 'Consolas', monospace",
                    fontSize: 10, color: "#3b82f6", marginTop: 12, letterSpacing: "0.06em",
                }}>
                    TRY ROTATING YOUR DEVICE TO LANDSCAPE →
                </div>
            </div>

        </div>
    );
}
