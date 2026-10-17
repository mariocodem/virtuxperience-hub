import {
  Scene,
  TransformNode,
  MeshBuilder,
  PBRMaterial,
  StandardMaterial,
  Color3,
  Vector3,
  ShadowGenerator,
  Mesh,
} from "@babylonjs/core";
import { setupEnvironment, EnvironmentHandles } from "./Environment";
import { ZoneManager } from "./ZoneManager";
import { createGrassCanvases, createSandCanvases, createWaterCanvases, createSurfaceMaterial, bindSurfaceTextures } from "./ProceduralTextures";
import type { ZoneDefinition } from "../types/zone";

/**
 * Cada línea transversal es ahora su propia isla: un mundo 3D independiente (no un portal más dentro
 * de un hub compartido). El jugador llega por teletransporte desde el mapa de islas de la landing page,
 * ya dentro del radio corto que separa el punto de llegada del portal de su minijuego.
 */

export interface IslandHandles {
  islandRoot: TransformNode;
  environment: EnvironmentHandles;
  zoneManager: ZoneManager;
  spawnPosition: Vector3;
  spawnYaw: number;
}

const GRASS_RADIUS = 9;
const SAND_RADIUS = 12.5;
/** Un poco más chico que SAND_RADIUS: el muro invisible queda escondido bajo la arena, no se ve el borde. */
const BOUNDARY_RADIUS = 11.5;
const OCEAN_SIZE = 500;
const PORTAL_Z = 3;
const SPAWN_Z = -5;
const GRASS_TILE_METERS = 6;
const SAND_TILE_METERS = 3;

export function buildIsland(scene: Scene, zone: ZoneDefinition, index: number): IslandHandles {
  const islandRoot = new TransformNode("islandRoot", scene);

  const environment = setupEnvironment(scene);
  const { shadowGenerator } = environment;

  buildOcean(scene, islandRoot);
  buildLand(scene, islandRoot, shadowGenerator);
  buildBoundary(scene, islandRoot);
  decorate(scene, islandRoot, zone, shadowGenerator);

  const zoneManager = new ZoneManager(scene, islandRoot, shadowGenerator, [
    { zone, position: new Vector3(0, 0, PORTAL_Z) },
  ]);

  void index;
  return {
    islandRoot,
    environment,
    zoneManager,
    spawnPosition: new Vector3(0, 1.7, SPAWN_Z),
    spawnYaw: 0,
  };
}

/** True si (x, z) cae sobre la franja de arena (y no sobre el césped del interior): decide el sonido de los pasos. */
export function isSandAt(x: number, z: number): boolean {
  return Math.hypot(x, z) > GRASS_RADIUS;
}

function buildOcean(scene: Scene, parent: TransformNode): void {
  const ocean = MeshBuilder.CreateGround("ocean", { width: OCEAN_SIZE, height: OCEAN_SIZE, subdivisions: 2 }, scene);
  ocean.position.y = -0.1;
  ocean.parent = parent;
  ocean.isPickable = false;
  ocean.alwaysSelectAsActiveMesh = true;

  const tileMeters = 14;
  const textures = bindSurfaceTextures("ocean", scene, createWaterCanvases(), OCEAN_SIZE / tileMeters, OCEAN_SIZE / tileMeters);
  const mat = new PBRMaterial("oceanMat", scene);
  mat.albedoTexture = textures.albedo;
  mat.bumpTexture = textures.normal;
  mat.metallic = 0.05;
  mat.roughness = 0.1;
  mat.alpha = 0.93;
  mat.maxSimultaneousLights = 8;
  ocean.material = mat;

  // El oleaje es solo el mapa de normales desplazándose: barato y da la sensación de agua en movimiento.
  scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    textures.normal.uOffset += dt * 0.012;
    textures.normal.vOffset += dt * 0.007;
  });
}

