import React, { useState } from "react";
import type { DrawingTool } from "../lib/drawings";

const ICONS: Record<string, React.ReactNode> = {
    horizontal_line: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="9" r="1.5" fill="currentColor" />
            <circle cx="16" cy="9" r="1.5" fill="currentColor" />
        </svg>
    ),
    trend_line: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="14" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="14" r="1.5" fill="currentColor" />
            <circle cx="16" cy="4" r="1.5" fill="currentColor" />
        </svg>
    ),
    fib_retracement: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="8" x2="16" y2="8" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="11" x2="16" y2="11" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    ),
    fib_channel: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="5" x2="16" y2="8" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="8" x2="16" y2="11" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="10" x2="16" y2="13" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="13" x2="16" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="2" cy="5" r="1.5" fill="currentColor" />
            <circle cx="16" cy="8" r="1.5" fill="currentColor" />
            <circle cx="2" cy="13" r="1.5" fill="currentColor" strokeOpacity="0.5" />
        </svg>
    ),
    trend_based_fib_extension: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="14" x2="9" y2="5" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="14" r="1.5" fill="currentColor" />
            <circle cx="9" cy="5" r="1.5" fill="currentColor" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
            <line x1="9" y1="4" x2="16" y2="4" stroke="currentColor" strokeWidth="1" />
            <line x1="9" y1="7" x2="16" y2="7" stroke="currentColor" strokeWidth="1" />
            <line x1="9" y1="10" x2="16" y2="10" stroke="currentColor" strokeWidth="1" />
            <line x1="9" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1" />
        </svg>
    ),
    trend_based_fib_time: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="9" x2="8" y2="3" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="9" r="1.5" fill="currentColor" />
            <circle cx="8" cy="3" r="1.5" fill="currentColor" />
            <circle cx="8" cy="9" r="1.5" fill="currentColor" />
            <line x1="8" y1="2" x2="8" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <line x1="11" y1="2" x2="11" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <line x1="15" y1="2" x2="15" y2="16" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    ),
    fib_time_zone: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="3" y1="2" x2="3" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <line x1="6" y1="2" x2="6" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <line x1="10" y1="2" x2="10" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <line x1="15" y1="2" x2="15" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="14" x2="16" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.3" />
        </svg>
    ),
    fib_speed_resistance_fan: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="2" cy="16" r="1.5" fill="currentColor" />
            <line x1="2" y1="16" x2="16" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="16" x2="16" y2="10" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="16" x2="16" y2="5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="16" x2="12" y2="2" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    ),
    rectangle: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="4" width="14" height="10" stroke="currentColor" strokeWidth="1.5" />
        </svg>
    ),
    ray: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="14" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="14" r="1.5" fill="currentColor" />
            <polygon points="13,3 17,5 14,8" fill="currentColor" />
        </svg>
    ),
    extended_line: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="14" x2="16" y2="4" stroke="currentColor" strokeWidth="1.5" />
            <polygon points="1,11 3,16 6,13" fill="currentColor" />
            <polygon points="13,3 17,5 14,8" fill="currentColor" />
        </svg>
    ),
    info_line: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="14" x2="13" y2="4" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="14" r="1.5" fill="currentColor" />
            <circle cx="13" cy="4" r="1.5" fill="currentColor" />
            <text x="14" y="8" fontSize="6" fill="currentColor" fontFamily="monospace">i</text>
        </svg>
    ),
    trend_angle: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="13" x2="14" y2="4" stroke="currentColor" strokeWidth="1.5" />
            <path d="M 7 13 A 5 5 0 0 1 5.5 9" stroke="currentColor" strokeWidth="1" fill="none" />
        </svg>
    ),
    horizontal_ray: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="9" r="1.5" fill="currentColor" />
            <polygon points="14,6 18,9 14,12" fill="currentColor" />
        </svg>
    ),
    vertical_line: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="9" y1="2" x2="9" y2="16" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
        </svg>
    ),
    cross_line: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="2" x2="9" y2="16" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
        </svg>
    ),
    parallel_channel: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="5" x2="16" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="10" x2="16" y2="15" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="5" r="1.5" fill="currentColor" />
            <circle cx="16" cy="10" r="1.5" fill="currentColor" />
            <circle cx="2" cy="10" r="1.5" fill="currentColor" />
        </svg>
    ),
    disjoint_channel: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="5" x2="16" y2="10" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="13" x2="16" y2="8" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="5" r="1.5" fill="currentColor" />
            <circle cx="16" cy="10" r="1.5" fill="currentColor" />
            <circle cx="2" cy="13" r="1.5" fill="currentColor" />
        </svg>
    ),
    flat_top_bottom: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="5" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="13" x2="16" y2="13" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="2" cy="5" r="1.5" fill="currentColor" />
            <circle cx="16" cy="12" r="1.5" fill="currentColor" />
            <circle cx="2" cy="13" r="1.5" fill="currentColor" />
        </svg>
    ),
    regression_trend: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <line x1="2" y1="4" x2="16" y2="9" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
            <line x1="2" y1="7" x2="16" y2="12" stroke="currentColor" strokeWidth="1.5" />
            <line x1="2" y1="10" x2="16" y2="15" stroke="currentColor" strokeWidth="1" strokeDasharray="2,2" />
        </svg>
    ),
    pitchfan: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="3" cy="9" r="1.5" fill="currentColor" />
            <circle cx="9" cy="4" r="1.5" fill="currentColor" />
            <circle cx="9" cy="14" r="1.5" fill="currentColor" />
            <line x1="9" y1="4" x2="9" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="3" y1="9" x2="16" y2="2" stroke="currentColor" strokeWidth="1.2" />
            <line x1="3" y1="9" x2="16" y2="7" stroke="currentColor" strokeWidth="1.2" />
            <line x1="3" y1="9" x2="16" y2="11" stroke="currentColor" strokeWidth="1.2" />
            <line x1="3" y1="9" x2="16" y2="16" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    ),
    fib_circles: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="9" cy="9" r="2" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="9" cy="9" r="4.5" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="9" cy="9" r="7" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
            <line x1="9" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" strokeDasharray="2 2" />
        </svg>
    ),
    fib_speed_resistance_arcs: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="2" cy="16" r="1.5" fill="currentColor" />
            <path d="M 2 10 A 6 6 0 0 1 8 16" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <path d="M 2 5 A 11 11 0 0 1 13 16" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <path d="M 2 1 A 15 15 0 0 1 17 16" stroke="currentColor" strokeWidth="1.2" fill="none" />
        </svg>
    ),
    fib_wedge: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="2" cy="16" r="1.5" fill="currentColor" />
            <path d="M 2 10 A 6 6 0 0 1 8 16" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <path d="M 2 5 A 11 11 0 0 1 13 16" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <path d="M 2 1 A 15 15 0 0 1 17 16" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <line x1="2" y1="16" x2="17" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="16" x2="13" y2="4" stroke="currentColor" strokeWidth="1.2" />
            <line x1="2" y1="16" x2="17" y2="9" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    ),
    fib_spiral: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M 9 9 m 3 0 a 3 3 0 1 0 -3 3 a 6 6 0 1 0 6 -6 a 9 9 0 1 0 -9 9" stroke="currentColor" strokeWidth="1.2" fill="none" />
            <circle cx="9" cy="9" r="1.5" fill="currentColor" />
        </svg>
    ),
    pitchfork: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="3" cy="9" r="1.5" fill="currentColor" />
            <circle cx="9" cy="4" r="1.5" fill="currentColor" />
            <circle cx="9" cy="14" r="1.5" fill="currentColor" />
            <line x1="9" y1="4" x2="9" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="3" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="4" x2="16" y2="2" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9" y1="14" x2="16" y2="16" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    ),
    schiff_pitchfork: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="3" cy="9" r="1.5" fill="currentColor" />
            <circle cx="9" cy="4" r="1.5" fill="currentColor" />
            <circle cx="9" cy="14" r="1.5" fill="currentColor" />
            <line x1="9" y1="4" x2="9" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="6" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="4" x2="16" y2="2" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9" y1="14" x2="16" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="6" cy="9" r="1" fill="currentColor" strokeOpacity="0.6" />
        </svg>
    ),
    modified_schiff_pitchfork: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="3" cy="9" r="1.5" fill="currentColor" />
            <circle cx="9" cy="4" r="1.5" fill="currentColor" />
            <circle cx="9" cy="14" r="1.5" fill="currentColor" />
            <line x1="9" y1="4" x2="9" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.4" />
            <line x1="6" y1="6.5" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="9" y1="4" x2="16" y2="2" stroke="currentColor" strokeWidth="1.2" />
            <line x1="9" y1="14" x2="16" y2="16" stroke="currentColor" strokeWidth="1.2" />
            <circle cx="6" cy="6.5" r="1" fill="currentColor" strokeOpacity="0.6" />
        </svg>
    ),
    inside_pitchfork: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <circle cx="3" cy="9" r="1.5" fill="currentColor" />
            <circle cx="9" cy="4" r="1.5" fill="currentColor" strokeOpacity="0.4" />
            <circle cx="9" cy="14" r="1.5" fill="currentColor" strokeOpacity="0.4" />
            <circle cx="6" cy="6.5" r="1.5" fill="currentColor" />
            <circle cx="6" cy="11.5" r="1.5" fill="currentColor" />
            <line x1="9" y1="4" x2="9" y2="14" stroke="currentColor" strokeWidth="1" strokeOpacity="0.2" />
            <line x1="3" y1="9" x2="16" y2="9" stroke="currentColor" strokeWidth="1.5" />
            <line x1="6" y1="6.5" x2="16" y2="3.5" stroke="currentColor" strokeWidth="1.2" />
            <line x1="6" y1="11.5" x2="16" y2="14.5" stroke="currentColor" strokeWidth="1.2" />
        </svg>
    ),
};

