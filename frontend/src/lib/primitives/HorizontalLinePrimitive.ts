import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { HorizontalLineDrawing } from "../drawings";
import type React from "react";


class HorizontalLineRenderer implements IPrimitivePaneRenderer {
    private _drawing: HorizontalLineDrawing;
    private _seriesRef: React.RefObject<any>;


    constructor(drawing: HorizontalLineDrawing, seriesRef: React.RefObject<any>) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
    }

    draw(target: any): void {
        target.useBitmapCoordinateSpace(({ context, bitmapSize, verticalPixelRatio }: {
            context: CanvasRenderingContext2D;
            bitmapSize: { width: number; height: number };
            verticalPixelRatio: number;
        }) => {
            const y = this._seriesRef.current?.priceToCoordinate(this._drawing.price);
            if (y === null || y === undefined) return;
            const yPx = Math.round(y * verticalPixelRatio);
            context.beginPath();
            context.strokeStyle = this._drawing.color;
            context.lineWidth = this._drawing.lineWidth * verticalPixelRatio;
            context.moveTo(0, yPx);
            context.lineTo(bitmapSize.width, yPx);
            context.stroke();
        })
    }
}

class HorizontalPaneView implements IPanePrimitivePaneView {
    private _drawing: HorizontalLineDrawing;
    private _seriesRef: React.RefObject<any>;

    constructor(drawing: HorizontalLineDrawing, seriesRef: React.RefObject<any>) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
    }

    renderer(): IPrimitivePaneRenderer {
        return new HorizontalLineRenderer(this._drawing, this._seriesRef);
    }
}

export class HorizontalLinePrimitive implements IPanePrimitive {
    private _drawing: HorizontalLineDrawing;
    private _seriesRef: React.RefObject<any>;
    private _requestUpdate?: () => void;

    constructor(drawing: HorizontalLineDrawing, seriesRef: React.RefObject<any>) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
    }

    attached({ requestUpdate }: { requestUpdate: () => void }): void {
        this._requestUpdate = requestUpdate;
        requestUpdate();
    }

    paneViews() {
        return [new HorizontalPaneView(this._drawing, this._seriesRef)]
    }

    update(drawing: HorizontalLineDrawing) {
        this._drawing = drawing;
        this._requestUpdate?.()
    }
}