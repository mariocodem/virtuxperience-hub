import {
  Scene,
  TransformNode,
  Mesh,
  InstancedMesh,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Color3,
  Color4,
  Vector3,
  ParticleSystem,
  ShadowGenerator,
} from "@babylonjs/core";
import { HORIZON_COLOR } from "./Environment";
import { createGlowDotTexture } from "./ProceduralTextures";
import { ZONES } from "./zones.config";

/**
 * Vegetación, mobiliario urbano, colinas lejanas y luciérnagas: todo son primitivas
 * fusionadas e instanciadas (pocos draw calls) con materiales PBR, para que el hub se
 * sienta como un parque y no como un escenario vacío.
 */

export interface ScenerySettings {
  /** Devuelve true si el punto (x, z) está ocupado por la plaza o un camino y no debe llevar árboles. */
  isReserved: (x: number, z: number) => boolean;
  /** Radio de la plaza central, para ubicar el mobiliario en su borde. */
  plazaRadius: number;
}

export interface SceneryHandle {
  /**
   * Enciende/apaga lo que solo tiene sentido a escala real: luciérnagas, colinas y bosque fuera del
   * recinto. En RA el hub se reduce ~25x sobre el piso de una habitación y eso taparía la cámara.
   */
  setOutdoorEnabled: (enabled: boolean) => void;
}

type Placeable = Mesh | InstancedMesh;

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

function pbr(scene: Scene, name: string, hex: string, roughness: number, metallic = 0): PBRMaterial {
  const mat = new PBRMaterial(name, scene);
  mat.albedoColor = Color3.FromHexString(hex);
  mat.roughness = roughness;
  mat.metallic = metallic;
  mat.maxSimultaneousLights = 8;
  return mat;
}

/** Fusiona partes (cada una con su material) en un solo mesh con multi-material, listo para instanciar. */
function mergeParts(name: string, parts: { mesh: Mesh; material: PBRMaterial | StandardMaterial }[]): Mesh {
  parts.forEach(({ mesh, material }) => (mesh.material = material));
  const merged = Mesh.MergeMeshes(
    parts.map((p) => p.mesh),
    true,
    true,
    undefined,
    false,
    true
  ) as Mesh;
  merged.name = name;
  merged.isPickable = false;
  return merged;
}

/**
 * Entrega primero el maestro (que también es un objeto real de la escena) y después instancias:
 * así no hace falta esconder ninguna copia "plantilla" fuera de la vista.
 */
function createPlacer(master: Mesh, parent: TransformNode, shadowGenerator: ShadowGenerator): () => Placeable {
  let used = false;
  let count = 0;
  master.parent = parent;
  shadowGenerator.addShadowCaster(master);
  return () => {
    if (!used) {
      used = true;
      return master;
    }
    const instance = master.createInstance(`${master.name}-${count++}`);
    instance.parent = parent;
    instance.isPickable = false;
    return instance;
  };
}

export function buildScenery(
  scene: Scene,
  parent: TransformNode,
  shadowGenerator: ShadowGenerator,
  settings: ScenerySettings
): SceneryHandle {
  const outerTrees = createForest(scene, parent, shadowGenerator, settings);
  createLamps(scene, parent, shadowGenerator, settings);
  createBenches(scene, parent, shadowGenerator, settings);
  const hills = createHills(scene, parent);
  const fireflies = createFireflies(scene, parent);

  return {
    setOutdoorEnabled: (enabled: boolean) => {
      outerTrees.forEach((tree) => tree.setEnabled(enabled));
      hills.forEach((layer) => layer.setEnabled(enabled));
      if (enabled) fireflies.start();
      else fireflies.stop();
    },
  };
}

// ---------------------------------------------------------------------------
// Árboles
// ---------------------------------------------------------------------------

function createTreeMaster(scene: Scene, name: string, leafHex: string): Mesh {
  const bark = pbr(scene, `${name}-bark`, "#4a3524", 0.95);
  const leaves = pbr(scene, `${name}-leaves`, leafHex, 0.9);

  const trunk = MeshBuilder.CreateCylinder(
    `${name}-trunk`,
    { height: 2.4, diameterBottom: 0.42, diameterTop: 0.22, tessellation: 8 },
    scene
  );
  trunk.position.y = 1.2;

  const crowns = [
    { d: 3.1, y: 3.1, x: 0, z: 0 },
    { d: 2.3, y: 4.2, x: 0.25, z: 0.1 },
    { d: 1.6, y: 5.0, x: -0.15, z: -0.1 },
    { d: 1.7, y: 3.6, x: -0.9, z: 0.5 },
  ].map((c, i) => {
    const crown = MeshBuilder.CreateIcoSphere(`${name}-crown${i}`, { radius: c.d / 2, subdivisions: 2, flat: true }, scene);
    crown.position.set(c.x, c.y, c.z);
    crown.scaling.y = 0.85;
    return { mesh: crown, material: leaves };
  });

  return mergeParts(name, [{ mesh: trunk, material: bark }, ...crowns]);
}

