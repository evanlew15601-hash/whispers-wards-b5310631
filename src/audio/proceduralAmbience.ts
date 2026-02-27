import { encodeWavPcm16Mono } from '@/audio/wav';

export type AmbienceId = 'title' | 'game';

const cache = new Map<AmbienceId, string>();

const seeded = (seed: number) => {
  let x = seed | 0;
  return () => {
    x ^= x << 13;
    x ^= x >> 17;
    x ^= x << 5;
    return (x >>> 0) / 0xffffffff;
  };
};

const makeNoiseBed = (id: AmbienceId, sampleRate: number, seconds: number) => {
  const rand = seeded(id === 'title' ? 0x13572468 : 0x24681357);

  const total = Math.floor(sampleRate * seconds);
  const out = new Float32Array(total);

  let lp = 0;
  const lpAmt = id === 'title' ? 0.05 : 0.04;

  // Title: regal (warm major-ish drones). Game: court intrigue (darker minor-ish bed).
  const freqs =
    id === 'title'
      ? [98.0, 123.47, 146.83] // G2, B2, D3
      : [73.42, 87.31, 110.0]; // D2, F2, A2

  for (let i = 0; i < total; i++) {
    const t = i / sampleRate;

    // Pink-ish noise via leaky integrator.
    const white = (rand() * 2 - 1) * 0.18;
    lp += (white - lp) * lpAmt;

    const slow = 0.5 + 0.5 * Math.sin(2 * Math.PI * 0.03 * t);

    let tone = 0;
    for (let f = 0; f < freqs.length; f++) {
      const hz = freqs[f] ?? 110;
      tone += Math.sin(2 * Math.PI * hz * t) * (f === 0 ? 0.06 : 0.035);
    }

    out[i] = lp + tone * (0.8 + 0.2 * slow);
  }

  // Window for seamless looping.
  const fade = Math.floor(sampleRate * 0.25);
  for (let i = 0; i < fade; i++) {
    const w = i / fade;
    out[i] *= w;
    out[total - 1 - i] *= w;
  }

  return out;
};

export const getProceduralAmbienceUrl = (id: AmbienceId) => {
  const existing = cache.get(id);
  if (existing) return existing;

  const sampleRate = 22050;
  const seconds = 8;

  const samples = makeNoiseBed(id, sampleRate, seconds);
  const wav = encodeWavPcm16Mono(samples, sampleRate);
  const blob = new Blob([wav], { type: 'audio/wav' });
  const url = URL.createObjectURL(blob);

  cache.set(id, url);
  return url;
};