function buildLand(scene: Scene, parent: TransformNode, shadowGenerator: ShadowGenerator): void {
  const sand = MeshBuilder.CreateDisc("sand", { radius: SAND_RADIUS, tessellation: 64 }, scene);
  sand.rotation.x = Math.PI / 2;
  sand.position.y = 0;
  sand.parent = parent;
  sand.checkCollisions = true;
  sand.receiveShadows = true;
  sand.isPickable = false;
  sand.material = createSurfaceMaterial(scene, "sandMat", createSandCanvases(), SAND_RADIUS * 2, SAND_RADIUS * 2, SAND_TILE_METERS, 0.9);

  const grass = MeshBuilder.CreateDisc("grass", { radius: GRASS_RADIUS, tessellation: 64 }, scene);
  grass.rotation.x = Math.PI / 2;
  grass.position.y = 0.04;
  grass.parent = parent;
  grass.checkCollisions = true;
  grass.receiveShadows = true;
  grass.isPickable = false;
  grass.material = createSurfaceMaterial(scene, "grassMat", createGrassCanvases(), GRASS_RADIUS * 2, GRASS_RADIUS * 2, GRASS_TILE_METERS, 0.95);

  void shadowGenerator;
}

/** Muro cilíndrico invisible: el jugador no puede caminar mar adentro. */
function buildBoundary(scene: Scene, parent: TransformNode): void {
  const wall = MeshBuilder.CreateCylinder(
    "islandBoundary",
    { diameter: BOUNDARY_RADIUS * 2, height: 10, tessellation: 48, sideOrientation: Mesh.DOUBLESIDE },
    scene
  );
  wall.position.y = 5;
  wall.parent = parent;
  wall.checkCollisions = true;
  wall.isVisible = false;
}

function decorate(scene: Scene, parent: TransformNode, zone: ZoneDefinition, shadowGenerator: ShadowGenerator): void {
  const torchPositions = [
    new Vector3(-1.6, 0, -1.6),
    new Vector3(1.6, 0, -1.6),
  ];
  torchPositions.forEach((pos, i) => {
    const torch = createTikiTorch(scene, `torch-${i}`);
    torch.parent = parent;
    torch.position.copyFrom(pos);
    torch.getChildMeshes().forEach((mesh) => shadowGenerator.addShadowCaster(mesh));
  });

  const palmSpots = [
    { pos: new Vector3(-5.5, 0, 1.2), rot: 0.4, scale: 1 },
    { pos: new Vector3(5.2, 0, -0.5), rot: -0.6, scale: 0.85 },
    { pos: new Vector3(-3.8, 0, 5.4), rot: 1.1, scale: 1.1 },
    { pos: new Vector3(4.6, 0, 4.4), rot: -1.4, scale: 0.9 },
  ];
  palmSpots.forEach((spot, i) => {
    const palm = createPalmTree(scene, `palm-${i}`, zone.color);
    palm.parent = parent;
    palm.position.copyFrom(spot.pos);
    palm.rotation.y = spot.rot;
    palm.scaling.setAll(spot.scale);
    palm.getChildMeshes().forEach((mesh) => shadowGenerator.addShadowCaster(mesh));
  });
}

