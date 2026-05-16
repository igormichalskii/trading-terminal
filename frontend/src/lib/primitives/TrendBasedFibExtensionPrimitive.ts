import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { TrendBasedFibExtensionDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle } from "../drawingUtils";

class TrendBasedFibExtensionRenderer implements IPrimitivePaneRenderer {
    private _drawing: TrendBasedFibExtensionDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: TrendBasedFibExtensionDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
            const x2 = this._drawing.p2.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p2.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p2.time as any);
            const x3 = this._drawing.p3.logical != null
                ? this._chartRef.current?.timeScale().logicalToCoordinate(this._drawing.p3.logical as any)
                : this._chartRef.current?.timeScale().timeToCoordinate(this._drawing.p3.time as any);
            if (
                x2 == null ||
                x3 == null
            ) return;
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            const x3Px = Math.round(x3 * horizontalPixelRatio);
            const trendHeight = this._drawing.p2.price - this._drawing.p1.price;
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.fillStyle = this._drawing.color;
            context.font = `${11 * verticalPixelRatio}px monospace`;
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            for (const l of (this._drawing.levels ?? [])) {
                const price = this._drawing.p3.price + l * trendHeight;
                const y = this._seriesRef.current?.priceToCoordinate(price);
                if (y == null) continue;
                const yPx = Math.round(y * verticalPixelRatio);
                context.beginPath();
                context.moveTo(x2Px, yPx);
                context.lineTo(x3Px, yPx);
                context.stroke();
                context.fillText(String(l), x3Px + 4, yPx - 3 * verticalPixelRatio);
            }
        })
    }
}

class TrendBasedFibExtensionPaneView implements IPanePrimitivePaneView {
    private _drawing: TrendBasedFibExtensionDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: TrendBasedFibExtensionDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new TrendBasedFibExtensionRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class TrendBasedFibExtensionPrimitive implements IPanePrimitive {
    private _drawing: TrendBasedFibExtensionDrawing;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: TrendBasedFibExtensionDrawing, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
        return [new TrendBasedFibExtensionPaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: TrendBasedFibExtensionDrawing, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}