/** Devuelve los árboles de fuera del recinto jugable (solo instancias: los maestros quedan dentro). */
function createForest(scene: Scene, parent: TransformNode, shadowGenerator: ShadowGenerator, settings: ScenerySettings): Placeable[] {
  const rng = createRng(2024);
  const placers = [
    createPlacer(createTreeMaster(scene, "treeA", "#2f5a2a"), parent, shadowGenerator),
    createPlacer(createTreeMaster(scene, "treeB", "#4c7a30"), parent, shadowGenerator),
    createPlacer(createTreeMaster(scene, "treeC", "#6d7f2f"), parent, shadowGenerator),
  ];

  const placed: Vector3[] = [];
  const scatter = (minR: number, maxR: number, count: number, maxAttempts: number): void => {
    let made = 0;
    for (let attempt = 0; attempt < maxAttempts && made < count; attempt++) {
      const angle = rng() * Math.PI * 2;
      const radius = minR + rng() * (maxR - minR);
      const x = Math.sin(angle) * radius;
      const z = Math.cos(angle) * radius;
      if (settings.isReserved(x, z)) continue;
      if (placed.some((p) => (p.x - x) ** 2 + (p.z - z) ** 2 < 16)) continue;
      placed.push(new Vector3(x, 0, z));
      made++;
    }
  };

  scatter(12, 30, 70, 1500); // dentro del recinto jugable
  const innerCount = placed.length;
  scatter(31, 90, 130, 2500); // el bosque que se ve más allá de los muros invisibles

  const outer: Placeable[] = [];
  placed.forEach((position, i) => {
    const tree = placers[Math.floor(rng() * placers.length)]();
    if (i >= innerCount) outer.push(tree);
    tree.position.set(position.x, 0, position.z);
    tree.rotation.y = rng() * Math.PI * 2;
    const s = 0.85 + rng() * 0.6;
    tree.scaling.set(s, s * (0.9 + rng() * 0.3), s);
  });
  return outer;
}

// ---------------------------------------------------------------------------
// Farolas
// ---------------------------------------------------------------------------

function createLamps(scene: Scene, parent: TransformNode, shadowGenerator: ShadowGenerator, settings: ScenerySettings): void {
  const metal = pbr(scene, "lamp-metal", "#25262c", 0.45, 0.85);
  const bulbMat = new StandardMaterial("lamp-bulb-mat", scene);
  bulbMat.disableLighting = true;
  bulbMat.emissiveColor = new Color3(1, 0.78, 0.45);

  const post = MeshBuilder.CreateCylinder("lamp-post", { height: 3.3, diameterBottom: 0.16, diameterTop: 0.1, tessellation: 10 }, scene);
  post.position.y = 1.65;
  const base = MeshBuilder.CreateCylinder("lamp-base", { height: 0.35, diameterBottom: 0.36, diameterTop: 0.2, tessellation: 10 }, scene);
  base.position.y = 0.17;
  const cap = MeshBuilder.CreateCylinder("lamp-cap", { height: 0.22, diameterTop: 0.05, diameterBottom: 0.52, tessellation: 10 }, scene);
  cap.position.y = 3.75;
  const bulb = MeshBuilder.CreateSphere("lamp-bulb", { diameter: 0.36, segments: 8 }, scene);
  bulb.position.y = 3.5;

  const nextLamp = createPlacer(
    mergeParts("lamp", [
      { mesh: post, material: metal },
      { mesh: base, material: metal },
      { mesh: cap, material: metal },
      { mesh: bulb, material: bulbMat },
    ]),
    parent,
    shadowGenerator
  );

  // Dos farolas por camino (a ambos lados de la calzada).
  for (const zone of ZONES) {
    const a = (zone.angleDeg * Math.PI) / 180;
    const dirX = Math.sin(a);
    const dirZ = Math.cos(a);
    for (const radius of [settings.plazaRadius + 4, settings.plazaRadius + 11]) {
      for (const side of [-1, 1]) {
        nextLamp().position.set(dirX * radius + dirZ * 2.4 * side, 0, dirZ * radius - dirX * 2.4 * side);
      }
    }
  }
}

// ---------------------------------------------------------------------------
// Bancas
// ---------------------------------------------------------------------------

