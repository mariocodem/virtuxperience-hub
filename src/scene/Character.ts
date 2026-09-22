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
import { AdvancedDynamicTexture, Rectangle, TextBlock } from "@babylonjs/gui";
import type { ZoneDefinition } from "../types/zone";

const SKIN_TONES = ["#f2d9b8", "#d9a878", "#a9744c", "#f0c9a0", "#8a5a3b", "#e8bd94"];
const HAIR_COLORS = ["#2a1c14", "#5a3a22", "#1a1a1e", "#8a5a2c", "#3a2a24", "#6a6a70"];
const TROUSERS_COLOR = "#2b2f3d";

/** Cerca del jugador el personaje lo mira, saluda y muestra su diálogo. */
const ENGAGE_DISTANCE = 6;
const LOOK_DISTANCE = 11;
const WAVE_SECONDS = 2.6;
const GREETING_HEIGHT = 2.35;

export interface ZoneCharacterHandle {
  root: TransformNode;
  /** Se llama en cada frame con la posición del jugador en coordenadas de mundo. */
  update: (playerPosition: Vector3, deltaSeconds: number, greetingHidden: boolean) => void;
}

function shortestAngle(from: number, to: number): number {
  let diff = (to - from) % (Math.PI * 2);
  if (diff > Math.PI) diff -= Math.PI * 2;
  if (diff < -Math.PI) diff += Math.PI * 2;
  return diff;
}

function flatMaterial(scene: Scene, name: string, hex: string, emissiveScale = 0.12): StandardMaterial {
  const color = Color3.FromHexString(hex);
  const mat = new StandardMaterial(name, scene);
  mat.diffuseColor = color;
  mat.emissiveColor = color.scale(emissiveScale);
  mat.specularColor = new Color3(0.08, 0.08, 0.08);
  return mat;
}

