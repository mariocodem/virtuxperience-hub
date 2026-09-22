import {
  Scene,
  TransformNode,
  MeshBuilder,
  StandardMaterial,
  Color3,
  PointLight,
  PBRMaterial,
  ParticleSystem,
  Color4,
  Vector3,
  Animation,
  Mesh,
  Constants,
} from "@babylonjs/core";
import { AdvancedDynamicTexture, TextBlock } from "@babylonjs/gui";
import type { ZoneDefinition } from "../types/zone";
import { createGlowDotTexture } from "./ProceduralTextures";

export interface ZonePortalHandle {
  zone: ZoneDefinition;
  root: TransformNode;
  getWorldPosition: () => Vector3;
  setHighlighted: (highlighted: boolean) => void;
  /** Activa/desactiva las chispas y los anillos giratorios (se apagan en RA, donde el hub va a escala reducida). */
  setEffectsEnabled: (enabled: boolean) => void;
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

  // Zócalo de piedra oscura sobre el que se apoya el poste.
  const plinth = MeshBuilder.CreateCylinder(`plinth-${zone.id}`, { height: 0.35, diameterBottom: 1.1, diameterTop: 0.8, tessellation: 20 }, scene);
  plinth.position.y = 0.17;
  plinth.parent = root;
  plinth.checkCollisions = true;
  const plinthMat = new PBRMaterial(`plinthMat-${zone.id}`, scene);
  plinthMat.albedoColor = Color3.FromHexString("#3a3a44");
  plinthMat.metallic = 0.1;
  plinthMat.roughness = 0.6;
  plinthMat.maxSimultaneousLights = 8;
  plinth.material = plinthMat;

  // Poste delgado: es solo el soporte físico (colisión), no la parte que brilla.
  const pole = MeshBuilder.CreateCylinder(`pole-${zone.id}`, { height: BEACON_HEIGHT, diameterBottom: 0.3, diameterTop: 0.18, tessellation: 12 }, scene);
  pole.position.y = BEACON_HEIGHT / 2;
  pole.parent = root;
  pole.checkCollisions = true;
  const poleMat = new PBRMaterial(`poleMat-${zone.id}`, scene);
  poleMat.albedoColor = Color3.FromHexString("#22232b");
  poleMat.metallic = 0.85;
  poleMat.roughness = 0.4;
  poleMat.emissiveColor = color.scale(0.12);
  poleMat.maxSimultaneousLights = 8;
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

  // Dos aros que giran en ejes distintos alrededor de la baliza, como un giroscopio.
  const haloMat = new StandardMaterial(`haloMat-${zone.id}`, scene);
  haloMat.disableLighting = true;
  haloMat.emissiveColor = color.scale(0.9);
  const halos = [1.15, 0.9].map((diameter, i) => {
    const halo = MeshBuilder.CreateTorus(`halo-${zone.id}-${i}`, { diameter, thickness: 0.035, tessellation: 40 }, scene);
    halo.position.y = BEACON_HEIGHT + 0.1;
    halo.parent = root;
    halo.isPickable = false;
    halo.material = haloMat;
    return halo;
  });
  halos[1].rotation.x = Math.PI / 2;
  const spinObserver = scene.onBeforeRenderObservable.add(() => {
    const dt = scene.getEngine().getDeltaTime() / 1000;
    halos[0].rotation.y += dt * 1.1;
    halos[0].rotation.z += dt * 0.5;
    halos[1].rotation.x += dt * 0.8;
    halos[1].rotation.y -= dt * 0.9;
  });

  // Chispas que ascienden desde la baliza.
  const sparks = new ParticleSystem(`sparks-${zone.id}`, 80, scene);
  sparks.particleTexture = createGlowDotTexture(scene);
  sparks.emitter = bulb;
  sparks.createSphereEmitter(0.25);
  sparks.color1 = new Color4(color.r, color.g, color.b, 1);
  sparks.color2 = new Color4(1, 1, 1, 0.9);
  sparks.colorDead = new Color4(color.r, color.g, color.b, 0);
  sparks.minSize = 0.05;
  sparks.maxSize = 0.14;
  sparks.minLifeTime = 1.2;
  sparks.maxLifeTime = 2.6;
  sparks.emitRate = 22;
  sparks.minEmitPower = 0.4;
  sparks.maxEmitPower = 1.1;
  sparks.gravity = new Vector3(0, 0.6, 0);
  sparks.blendMode = ParticleSystem.BLENDMODE_ADD;
  sparks.start();
  root.onDisposeObservable.add(() => scene.onBeforeRenderObservable.remove(spinObserver));

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
      sparks.emitRate = highlighted ? 70 : 22;
    },
    setEffectsEnabled: (enabled: boolean) => {
      if (enabled) sparks.start();
      else sparks.stop();
      halos.forEach((halo) => halo.setEnabled(enabled));
    },
  };
}
