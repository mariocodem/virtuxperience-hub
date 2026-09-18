import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  PointLight,
  Vector3,
  Animation,
  Mesh,
  Constants,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";
import type { ZoneDefinition } from "../types/zone";

export interface ZonePortalHandle {
  zone: ZoneDefinition;
  root: TransformNode;
  getWorldPosition: () => Vector3;
  setHighlighted: (highlighted: boolean) => void;
}

const BEACON_HEIGHT = 3;

export function createZonePortal(
  scene: Scene,
  parent: TransformNode,
  zone: ZoneDefinition,
  localPosition: Vector3
): ZonePortalHandle {
  const root = new TransformNode(`zone-${zone.id}`, scene);
  root.parent = parent;
  root.position = localPosition;

  const color = Color3.FromHexString(zone.color);

  // Anillo luminoso en el suelo, marca el "landing pad" del portal.
  const ring = MeshBuilder.CreateTorus(`ring-${zone.id}`, { diameter: 2.6, thickness: 0.08, tessellation: 32 }, scene);
  ring.position.y = 0.03;
  ring.parent = root;
  const ringMat = new StandardMaterial(`ringMat-${zone.id}`, scene);
  ringMat.disableLighting = true;
  ringMat.emissiveColor = color;
  ring.material = ringMat;

  // Poste delgado: es solo el soporte físico (colisión), no la parte que brilla.
  const pole = MeshBuilder.CreateCylinder(`pole-${zone.id}`, { height: BEACON_HEIGHT, diameter: 0.25, tessellation: 8 }, scene);
  pole.position.y = BEACON_HEIGHT / 2;
  pole.parent = root;
  pole.checkCollisions = true;
  const poleMat = new StandardMaterial(`poleMat-${zone.id}`, scene);
  poleMat.diffuseColor = Color3.FromHexString("#1a1a22");
  poleMat.emissiveColor = color.scale(0.15);
  pole.material = poleMat;

  // Bombilla/núcleo de luz en la punta: alto emissive para que el GlowLayer la haga brillar como una baliza real.
  const bulb = MeshBuilder.CreateSphere(`bulb-${zone.id}`, { diameter: 0.7, segments: 12 }, scene);
  bulb.position.y = BEACON_HEIGHT + 0.1;
  bulb.parent = root;
  const bulbMat = new StandardMaterial(`bulbMat-${zone.id}`, scene);
  bulbMat.disableLighting = true;
  bulbMat.emissiveColor = color;
  bulb.material = bulbMat;

  // Haz de luz vertical (blending aditivo), como un faro apuntando al cielo.
  const beam = MeshBuilder.CreateCylinder(
    `beam-${zone.id}`,
    { height: 14, diameterTop: 1.8, diameterBottom: 0.15, tessellation: 16 }
  , scene);
  beam.position.y = BEACON_HEIGHT + 7;
  beam.parent = root;
  beam.isPickable = false;
  const beamMat = new StandardMaterial(`beamMat-${zone.id}`, scene);
  beamMat.disableLighting = true;
  beamMat.emissiveColor = color;
  beamMat.alpha = 0.16;
  beamMat.backFaceCulling = false;
  beamMat.alphaMode = Constants.ALPHA_ADD;
  beam.material = beamMat;

  const light = new PointLight(`light-${zone.id}`, new Vector3(0, BEACON_HEIGHT + 0.1, 0), scene);
  light.parent = root;
  light.diffuse = color;
  light.intensity = 0.8;
  light.range = 12;

  const label = MeshBuilder.CreatePlane(`label-${zone.id}`, { width: 4, height: 1 }, scene);
  label.position.y = BEACON_HEIGHT + 1.4;
  label.parent = root;
  label.billboardMode = Mesh.BILLBOARDMODE_ALL;

  const texture = AdvancedDynamicTexture.CreateForMesh(label, 512, 128);
  const text = new TextBlock();
  text.text = zone.name;
  text.color = "white";
  text.fontSize = 64;
  texture.addControl(text);

  return {
    zone,
    root,
    getWorldPosition: () => root.getAbsolutePosition(),
    setHighlighted: (highlighted: boolean) => {
      Animation.CreateAndStartAnimation(
        `pulse-${zone.id}`,
        bulb,
        "scaling",
        30,
        15,
        bulb.scaling.clone(),
        highlighted ? new Vector3(1.4, 1.4, 1.4) : Vector3.One(),
        Animation.ANIMATIONLOOPMODE_CONSTANT
      );
      light.intensity = highlighted ? 1.8 : 0.8;
      light.range = highlighted ? 18 : 12;
      beamMat.alpha = highlighted ? 0.3 : 0.16;
    },
  };
}
