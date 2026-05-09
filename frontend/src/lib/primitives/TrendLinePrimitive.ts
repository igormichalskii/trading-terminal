import type { IPanePrimitivePaneView, IPrimitivePaneRenderer, IPanePrimitive } from "lightweight-charts";
import type { TrendLineDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class TrendLineRenderer implements IPrimitivePaneRenderer {
    private _drawing: TrendLineDrawing;
    private _seriesRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _chartRef: React.RefObject<any>;

    constructor(drawing: TrendLineDrawing, seriesRef: React.RefObject<any>, isSelected: boolean, chartRef: React.RefObject<any>) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
        this._chartRef = chartRef;
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
            const y1 = this._seriesRef.current?.priceToCoordinate(this._drawing.p1.price);
            const x2 = this._drawing.p2.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p2.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p2.time as any);
            const y2 = this._seriesRef.current?.priceToCoordinate(this._drawing.p2.price);
            if (
                x1 === null ||
                x1 === undefined ||
                y1 === null ||
                y1 === undefined ||
                x2 === null ||
                x2 === undefined ||
                y2 === null ||
                y2 === undefined
            ) return;
            const x1Px = Math.round(x1 * horizontalPixelRatio);
            const y1Px = Math.round(y1 * verticalPixelRatio);
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            const y2Px = Math.round(y2 * verticalPixelRatio);
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.fillStyle = this._drawing.color;
            context.font = `${11 * verticalPixelRatio}px monospace`
            context.beginPath();
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            context.moveTo(x1Px, y1Px);
            context.lineTo(x2Px, y2Px);
            context.stroke();
            if (this._drawing.label) {
                const angle = Math.atan2(y2Px - y1Px, x2Px - x1Px);
                context.save()
                context.translate(x1Px, y1Px);
                context.rotate(angle);
                context.fillText(this._drawing.label, 0, -4 * verticalPixelRatio);
                context.restore();
            }
        })
    }
}

class TrendPaneView implements IPanePrimitivePaneView {
    private _drawing: TrendLineDrawing;
    private _seriesRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _chartRef: React.RefObject<any>;

    constructor(drawing: TrendLineDrawing, seriesRef: React.RefObject<any>, isSelected: boolean, chartRef: React.RefObject<any>) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
        this._chartRef = chartRef;
    }

    renderer(): IPrimitivePaneRenderer {
        return new TrendLineRenderer(this._drawing, this._seriesRef, this._isSelected, this._chartRef);
    }
}

export class TrendLinePrimitive implements IPanePrimitive {
    private _drawing: TrendLineDrawing;
    private _seriesRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _chartRef: React.RefObject<any>;
    private _requestUpdate?: () => void;

    constructor(drawing: TrendLineDrawing, seriesRef: React.RefObject<any>, isSelected: boolean, chartRef: React.RefObject<any>) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._isSelected = isSelected;
        this._chartRef = chartRef;
    }

    attached({ requestUpdate }: { requestUpdate: () => void }): void {
        this._requestUpdate = requestUpdate;
        requestUpdate();
    }

    paneViews() {
        return [new TrendPaneView(this._drawing, this._seriesRef, this._isSelected, this._chartRef)]
    }

    update(drawing: TrendLineDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }

}