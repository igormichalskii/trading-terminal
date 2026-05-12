import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { RegressionTrendDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class RegressionTrendRenderer implements IPrimitivePaneRenderer {
    private _drawing: RegressionTrendDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: RegressionTrendDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
            if (
                x1 === null ||
                x1 === undefined ||
                x2 === null ||
                x2 === undefined
            ) return;
            const x1Px = Math.round(x1 * horizontalPixelRatio);
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            const yMid1Coord = this._seriesRef.current?.priceToCoordinate(this._drawing.r1Price);
            const yMid2Coord = this._seriesRef.current?.priceToCoordinate(this._drawing.r2Price);
            const yUp1Coord = this._seriesRef.current?.priceToCoordinate(this._drawing.r1Price + this._drawing.deviation);
            const yUp2Coord = this._seriesRef.current?.priceToCoordinate(this._drawing.r2Price + this._drawing.deviation);
            const yLo1Coord = this._seriesRef.current?.priceToCoordinate(this._drawing.r1Price - this._drawing.deviation);
            const yLo2Coord = this._seriesRef.current?.priceToCoordinate(this._drawing.r2Price - this._drawing.deviation);
            if (
                yMid1Coord == null ||
                yMid2Coord == null ||
                yUp1Coord == null ||
                yUp2Coord == null ||
                yLo1Coord == null ||
                yLo2Coord == null
            ) return;
            const yMid1Px = Math.round(yMid1Coord * verticalPixelRatio);
            const yMid2Px = Math.round(yMid2Coord * verticalPixelRatio);
            const yUp1Px = Math.round(yUp1Coord * verticalPixelRatio);
            const yUp2Px = Math.round(yUp2Coord * verticalPixelRatio);
            const yLo1Px = Math.round(yLo1Coord * verticalPixelRatio);
            const yLo2Px = Math.round(yLo2Coord * verticalPixelRatio);
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.font = `${11 * verticalPixelRatio}px monospace`;

            // Fill
            context.beginPath();
            context.moveTo(x1Px, yUp1Px);
            context.lineTo(x2Px, yUp2Px);
            context.lineTo(x2Px, yLo2Px);
            context.lineTo(x1Px, yLo1Px);
            context.closePath();
            context.fillStyle = this._drawing.color + "33";
            context.fill();

            // Lines
            context.fillStyle = this._drawing.color;
            context.beginPath();
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            context.moveTo(x1Px, yUp1Px);
            context.lineTo(x2Px, yUp2Px);
            context.moveTo(x1Px, yMid1Px);
            context.lineTo(x2Px, yMid2Px);
            context.moveTo(x1Px, yLo1Px);
            context.lineTo(x2Px, yLo2Px);
            context.stroke();
            if (this._drawing.label) {
                context.save();
                context.translate((x1Px + x2Px) / 2, (yUp1Px + yUp2Px) / 2);
                context.rotate(Math.atan2(yUp2Px - yUp1Px, x2Px - x1Px));
                context.fillText(this._drawing.label, 0, -4 * verticalPixelRatio);
                context.restore();
            }

        })
    }
}

class RegressionTrendPaneView implements IPanePrimitivePaneView {
    private _drawing: RegressionTrendDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: RegressionTrendDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new RegressionTrendRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class RegressionTrendPrimitive implements IPanePrimitive {
    private _drawing: RegressionTrendDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: RegressionTrendDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
        return [new RegressionTrendPaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: RegressionTrendDrawing, isSelcted: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelcted;
        this._requestUpdate?.();
    }
}