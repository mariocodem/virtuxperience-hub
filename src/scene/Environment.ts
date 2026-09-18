import {
  Scene,
  HemisphericLight,
  DirectionalLight,
  Vector3,
  Color3,
  Color4,
  Mesh,
  MeshBuilder,
  StandardMaterial,
  ShadowGenerator,
  GlowLayer,
} from "@babylonjs/core";

export interface EnvironmentHandles {
  skybox: Mesh;
  shadowGenerator: ShadowGenerator;
  glowLayer: GlowLayer;
  setOutdoorEnabled: (enabled: boolean) => void;
}

export function setupEnvironment(scene: Scene): EnvironmentHandles {
  scene.clearColor = new Color4(0.02, 0.02, 0.05, 1);
  scene.fogMode = Scene.FOGMODE_EXP2;
  scene.fogDensity = 0.008;
  scene.fogColor = new Color3(0.05, 0.05, 0.1);

  const hemi = new HemisphericLight("hemiLight", new Vector3(0, 1, 0), scene);
  hemi.intensity = 0.55;

  const sun = new DirectionalLight("sunLight", new Vector3(-0.5, -1, 0.3), scene);
  sun.intensity = 0.9;
  sun.position = new Vector3(20, 40, -20);

  const shadowGenerator = new ShadowGenerator(1024, sun);
  shadowGenerator.usePercentageCloserFiltering = true;

  const skybox = MeshBuilder.CreateSphere("skybox", { diameter: 400, sideOrientation: Mesh.BACKSIDE }, scene);
  const skyMat = new StandardMaterial("skyMat", scene);
  skyMat.backFaceCulling = false;
  skyMat.disableLighting = true;
  skyMat.emissiveColor = new Color3(0.05, 0.05, 0.12);
  skybox.material = skyMat;
  skybox.infiniteDistance = true;

  const glowLayer = new GlowLayer("hubGlow", scene);
  glowLayer.intensity = 0.9;

  return {
    skybox,
    shadowGenerator,
    glowLayer,
    setOutdoorEnabled: (enabled: boolean) => {
      skybox.setEnabled(enabled);
      scene.fogEnabled = enabled;
    },
  };
}
