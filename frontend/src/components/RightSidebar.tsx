const PANELS = [
    { id: "indicators", label: "IND" },
    { id: "news", label: "NEWS" },
    { id: "predictions", label: "PRED" },
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
            <div style={{ width: 48 }}>
                {PANELS.map(({ id, label }) => (
                    <button
                        key={id}
                        className={id === activePanel ? "active" : ""}
                        onClick={() => onToggle(id)}
                    >
                        {label}
                    </button>
                ))}
            </div>
        </div>
    )
}