function createBenches(scene: Scene, parent: TransformNode, shadowGenerator: ShadowGenerator, settings: ScenerySettings): void {
  const wood = pbr(scene, "bench-wood", "#7a5232", 0.75);
  const iron = pbr(scene, "bench-iron", "#1f2024", 0.5, 0.8);

  const seat = MeshBuilder.CreateBox("bench-seat", { width: 1.7, height: 0.08, depth: 0.5 }, scene);
  seat.position.y = 0.5;
  const back = MeshBuilder.CreateBox("bench-back", { width: 1.7, height: 0.45, depth: 0.06 }, scene);
  back.position.set(0, 0.85, -0.22);
  back.rotation.x = -0.12;
  const legL = MeshBuilder.CreateBox("bench-legL", { width: 0.07, height: 0.5, depth: 0.5 }, scene);
  legL.position.set(-0.72, 0.25, 0);
  const legR = MeshBuilder.CreateBox("bench-legR", { width: 0.07, height: 0.5, depth: 0.5 }, scene);
  legR.position.set(0.72, 0.25, 0);

  const nextBench = createPlacer(
    mergeParts("bench", [
      { mesh: seat, material: wood },
      { mesh: back, material: wood },
      { mesh: legL, material: iron },
      { mesh: legR, material: iron },
    ]),
    parent,
    shadowGenerator
  );

  for (const zone of ZONES) {
    // Entre dos caminos consecutivos, en el borde de la plaza.
    const angle = ((zone.angleDeg + 30) * Math.PI) / 180;
    const radius = settings.plazaRadius - 1;
    const bench = nextBench();
    bench.position.set(Math.sin(angle) * radius, 0, Math.cos(angle) * radius);
    // El frente de la banca (+z local) mira al centro de la plaza.
    bench.rotation.y = Math.atan2(-Math.sin(angle), -Math.cos(angle));
  }
}

// ---------------------------------------------------------------------------
// Colinas lejanas
// ---------------------------------------------------------------------------

function createHills(scene: Scene, parent: TransformNode): Mesh[] {
  const layers = [
    { radius: 190, maxHeight: 34, tint: 0.5, seed: 3 },
    { radius: 270, maxHeight: 60, tint: 0.78, seed: 9 },
  ];
  const segments = 160;
  const meshes: Mesh[] = [];

  for (const layer of layers) {
    const rng = createRng(layer.seed);
    const phases = Array.from({ length: 5 }, () => rng() * Math.PI * 2);
    const heightAt = (t: number): number => {
      let h = 0;
      let amp = 1;
      let norm = 0;
      phases.forEach((phase, k) => {
        h += (Math.sin(t * (2 + k * 3 + (k % 2)) + phase) * 0.5 + 0.5) * amp;
        norm += amp;
        amp *= 0.55;
      });
      return (h / norm) * layer.maxHeight + 4;
    };

    const ring = (r: number, y: (t: number) => number): Vector3[] =>
      Array.from({ length: segments + 1 }, (_, i) => {
        const t = (i / segments) * Math.PI * 2;
        return new Vector3(Math.sin(t) * r, y(t), Math.cos(t) * r);
      });

    const hills = MeshBuilder.CreateRibbon(
      `hills-${layer.seed}`,
      {
        pathArray: [ring(layer.radius - 90, () => -1), ring(layer.radius, heightAt), ring(layer.radius + 80, () => -1)],
        sideOrientation: Mesh.DOUBLESIDE,
      },
      scene
    );
    hills.parent = parent;
    hills.isPickable = false;
    hills.alwaysSelectAsActiveMesh = true;

    // Perspectiva atmosférica: más lejos = más cerca del color del horizonte.
    const mat = new StandardMaterial(`hills-mat-${layer.seed}`, scene);
    mat.disableLighting = true;
    mat.emissiveColor = Color3.Lerp(new Color3(0.2, 0.16, 0.3), HORIZON_COLOR, layer.tint);
    hills.material = mat;
    meshes.push(hills);
  }
  return meshes;
}

// ---------------------------------------------------------------------------
// Luciérnagas
// ---------------------------------------------------------------------------

function createFireflies(scene: Scene, parent: TransformNode): ParticleSystem {
  const emitter = MeshBuilder.CreateBox("fireflies-emitter", { size: 0.1 }, scene);
  emitter.isVisible = false;
  emitter.isPickable = false;
  emitter.parent = parent;

  const system = new ParticleSystem("fireflies", 260, scene);
  system.particleTexture = createGlowDotTexture(scene);
  system.emitter = emitter;
  system.createBoxEmitter(new Vector3(-0.3, 0.05, -0.3), new Vector3(0.3, 0.3, 0.3), new Vector3(-32, 0.3, -32), new Vector3(32, 3.2, 32));
  system.color1 = new Color4(1, 0.9, 0.45, 1);
  system.color2 = new Color4(0.7, 1, 0.5, 1);
  system.colorDead = new Color4(1, 0.8, 0.3, 0);
  system.minSize = 0.05;
  system.maxSize = 0.13;
  system.minLifeTime = 4;
  system.maxLifeTime = 9;
  system.emitRate = 45;
  system.minEmitPower = 0.05;
  system.maxEmitPower = 0.25;
  system.blendMode = ParticleSystem.BLENDMODE_ADD;
  system.gravity = Vector3.Zero();
  system.preWarmCycles = 200;
  system.preWarmStepOffset = 5;
  system.start();
  return system;
}