const GROUPS = [
    {
        id: "lines",
        tools: [
            "horizontal_line",
            "horizontal_ray",
            "vertical_line",
            "cross_line",
            "trend_line",
            "ray",
            "extended_line",
            "info_line",
            "trend_angle",
        ] as DrawingTool[],
    },
    {
        id: "channels",
        tools: [
            "parallel_channel",
            "disjoint_channel",
            "flat_top_bottom",
            "regression_trend",
        ] as DrawingTool[],
    },
    {
        id: "fibonacci",
        tools: [
            "fib_retracement",
            "fib_time_zone",
            "trend_based_fib_extension",
            "fib_channel",
            "fib_speed_resistance_fan",
            "trend_based_fib_time",
            "pitchfan",
            "fib_circles",
            "fib_speed_resistance_arcs",
            "fib_wedge",
            "fib_spiral"
        ] as DrawingTool[],
    },
    {
        id: "shapes",
        tools: ["rectangle"] as DrawingTool[],
    },
    {
        id: "pitchfork",
        tools: ["pitchfork", "schiff_pitchfork", "modified_schiff_pitchfork", "inside_pitchfork"] as DrawingTool[],
    }
];

interface Props {
    activeTool: DrawingTool;
    onToolChange: (tool: DrawingTool) => void;
}

