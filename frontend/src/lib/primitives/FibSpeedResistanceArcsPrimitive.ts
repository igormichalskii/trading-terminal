import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { FibSpeedResistanceArcsDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class FibSpeedResistanceArcsRenderer implements IPrimitivePaneRenderer {
    private _drawing: FibSpeedResistanceArcsDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibSpeedResistanceArcsDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    draw(target: any): void {
        target.useBitmapCoordinateSpace(({ context, verticalPixelRatio, horizontalPixelRatio }: {
            context: CanvasRenderingContext2D;
            verticalPixelRatio: number;
            horizontalPixelRatio: number;
        }) => {
            const x1 = this._drawing.p1.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p1.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p1.time as any);
            const x2 = this._drawing.p2.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p2.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p2.time as any);
            const y1 = this._seriesRef.current?.priceToCoordinate(this._drawing.p1.price);
            const y2 = this._seriesRef.current?.priceToCoordinate(this._drawing.p2.price);
            if (x1 == null || x2 == null || y1 == null || y2 == null) return;
            const x1Px = Math.round(x1 * horizontalPixelRatio);
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            const y1Px = Math.round(y1 * verticalPixelRatio);
            const y2Px = Math.round(y2 * verticalPixelRatio);
            const dx = x2Px - x1Px;
            const dy = y2Px - y1Px;
            let startAngle: number = 0;
            let endAngle: number = 0;
            if (dx >= 0 && dy >= 0) { startAngle = 0, endAngle = Math.PI / 2 };
            if (dx >= 0 && dy < 0) { startAngle = -(Math.PI / 2), endAngle = 0 };
            if (dx < 0 && dy >= 0) { startAngle = Math.PI / 2, endAngle = Math.PI };
            if (dx < 0 && dy < 0) { startAngle = Math.PI, endAngle = (3 * Math.PI) / 2 };
            const baseRadius = Math.sqrt((x2Px - x1Px) ** 2 + (y2Px - y1Px) ** 2);
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.fillStyle = this._drawing.color;
            context.font = `${11 * verticalPixelRatio}px monospace`;
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            for (const l of this._drawing.levels) {
                context.beginPath();
                context.arc(x1Px, y1Px, l * baseRadius, startAngle, endAngle);
                context.stroke();
                context.fillText(String(l), x1Px + l * baseRadius * Math.cos(endAngle) + 4, y1Px + l * baseRadius * Math.sin(endAngle));
            }
        })
    }
}

class FibSpeedResistanceArcsPaneView implements IPanePrimitivePaneView {
    private _drawing: FibSpeedResistanceArcsDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: FibSpeedResistanceArcsDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new FibSpeedResistanceArcsRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class FibSpeedResistanceArcsPrimitive implements IPanePrimitive {
    private _drawing: FibSpeedResistanceArcsDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: FibSpeedResistanceArcsDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    attached({ requestUpdate }: { requestUpdate: () => void }): void {
        this._requestUpdate = requestUpdate;
        requestUpdate();
    }

    paneViews() {
        return [new FibSpeedResistanceArcsPaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: FibSpeedResistanceArcsDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}