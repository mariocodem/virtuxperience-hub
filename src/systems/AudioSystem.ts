/**
 * Audio 100 % procedural (Web Audio API): el proyecto no incluye archivos de sonido.
 * Ambiente (viento, grillos, colchón grave), pasos según la superficie, un zumbido que se intensifica al
 * acercarse a un portal (cada zona tiene su nota) y efectos de interfaz.
 *
 * El navegador solo permite iniciar el audio tras un gesto del usuario: `unlock()` se llama en el primer
 * clic/tecla y, mientras tanto, el resto de métodos no hacen nada.
 */

export type SfxName = "enter" | "exit" | "correct" | "wrong" | "badge" | "click";
export type Surface = "grass" | "stone";

const STORAGE_KEY = "virtuxperience:muted";
/** Una nota de la escala pentatónica por zona, en el orden de zones.config. */
const ZONE_NOTES = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25];
const MASTER_VOLUME = 0.8;

class AudioSystemImpl {
  private ctx?: AudioContext;
  private master?: GainNode;
  private noise?: AudioBuffer;
  private hum?: { oscA: OscillatorNode; oscB: OscillatorNode; gain: GainNode };
  private humZone = -1;
  private muted = readMuted();
  private readonly listeners: Array<(muted: boolean) => void> = [];

  get isMuted(): boolean {
    return this.muted;
  }

  onMuteChange(listener: (muted: boolean) => void): void {
    this.listeners.push(listener);
  }

