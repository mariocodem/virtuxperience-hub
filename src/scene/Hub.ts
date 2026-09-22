import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  PBRMaterial,
  Color3,
  Vector3,
  Mesh,
  ShadowGenerator,
} from "@babylonjs/core";
import { setupEnvironment, EnvironmentHandles } from "./Environment";
import { ZoneManager } from "./ZoneManager";
import { HUB_RADIUS, ZONES } from "./zones.config";
import { createGrassCanvases, createPavingCanvases, bindSurfaceTextures, SurfaceCanvases } from "./ProceduralTextures";
import { buildScenery } from "./Scenery";

export interface HubHandles {
  hubRoot: TransformNode;
  environment: EnvironmentHandles;
  zoneManager: ZoneManager;
}

const GROUND_SIZE = 460;
/** El jugador solo puede caminar dentro de este cuadrado; el resto del terreno es paisaje. */
const PLAY_AREA_SIZE = 60;
const PLAZA_RADIUS = 9;
const PATH_WIDTH = 3.2;
const BOUNDARY_HEIGHT = 10;
/** Tamaño en metros que cubre una repetición de las texturas de adoquín. */
const PAVING_TILE_METERS = 4;
const GRASS_TILE_METERS = 10;

export function buildHub(scene: Scene): HubHandles {
  const hubRoot = new TransformNode("hubRoot", scene);

  const environment = setupEnvironment(scene);
  const { shadowGenerator } = environment;

  const grass = createGrassCanvases();
  const paving = createPavingCanvases({ slabsPerSide: 4, base: [176, 160, 142], mortar: [58, 52, 48], seed: 41 }, 512);
  const stone = createPavingCanvases({ slabsPerSide: 8, base: [150, 148, 152], mortar: [70, 68, 72], seed: 77, variation: 0.7 }, 512);

  const grounds = buildGround(scene, hubRoot, grass);
  buildPlaza(scene, hubRoot, paving);
  buildPaths(scene, hubRoot, paving);
  buildMonument(scene, hubRoot, stone, shadowGenerator);
  buildBoundaryWalls(scene, hubRoot);

  const scenery = buildScenery(scene, hubRoot, shadowGenerator, {
    plazaRadius: PLAZA_RADIUS,
    isReserved: isOnPlazaOrPath,
  });

  const zoneManager = new ZoneManager(scene, hubRoot, shadowGenerator);

  // En RA el hub se reduce ~25x: los efectos de partículas a escala real dejarían de verse bien.
  const baseSetOutdoor = environment.setOutdoorEnabled;
  environment.setOutdoorEnabled = (enabled: boolean) => {
    baseSetOutdoor(enabled);
    scenery.setOutdoorEnabled(enabled);
    grounds.wide.setEnabled(enabled);
    grounds.compact.setEnabled(!enabled);
    zoneManager.setEffectsEnabled(enabled);
  };

  return { hubRoot, environment, zoneManager };
}

/** True si (x, z) está sobre piedra (plaza, camino o base de un portal) y no sobre pasto: decide el sonido de los pasos. */
export function isPavedAt(x: number, z: number): boolean {
  if (Math.hypot(x, z) < PLAZA_RADIUS) return true;
  return ZONES.some((zone) => {
    const a = (zone.angleDeg * Math.PI) / 180;
    const dirX = Math.sin(a);
    const dirZ = Math.cos(a);
    const along = x * dirX + z * dirZ;
    const across = Math.abs(x * dirZ - z * dirX);
    const onPath = along > 0 && along < HUB_RADIUS && across < PATH_WIDTH / 2;
    const onPad = Math.hypot(x - dirX * HUB_RADIUS, z - dirZ * HUB_RADIUS) < 2.2;
    return onPath || onPad;
  });
}

/** True si (x, z) cae sobre la plaza o a menos de ~3.5 m del eje de un camino hacia un portal. */
function isOnPlazaOrPath(x: number, z: number): boolean {
  if (Math.hypot(x, z) < PLAZA_RADIUS + 2.5) return true;
  return ZONES.some((zone) => {
    const a = (zone.angleDeg * Math.PI) / 180;
    const dirX = Math.sin(a);
    const dirZ = Math.cos(a);
    const along = x * dirX + z * dirZ;
    const across = Math.abs(x * dirZ - z * dirX);
    return along > 0 && along < HUB_RADIUS + 5 && across < 4;
  });
}

function pbrSurface(
  scene: Scene,
  name: string,
  canvases: SurfaceCanvases,
  uMeters: number,
  vMeters: number,
  tileMeters: number,
  roughness: number
): PBRMaterial {
  const mat = new PBRMaterial(name, scene);
  const textures = bindSurfaceTextures(name, scene, canvases, uMeters / tileMeters, vMeters / tileMeters);
  mat.albedoTexture = textures.albedo;
  mat.bumpTexture = textures.normal;
  mat.metallic = 0;
  mat.roughness = roughness;
  // Hay hemisférica + sol + 6 luces de portal: con el límite por defecto (4) el suelo ignoraría varias.
  mat.maxSimultaneousLights = 8;
  return mat;
}