/** Palmera: tronco curvo (segmentos inclinados apilados) + copa de hojas radiales. */
function createPalmTree(scene: Scene, name: string, accentHex: string): TransformNode {
  const root = new TransformNode(name, scene);

  const barkMat = new PBRMaterial(`${name}-bark`, scene);
  barkMat.albedoColor = Color3.FromHexString("#6b4a2f");
  barkMat.roughness = 0.9;
  barkMat.maxSimultaneousLights = 8;

  const leafMat = new PBRMaterial(`${name}-leaf`, scene);
  leafMat.albedoColor = Color3.FromHexString("#2f7a3f");
  leafMat.roughness = 0.75;
  leafMat.maxSimultaneousLights = 8;
  leafMat.backFaceCulling = false;

  const segments = 5;
  let y = 0;
  let lean = 0;
  for (let i = 0; i < segments; i++) {
    const seg = MeshBuilder.CreateCylinder(`${name}-trunk-${i}`, { height: 1.1, diameterTop: 0.22 - i * 0.025, diameterBottom: 0.28 - i * 0.02, tessellation: 8 }, scene);
    seg.material = barkMat;
    seg.parent = root;
    seg.position.y = y + 0.55;
    seg.rotation.z = lean;
    seg.isPickable = false;
    y += Math.cos(lean) * 1.05;
    lean += 0.09;
  }

  const crown = new TransformNode(`${name}-crown`, scene);
  crown.parent = root;
  crown.position.y = y + 0.2;
  crown.rotation.z = lean;

  const frondCount = 7;
  for (let i = 0; i < frondCount; i++) {
    const frond = MeshBuilder.CreateCylinder(`${name}-frond-${i}`, { height: 1.6, diameterTop: 0, diameterBottom: 0.55, tessellation: 3 }, scene);
    frond.material = leafMat;
    frond.parent = crown;
    frond.position.y = 0.8;
    const a = (i / frondCount) * Math.PI * 2;
    frond.rotation.z = Math.PI / 2.6;
    frond.rotation.y = a;
    frond.isPickable = false;
  }

  // Racimo de cocos, en el color de la zona: un pequeño guiño decorativo sin romper el tema tropical.
  const coconutMat = new StandardMaterial(`${name}-coconut`, scene);
  coconutMat.diffuseColor = Color3.FromHexString(accentHex).scale(0.5);
  coconutMat.emissiveColor = Color3.FromHexString(accentHex).scale(0.15);
  for (let i = 0; i < 3; i++) {
    const coco = MeshBuilder.CreateSphere(`${name}-coco-${i}`, { diameter: 0.18, segments: 6 }, scene);
    coco.material = coconutMat;
    coco.parent = crown;
    coco.position.set(Math.cos(i * 2.1) * 0.15, -0.1, Math.sin(i * 2.1) * 0.15);
    coco.isPickable = false;
  }

  return root;
}

/** Antorcha tiki: poste de madera + llama emisiva animada. */
function createTikiTorch(scene: Scene, name: string): TransformNode {
  const root = new TransformNode(name, scene);

  const woodMat = new PBRMaterial(`${name}-wood`, scene);
  woodMat.albedoColor = Color3.FromHexString("#4a3321");
  woodMat.roughness = 0.85;
  woodMat.maxSimultaneousLights = 8;

  const post = MeshBuilder.CreateCylinder(`${name}-post`, { height: 1.3, diameterBottom: 0.1, diameterTop: 0.07, tessellation: 8 }, scene);
  post.position.y = 0.65;
  post.material = woodMat;
  post.parent = root;
  post.isPickable = false;

  const bowl = MeshBuilder.CreateCylinder(`${name}-bowl`, { height: 0.16, diameterTop: 0.26, diameterBottom: 0.14, tessellation: 10 }, scene);
  bowl.position.y = 1.35;
  bowl.material = woodMat;
  bowl.parent = root;
  bowl.isPickable = false;

  const flameMat = new StandardMaterial(`${name}-flame`, scene);
  flameMat.disableLighting = true;
  flameMat.emissiveColor = Color3.FromHexString("#ff9a3c");
  const flame = MeshBuilder.CreateSphere(`${name}-flame-mesh`, { diameter: 0.28, segments: 8 }, scene);
  flame.scaling.y = 1.5;
  flame.position.y = 1.52;
  flame.material = flameMat;
  flame.parent = root;
  flame.isPickable = false;

  const seed = Math.random() * 10;
  scene.onBeforeRenderObservable.add(() => {
    const t = performance.now() / 1000 + seed;
    flame.scaling.y = 1.4 + Math.sin(t * 9) * 0.15;
    flame.scaling.x = 1 + Math.sin(t * 7 + 1) * 0.08;
    flameMat.emissiveColor = Color3.FromHexString("#ff9a3c").scale(0.9 + Math.sin(t * 11) * 0.1);
  });

  return root;
}
