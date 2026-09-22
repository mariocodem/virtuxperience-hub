/** Destello del color de la zona al cruzar un portal: cubre el corte entre el hub y el minijuego. */
export function playZoneTransition(root: HTMLElement, color: string): void {
  const flash = document.createElement("div");
  flash.className = "zone-transition";
  flash.style.setProperty("--zone-color", color);
  flash.addEventListener("animationend", () => flash.remove());
  root.appendChild(flash);
}
