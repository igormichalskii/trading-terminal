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
    rectangle: (
        <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <rect x="2" y="4" width="14" height="10" stroke="currentColor" strokeWidth="1.5" />
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
};

const GROUPS = [
    {
        id: "lines",
        tools: [
            "horizontal_line", 
            "trend_line", 
            "horizontal_ray", 
            "vertical_line", 
            "cross_line",
        ] as DrawingTool[],
    },
    {
        id: "fibonacci",
        tools: ["fib_retracement"] as DrawingTool[],
    },
    {
        id: "shapes",
        tools: ["rectangle"] as DrawingTool[],
    },
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

    return <div>
        {GROUPS.map((group) => (
            <div key={group.id} style={{ position: "relative" }}>
                <div style={{ display: "flex", alignItems: "center" }}>
                    <button
                        className={"t-tool-btn" + (activeTool === lastTools[group.id] ? " active" : "")}
                        onClick={() => onToolChange(lastTools[group.id] as DrawingTool)}
                        title={lastTools[group.id]}
                    >
                        {ICONS[lastTools[group.id]]}
                    </button>
                    <button
                        className="t-tool-btn"
                        onClick={() => setExpanded(prev => ({ ...prev, [group.id]: !prev[group.id] }))}
                        style={{ fontSize: 9, padding: "2px 3px" }}
                    >
                        {expanded[group.id] ? "◀" : "▶"}
                    </button>
                </div>
                {expanded[group.id] && (
                    <div style={{
                        position: "absolute",
                        left: "100%",
                        top: 0,
                        background: "#1a1a1a",
                        border: "1px solid #2a2a2a",
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