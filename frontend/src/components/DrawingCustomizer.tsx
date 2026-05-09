import type { Drawing, DrawingUpdate } from "../lib/drawings";

const LEVELS = [0, 0.236, 0.382, 0.5, 0.618, 0.786, 1];

interface Props {
    drawing: Drawing;
    onUpdate: (id: string, changes: DrawingUpdate) => void;
}

export default function DrawingCustomizer({
    drawing,
    onUpdate,
}: Props) {
    const label = (text: string) => (
        <span style={{ fontSize: 11, color: "var(--text-dim)", width: 58, flexShrink: 0 }}>{text}</span>
    );

    const row = (children: React.ReactNode) => (
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>{children}</div>
    );

    return (
        <div style={{
            position: "absolute", top: 8, right: 8, zIndex: 10,
            background: "#1a1a1a", border: "1px solid #2a2a2a",
            borderRadius: 6, padding: "10px 12px",
            display: "flex", flexDirection: "column", gap: 8,
            minWidth: 230, fontFamily: "var(--font-mono)", fontSize: 12,
        }}>
            {row(<>
                {label("Color")}
                <input
                    type="color"
                    value={drawing.color}
                    onChange={(e) => onUpdate(drawing.id, { color: e.target.value })}
                    style={{ width: 28, height: 22, padding: 0, border: "1px solid #2a2a2a", borderRadius: 3, cursor: "pointer", background: "none" }}
                />
            </>)}

            {row(<>
                {label("Width")}
                <input
                    type="range"
                    value={drawing.lineWidth}
                    min={1} max={4}
                    onChange={(e) => onUpdate(drawing.id, { lineWidth: Number(e.target.value) })}
                    style={{ flex: 1 }}
                />
                <span style={{ color: "var(--text-dim)", fontSize: 11, width: 12 }}>{drawing.lineWidth}</span>
            </>)}

            {row(<>
                {label("Style")}
                <div style={{ display: "flex", gap: 4 }}>
                    {(["solid", "dashed", "dotted"] as const).map((s) => (
                        <button
                            key={s}
                            className={"t-tf-btn" + (drawing.lineStyle === s ? " active" : "")}
                            onClick={() => onUpdate(drawing.id, { lineStyle: s })}
                        >
                            {s[0].toUpperCase() + s.slice(1)}
                        </button>
                    ))}
                </div>
            </>)}

            {drawing.type === "rectangle" && row(<>
                {label("Opacity")}
                <input
                    type="range"
                    value={drawing.fillOpacity}
                    min={0} max={1} step={0.05}
                    onChange={(e) => onUpdate(drawing.id, { fillOpacity: Number(e.target.value) })}
                    style={{ flex: 1 }}
                />
                <span style={{ color: "var(--text-dim)", fontSize: 11, width: 28 }}>
                    {Math.round(drawing.fillOpacity * 100)}%
                </span>
            </>)}

            {drawing.type === "fib_retracement" && (
                <div>
                    {label("Levels")}
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 10px", marginTop: 6 }}>
                        {LEVELS.map((l) => (
                            <label key={l} style={{ display: "flex", alignItems: "center", gap: 4, fontSize: 11, color: "var(--text-dim)", cursor: "pointer" }}>
                                <input
                                    type="checkbox"
                                    checked={drawing.levels.includes(l)}
                                    onChange={(e) => {
                                        const newLevels = e.target.checked
                                            ? [...drawing.levels, l].sort((a, b) => a - b)
                                            : drawing.levels.filter((lvl) => lvl !== l);
                                        onUpdate(drawing.id, { levels: newLevels });
                                    }}
                                />
                                {(l * 100).toFixed(1)}%
                            </label>
                        ))}
                    </div>
                </div>
            )}

            {row(<>
                {label("Label")}
                <input
                    type="text"
                    value={drawing.label ?? ""}
                    placeholder="Label..."
                    onChange={(e) => onUpdate(drawing.id, { label: e.target.value })}
                    style={{
                        flex: 1, background: "#0f0f0f", border: "1px solid #2a2a2a",
                        borderRadius: 3, padding: "3px 6px", color: "var(--text)",
                        fontSize: 11, fontFamily: "var(--font-mono)", outline: "none",
                    }}
                />
            </>)}
        </div>
    )
}