  /** Crea el contexto de audio (o lo reanuda). Debe invocarse desde un gesto del usuario. */
  unlock(): void {
    if (!this.ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return;
      this.ctx = new Ctor();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : MASTER_VOLUME;
      this.master.connect(this.ctx.destination);
      this.noise = createNoiseBuffer(this.ctx);
      this.startAmbience();
      this.startHum();
      document.addEventListener("visibilitychange", () => {
        if (!this.ctx) return;
        if (document.hidden) void this.ctx.suspend();
        else void this.ctx.resume();
      });
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
  }

  toggleMute(): void {
    this.muted = !this.muted;
    try {
      localStorage.setItem(STORAGE_KEY, this.muted ? "1" : "0");
    } catch {
      // Sin almacenamiento disponible: la preferencia solo dura la sesión.
    }
    if (this.ctx && this.master) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : MASTER_VOLUME, this.ctx.currentTime, 0.05);
    }
    this.listeners.forEach((listener) => listener(this.muted));
  }

  /** Un paso: ruido filtrado y muy corto; en piedra es más seco y brillante que en pasto. */
  footstep(surface: Surface): void {
    const ctx = this.ready();
    if (!ctx || !this.noise || !this.master) return;
    const now = ctx.currentTime;

    const source = ctx.createBufferSource();
    source.buffer = this.noise;
    source.playbackRate.value = 0.85 + Math.random() * 0.3;

    const filter = ctx.createBiquadFilter();
    filter.type = "lowpass";
    filter.frequency.value = (surface === "stone" ? 1500 : 520) * (0.9 + Math.random() * 0.2);

    const gain = ctx.createGain();
    const peak = (surface === "stone" ? 0.16 : 0.11) * (0.85 + Math.random() * 0.3);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(peak, now + 0.008);
    gain.gain.exponentialRampToValueAtTime(0.0005, now + (surface === "stone" ? 0.09 : 0.14));

    source.connect(filter).connect(gain).connect(this.master);
    source.start(now, Math.random() * 1.5, 0.2);
  }

  /** `zoneIndex` = portal más cercano (o -1) y `closeness` de 0 (lejos) a 1 (encima). */
  setProximity(zoneIndex: number, closeness: number): void {
    const ctx = this.ready();
    if (!ctx || !this.hum) return;
    const now = ctx.currentTime;
    if (zoneIndex >= 0 && zoneIndex !== this.humZone) {
      const freq = ZONE_NOTES[zoneIndex % ZONE_NOTES.length];
      this.hum.oscA.frequency.setTargetAtTime(freq, now, 0.08);
      this.hum.oscB.frequency.setTargetAtTime(freq * 1.5, now, 0.08);
    }
    this.humZone = zoneIndex;
    const level = zoneIndex >= 0 ? Math.max(0, Math.min(1, closeness)) ** 1.6 * 0.05 : 0;
    this.hum.gain.gain.setTargetAtTime(level, now, 0.15);
  }

  play(name: SfxName): void {
    const ctx = this.ready();
    if (!ctx) return;
    const t = ctx.currentTime;
    switch (name) {
      case "enter":
        this.tone(220, t, 0.45, "sine", 0.16, 880);
        this.tone(330, t, 0.45, "triangle", 0.08, 1320);
        this.sparkle(t + 0.05, 0.35);
        break;
      case "exit":
        this.tone(660, t, 0.3, "sine", 0.13, 220);
        break;
      case "correct":
        [523.25, 659.25, 783.99].forEach((f, i) => this.bell(f, t + i * 0.07, 0.5, 0.12));
        break;
      case "wrong":
        this.tone(190, t, 0.32, "sawtooth", 0.07, 105, 700);
        this.tone(140, t + 0.02, 0.3, "square", 0.04, 80, 500);
        break;
      case "badge":
        [523.25, 659.25, 783.99, 1046.5, 1318.5].forEach((f, i) => this.bell(f, t + i * 0.09, 0.9, 0.11));
        this.sparkle(t + 0.35, 0.7);
        break;
      case "click":
        this.tone(1200, t, 0.04, "sine", 0.06);
        break;
    }
  }

  private ready(): AudioContext | undefined {
    return this.ctx && this.ctx.state === "running" ? this.ctx : undefined;
  }

  private tone(freq: number, start: number, duration: number, type: OscillatorType, peak: number, endFreq?: number, lowpass?: number): void {
    if (!this.ctx || !this.master) return;
    const osc = this.ctx.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, start);
    if (endFreq) osc.frequency.exponentialRampToValueAtTime(endFreq, start + duration);
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(0.0001, start);
    gain.gain.exponentialRampToValueAtTime(peak, start + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, start + duration);
    let node: AudioNode = osc;
    if (lowpass) {
      const filter = this.ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.value = lowpass;
      node = osc.connect(filter);
    }
    node.connect(gain).connect(this.master);
    osc.start(start);
    osc.stop(start + duration + 0.05);
  }

  /** Campana: fundamental + armónico agudo con decaimiento largo. */
  private bell(freq: number, start: number, duration: number, peak: number): void {
    this.tone(freq, start, duration, "sine", peak);
    this.tone(freq * 2.01, start, duration * 0.6, "sine", peak * 0.35);
  }

  /** Destellos agudos aleatorios para dar sensación de "magia". */
  private sparkle(start: number, duration: number): void {
    for (let i = 0; i < 6; i++) {
      const at = start + Math.random() * duration;
      this.tone(1800 + Math.random() * 2200, at, 0.12, "sine", 0.03);
    }
  }

  private startAmbience(): void {
    const ctx = this.ctx;
    const master = this.master;
    if (!ctx || !master || !this.noise) return;

    // Viento: ruido con filtro pasabanda que respira lentamente.
    const wind = ctx.createBufferSource();
    wind.buffer = this.noise;
    wind.loop = true;
    const windFilter = ctx.createBiquadFilter();
    windFilter.type = "bandpass";
    windFilter.frequency.value = 420;
    windFilter.Q.value = 0.5;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.05;
    const gustLfo = ctx.createOscillator();
    gustLfo.frequency.value = 0.09;
    const gustDepth = ctx.createGain();
    gustDepth.gain.value = 0.03;
    gustLfo.connect(gustDepth).connect(windGain.gain);
    const gustFreqDepth = ctx.createGain();
    gustFreqDepth.gain.value = 160;
    gustLfo.connect(gustFreqDepth).connect(windFilter.frequency);
    wind.connect(windFilter).connect(windGain).connect(master);
    wind.start();
    gustLfo.start();

    // Colchón grave: dos notas largas y suaves (La y Mi) con un latido lento.
    const padGain = ctx.createGain();
    padGain.gain.value = 0.022;
    const padFilter = ctx.createBiquadFilter();
    padFilter.type = "lowpass";
    padFilter.frequency.value = 700;
    for (const freq of [110, 164.81, 220.5]) {
      const osc = ctx.createOscillator();
      osc.type = "sine";
      osc.frequency.value = freq;
      osc.connect(padFilter);
      osc.start();
    }
    const swell = ctx.createOscillator();
    swell.frequency.value = 0.06;
    const swellDepth = ctx.createGain();
    swellDepth.gain.value = 0.012;
    swell.connect(swellDepth).connect(padGain.gain);
    swell.start();
    padFilter.connect(padGain).connect(master);

    this.scheduleCricket();
  }

  /** Grillos del atardecer: ráfagas de tres pulsos agudos a intervalos irregulares. */
  private scheduleCricket(): void {
    const chirp = (): void => {
      const ctx = this.ready();
      if (ctx) {
        const base = 4100 + Math.random() * 500;
        const t = ctx.currentTime;
        for (let i = 0; i < 3; i++) this.tone(base, t + i * 0.06, 0.03, "sine", 0.008);
      }
      window.setTimeout(chirp, 700 + Math.random() * 2200);
    };
    window.setTimeout(chirp, 1500);
  }

  private startHum(): void {
    if (!this.ctx || !this.master) return;
    const gain = this.ctx.createGain();
    gain.gain.value = 0;
    const oscA = this.ctx.createOscillator();
    oscA.type = "sine";
    oscA.frequency.value = ZONE_NOTES[0];
    const oscB = this.ctx.createOscillator();
    oscB.type = "triangle";
    oscB.frequency.value = ZONE_NOTES[0] * 1.5;
    oscA.connect(gain);
    oscB.connect(gain);
    gain.connect(this.master);
    oscA.start();
    oscB.start();
    this.hum = { oscA, oscB, gain };
  }
}

function createNoiseBuffer(ctx: AudioContext): AudioBuffer {
  const length = ctx.sampleRate * 2;
  const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  // Ruido "marrón" (integrado y normalizado): más grave y natural que el blanco.
  let last = 0;
  for (let i = 0; i < length; i++) {
    const white = Math.random() * 2 - 1;
    last = (last + 0.04 * white) / 1.04;
    data[i] = last * 3.5;
  }
  return buffer;
}

function readMuted(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

export const AudioSystem = new AudioSystemImpl();
