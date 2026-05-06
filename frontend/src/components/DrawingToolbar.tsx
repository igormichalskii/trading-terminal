import type { DrawingTool } from "../lib/drawings";

interface Props {
    activeTool: DrawingTool;
    onToolChange: (tool: DrawingTool) => void;
}

export default function DrawingToolbar({
    activeTool,
    onToolChange
}: Props) {

    return (
        <div>
            <button
                className={"t-tf-btn" + (activeTool === null ? " active" : "")}
                onClick={() => onToolChange(null)}
            >
                pointer
            </button>
            <button
                className={"t-tf-btn" + (activeTool === "horizontal_line" ? " active" : "")}
                onClick={() => onToolChange("horizontal_line")}
            >
                horizontal line
            </button>
            <button
                className={"t-tf-btn" + (activeTool === "trend_line" ? " active" : "")}
                onClick={() => onToolChange("trend_line")}
            >
                trend line
            </button>
            <button
                className={"t-tf-btn" + (activeTool === "rectangle" ? " active" : "")}
                onClick={() => onToolChange("rectangle")}
            >
                rectangle
            </button>
            <button
                className={"t-tf-btn" + (activeTool === "fib_retracement" ? " active" : "")}
                onClick={() => onToolChange("fib_retracement")}
            >
                fib retracement
            </button>
        </div>

    )
}