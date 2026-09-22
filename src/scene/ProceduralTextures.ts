import { DynamicTexture, Scene, Texture } from "@babylonjs/core";

/**
 * Texturas generadas por código con Canvas 2D: el proyecto sigue siendo 100 % estático
 * (sin imágenes externas) pero el suelo, los adoquines y la piedra dejan de ser colores planos.
 */

/** Imágenes de una superficie; cada material crea sus propias texturas con su escala de repetición. */
export interface SurfaceCanvases {
  albedo: HTMLCanvasElement;
  normal: HTMLCanvasElement;
}

export interface SurfaceTextures {
  albedo: DynamicTexture;
  normal: DynamicTexture;
}

/** Crea las texturas de una superficie con la repetición pedida (una textura por material: la escala vive en la textura). */
export function bindSurfaceTextures(
  name: string,
  scene: Scene,
  canvases: SurfaceCanvases,
  uScale: number,
  vScale: number
): SurfaceTextures {
  const albedo = toTexture(`${name}Albedo`, scene, canvases.albedo);
  const normal = toTexture(`${name}Normal`, scene, canvases.normal);
  for (const tex of [albedo, normal]) {
    tex.uScale = uScale;
    tex.vScale = vScale;
  }
  return { albedo, normal };
}

/** PRNG determinista: la misma semilla produce siempre las mismas texturas. */
function createRng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Ruido de valor con envoltura (tileable) sumado en varias octavas, normalizado a 0..1. */
function fbmNoise(size: number, baseCells: number, octaves: number, seed: number): Float32Array {
  const rng = createRng(seed);
  const out = new Float32Array(size * size);
  let amplitude = 1;
  let total = 0;
  let cells = baseCells;

  for (let o = 0; o < octaves; o++) {
    const lattice = new Float32Array(cells * cells);
    for (let i = 0; i < lattice.length; i++) lattice[i] = rng();
    const at = (x: number, y: number): number => lattice[(y % cells) * cells + (x % cells)];

    for (let y = 0; y < size; y++) {
      const fy = (y / size) * cells;
      const y0 = Math.floor(fy);
      const ty = smooth(fy - y0);
      for (let x = 0; x < size; x++) {
        const fx = (x / size) * cells;
        const x0 = Math.floor(fx);
        const tx = smooth(fx - x0);
        const top = at(x0, y0) * (1 - tx) + at(x0 + 1, y0) * tx;
        const bottom = at(x0, y0 + 1) * (1 - tx) + at(x0 + 1, y0 + 1) * tx;
        out[y * size + x] += (top * (1 - ty) + bottom * ty) * amplitude;
      }
    }
    total += amplitude;
    amplitude *= 0.5;
    cells *= 2;
  }

  for (let i = 0; i < out.length; i++) out[i] /= total;
  return out;
}

function smooth(t: number): number {
  return t * t * (3 - 2 * t);
}

function createCanvas(size: number): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d", { willReadFrequently: true }) as CanvasRenderingContext2D;
  return { canvas, ctx };
}

function toTexture(name: string, scene: Scene, source: HTMLCanvasElement): DynamicTexture {
  const texture = new DynamicTexture(name, { width: source.width, height: source.height }, scene, true);
  texture.getContext().drawImage(source, 0, 0);
  texture.update();
  texture.wrapU = Texture.WRAP_ADDRESSMODE;
  texture.wrapV = Texture.WRAP_ADDRESSMODE;
  texture.anisotropicFilteringLevel = 8;
  return texture;
}

/** Convierte un mapa de alturas en un mapa de normales (filtro de Sobel con envoltura). */
function heightToNormalCanvas(height: Float32Array, size: number, strength: number): HTMLCanvasElement {
  const { canvas, ctx } = createCanvas(size);
  const image = ctx.createImageData(size, size);
  const h = (x: number, y: number): number => height[((y + size) % size) * size + ((x + size) % size)];

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const dx = h(x + 1, y - 1) + 2 * h(x + 1, y) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x - 1, y) - h(x - 1, y + 1);
      const dy = h(x - 1, y + 1) + 2 * h(x, y + 1) + h(x + 1, y + 1) - h(x - 1, y - 1) - 2 * h(x, y - 1) - h(x + 1, y - 1);
      const nx = -dx * strength;
      const ny = -dy * strength;
      const len = Math.hypot(nx, ny, 1);
      const i = (y * size + x) * 4;
      image.data[i] = ((nx / len) * 0.5 + 0.5) * 255;
      image.data[i + 1] = ((ny / len) * 0.5 + 0.5) * 255;
      image.data[i + 2] = ((1 / len) * 0.5 + 0.5) * 255;
      image.data[i + 3] = 255;
    }
  }
  ctx.putImageData(image, 0, 0);
  return canvas;
}

type Rgb = [number, number, number];

function mix(a: Rgb, b: Rgb, t: number): Rgb {
  return [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t];
}

