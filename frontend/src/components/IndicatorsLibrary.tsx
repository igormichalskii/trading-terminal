import type { User } from "@supabase/supabase-js";

const INDICATORS = [
    { id: "sma", label: "SMA" },
    { id: "ema", label: "EMA" },
    { id: "bb", label: "BB" },
    { id: "vwap", label: "VWAP" },
    { id: "wma", label: "WMA" },
    { id: "dema", label: "DEMA" },
    { id: "tema", label: "TEMA" },
    { id: "kc", label: "KC" },
    { id: "dc", label: "DC" },
]

interface Props {
    user: User | null;
    pinnedIndicators: Set<string>;
    isOpen: boolean;
    onPin: (id: string) => void;
    onUnpin: (id: string) => void;
    onClose: () => void;
}

export default function IndicatorsLibrary({
    user,
    pinnedIndicators,
    isOpen,
    onPin,
    onUnpin,
    onClose,
}: Props) {
    
    return (
        <div
            style={{ position: "fixed", inset: 0, zIndex: 50, display: isOpen ? "flex" : "none", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0.7)" }}
            onClick={onClose}
        >
            <div
                style={{ background: "var(--panel)", border: "1px solid var(--border-bright)", padding: "28px 24px", width: "100%", maxWidth: 360, margin: "0 16px" }}
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 24 }}>
                    <div style={{ width: 14, height: 14, background: "var(--accent)", clipPath: "polygon(0 0, 100% 0, 100% 50%, 50% 50%, 50% 100%, 0 100%)", flexShrink: 0 }} />
                    <span style={{ fontFamily: "var(--font-mono)", fontSize: 11, fontWeight: 700, color: "var(--text)", letterSpacing: "0.1em", textTransform: "uppercase" }}>
                        indicators
                    </span>
                </div>

                <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 20 }}>
                    {INDICATORS.map((indicator) => (
                        <div 
                            key={indicator.id}
                            style={{ display: "flex", justifyContent: "space-between"}}                            
                        >
                            <span>
                                {indicator.label}
                            </span>
                            {user === null ? (
                                <span
                                    style={{ fontFamily: "var(--font-mono)", fontSize: 10, color: "var(--accent)", background: "none", border: "none", cursor: "pointer", letterSpacing: "0.04em", textDecoration: "underline" }}
                                >
                                    Sign In First
                                </span>
                            ) : (
                            <button
                                style={{ color: pinnedIndicators.has(indicator.id) ? "rgb(244, 202, 51)" : "#7d7c7c"}}
                                onClick={() => {
                                    if (pinnedIndicators.has(indicator.id)) onUnpin(indicator.id);
                                    else onPin(indicator.id);
                                }}
                            >
                                {pinnedIndicators.has(indicator.id) ? "★" : "☆"}
                            </button>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}