export default function DrawingToolbar({
    activeTool,
    onToolChange
}: Props) {
    const [lastTools, setLastTools] = useState<Record<string, string>>(() =>
        Object.fromEntries(GROUPS.map(g => [g.id, g.tools[0] as string]))
    );
    const [expanded, setExpanded] = useState<Record<string, boolean>>(() =>
        Object.fromEntries(GROUPS.map(g => [g.id, false]))
    );

    return <div style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        padding: "4px 4px",
        background: "var(--panel)",
        borderRight: "1px solid var(--border-bright)",
        width: 44,
        flexShrink: 0,
    }}>
        <button
            className={"t-tool-btn" + (activeTool === null ? " active" : "")}
            onClick={() => onToolChange(null)}
            title="Pointer"
        >
            <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
                <path d="M4 2 L4 13 L7 10 L9 15 L11 14 L9 9 L13 9 Z" stroke="currentColor" strokeWidth="1.2" strokeLinejoin="round" fill="none" />
            </svg>
        </button>

        <div style={{ width: "80%", height: 1, background: "var(--border-bright)", margin: "2px 0" }} />

        {GROUPS.map((group) => (
            <div key={group.id} style={{ position: "relative", display: "flex", alignItems: "center" }}>
                <button
                    className={"t-tool-btn" + (activeTool === lastTools[group.id] ? " active" : "")}
                    onClick={() => onToolChange(lastTools[group.id] as DrawingTool)}
                    title={lastTools[group.id]}
                >
                    {ICONS[lastTools[group.id]]}
                </button>
                <button
                    className="t-tool-chevron"
                    onClick={() => setExpanded(prev => {
                        const allClosed = Object.fromEntries(GROUPS.map(g => [g.id, false]));
                        return { ...allClosed, [group.id]: !prev[group.id] };
                    })}
                    title="Expand"
                >
                    {expanded[group.id] ? "◀" : "▶"}
                </button>
                {expanded[group.id] && (
                    <div style={{
                        position: "absolute",
                        left: "100%",
                        top: 0,
                        background: "var(--panel-hover)",
                        border: "1px solid var(--border-bright)",
                        borderRadius: 4,
                        padding: 4,
                        display: "flex",
                        flexDirection: "column",
                        gap: 2,
                        zIndex: 20,
                    }}>
                        {group.tools.map(tool => (
                            <button
                                key={tool}
                                className={"t-tool-btn" + (activeTool === tool ? " active" : "")}
                                onClick={() => {
                                    onToolChange(tool);
                                    setLastTools(prev => ({ ...prev, [group.id]: tool as string }));
                                }}
                                title={tool as string}
                            >
                                {ICONS[tool as string]}
                            </button>
                        ))}
                    </div>
                )}
            </div>
        ))}
    </div>
}