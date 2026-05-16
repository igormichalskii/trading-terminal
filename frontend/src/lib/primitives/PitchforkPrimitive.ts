import type { IPanePrimitive, IPanePrimitivePaneView, IPrimitivePaneRenderer } from "lightweight-charts";
import type { InsidePitchforkDrawing, ModifiedSchiffPitchforkDrawing, PitchforkDrawing, SchiffPitchforkDrawing } from "../drawings";
import type React from "react";
import { lineDashForStyle, rayEndpoint } from "../drawingUtils";

type AnyPitchfork = PitchforkDrawing | SchiffPitchforkDrawing | ModifiedSchiffPitchforkDrawing | InsidePitchforkDrawing;

function computeGeometry(type: string, ax: number, ay: number, bx: number, by: number, cx: number, cy: number) {
    const mx = (bx + cx) / 2;
    const my = (by + cy) / 2;
    const dir = [mx - ax, my - ay];
    if (type === "pitchfork") {
        const medianStart = [ax, ay];
        const tine1Start = [bx, by];
        const tine2Start = [cx, cy];
        return { medianStart, tine1Start, tine2Start, dir }
    } else if (type === "schiff_pitchfork") {
        const medianStart = [(ax + mx) / 2, my];
        const tine1Start = [bx, by];
        const tine2Start = [cx, cy];
        return { medianStart, tine1Start, tine2Start, dir }
    } else if (type === "modified_schiff_pitchfork") {
        const medianStart = [(ax + mx) / 2, (ay + my) / 2]
        const tine1Start = [bx, by];
        const tine2Start = [cx, cy];
        return { medianStart, tine1Start, tine2Start, dir }
    } else if (type === "inside_pitchfork") {
        const tine1Start = [(ax + bx) / 2, (ay + by) / 2];
        const tine2Start = [(ax + cx) / 2, (ay + cy) / 2];
        const medianStart = [ax, ay];
        const newMx = (tine1Start[0] + tine2Start[0]) / 2;
        const newMy = (tine1Start[1] + tine2Start[1]) / 2;
        const dir = [newMx - ax, newMy - ay]
        return { medianStart, tine1Start, tine2Start, dir }
    }
}

class PitchforkRenderer implements IPrimitivePaneRenderer {
    private _drawing: AnyPitchfork;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: AnyPitchfork, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
                x1 == null ||
                x2 == null ||
                x3 == null ||
                y1 == null ||
                y2 == null ||
                y3 == null
            ) return;
            const x1Px = Math.round(x1 * horizontalPixelRatio);
            const x2Px = Math.round(x2 * horizontalPixelRatio);
            const x3Px = Math.round(x3 * horizontalPixelRatio);
            const y1Px = Math.round(y1 * verticalPixelRatio);
            const y2Px = Math.round(y2 * verticalPixelRatio);
            const y3Px = Math.round(y3 * verticalPixelRatio);
            const geo = computeGeometry(this._drawing.type, x1Px, y1Px, x2Px, y2Px, x3Px, y3Px);
            if (!geo) return;
            const { medianStart, tine1Start, tine2Start, dir } = geo;
            context.strokeStyle = this._drawing.color;
            context.lineWidth = (this._isSelected ? this._drawing.lineWidth + 1 : this._drawing.lineWidth) * verticalPixelRatio;
            context.fillStyle = this._drawing.color;
            context.font = `${11 * verticalPixelRatio}px monospace`;
            const w = context.canvas.width;
            const h = context.canvas.height;
            const m = rayEndpoint(medianStart[0], medianStart[1], dir[0], dir[1], w, h)
            const t1 = rayEndpoint(tine1Start[0], tine1Start[1], dir[0], dir[1], w, h);
            const t2 = rayEndpoint(tine2Start[0], tine2Start[1], dir[0], dir[1], w, h);
            context.setLineDash(this._isSelected ? [5, 3] : lineDashForStyle(this._drawing.lineStyle));
            context.beginPath();
            context.moveTo(medianStart[0], medianStart[1]);
            context.lineTo(m[0], m[1]);
            context.stroke();
            context.beginPath();
            context.moveTo(tine1Start[0], tine1Start[1]);
            context.lineTo(t1[0], t1[1]);
            context.stroke();
            context.beginPath();
            context.moveTo(tine2Start[0], tine2Start[1]);
            context.lineTo(t2[0], t2[1]);
            context.stroke();
            context.globalAlpha = 0.35;
            context.setLineDash([]);
            context.beginPath();
            context.moveTo(x2Px, y2Px);
            context.lineTo(x3Px, y3Px);
            context.stroke();
            context.globalAlpha = 1;
            context.beginPath();
            context.arc(x1Px, y1Px, 3 * verticalPixelRatio, 0, Math.PI * 2);
            context.fill();
            context.beginPath();
            context.arc(x2Px, y2Px, 3 * verticalPixelRatio, 0, Math.PI * 2);
            context.fill();
            context.beginPath();
            context.arc(x3Px, y3Px, 3 * verticalPixelRatio, 0, Math.PI * 2);
            context.fill();
            if (this._drawing.label) {
                const angle = Math.atan2(dir[1], dir[0]);
                context.save();
                context.translate(medianStart[0], medianStart[1]);
                context.rotate(angle);
                context.fillText(this._drawing.label, 0, -4 * verticalPixelRatio);
                context.restore();
            }
        })
    }
}

class PitchforkPaneView implements IPanePrimitivePaneView {
    private _drawing: AnyPitchfork;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;

    constructor(drawing: AnyPitchfork, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
        this._drawing = drawing;
        this._seriesRef = seriesRef;
        this._chartRef = chartRef;
        this._isSelected = isSelected;
    }

    renderer(): IPrimitivePaneRenderer {
        return new PitchforkRenderer(this._drawing, this._seriesRef, this._chartRef, this._isSelected);
    }
}

export class PitchforkPrimitive implements IPanePrimitive {
    private _drawing: AnyPitchfork;
    private _seriesRef: React.RefObject<any>;
    private _chartRef: React.RefObject<any>;
    private _isSelected: boolean;
    private _requestUpdate?: () => void;

    constructor(drawing: AnyPitchfork, seriesRef: React.RefObject<any>, chartRef: React.RefObject<any>, isSelected: boolean) {
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
        return [new PitchforkPaneView(this._drawing, this._seriesRef, this._chartRef, this._isSelected)]
    }

    update(drawing: AnyPitchfork, isSelected: boolean) {
        this._drawing = drawing;
        this._isSelected = isSelected;
        this._requestUpdate?.();
    }
}