export function createZoneCharacter(scene: Scene, parent: TransformNode, zone: ZoneDefinition, index: number): ZoneCharacterHandle {
  const root = new TransformNode(`character-${zone.id}`, scene);
  root.parent = parent;

  // Junto al portal, del lado de la plaza, mirando hacia el centro del hub.
  const a = (zone.angleDeg * Math.PI) / 180;
  const inward = new Vector3(-Math.sin(a), 0, -Math.cos(a));
  const tangent = new Vector3(Math.cos(a), 0, -Math.sin(a));
  root.position = inward.scale(0.7).add(tangent.scale(1.9));
  const homeYaw = Math.atan2(inward.x, inward.z);
  root.rotation.y = homeYaw;

  const zoneColor = Color3.FromHexString(zone.color);
  const skin = flatMaterial(scene, `skin-${zone.id}`, SKIN_TONES[index % SKIN_TONES.length], 0.18);
  const hair = flatMaterial(scene, `hair-${zone.id}`, HAIR_COLORS[index % HAIR_COLORS.length], 0.05);
  const trousers = flatMaterial(scene, `trousers-${zone.id}`, TROUSERS_COLOR, 0.05);
  const shirt = new StandardMaterial(`shirt-${zone.id}`, scene);
  shirt.diffuseColor = zoneColor.scale(0.75);
  shirt.emissiveColor = zoneColor.scale(0.22);
  shirt.specularColor = new Color3(0.1, 0.1, 0.1);
  const dark = flatMaterial(scene, `eye-${zone.id}`, "#15151a", 0);

  const part = <T extends Mesh>(mesh: T, material: StandardMaterial, holder: TransformNode = root): T => {
    mesh.material = material;
    mesh.parent = holder;
    mesh.isPickable = false;
    return mesh;
  };

  // Piernas y zapatos.
  for (const side of [-1, 1]) {
    const leg = part(MeshBuilder.CreateCylinder(`leg-${zone.id}-${side}`, { height: 0.78, diameter: 0.17, tessellation: 12 }, scene), trousers);
    leg.position.set(side * 0.1, 0.42, 0);
    const shoe = part(MeshBuilder.CreateSphere(`shoe-${zone.id}-${side}`, { diameter: 0.2, segments: 8 }, scene), dark);
    shoe.scaling.set(0.9, 0.55, 1.5);
    shoe.position.set(side * 0.1, 0.05, 0.05);
  }

  // Torso con "pivote" en la cintura para poder animar la respiración.
  const torsoPivot = new TransformNode(`torso-${zone.id}`, scene);
  torsoPivot.parent = root;
  torsoPivot.position.y = 0.8;
  const torso = part(MeshBuilder.CreateCapsule(`torso-mesh-${zone.id}`, { height: 0.78, radius: 0.2 }, scene), shirt, torsoPivot);
  torso.position.y = 0.36;
  torso.scaling.set(1.25, 1, 0.8);

  // Brazos: pivote en el hombro, brazo colgando.
  const makeArm = (side: number): TransformNode => {
    const pivot = new TransformNode(`arm-${zone.id}-${side}`, scene);
    pivot.parent = torsoPivot;
    pivot.position.set(side * 0.29, 0.58, 0);
    const arm = part(MeshBuilder.CreateCapsule(`arm-mesh-${zone.id}-${side}`, { height: 0.58, radius: 0.058 }, scene), shirt, pivot);
    arm.position.y = -0.26;
    const hand = part(MeshBuilder.CreateSphere(`hand-${zone.id}-${side}`, { diameter: 0.11, segments: 8 }, scene), skin, pivot);
    hand.position.y = -0.58;
    return pivot;
  };
  const leftArm = makeArm(-1);
  const rightArm = makeArm(1);
  leftArm.rotation.z = -0.1;
  rightArm.rotation.z = 0.1;

  // Cabeza con cuello, ojos y cabello. El pivote permite girarla hacia el jugador.
  const neck = part(MeshBuilder.CreateCylinder(`neck-${zone.id}`, { height: 0.12, diameter: 0.1 }, scene), skin, torsoPivot);
  neck.position.y = 0.78;
  const headPivot = new TransformNode(`head-${zone.id}`, scene);
  headPivot.parent = torsoPivot;
  headPivot.position.y = 0.95;
  const head = part(MeshBuilder.CreateSphere(`head-mesh-${zone.id}`, { diameter: 0.3, segments: 16 }, scene), skin, headPivot);
  head.scaling.y = 1.1;
  for (const side of [-1, 1]) {
    const eye = part(MeshBuilder.CreateSphere(`eye-${zone.id}-${side}`, { diameter: 0.04, segments: 6 }, scene), dark, headPivot);
    eye.position.set(side * 0.05, 0.02, 0.134);
  }
  const hairCap = part(MeshBuilder.CreateSphere(`hair-mesh-${zone.id}`, { diameter: 0.33, segments: 12 }, scene), hair, headPivot);
  hairCap.position.set(0, 0.045, -0.04);

  // Prop temático (hologramas giratorios) flotando a un costado, como antes.
  const prop = createThemedProp(scene, zone);
  prop.parent = root;
  prop.position = new Vector3(-0.6, 1.45, 0.15);
  Animation.CreateAndStartAnimation(`prop-spin-${zone.id}`, prop, "rotation.y", 30, 150, 0, Math.PI * 2, Animation.ANIMATIONLOOPMODE_CYCLE);
  Animation.CreateAndStartAnimation(
    `prop-bob-${zone.id}`,
    prop,
    "position.y",
    30,
    90,
    1.4,
    1.52,
    Animation.ANIMATIONLOOPMODE_YOYO
  );

  const greeting = createGreeting(scene, root, zone);

  let time = index * 1.7; // desfasa la respiración de cada personaje
  let engagedFor = 0;
  let headYaw = 0;
  let headPitch = 0;

  return {
    root,
    update: (playerPosition, dt, greetingHidden) => {
      time += dt;
      const self = root.getAbsolutePosition();
      const dx = playerPosition.x - self.x;
      const dz = playerPosition.z - self.z;
      const distance = Math.hypot(dx, dz);
      const engaged = distance < ENGAGE_DISTANCE;

      // Cuerpo: mira al jugador de cerca; si se aleja, vuelve a su posición de reposo.
      const targetYaw = engaged ? Math.atan2(dx, dz) : homeYaw;
      root.rotation.y += shortestAngle(root.rotation.y, targetYaw) * (1 - Math.exp(-dt * 3));

      // Cabeza: sigue al jugador (con límite) un poco antes de que se acerque del todo.
      let yawGoal = 0;
      let pitchGoal = 0;
      if (distance < LOOK_DISTANCE) {
        const relative = shortestAngle(root.rotation.y, Math.atan2(dx, dz));
        if (Math.abs(relative) < 2) yawGoal = Math.max(-0.9, Math.min(0.9, relative));
        const headHeight = headPivot.getAbsolutePosition().y;
        pitchGoal = Math.max(-0.35, Math.min(0.35, Math.atan2(headHeight - playerPosition.y, distance) * 0.7));
      }
      const follow = 1 - Math.exp(-dt * 5);
      headYaw += (yawGoal - headYaw) * follow;
      headPitch += (pitchGoal - headPitch) * follow;
      headPivot.rotation.y = headYaw;
      headPivot.rotation.x = headPitch;

      // Respiración y leve balanceo de los brazos.
      torsoPivot.scaling.y = 1 + Math.sin(time * 1.7) * 0.012;
      leftArm.rotation.z = -0.1 - Math.sin(time * 1.3) * 0.02;

      // Saludo: brazo derecho en alto y oscilando durante unos segundos tras acercarse.
      engagedFor = engaged ? engagedFor + dt : 0;
      const waving = engaged && engagedFor < WAVE_SECONDS;
      const armGoal = waving ? 2.55 + Math.sin(time * 9) * 0.28 : 0.1 + Math.sin(time * 1.3 + 1) * 0.02;
      rightArm.rotation.z += (armGoal - rightArm.rotation.z) * (1 - Math.exp(-dt * (waving ? 10 : 4)));

      greeting.setVisible(engaged && !greetingHidden, dt);
    },
  };
}

