import { Scene, TransformNode, MeshBuilder, StandardMaterial, Color3, Vector3 } from "@babylonjs/core";
import { GridMaterial } from "@babylonjs/materials";
import { setupEnvironment, EnvironmentHandles } from "./Environment";
import { ZoneManager } from "./ZoneManager";

export interface HubHandles {
  hubRoot: TransformNode;
  environment: EnvironmentHandles;
  zoneManager: ZoneManager;
}

const GROUND_SIZE = 60;
const PLAZA_RADIUS = 6;
const BOUNDARY_HEIGHT = 10;

export function buildHub(scene: Scene): HubHandles {
  const hubRoot = new TransformNode("hubRoot", scene);

  const environment = setupEnvironment(scene);

  const ground = MeshBuilder.CreateGround("ground", { width: GROUND_SIZE, height: GROUND_SIZE }, scene);
  ground.parent = hubRoot;
  ground.checkCollisions = true;
  ground.receiveShadows = true;
  const gridMat = new GridMaterial("groundMat", scene);
  gridMat.majorUnitFrequency = 5;
  gridMat.minorUnitVisibility = 0.3;
  gridMat.gridRatio = 1;
  gridMat.backFaceCulling = false;
  gridMat.mainColor = new Color3(0.08, 0.08, 0.12);
  gridMat.lineColor = new Color3(0.3, 0.6, 0.9);
  ground.material = gridMat;

  const plaza = MeshBuilder.CreateDisc("plaza", { radius: PLAZA_RADIUS, tessellation: 48 }, scene);
  plaza.rotation.x = Math.PI / 2;
  plaza.position.y = 0.02;
  plaza.parent = hubRoot;
  const plazaMat = new StandardMaterial("plazaMat", scene);
  plazaMat.diffuseColor = new Color3(0.15, 0.3, 0.45);
  plazaMat.emissiveColor = new Color3(0.08, 0.18, 0.3);
  plazaMat.specularColor = Color3.Black();
  plaza.material = plazaMat;

  const landmark = MeshBuilder.CreateCylinder(
    "landmark",
    { height: 12, diameterTop: 0.3, diameterBottom: 1.2, tessellation: 12 },
    scene
  );
  landmark.position.y = 6;
  landmark.parent = hubRoot;
  const landmarkMat = new StandardMaterial("landmarkMat", scene);
  landmarkMat.emissiveColor = new Color3(0.6, 0.8, 1);
  landmark.material = landmarkMat;

  buildBoundaryWalls(scene, hubRoot);

  const zoneManager = new ZoneManager(scene, hubRoot);

  return { hubRoot, environment, zoneManager };
}

function buildBoundaryWalls(scene: Scene, parent: TransformNode): void {
  const half = GROUND_SIZE / 2;
  const wallDefs = [
    { pos: new Vector3(0, BOUNDARY_HEIGHT / 2, half), size: { width: GROUND_SIZE, height: BOUNDARY_HEIGHT, depth: 0.5 } },
    { pos: new Vector3(0, BOUNDARY_HEIGHT / 2, -half), size: { width: GROUND_SIZE, height: BOUNDARY_HEIGHT, depth: 0.5 } },
    { pos: new Vector3(half, BOUNDARY_HEIGHT / 2, 0), size: { width: 0.5, height: BOUNDARY_HEIGHT, depth: GROUND_SIZE } },
    { pos: new Vector3(-half, BOUNDARY_HEIGHT / 2, 0), size: { width: 0.5, height: BOUNDARY_HEIGHT, depth: GROUND_SIZE } },
  ];

  wallDefs.forEach((def, i) => {
    const wall = MeshBuilder.CreateBox(`boundaryWall${i}`, def.size, scene);
    wall.position = def.pos;
    wall.checkCollisions = true;
    wall.isVisible = false;
    wall.parent = parent;
  });
}
