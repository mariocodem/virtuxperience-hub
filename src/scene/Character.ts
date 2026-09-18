import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  Vector3,
  Animation,
  Mesh,
} from "@babylonjs/core";
import type { ZoneDefinition } from "../types/zone";

const SKIN_COLOR = Color3.FromHexString("#f2d9b8");

export function createZoneCharacter(scene: Scene, parent: TransformNode, zone: ZoneDefinition): TransformNode {
  const root = new TransformNode(`character-${zone.id}`, scene);
  root.parent = parent;
  root.position = new Vector3(-1.9, 0, 0.7);
  root.rotation.y = Math.PI * 0.15;

  const color = Color3.FromHexString(zone.color);

  const body = MeshBuilder.CreateCapsule(`character-body-${zone.id}`, { height: 1.4, radius: 0.26 }, scene);
  body.position.y = 0.82;
  body.parent = root;
  body.checkCollisions = true;
  const bodyMat = new StandardMaterial(`character-body-mat-${zone.id}`, scene);
  bodyMat.diffuseColor = color.scale(0.6);
  bodyMat.emissiveColor = color.scale(0.3);
  body.material = bodyMat;

  const head = MeshBuilder.CreateSphere(`character-head-${zone.id}`, { diameter: 0.4 }, scene);
  head.position.y = 1.68;
  head.parent = root;
  const headMat = new StandardMaterial(`character-head-mat-${zone.id}`, scene);
  headMat.diffuseColor = SKIN_COLOR;
  headMat.emissiveColor = SKIN_COLOR.scale(0.25);
  head.material = headMat;

  const prop = createThemedProp(scene, zone);
  prop.parent = root;
  prop.position = new Vector3(0.5, 1.45, 0.1);

  Animation.CreateAndStartAnimation(
    `character-bob-${zone.id}`,
    root,
    "position.y",
    30,
    90,
    root.position.y,
    root.position.y + 0.1,
    Animation.ANIMATIONLOOPMODE_YOYO
  );
  Animation.CreateAndStartAnimation(
    `prop-spin-${zone.id}`,
    prop,
    "rotation.y",
    30,
    150,
    0,
    Math.PI * 2,
    Animation.ANIMATIONLOOPMODE_CYCLE
  );

  return root;
}

function createThemedProp(scene: Scene, zone: ZoneDefinition): Mesh {
  const color = Color3.FromHexString(zone.color);
  const mat = new StandardMaterial(`prop-mat-${zone.id}`, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color.scale(0.7);
  // Algunos props usan planos delgados (ej. la bandera): sin esto, se vuelven invisibles de espaldas a la cámara.
  mat.backFaceCulling = false;
  const colorAll = (...meshes: Mesh[]): void => meshes.forEach((m) => (m.material = mat));

  let mesh: Mesh;

  switch (zone.id) {
    case "comunicarte": {
      // Burbuja de diálogo: una caja aplanada con una punta triangular.
      mesh = MeshBuilder.CreateBox(`prop-${zone.id}`, { width: 0.4, height: 0.3, depth: 0.06 }, scene);
      const tail = MeshBuilder.CreateCylinder(
        `prop-tail-${zone.id}`,
        { height: 0.14, diameterTop: 0, diameterBottom: 0.12, tessellation: 3 },
        scene
      );
      tail.parent = mesh;
      tail.position.set(-0.12, -0.2, 0);
      tail.rotation.z = Math.PI * 0.15;
      colorAll(mesh, tail);
      break;
    }
    case "neuromath": {
      mesh = MeshBuilder.CreatePolyhedron(`prop-${zone.id}`, { type: 3, size: 0.22 }, scene);
      colorAll(mesh);
      break;
    }
    case "voxcivitas": {
      // Banderín en un asta.
      const pole = MeshBuilder.CreateCylinder(`prop-pole-${zone.id}`, { height: 0.5, diameter: 0.045 }, scene);
      const flag = MeshBuilder.CreatePlane(`prop-${zone.id}`, { width: 0.3, height: 0.2 }, scene);
      flag.parent = pole;
      flag.position.set(0.13, 0.15, 0);
      colorAll(pole, flag);
      mesh = pole;
      break;
    }
    case "gerencia-plus": {
      // Maletín: caja con un asa en forma de arco.
      const box = MeshBuilder.CreateBox(`prop-${zone.id}`, { width: 0.34, height: 0.22, depth: 0.14 }, scene);
      const handle = MeshBuilder.CreateTorus(
        `prop-handle-${zone.id}`,
        { diameter: 0.18, thickness: 0.025, tessellation: 16 },
        scene
      );
      handle.parent = box;
      handle.position.y = 0.16;
      handle.scaling.y = 0.6;
      colorAll(box, handle);
      mesh = box;
      break;
    }
    case "activa-tu-idea": {
      // Bombilla de idea: siempre en tono cálido, sin importar el color de la zona.
      const bulb = MeshBuilder.CreateSphere(`prop-${zone.id}`, { diameter: 0.3 }, scene);
      const base = MeshBuilder.CreateCylinder(`prop-base-${zone.id}`, { height: 0.1, diameter: 0.14 }, scene);
      base.parent = bulb;
      base.position.y = -0.18;
      const warmMat = new StandardMaterial(`prop-warm-mat-${zone.id}`, scene);
      warmMat.diffuseColor = Color3.FromHexString("#FFD24C");
      warmMat.emissiveColor = Color3.FromHexString("#FFD24C");
      bulb.material = warmMat;
      base.material = warmMat;
      mesh = bulb;
      break;
    }
    case "latido-social": {
      // Corazón aproximado: dos lóbulos y una punta hacia abajo.
      const tip = MeshBuilder.CreateCylinder(
        `prop-${zone.id}`,
        { height: 0.24, diameterTop: 0.3, diameterBottom: 0, tessellation: 20 },
        scene
      );
      tip.position.y = -0.06;
      const left = MeshBuilder.CreateSphere(`prop-left-${zone.id}`, { diameter: 0.2 }, scene);
      left.parent = tip;
      left.position.set(-0.08, 0.12, 0);
      const right = MeshBuilder.CreateSphere(`prop-right-${zone.id}`, { diameter: 0.2 }, scene);
      right.parent = tip;
      right.position.set(0.08, 0.12, 0);
      colorAll(tip, left, right);
      mesh = tip;
      break;
    }
    default: {
      mesh = MeshBuilder.CreateSphere(`prop-${zone.id}`, { diameter: 0.25 }, scene);
      colorAll(mesh);
    }
  }

  return mesh;
}
