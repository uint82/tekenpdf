import { getStroke } from "perfect-freehand";

interface Point {
  x: number;
  y: number;
  pressure?: number;
  time?: number;
}

export class SignaturePad {
  container: HTMLElement;
  svg: SVGSVGElement;
  path: SVGPathElement | null = null;

  private isDrawing = false;
  private points: Point[] = [];

  private strokes: string[] = [];

  private strokeColor = "#000000";

  private options = {
    size: 5,
    thinning: 0.3,
    smoothing: 0.5,
    streamline: 0.4,
    easing: (t: number) => t,
    start: {
      taper: 0,
      easing: (t: number) => t,
    },
    end: {
      taper: 0,
      easing: (t: number) => t,
    },
  };

  constructor(container: HTMLElement) {
    this.container = container;

    this.svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    this.svg.setAttribute("width", "100%");
    this.svg.setAttribute("height", "100%");
    this.svg.style.touchAction = "none";
    this.svg.style.userSelect = "none";

    this.container.appendChild(this.svg);

    this.bindEvents();
  }

  private startStroke(point: Point) {
    this.isDrawing = true;
    this.points = [point];

    this.path = document.createElementNS("http://www.w3.org/2000/svg", "path");
    this.path.setAttribute("fill", this.strokeColor);
    this.svg.appendChild(this.path);

    this.render();
  }

  private moveStroke(point: Point) {
    if (!this.isDrawing || !this.path) return;
    this.points.push(point);
    this.render();
  }

  private endStroke() {
    if (!this.isDrawing || !this.path) return;
    this.isDrawing = false;

    const d = this.path.getAttribute("d");
    if (d) this.strokes.push(d);
  }

  private render() {
    if (!this.path) return;
    const stroke = getStroke(this.points, this.options);
    const d = this.getSvgPathFromStroke(stroke);
    this.path.setAttribute("d", d);
  }

  private getSvgPathFromStroke(stroke: number[][]): string {
    if (!stroke.length) return "";
    const d = stroke.reduce(
      (acc, [x0, y0], i, arr) => {
        const [x1, y1] = arr[(i + 1) % arr.length];
        acc.push(x0, y0, (x0 + x1) / 2, (y0 + y1) / 2);
        return acc;
      },
      ["M", ...stroke[0], "Q"],
    );
    d.push("Z");
    return d.join(" ");
  }

  private bindEvents() {
    this.container.addEventListener("pointerdown", (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      this.container.setPointerCapture(e.pointerId);
      this.startStroke(this.getPoint(e));
    });

    this.container.addEventListener("pointermove", (e) => {
      if (!this.isDrawing) return;
      if (e.cancelable) e.preventDefault();
      const events = e.getCoalescedEvents ? e.getCoalescedEvents() : [e];
      for (const ev of events) {
        this.moveStroke(this.getPoint(ev));
      }
    });

    const end = (e: PointerEvent) => {
      this.endStroke();
      this.container.releasePointerCapture(e.pointerId);
    };

    this.container.addEventListener("pointerup", end);
    this.container.addEventListener("pointercancel", end);
  }

  private getPoint(e: PointerEvent): Point {
    const rect = this.container.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
      pressure: e.pressure,
      time: Date.now(),
    };
  }

  set penColor(color: string) {
    this.strokeColor = color;
  }

  recolor(color: string) {
    this.penColor = color;

    const paths = this.svg.querySelectorAll("path");
    paths.forEach((p) => p.setAttribute("fill", color));
  }

  clear() {
    this.strokes = [];
    this.points = [];
    while (this.svg.firstChild) {
      this.svg.removeChild(this.svg.firstChild);
    }
  }

  isEmpty() {
    return this.strokes.length === 0;
  }

  toDataURL(): string {
    const rect = this.container.getBoundingClientRect();
    const canvas = document.createElement("canvas");
    const scale = 2;
    canvas.width = rect.width * scale;
    canvas.height = rect.height * scale;
    const ctx = canvas.getContext("2d");

    if (!ctx) return "";
    ctx.scale(scale, scale);

    const paths = this.svg.querySelectorAll("path");
    paths.forEach((p) => {
      const color = p.getAttribute("fill") || this.strokeColor;
      ctx.fillStyle = color;

      const d = p.getAttribute("d");
      if (d) ctx.fill(new Path2D(d));
    });

    return canvas.toDataURL("image/png");
  }
}