/**
 * Terreno amplio (para caminar a escala real: se ven colinas y bosque a lo lejos) y una versión compacta
 * del tamaño del recinto que se usa en RA, donde el hub se reduce y un terreno de 460 m cubriría el piso real.
 */
function buildGround(scene: Scene, parent: TransformNode, grass: SurfaceCanvases): { wide: Mesh; compact: Mesh } {
  const make = (name: string, size: number): Mesh => {
    const ground = MeshBuilder.CreateGround(name, { width: size, height: size }, scene);
    ground.parent = parent;
    ground.receiveShadows = true;
    ground.isPickable = false;
    ground.material = pbrSurface(scene, `${name}Mat`, grass, size, size, GRASS_TILE_METERS, 0.96);
    return ground;
  };

  const wide = make("ground", GROUND_SIZE);
  wide.checkCollisions = true;
  const compact = make("groundCompact", PLAY_AREA_SIZE);
  compact.checkCollisions = true;
  compact.setEnabled(false);
  return { wide, compact };
}

function buildPlaza(scene: Scene, parent: TransformNode, paving: SurfaceCanvases): void {
  const plaza = MeshBuilder.CreateDisc("plaza", { radius: PLAZA_RADIUS, tessellation: 64 }, scene);
  plaza.rotation.x = Math.PI / 2;
  plaza.position.y = 0.03;
  plaza.parent = parent;
  plaza.receiveShadows = true;
  plaza.isPickable = false;
  const mat = pbrSurface(scene, "plazaMat", paving, PLAZA_RADIUS * 2, PLAZA_RADIUS * 2, PAVING_TILE_METERS, 0.78);
  mat.zOffset = -2;
  plaza.material = mat;

  // Anillo de latón incrustado que marca el borde de la plaza.
  const rim = MeshBuilder.CreateTorus("plaza-rim", { diameter: PLAZA_RADIUS * 2, thickness: 0.16, tessellation: 96 }, scene);
  rim.scaling.y = 0.35;
  rim.position.y = 0.04;
  rim.parent = parent;
  rim.isPickable = false;
  const rimMat = new PBRMaterial("plazaRimMat", scene);
  rimMat.albedoColor = Color3.FromHexString("#b08d4a");
  rimMat.metallic = 0.9;
  rimMat.roughness = 0.35;
  rim.material = rimMat;

  // Baldosa luminosa del color de cada zona donde arranca su camino: orienta al jugador sin texto.
  for (const zone of ZONES) {
    const a = (zone.angleDeg * Math.PI) / 180;
    const marker = MeshBuilder.CreateDisc(`plaza-marker-${zone.id}`, { radius: 0.5, tessellation: 24 }, scene);
    marker.rotation.x = Math.PI / 2;
    marker.position.set(Math.sin(a) * (PLAZA_RADIUS - 1.4), 0.06, Math.cos(a) * (PLAZA_RADIUS - 1.4));
    marker.parent = parent;
    marker.isPickable = false;
    const markerMat = new StandardMaterial(`plaza-marker-mat-${zone.id}`, scene);
    markerMat.disableLighting = true;
    markerMat.emissiveColor = Color3.FromHexString(zone.color);
    marker.material = markerMat;
  }
}

function buildPaths(scene: Scene, parent: TransformNode, paving: SurfaceCanvases): void {
  const startR = PLAZA_RADIUS - 0.5;
  const length = HUB_RADIUS - startR;

  const pathMat = pbrSurface(scene, "pathMat", paving, PATH_WIDTH, length, PAVING_TILE_METERS, 0.8);
  pathMat.zOffset = -1;
  const padMat = pbrSurface(scene, "padMat", paving, 4.4, 4.4, PAVING_TILE_METERS, 0.8);
  padMat.zOffset = -1.5;

  for (const zone of ZONES) {
    const a = (zone.angleDeg * Math.PI) / 180;
    const mid = startR + length / 2;

    const path = MeshBuilder.CreateGround(`path-${zone.id}`, { width: PATH_WIDTH, height: length }, scene);
    path.position.set(Math.sin(a) * mid, 0.02, Math.cos(a) * mid);
    path.rotation.y = a;
    path.parent = parent;
    path.receiveShadows = true;
    path.isPickable = false;
    path.material = pathMat;

    // Plataforma circular bajo el portal.
    const pad = MeshBuilder.CreateDisc(`pad-${zone.id}`, { radius: 2.2, tessellation: 40 }, scene);
    pad.rotation.x = Math.PI / 2;
    pad.position.set(Math.sin(a) * HUB_RADIUS, 0.025, Math.cos(a) * HUB_RADIUS);
    pad.parent = parent;
    pad.receiveShadows = true;
    pad.isPickable = false;
    pad.material = padMat;
  }
}

