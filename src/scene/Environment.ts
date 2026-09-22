import {
  Scene,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
  Mesh,
  MeshBuilder,
  ShadowGenerator,
  GlowLayer,
  ReflectionProbe,
  RenderTargetTexture,
  DefaultRenderingPipeline,
  ImageProcessingConfiguration,
  Camera,
} from "@babylonjs/core";
import { createDuskSkyMaterial } from "./Sky";

export interface EnvironmentHandles {
  skybox: Mesh;
  shadowGenerator: ShadowGenerator;
  glowLayer: GlowLayer;
  setOutdoorEnabled: (enabled: boolean) => void;
  /** Activa bloom, antialiasing, tone mapping y viñeta sobre la cámara del jugador. */
  setupPostProcessing: (camera: Camera) => void;
}

/** Color del horizonte al atardecer: la niebla y las colinas lejanas se funden con él. */
export const HORIZON_COLOR = new Color3(0.78, 0.5, 0.42);

/**
 * Dirección hacia el sol dibujado en el cielo (muy cerca del horizonte, para un atardecer real) y hacia la
 * luz que ilumina la escena (algo más alta): con el sol rasante las superficies casi no recibirían luz directa.
 */
const SKY_SUN_DIRECTION = new Vector3(-0.55, 0.06, 0.83).normalize();
const LIGHT_SUN_DIRECTION = new Vector3(-0.55, 0.36, 0.78).normalize();
const SKY_SIZE = 800;

export function setupEnvironment(scene: Scene): EnvironmentHandles {
  scene.clearColor = new Color4(HORIZON_COLOR.r * 0.5, HORIZON_COLOR.g * 0.4, HORIZON_COLOR.b * 0.45, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.0075;
  scene.fogColor = HORIZON_COLOR.clone();

  // Luz de cielo: azul arriba, calidez rebotada del suelo abajo. Sin ella las sombras quedan negras.
  const hemi = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;
  hemi.diffuse = new Color3(0.62, 0.7, 0.95);
  hemi.groundColor = new Color3(0.32, 0.25, 0.22);
  hemi.specular = Color3.Black();

  const sun = new DirectionalLight("sunLight", LIGHT_SUN_DIRECTION.scale(-1), scene);
  sun.intensity = 2.4;
  sun.diffuse = new Color3(1, 0.72, 0.48);
  sun.specular = new Color3(1, 0.8, 0.6);
  sun.position = LIGHT_SUN_DIRECTION.scale(80);
  // Las instancias (árboles, farolas) no cuentan en el cálculo automático de límites: se fija el área
  // de sombras a mano para cubrir todo el recinto jugable (~60 m) con margen.
  sun.autoUpdateExtends = false;
  sun.orthoLeft = -48;
  sun.orthoRight = 48;
  sun.orthoTop = 48;
  sun.orthoBottom = -48;
  sun.shadowMinZ = 10;
  sun.shadowMaxZ = 170;

  const shadowGenerator = new ShadowGenerator(2048, sun);
  shadowGenerator.usePercentageCloserFiltering = true;
  shadowGenerator.filteringQuality = ShadowGenerator.QUALITY_MEDIUM;
  shadowGenerator.bias = 0.0008;
  shadowGenerator.normalBias = 0.02;
  shadowGenerator.darkness = 0.15;

  const skybox = MeshBuilder.CreateBox("skybox", { size: SKY_SIZE }, scene);
  skybox.material = createDuskSkyMaterial(scene, SKY_SUN_DIRECTION);
  skybox.infiniteDistance = true;
  skybox.isPickable = false;

  // El cielo se captura una sola vez como cubemap: da a los materiales PBR luz ambiente y reflejos coherentes.
  const probe = new ReflectionProbe("skyProbe", 256, scene, true);
  probe.renderList?.push(skybox);
  probe.refreshRate = RenderTargetTexture.REFRESHRATE_RENDER_ONCE;
  probe.position = new Vector3(0, 2, 0);
  scene.environmentTexture = probe.cubeTexture;
  scene.environmentIntensity = 0.9;

  const glowLayer = new GlowLayer("hubGlow", scene, { blurKernelSize: 48 });
  glowLayer.intensity = 0.7;

  let pipeline: DefaultRenderingPipeline | undefined;

  return {
    skybox,
    shadowGenerator,
    glowLayer,
    setOutdoorEnabled: (enabled: boolean) => {
      skybox.setEnabled(enabled);
      scene.fogEnabled = enabled;
      if (pipeline) {
        pipeline.bloomEnabled = enabled;
        pipeline.fxaaEnabled = enabled;
        pipeline.imageProcessing.vignetteEnabled = enabled;
        pipeline.imageProcessing.toneMappingEnabled = enabled;
      }
    },
    setupPostProcessing: (camera: Camera) => {
      pipeline = new DefaultRenderingPipeline("hubPipeline", true, scene, [camera]);
      pipeline.samples = 1;
      pipeline.fxaaEnabled = true;

      pipeline.bloomEnabled = true;
      pipeline.bloomThreshold = 1.05;
      pipeline.bloomWeight = 0.28;
      pipeline.bloomKernel = 48;
      pipeline.bloomScale = 0.5;

      pipeline.imageProcessingEnabled = true;
      const ip = pipeline.imageProcessing;
      ip.toneMappingEnabled = true;
      ip.toneMappingType = ImageProcessingConfiguration.TONEMAPPING_ACES;
      ip.exposure = 1.05;
      ip.contrast = 1.12;
      ip.vignetteEnabled = true;
      ip.vignetteWeight = 1.6;
      ip.vignetteStretch = 0.4;
      ip.vignetteColor = new Color4(0.05, 0.02, 0.05, 0);
      pipeline.grainEnabled = true;
      pipeline.grain.intensity = 4;
      pipeline.grain.animated = true;
    },
  };
}
