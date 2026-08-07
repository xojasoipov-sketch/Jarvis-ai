/**
 * Mic → orb. Reads the microphone and reports two things every frame:
 * overall loudness, and a normalised spectrum the orb maps onto its nodes.
 *
 * Speech, not room tone, is what should wake the orb, so the meter tracks a
 * rolling noise floor and only reports "speaking" once the signal clears it by
 * a margin. A short hold keeps the orb awake through the gaps between words
 * instead of strobing on every pause.
 */

export type VoiceFrame = {
  /** Overall loudness above the noise floor, 0..1. */
  level: number;
  /** Per-bin energy, already normalised to 0..1. */
  spectrum: Float32Array;
  /** True while a voice is present (with hold applied). */
  speaking: boolean;
};

export type VoiceMeterOptions = {
  onFrame: (frame: VoiceFrame) => void;
  /** How far above the noise floor counts as speech. Default 0.06. */
  threshold?: number;
  /** Keep "speaking" true this long after the voice drops. Default 700ms. */
  holdMs?: number;
};

const FFT_SIZE = 512;
const FLOOR_RISE = 0.0006; // noise floor creeps up slowly…
const FLOOR_FALL = 0.02; // …but drops fast when the room goes quiet

export class VoiceMeter {
  private ctx: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private analyser: AnalyserNode | null = null;
  private raf = 0;
  private stopped = false;

  private readonly onFrame: VoiceMeterOptions["onFrame"];
  private readonly threshold: number;
  private readonly holdMs: number;

  // Explicit ArrayBuffer backing — the analyser's getByte*Data() will not accept
  // a view that TypeScript widens to ArrayBufferLike (i.e. possibly shared).
  private freq: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
  private time: Uint8Array<ArrayBuffer> = new Uint8Array(new ArrayBuffer(0));
  private spectrum: Float32Array = new Float32Array(0);
  private noiseFloor = 0.02;
  private lastVoiceAt = 0;

  constructor(opts: VoiceMeterOptions) {
    this.onFrame = opts.onFrame;
    this.threshold = opts.threshold ?? 0.06;
    this.holdMs = opts.holdMs ?? 700;
  }

  async start(): Promise<void> {
    if (this.ctx) return;
    this.stopped = false;

    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
    if (this.stopped) {
      // stop() landed while the permission prompt was open.
      this.stream.getTracks().forEach((t) => t.stop());
      this.stream = null;
      return;
    }

    const Ctor =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    this.ctx = new Ctor();
    // Autoplay policies can hand back a suspended context even after a gesture.
    if (this.ctx.state === "suspended") await this.ctx.resume();

    const source = this.ctx.createMediaStreamSource(this.stream);
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = FFT_SIZE;
    this.analyser.smoothingTimeConstant = 0.75;
    source.connect(this.analyser);

    const bins = this.analyser.frequencyBinCount;
    this.freq = new Uint8Array(new ArrayBuffer(bins));
    this.time = new Uint8Array(new ArrayBuffer(bins));
    this.spectrum = new Float32Array(bins);

    this.loop();
  }

  private loop = () => {
    if (this.stopped || !this.analyser) return;
    this.raf = requestAnimationFrame(this.loop);

    this.analyser.getByteFrequencyData(this.freq);
    this.analyser.getByteTimeDomainData(this.time);

    // RMS off the waveform — a truer loudness than summing FFT bins.
    let sum = 0;
    for (let i = 0; i < this.time.length; i++) {
      const v = (this.time[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / this.time.length);

    // Track the quiet baseline so a noisy room doesn't hold the orb awake.
    this.noiseFloor +=
      rms > this.noiseFloor ? FLOOR_RISE : (rms - this.noiseFloor) * FLOOR_FALL;

    const above = Math.max(0, rms - this.noiseFloor);
    const level = Math.min(1, above * 6);

    const now = performance.now();
    if (above > this.threshold) this.lastVoiceAt = now;
    const speaking = now - this.lastVoiceAt < this.holdMs;

    for (let i = 0; i < this.freq.length; i++) {
      // Only the part of each bin that clears the floor should light a node.
      this.spectrum[i] = speaking ? Math.max(0, this.freq[i] / 255 - 0.35) * 1.5 : 0;
    }

    this.onFrame({ level: speaking ? level : level * 0.25, spectrum: this.spectrum, speaking });
  };

  stop(): void {
    this.stopped = true;
    cancelAnimationFrame(this.raf);
    this.raf = 0;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.analyser = null;
    void this.ctx?.close();
    this.ctx = null;
  }
}