/** Césped: variaciones de verde a gran escala más un moteado fino, con relieve suave. */
export function createGrassCanvases(size = 512): SurfaceCanvases {
  const macro = fbmNoise(size, 4, 5, 11);
  const fine = fbmNoise(size, 96, 3, 23);
  const { canvas, ctx } = createCanvas(size);
  const image = ctx.createImageData(size, size);

  const dark: Rgb = [38, 62, 28];
  const mid: Rgb = [70, 98, 40];
  const dry: Rgb = [112, 118, 54];

  for (let i = 0; i < size * size; i++) {
    let c = mix(dark, mid, macro[i]);
    c = mix(c, dry, Math.max(0, macro[i] - 0.55) * 1.6);
    const speck = 0.84 + fine[i] * 0.32;
    image.data[i * 4] = c[0] * speck;
    image.data[i * 4 + 1] = c[1] * speck;
    image.data[i * 4 + 2] = c[2] * speck;
    image.data[i * 4 + 3] = 255;
  }
  ctx.putImageData(image, 0, 0);

  const height = new Float32Array(size * size);
  for (let i = 0; i < height.length; i++) height[i] = fine[i] * 0.8 + macro[i] * 0.2;

  return { albedo: canvas, normal: heightToNormalCanvas(height, size, 2.2) };
}

export interface PavingOptions {
  /** Losas por lado de la textura. */
  slabsPerSide: number;
  base: Rgb;
  mortar: Rgb;
  seed: number;
  /** 0..1: cuánto varía el tono entre losas. */
  variation?: number;
}

/** Adoquines/losas en aparejo trabado, con juntas oscuras y desgaste, para plaza, caminos y piedra. */
export function createPavingCanvases(options: PavingOptions, size = 1024): SurfaceCanvases {
  const { slabsPerSide, base, mortar, seed, variation = 0.5 } = options;
  const rng = createRng(seed);
  const wear = fbmNoise(size, 8, 4, seed + 1);
  const grain = fbmNoise(size, 96, 2, seed + 2);

  const rowHeight = size / slabsPerSide;
  const rows = slabsPerSide;
  const height = new Float32Array(size * size);
  const slabTone = new Float32Array(size * size);
  const joint = Math.max(2, Math.round(size / 220));

  for (let row = 0; row < rows; row++) {
    const cols = 2;
    const slabWidth = size / cols;
    const offset = (row % 2) * (slabWidth / 2);
    for (let col = -1; col <= cols; col++) {
      const tone = rng();
      const bevel = 0.5 + rng() * 0.5;
      const x0 = Math.round(col * slabWidth + offset);
      const x1 = Math.round((col + 1) * slabWidth + offset);
      const y0 = Math.round(row * rowHeight);
      const y1 = Math.round((row + 1) * rowHeight);
      for (let y = y0; y < y1; y++) {
        for (let x = x0; x < x1; x++) {
          const px = ((x % size) + size) % size;
          const py = ((y % size) + size) % size;
          const edge = Math.min(x - x0, x1 - 1 - x, y - y0, y1 - 1 - y);
          const idx = py * size + px;
          slabTone[idx] = tone;
          height[idx] = edge < joint ? 0 : Math.min(1, 0.55 + (edge - joint) * 0.05 * bevel);
        }
      }
    }
  }

  const { canvas, ctx } = createCanvas(size);
  const image = ctx.createImageData(size, size);
  for (let i = 0; i < size * size; i++) {
    const inJoint = height[i] === 0;
    const tone = 1 + (slabTone[i] - 0.5) * variation * 0.7;
    const dirt = 0.82 + wear[i] * 0.3 + (grain[i] - 0.5) * 0.35;
    const c: Rgb = inJoint
      ? mortar
      : [base[0] * tone * dirt, base[1] * tone * dirt, base[2] * tone * dirt];
    image.data[i * 4] = c[0];
    image.data[i * 4 + 1] = c[1];
    image.data[i * 4 + 2] = c[2];
    image.data[i * 4 + 3] = 255;
    height[i] += (grain[i] - 0.5) * 0.12;
  }
  ctx.putImageData(image, 0, 0);

  return { albedo: canvas, normal: heightToNormalCanvas(height, size, 3) };
}

const glowDotCache = new WeakMap<Scene, DynamicTexture>();

/** Punto de luz difuso para partículas (luciérnagas, chispas de los portales). Una sola textura por escena. */
export function createGlowDotTexture(scene: Scene): DynamicTexture {
  const cached = glowDotCache.get(scene);
  if (cached) return cached;
  const size = 64;
  const { canvas, ctx } = createCanvas(size);
  const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
  gradient.addColorStop(0, "rgba(255,255,255,1)");
  gradient.addColorStop(0.25, "rgba(255,255,255,0.55)");
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size, size);
  const texture = new DynamicTexture("glowDot", { width: size, height: size }, scene, true);
  texture.getContext().drawImage(canvas, 0, 0);
  texture.update();
  texture.hasAlpha = true;
  glowDotCache.set(scene, texture);
  return texture;
}
