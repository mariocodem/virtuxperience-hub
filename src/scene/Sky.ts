import { Effect, Scene, ShaderMaterial, Vector3 } from "@babylonjs/core";

/**
 * Cielo de atardecer procedural: gradiente cenit→horizonte, resplandor y disco solar (en HDR, para que el
 * bloom lo haga brillar) y estrellas tenues arriba. Se evalúa por dirección, así que no depende de texturas
 * ni de cómo se mapee la esfera/caja que lo dibuja.
 */

const VERTEX = `
precision highp float;
attribute vec3 position;
uniform mat4 worldViewProjection;
varying vec3 vDirection;
void main() {
  vDirection = position;
  gl_Position = worldViewProjection * vec4(position, 1.0);
}
`;

const FRAGMENT = `
precision highp float;
varying vec3 vDirection;
uniform vec3 sunDirection;

float hash(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

void main() {
  vec3 d = normalize(vDirection);
  float h = d.y;

  vec3 zenith  = vec3(0.045, 0.075, 0.24);
  vec3 upper   = vec3(0.16, 0.19, 0.46);
  vec3 middle  = vec3(0.62, 0.34, 0.42);
  vec3 horizon = vec3(1.00, 0.58, 0.30);
  vec3 ground  = vec3(0.34, 0.20, 0.20);

  vec3 col = mix(horizon, middle, smoothstep(0.0, 0.16, h));
  col = mix(col, upper, smoothstep(0.10, 0.45, h));
  col = mix(col, zenith, smoothstep(0.40, 0.95, h));
  col = mix(col, ground, smoothstep(0.0, -0.25, h));

  float s = max(dot(d, normalize(sunDirection)), 0.0);
  col += vec3(1.0, 0.55, 0.22) * pow(s, 6.0) * 0.45;
  col += vec3(1.0, 0.7, 0.4) * pow(s, 48.0) * 0.9;
  col += vec3(1.0, 0.92, 0.75) * smoothstep(0.9993, 0.9998, s) * 9.0;

  // Estrellas: celdas sobre la esfera, solo donde el cielo ya está oscuro.
  vec2 uv = vec2(atan(d.z, d.x), asin(clamp(h, -1.0, 1.0))) * vec2(90.0, 180.0) / 3.14159;
  vec2 cell = floor(uv);
  float r = hash(cell);
  float star = step(0.9965, r) * smoothstep(0.35, 0.7, h);
  vec2 local = fract(uv) - 0.5;
  star *= smoothstep(0.35, 0.0, length(local));
  col += vec3(0.85, 0.9, 1.0) * star * (0.5 + hash(cell + 7.0));

  gl_FragColor = vec4(col, 1.0);
}
`;

export function createDuskSkyMaterial(scene: Scene, sunDirection: Vector3): ShaderMaterial {
  Effect.ShadersStore["duskSkyVertexShader"] = VERTEX;
  Effect.ShadersStore["duskSkyFragmentShader"] = FRAGMENT;

  const material = new ShaderMaterial("duskSkyMat", scene, "duskSky", {
    attributes: ["position"],
    uniforms: ["worldViewProjection", "sunDirection"],
  });
  material.setVector3("sunDirection", sunDirection);
  material.backFaceCulling = false;
  return material;
}
