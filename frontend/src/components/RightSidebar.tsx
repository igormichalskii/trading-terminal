import "../terminal.css";

const PANEL_ICONS: Record<string, React.ReactNode> = {
    watchlist: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <line x1="5" y1="4" x2="13" y2="4" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="5" y1="8" x2="13" y2="8" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="5" y1="12" x2="13" y2="12" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="2.5" cy="4" r="1" fill="currentColor"/>
            <circle cx="2.5" cy="8" r="1" fill="currentColor"/>
            <circle cx="2.5" cy="12" r="1" fill="currentColor"/>
        </svg>
    ),
    indicators: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <polyline points="1,12 5,7 8,9 11,4 15,6" stroke="currentColor" strokeWidth="1.2" fill="none"/>
            <line x1="1" y1="14" x2="15" y2="14" stroke="currentColor" strokeWidth="1"/>
        </svg>
    ),
    news: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <rect x="2" y="2" width="12" height="12" rx="1" stroke="currentColor" strokeWidth="1.2"/>
            <line x1="5" y1="6" x2="11" y2="6" stroke="currentColor" strokeWidth="1"/>
            <line x1="5" y1="8.5" x2="11" y2="8.5" stroke="currentColor" strokeWidth="1"/>
            <line x1="5" y1="11" x2="9" y2="11" stroke="currentColor" strokeWidth="1"/>
        </svg>
    ),
    predictions: (
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <circle cx="8" cy="8" r="5.5" stroke="currentColor" strokeWidth="1.2"/>
            <circle cx="8" cy="8" r="2" stroke="currentColor" strokeWidth="1"/>
            <line x1="8" y1="1" x2="8" y2="3" stroke="currentColor" strokeWidth="1"/>
            <line x1="8" y1="13" x2="8" y2="15" stroke="currentColor" strokeWidth="1"/>
            <line x1="1" y1="8" x2="3" y2="8" stroke="currentColor" strokeWidth="1"/>
            <line x1="13" y1="8" x2="15" y2="8" stroke="currentColor" strokeWidth="1"/>
        </svg>
    ),
};

import React from "react";

const PANELS = [
    { id: "watchlist" },
    { id: "indicators" },
    { id: "news" },
    { id: "predictions" },
];

interface Props {
    activePanel: string | null;
    onToggle: (panel: string) => void;
}

export default function RightSidebar({
    activePanel,
    onToggle,
}: Props) {
    return (
        <div className="t-panel t-right-sidebar">
            <div style={{ display: "flex", flexDirection: "column", gap: 4, width: "100%" }}>
                {PANELS.map(({ id }) => (
                    <button
                        key={id}
                        className={id === activePanel ? "active" : ""}
                        onClick={() => onToggle(id)}
                        title={id.charAt(0).toUpperCase() + id.slice(1)}
                    >
                        {PANEL_ICONS[id]}
                    </button>
                ))}
            </div>
        </div>
    )
}