function createGreeting(scene: Scene, root: TransformNode, zone: ZoneDefinition): { setVisible: (visible: boolean, dt: number) => void } {
  const plane = MeshBuilder.CreatePlane(`greeting-${zone.id}`, { width: 2.4, height: 0.7 }, scene);
  plane.parent = root;
  plane.position.y = GREETING_HEIGHT;
  plane.billboardMode = Mesh.BILLBOARDMODE_Y;
  plane.isPickable = false;
  plane.visibility = 0;
  plane.setEnabled(false);

  const texture = AdvancedDynamicTexture.CreateForMesh(plane, 768, 224);
  // El tone mapping del post-proceso apaga los blancos puros: se sobreexpone la textura para que el texto siga viéndose blanco.
  texture.level = 1.5;
  const box = new Rectangle();
  box.cornerRadius = 36;
  box.thickness = 6;
  box.color = zone.color;
  box.background = "rgba(8, 10, 22, 0.94)";
  texture.addControl(box);

  const text = new TextBlock();
  text.text = zone.npcGreeting ?? zone.description;
  text.color = "white";
  text.fontSize = 40;
  text.textWrapping = true;
  text.paddingLeft = "28px";
  text.paddingRight = "28px";
  box.addControl(text);

  let opacity = 0;
  return {
    setVisible: (visible, dt) => {
      const goal = visible ? 1 : 0;
      opacity += (goal - opacity) * (1 - Math.exp(-dt * 6));
      if (Math.abs(goal - opacity) < 0.01) opacity = goal;
      plane.visibility = opacity;
      plane.setEnabled(opacity > 0);
    },
  };
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
