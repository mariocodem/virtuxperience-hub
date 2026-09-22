const CANVAS_WIDTH = 340;
const CANVAS_HEIGHT = 150;
const STROKE_WIDTH = 12;

export class DrawingCanvas {
  readonly element: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private drawing = false;
  private hasStrokes = false;
  private lastX = 0;
  private lastY = 0;

  constructor(container: HTMLElement) {
    this.element = document.createElement("canvas");
    this.element.className = "drawing-canvas";
    this.element.width = CANVAS_WIDTH;
    this.element.height = CANVAS_HEIGHT;
    this.ctx = this.element.getContext("2d")!;
    this.resetCanvasStyle();

    this.element.addEventListener("pointerdown", this.onPointerDown);
    this.element.addEventListener("pointermove", this.onPointerMove);
    window.addEventListener("pointerup", this.onPointerUp);

    container.appendChild(this.element);
  }

  private resetCanvasStyle(): void {
    this.ctx.fillStyle = "#000000";
    this.ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    this.ctx.strokeStyle = "#ffffff";
    this.ctx.lineWidth = STROKE_WIDTH;
    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
  }

  private toLocalPoint(event: PointerEvent): { x: number; y: number } {
    const rect = this.element.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return { x: (event.clientX - rect.left) * scaleX, y: (event.clientY - rect.top) * scaleY };
  }

  private onPointerDown = (event: PointerEvent): void => {
    this.drawing = true;
    this.hasStrokes = true;
    const { x, y } = this.toLocalPoint(event);
    this.lastX = x;
    this.lastY = y;
    this.ctx.beginPath();
    this.ctx.arc(x, y, STROKE_WIDTH / 2, 0, Math.PI * 2);
    this.ctx.fillStyle = "#ffffff";
    this.ctx.fill();
  };

  private onPointerMove = (event: PointerEvent): void => {
    if (!this.drawing) return;
    const { x, y } = this.toLocalPoint(event);
    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();
    this.lastX = x;
    this.lastY = y;
  };

  private onPointerUp = (): void => {
    this.drawing = false;
  };

  clear(): void {
    this.hasStrokes = false;
    this.resetCanvasStyle();
  }

  hasInk(): boolean {
    return this.hasStrokes;
  }

  destroy(): void {
    window.removeEventListener("pointerup", this.onPointerUp);
    this.element.remove();
  }
}
