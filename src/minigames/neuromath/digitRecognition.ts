import * as tf from "@tensorflow/tfjs";

const TARGET_SIZE = 28;
// El dígito se escala para caber en un recuadro de 20x20 centrado en el
// lienzo de 28x28, igual que la convención de preprocesado de MNIST.
const DIGIT_BOX = 20;
const INK_THRESHOLD = 40;
const MIN_SEGMENT_WIDTH = 6;
// Columnas vacías consecutivas toleradas dentro de un mismo dígito, para no
// cortar por la mitad un dígito con trazos separados (ej. la barra del "4").
const COLUMN_GAP_TOLERANCE = 2;

interface Segment {
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

function findSegments(imageData: ImageData, width: number, height: number): Segment[] {
  const colHasInk = new Array<boolean>(width).fill(false);
  const colMinY = new Array<number>(width).fill(height);
  const colMaxY = new Array<number>(width).fill(-1);

  for (let x = 0; x < width; x++) {
    for (let y = 0; y < height; y++) {
      const luminance = imageData.data[(y * width + x) * 4];
      if (luminance > INK_THRESHOLD) {
        colHasInk[x] = true;
        if (y < colMinY[x]) colMinY[x] = y;
        if (y > colMaxY[x]) colMaxY[x] = y;
      }
    }
  }

  const segments: Segment[] = [];
  let start = -1;
  let gap = 0;

  const flush = (end: number): void => {
    if (start === -1) return;
    let minY = height;
    let maxY = -1;
    for (let x = start; x <= end; x++) {
      if (colMaxY[x] === -1) continue;
      minY = Math.min(minY, colMinY[x]);
      maxY = Math.max(maxY, colMaxY[x]);
    }
    if (end - start + 1 >= MIN_SEGMENT_WIDTH && maxY >= minY) {
      segments.push({ minX: start, maxX: end, minY, maxY });
    }
    start = -1;
  };

  for (let x = 0; x < width; x++) {
    if (colHasInk[x]) {
      if (start === -1) start = x;
      gap = 0;
    } else if (start !== -1) {
      gap++;
      if (gap > COLUMN_GAP_TOLERANCE) {
        flush(x - gap);
      }
    }
  }
  flush(width - 1);

  return segments;
}

function cropToDigitCanvas(source: HTMLCanvasElement, segment: Segment): HTMLCanvasElement {
  const segWidth = segment.maxX - segment.minX + 1;
  const segHeight = segment.maxY - segment.minY + 1;
  const scale = DIGIT_BOX / Math.max(segWidth, segHeight);
  const resizedWidth = Math.max(1, Math.round(segWidth * scale));
  const resizedHeight = Math.max(1, Math.round(segHeight * scale));

  const output = document.createElement("canvas");
  output.width = TARGET_SIZE;
  output.height = TARGET_SIZE;
  const outCtx = output.getContext("2d")!;
  outCtx.fillStyle = "#000000";
  outCtx.fillRect(0, 0, TARGET_SIZE, TARGET_SIZE);

  const offsetX = Math.round((TARGET_SIZE - resizedWidth) / 2);
  const offsetY = Math.round((TARGET_SIZE - resizedHeight) / 2);

  outCtx.drawImage(
    source,
    segment.minX,
    segment.minY,
    segWidth,
    segHeight,
    offsetX,
    offsetY,
    resizedWidth,
    resizedHeight
  );

  return output;
}

function predictDigit(model: tf.LayersModel, canvas: HTMLCanvasElement): number {
  return tf.tidy(() => {
    const tensor = tf.browser.fromPixels(canvas, 1).toFloat().div(255).reshape([1, TARGET_SIZE, TARGET_SIZE, 1]);
    const prediction = model.predict(tensor) as tf.Tensor;
    const data = prediction.dataSync();
    let bestIndex = 0;
    for (let i = 1; i < data.length; i++) {
      if (data[i] > data[bestIndex]) bestIndex = i;
    }
    return bestIndex;
  });
}

/** Devuelve el número reconocido en el lienzo (izquierda a derecha), o null si no hay trazos válidos. */
export function recognizeNumber(canvas: HTMLCanvasElement, model: tf.LayersModel): number | null {
  const ctx = canvas.getContext("2d")!;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const segments = findSegments(imageData, canvas.width, canvas.height);
  if (segments.length === 0) return null;

  const digits = segments.map((segment) => predictDigit(model, cropToDigitCanvas(canvas, segment)));
  return parseInt(digits.join(""), 10);
}