/** Monumento central: obelisco hexagonal (uno por línea transversal) con un cristal flotante. */
function buildMonument(scene: Scene, parent: TransformNode, stone: SurfaceCanvases, shadowGenerator: ShadowGenerator): void {
  const root = new TransformNode("monument", scene);
  root.parent = parent;

  const stoneMat = pbrSurface(scene, "monumentStoneMat", stone, 8, 8, PAVING_TILE_METERS, 0.7);

  const steps = [
    { r: 3.4, h: 0.3 },
    { r: 2.8, h: 0.3 },
    { r: 2.3, h: 0.3 },
  ];
  let y = 0;
  for (const [i, step] of steps.entries()) {
    const disc = MeshBuilder.CreateCylinder(`monument-step-${i}`, { height: step.h, diameter: step.r * 2, tessellation: 6 }, scene);
    disc.position.y = y + step.h / 2;
    disc.parent = root;
    disc.checkCollisions = true;
    disc.material = stoneMat;
    disc.receiveShadows = true;
    shadowGenerator.addShadowCaster(disc);
    y += step.h;
  }

  const bottomD = 1.9;
  const topD = 0.8;
  const height = 9;
  const shaft = MeshBuilder.CreateCylinder("monument-shaft", { height, diameterBottom: bottomD, diameterTop: topD, tessellation: 6 }, scene);
  shaft.position.y = y + height / 2;
  shaft.parent = root;
  shaft.checkCollisions = true;
  const shaftMat = pbrSurface(scene, "monumentShaftMat", stone, 3, height, PAVING_TILE_METERS, 0.6);
  shaft.material = shaftMat;
  shaft.receiveShadows = true;
  shadowGenerator.addShadowCaster(shaft);

  // Seis bandas luminosas, una por línea transversal, a lo largo del fuste.
  ZONES.forEach((zone, i) => {
    const t = (i + 1) / (ZONES.length + 1);
    const diameter = bottomD + (topD - bottomD) * (0.2 + t * 0.6) + 0.14;
    const band = MeshBuilder.CreateTorus(`monument-band-${zone.id}`, { diameter, thickness: 0.09, tessellation: 6 }, scene);
    band.position.y = y + height * (0.2 + t * 0.6);
    band.parent = root;
    band.isPickable = false;
    const bandMat = new StandardMaterial(`monument-band-mat-${zone.id}`, scene);
    bandMat.disableLighting = true;
    bandMat.emissiveColor = Color3.FromHexString(zone.color);
    band.material = bandMat;
  });

  const crystalY = y + height + 1.3;
  const crystal = MeshBuilder.CreatePolyhedron("monument-crystal", { type: 1, size: 0.55 }, scene);
  crystal.scaling.y = 1.7;
  crystal.position.y = crystalY;
  crystal.parent = root;
  crystal.isPickable = false;
  const crystalMat = new StandardMaterial("monument-crystal-mat", scene);
  crystalMat.disableLighting = true;
  crystalMat.emissiveColor = new Color3(0.55, 0.9, 1);
  crystal.material = crystalMat;

  const halo = MeshBuilder.CreateTorus("monument-halo", { diameter: 1.9, thickness: 0.04, tessellation: 48 }, scene);
  halo.position.y = crystalY;
  halo.parent = root;
  halo.isPickable = false;
  halo.material = crystalMat;

  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() / 1000;
    crystal.rotation.y = t * 0.6;
    crystal.position.y = crystalY + Math.sin(t * 1.2) * 0.15;
    halo.rotation.x = Math.PI / 2 + Math.sin(t * 0.7) * 0.25;
    halo.rotation.z = t * 0.4;
  });
}

function buildBoundaryWalls(scene: Scene, parent: TransformNode): void {
  const half = PLAY_AREA_SIZE / 2;
  const wallDefs = [
    { pos: new Vector3(0, BOUNDARY_HEIGHT / 2, half), size: { width: PLAY_AREA_SIZE, height: BOUNDARY_HEIGHT, depth: 0.5 } },
    { pos: new Vector3(0, BOUNDARY_HEIGHT / 2, -half), size: { width: PLAY_AREA_SIZE, height: BOUNDARY_HEIGHT, depth: 0.5 } },
    { pos: new Vector3(half, BOUNDARY_HEIGHT / 2, 0), size: { width: 0.5, height: BOUNDARY_HEIGHT, depth: PLAY_AREA_SIZE } },
    { pos: new Vector3(-half, BOUNDARY_HEIGHT / 2, 0), size: { width: 0.5, height: BOUNDARY_HEIGHT, depth: PLAY_AREA_SIZE } },
  ];

  wallDefs.forEach((def, i) => {
    const wall: Mesh = MeshBuilder.CreateBox(`boundaryWall${i}`, def.size, scene);
    wall.position = def.pos;
    wall.checkCollisions = true;
    wall.isVisible = false;
    wall.parent = parent;
  });
}
