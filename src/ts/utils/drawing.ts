export class SignaturePad {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  isDrawing: boolean = false;

  lastX: number = 0;
  lastY: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext("2d");

    if (!context) throw new Error("Ink canvas context error");
    this.ctx = context;

    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.strokeStyle = "#000000"; // hitam
    this.ctx.lineWidth = 2;

    this.bindEvents();
  }

  private bindEvents() {
    this.canvas.addEventListener("mousedown", (e) =>
      this.start(e.offsetX, e.offsetY),
    );
    this.canvas.addEventListener("mousemove", (e) =>
      this.move(e.offsetX, e.offsetY),
    );
    this.canvas.addEventListener("mouseup", () => this.end());
    this.canvas.addEventListener("mouseout", () => this.end());

    this.canvas.addEventListener(
      "touchstart",
      (e) => {
        if (e.cancelable) e.preventDefault();
        const pos = this.getTouchPos(e);
        this.start(pos.x, pos.y);
      },
      { passive: false },
    );

    this.canvas.addEventListener(
      "touchmove",
      (e) => {
        if (e.cancelable) e.preventDefault();
        const pos = this.getTouchPos(e);
        this.move(pos.x, pos.y);
      },
      { passive: false },
    );

    this.canvas.addEventListener("touchend", () => this.end());
  }

  private getTouchPos(e: TouchEvent) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top,
    };
  }

  private start(x: number, y: number) {
    this.isDrawing = true;
    this.lastX = x;
    this.lastY = y;

    this.ctx.beginPath();
    this.ctx.moveTo(x, y);

    this.ctx.fillStyle = this.ctx.strokeStyle;
    this.ctx.fillRect(x - 0.5, y - 0.5, 1, 1);
  }

  private move(x: number, y: number) {
    if (!this.isDrawing) return;

    this.ctx.beginPath();
    this.ctx.moveTo(this.lastX, this.lastY);
    this.ctx.lineTo(x, y);
    this.ctx.stroke();

    this.lastX = x;
    this.lastY = y;
  }

  private end() {
    this.isDrawing = false;
    this.ctx.closePath();
  }

  matchSize(
    width: number,
    height: number,
    cssWidth: string,
    cssHeight: string,
  ) {
    this.canvas.width = width;
    this.canvas.height = height;

    this.canvas.style.width = cssWidth;
    this.canvas.style.height = cssHeight;

    const dpr = window.devicePixelRatio || 1;
    this.ctx.scale(dpr, dpr);

    this.ctx.lineCap = "round";
    this.ctx.lineJoin = "round";
    this.ctx.lineWidth = 2;
    this.ctx.strokeStyle = "#000000";
  }

  clear() {
    this.ctx.save();
    this.ctx.setTransform(1, 0, 0, 1, 0, 0);
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.restore();
  }
}
