import {
  Color3,
  Mesh,
  MeshBuilder,
  Scene,
  StandardMaterial,
  TransformNode,
  Vector3,
  WebXRCamera,
  WebXRDefaultExperience,
  WebXRFeatureName,
  WebXRState,
  WebXRHitTest,
} from "@babylonjs/core";

export interface XRSetupResult {
  supported: boolean;
  experience?: WebXRDefaultExperience;
}

export interface XRSetupCallbacks {
  /** Se llama al entrar/salir de la sesión de RA, con la cámara de XR mientras está activa. */
  onXRStateChange: (inXR: boolean, xrCamera: WebXRCamera | undefined) => void;
  /** Se llama cuando el jugador toca la pantalla ya con el hub colocado (equivalente táctil de [E]). */
  onSelectTap: () => void;
}

/** El hub mide ~50m de diámetro; se reduce a ~2m para que quepa sobre una mesa o el piso de una habitación. */
export const AR_SCALE = 1 / 25;

export async function setupXR(
  scene: Scene,
  hubRoot: TransformNode,
  uiRoot: HTMLElement,
  setOutdoorEnabled: (enabled: boolean) => void,
  callbacks: XRSetupCallbacks
): Promise<XRSetupResult> {
  const xrNavigator = navigator as Navigator & { xr?: XRSystem };
  const supported = xrNavigator.xr
    ? await xrNavigator.xr.isSessionSupported("immersive-ar").catch(() => false)
    : false;

  if (!supported) {
    console.info("WebXR AR no soportado en este navegador/dispositivo. El modo desktop sigue disponible.");
    return { supported: false };
  }

  const xr = await WebXRDefaultExperience.CreateAsync(scene, {
    uiOptions: {
      sessionMode: "immersive-ar",
      // Lista explícita y mínima: si se deja "optionalFeatures: true" a nivel
      // raíz, Babylon la reemplaza por su propia lista por defecto que incluye
      // "hand-tracking". Ningún celular soporta manos rastreadas en RA de
      // pantalla, y Chrome responde a eso con "NotSupportedError: the
      // specified session configuration is not supported" para toda la
      // sesión, no solo para esa función puntual.
      optionalFeatures: ["hit-test", "dom-overlay"],
      onError: (error) => {
        console.error("Error al iniciar la sesión de RA:", error);
        showXRError(uiRoot, error);
      },
    },
  });

  const reticle = createReticle(scene);
  let placed = false;
  let lastHitPosition: Vector3 | undefined;
  let spinObserver: ReturnType<Scene["onBeforeRenderObservable"]["add"]> | null = null;

  function resetPlacement(): void {
    placed = false;
    lastHitPosition = undefined;
    reticle.setEnabled(true);
    hubRoot.setEnabled(false);
  }

  xr.baseExperience.onStateChangedObservable.add((state) => {
    if (state === WebXRState.IN_XR) {
      hubRoot.scaling.setAll(AR_SCALE);
      setOutdoorEnabled(false);
      resetPlacement();
      spinObserver = scene.onBeforeRenderObservable.add(() => {
        reticle.rotation.y += 0.02;
      });
      callbacks.onXRStateChange(true, xr.baseExperience.camera);
    } else if (state === WebXRState.NOT_IN_XR) {
      hubRoot.scaling.copyFrom(Vector3.One());
      hubRoot.position.setAll(0);
      hubRoot.setEnabled(true);
      reticle.setEnabled(false);
      if (spinObserver) {
        scene.onBeforeRenderObservable.remove(spinObserver);
        spinObserver = null;
      }
      setOutdoorEnabled(true);
      callbacks.onXRStateChange(false, undefined);
    }
  });

  try {
    const featuresManager = xr.baseExperience.featuresManager;

    // "required: false" en ambas: si el dispositivo no soporta hit-test o
    // dom-overlay, la sesión de RA debe poder arrancar igual en vez de que
    // el navegador rechace requestSession() por completo.
    const hitTest = featuresManager.enableFeature(
      WebXRFeatureName.HIT_TEST,
      "latest",
      {},
      true,
      false
    ) as WebXRHitTest;
    hitTest.onHitTestResultObservable.add((results) => {
      if (placed || results.length === 0) return;
      const position = new Vector3();
      results[0].transformationMatrix.decompose(undefined, undefined, position);
      lastHitPosition = position;
      reticle.position.copyFrom(position);
      reticle.setEnabled(true);
    });

    featuresManager.enableFeature(
      WebXRFeatureName.DOM_OVERLAY,
      "latest",
      { element: uiRoot, supressXRSelectEvents: true },
      true,
      false
    );
  } catch (error) {
    console.warn("Hit-test o dom-overlay no disponibles en este dispositivo:", error);
  }

  xr.baseExperience.sessionManager.onXRSessionInit.add((session) => {
    session.addEventListener("select", () => {
      if (!placed) {
        if (!lastHitPosition) return;
        hubRoot.position.copyFrom(lastHitPosition);
        hubRoot.setEnabled(true);
        reticle.setEnabled(false);
        placed = true;
      } else {
        callbacks.onSelectTap();
      }
    });
  });

  return { supported: true, experience: xr };
}

/** Muestra el error real de WebXR directamente en pantalla: en el celular no hay consola a mano. */
function showXRError(uiRoot: HTMLElement, error: unknown): void {
  const message =
    error instanceof Error ? `${error.name}: ${error.message}` : typeof error === "string" ? error : JSON.stringify(error);

  const banner = document.createElement("div");
  banner.className = "xr-error-banner";
  banner.textContent = `No se pudo iniciar la RA: ${message} (toca para cerrar)`;
  banner.addEventListener("click", () => banner.remove());
  uiRoot.appendChild(banner);
}

function createReticle(scene: Scene): Mesh {
  const reticle = MeshBuilder.CreateTorus("ar-reticle", { diameter: 0.45, thickness: 0.03, tessellation: 32 }, scene);
  const mat = new StandardMaterial("ar-reticle-mat", scene);
  mat.disableLighting = true;
  mat.emissiveColor = new Color3(0.3, 0.9, 1);
  mat.alpha = 0.85;
  reticle.material = mat;
  reticle.isPickable = false;
  reticle.setEnabled(false);
  return reticle;
}
