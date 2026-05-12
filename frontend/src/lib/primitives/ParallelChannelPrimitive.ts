import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { ParallelChannelDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class ParallelChannelRenderer implements IPrimitivePaneRenderer {
    private _drawing: ParallelChannelDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: ParallelChannelDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
            const x3 = this._drawing.p3.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p3.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p3.time as any);
            const y1 = this._seriesRef.current?.priceToCoordinate(this._drawing.p1.price);
            const y2 = this._seriesRef.current?.priceToCoordinate(this._drawing.p2.price);
            const y3 = this._seriesRef.current?.priceToCoordinate(this._drawing.p3.price);
            if (
                x1 === null ||
                x1 === undefined ||
                x2 === null ||
                x2 === undefined ||
                x3 === null ||
                x3 === undefined ||
                y1 === null ||
                y1 === undefined ||
                y2 === null ||
                y2 === undefined ||
                y3 === null ||
                y3 === undefined
            ) return;
            const x1Px = Math.round(x1 * horizontalPixelRatio);
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            const x3Px = Math.round(x3 * horizontalPixelRatio);
            const y1Px = Math.round(y1 * verticalPixelRatio);
            const y2Px = Math.round(y2 * verticalPixelRatio);
            const y3Px = Math.round(y3 * verticalPixelRatio);
            const slope = (y2Px - y1Px) / (x2Px - x1Px);
            const yOnLine1AtX3 = y1Px + slope * (x3Px - x1Px);
            const dy = y3Px - yOnLine1AtX3;
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.font = `${11 * verticalPixelRatio}px monospace`;

            // Fill
            context.beginPath();
            context.moveTo(x1Px, y1Px);
            context.lineTo(x2Px, y2Px);
            context.lineTo(x2Px, y2Px + dy);
            context.lineTo(x1Px, y1Px + dy);
            context.closePath();
            context.fillStyle = this._drawing.color + "33";
            context.fill();

            // Lines
            context.fillStyle = this._drawing.color;
            context.beginPath();
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            context.moveTo(x1Px, y1Px);
            context.lineTo(x2Px, y2Px);
            context.moveTo(x1Px, y1Px + dy);
            context.lineTo(x2Px, y2Px + dy);
            context.stroke();
            if (this._drawing.label) {
                context.save();
                context.translate((x1Px + x2Px) / 2, (y1Px + y2Px) / 2);
                context.rotate(Math.atan2(y2Px - y1Px, x2Px - x1Px));
                context.fillText(this._drawing.label, 0, -4 * verticalPixelRatio);
                context.restore();
            }
        })
    }
}

class ParallelChannelPaneView implements IPanePrimitivePaneView {
    private _drawing: ParallelChannelDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: ParallelChannelDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new ParallelChannelRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class ParallelChannelPrimitive implements IPanePrimitive {
    private _drawing: ParallelChannelDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: ParallelChannelDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
        return [new ParallelChannelPaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: ParallelChannelDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}